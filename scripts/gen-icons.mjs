// Генерирует PNG-иконки PWA из public/favicon.svg
import sharp from 'sharp'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const src = path.join(__dirname, '..', 'public', 'favicon.svg')
const out = (name) => path.join(__dirname, '..', 'public', name)

for (const [name, size] of [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['apple-touch-icon.png', 180],
]) {
  await sharp(src, { density: 300 })
    .resize(size, size)
    .png()
    .toFile(out(name))
  console.log(`${name} (${size}x${size}) — ok`)
}
