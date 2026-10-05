import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import s from './gloss.module.css'
import { lookupWord } from '../../content/dictionary'
import { toScript } from '../../lib/translit'
import { useScript } from '../../store/hooks'
import { Rich } from './Rich'
import type { GlossEntry } from '../../lib/glossary'

interface Shown {
  word: string
  entry?: GlossEntry
  /** Прямоугольник слова на экране (position: fixed). */
  rect: { left: number; top: number; bottom: number; width: number }
}

const GAP = 8
const MARGIN = 16

/** Выделенное двойным щелчком слово: только буквы, без пробела и знаков вокруг. */
function selectedWord(): { word: string; rect: DOMRect } | null {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return null
  const word = sel.toString().match(/[\p{L}]+(?:-[\p{L}]+)*/u)?.[0]
  if (!word) return null
  const rect = sel.getRangeAt(0).getBoundingClientRect()
  return rect.width || rect.height ? { word, rect } : null
}

/**
 * Перевод по двойному щелчку на сербском слове: подсказка над словом.
 * Работает в любом элементе с lang="sr", кроме полей ввода и блоков с data-no-gloss
 * (упражнения и карточки: там перевод — это ответ).
 */
export function WordGloss() {
  const [shown, setShown] = useState<Shown | null>(null)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)
  const box = useRef<HTMLDivElement>(null)
  const script = useScript()
  const { pathname } = useLocation()

  useEffect(() => {
    const onDblClick = (e: MouseEvent) => {
      const t = e.target instanceof Element ? e.target : null
      if (!t?.closest('[lang="sr"]') || t.closest('a, input, textarea, select, button, [contenteditable], [data-no-gloss]')) return
      const sel = selectedWord()
      if (!sel) return
      const { left, top, bottom, width } = sel.rect
      setPos(null)
      setShown({ word: sel.word, entry: lookupWord(sel.word), rect: { left, top, bottom, width } })
    }
    document.addEventListener('dblclick', onDblClick)
    return () => document.removeEventListener('dblclick', onDblClick)
  }, [])

  useEffect(() => {
    if (!shown) return
    const close = () => setShown(null)
    const onDown = (e: PointerEvent) => {
      if (!(e.target instanceof Node && box.current?.contains(e.target))) close()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', close, { passive: true })
    window.addEventListener('resize', close)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', close)
      window.removeEventListener('resize', close)
    }
  }, [shown])

  useEffect(() => setShown(null), [pathname])

  // Над словом, по центру; если сверху не помещается — под словом. Не вылезает за края экрана.
  useLayoutEffect(() => {
    if (!shown || !box.current) return
    const { width, height } = box.current.getBoundingClientRect()
    const r = shown.rect
    const center = r.left + r.width / 2
    const left = Math.min(Math.max(center - width / 2, MARGIN), window.innerWidth - width - MARGIN)
    const above = r.top - GAP - height
    setPos({ left: Math.max(left, MARGIN), top: above >= MARGIN ? above : r.bottom + GAP })
  }, [shown])

  if (!shown) return null
  const { word, entry } = shown
  const lookupUrl = `https://translate.google.com/?sl=sr&tl=ru&text=${encodeURIComponent(word)}&op=translate`
  return (
    <div
      ref={box}
      className={s.gloss}
      data-no-gloss
      role="status"
      aria-live="polite"
      style={pos ? { left: pos.left, top: pos.top } : { left: 0, top: 0, visibility: 'hidden' }}
    >
      <span className={s.word} lang="sr">
        {word}
      </span>
      {entry?.base && (
        <span className={s.base}>
          {' '}
          ← <span lang="sr">{toScript(entry.base, script)}</span>
        </span>
      )}
      {entry ? (
        <>
          <span className={s.ru}>
            <Rich text={entry.ru} />
          </span>
          {entry.note && (
            <span className={s.note}>
              <Rich text={entry.note} />
            </span>
          )}
          {entry.falseFriend && (
            <span className={s.note}>
              ⚠️ Ложный друг: <Rich text={entry.falseFriend} />
            </span>
          )}
        </>
      ) : (
        <span className={s.note}>
          Этого слова пока нет в словаре учебника.{' '}
          <a href={lookupUrl} target="_blank" rel="noreferrer">
            Посмотреть в Google Переводчике
          </a>
        </span>
      )}
    </div>
  )
}
