import { describe, it, expect } from 'vitest'
import { glossKey, parseGlossary, wordsOf } from './glossary'

describe('глоссарий', () => {
  it('разбирает формы, перевод и начальную форму', () => {
    const g = parseGlossary(['зовем = зову: `Зовем се` — меня зовут | звати се', 'панчићева, панчићев = Панчича'])
    expect(g['зовем']).toEqual({ ru: 'зову: `Зовем се` — меня зовут', base: 'звати се' })
    expect(g['панчићев']).toEqual({ ru: 'Панчича' })
  })

  it('ругается на повтор и на строку без перевода', () => {
    expect(() => parseGlossary(['сам = есть', 'сам = сам'])).toThrow(/дважды/)
    expect(() => parseGlossary(['сам'])).toThrow(/=/)
  })

  it('ключ: регистр, знаки препинания, латиница', () => {
    expect(glossKey('Зовем,')).toBe('зовем')
    expect(glossKey('«Ćao!»')).toBe('ћао')
    expect(glossKey('Džak')).toBe('џак')
  })

  it('слова фрагмента без HTML-тегов и латиницы', () => {
    expect(wordsOf('р<b>у</b>ка, LARP и Ћеле-кула')).toEqual(['рука', 'и', 'ћеле', 'кула'])
  })
})
