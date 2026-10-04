import { useMemo, useState } from 'react'
import { s, useExerciseRun, ExerciseShell, Actions, useExerciseSr } from './shared'
import { pickGender, useGender } from '../../store/hooks'
import { shuffle } from '../../lib/shuffle'
import type { Gendered, Lang, MatchExercise } from '../../content/types'

/** Сопоставление: выбери элемент слева, затем пару справа. Работает мышью, касанием и клавиатурой. */
export function Match({ ex }: { ex: MatchExercise }) {
  const { done, submit } = useExerciseRun(ex)
  const sr = useExerciseSr(ex)
  const gender = useGender()
  const text = (t: Gendered, lang: Lang) => (lang === 'sr' ? sr(t) : pickGender(t, gender))

  const [seed, setSeed] = useState(0)
  const rightOrder = useMemo(() => shuffle(ex.pairs.map((_, i) => i), `${ex.id}:${seed}`), [ex, seed])
  const [selected, setSelected] = useState<number | null>(0)
  /** pairs[левый индекс] = правый индекс (исходный) */
  const [pairs, setPairs] = useState<Record<number, number>>({})
  const [verdict, setVerdict] = useState<boolean[] | null>(null)
  const allOk = verdict !== null && verdict.every(Boolean)
  const usedRight = new Set(Object.values(pairs))

  const pickLeft = (i: number) => {
    if (allOk) return
    if (pairs[i] !== undefined) {
      const next = { ...pairs }
      delete next[i]
      setPairs(next)
      setVerdict(null)
    }
    setSelected(selected === i ? null : i)
  }
  const pickRight = (r: number) => {
    if (allOk || selected === null) return
    const next = Object.fromEntries(Object.entries(pairs).filter(([, v]) => v !== r)) as Record<number, number>
    next[selected] = r
    setPairs(next)
    setVerdict(null)
    const free = ex.pairs.findIndex((_, i) => next[i] === undefined)
    setSelected(free === -1 ? null : free)
  }
  const check = () => {
    const res = ex.pairs.map((_, i) => pairs[i] === i)
    setVerdict(res)
    submit(
      res,
      ex.pairs.flatMap((p, i) =>
        res[i] ? [] : [{ index: i, correct: `${text(p.left, ex.leftLang)} — ${text(p.right, ex.rightLang)}` }],
      ),
    )
  }
  const reset = () => {
    setPairs({})
    setVerdict(null)
    setSelected(0)
    setSeed((x) => x + 1)
  }
  const tagOf = (left: number) => String(left + 1)

  return (
    <ExerciseShell ex={ex} done={done}>
      <div className={s.matchGrid}>
        <div className={s.col} role="group" aria-label="Левый столбец">
          {ex.pairs.map((p, i) => {
            const v = verdict?.[i]
            const cls = v === undefined || pairs[i] === undefined ? '' : v ? s.ok : s.bad
            return (
              <button
                key={i}
                type="button"
                className={`${s.matchBtn} ${cls} ${pairs[i] !== undefined ? s.matched : ''}`}
                aria-pressed={selected === i}
                onClick={() => pickLeft(i)}
              >
                <span className={s.pairTag}>{tagOf(i)}</span>
                <span lang={ex.leftLang}>{text(p.left, ex.leftLang)}</span>
              </button>
            )
          })}
        </div>
        <div className={s.col} role="group" aria-label="Правый столбец">
          {rightOrder.map((r) => {
            const left = Object.entries(pairs).find(([, v]) => v === r)?.[0]
            const v = left !== undefined ? verdict?.[Number(left)] : undefined
            const cls = v === undefined ? '' : v ? s.ok : s.bad
            return (
              <button
                key={r}
                type="button"
                className={`${s.matchBtn} ${cls} ${usedRight.has(r) ? s.matched : ''}`}
                onClick={() => pickRight(r)}
                disabled={selected === null && !usedRight.has(r)}
                aria-label={`${text(ex.pairs[r].right, ex.rightLang)}${left !== undefined ? `, пара ${tagOf(Number(left))}` : ''}`}
              >
                <span className={s.pairTag}>{left !== undefined ? tagOf(Number(left)) : '·'}</span>
                <span lang={ex.rightLang}>{text(ex.pairs[r].right, ex.rightLang)}</span>
              </button>
            )
          })}
        </div>
      </div>
      <Actions
        onCheck={check}
        onReset={reset}
        checked={verdict !== null}
        allOk={allOk}
        disabled={Object.keys(pairs).length < ex.pairs.length}
        score={verdict ? `Верно ${verdict.filter(Boolean).length} из ${ex.pairs.length}. Нажми на неверную пару слева, чтобы перевыбрать.` : ''}
      />
    </ExerciseShell>
  )
}
