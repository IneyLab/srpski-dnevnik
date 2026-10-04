import { describe, it, expect } from 'vitest'
import { checkAnswer, normalize, foldDiacritics, levenshtein, hintPrefix } from './answer'

describe('normalize', () => {
  it('регистр, пробелы, пунктуация', () => {
    expect(normalize('  Ja   SAM  Ruskinja. ')).toBe('ja sam ruskinja')
    expect(normalize('Zdravo!')).toBe('zdravo')
  })
  it('кириллица приводится к латинице', () => {
    expect(normalize('Ја сам')).toBe('ja sam')
  })
})

describe('foldDiacritics', () => {
  it('đ → dj, остальное без знака', () => {
    expect(foldDiacritics('đak ćevapčići šuma žaba')).toBe('djak cevapcici suma zaba')
  })
})

describe('levenshtein', () => {
  it('считает расстояние', () => {
    expect(levenshtein('sam', 'sam')).toBe(0)
    expect(levenshtein('sam', 'som')).toBe(1)
    expect(levenshtein('zovem', 'zovm')).toBe(1)
  })
})

describe('checkAnswer', () => {
  it('точный ответ в любом алфавите', () => {
    expect(checkAnswer('sam', ['сам']).verdict).toBe('correct')
    expect(checkAnswer('САМ', ['sam']).verdict).toBe('correct')
  })
  it('мягкий режим: без диакритики засчитано как almost', () => {
    const r = checkAnswer('cevapcici', ['ćevapčići'])
    expect(r.verdict).toBe('almost')
    expect(r.accepted).toBe(true)
  })
  it('строгий режим: без диакритики не засчитано', () => {
    const r = checkAnswer('cevapcici', ['ćevapčići'], true)
    expect(r.verdict).toBe('almost')
    expect(r.accepted).toBe(false)
  })
  it('đ можно писать как dj', () => {
    expect(checkAnswer('Djerdap', ['Ђердап']).verdict).toBe('almost')
  })
  it('частичное совпадение даёт partial', () => {
    expect(checkAnswer('Ruskina', ['Ruskinja']).verdict).toBe('partial')
    expect(checkAnswer('Ruskina', ['Ruskinja']).accepted).toBe(false)
  })
  it('несколько правильных вариантов', () => {
    expect(checkAnswer('Ja se zovem Ana', ['Zovem se Ana', 'Ja se zovem Ana']).verdict).toBe('correct')
  })
  it('неверный и пустой ответ', () => {
    expect(checkAnswer('kuća', ['sam']).verdict).toBe('wrong')
    expect(checkAnswer('   ', ['sam']).verdict).toBe('wrong')
  })
})

describe('hintPrefix', () => {
  it('общее начало', () => {
    expect(hintPrefix('Ruskina', 'Ruskinja')).toBe('ruskin')
  })
})
