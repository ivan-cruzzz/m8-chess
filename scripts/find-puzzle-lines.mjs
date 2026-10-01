// Поиск форсированных линий (каждый ход белых/чёрных — единственный или шах)
// для починки битых задач
import { Chess } from 'chess.js'

function searchLine(g, depth, path) {
  if (depth === 0) return null
  const moves = g.moves({ verbose: true })
  // форсирующий ход: шах или взятие
  const forcing = moves.filter((m) => m.san.includes('+') || m.san.includes('#') || m.captured)
  for (const m of forcing) {
    g.move(m)
    path.push(m.san)
    if (g.isGameOver()) {
      if (g.isCheckmate()) return [...path]
      g.undo(); path.pop(); continue
    }
    const replies = g.moves()
    if (replies.length === 1) {
      g.move(replies[0])
      path.push(replies[0])
      const r = searchLine(g, depth - 1, path)
      if (r) return r
      g.undo(); path.pop()
    } else {
      // несколько ответов — берём линию только если все ведут к мату (упрощённо: пропускаем)
      g.undo(); path.pop()
    }
  }
  return null
}

const fens = process.argv.slice(2)
for (const fen of fens) {
  const g = new Chess(fen)
  const line = searchLine(g, 9, [])
  console.log(line ? `${fen}\n  => ${line.join(' ')}` : `${fen}\n  => нет форсированной линии`)
}
