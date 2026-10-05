// Открытие мест на карте: чистая функция от отметок занятий.
import type { Place, Unlock } from '../content/places'

type Lessons = Record<string, { done: boolean }>
/** Обязательные занятия недели (из registry.requiredLessons); пустой список — неделя ещё не опубликована. */
type RequiredOf = (week: number) => string[]

export function unlockMet(u: Unlock, lessons: Lessons, requiredOf: RequiredOf): boolean {
  if (u === 'start') return true
  if ('lesson' in u) return Boolean(lessons[u.lesson]?.done)
  const req = requiredOf(u.week)
  return req.length > 0 && req.every((id) => lessons[id]?.done)
}

export function isPlaceOpen(p: Place, lessons: Lessons, requiredOf: RequiredOf): boolean {
  return p.unlock.some((u) => unlockMet(u, lessons, requiredOf))
}

/** Подсказка «как открыть» для закрытого места. */
export function unlockHint(p: Place): string {
  const parts = p.unlock.map((u) => {
    if (u === 'start') return 'открыто с начала'
    if ('lesson' in u) {
      const m = u.lesson.match(/^w(\d+)\.(s(\d+)|checkin)$/)
      if (!m) return u.lesson
      return m[3] ? `занятие С${m[3]} недели ${m[1]}` : `чек-ин недели ${m[1]}`
    }
    return `неделя ${u.week} целиком`
  })
  return `Откроется: ${parts.join(' или ')}`
}
