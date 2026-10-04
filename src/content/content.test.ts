// Проверка целостности содержания: ссылки из MDX на упражнения, аудиофайлы, корректность ответов.
import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { EXERCISES, WEEKS, courseProgress, weekProgress, nextLessonPath } from './registry'
import { pickGender } from '../store/hooks'
import { tokensOf } from '../components/exercises/Build'
import { normalize } from '../lib/answer'

const root = join(__dirname, '..', '..')
const weeksDir = join(__dirname, 'weeks')
const mdxFiles = readdirSync(weeksDir).flatMap((w) =>
  readdirSync(join(weeksDir, w))
    .filter((f) => f.endsWith('.mdx'))
    .map((f) => join(weeksDir, w, f)),
)
const audioExists = (name: string) => existsSync(join(root, 'public', 'audio', 'go-serbia', `${name}.mp3`))

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
    for (const ex of Object.values(EXERCISES)) if ('audio' in ex) expect(audioExists(ex.audio), ex.id).toBe(true)
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
