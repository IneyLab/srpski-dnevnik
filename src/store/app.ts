// Всё состояние учебника в одном persist-объекте (localStorage через safeStorage).
// Экспорт/импорт файлом работает с тем же объектом (см. lib/progressFile.ts).
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { safeStorage, STORAGE_KEYS } from '../lib/storage'
import { SCHEMA_VERSION } from '../lib/progressFile'
import { award, exerciseXp, XP, type Skill, type XpLedger } from '../lib/xp'
import type { SrsState } from '../lib/srs'
import type { Script } from '../lib/translit'

export type ThemePref = 'system' | 'light' | 'dark'
export type GenderPref = 'f' | 'm'

export interface Settings {
  theme: ThemePref
  script: Script
  gender: GenderPref | null
  strictDiacritics: boolean
  /** Режим тренировки: задание на одном алфавите, ответ на другом. */
  trainingMode: boolean
}

export interface LessonRecord {
  done: boolean
  doneAt?: string
  updatedAt: string
}

export interface ExerciseRecord {
  attempts: number
  correct: boolean
  firstCorrectAt?: string
  updatedAt: string
}

export interface MistakeRecord {
  kind: 'word' | 'rule'
  /** Что именно: правильный ответ или название правила. */
  label: string
  /** Откуда: id упражнения. */
  source: string
  /** Что ответил ученик в последний раз. */
  lastGiven?: string
  count: number
  lastAt: string
  resolved: boolean
  updatedAt: string
}

export interface ProgressData {
  schemaVersion: number
  settings: Settings
  lessons: Record<string, LessonRecord>
  exercises: Record<string, ExerciseRecord>
  xpLedger: XpLedger
  badges: Record<string, { at: string }>
  srs: Record<string, SrsState>
  mistakes: Record<string, MistakeRecord>
  lastVisited: { path: string; at: string } | null
}

interface Actions {
  setTheme(theme: ThemePref): void
  setScript(script: Script): void
  setGender(gender: GenderPref): void
  setStrictDiacritics(v: boolean): void
  setTrainingMode(v: boolean): void
  setLessonDone(id: string, done: boolean, skill?: Skill): void
  /** Попытка проверки упражнения. */
  countAttempt(id: string): void
  /** Упражнение выполнено целиком (все пункты верны). */
  completeExercise(id: string, skill: Skill): void
  addMistake(key: string, m: Pick<MistakeRecord, 'kind' | 'label' | 'source' | 'lastGiven'>): void
  setLastVisited(path: string): void
  replaceAll(data: Partial<ProgressData>): void
  resetProgress(): void
}

export const defaultData = (): ProgressData => ({
  schemaVersion: SCHEMA_VERSION,
  settings: { theme: 'system', script: 'cyr', gender: null, strictDiacritics: false, trainingMode: false },
  lessons: {},
  exercises: {},
  xpLedger: {},
  badges: {},
  srs: {},
  mistakes: {},
  lastVisited: null,
})

function applyTheme(theme: ThemePref) {
  safeStorage.setItem(STORAGE_KEYS.theme, theme)
  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (theme === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', theme)
}

const now = () => new Date().toISOString()

function pickData(s: ProgressData): ProgressData {
  return {
    schemaVersion: s.schemaVersion,
    settings: s.settings,
    lessons: s.lessons,
    exercises: s.exercises,
    xpLedger: s.xpLedger,
    badges: s.badges,
    srs: s.srs,
    mistakes: s.mistakes,
    lastVisited: s.lastVisited,
  }
}

type AppState = ProgressData & Actions

export const useApp = create<AppState>()(
  persist<AppState, [], [], ProgressData>(
    (set, get) => ({
      ...defaultData(),

      setTheme: (theme) => {
        applyTheme(theme)
        set((s) => ({ settings: { ...s.settings, theme } }))
      },
      setScript: (script) => set((s) => ({ settings: { ...s.settings, script } })),
      setGender: (gender) => set((s) => ({ settings: { ...s.settings, gender } })),
      setStrictDiacritics: (strictDiacritics) => set((s) => ({ settings: { ...s.settings, strictDiacritics } })),
      setTrainingMode: (trainingMode) => set((s) => ({ settings: { ...s.settings, trainingMode } })),

      setLessonDone: (id, done, skill) =>
        set((s) => ({
          lessons: { ...s.lessons, [id]: { done, doneAt: done ? now() : undefined, updatedAt: now() } },
          xpLedger: done ? award(s.xpLedger, `lesson:${id}`, XP.lessonDone, skill ?? null) : s.xpLedger,
        })),

      countAttempt: (id) =>
        set((s) => {
          const cur = s.exercises[id] ?? { attempts: 0, correct: false, updatedAt: now() }
          return { exercises: { ...s.exercises, [id]: { ...cur, attempts: cur.attempts + 1, updatedAt: now() } } }
        }),

      completeExercise: (id, skill) =>
        set((s) => {
          const cur = s.exercises[id] ?? { attempts: 1, correct: false, updatedAt: now() }
          if (cur.correct) return {}
          const firstTry = cur.attempts <= 1
          return {
            exercises: { ...s.exercises, [id]: { ...cur, correct: true, firstCorrectAt: now(), updatedAt: now() } },
            xpLedger: award(s.xpLedger, `ex:${id}`, exerciseXp(firstTry), skill),
          }
        }),

      addMistake: (key, m) =>
        set((s) => {
          const cur = s.mistakes[key]
          return {
            mistakes: {
              ...s.mistakes,
              [key]: { ...m, count: (cur?.count ?? 0) + 1, lastAt: now(), resolved: false, updatedAt: now() },
            },
          }
        }),

      setLastVisited: (path) => {
        if (get().lastVisited?.path === path) return
        set({ lastVisited: { path, at: now() } })
      },

      replaceAll: (data) => {
        const base = defaultData()
        const merged = { ...base, ...data, settings: { ...base.settings, ...data.settings } }
        applyTheme(merged.settings.theme)
        set(merged)
      },

      resetProgress: () => set((s) => ({ ...defaultData(), settings: s.settings })),
    }),
    {
      name: STORAGE_KEYS.app,
      version: SCHEMA_VERSION,
      storage: createJSONStorage(() => safeStorage),
      partialize: pickData,
    },
  ),
)

/** Снимок данных для экспорта. */
export function snapshot(): ProgressData {
  return pickData(useApp.getState())
}
