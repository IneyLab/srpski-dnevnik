// Источники заданий и материалов. Подпись «(c) Источник» выводится мелким серым шрифтом
// внизу задания (упражнения, аудио, таблицы) — см. CLAUDE.md, «Источники».

export interface SourceRef {
  /** Название источника, как его подписываем: «Go-Serbia». */
  name: string
  /** Ссылка на конкретный урок или страницу, откуда взят материал. */
  url: string
}

export const SOURCES = {
  goSerbia1: { name: 'Go-Serbia', url: 'https://lang.go-serbia.net/page/urok-1-2.htm' },
  // Озвучка слов: сербский голос Google Переводчика (scripts/tts.mjs)
  googleTts: { name: 'Google Переводчик', url: 'https://translate.google.com/?sl=sr&tl=ru' },
} satisfies Record<string, SourceRef>

export type SourceId = keyof typeof SOURCES

export const isSourceId = (id: string): id is SourceId => id in SOURCES
