import { Chess } from 'chess.js'
import fs from 'node:fs'

const src = fs.readFileSync('src/data/puzzles.ts', 'utf8')
const blocks = src.match(/\{[^{}]*id: 'lp-[^{}]*\}/gs) || []
for (const b of blocks) {
  const id = b.match(/id: '([^']+)'/)[1]
  const fen = b.match(/fen: '([^']+)'/)[1]
  const sol = b.match(/solution: \[([^\]]*)\]/)[1].trim()
  if (!/#[']$/.test(sol) || sol.includes(',')) continue // только мат в 1
  const g = new Chess(fen)
  const mates = g.moves({ verbose: true }).filter((m) => {
    g.move(m)
    const mate = g.isCheckmate()
    g.undo()
    return mate
  }).map((m) => m.san)
  if (mates.length > 1) console.log(id, '| канонический:', sol.replace(/'/g, ''), '| все маты:', mates.join(', '))
}
console.log('— конец списка —')
