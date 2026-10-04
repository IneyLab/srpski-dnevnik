// Реестр содержания. Недели находятся автоматически по папкам content/weeks/NN:
// чтобы добавить неделю, достаточно создать папку с week.ts, exercises.ts, vocab.ts и *.mdx.
import type { ComponentType } from 'react'
import type { Exercise, VocabItem, WeekMeta } from './types'
import { COURSE, DEFAULT_REQUIRED_LESSONS } from './course'

type MdxModule = { default: ComponentType }

const weekModules = import.meta.glob<{ default: WeekMeta }>('./weeks/*/week.ts', { eager: true })
const exerciseModules = import.meta.glob<{ default: Exercise[] }>('./weeks/*/exercises.ts', { eager: true })
const vocabModules = import.meta.glob<{ default: VocabItem[] }>('./weeks/*/vocab.ts', { eager: true })
const lessonModules = import.meta.glob<MdxModule>('./weeks/*/*.mdx')

const folderOf = (path: string) => Number(path.split('/')[2])

export const WEEKS: Record<number, WeekMeta> = {}
for (const [path, mod] of Object.entries(weekModules)) WEEKS[folderOf(path)] = mod.default

export const EXERCISES: Record<string, Exercise> = {}
for (const mod of Object.values(exerciseModules)) {
  for (const ex of mod.default) {
    if (EXERCISES[ex.id]) console.warn(`Повтор id упражнения: ${ex.id}`)
    EXERCISES[ex.id] = ex
  }
}

export const VOCAB: Record<number, VocabItem[]> = {}
for (const [path, mod] of Object.entries(vocabModules)) VOCAB[folderOf(path)] = mod.default

export function isWeekAvailable(n: number): boolean {
  return Boolean(WEEKS[n])
}

export function lessonLoader(week: number, slug: string): (() => Promise<MdxModule>) | undefined {
  const key = `./weeks/${String(week).padStart(2, '0')}/${slug === 'checkin' ? 'checkin' : `s${slug}`}.mdx`
  return lessonModules[key]
}

export const lessonId = (week: number, slug: string) => `w${week}.${slug === 'checkin' ? 'checkin' : `s${slug}`}`

export function requiredLessons(n: number): string[] {
  const w = WEEKS[n]
  if (!w) return []
  return w.lessons.filter((l) => !l.optional).map((l) => lessonId(n, l.slug))
}

export type WeekStatus = 'soon' | 'todo' | 'active' | 'done'

export function weekProgress(n: number, lessons: Record<string, { done: boolean }>): { status: WeekStatus; done: number; total: number } {
  const w = WEEKS[n]
  if (!w) return { status: 'soon', done: 0, total: DEFAULT_REQUIRED_LESSONS }
  const all = w.lessons.map((l) => lessonId(n, l.slug))
  const req = requiredLessons(n)
  const done = req.filter((id) => lessons[id]?.done).length
  const touched = all.some((id) => lessons[id]?.done)
  const status: WeekStatus = done === req.length ? 'done' : touched ? 'active' : 'todo'
  return { status, done, total: req.length }
}

export function courseProgress(lessons: Record<string, { done: boolean }>): number {
  const sum = COURSE.reduce((s, w) => {
    const p = weekProgress(w.n, lessons)
    return s + (p.total ? p.done / p.total : 0)
  }, 0)
  return Math.round((sum / COURSE.length) * 100)
}

/** Первое невыполненное обязательное занятие (для кнопки «Продолжить»). */
export function nextLessonPath(lessons: Record<string, { done: boolean }>): string | null {
  for (const w of COURSE) {
    const meta = WEEKS[w.n]
    if (!meta) return null
    for (const l of meta.lessons) {
      if (!l.optional && !lessons[lessonId(w.n, l.slug)]?.done) return `/week/${w.n}/lesson/${l.slug}`
    }
  }
  return null
}
