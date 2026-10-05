// Колода карточек слов (/cards): какие слова в неё попадают, очередь на сегодня и экспорт в Anki.
// Чистые функции: содержание курса, отметки занятий и тетрадь ошибок передаются параметрами.
import type { Exercise, Gendered, VocabItem } from '../content/types'
import { isDue, type SrsState } from './srs'
import { toScript, type Script } from './translit'

export type Dir = 'sr-ru' | 'ru-sr'
export const DIRS: Dir[] = ['sr-ru', 'ru-sr']

export interface Card {
  /** Ключ состояния в store.srs: `<base>|<dir>`. */
  id: string
  /** Слово без направления: `v:<слово>` из словаря или `m:<ключ ошибки>` из тетради ошибок. */
  base: string
  dir: Dir
  /** Сербский (кириллица, может зависеть от рода). */
  sr: Gendered
  ru: string
  week: number
  /** Занятие: 's2'… */
  lesson: string
  g?: 'm' | 'f' | 'n'
  note?: string
  falseFriend?: string
  /** Слово попало в колоду из тетради ошибок. */
  fromMistake: boolean
  /** Есть озвучка Google Переводчика (слова словаря и диктантов с tts). */
  audio: boolean
}

interface MistakeLike {
  kind: 'word' | 'rule'
  source: string
  resolved: boolean
}

export interface DeckInput {
  vocab: Record<number, VocabItem[]>
  lessons: Record<string, { done: boolean }>
  mistakes: Record<string, MistakeLike>
  exercises: Record<string, Exercise>
  gender: 'f' | 'm'
  dirs?: Dir[]
}

const formsOf = (t: Gendered): string[] => (typeof t === 'string' ? [t] : [t.f, t.m])
const keyOf = (t: Gendered): string => (typeof t === 'string' ? t : t.f)
const pick = (t: Gendered, g: 'f' | 'm') => (typeof t === 'string' ? t : t[g])

/** Для сравнения слов: строчные, без знаков препинания и многоточий. */
export function normalizeWord(s: string): string {
  return s
    .toLowerCase()
    .replace(/[!?.,;:…«»"()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Неделя и занятие по id упражнения или занятия: 'w1.s2.gender' → { week: 1, lesson: 's2' }. */
export function weekLessonOf(id: string): { week: number; lesson: string } | null {
  const m = id.match(/^w(\d+)\.(s\d+|checkin)/)
  return m ? { week: Number(m[1]), lesson: m[2] } : null
}

export interface MistakeWord {
  sr: Gendered
  ru?: string
  /** Можно сделать отдельную карточку (есть перевод или подсказка). */
  cardable: boolean
}

/** Сербские слова из пункта упражнения, где ошибся ученик (ключ ошибки `<id упражнения>#<пункт>`). */
export function mistakeWords(ex: Exercise, index: number, gender: 'f' | 'm'): MistakeWord[] {
  switch (ex.type) {
    case 'fill': {
      const it = ex.items[index]
      if (!it) return []
      const full = [it.before ? pick(it.before, gender) : '', pick(it.answers[0], gender), it.after ? pick(it.after, gender) : '']
        .join(' ')
        .trim()
      // Карточка — вся фраза с подставленным ответом, проверка по словарю — сам ответ
      return [
        { sr: it.answers[0], cardable: false },
        { sr: full, ru: it.ru, cardable: Boolean(it.ru) },
      ]
    }
    case 'dictation': {
      const it = ex.items[index]
      return it ? [{ sr: it.answer, ru: it.ru, cardable: Boolean(it.ru) }] : []
    }
    case 'build': {
      const it = ex.items[index]
      return it ? [{ sr: it.answers[0], ru: pick(it.ru, gender), cardable: true }] : []
    }
    case 'match': {
      const p = ex.pairs[index]
      if (!p) return []
      if (ex.leftLang === 'sr' && ex.rightLang === 'ru') return [{ sr: p.left, ru: pick(p.right, gender), cardable: true }]
      if (ex.leftLang === 'ru' && ex.rightLang === 'sr') return [{ sr: p.right, ru: pick(p.left, gender), cardable: true }]
      return []
    }
    case 'choice':
    case 'listen': {
      const it = ex.items[index]
      if (!it) return []
      const out: MistakeWord[] = []
      if (it.optionsLang === 'sr') out.push({ sr: it.options[it.answer], cardable: false })
      if (it.sr) out.push({ sr: it.sr, cardable: false })
      return out
    }
    case 'script':
      // Упражнения на сами буквы: в карточки не идут
      return []
  }
}

function vocabCard(v: VocabItem, week: number, dir: Dir, fromMistake: boolean): Card {
  const base = `v:${keyOf(v.sr)}`
  return {
    id: `${base}|${dir}`,
    base,
    dir,
    sr: v.sr,
    ru: v.ru,
    week,
    lesson: v.lesson,
    g: v.g,
    note: v.note,
    falseFriend: v.falseFriend,
    fromMistake,
    audio: true,
  }
}

/**
 * Колода: слова выполненных занятий + слова из тетради ошибок.
 * Ошибка, совпавшая со словом словаря, добавляет это слово (даже если занятие ещё не отмечено).
 * Остальные ошибки в упражнениях на слова (с переводом) — отдельные карточки, пока ошибка не разобрана.
 */
export function buildDeck(input: DeckInput): Card[] {
  const { vocab, lessons, mistakes, exercises, gender } = input
  const dirs = input.dirs ?? DIRS
  const index = new Map<string, { v: VocabItem; week: number }>()
  for (const [w, list] of Object.entries(vocab)) {
    for (const v of list) for (const f of formsOf(v.sr)) index.set(normalizeWord(f), { v, week: Number(w) })
  }

  const fromMistakes = new Set<string>()
  const mistakeCards: Card[] = []
  for (const [key, m] of Object.entries(mistakes)) {
    if (m.kind !== 'word') continue
    const ex = exercises[m.source]
    const idx = Number(key.split('#')[1])
    if (!ex || !Number.isInteger(idx)) continue
    const words = mistakeWords(ex, idx, gender)
    const hit = words.flatMap((w) => formsOf(w.sr)).find((f) => index.has(normalizeWord(f)))
    if (hit) {
      fromMistakes.add(keyOf(index.get(normalizeWord(hit))!.v.sr))
      continue
    }
    const card = words.find((w) => w.cardable && w.ru)
    if (!card || m.resolved) continue
    const wl = weekLessonOf(ex.id) ?? { week: 0, lesson: '' }
    const base = `m:${key}`
    for (const dir of dirs) {
      mistakeCards.push({
        id: `${base}|${dir}`,
        base,
        dir,
        sr: card.sr,
        ru: card.ru!,
        week: wl.week,
        lesson: wl.lesson,
        fromMistake: true,
        audio: ex.type === 'dictation' && Boolean(ex.tts),
      })
    }
  }

  const out: Card[] = []
  const weeks = Object.keys(vocab)
    .map(Number)
    .sort((a, b) => a - b)
  for (const w of weeks) {
    for (const v of vocab[w]) {
      const k = keyOf(v.sr)
      const lessonDone = Boolean(lessons[`w${w}.${v.lesson}`]?.done)
      const mistaken = fromMistakes.has(k)
      if (!lessonDone && !mistaken) continue
      for (const dir of dirs) out.push(vocabCard(v, w, dir, mistaken))
    }
  }
  return [...out, ...mistakeCards]
}

/** Сколько новых карточек показывать за один подход. */
export const NEW_PER_SESSION = 10

/**
 * Очередь: сначала карточки, которым пора на повторение (самые просроченные первыми),
 * потом новые — сначала из тетради ошибок, сначала «сербский → русский».
 */
export function dueQueue(deck: Card[], srs: Record<string, SrsState>, now = new Date(), newLimit = NEW_PER_SESSION): Card[] {
  const due = deck
    .filter((c) => srs[c.id] && isDue(srs[c.id], now))
    .sort((a, b) => srs[a.id].due.localeCompare(srs[b.id].due))
  const fresh = deck
    .filter((c) => !srs[c.id])
    .map((c, i) => ({ c, i }))
    .sort((a, b) => Number(b.c.fromMistake) - Number(a.c.fromMistake) || (a.c.dir === b.c.dir ? 0 : a.c.dir === 'sr-ru' ? -1 : 1) || a.i - b.i)
    .map((x) => x.c)
    .slice(0, newLimit)
  return [...due, ...fresh]
}

export interface DeckStats {
  total: number
  due: number
  fresh: number
  learned: number
}

export function deckStats(deck: Card[], srs: Record<string, SrsState>, now = new Date()): DeckStats {
  let due = 0
  let fresh = 0
  let learned = 0
  for (const c of deck) {
    const st = srs[c.id]
    if (!st) fresh++
    else {
      if (isDue(st, now)) due++
      if (st.reps >= LEARNED_REPS) learned++
    }
  }
  return { total: deck.length, due, fresh, learned }
}

/** Карточка считается выученной после двух успешных повторений подряд (интервал ≥ 6 дней). */
export const LEARNED_REPS = 2

// ——— Экспорт в Anki ———

const G_TAG = { m: 'rod-m', f: 'rod-z', n: 'rod-s' } as const

/** Поле CSV: в кавычки, если внутри разделитель, кавычка, перевод строки или пробел по краям. */
export function csvField(value: string, sep = ';'): string {
  if (value.includes(sep) || /["\r\n]/.test(value) || value !== value.trim()) return `"${value.replace(/"/g, '""')}"`
  return value
}

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/**
 * CSV для импорта в Anki: UTF-8 без BOM, разделитель «;», кавычки по RFC 4180.
 * Строки «#…» — заголовки Anki 2.1.55+ (разделитель, HTML, колода, столбцы, метки); в старых версиях
 * при импорте выбери разделитель «;» и включи «Разрешить HTML».
 * Одна строка — одно слово (не направление): обратную карточку Anki сделает сам, если выбрать тип «с обратной карточкой».
 * Столбцы: сербский (в выбранном алфавите и форме рода) ; русский + пометки ; метки.
 */
export function ankiCsv(deck: Card[], script: Script, gender: 'f' | 'm', deckName = 'Српски дневник'): string {
  const seen = new Set<string>()
  const lines = [
    '#separator:Semicolon',
    '#html:true',
    `#deck:${toScript(deckName, script)}`,
    '#columns:Front;Back;Tags',
    '#tags column:3',
  ]
  for (const c of deck) {
    if (seen.has(c.base)) continue
    seen.add(c.base)
    const front = toScript(pick(c.sr, gender), script)
    const notes = [c.g ? { m: 'м. р.', f: 'ж. р.', n: 'ср. р.' }[c.g] : '', c.note ?? '', c.falseFriend ? `ложный друг: ${c.falseFriend}` : '']
      .filter(Boolean)
    const back = escapeHtml(c.ru) + (notes.length ? `<br><small>${escapeHtml(notes.join(' · '))}</small>` : '')
    const tags = [
      'srpski-dnevnik',
      `nedelja-${c.week}`,
      c.lesson ? `cas-${c.lesson}` : '',
      c.g ? G_TAG[c.g] : '',
      c.falseFriend ? 'lazni-prijatelj' : '',
      c.fromMistake ? 'greska' : '',
    ].filter(Boolean)
    lines.push([front, back, tags.join(' ')].map((f) => csvField(f)).join(';'))
  }
  return lines.join('\n') + '\n'
}
