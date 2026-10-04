// Интервальное повторение по алгоритму SM-2 (SuperMemo 2).
// Четыре кнопки соответствуют оценкам SM-2: снова=1, трудно=3, хорошо=4, легко=5.

export type Grade = 'again' | 'hard' | 'good' | 'easy'

export interface SrsState {
  ease: number // фактор лёгкости, не ниже 1.3
  interval: number // дней до следующего повторения
  reps: number // успешных повторений подряд
  lapses: number // сколько раз забыто
  due: string // ISO-дата следующего показа
  updatedAt: string
}

const Q: Record<Grade, number> = { again: 1, hard: 3, good: 4, easy: 5 }
const DAY = 24 * 60 * 60 * 1000

export function newCard(now = new Date()): SrsState {
  const iso = now.toISOString()
  return { ease: 2.5, interval: 0, reps: 0, lapses: 0, due: iso, updatedAt: iso }
}

export function review(state: SrsState, grade: Grade, now = new Date()): SrsState {
  const q = Q[grade]
  let { ease, interval, reps, lapses } = state

  if (q < 3) {
    reps = 0
    interval = 0 // показать снова в этой же сессии
    lapses += 1
  } else {
    reps += 1
    if (reps === 1) interval = grade === 'easy' ? 3 : 1
    else if (reps === 2) interval = grade === 'easy' ? 8 : 6
    else interval = Math.round(interval * ease * (grade === 'hard' ? 0.8 : grade === 'easy' ? 1.3 : 1))
    if (grade === 'hard' && reps > 1) interval = Math.max(interval, state.interval + 1)
  }

  ease = Math.max(1.3, ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)))

  const due = new Date(now.getTime() + interval * DAY)
  return { ease, interval, reps, lapses, due: due.toISOString(), updatedAt: now.toISOString() }
}

export function isDue(state: SrsState, now = new Date()): boolean {
  return new Date(state.due).getTime() <= now.getTime()
}
