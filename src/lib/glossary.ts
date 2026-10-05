// Словарь для подсказки по двойному щелчку: сербская словоформа → перевод.
// Глоссарий — массив строк, по строке на запись:
//   'форма, форма2 = перевод | начальная форма'
// Начальная форма (после «|») необязательна. Сербские примеры в переводе — в `обратных кавычках`.
import { latToCyr } from './translit'

export interface GlossEntry {
  ru: string
  /** Начальная (словарная) форма, если слово стоит в другой форме: «зовем» ← «звати се». */
  base?: string
  falseFriend?: string
  note?: string
}

export type Glossary = Record<string, GlossEntry>

/** Слово в ключ словаря: строчные буквы, кириллица, без знаков препинания по краям. */
export function glossKey(word: string): string {
  const w = word
    .trim()
    .toLowerCase()
    .replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '')
  return /[a-zčćđšž]/.test(w) ? latToCyr(w) : w
}

export function parseGlossary(lines: string[]): Glossary {
  const out: Glossary = {}
  for (const raw of lines) {
    const line = raw.trim()
    const eq = line.indexOf('=')
    if (eq < 0) throw new Error(`Глоссарий: нет «=» в строке «${line}»`)
    const [ru, base] = line
      .slice(eq + 1)
      .split('|')
      .map((x) => x.trim())
    if (!ru) throw new Error(`Глоссарий: пустой перевод в строке «${line}»`)
    for (const form of line.slice(0, eq).split(',')) {
      const key = glossKey(form)
      if (!key) throw new Error(`Глоссарий: пустая форма в строке «${line}»`)
      if (out[key]) throw new Error(`Глоссарий: «${key}» записано дважды`)
      out[key] = base ? { ru, base } : { ru }
    }
  }
  return out
}

/** Кириллические слова в сербском фрагменте (для проверки, что словарь покрывает текст уроков). */
export function wordsOf(text: string): string[] {
  return (text.replace(/<[^>]+>/g, '').match(/[а-яёђјљњћџ]+/giu) ?? []).map(glossKey)
}

/**
 * Перевод для карточки: основное значение — до первого «:» вне скобок, остальное (примеры) — в пометку.
 * «зову: `Зовем се` — меня зовут» → { ru: 'зову', rest: '`Зовем се` — меня зовут' }
 */
export function splitGloss(ru: string): { ru: string; rest?: string } {
  let depth = 0
  for (let i = 0; i < ru.length; i++) {
    const ch = ru[i]
    if (ch === '(') depth++
    else if (ch === ')') depth = Math.max(0, depth - 1)
    else if (ch === ':' && depth === 0 && ru[i + 1] === ' ') return { ru: ru.slice(0, i).trim(), rest: ru.slice(i + 1).trim() }
  }
  return { ru }
}

const SENTENCE_END = /[.!?…]/
const MAX_CONTEXT = 200

/**
 * Предложение вокруг позиции offset в тексте (для поля «контекст» карточки).
 * Слишком длинное — обрезается вокруг слова с «…».
 */
export function sentenceAround(text: string, offset: number): string {
  let start = 0
  for (let i = Math.min(offset, text.length) - 1; i > 0; i--) {
    if (SENTENCE_END.test(text[i - 1]) && /\s/.test(text[i])) {
      start = i
      break
    }
  }
  let end = text.length
  for (let i = offset; i < text.length; i++) {
    if (SENTENCE_END.test(text[i]) && (i + 1 === text.length || /\s/.test(text[i + 1]))) {
      // Многоточие и «?!» — целиком
      end = i + 1
      while (end < text.length && SENTENCE_END.test(text[end])) end++
      break
    }
  }
  let from = start
  let to = end
  if (to - from > MAX_CONTEXT) {
    from = Math.max(start, offset - MAX_CONTEXT / 2)
    to = Math.min(end, from + MAX_CONTEXT)
  }
  const cut = text.slice(from, to).replace(/\s+/g, ' ').trim()
  return `${from > start ? '…' : ''}${cut}${to < end ? '…' : ''}`
}
