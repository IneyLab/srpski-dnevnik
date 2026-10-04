// Склеивает куски из audio-src/<папка>/ обратно в public/audio/<папка>/*.mp3 и проверяет SHA-256.
// Запускается автоматически перед dev и build (predev/prebuild). Готовые файлы с верным хешем не трогает.
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const root = 'audio-src'
const sha = (buf) => createHash('sha256').update(buf).digest('hex')
let written = 0
let total = 0

for (const dir of existsSync(root) ? readdirSync(root) : []) {
  const src = join(root, dir)
  const out = join('public', 'audio', dir)
  mkdirSync(out, { recursive: true })
  const manifest = JSON.parse(readFileSync(join(src, 'manifest.json'), 'utf8'))
  for (const [name, { size, sha256, parts }] of Object.entries(manifest)) {
    total++
    const target = join(out, name)
    if (existsSync(target)) {
      const cur = readFileSync(target)
      if (cur.length === size && sha(cur) === sha256) continue
    }
    const chunks = []
    for (let i = 0; i < parts; i++) chunks.push(readFileSync(join(src, `${name}.${String(i).padStart(3, '0')}`)))
    const buf = Buffer.concat(chunks)
    if (buf.length !== size || sha(buf) !== sha256) throw new Error(`Аудио ${dir}/${name}: не совпадает контрольная сумма`)
    writeFileSync(target, buf)
    written++
  }
}
console.log(`Аудио: ${total} файлов, собрано заново ${written}`)
