import { useState } from 'react'
import { Rich } from '../sr/Rich'
import { s, useExerciseRun, ExerciseShell, Actions, wrongScript } from './shared'
import { Audio } from '../content/Content'
import { ttsUrl } from '../../lib/tts'
import { useApp } from '../../store/app'
import { pickGender, useExerciseScripts, useGender, useSr } from '../../store/hooks'
import { checkAnswer, hintPrefix, type CheckResult } from '../../lib/answer'
import { cyrToLat, hasCyrillic, toScript, type Script } from '../../lib/translit'
import type { DictationExercise, FillExercise, ScriptExercise } from '../../content/types'

type ItemVerdict = (CheckResult & { script?: false }) | { script: true } | null

interface Target {
  answers: string[]
  /** Обязательный алфавит ответа (режим тренировки, перевод алфавитов). */
  requireScript?: Script
  /** Строгость к диакритике. В переводе алфавитов диакритика — суть задания. */
  strict: boolean
}

/** Общая механика полей ввода: проверка, подсказки, «показать ответы». */
function useTextItems(count: number, targets: Target[], ex: Parameters<typeof useExerciseRun>[0]) {
  const { submit } = useExerciseRun(ex)
  const [values, setValues] = useState<string[]>(() => Array(count).fill(''))
  const [verdicts, setVerdicts] = useState<ItemVerdict[]>(() => Array(count).fill(null))
  const [revealed, setRevealed] = useState(false)
  const checked = verdicts.some((v) => v !== null)
  const okAt = (v: ItemVerdict) => v !== null && !v.script && v.accepted
  const allOk = verdicts.every(okAt)

  const check = () => {
    const next: ItemVerdict[] = values.map((val, i) => {
      const t = targets[i]
      if (t.requireScript && wrongScript(val, t.requireScript)) return { script: true }
      return guardCyrillic(val, checkAnswer(val, t.answers, t.strict))
    })
    setVerdicts(next)
    submit(
      next.map(okAt),
      next.flatMap((v, i) => (okAt(v) ? [] : [{ index: i, given: values[i], correct: targets[i].answers[0] }])),
    )
  }
  const change = (i: number, val: string) => {
    setValues((vs) => vs.map((x, j) => (j === i ? val : x)))
    setVerdicts((vs) => vs.map((x, j) => (j === i ? null : x)))
  }
  const reset = () => {
    setValues(Array(count).fill(''))
    setVerdicts(Array(count).fill(null))
    setRevealed(false)
  }
  return { values, verdicts, checked, allOk, revealed, setRevealed, check, change, reset }
}

const simple = (x: string) => x.toLowerCase().replace(/\s+/g, ' ').trim().replace(/[.!?,;:…]+$/u, '')

/**
 * Ответ кириллицей сравнивается буква в букву: «лј» вместо «љ» или «дж» вместо «џ»
 * после перевода в латиницу совпали бы с правильным ответом, но это ошибка.
 */
function guardCyrillic(val: string, r: CheckResult): CheckResult {
  if (r.verdict === 'correct' && hasCyrillic(val) && hasCyrillic(r.closest) && simple(val) !== simple(r.closest))
    return { ...r, verdict: 'partial', accepted: false }
  return r
}

function inputClass(v: ItemVerdict): string {
  if (!v) return s.input
  if (v.script) return `${s.input} ${s.bad}`
  if (v.verdict === 'correct') return `${s.input} ${s.ok}`
  if (v.verdict === 'almost') return `${s.input} ${v.accepted ? s.almost : s.bad}`
  return `${s.input} ${s.bad}`
}

function Feedback({ v, value, answer, revealed, display }: { v: ItemVerdict; value: string; answer: string; revealed: boolean; display: (t: string) => string }) {
  if (!v) return revealed ? <span className={s.feedback}>Ответ: <span lang="sr">{display(answer)}</span></span> : null
  if (v.script) return <span className={`${s.feedback} ${s.fbBad}`}>Ответ нужен на другом алфавите.</span>
  if (v.verdict === 'correct') return <span className={`${s.feedback} ${s.fbOk}`}>✓ Верно</span>
  const right = <span lang="sr">{display(v.closest)}</span>
  if (v.verdict === 'almost')
    return (
      <span className={`${s.feedback} ${s.fbAlmost}`}>
        {v.accepted ? '≈ Засчитано, но проверь диакритику: ' : '✗ Почти! Не хватает диакритики (č, ć, đ, š, ž): '}
        {right}
      </span>
    )
  if (v.verdict === 'partial') {
    const prefix = hintPrefix(value, v.closest)
    return (
      <span className={`${s.feedback} ${s.fbAlmost}`}>
        Почти, одна-две буквы не те.{prefix && <> Начало верное: «<span lang="sr">{prefix}</span>…»</>}
        {revealed && <> Ответ: {right}</>}
      </span>
    )
  }
  return (
    <span className={`${s.feedback} ${s.fbBad}`}>
      ✗ Неверно.{revealed && <> Ответ: {right}</>}
    </span>
  )
}

export function FillIn({ ex }: { ex: FillExercise }) {
  const { done } = useExerciseRun(ex)
  const strict = useApp((st) => st.settings.strictDiacritics)
  const gender = useGender()
  const { show, answer, training } = useExerciseScripts()
  const sr = useSr(show)
  const srAnswer = useSr(answer)
  const targets: Target[] = ex.items.map((it) => ({
    answers: it.answers.map((a) => pickGender(a, gender)),
    requireScript: training ? answer : undefined,
    strict,
  }))
  const t = useTextItems(ex.items.length, targets, ex)

  return (
    <ExerciseShell ex={ex} done={done}>
      <ol className={s.items}>
        {ex.items.map((it, i) => (
          <li key={i} className={s.item}>
            <span className={s.fillLine}>
              {it.before && <span lang="sr">{sr(it.before)} </span>}
              <input
                className={inputClass(t.verdicts[i])}
                lang="sr"
                value={t.values[i]}
                onChange={(e) => t.change(i, e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && t.check()}
                aria-label={`Пропуск ${i + 1}`}
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                size={Math.max(6, ...it.answers.map((a) => pickGender(a, gender).length + 2))}
              />
              {it.after && <span lang="sr"> {sr(it.after)}</span>}
            </span>
            {it.ru && <span className={s.ru}>{it.ru}</span>}
            <Feedback v={t.verdicts[i]} value={t.values[i]} answer={targets[i].answers[0]} revealed={t.revealed} display={(x) => srAnswer(x)} />
            {t.verdicts[i] && !t.verdicts[i]!.script && (t.verdicts[i] as CheckResult).accepted && it.explain && (
              <span className={s.ru}>
                <Rich text={it.explain} />
              </span>
            )}
          </li>
        ))}
      </ol>
      <Actions
        onCheck={t.check}
        onReset={t.reset}
        onReveal={() => t.setRevealed(true)}
        canReveal
        checked={t.checked}
        allOk={t.allOk}
        score="Исправь отмеченные поля и проверь ещё раз."
      />
    </ExerciseShell>
  )
}

export function Dictation({ ex }: { ex: DictationExercise }) {
  const { done } = useExerciseRun(ex)
  const strict = useApp((st) => st.settings.strictDiacritics)
  const { answer, training } = useExerciseScripts()
  const srAnswer = useSr(answer)
  const targets: Target[] = ex.items.map((it) => ({ answers: [it.answer], requireScript: training ? answer : undefined, strict }))
  const t = useTextItems(ex.items.length, targets, ex)

  return (
    <ExerciseShell ex={ex} done={done}>
      {ex.audio && <Audio src={ex.audio} title="Слушай и записывай" note="Замедли до 0.75×, если нужно. Пиши на любом алфавите." />}
      <ol className={s.items}>
        {ex.items.map((it, i) => (
          <li key={i} className={s.item}>
            {ex.tts && <PlayWord word={it.answer} n={i + 1} />}
            {it.ru && <span>{it.ru}: </span>}
            <input
              className={inputClass(t.verdicts[i])}
              lang="sr"
              value={t.values[i]}
              onChange={(e) => t.change(i, e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && t.check()}
              aria-label={`Слово ${i + 1}${it.ru ? ` (${it.ru})` : ''}`}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
            />
            <Feedback v={t.verdicts[i]} value={t.values[i]} answer={it.answer} revealed={t.revealed} display={(x) => srAnswer(x)} />
          </li>
        ))}
      </ol>
      <Actions
        onCheck={t.check}
        onReset={t.reset}
        onReveal={() => t.setRevealed(true)}
        canReveal
        checked={t.checked}
        allOk={t.allOk}
        score="Послушай ещё раз и исправь отмеченные слова."
      />
    </ExerciseShell>
  )
}

/** Перевод между алфавитами: кириллица → латиница или наоборот. */
export function ScriptConvert({ ex }: { ex: ScriptExercise }) {
  const { done } = useExerciseRun(ex)
  const target: Script = ex.direction === 'toLat' ? 'lat' : 'cyr'
  const targets: Target[] = ex.items.map((it) => ({ answers: [toScript(it, target)], requireScript: target, strict: true }))
  const t = useTextItems(ex.items.length, targets, ex)

  return (
    <ExerciseShell ex={ex} done={done} showTraining={false}>
      <ol className={s.items}>
        {ex.items.map((it, i) => (
          <li key={i} className={s.item}>
            <span lang="sr">{ex.direction === 'toLat' ? it : cyrToLat(it)}</span>
            <input
              className={`${inputClass(t.verdicts[i])} ${s.wide}`}
              lang="sr"
              value={t.values[i]}
              onChange={(e) => t.change(i, e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && t.check()}
              aria-label={`${ex.direction === 'toLat' ? 'Латиницей' : 'Кириллицей'}: пункт ${i + 1}`}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
            />
            <Feedback v={t.verdicts[i]} value={t.values[i]} answer={targets[i].answers[0]} revealed={t.revealed} display={(x) => x} />
          </li>
        ))}
      </ol>
      <Actions
        onCheck={t.check}
        onReset={t.reset}
        onReveal={() => t.setRevealed(true)}
        canReveal
        checked={t.checked}
        allOk={t.allOk}
        score="Исправь отмеченные строки. Диакритика здесь обязательна."
      />
    </ExerciseShell>
  )
}

/** Кнопка «послушать слово» в диктанте с озвучкой Google Переводчика. Само слово не показываем. */
function PlayWord({ word, n }: { word: string; n: number }) {
  const play = () => {
    void new window.Audio(ttsUrl(word)).play().catch(() => {})
  }
  return (
    <button type="button" className={s.playWord} onClick={play} aria-label={`Послушать слово ${n}`}>
      ▶
    </button>
  )
}
