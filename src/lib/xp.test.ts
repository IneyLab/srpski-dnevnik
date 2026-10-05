import { describe, it, expect } from 'vitest'
import { award, levelFromXp, totalXp, skillXp, xpForLevel, exerciseXp, revoke, chatXp, skillLevel, recentEvents, XP } from './xp'

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
  it('снятое событие убирается, без события — тот же объект', () => {
    const l = award({}, 'badge:first-call', XP.badge, 'speaking')
    expect(totalXp(revoke(l, 'badge:first-call'))).toBe(0)
    expect(revoke(l, 'нет такого')).toBe(l)
  })
  it('опыт за блоки «Вернись к преподавателю»', () => {
    expect(chatXp('ai', 'input', 'listening')).toEqual({ xp: XP.chatAi, skill: 'listening' })
    expect(chatXp('report', 'product')).toEqual({ xp: XP.product, skill: 'writing' })
    expect(chatXp('report', 'checkin')).toEqual({ xp: XP.report, skill: 'writing' })
    expect(chatXp('people', 'people')).toEqual({ xp: XP.people, skill: 'speaking' })
  })
  it('уровень навыка и журнал', () => {
    expect(skillLevel(0)).toEqual({ level: 1, into: 0 })
    expect(skillLevel(120)).toEqual({ level: 3, into: 20 })
    let l = award({}, 'a', 1, null, new Date('2026-10-01'))
    l = award(l, 'b', 2, null, new Date('2026-10-03'))
    expect(recentEvents(l, 1).map((e) => e.key)).toEqual(['b'])
  })
})
