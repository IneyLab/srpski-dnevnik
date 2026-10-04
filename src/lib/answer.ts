import { anyToLat } from './translit'

export type Verdict = 'correct' | 'almost' | 'partial' | 'wrong'

export interface CheckResult {
  verdict: Verdict
  /** Засчитан ли ответ (с учётом строгости к диакритике). */
  accepted: boolean
  /** Какой из правильных вариантов ближе всего (для подсказки). */
  closest: string
}

/** Пробелы по краям, повторные пробелы, регистр, конечная пунктуация, кавычки. */
export function normalize(text: string): string {
  return anyToLat(text)
    .normalize('NFC')
    .toLowerCase()
    .replace(/[«»"“”„'’]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.!?,;:…]+$/u, '')
    .trim()
}

const DIACRITICS: Record<string, string> = { č: 'c', ć: 'c', đ: 'dj', š: 's', ž: 'z' }

/** Убирает сербскую диакритику: đ → dj (так пишут без сербской раскладки), остальные — без знака. */
export function foldDiacritics(text: string): string {
  return text.replace(/[čćđšž]/g, (ch) => DIACRITICS[ch])
}

export function levenshtein(a: string, b: string): number {
  const x = Array.from(a)
  const y = Array.from(b)
  let prev = Array.from({ length: y.length + 1 }, (_, i) => i)
  for (let i = 1; i <= x.length; i++) {
    const cur = [i]
    for (let j = 1; j <= y.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1))
    }
    prev = cur
  }
  return prev[y.length]
}

/** Порог «почти совпало» для подсказки: 1 ошибка в коротких словах, 2 в длинных. */
function partialThreshold(len: number): number {
  return len <= 4 ? 1 : len <= 10 ? 2 : 3
}

export function checkAnswer(input: string, answers: string[], strictDiacritics = false): CheckResult {
  const given = normalize(input)
  let best: CheckResult = { verdict: 'wrong', accepted: false, closest: answers[0] ?? '' }
  if (!given) return best
  const rank: Record<Verdict, number> = { correct: 3, almost: 2, partial: 1, wrong: 0 }

  for (const answer of answers) {
    const target = normalize(answer)
    let verdict: Verdict = 'wrong'
    if (given === target) verdict = 'correct'
    else if (foldDiacritics(given) === foldDiacritics(target)) verdict = 'almost'
    else if (levenshtein(foldDiacritics(given), foldDiacritics(target)) <= partialThreshold(target.length)) verdict = 'partial'

    if (rank[verdict] > rank[best.verdict]) {
      best = { verdict, accepted: verdict === 'correct' || (verdict === 'almost' && !strictDiacritics), closest: answer }
    }
  }
  return best
}

/** Подсказка: общая начальная часть ответа и правильного варианта. */
export function hintPrefix(input: string, answer: string): string {
  const a = Array.from(normalize(input))
  const b = Array.from(normalize(answer))
  let i = 0
  while (i < a.length && i < b.length && a[i] === b[i]) i++
  return b.slice(0, i).join('')
}
