// Режет public/audio/<папка>/*.mp3 на куски до 400 КБ в audio-src/<папка>/ и пишет manifest.json
// с размером и SHA-256 каждого файла. Нужно, потому что из сети автора большие файлы
// не загружаются на GitHub одним запросом. Обратная операция — join-audio.mjs (запускается перед сборкой).
// Запуск: node scripts/split-audio.mjs [папка=go-serbia]
import { createHash } from 'node:crypto'
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const PART = 400 * 1024
const dir = process.argv[2] ?? 'go-serbia'
const src = join('public', 'audio', dir)
const out = join('audio-src', dir)

rmSync(out, { recursive: true, force: true })
mkdirSync(out, { recursive: true })
const manifest = {}
for (const name of readdirSync(src).filter((f) => f.endsWith('.mp3')).sort()) {
  const buf = readFileSync(join(src, name))
  const parts = Math.max(1, Math.ceil(buf.length / PART))
  for (let i = 0; i < parts; i++) {
    writeFileSync(join(out, `${name}.${String(i).padStart(3, '0')}`), buf.subarray(i * PART, (i + 1) * PART))
  }
  manifest[name] = { size: buf.length, sha256: createHash('sha256').update(buf).digest('hex'), parts }
}
writeFileSync(join(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
console.log(`${Object.keys(manifest).length} файлов → ${out}`)
