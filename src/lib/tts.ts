// Озвучка слов через Google Переводчик (голос translate.google.com, сербский).
// Файлы скачивает scripts/tts.mjs в public/audio/google-tts/<slug>.mp3 и режет в audio-src/google-tts/.
// Модуль без импортов: его подключает и приложение, и скрипт на Node.

const ASCII: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', ђ: 'dj', е: 'e', ж: 'zh', з: 'z', и: 'i',
  ј: 'j', к: 'k', л: 'l', љ: 'lj', м: 'm', н: 'n', њ: 'nj', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', ћ: 'cj', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', џ: 'dzh', ш: 'sh',
}

/** Имя файла для сербского слова или фразы (кириллица): «Ђердап» → «djerdap», «карта за Београд» → «karta-za-beograd». */
export function ttsSlug(text: string): string {
  return [...text.toLowerCase().trim()]
    .map((ch) => ASCII[ch] ?? (/[a-z0-9]/.test(ch) ? ch : ch === ' ' || ch === '-' ? '-' : ''))
    .join('')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export const TTS_DIR = 'google-tts'

export const ttsUrl = (text: string) => `/audio/${TTS_DIR}/${ttsSlug(text)}.mp3`

/** Слова из строки «дан, брат, сала» (через запятую). */
export const splitWords = (list: string) =>
  list
    .split(',')
    .map((w) => w.trim())
    .filter(Boolean)
