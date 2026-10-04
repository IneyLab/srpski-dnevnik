import { describe, it, expect } from 'vitest'
import { cyrToLat, latToCyr, anyToLat } from './translit'

describe('cyrToLat', () => {
  it('переводит обычный текст', () => {
    expect(cyrToLat('Ја сам Рускиња.')).toBe('Ja sam Ruskinja.')
    expect(cyrToLat('Драго ми је.')).toBe('Drago mi je.')
  })
  it('шесть «новых» букв', () => {
    expect(cyrToLat('ђ ћ џ љ њ ј')).toBe('đ ć dž lj nj j')
    expect(cyrToLat('ћевапчићи')).toBe('ćevapčići')
    expect(cyrToLat('Ђурђевдан')).toBe('Đurđevdan')
  })
  it('заглавные диграфы', () => {
    expect(cyrToLat('Љубав')).toBe('Ljubav')
    expect(cyrToLat('ЉУБАВ')).toBe('LJUBAV')
    expect(cyrToLat('Његош')).toBe('Njegoš')
    expect(cyrToLat('Џ')).toBe('Dž')
    expect(cyrToLat('ЏЕМ')).toBe('DŽEM')
  })
  it('не трогает латиницу и знаки', () => {
    expect(cyrToLat('Go-Serbia, 2026!')).toBe('Go-Serbia, 2026!')
  })
})

describe('latToCyr', () => {
  it('диграфы', () => {
    expect(latToCyr('ljubav')).toBe('љубав')
    expect(latToCyr('Njegoš')).toBe('Његош')
    expect(latToCyr('džem')).toBe('џем')
    expect(latToCyr('Zovem se Ana.')).toBe('Зовем се Ана.')
  })
  it('обратимость для обычных слов', () => {
    for (const w of ['ћевапчићи', 'Београд', 'учитељица', 'Ђердап', 'жаба']) {
      expect(latToCyr(cyrToLat(w))).toBe(w)
    }
  })
})

describe('anyToLat', () => {
  it('принимает оба алфавита', () => {
    expect(anyToLat('сам')).toBe('sam')
    expect(anyToLat('sam')).toBe('sam')
  })
})
