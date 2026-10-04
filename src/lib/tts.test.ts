import { describe, it, expect } from 'vitest'
import { ttsSlug, splitWords } from './tts'

describe('ttsSlug', () => {
  it('однозначно переводит кириллицу в ASCII', () => {
    expect(ttsSlug('Ђердап')).toBe('djerdap')
    expect(ttsSlug('кућа')).toBe('kucja')
    expect(ttsSlug('чај')).toBe('chaj')
    expect(ttsSlug('џем')).toBe('dzhem')
    expect(ttsSlug('љубав')).toBe('ljubav')
    expect(ttsSlug('карта за Београд')).toBe('karta-za-beograd')
  })
  it('ч и ћ дают разные имена', () => {
    expect(ttsSlug('чар')).not.toBe(ttsSlug('ћар'))
  })
  it('splitWords', () => {
    expect(splitWords('дан, брат , ,сала')).toEqual(['дан', 'брат', 'сала'])
  })
})
