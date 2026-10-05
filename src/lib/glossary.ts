// Словарь для подсказки по двойному щелчку: сербская словоформа → перевод.
// Глоссарий — массив строк, по строке на запись:
//   'форма, форма2 = перевод | начальная форма'
// Начальная форма (после «|») необязательна. Сербские примеры в переводе — в `обратных кавычках`.
import { latToCyr } from './translit'

export interface GlossEntry {
  ru: string
  /** Начальная (словарная) форма, если слово стоит в другой форме: «зовем» ← «звати се». */
  base?: string
  falseFriend?: string
  note?: string
}

export type Glossary = Record<string, GlossEntry>

/** Слово в ключ словаря: строчные буквы, кириллица, без знаков препинания по краям. */
export function glossKey(word: string): string {
  const w = word
    .trim()
    .toLowerCase()
    .replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '')
  return /[a-zčćđšž]/.test(w) ? latToCyr(w) : w
}

export function parseGlossary(lines: string[]): Glossary {
  const out: Glossary = {}
  for (const raw of lines) {
    const line = raw.trim()
    const eq = line.indexOf('=')
    if (eq < 0) throw new Error(`Глоссарий: нет «=» в строке «${line}»`)
    const [ru, base] = line
      .slice(eq + 1)
      .split('|')
      .map((x) => x.trim())
    if (!ru) throw new Error(`Глоссарий: пустой перевод в строке «${line}»`)
    for (const form of line.slice(0, eq).split(',')) {
      const key = glossKey(form)
      if (!key) throw new Error(`Глоссарий: пустая форма в строке «${line}»`)
      if (out[key]) throw new Error(`Глоссарий: «${key}» записано дважды`)
      out[key] = base ? { ru, base } : { ru }
    }
  }
  return out
}

/** Кириллические слова в сербском фрагменте (для проверки, что словарь покрывает текст уроков). */
export function wordsOf(text: string): string[] {
  return (text.replace(/<[^>]+>/g, '').match(/[а-яёђјљњћџ]+/giu) ?? []).map(glossKey)
}
