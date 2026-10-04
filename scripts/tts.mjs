// Скачивает озвучку Google Переводчика (сербский голос) для всех слов, которые нужны учебнику:
// <RepeatAfter words="…"> в MDX и диктанты с tts: true в exercises.ts.
// Готовые файлы не трогает. После скачивания режет их в audio-src/google-tts/ (как split-audio).
// Запуск: npm run tts
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { ttsSlug, splitWords, TTS_DIR } from '../src/lib/tts.ts'

const weeksDir = join('src', 'content', 'weeks')
const words = new Set()
for (const w of readdirSync(weeksDir)) {
  for (const f of readdirSync(join(weeksDir, w))) {
    if (f.endsWith('.mdx')) {
      for (const m of readFileSync(join(weeksDir, w, f), 'utf8').matchAll(/<RepeatAfter[^>]*?\swords="([^"]+)"/g)) {
        splitWords(m[1]).forEach((x) => words.add(x))
      }
    }
  }
  const ex = join(weeksDir, w, 'exercises.ts')
  if (existsSync(ex)) {
    const { default: list } = await import(pathToFileURL(ex).href)
    for (const e of list) if (e.type === 'dictation' && e.tts) e.items.forEach((it) => words.add(it.answer))
  }
}

const out = join('public', 'audio', TTS_DIR)
mkdirSync(out, { recursive: true })
let fetched = 0
for (const word of words) {
  const file = join(out, `${ttsSlug(word)}.mp3`)
  if (existsSync(file)) continue
  const url = `https://translate.googleapis.com/translate_tts?ie=UTF-8&client=gtx&tl=sr&q=${encodeURIComponent(word)}`
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
  const buf = Buffer.from(await res.arrayBuffer())
  if (!res.ok || buf.length < 1000) throw new Error(`TTS «${word}»: HTTP ${res.status}, ${buf.length} байт`)
  writeFileSync(file, buf)
  fetched++
  console.log(`✓ ${word} → ${ttsSlug(word)}.mp3`)
  await new Promise((r) => setTimeout(r, 300))
}
console.log(`Озвучка: ${words.size} слов, скачано ${fetched}`)
if (fetched) execFileSync('node', ['scripts/split-audio.mjs', TTS_DIR], { stdio: 'inherit' })
