import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import s from './gloss.module.css'
import { lookupWord } from '../../content/dictionary'
import { glossKey, type GlossEntry } from '../../lib/glossary'
import { contextOf, selectedWord, wordAtPoint, type WordHit } from '../../lib/wordAt'
import { playErrorText, playUrl } from '../../lib/player'
import { ttsUrl } from '../../lib/tts'
import { toScript } from '../../lib/translit'
import { useApp } from '../../store/app'
import { useScript } from '../../store/hooks'
import { Rich } from './Rich'
import { Say } from '../content/Say'

interface Shown {
  word: string
  /** Ключ словаря (кириллица, строчные): по нему озвучка и карточка. */
  key: string
  entry?: GlossEntry
  hit: WordHit
}

const GAP = 8
const MARGIN = 16
/** Долгое нажатие: сколько держать палец и насколько можно сдвинуть его, не отменяя. */
const LONG_PRESS_MS = 500
const MOVE_TOLERANCE = 10
const NOT_HERE = 'a, input, textarea, select, button, [contenteditable], [data-no-gloss]'

const canGloss = (t: EventTarget | null): t is Element =>
  t instanceof Element && Boolean(t.closest('[lang="sr"]')) && !t.closest(NOT_HERE)

/** Неделя и занятие по адресу страницы: /week/1/lesson/2 → { week: 1, lesson: 's2' }. */
function whereFrom(pathname: string): { week: number; lesson: string } {
  const m = pathname.match(/^\/week\/(\d+)\/lesson\/([^/]+)/)
  if (!m) return { week: 0, lesson: '' }
  return { week: Number(m[1]), lesson: m[2] === 'checkin' ? 'checkin' : `s${m[2]}` }
}

/**
 * Перевод сербского слова: двойной щелчок мышью или долгое нажатие пальцем.
 * Подсказка встаёт над словом, звучит озвучка Google Переводчика, слово попадает в карточки
 * вместе с фразой, где встретилось. Работает в любом элементе с lang="sr", кроме полей ввода,
 * кнопок, ссылок и блоков с data-no-gloss (упражнения и карточки: там перевод — это ответ).
 */
export function WordGloss() {
  const [shown, setShown] = useState<Shown | null>(null)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)
  const [audioError, setAudioError] = useState<string | null>(null)
  const box = useRef<HTMLDivElement>(null)
  const script = useScript()
  const { pathname } = useLocation()
  const path = useRef(pathname)
  useEffect(() => {
    path.current = pathname
  }, [pathname])
  const inCards = useApp((st) => (shown ? Boolean(st.lookups[shown.key]) : false))
  const addLookup = useApp((st) => st.addLookup)
  const removeLookup = useApp((st) => st.removeLookup)

  const play = useCallback((key: string) => {
    setAudioError(null)
    void playUrl(ttsUrl(key)).then((r) => {
      if (!r.ok && r.error !== 'stopped') setAudioError(playErrorText(r.error))
    })
  }, [])

  const addToCards = useCallback(
    (key: string, hit: WordHit) => addLookup(key, { context: contextOf(hit), ...whereFrom(path.current) }),
    [addLookup],
  )

  /** Показать перевод и добавить слово в карточки; вернуть ключ, если есть что озвучить. */
  const show = useCallback(
    (hit: WordHit): string | null => {
      const key = glossKey(hit.word)
      const entry = lookupWord(hit.word)
      if (entry) addToCards(key, hit)
      setPos(null)
      setAudioError(null)
      setShown({ word: hit.word, key, entry, hit })
      return entry ? key : null
    },
    [addToCards],
  )

  // Двойной щелчок мышью: слово уже выделено браузером, звук можно включать сразу
  useEffect(() => {
    const onDblClick = (e: MouseEvent) => {
      if (!canGloss(e.target)) return
      const hit = selectedWord() ?? wordAtPoint(e.clientX, e.clientY)
      if (!hit) return
      const key = show(hit)
      if (key) play(key)
    }
    document.addEventListener('dblclick', onDblClick)
    return () => document.removeEventListener('dblclick', onDblClick)
  }, [show, play])

  // Долгое нажатие пальцем или стилусом. Звук — когда палец отпущен: браузеры телефонов
  // разрешают включать звук только в ответ на касание, а не по таймеру.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    let start: { x: number; y: number } | null = null
    let pendingKey: string | null = null
    let fired = false
    const cancel = () => {
      clearTimeout(timer)
      timer = undefined
      start = null
    }
    const onDown = (e: PointerEvent) => {
      fired = false
      pendingKey = null
      if (e.pointerType === 'mouse' || !e.isPrimary || !canGloss(e.target)) return
      const { clientX: x, clientY: y } = e
      start = { x, y }
      timer = setTimeout(() => {
        timer = undefined
        const hit = wordAtPoint(x, y)
        if (!hit) return
        fired = true
        window.getSelection()?.removeAllRanges()
        pendingKey = show(hit)
      }, LONG_PRESS_MS)
    }
    const onMove = (e: PointerEvent) => {
      if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > MOVE_TOLERANCE) cancel()
    }
    const onUp = () => {
      cancel()
      if (pendingKey) play(pendingKey)
      pendingKey = null
    }
    // Не открывать системное меню («Копировать», «Поделиться») на долгом нажатии по сербскому слову
    const onContextMenu = (e: Event) => {
      if (fired || timer) e.preventDefault()
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('pointerup', onUp)
    document.addEventListener('pointercancel', cancel)
    document.addEventListener('contextmenu', onContextMenu)
    return () => {
      cancel()
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
      document.removeEventListener('pointercancel', cancel)
      document.removeEventListener('contextmenu', onContextMenu)
    }
  }, [show, play])

  // Над словом, по центру; если сверху не помещается — под словом. Не вылезает за края экрана.
  const place = useCallback(() => {
    if (!shown || !box.current) return
    const r = shown.hit.range.getBoundingClientRect()
    if (!r.width && !r.height) {
      // Слово исчезло со страницы (например, переключили алфавит)
      setShown(null)
      return
    }
    const { width, height } = box.current.getBoundingClientRect()
    const left = Math.min(Math.max(r.left + r.width / 2 - width / 2, MARGIN), window.innerWidth - width - MARGIN)
    const above = r.top - GAP - height
    setPos({ left: Math.max(left, MARGIN), top: above >= MARGIN ? above : r.bottom + GAP })
  }, [shown])

  useLayoutEffect(place, [place])

  useEffect(() => {
    if (!shown) return
    const close = () => setShown(null)
    const onDown = (e: PointerEvent) => {
      if (!(e.target instanceof Node && box.current?.contains(e.target))) close()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    // При прокрутке подсказка едет вместе со словом, а не закрывается (иначе её сбивает инерция тачпада)
    let frame = 0
    const follow = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(place)
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', follow, { passive: true, capture: true })
    window.addEventListener('resize', follow)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', follow, { capture: true })
      window.removeEventListener('resize', follow)
    }
  }, [shown, place])

  useEffect(() => setShown(null), [pathname])

  if (!shown) return null
  const { word, key, entry } = shown
  const lookupUrl = `https://translate.google.com/?sl=sr&tl=ru&text=${encodeURIComponent(word)}&op=translate`
  return (
    <div
      ref={box}
      className={s.gloss}
      role="status"
      aria-live="polite"
      data-no-gloss
      style={pos ? { left: pos.left, top: pos.top } : { left: 0, top: 0, visibility: 'hidden' }}
    >
      <span className={s.head}>
        <span className={s.word} lang="sr">
          {word}
        </span>
        {entry?.base && (
          <span className={s.base}>
            ← <span lang="sr">{toScript(entry.base, script)}</span>
          </span>
        )}
        {entry && <Say word={key} />}
      </span>
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
          {audioError && <span className={s.note}>{audioError}</span>}
          <span className={s.cards}>
            {inCards ? '✓ Добавлено в карточки' : 'Не в карточках'}
            <button
              type="button"
              className={s.cardsBtn}
              onClick={() => (inCards ? removeLookup(key) : addToCards(key, shown.hit))}
            >
              {inCards ? 'Убрать' : 'Вернуть'}
            </button>
          </span>
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
