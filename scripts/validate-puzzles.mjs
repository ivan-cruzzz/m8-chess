// Проверяет, что все решения задач легальны и последовательны
import { Chess } from 'chess.js'
import { puzzles } from '../src/data/puzzles.ts'

let bad = 0
for (const p of puzzles) {
  const g = new Chess(p.fen)
  for (const san of p.solution) {
    try {
      g.move(san)
    } catch {
      console.log(`НЕЛЕГАЛЬНЫЙ ХОД: ${p.id} — "${san}" (ход ${p.solution.indexOf(san) + 1})`)
      bad++
      break
    }
  }
}
console.log(bad ? `${bad} битых задач` : `Все ${puzzles.length} задач валидны`)
