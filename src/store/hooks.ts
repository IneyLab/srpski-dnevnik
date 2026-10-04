import { useCallback } from 'react'
import { useApp } from './app'
import { toScript, type Script } from '../lib/translit'
import type { Gendered } from '../content/types'

/** Пока род не выбран — женский (так в исходном курсе). */
export function useGender(): 'f' | 'm' {
  return useApp((s) => s.settings.gender) ?? 'f'
}

export function useScript(): Script {
  return useApp((s) => s.settings.script)
}

export function pickGender(text: Gendered, gender: 'f' | 'm'): string {
  return typeof text === 'string' ? text : text[gender]
}

/** Функция: сербский текст (кириллица, возможно с родом) → строка в нужном алфавите. */
export function useSr(scriptOverride?: Script) {
  const gender = useGender()
  const script = useScript()
  const target = scriptOverride ?? script
  return useCallback((text: Gendered) => toScript(pickGender(text, gender), target), [gender, target])
}

/** Русский текст интерфейса по роду: g("остановилась", "остановился"). */
export function useG() {
  const gender = useGender()
  return useCallback((f: string, m: string) => (gender === 'm' ? m : f), [gender])
}

/** Алфавит задания и ответа: в режиме тренировки задание показывается на другом алфавите. */
export function useExerciseScripts(): { show: Script; answer: Script; training: boolean } {
  const script = useScript()
  const training = useApp((s) => s.settings.trainingMode)
  const other: Script = script === 'cyr' ? 'lat' : 'cyr'
  return training ? { show: other, answer: script, training } : { show: script, answer: script, training }
}
