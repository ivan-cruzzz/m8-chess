// PDF-презентация M8: титул + страницы-скрины с подписями
// Запуск: node scripts/make-presentation.mjs
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import fs from 'node:fs'

const dir = 'docs/screens'
const OUT = 'docs/M8-Presentation.pdf'

const pdf = await PDFDocument.create()
pdf.setTitle('M8 — Chess Learning App. Presentation')
pdf.setAuthor('M8')

const font = await pdf.embedFont(StandardFonts.Helvetica)
const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold)

// Титульная страница
const cover = await pdf.addPage([595, 842])
cover.drawRectangle({ x: 0, y: 0, width: 595, height: 842, color: rgb(0.07, 0.07, 0.07) })
cover.drawText('M8', { x: 60, y: 640, size: 72, font: fontBold, color: rgb(0.83, 0.63, 0.09) })
cover.drawText('Chess Learning App', { x: 60, y: 580, size: 24, font, color: rgb(0.96, 0.96, 0.96) })
cover.drawText('Presentation of the application', { x: 60, y: 550, size: 12, font, color: rgb(0.64, 0.64, 0.64) })
const feats = [
  '13 lessons, 65 puzzles (lichess DB)',
  'Play vs AI - 8 levels + hotseat',
  'Daily missions, Elo rating, weekly league',
  'LLM coach (Mistral), mistake notebook',
  'Crypto payments (NOWPayments)',
  'Android APK + Windows EXE + Web PWA',
]
feats.forEach((f, i) => cover.drawText('- ' + f, { x: 60, y: 480 - i * 26, size: 12, font, color: rgb(0.85, 0.85, 0.85) }))
cover.drawText('m8chess', { x: 60, y: 80, size: 10, font, color: rgb(0.5, 0.5, 0.5) })

// Страницы-скрины
const slides = [
  ['01-map.png', 'Lesson map — Duolingo-style path, 13 lessons'],
  ['02-lesson-path.png', 'Lesson path — unlock tasks one by one'],
  ['03-puzzle.png', 'Puzzle — drag pieces, hints, AI coach'],
  ['04-play-ai.png', 'Play vs AI — 8 levels + hotseat mode'],
  ['05-daily.png', 'Daily missions & puzzle of the day'],
  ['06-profile.png', 'Profile — Elo, league, achievements, verified badge'],
  ['07-premium.png', 'Premium — crypto payments via NOWPayments'],
  ['08-settings.png', 'Settings — RU/EN, themes, profile transfer'],
]
for (const [img, caption] of slides) {
  const file = `${dir}/${img}`
  if (!fs.existsSync(file)) { console.log('пропуск:', img); continue }
  const page = pdf.addPage([595, 842])
  page.drawRectangle({ x: 0, y: 782, width: 595, height: 60, color: rgb(0.07, 0.07, 0.07) })
  page.drawText(caption, { x: 40, y: 806, size: 16, font: fontBold, color: rgb(0.83, 0.63, 0.09) })
  const png = await pdf.embedPng(fs.readFileSync(file))
  const scale = 620 / png.height
  const w = png.width * scale
  page.drawImage(png, { x: (595 - w) / 2, y: 110, width: w, height: 620 })
  page.drawText('M8 — chess learning app', { x: 40, y: 60, size: 9, font, color: rgb(0.55, 0.55, 0.55) })
}

fs.writeFileSync(OUT, await pdf.save())
console.log('PDF создан:', OUT, (fs.statSync(OUT).size / 1024).toFixed(0), 'КБ')
