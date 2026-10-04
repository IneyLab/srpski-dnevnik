import { useEffect, useRef, useState } from 'react'
import s from './content.module.css'
import { Sr } from '../sr/Sr'
import { Source } from './Content'
import { splitWords, ttsUrl } from '../../lib/tts'

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * «Повтори за диктором»: каждое слово можно послушать отдельно, а кнопка «Повторять» проигрывает
 * слова по очереди и после каждого делает паузу, в которую ученик повторяет вслух.
 * Озвучка — Google Переводчик (scripts/tts.mjs). words — кириллица через запятую.
 */
export function RepeatAfter({ title, words, source }: { title: string; words: string; source?: string }) {
  const list = splitWords(words)
  const audio = useRef<HTMLAudioElement | null>(null)
  const run = useRef(0)
  const [current, setCurrent] = useState<number | null>(null)
  const [phase, setPhase] = useState<'listen' | 'repeat' | null>(null)
  const [slow, setSlow] = useState(false)

  useEffect(
    () => () => {
      run.current++
      audio.current?.pause()
    },
    [],
  )

  /** Проигрывает слово; возвращает длительность в мс (или 0, если не получилось). */
  const play = (i: number) =>
    new Promise<number>((resolve) => {
      audio.current?.pause()
      const a = new Audio(ttsUrl(list[i]))
      a.playbackRate = slow ? 0.75 : 1
      audio.current = a
      const t0 = performance.now()
      a.onended = () => resolve(performance.now() - t0)
      a.onerror = () => resolve(0)
      a.play().catch(() => resolve(0))
    })

  const stop = () => {
    run.current++
    audio.current?.pause()
    setCurrent(null)
    setPhase(null)
  }

  const start = async () => {
    const id = ++run.current
    for (let i = 0; i < list.length; i++) {
      setCurrent(i)
      setPhase('listen')
      const ms = await play(i)
      if (run.current !== id) return
      setPhase('repeat')
      // Пауза на повторение: чуть дольше самого слова, но не меньше полутора секунд.
      await wait(Math.max(1500, ms * 1.6 + 700))
      if (run.current !== id) return
    }
    stop()
  }

  const playOne = (i: number) => {
    run.current++
    setPhase(null)
    setCurrent(i)
    void play(i).then(() => setCurrent((c) => (c === i ? null : c)))
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
              onClick={() => playOne(i)}
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
      </div>
      <Source id={source} voice="googleTts" />
    </div>
  )
}
