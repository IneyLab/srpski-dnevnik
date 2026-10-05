import { useState } from 'react'
import s from './content.module.css'
import { ttsUrl } from '../../lib/tts'
import { playErrorText, playUrl } from '../../lib/player'
import { useSr } from '../../store/hooks'

/**
 * Кнопка ▶ «послушать слово» (озвучка Google Переводчика, scripts/tts.mjs).
 * word — сербское слово в кириллице; файл ищется по нему, в подписи — текущий алфавит.
 */
export function Say({ word }: { word: string }) {
  const sr = useSr()
  const [state, setState] = useState<'idle' | 'playing'>('idle')
  const [error, setError] = useState<string | null>(null)
  const play = async () => {
    setError(null)
    setState('playing')
    const r = await playUrl(ttsUrl(word))
    setState('idle')
    if (!r.ok && r.error !== 'stopped') setError(playErrorText(r.error))
  }
  return (
    <>
      <button
        type="button"
        className={s.say}
        data-playing={state === 'playing' || undefined}
        onClick={() => void play()}
        aria-label={`Послушать: ${sr(word)}`}
        title="Послушать"
      >
        ▶
      </button>
      {error && (
        <span role="alert" className={s.sayError}>
          {error}
        </span>
      )}
    </>
  )
}
