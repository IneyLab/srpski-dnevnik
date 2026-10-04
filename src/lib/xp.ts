// Опыт и навыки персонажа. Опыт хранится как журнал событий (xpLedger):
// одно событие = одно начисление, повторное прохождение не даёт опыт дважды.
// Уровень и навыки всегда вычисляются из журнала.

export type Skill = 'speaking' | 'listening' | 'reading' | 'writing' | 'vocab' | 'grammar'

export const SKILLS: Skill[] = ['speaking', 'listening', 'reading', 'writing', 'vocab', 'grammar']

export interface XpEvent {
  xp: number
  skill: Skill | null
  at: string
}

export type XpLedger = Record<string, XpEvent>

export const XP = {
  exerciseFirstTry: 10,
  exerciseLater: 5,
  lessonDone: 30,
  product: 50,
} as const

/** Опыт, нужный для перехода с уровня n на n+1: 100, 150, 200, … */
export function xpForLevel(level: number): number {
  return 100 + (level - 1) * 50
}

export function levelFromXp(total: number): { level: number; intoLevel: number; nextAt: number } {
  let level = 1
  let rest = total
  while (rest >= xpForLevel(level)) {
    rest -= xpForLevel(level)
    level++
  }
  return { level, intoLevel: rest, nextAt: xpForLevel(level) }
}

export function totalXp(ledger: XpLedger): number {
  return Object.values(ledger).reduce((s, e) => s + e.xp, 0)
}

export function skillXp(ledger: XpLedger): Record<Skill, number> {
  const out = Object.fromEntries(SKILLS.map((s) => [s, 0])) as Record<Skill, number>
  for (const e of Object.values(ledger)) if (e.skill) out[e.skill] += e.xp
  return out
}

/** Добавить событие, если его ещё не было. Возвращает тот же объект, если ничего не изменилось. */
export function award(ledger: XpLedger, key: string, xp: number, skill: Skill | null, now = new Date()): XpLedger {
  if (ledger[key]) return ledger
  return { ...ledger, [key]: { xp, skill, at: now.toISOString() } }
}

export function exerciseXp(firstTry: boolean): number {
  return firstTry ? XP.exerciseFirstTry : XP.exerciseLater
}
