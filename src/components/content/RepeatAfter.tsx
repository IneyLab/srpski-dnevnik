import { useEffect, useRef, useState } from 'react'
import s from './content.module.css'
import { Sr } from '../sr/Sr'
import { Source } from './Content'
import { splitWords, ttsUrl } from '../../lib/tts'
import { claimPlayer, playErrorText, playUrl, releasePlayer, stopPlayback } from '../../lib/player'

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * «Повтори за диктором»: каждое слово можно послушать отдельно, а кнопка «Повторять» проигрывает
 * слова по очереди и после каждого делает паузу, в которую ученик повторяет вслух.
 * Озвучка — Google Переводчик (scripts/tts.mjs). words — кириллица через запятую.
 */
export function RepeatAfter({ title, words, source }: { title: string; words: string; source?: string }) {
  const list = splitWords(words)
  const [current, setCurrent] = useState<number | null>(null)
  const [phase, setPhase] = useState<'listen' | 'repeat' | null>(null)
  const [slow, setSlow] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Номер текущего запуска: новый запуск или «Стоп» увеличивают его, и старый цикл видит, что пора выйти.
  const run = useRef(0)
  // Играет ли сейчас это упражнение (общий плеер может играть и в соседнем).
  const active = useRef(false)

  // Плеер забрало другое упражнение — тихо останавливаемся. Функция одна на всё время жизни компонента.
  const [onLost] = useState(() => () => {
    run.current++
    active.current = false
    setCurrent(null)
    setPhase(null)
  })

  /** Сбросить состояние упражнения, не трогая плеер. */
  const reset = () => {
    releasePlayer(onLost)
    onLost()
  }

  useEffect(
    () => () => {
      run.current++
      if (active.current) stopPlayback()
      releasePlayer(onLost)
    },
    [onLost],
  )

  const play = (i: number) => playUrl(ttsUrl(list[i]), slow ? 0.75 : 1)

  const begin = () => {
    claimPlayer(onLost)
    active.current = true
    setError(null)
    return ++run.current
  }

  /** Кнопка «Стоп». */
  const stop = () => {
    if (active.current) stopPlayback()
    reset()
  }

  const start = async () => {
    const id = begin()
    for (let i = 0; i < list.length; i++) {
      setCurrent(i)
      setPhase('listen')
      const r = await play(i)
      if (run.current !== id) return
      if (!r.ok) {
        // 'stopped' — плеер забрало другое упражнение: просто выходим, его не трогаем.
        if (r.error !== 'stopped') setError(playErrorText(r.error))
        reset()
        return
      }
      setPhase('repeat')
      // Пауза на повторение: чуть дольше самого слова, но не меньше полутора секунд.
      await wait(Math.max(1500, r.ms * 1.6 + 700))
      if (run.current !== id) return
    }
    reset()
  }

  const playOne = async (i: number) => {
    const id = begin()
    setPhase(null)
    setCurrent(i)
    const r = await play(i)
    if (run.current !== id) return
    if (!r.ok && r.error !== 'stopped') setError(playErrorText(r.error))
    reset()
  }

  const running = phase !== null
  return (
    <div className={s.repeat}>
      <div className={s.repeatHead}>
        <span className={s.audioLabel}>🎧 {title}</span>
        <div className={s.speeds} role="group" aria-label="Скорость">
          <button type="button" className={s.speed} aria-pressed={slow} onClick={() => setSlow(true)}>
            0.75×
          </button>
          <button type="button" className={s.speed} aria-pressed={!slow} onClick={() => setSlow(false)}>
            1×
          </button>
        </div>
      </div>
      <ul className={s.repeatWords}>
        {list.map((w, i) => (
          <li key={w + i}>
            <button
              type="button"
              className={s.repeatWord}
              data-state={current === i ? (phase ?? 'listen') : undefined}
              onClick={() => void playOne(i)}
              aria-label={`Послушать: ${w}`}
            >
              <span aria-hidden="true">▶</span> <Sr>{w}</Sr>
            </button>
          </li>
        ))}
      </ul>
      <div className={s.repeatControls}>
        {running ? (
          <button type="button" className="btn" onClick={stop}>
            ■ Стоп
          </button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={start}>
            ▶ Повторять за диктором
          </button>
        )}
        <span role="status" className={s.repeatStatus}>
          {phase === 'listen' ? 'Слушай…' : phase === 'repeat' ? '🗣️ Повтори вслух!' : ''}
        </span>
        {error && (
          <span role="alert" className={s.repeatError}>
            {error}
          </span>
        )}
      </div>
      <Source id={source} voice="googleTts" />
    </div>
  )
}
