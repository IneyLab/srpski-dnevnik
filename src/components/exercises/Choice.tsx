import { useState } from 'react'
import { Rich } from '../sr/Rich'
import { s, useExerciseRun, ExerciseShell, Actions } from './shared'
import { Audio } from '../content/Content'
import { useExerciseSr } from './shared'
import { pickGender, useGender } from '../../store/hooks'
import type { ChoiceExercise, ChoiceItem, Gendered, ListenExercise } from '../../content/types'

function ChoiceItems({ ex, items }: { ex: ChoiceExercise | ListenExercise; items: ChoiceItem[] }) {
  const { submit } = useExerciseRun(ex)
  const srEx = useExerciseSr(ex)
  const gender = useGender()
  const sr = (t: Gendered) => srEx(t)
  const optionText = (it: ChoiceItem, o: Gendered) =>
    it.optionsLang === 'sr' ? <span lang="sr">{sr(o)}</span> : <span>{pickGender(o, gender)}</span>
  const [picked, setPicked] = useState<(number | null)[]>(() => items.map(() => null))
  // verdicts[i]: null — ещё не проверено (или изменено после проверки)
  const [verdicts, setVerdicts] = useState<(boolean | null)[]>(() => items.map(() => null))
  const checked = verdicts.some((v) => v !== null)
  const allOk = verdicts.every((v) => v === true)

  const check = () => {
    const results = items.map((it, i) => picked[i] === it.answer)
    setVerdicts(results)
    submit(
      results,
      items.flatMap((it, i) =>
        results[i] ? [] : [{ index: i, correct: `${it.prompt ?? ''} ${it.sr ? sr(it.sr) : ''} → ${optionLabel(it, it.answer, sr, gender)}`.trim() }],
      ),
    )
  }
  const pick = (i: number, o: number) => {
    if (allOk) return
    setPicked((p) => p.map((v, j) => (j === i ? o : v)))
    setVerdicts((v) => v.map((x, j) => (j === i ? null : x)))
  }

  return (
    <>
      <ol className={s.items}>
        {items.map((it, i) => (
          <li key={i} className={s.item}>
            <span className={s.prompt}>
              {it.prompt}
              {it.prompt && it.sr ? ' ' : ''}
              {it.sr && <span lang="sr">{sr(it.sr)}</span>}
            </span>
            <div className={s.options} role="group" aria-label={`Вопрос ${i + 1}`}>
              {it.options.map((o, oi) => {
                const sel = picked[i] === oi
                const cls = sel && verdicts[i] !== null ? (verdicts[i] ? s.ok : s.bad) : ''
                return (
                  <button
                    key={oi}
                    type="button"
                    className={`${s.option} ${cls}`}
                    aria-pressed={sel}
                    onClick={() => pick(i, oi)}
                  >
                    {optionText(it, o)}
                  </button>
                )
              })}
            </div>
            {verdicts[i] !== null && (
              <span className={`${s.feedback} ${verdicts[i] ? s.fbOk : s.fbBad}`}>
                {verdicts[i] ? '✓ Верно.' : '✗ Не совсем, попробуй другой вариант.'} {verdicts[i] && it.explain && <Rich text={it.explain} />}
              </span>
            )}
          </li>
        ))}
      </ol>
      <Actions
        onCheck={check}
        onReset={() => {
          setPicked(items.map(() => null))
          setVerdicts(items.map(() => null))
        }}
        checked={checked}
        allOk={allOk}
        disabled={picked.some((p) => p === null)}
        score={`Верно ${verdicts.filter((v) => v === true).length} из ${items.length}. Исправь отмеченные красным.`}
      />
    </>
  )
}

function optionLabel(it: ChoiceItem, idx: number, sr: (t: Gendered) => string, gender: 'f' | 'm'): string {
  const o = it.options[idx]
  return it.optionsLang === 'sr' ? sr(o) : pickGender(o, gender)
}

export function Choice({ ex }: { ex: ChoiceExercise }) {
  const { done } = useExerciseRun(ex)
  return (
    <ExerciseShell ex={ex} done={done}>
      <ChoiceItems ex={ex} items={ex.items} />
    </ExerciseShell>
  )
}

export function Listen({ ex }: { ex: ListenExercise }) {
  const { done } = useExerciseRun(ex)
  return (
    <ExerciseShell ex={ex} done={done}>
      <Audio src={ex.audio} title="Слушай запись (можно несколько раз)" />
      <ChoiceItems ex={ex} items={ex.items} />
    </ExerciseShell>
  )
}
