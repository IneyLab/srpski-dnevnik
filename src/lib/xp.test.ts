import { describe, it, expect } from 'vitest'
import { award, levelFromXp, totalXp, skillXp, xpForLevel, exerciseXp } from './xp'

describe('xp', () => {
  it('уровни: 100, 150, 200…', () => {
    expect(xpForLevel(1)).toBe(100)
    expect(levelFromXp(0)).toEqual({ level: 1, intoLevel: 0, nextAt: 100 })
    expect(levelFromXp(99).level).toBe(1)
    expect(levelFromXp(100)).toEqual({ level: 2, intoLevel: 0, nextAt: 150 })
    expect(levelFromXp(260)).toEqual({ level: 3, intoLevel: 10, nextAt: 200 })
  })
  it('событие начисляется один раз', () => {
    let l = award({}, 'ex:w1.s1.a', 10, 'reading')
    const same = award(l, 'ex:w1.s1.a', 10, 'reading')
    expect(same).toBe(l)
    l = award(l, 'lesson:w1.s1', 30, null)
    expect(totalXp(l)).toBe(40)
    expect(skillXp(l).reading).toBe(10)
    expect(skillXp(l).speaking).toBe(0)
  })
  it('первая попытка ценнее', () => {
    expect(exerciseXp(true)).toBeGreaterThan(exerciseXp(false))
  })
})
