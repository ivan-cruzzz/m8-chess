// Рендер страниц DJVU в PNG: node scripts/djvu-to-png.mjs <file.djvu> <from> <to> [dpi]
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import sharp from 'sharp'

const [file, fromArg, toArg, dpiArg] = process.argv.slice(2)
const from = parseInt(fromArg ?? '0', 10)
const to = parseInt(toArg ?? String(from), 10)
const dpi = parseInt(dpiArg ?? '150', 10)

// Прямой импорт варианта wasm (корневой загрузчик требует fetch, которого нет в Node)
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'node_modules', 'djvu-rs')
const variantMod = await import(pathToFileURL(path.join(root, 'simd128', 'djvu_rs.js')).href)
variantMod.initSync({ module: fs.readFileSync(path.join(root, 'simd128', 'djvu_rs_bg.wasm')) })
const WasmDocument = variantMod.WasmDocument
const bytes = new Uint8Array(fs.readFileSync(file))
const doc = WasmDocument.from_bytes(bytes)
console.log('Страниц в книге:', doc.page_count())

const outDir = path.join(path.dirname(file), 'pages')
fs.mkdirSync(outDir, { recursive: true })

for (let i = from; i <= Math.min(to, doc.page_count() - 1); i++) {
  const page = doc.page(i)
  const w = page.width_at(dpi)
  const h = page.height_at(dpi)
  const rgba = page.render(dpi)
  const out = path.join(outDir, `page-${String(i + 1).padStart(3, '0')}.png`)
  await sharp(Buffer.from(rgba), { raw: { width: w, height: h, channels: 4 } })
    .png()
    .toFile(out)
  const text = page.text()
  console.log(`${out} (${w}x${h})`, text ? `text: ${text.slice(0, 60).replace(/\n/g, ' ')}` : '(нет текстового слоя)')
}
