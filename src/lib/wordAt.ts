// Слово на странице для подсказки с переводом: по выделению (двойной щелчок) или по точке касания (долгое нажатие).
import { sentenceAround } from './glossary'

export interface WordHit {
  word: string
  /** Где стоит слово: по нему подсказка встаёт над словом и следует за ним при прокрутке. */
  range: Range
}

const WORD = /\p{L}+(?:-\p{L}+)*/gu

/** Слово, выделенное двойным щелчком: только буквы, без пробела и знаков вокруг. */
export function selectedWord(): WordHit | null {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null
  const range = sel.getRangeAt(0).cloneRange()
  const word = range.toString().match(/\p{L}+(?:-\p{L}+)*/u)?.[0]
  return word ? { word, range } : null
}

const inside = (r: DOMRect, x: number, y: number, pad = 2) =>
  x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad

/**
 * Слово под точкой (x, y): перебираем слова в текстовых узлах элемента под пальцем
 * и ищем то, чей прямоугольник содержит точку. Работает и там, где выделение текста отключено.
 */
export function wordAtPoint(x: number, y: number): WordHit | null {
  const el = document.elementFromPoint(x, y)
  if (!el) return null
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent ?? ''
    for (const m of text.matchAll(WORD)) {
      const range = document.createRange()
      range.setStart(node, m.index)
      range.setEnd(node, m.index + m[0].length)
      if ([...range.getClientRects()].some((r) => inside(r, x, y))) return { word: m[0], range }
    }
  }
  return null
}

const BLOCK = 'p, li, td, th, dd, dt, blockquote, h1, h2, h3, h4, figcaption, label'

/**
 * Фраза, в которой встретилось слово (как её видит ученик): предложение из сербского фрагмента,
 * а если фрагмент — одно это слово, то из абзаца или пункта списка вокруг него.
 * Пустая строка, если, кроме самого слова, ничего нет.
 */
export function contextOf(hit: WordHit): string {
  const start = hit.range.startContainer
  const el = start instanceof Element ? start : start.parentElement
  if (!el) return ''
  const sr = el.closest('[lang="sr"]')
  const block = el.closest(BLOCK)
  const srText = sr?.textContent?.trim() ?? ''
  const container = sr && (srText.match(WORD)?.length ?? 0) > 1 ? sr : block && (!sr || block.contains(sr)) ? block : sr
  if (!container) return ''
  const before = document.createRange()
  before.setStart(container, 0)
  before.setEnd(hit.range.startContainer, hit.range.startOffset)
  const context = sentenceAround(container.textContent ?? '', before.toString().length)
  return context.replace(/[.!?…]+$/, '').trim() === hit.word ? '' : context
}
