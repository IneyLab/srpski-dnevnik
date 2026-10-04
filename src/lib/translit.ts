// Сербский текст на сайте хранится в кириллице.
// Кириллица → латиница однозначна. Обратное направление — нет (lj, nj, dž могут
// быть двумя буквами на стыке морфем: konjugacija, nadživeti), поэтому latToCyr
// используется только для сравнения ответов, а не для отображения.

const CYR_TO_LAT: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', ђ: 'đ', е: 'e', ж: 'ž', з: 'z', и: 'i',
  ј: 'j', к: 'k', л: 'l', љ: 'lj', м: 'm', н: 'n', њ: 'nj', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', ћ: 'ć', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'č', џ: 'dž', ш: 'š',
}

const DIGRAPHS = new Set(['љ', 'њ', 'џ'])

function isUpper(ch: string): boolean {
  return ch !== ch.toLowerCase() && ch === ch.toUpperCase()
}

export function cyrToLat(text: string): string {
  let out = ''
  const chars = Array.from(text)
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i]
    const lower = ch.toLowerCase()
    const lat = CYR_TO_LAT[lower]
    if (lat === undefined) {
      out += ch
      continue
    }
    if (!isUpper(ch)) {
      out += lat
      continue
    }
    if (DIGRAPHS.has(lower)) {
      // Љ → LJ внутри слова из заглавных (ЉУБАВ → LJUBAV), иначе Lj (Љубав → Ljubav)
      const prev = chars[i - 1]
      const next = chars[i + 1]
      const neighbourUpper =
        (next !== undefined && isUpper(next)) || (prev !== undefined && isUpper(prev) && (next === undefined || !/\p{L}/u.test(next)))
      out += neighbourUpper ? lat.toUpperCase() : lat[0].toUpperCase() + lat.slice(1)
    } else {
      out += lat.toUpperCase()
    }
  }
  return out
}

const LAT_DIGRAPHS: Record<string, string> = { lj: 'љ', nj: 'њ', dž: 'џ' }
const LAT_TO_CYR: Record<string, string> = Object.fromEntries(
  Object.entries(CYR_TO_LAT)
    .filter(([, l]) => l.length === 1)
    .map(([c, l]) => [l, c]),
)

/** Латиница → кириллица. Только для сравнения, см. комментарий выше. */
export function latToCyr(text: string): string {
  let out = ''
  const chars = Array.from(text)
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i]
    const pair = (ch + (chars[i + 1] ?? '')).toLowerCase()
    if (LAT_DIGRAPHS[pair]) {
      const cyr = LAT_DIGRAPHS[pair]
      out += isUpper(ch) ? cyr.toUpperCase() : cyr
      i++
      continue
    }
    const cyr = LAT_TO_CYR[ch.toLowerCase()]
    if (cyr === undefined) out += ch
    else out += isUpper(ch) ? cyr.toUpperCase() : cyr
  }
  return out
}

export type Script = 'cyr' | 'lat'

export function toScript(cyrText: string, script: Script): string {
  return script === 'lat' ? cyrToLat(cyrText) : cyrText
}

export function hasCyrillic(text: string): boolean {
  return /[\u0400-\u04FF]/.test(text)
}

/** Любой сербский текст (кириллица или латиница) → латиница. */
export function anyToLat(text: string): string {
  return hasCyrillic(text) ? cyrToLat(text) : text
}
