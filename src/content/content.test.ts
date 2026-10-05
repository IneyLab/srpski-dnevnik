// Проверка целостности содержания: ссылки из MDX на упражнения, аудиофайлы, корректность ответов.
import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { EXERCISES, VOCAB, WEEKS, courseProgress, weekProgress, nextLessonPath } from './registry'
import { ALPHABET } from './alphabet'
import { pickGender } from '../store/hooks'
import { tokensOf } from '../components/exercises/Build'
import { normalize } from '../lib/answer'
import { SOURCES } from './sources'
import { splitWords, ttsSlug, TTS_DIR } from '../lib/tts'
import { DICTIONARY, GLOSSARY_ERRORS } from './dictionary'
import { wordsOf } from '../lib/glossary'

const root = join(__dirname, '..', '..')
const weeksDir = join(__dirname, 'weeks')
const mdxFiles = readdirSync(weeksDir).flatMap((w) =>
  readdirSync(join(weeksDir, w))
    .filter((f) => f.endsWith('.mdx'))
    .map((f) => join(weeksDir, w, f)),
)
const audioExists = (name: string) => existsSync(join(root, 'public', 'audio', 'go-serbia', `${name}.mp3`))
const ttsExists = (word: string) => existsSync(join(root, 'public', 'audio', TTS_DIR, `${ttsSlug(word)}.mp3`))

describe('содержание недель', () => {
  it('каждое <Exercise id> из MDX существует', () => {
    for (const file of mdxFiles) {
      for (const m of readFileSync(file, 'utf8').matchAll(/<Exercise id="([^"]+)"/g)) {
        expect(EXERCISES[m[1]], `${file}: ${m[1]}`).toBeDefined()
      }
    }
  })

  it('каждое упражнение используется хотя бы в одном занятии', () => {
    const all = mdxFiles.map((f) => readFileSync(f, 'utf8')).join('\n')
    for (const id of Object.keys(EXERCISES)) expect(all, id).toContain(`<Exercise id="${id}"`)
  })

  it('все аудиофайлы на месте', () => {
    for (const file of mdxFiles) {
      for (const m of readFileSync(file, 'utf8').matchAll(/<Audio src="([^"]+)"/g)) expect(audioExists(m[1]), `${file}: ${m[1]}`).toBe(true)
    }
    for (const ex of Object.values(EXERCISES)) if ('audio' in ex && ex.audio) expect(audioExists(ex.audio), ex.id).toBe(true)
  })

  it('озвучка Google Переводчика есть для всех слов (иначе: npm run tts)', () => {
    for (const file of mdxFiles) {
      for (const m of readFileSync(file, 'utf8').matchAll(/<RepeatAfter[^>]*?\swords="([^"]+)"/g)) {
        for (const w of splitWords(m[1])) expect(ttsExists(w), `${file}: ${w}`).toBe(true)
      }
    }
    for (const ex of Object.values(EXERCISES)) {
      if (ex.type === 'dictation') {
        expect(Boolean(ex.audio) !== Boolean(ex.tts), `${ex.id}: нужно либо audio, либо tts`).toBe(true)
        if (ex.tts) for (const it of ex.items) expect(ttsExists(it.answer), `${ex.id}: ${it.answer}`).toBe(true)
      }
    }
    // Кнопки ▶ в словаре (обе формы по роду) и в таблице алфавита
    for (const [week, items] of Object.entries(VOCAB)) {
      for (const v of items) {
        for (const w of typeof v.sr === 'string' ? [v.sr] : [v.sr.f, v.sr.m]) expect(ttsExists(w), `словарь недели ${week}: ${w}`).toBe(true)
      }
    }
    for (const l of ALPHABET) expect(ttsExists(l.ex), `алфавит: ${l.ex}`).toBe(true)
  })

  it('в занятии С1 недели 1 нет словаря: слова начинаются со С2', () => {
    expect(readFileSync(join(weeksDir, '01', 's1.mdx'), 'utf8')).not.toContain('<Vocab')
    expect(VOCAB[1].some((v) => v.lesson === 's1')).toBe(false)
  })

  it('у каждого занятия в week.ts есть MDX-файл', () => {
    for (const [n, w] of Object.entries(WEEKS)) {
      for (const l of w.lessons) {
        const name = l.slug === 'checkin' ? 'checkin.mdx' : `s${l.slug}.mdx`
        expect(existsSync(join(weeksDir, String(n).padStart(2, '0'), name)), `${n}/${name}`).toBe(true)
      }
    }
  })

  it('ответы в выборе указывают на существующий вариант', () => {
    for (const ex of Object.values(EXERCISES)) {
      if (ex.type === 'choice' || ex.type === 'listen') {
        for (const it of ex.items) expect(it.answer < it.options.length, ex.id).toBe(true)
      }
    }
  })

  it('предложения в «собери» собираются из выданных слов в обоих родах', () => {
    for (const ex of Object.values(EXERCISES)) {
      if (ex.type !== 'build') continue
      for (const g of ['f', 'm'] as const) {
        for (const it of ex.items) {
          const pool = tokensOf(pickGender(it.answers[0], g), it.distractors).map((t) => normalize(t))
          for (const a of it.answers) {
            const words = normalize(pickGender(a, g)).split(' ')
            const left = [...pool]
            for (const w of words) {
              const i = left.indexOf(w)
              expect(i, `${ex.id}: «${w}» в «${pickGender(a, g)}»`).toBeGreaterThanOrEqual(0)
              left.splice(i, 1)
            }
          }
        }
      }
    }
  })

  it('упражнения на перевод алфавитов записаны кириллицей', () => {
    for (const ex of Object.values(EXERCISES)) {
      if (ex.type === 'script') for (const it of ex.items) expect(/[a-z]/i.test(it), `${ex.id}: ${it}`).toBe(false)
    }
  })
})

describe('источники и практика с ИИ', () => {
  it('каждый source ссылается на источник из sources.ts', () => {
    for (const file of mdxFiles) {
      for (const m of readFileSync(file, 'utf8').matchAll(/<(?:Source id|(?:Audio|RepeatAfter)[^>]*\bsource)="([^"]+)"/g)) {
        expect(SOURCES, `${file}: ${m[1]}`).toHaveProperty(m[1])
      }
    }
  })

  it('источник не пишется в заголовках и тексте заданий (только подпись внизу)', () => {
    // «Go-Serbia, задание 6» и номера заданий чужого сайта — в подпись <Source>, а не в текст
    const bad = /Go-Serbia,\s*(урок|задани)|задани[еяю]\s*\d/i
    for (const file of mdxFiles) {
      readFileSync(file, 'utf8')
        .split('\n')
        .forEach((line, i) => expect(bad.test(line), `${file}:${i + 1}: ${line}`).toBe(false))
    }
    for (const ex of Object.values(EXERCISES)) {
      expect(bad.test(ex.title) || bad.test(ex.instruction), ex.id).toBe(false)
    }
  })

  it('у каждого упражнения с ИИ указан навык, и занятие с практикой с ИИ покрывает все четыре навыка', () => {
    for (const file of mdxFiles) {
      const chats = [...readFileSync(file, 'utf8').matchAll(/<ChatBlock kind="ai"([^>]*?)title=/g)]
      const skills = chats.map((m) => /skill="(\w+)"/.exec(m[1])?.[1])
      for (const sk of skills) expect(sk, `${file}: ChatBlock kind="ai" без skill`).toBeDefined()
      // Одиночный чат (например, говорение в продукте недели) допустим; набор из 2+ — полная практика.
      if (chats.length >= 2) {
        for (const need of ['reading', 'writing', 'listening', 'speaking']) expect(skills, `${file}: нет ${need}`).toContain(need)
      }
    }
  })
})

describe('прогресс по курсу', () => {
  it('пустой прогресс', () => {
    expect(courseProgress({})).toBe(0)
    expect(weekProgress(1, {}).status).toBe('todo')
    expect(weekProgress(5, {}).status).toBe('soon')
    expect(nextLessonPath({})).toBe('/week/1/lesson/1')
  })
  it('неделя пройдена, когда сделаны все обязательные занятия', () => {
    const done = Object.fromEntries(
      WEEKS[1].lessons.filter((l) => !l.optional).map((l) => [`w1.${l.slug === 'checkin' ? 'checkin' : `s${l.slug}`}`, { done: true }]),
    )
    expect(weekProgress(1, done).status).toBe('done')
    expect(courseProgress(done)).toBe(Math.round(100 / 13))
    expect(weekProgress(1, { 'w1.s6': { done: true } }).status).toBe('active')
  })
})

describe('игровые данные: места, значки, блоки «Вернись к преподавателю»', () => {
  it('места: id уникальны, точки внутри карты, условия открытия указывают на настоящие занятия', async () => {
    const { PLACES } = await import('./places')
    const { project, MAP_W, MAP_H } = await import('../lib/serbia-outline')
    const ids = new Set<string>()
    for (const p of PLACES) {
      expect(ids.has(p.id), p.id).toBe(false)
      ids.add(p.id)
      const { x, y } = project(p.lon, p.lat)
      expect(x > 0 && x < MAP_W && y > 0 && y < MAP_H, `${p.id}: ${x}, ${y}`).toBe(true)
      expect(p.facts.length, p.id).toBeGreaterThan(0)
      expect(p.link.week >= 1 && p.link.week <= 13, p.id).toBe(true)
      for (const u of p.unlock) {
        if (u === 'start') continue
        if ('week' in u) {
          expect(u.week >= 1 && u.week <= 13, p.id).toBe(true)
          continue
        }
        const m = u.lesson.match(/^w(\d+)\.(?:s(\d+)|checkin)$/)
        expect(m, `${p.id}: ${u.lesson}`).not.toBeNull()
        const meta = WEEKS[Number(m![1])]
        // Для опубликованной недели занятие должно существовать
        if (meta) expect(meta.lessons.some((l) => l.slug === (m![2] ?? 'checkin')), `${p.id}: ${u.lesson}`).toBe(true)
      }
      // У опубликованной недели ссылка ведёт на настоящее занятие
      const lw = WEEKS[p.link.week]
      if (lw && p.link.slug) expect(lw.lessons.some((l) => l.slug === p.link.slug), p.id).toBe(true)
    }
    expect(PLACES.some((p) => p.unlock.includes('start'))).toBe(true)
  })

  it('значки: id уникальны, неделя курса указана', async () => {
    const { BADGES } = await import('./badges')
    expect(new Set(BADGES.map((b) => b.id)).size).toBe(BADGES.length)
    for (const b of BADGES) expect(b.week >= 1 && b.week <= 13, b.id).toBe(true)
  })

  it('в сербских фрагментах мест и значков нет латиницы (пишем кириллицей)', async () => {
    const { PLACES } = await import('./places')
    const { BADGES } = await import('./badges')
    const texts = [...PLACES.flatMap((p) => [p.sr, ...p.facts, p.tagline]), ...BADGES.map((b) => b.task)]
    for (const t of texts) {
      for (const frag of t.split('`').filter((_, i) => i % 2)) expect(/[a-z]/i.test(frag), frag).toBe(false)
    }
  })

  it('заголовки блоков ChatBlock в занятии не повторяются (по ним хранится отметка «сделано»)', () => {
    for (const file of mdxFiles) {
      const titles = [...readFileSync(file, 'utf8').matchAll(/<ChatBlock[^>]*?\stitle="([^"]+)"/g)].map((m) => m[1])
      expect(new Set(titles).size, file).toBe(titles.length)
    }
  })
})

describe('перевод по двойному щелчку', () => {
  // Сербский текст, который видит ученик: `обратные кавычки`, <Sr>…</Sr>, <G f m>, <RepeatAfter words>.
  const serbianIn = (text: string) => [
    ...[...text.matchAll(/`([^`\n]+)`/g)].map((m) => m[1]),
    ...[...text.matchAll(/<Sr\b[^>]*>([\s\S]*?)<\/Sr>/g)].map((m) => m[1]),
    ...[...text.matchAll(/<G f="([^"]+)" m="([^"]+)"/g)].flatMap((m) => [m[1], m[2]]),
    ...[...text.matchAll(/<RepeatAfter[^>]*?\swords="([^"]+)"/g)].map((m) => m[1]),
    // <Dialogue lines={[['кто', 'реплика', 'перевод'], …]}> — кто и реплика по-сербски
    ...[...text.matchAll(/<Dialogue[\s\S]*?\/>/g)].flatMap((d) => [...d[0].matchAll(/\[\s*'([^']*)',\s*'([^']*)'/g)].flatMap((m) => [m[1], m[2]])),
  ]
  // В .ts-файлах — только строки, без комментариев (там `кавычки` бывают и в русском тексте)
  const withoutComments = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
  const dirFiles = (dir: string, ext: string) =>
    existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(ext)).map((f) => join(dir, f)) : []

  it('глоссарии недель разбираются без ошибок', () => {
    expect(GLOSSARY_ERRORS).toEqual([])
  })

  it('для каждого сербского слова в занятиях, шпаргалках, на карте и в значках есть перевод', () => {
    const files = [
      ...mdxFiles,
      ...['cheatsheets', 'checkpoints', 'pages'].flatMap((d) => dirFiles(join(__dirname, d), '.mdx')),
      ...readdirSync(weeksDir).map((w) => join(weeksDir, w, 'week.ts')),
      join(__dirname, 'course.ts'),
      join(__dirname, 'places.ts'),
      join(__dirname, 'badges.ts'),
    ]
    const missing = new Set<string>()
    for (const file of files) {
      const text = file.endsWith('.ts') ? withoutComments(readFileSync(file, 'utf8')) : readFileSync(file, 'utf8')
      for (const frag of serbianIn(text)) {
        // Однобуквенные — это буквы алфавита («ч / ћ»), а не слова
        for (const w of wordsOf(frag)) if (w.length > 1 && !DICTIONARY[w]) missing.add(`${w} (${file.split('/src/')[1]})`)
      }
    }
    expect([...missing], 'добавь слова в weeks/NN/glossary.ts').toEqual([])
  })

  it('у каждого слова подсказки есть озвучка (иначе: npm run tts)', () => {
    const missing = Object.keys(DICTIONARY).filter((w) => !ttsExists(w))
    expect(missing).toEqual([])
  })

  it('слова из словариков недель есть в подсказке', () => {
    expect(DICTIONARY['стан']?.ru).toBe('квартира')
    expect(DICTIONARY['уморан']).toBeDefined()
    expect(DICTIONARY['моја']?.ru).toBe('мой, моя, моё')
  })
})
