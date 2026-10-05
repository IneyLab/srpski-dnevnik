import { createContext, useContext } from 'react'
import type { LessonKind } from '../../content/types'

/** Текущее занятие: блоки внутри MDX узнают, где они (id для отметок «сделано» и тип занятия). */
export const LessonContext = createContext<{ id: string; kind: LessonKind } | null>(null)

export const useLesson = () => useContext(LessonContext)
