import { describe, it, expect } from 'vitest'
import { glossKey, parseGlossary, sentenceAround, splitGloss, wordsOf } from './glossary'

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

describe('перевод и контекст для карточки', () => {
  it('основное значение — до двоеточия вне скобок', () => {
    expect(splitGloss('зову: `Зовем се` — меня зовут')).toEqual({ ru: 'зову', rest: '`Зовем се` — меня зовут' })
    expect(splitGloss('мы; мне (краткая форма: `Драго ми је` — мне приятно)')).toEqual({ ru: 'мы; мне (краткая форма: `Драго ми је` — мне приятно)' })
    expect(splitGloss('квартира')).toEqual({ ru: 'квартира' })
  })

  it('предложение вокруг слова', () => {
    const t = 'Здраво! Зовем се Ана. Ја сам из Русије.'
    expect(sentenceAround(t, t.indexOf('се'))).toBe('Зовем се Ана.')
    expect(sentenceAround(t, 0)).toBe('Здраво!')
    expect(sentenceAround(t, t.indexOf('Русије'))).toBe('Ја сам из Русије.')
    expect(sentenceAround('Зовем се…', 0)).toBe('Зовем се…')
    expect(sentenceAround('Ово је мој брат', 4)).toBe('Ово је мој брат')
  })

  it('длинное предложение обрезается вокруг слова', () => {
    const t = 'а '.repeat(200) + 'слово ' + 'б '.repeat(200)
    const c = sentenceAround(t, t.indexOf('слово'))
    expect(c).toContain('слово')
    expect(c.startsWith('…') && c.endsWith('…')).toBe(true)
    expect(c.length).toBeLessThan(210)
  })
})
