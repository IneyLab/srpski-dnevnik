import { useMemo, useState } from 'react'
import { Rich } from '../sr/Rich'
import { s, useExerciseRun, ExerciseShell, Actions } from './shared'
import { pickGender, useExerciseScripts, useGender, useSr } from '../../store/hooks'
import { normalize } from '../../lib/answer'
import { shuffle } from '../../lib/shuffle'
import type { BuildExercise } from '../../content/types'

const stripEnd = (t: string) => t.replace(/[.!?,…]+$/u, '')

/** Слова предложения. Первое слово с маленькой буквы, чтобы заглавная не подсказывала порядок. */
export function tokensOf(sentence: string, distractors: string[] = []): string[] {
  const words = stripEnd(sentence.trim()).split(/\s+/)
  return [...words.map((w, i) => (i === 0 ? lowerUnlessName(w) : w)), ...distractors]
}

/** Имена собственные в начале предложения оставляем с большой буквы. */
const NAMES = new Set(['Ана', 'Марко', 'Милан', 'Јована', 'Београд', 'Србија', 'Драган', 'Зоран', 'Петар'])
function lowerUnlessName(w: string): string {
  return NAMES.has(w) ? w : w[0].toLowerCase() + w.slice(1)
}

function BuildItem({
  exId,
  index,
  item,
  onChange,
  state,
}: {
  exId: string
  index: number
  item: BuildExercise['items'][number]
  onChange: (words: string[]) => void
  state: { words: string[]; verdict: boolean | null; seed: number }
}) {
  const gender = useGender()
  const { show } = useExerciseScripts()
  const sr = useSr(show)
  const pool = useMemo(
    () => shuffle(tokensOf(pickGender(item.answers[0], gender), item.distractors), `${exId}:${index}:${state.seed}`),
    [item, gender, exId, index, state.seed],
  )
  // Какие токены пула уже использованы (по индексу: слова могут повторяться).
  // При сбросе компонент пересоздаётся (key с seed), и состояние обнуляется.
  const [used, setUsed] = useState<number[]>([])
  const add = (pi: number) => {
    if (state.verdict === true) return
    setUsed([...used, pi])
    onChange([...state.words, pool[pi]])
  }
  const remove = (wi: number) => {
    if (state.verdict === true) return
    setUsed(used.filter((_, i) => i !== wi))
    onChange(state.words.filter((_, i) => i !== wi))
  }

  return (
    <li className={s.item}>
      <span className={s.prompt}>{pickGender(item.ru, gender)}</span>
      <div
        className={`${s.tray} ${s.answerTray}`}
        aria-label="Твоё предложение"
        role="group"
        style={state.verdict === null ? undefined : { borderColor: state.verdict ? 'var(--ok)' : 'var(--bad)' }}
      >
        {state.words.length === 0 && <span style={{ color: 'var(--ink-soft)', padding: '6px' }}>Нажимай на слова ниже по порядку</span>}
        {state.words.map((w, wi) => (
          <button key={wi} type="button" className={s.token} lang="sr" onClick={() => remove(wi)} aria-label={`${sr(w)}, убрать`}>
            {sr(w)}
          </button>
        ))}
      </div>
      <div className={s.tray} role="group" aria-label="Слова">
        {pool.map((w, pi) =>
          used.includes(pi) ? null : (
            <button key={pi} type="button" className={s.token} lang="sr" onClick={() => add(pi)}>
              {sr(w)}
            </button>
          ),
        )}
      </div>
      {state.verdict !== null && (
        <span className={`${s.feedback} ${state.verdict ? s.fbOk : s.fbBad}`}>
          {state.verdict ? '✓ Верно. ' : '✗ Порядок не тот. '}
          {state.verdict && item.explain && <Rich text={item.explain} />}
          {!state.verdict && <Rich text="Подумай, где стоят короткие слова (`сам, се, ми, је`)." />}
        </span>
      )}
    </li>
  )
}

/** Собери предложение из слов: тренирует порядок слов и клитик. */
export function Build({ ex }: { ex: BuildExercise }) {
  const { done, submit } = useExerciseRun(ex)
  const gender = useGender()
  const empty = () => ex.items.map(() => ({ words: [] as string[], verdict: null as boolean | null, seed: 0 }))
  const [state, setState] = useState(empty)
  const checked = state.some((x) => x.verdict !== null)
  const allOk = state.every((x) => x.verdict === true)

  const check = () => {
    const res = ex.items.map((it, i) => {
      const given = normalize(state[i].words.join(' '))
      return it.answers.some((a) => normalize(stripEnd(pickGender(a, gender))) === given)
    })
    setState((st) => st.map((x, i) => ({ ...x, verdict: res[i] })))
    submit(
      res,
      ex.items.flatMap((it, i) => (res[i] ? [] : [{ index: i, given: state[i].words.join(' '), correct: pickGender(it.answers[0], gender) }])),
    )
  }
  const reset = () => setState((st) => st.map((x) => ({ words: [], verdict: null, seed: x.seed + 1 })))

  return (
    <ExerciseShell ex={ex} done={done}>
      <ol className={s.items}>
        {ex.items.map((it, i) => (
          <BuildItem
            key={`${i}:${state[i].seed}`}
            exId={ex.id}
            index={i}
            item={it}
            state={state[i]}
            onChange={(words) => setState((st) => st.map((x, j) => (j === i ? { ...x, words, verdict: null } : x)))}
          />
        ))}
      </ol>
      <Actions
        onCheck={check}
        onReset={reset}
        checked={checked}
        allOk={allOk}
        disabled={state.some((x) => x.words.length === 0)}
        score={`Верно ${state.filter((x) => x.verdict).length} из ${ex.items.length}. Нажми на слово в предложении, чтобы убрать его.`}
      />
    </ExerciseShell>
  )
}
