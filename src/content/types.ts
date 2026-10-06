import type { Skill } from '../lib/xp'
import type { SourceId } from './sources'

/** Текст, который зависит от рода ученика. Строка — одинаково для обоих. */
export type Gendered = string | { f: string; m: string }

export type Lang = 'sr' | 'ru'

export type LessonKind = 'input' | 'practice' | 'task' | 'listening' | 'product' | 'people' | 'checkin'

export interface LessonMeta {
  /** Часть адреса: /week/1/lesson/<slug> */
  slug: string
  /** «Урок 1»…«Урок 6», «Чек-ин» */
  code: string
  title: string
  kind: LessonKind
  minutes: string
  optional?: boolean
  /** Навык, который растёт за отметку «Занятие выполнено». */
  skill?: Skill
  summary: string
}

export interface WeekMeta {
  n: number
  title: string
  /** «К концу недели я могу…» */
  goals: string[]
  grammar: string[]
  vocab: string[]
  culture: string[]
  task: string
  lessons: LessonMeta[]
}

export interface VocabItem {
  /** Сербское слово в кириллице. */
  sr: Gendered
  ru: string
  /** Занятие, где слово появляется: 's1', 's2'… */
  lesson: string
  /** Род существительного: м / ж / с */
  g?: 'm' | 'f' | 'n'
  /** Ложный друг: чем слово отличается от похожего русского. */
  falseFriend?: string
  note?: string
}

interface ExerciseBase {
  id: string
  title: string
  /** Инструкция по-русски. */
  instruction: string
  skill: Skill
  /** Правило, к которому относится упражнение (для тетради ошибок). */
  rule?: string
  /** Показывать сербский текст как записан, без переключения алфавита (упражнения на сами буквы). */
  fixedScript?: boolean
  /** Откуда взято задание: подпись «(c) …» внизу карточки. Своё задание — без source. */
  source?: SourceId
}

export interface ChoiceItem {
  /** Вопрос по-русски. */
  prompt?: string
  /** Сербская фраза в вопросе (кириллица). */
  sr?: Gendered
  options: Gendered[]
  optionsLang: Lang
  answer: number
  explain?: string
}

export interface ChoiceExercise extends ExerciseBase {
  type: 'choice'
  items: ChoiceItem[]
}

export interface FillItem {
  /** Сербский текст до и после пропуска (кириллица). */
  before?: Gendered
  after?: Gendered
  /** Перевод или подсказка по-русски. */
  ru?: string
  /** Правильные ответы (кириллица). */
  answers: Gendered[]
  explain?: string
}

export interface FillExercise extends ExerciseBase {
  type: 'fill'
  items: FillItem[]
}

export interface MatchExercise extends ExerciseBase {
  type: 'match'
  leftLang: Lang
  rightLang: Lang
  pairs: { left: Gendered; right: Gendered }[]
}

export interface ScriptExercise extends ExerciseBase {
  type: 'script'
  /** toLat: показываем кириллицу, пишем латиницей; toCyr — наоборот. */
  direction: 'toLat' | 'toCyr'
  /** Слова и фразы в кириллице. */
  items: string[]
}

export interface ListenExercise extends ExerciseBase {
  type: 'listen'
  /** Имя файла в public/audio/go-serbia без .mp3 */
  audio: string
  items: ChoiceItem[]
}

export interface DictationExercise extends ExerciseBase {
  type: 'dictation'
  /** Одна запись со всеми словами (public/audio/…). Либо tts: у каждого слова своя кнопка, озвучка Google Переводчика. */
  audio?: string
  tts?: boolean
  /** Слова, которые нужно записать, по порядку (кириллица), с подсказкой. */
  items: { answer: string; ru?: string }[]
}

export interface BuildExercise extends ExerciseBase {
  type: 'build'
  items: {
    ru: Gendered
    /** Допустимые варианты предложения (кириллица, слова через пробел). */
    answers: Gendered[]
    /** Лишние слова-ловушки (необязательно). */
    distractors?: string[]
    explain?: string
  }[]
}

export type Exercise =
  | ChoiceExercise
  | FillExercise
  | MatchExercise
  | ScriptExercise
  | ListenExercise
  | DictationExercise
  | BuildExercise
