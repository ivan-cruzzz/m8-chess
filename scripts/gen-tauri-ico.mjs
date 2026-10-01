// Генерация иконок Tauri из public/icon-512.png
import pngToIco from 'png-to-ico'
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const root = path.resolve(import.meta.dirname, '..')
const src = path.join(root, 'public', 'icon-512.png')
const iconsDir = path.join(root, 'src-tauri', 'icons')
fs.mkdirSync(iconsDir, { recursive: true })

// PNG-иконки разных размеров + 32x32/128x128
for (const size of [32, 128, 256]) {
  await sharp(src).resize(size, size).png().toFile(path.join(iconsDir, `${size}x${size}.png`))
  console.log(`${size}x${size}.png — ok`)
}
// Windows .ico (набор размеров внутри)
const buf = await pngToIco([path.join(iconsDir, '32x32.png'), path.join(iconsDir, '128x128.png'), path.join(iconsDir, '256x256.png')])
fs.writeFileSync(path.join(iconsDir, 'icon.ico'), buf)
console.log('icon.ico — ok')
