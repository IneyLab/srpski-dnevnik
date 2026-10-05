// Словарь подсказки по двойному щелчку. Собирается сам из трёх мест:
// словарики недель (vocab.ts), однословные места на карте (places.ts) и глоссарии недель (weeks/NN/glossary.ts).
// Глоссарий важнее словарика: в нём записаны конкретные формы и пояснения к ним.
import { VOCAB } from './registry'
import { PLACES } from './places'
import { glossKey, parseGlossary, type GlossEntry, type Glossary } from '../lib/glossary'

const glossaryModules = import.meta.glob<{ default: string[] }>('./weeks/*/glossary.ts', { eager: true })

/** Ошибки в глоссариях (повтор формы, нет «=»): приложение их пропускает, тест — нет. */
export const GLOSSARY_ERRORS: string[] = []

function build(): Glossary {
  const dict: Glossary = {}
  for (const items of Object.values(VOCAB)) {
    for (const v of items) {
      const forms = typeof v.sr === 'string' ? v.sr.split(',') : [v.sr.f, v.sr.m]
      for (const form of forms) {
        // Фразы («Добар дан!») щелчком не выделишь целиком — берём только отдельные слова.
        if (/\s/.test(form.trim())) continue
        const key = glossKey(form)
        if (key && !dict[key]) dict[key] = { ru: v.ru, falseFriend: v.falseFriend, note: v.note }
      }
    }
  }
  for (const p of PLACES) {
    if (/\s/.test(p.sr)) continue
    const key = glossKey(p.sr)
    if (!dict[key]) dict[key] = { ru: `${p.ru} — ${p.tagline.charAt(0).toLowerCase()}${p.tagline.slice(1)}` }
  }
  for (const [path, mod] of Object.entries(glossaryModules)) {
    try {
      Object.assign(dict, parseGlossary(mod.default))
    } catch (e) {
      GLOSSARY_ERRORS.push(`${path}: ${e instanceof Error ? e.message : e}`)
    }
  }
  return dict
}

export const DICTIONARY: Glossary = build()

export function lookupWord(word: string): GlossEntry | undefined {
  return DICTIONARY[glossKey(word)]
}
