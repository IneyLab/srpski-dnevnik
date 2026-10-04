import { useCallback, type ReactNode } from 'react'
import s from './exercises.module.css'
import { useApp } from '../../store/app'
import { pickGender, useExerciseScripts, useGender, useSr } from '../../store/hooks'
import { hasCyrillic, type Script } from '../../lib/translit'
import type { Exercise, Gendered } from '../../content/types'
import { Rich } from '../sr/Rich'
import { Source } from '../content/Content'

export { s }

const SKILL_LABEL: Record<string, string> = {
  speaking: 'Говорение',
  listening: 'Аудирование',
  reading: 'Чтение',
  writing: 'Письмо',
  vocab: 'Лексика',
  grammar: 'Грамматика',
}

/** Общая логика: попытки, завершение, тетрадь ошибок. */
export function useExerciseRun(ex: Exercise) {
  const record = useApp((st) => st.exercises[ex.id])
  const countAttempt = useApp((st) => st.countAttempt)
  const completeExercise = useApp((st) => st.completeExercise)
  const addMistake = useApp((st) => st.addMistake)

  /** results[i] — верен ли пункт i; wrong — что ответил ученик и что правильно. */
  const submit = useCallback(
    (results: boolean[], wrong: { index: number; given?: string; correct: string }[]) => {
      countAttempt(ex.id)
      for (const w of wrong) {
        addMistake(`${ex.id}#${w.index}`, { kind: 'word', label: w.correct, source: ex.id, lastGiven: w.given })
      }
      if (wrong.length && ex.rule) addMistake(`rule:${ex.rule}`, { kind: 'rule', label: ex.rule, source: ex.id })
      if (results.length && results.every(Boolean)) completeExercise(ex.id, ex.skill)
    },
    [ex, countAttempt, completeExercise, addMistake],
  )

  return { done: Boolean(record?.correct), attempts: record?.attempts ?? 0, submit }
}

export function ExerciseShell({
  ex,
  done,
  children,
  showTraining = true,
}: {
  ex: Exercise
  done: boolean
  children: ReactNode
  showTraining?: boolean
}) {
  const { training, show, answer } = useExerciseScripts()
  const tts = ex.type === 'dictation' && ex.tts
  return (
    <section className={s.card} aria-labelledby={`ex-${ex.id}`}>
      <div className={s.head}>
        <h3 className={s.title} id={`ex-${ex.id}`}>
          {ex.title}
        </h3>
        <span className={s.badge}>
          {SKILL_LABEL[ex.skill]}
          {done && <span className={s.doneBadge}> · ✓ выполнено</span>}
        </span>
      </div>
      {showTraining && training && (
        <span className={s.training}>
          Режим тренировки: задание на {show === 'cyr' ? 'кириллице' : 'латинице'}, ответ на {answer === 'cyr' ? 'кириллице' : 'латинице'}
        </span>
      )}
      <p className={s.instruction}>
        <Rich text={ex.instruction} />
      </p>
      {children}
      {(ex.source || tts) && <Source id={ex.source} voice={tts ? 'googleTts' : undefined} />}
    </section>
  )
}

/** Сербский текст задания: в алфавите задания или как записан (fixedScript). */
export function useExerciseSr(ex: Exercise) {
  const { show } = useExerciseScripts()
  const sr = useSr(show)
  const gender = useGender()
  return useCallback((t: Gendered) => (ex.fixedScript ? pickGender(t, gender) : sr(t)), [ex.fixedScript, sr, gender])
}

/** Ответ написан не тем алфавитом (в режиме тренировки и в упражнениях на перевод алфавитов). */
export function wrongScript(input: string, expected: Script): boolean {
  if (!input.trim()) return false
  return expected === 'lat' ? hasCyrillic(input) : /[a-zčćđšž]/i.test(input)
}

export function Actions({
  onCheck,
  onReset,
  onReveal,
  checked,
  allOk,
  canReveal,
  score,
  disabled,
}: {
  onCheck: () => void
  onReset: () => void
  onReveal?: () => void
  checked: boolean
  allOk: boolean
  canReveal?: boolean
  score?: string
  disabled?: boolean
}) {
  return (
    <div className={s.actions}>
      {!allOk && (
        <button type="button" className="btn btn-primary" onClick={onCheck} disabled={disabled}>
          Проверить
        </button>
      )}
      {checked && (
        <button type="button" className="btn" onClick={onReset}>
          {allOk ? 'Пройти ещё раз' : 'Начать заново'}
        </button>
      )}
      {checked && !allOk && canReveal && onReveal && (
        <button type="button" className="btn" onClick={onReveal}>
          Показать ответы
        </button>
      )}
      <span role="status" aria-live="polite" className={s.summary}>
        {checked && (allOk ? 'Отлично, всё верно! ✓' : score)}
      </span>
    </div>
  )
}
