// SW-регистрация с версией запроса — ломает HTTP-кэш sw.js
import fs from 'node:fs'

const p = new URL('../../deploy-new/app/index.html', import.meta.url)
let idx = fs.readFileSync(p, 'utf8')
idx = idx.replace(
  /(script id="vite-plugin-pwa:register-sw" src="\/registerSW\.js)(\")/,
  '$1?v=2$2',
)
fs.writeFileSync(p, idx)
console.log('registerSW ссылка:', (idx.match(/registerSW\.js[^"]*/g) || []).join(' | '))
console.log('главный скрипт:', (idx.match(/assets\/index-[\w-]+\.js/g) || []).join(' '))
