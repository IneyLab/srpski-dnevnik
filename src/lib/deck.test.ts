import { describe, it, expect } from 'vitest'
import { ankiCsv, buildDeck, csvField, deckStats, dueQueue, mistakeWords, normalizeWord, weekLessonOf, NEW_PER_SESSION } from './deck'
import { newCard, review } from './srs'
import type { Exercise, VocabItem } from '../content/types'

const vocab: Record<number, VocabItem[]> = {
  1: [
    { sr: 'отац', ru: 'отец', lesson: 's2', g: 'm' },
    { sr: 'стан', ru: 'квартира', lesson: 's2', g: 'm', falseFriend: 'Не «стан»: это квартира.' },
    { sr: { f: 'уморна', m: 'уморан' }, ru: 'уставшая / уставший', lesson: 's2' },
    { sr: 'карта', ru: 'билет; карта', lesson: 's6', g: 'f', note: 'Чаще «билет», "карта за Београд"' },
  ],
}
const exercises: Record<string, Exercise> = {
  'w1.s4.dict': {
    id: 'w1.s4.dict',
    type: 'dictation',
    tts: true,
    title: 'Диктант',
    instruction: '',
    skill: 'listening',
    items: [
      { answer: 'карта', ru: 'билет' },
      { answer: 'зуб', ru: 'зуб' },
    ],
  },
  'w1.s2.fill': {
    id: 'w1.s2.fill',
    type: 'fill',
    title: 'Связка',
    instruction: '',
    skill: 'grammar',
    items: [{ before: 'Ја', after: 'Ана.', answers: ['сам'], ru: 'Я Анна.' }],
  },
  'w1.s1.script': { id: 'w1.s1.script', type: 'script', direction: 'toLat', title: '', instruction: '', skill: 'writing', items: ['Ђердап'] },
}
const base = { vocab, exercises, gender: 'f' as const, mistakes: {} }
const wrong = (source: string, resolved = false) => ({ kind: 'word' as const, source, resolved })

describe('колода карточек', () => {
  it('слова попадают в колоду только после отметки занятия, в двух направлениях', () => {
    expect(buildDeck({ ...base, lessons: {} })).toHaveLength(0)
    const deck = buildDeck({ ...base, lessons: { 'w1.s2': { done: true } } })
    expect(deck.map((c) => c.id)).toEqual([
      'v:отац|sr-ru',
      'v:отац|ru-sr',
      'v:стан|sr-ru',
      'v:стан|ru-sr',
      'v:уморна|sr-ru',
      'v:уморна|ru-sr',
    ])
    expect(buildDeck({ ...base, lessons: { 'w1.s2': { done: false } } })).toHaveLength(0)
  })

  it('одно направление', () => {
    const deck = buildDeck({ ...base, lessons: { 'w1.s2': { done: true } }, dirs: ['ru-sr'] })
    expect(deck.every((c) => c.dir === 'ru-sr')).toBe(true)
    expect(deck).toHaveLength(3)
  })

  it('ошибка в слове из словаря добавляет это слово, даже если занятие не отмечено', () => {
    const deck = buildDeck({ ...base, lessons: {}, mistakes: { 'w1.s4.dict#0': wrong('w1.s4.dict') } })
    expect(deck.map((c) => c.base)).toEqual(['v:карта', 'v:карта'])
    expect(deck[0].fromMistake).toBe(true)
  })

  it('ошибка в слове не из словаря — отдельная карточка, пока ошибка не разобрана', () => {
    const open = buildDeck({ ...base, lessons: {}, mistakes: { 'w1.s4.dict#1': wrong('w1.s4.dict') } })
    expect(open.map((c) => c.id)).toEqual(['m:w1.s4.dict#1|sr-ru', 'm:w1.s4.dict#1|ru-sr'])
    expect(open[0]).toMatchObject({ sr: 'зуб', ru: 'зуб', week: 1, lesson: 's4', audio: true })
    const resolved = buildDeck({ ...base, lessons: {}, mistakes: { 'w1.s4.dict#1': wrong('w1.s4.dict', true) } })
    expect(resolved).toHaveLength(0)
  })

  it('fill: карточка — фраза целиком; упражнения на буквы и правила в колоду не идут', () => {
    const deck = buildDeck({
      ...base,
      lessons: {},
      mistakes: {
        'w1.s2.fill#0': wrong('w1.s2.fill'),
        'w1.s1.script#0': wrong('w1.s1.script'),
        'rule:Связка': { kind: 'rule', source: 'w1.s2.fill', resolved: false },
      },
    })
    expect(deck.map((c) => c.sr)).toEqual(['Ја сам Ана.', 'Ја сам Ана.'])
    expect(deck[0].audio).toBe(false)
  })

  it('слова по роду: ошибка в мужской форме находит слово словаря', () => {
    const ex: Exercise = { id: 'w1.s3.m', type: 'dictation', title: '', instruction: '', skill: 'listening', items: [{ answer: 'уморан' }] }
    const deck = buildDeck({ ...base, exercises: { ...exercises, [ex.id]: ex }, lessons: {}, mistakes: { 'w1.s3.m#0': wrong(ex.id) } })
    expect(deck[0].base).toBe('v:уморна')
  })

  it('вспомогательные функции', () => {
    expect(normalizeWord('  Добар  дан! ')).toBe('добар дан')
    expect(weekLessonOf('w12.s3.name')).toEqual({ week: 12, lesson: 's3' })
    expect(weekLessonOf('w1.checkin.quiz')).toEqual({ week: 1, lesson: 'checkin' })
    expect(mistakeWords(exercises['w1.s1.script'], 0, 'f')).toEqual([])
  })
})

describe('очередь повторения', () => {
  const t0 = new Date('2026-10-05T10:00:00Z')
  const deck = buildDeck({ ...base, lessons: { 'w1.s2': { done: true } } })

  it('сначала просроченные, потом новые — «сербский → русский» раньше', () => {
    const srs = {
      'v:стан|ru-sr': { ...newCard(t0), due: '2026-10-03T00:00:00Z' },
      'v:отац|sr-ru': { ...newCard(t0), due: '2026-10-01T00:00:00Z' },
      'v:уморна|sr-ru': review(newCard(t0), 'good', t0), // через день — не сегодня
    }
    const q = dueQueue(deck, srs, t0)
    expect(q.slice(0, 2).map((c) => c.id)).toEqual(['v:отац|sr-ru', 'v:стан|ru-sr'])
    expect(q.slice(2).map((c) => c.id)).toEqual(['v:стан|sr-ru', 'v:отац|ru-sr', 'v:уморна|ru-sr'])
    expect(deckStats(deck, srs, t0)).toEqual({ total: 6, due: 2, fresh: 3, learned: 0 })
  })

  it('новых — не больше лимита за подход', () => {
    expect(dueQueue(deck, {}, t0, 2)).toHaveLength(2)
    expect(NEW_PER_SESSION).toBeGreaterThan(0)
  })

  it('выученная карточка — после двух верных повторов', () => {
    let st = review(newCard(t0), 'good', t0)
    st = review(st, 'good', t0)
    expect(deckStats(deck, { 'v:отац|sr-ru': st }, t0).learned).toBe(1)
  })
})

describe('экспорт в Anki (CSV)', () => {
  it('поля с разделителем, кавычками и переводом строки берутся в кавычки', () => {
    expect(csvField('отец')).toBe('отец')
    expect(csvField('билет; карта')).toBe('"билет; карта"')
    expect(csvField('сказал "да"')).toBe('"сказал ""да"""')
    expect(csvField('а\nб')).toBe('"а\nб"')
  })

  it('заголовки Anki, одна строка на слово, алфавит и род ученика', () => {
    const deck = buildDeck({ ...base, lessons: { 'w1.s2': { done: true }, 'w1.s6': { done: true } } })
    const csv = ankiCsv(deck, 'lat', 'm')
    const lines = csv.trimEnd().split('\n')
    expect(lines.slice(0, 5)).toEqual([
      '#separator:Semicolon',
      '#html:true',
      '#deck:Srpski dnevnik',
      '#columns:Front;Back;Tags',
      '#tags column:3',
    ])
    expect(lines.slice(5)).toEqual([
      'otac;отец<br><small>м. р.</small>;srpski-dnevnik nedelja-1 cas-s2 rod-m',
      'stan;квартира<br><small>м. р. · ложный друг: Не «стан»: это квартира.</small>;srpski-dnevnik nedelja-1 cas-s2 rod-m lazni-prijatelj',
      'umoran;уставшая / уставший;srpski-dnevnik nedelja-1 cas-s2',
      'karta;"билет; карта<br><small>ж. р. · Чаще «билет», ""карта за Београд""</small>";srpski-dnevnik nedelja-1 cas-s6 rod-z',
    ])
    expect(csv.endsWith('\n')).toBe(true)
    expect(csv.charCodeAt(0)).not.toBe(0xfeff)
  })

  it('HTML в тексте экранируется', () => {
    const deck = buildDeck({ ...base, vocab: { 1: [{ sr: 'а', ru: 'a < b & c', lesson: 's1' }] }, lessons: { 'w1.s1': { done: true } } })
    expect(ankiCsv(deck, 'cyr', 'f')).toContain('а;"a &lt; b &amp; c";')
  })

  it('посмотренный перевод: словарное слово — с контекстом, остальное — карточка из словаря подсказки', () => {
    const dictionary = {
      зовем: { ru: 'зову: `Зовем се` — меня зовут', base: 'звати се' },
      ана: { ru: '`Ана` (женское имя)' },
    }
    const lookups = {
      стан: { context: 'Ово је наш стан.', week: 1, lesson: 's2' },
      зовем: { context: 'Zovem se Ana.', week: 1, lesson: 's2' },
      ана: { context: '', week: 0, lesson: '' },
      непознато: { context: 'x', week: 1, lesson: 's1' },
    }
    const deck = buildDeck({ ...base, lessons: {}, lookups, dictionary })
    expect(deck.map((c) => c.id)).toEqual(['v:стан|sr-ru', 'v:стан|ru-sr', 'l:зовем|sr-ru', 'l:зовем|ru-sr', 'l:ана|sr-ru', 'l:ана|ru-sr'])
    expect(deck[0]).toMatchObject({ context: 'Ово је наш стан.', fromLookup: true, ru: 'квартира' })
    expect(deck[2]).toMatchObject({
      sr: 'зовем',
      ru: 'зову',
      note: '`Зовем се` — меня зовут · начальная форма: `звати се`',
      context: 'Zovem se Ana.',
      audio: true,
    })
    expect(deck[4]).toMatchObject({ sr: 'Ана', context: undefined })
    // Новые: сначала ошибки, потом посмотренные — тут все посмотренные, порядок «сербский → русский» первым
    expect(dueQueue(deck, {}).map((c) => c.dir).slice(0, 3)).toEqual(['sr-ru', 'sr-ru', 'sr-ru'])
    const csv = ankiCsv(deck, 'lat', 'f')
    expect(csv).toContain('zovem;зову<br><small>Zovem se — меня зовут · начальная форма: zvati se · контекст: «Zovem se Ana.»</small>;srpski-dnevnik nedelja-1 cas-s2 pogledano')
  })
})
