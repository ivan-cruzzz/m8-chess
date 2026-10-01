// Генерация ВСЕХ иконок приложения из присланного изображения
// node scripts/gen-app-icon.mjs <путь-к-изображению>
import sharp from 'sharp'
import pngToIco from 'png-to-ico'
import fs from 'node:fs'
import path from 'node:path'

const src = process.argv[2]
if (!src) { console.error('укажите путь к изображению'); process.exit(1) }
const root = path.resolve(import.meta.dirname, '..')

// PWA + favicon + apple-touch
const pwa = [
  ['public/icon-512.png', 512],
  ['public/icon-192.png', 192],
  ['public/apple-touch-icon.png', 180],
  ['public/favicon.png', 64],
]
for (const [rel, size] of pwa) {
  await sharp(src).resize(size, size, { fit: 'cover' }).png().toFile(path.join(root, rel))
  console.log(rel, '— ok')
}

// Tauri
const tauriDir = path.join(root, 'src-tauri', 'icons')
fs.mkdirSync(tauriDir, { recursive: true })
for (const size of [32, 128, 256]) {
  await sharp(src).resize(size, size, { fit: 'cover' }).png().toFile(path.join(tauriDir, `${size}x${size}.png`))
  console.log(`src-tauri/icons/${size}x${size}.png — ok`)
}
const ico = await pngToIco([path.join(tauriDir, '32x32.png'), path.join(tauriDir, '128x128.png'), path.join(tauriDir, '256x256.png')])
fs.writeFileSync(path.join(tauriDir, 'icon.ico'), ico)
console.log('src-tauri/icons/icon.ico — ok')

// Android mipmap (все плотности)
const mipmaps = [
  ['mipmap-mdpi', 48], ['mipmap-hdpi', 72], ['mipmap-xhdpi', 96],
  ['mipmap-xxhdpi', 144], ['mipmap-xxxhdpi', 192],
]
for (const [dir, size] of mipmaps) {
  const target = path.join(root, 'android', 'app', 'src', 'main', 'res', dir)
  fs.mkdirSync(target, { recursive: true })
  await sharp(src).resize(size, size, { fit: 'cover' }).png().toFile(path.join(target, 'ic_launcher.png'))
  await sharp(src).resize(size, size, { fit: 'cover' }).png().toFile(path.join(target, 'ic_launcher_round.png'))
  console.log(`android ${dir} — ok`)
}

// Адаптивная иконка: foreground (лого в безопасной зоне ~62%, прозрачные поля)
const fg = [
  ['mipmap-mdpi', 108], ['mipmap-hdpi', 162], ['mipmap-xhdpi', 216],
  ['mipmap-xxhdpi', 324], ['mipmap-xxxhdpi', 432],
]
for (const [dir, canvas] of fg) {
  const target = path.join(root, 'android', 'app', 'src', 'main', 'res', dir)
  fs.mkdirSync(target, { recursive: true })
  const inner = Math.round(canvas * 0.62)
  const logo = await sharp(src).resize(inner, inner, { fit: 'cover' }).png().toBuffer()
  await sharp({ create: { width: canvas, height: canvas, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toFile(path.join(target, 'ic_launcher_foreground.png'))
  console.log(`foreground ${dir} — ok`)
}

// Splash-экраны: логотип на светлом фоне, размер под каждый файл
const resDir = path.join(root, 'android', 'app', 'src', 'main', 'res')
for (const dir of fs.readdirSync(resDir).filter(d => d.startsWith('drawable-'))) {
  const target = path.join(resDir, dir, 'splash.png')
  if (!fs.existsSync(target)) continue
  const meta = await sharp(target).metadata()
  const logoSize = Math.max(96, Math.round(Math.min(meta.width, meta.height) * 0.45))
  const splashLogo = await sharp(src).resize(logoSize, logoSize, { fit: 'cover' }).png().toBuffer()
  await sharp({ create: { width: meta.width, height: meta.height, channels: 4, background: '#fafafa' } })
    .composite([{ input: splashLogo, gravity: 'center' }])
    .png()
    .toFile(target)
  console.log(`splash ${dir} (${meta.width}x${meta.height}) — ok`)
}
console.log('ВСЕ ИКОНКИ ОБНОВЛЕНЫ')
