// Диагностика worker-чанка в билде и на сервере
import fs from 'node:fs'

const idx = fs.readFileSync('dist/index.html', 'utf8')
const m = idx.match(/assets\/index-[\w-]+\.js/)
console.log('index.html ->', m[0])
const js = fs.readFileSync('dist/' + m[0], 'utf8')
const wm = js.match(/new Worker\([^;]{0,140}/g)
console.log('new Worker(...):', wm)

const r = await fetch('http://127.0.0.1:7300/assets/worker-DxgOj0BA.js')
console.log('worker чанк на сервере:', r.status, r.headers.get('content-type'))
const wt = await r.text()
console.log('worker чанк начинается с:', wt.slice(0, 120).replace(/\n/g, ' '))
