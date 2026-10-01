// Что реально в бандле
import fs from 'node:fs'
const js = fs.readFileSync('dist/assets/index-Cq18uepT.js', 'utf8')
console.log('badge "Verified":', js.includes('Verified'))
console.log('запрос profiles:', js.includes('profiles'))
console.log('mtime:', fs.statSync('dist/assets/index-Cq18uepT.js').mtime.toISOString())
