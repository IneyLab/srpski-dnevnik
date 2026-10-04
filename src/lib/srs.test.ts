import { describe, it, expect } from 'vitest'
import { newCard, review, isDue } from './srs'

const t0 = new Date('2026-10-05T10:00:00Z')
const days = (a: string, b: Date) => Math.round((new Date(a).getTime() - b.getTime()) / 86400000)

describe('SM-2', () => {
  it('новая карточка сразу к показу', () => {
    expect(isDue(newCard(t0), t0)).toBe(true)
  })
  it('интервалы 1 → 6 → 6·ease при «хорошо»', () => {
    let c = review(newCard(t0), 'good', t0)
    expect(c.interval).toBe(1)
    c = review(c, 'good', t0)
    expect(c.interval).toBe(6)
    c = review(c, 'good', t0)
    expect(c.interval).toBe(15) // 6 * 2.5
    expect(days(c.due, t0)).toBe(15)
  })
  it('«хорошо» не меняет ease, «легко» повышает, «трудно» понижает', () => {
    expect(review(newCard(t0), 'good', t0).ease).toBeCloseTo(2.5)
    expect(review(newCard(t0), 'easy', t0).ease).toBeCloseTo(2.6)
    expect(review(newCard(t0), 'hard', t0).ease).toBeCloseTo(2.36)
  })
  it('«снова» сбрасывает повторения и считает забывание', () => {
    let c = review(review(newCard(t0), 'good', t0), 'good', t0)
    c = review(c, 'again', t0)
    expect(c.reps).toBe(0)
    expect(c.interval).toBe(0)
    expect(c.lapses).toBe(1)
    expect(isDue(c, t0)).toBe(true)
  })
  it('ease не опускается ниже 1.3', () => {
    let c = newCard(t0)
    for (let i = 0; i < 20; i++) c = review(c, 'again', t0)
    expect(c.ease).toBe(1.3)
  })
  it('«трудно» всё равно увеличивает интервал', () => {
    let c = review(review(newCard(t0), 'good', t0), 'good', t0)
    const before = c.interval
    c = review(c, 'hard', t0)
    expect(c.interval).toBeGreaterThan(before)
  })
})
