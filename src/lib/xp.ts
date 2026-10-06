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
  /** «Отчитайся преподавателю» в занятии-продукте недели (урок 5). */
  product: 50,
  /** «Отчитайся преподавателю» в остальных занятиях и чек-ине. */
  report: 15,
  /** Упражнение с ИИ сделано (одно упражнение — один чат). */
  chatAi: 10,
  /** Практика с живыми людьми. */
  people: 20,
  /** Карточка выучена: второе успешное повторение подряд. */
  cardLearned: 3,
  /** Ошибка из тетради разобрана. */
  mistakeFixed: 2,
  /** Значок за реальное дело. */
  badge: 25,
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

/** Убрать событие (например, снята отметка значка). */
export function revoke(ledger: XpLedger, key: string): XpLedger {
  if (!ledger[key]) return ledger
  const { [key]: _removed, ...rest } = ledger
  return rest
}

export function exerciseXp(firstTry: boolean): number {
  return firstTry ? XP.exerciseFirstTry : XP.exerciseLater
}

/** Опыт за блок «💬 Вернись к преподавателю»: ИИ — в навык блока, люди — говорение, отчёт — письмо (в занятии-продукте больше). */
export function chatXp(kind: 'ai' | 'report' | 'people', lessonKind: string, skill?: Skill): { xp: number; skill: Skill | null } {
  if (kind === 'ai') return { xp: XP.chatAi, skill: skill ?? null }
  if (kind === 'people') return { xp: XP.people, skill: 'speaking' }
  return { xp: lessonKind === 'product' ? XP.product : XP.report, skill: 'writing' }
}

/** Уровень навыка: каждые 50 опыта — новый уровень. */
export const SKILL_STEP = 50

export function skillLevel(xp: number): { level: number; into: number } {
  return { level: Math.floor(xp / SKILL_STEP) + 1, into: xp % SKILL_STEP }
}

export const SKILL_NAMES: Record<Skill, string> = {
  speaking: 'Говорение',
  listening: 'Аудирование',
  reading: 'Чтение',
  writing: 'Письмо',
  vocab: 'Лексика',
  grammar: 'Грамматика',
}

/** Последние события журнала, новые первыми. */
export function recentEvents(ledger: XpLedger, limit = 10): (XpEvent & { key: string })[] {
  return Object.entries(ledger)
    .map(([key, e]) => ({ key, ...e }))
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, limit)
}
