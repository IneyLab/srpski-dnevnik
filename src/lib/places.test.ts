import { describe, it, expect } from 'vitest'
import { isPlaceOpen, unlockHint, unlockMet } from './places'
import type { Place } from '../content/places'

const required = (w: number) => (w === 1 ? ['w1.s1', 'w1.s2'] : [])
const place = (unlock: Place['unlock']): Place => ({
  id: 'x',
  sr: 'Х',
  ru: 'Х',
  lon: 20,
  lat: 44,
  unlock,
  link: { week: 1 },
  tagline: '',
  facts: [],
})

describe('открытие мест на карте', () => {
  it('стартовое место открыто сразу', () => {
    expect(isPlaceOpen(place(['start']), {}, required)).toBe(true)
  })
  it('по отметке занятия', () => {
    const p = place([{ lesson: 'w1.s1' }])
    expect(isPlaceOpen(p, {}, required)).toBe(false)
    expect(isPlaceOpen(p, { 'w1.s1': { done: false } }, required)).toBe(false)
    expect(isPlaceOpen(p, { 'w1.s1': { done: true } }, required)).toBe(true)
  })
  it('по всей неделе: нужны все обязательные занятия', () => {
    expect(unlockMet({ week: 1 }, { 'w1.s1': { done: true } }, required)).toBe(false)
    expect(unlockMet({ week: 1 }, { 'w1.s1': { done: true }, 'w1.s2': { done: true } }, required)).toBe(true)
  })
  it('неопубликованная неделя не открывает место', () => {
    expect(unlockMet({ week: 9 }, {}, required)).toBe(false)
  })
  it('любое из условий', () => {
    const p = place([{ lesson: 'w1.s6' }, { week: 1 }])
    expect(isPlaceOpen(p, { 'w1.s6': { done: true } }, required)).toBe(true)
    expect(isPlaceOpen(p, { 'w1.s1': { done: true }, 'w1.s2': { done: true } }, required)).toBe(true)
    expect(unlockHint(p)).toBe('Откроется: урок 6 недели 1 или неделя 1 целиком')
  })
})
