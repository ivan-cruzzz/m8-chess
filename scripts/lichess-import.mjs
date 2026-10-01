// Импорт задач из официальной базы lichess: node scripts/lichess-import.mjs <puzzles.csv.zst>
// Отбирает задачи по темам уроков (рейтинг 800–1600, высокая популярность),
// конвертирует FEN+UCI в формат приложения (SAN), генерирует puzzles-lichess.json
import fs from 'node:fs'
import * as fzstd from 'fzstd'
import { Chess } from 'chess.js'

const src = process.argv[2] ?? 'lichess_puzzle.csv.zst'

// Тема урока (RU) → тег lichess. Ключ — приоритет отбора.
const THEME_MAP = [
  { ru: 'Мат в 1', tag: 'mateIn1' },
  { ru: 'Вилка', tag: 'fork' },
  { ru: 'Связка', tag: 'pin' },
  { ru: 'Сквозной удар', tag: 'skewer' },
  { ru: 'Открытый удар', tag: 'discoveredAttack' },
  { ru: 'Мат в 2', tag: 'mateIn2' },
  { ru: 'Двойной шах', tag: 'doubleCheck' },
  { ru: 'Отвлечение', tag: 'deflection' },
  { ru: 'Освобождение линии', tag: 'xRayAttack' },
  { ru: 'Промежуточный ход', tag: 'intermezzo' },
  { ru: 'Жертва', tag: 'sacrifice' },
  { ru: 'Завлечение', tag: 'attraction' },
  { ru: 'Эндшпиль', tag: 'endgame' },
]

const WANT = 5 // сколько задач на тему
const PER_THEME = new Map(THEME_MAP.map((t) => [t.ru, []]))

const RATING_MIN = 800
const RATING_MAX = 1600
const RD_MAX = 90
const POPULARITY_MIN = 90
const PLAYS_MIN = 500
const MAX_PLIES = 5 // решение не длиннее 5 полуходов

function difficultyOf(rating) {
  if (rating < 1000) return 1
  if (rating < 1200) return 2
  if (rating < 1400) return 3
  return 4
}

const HINTS = {
  'Мат в 1': 'Мат в один ход — найди решающий удар!',
  'Вилка': 'Двойной удар: одна фигура нападает на две цели.',
  'Связка': 'Используй связку — фигура не может уйти.',
  'Сквозной удар': 'Сквозной удар: шах — и фигура позади короля падает.',
  'Открытый удар': 'Открой линию: уходящая фигура вскрывает нападение.',
  'Мат в 2': 'Комбинация из двух ходов ведёт к мату.',
  'Двойной шах': 'Двойной шах — королю некуда бежать!',
  'Отвлечение': 'Отвлеки защитника от ключевого поля.',
  'Освобождение линии': 'Освободи линию для удара.',
  'Промежуточный ход': 'Промежуточный ход с шахом меняет картину.',
  'Жертва': 'Жертва ведёт к победной атаке.',
  'Завлечение': 'Завлеки фигуру на невыгодное поле.',
  'Эндшпиль': 'Точная техника эндшпиля решает исход.',
}
const HINT_SHORT = {
  1: 'Присмотрись к позиции короля.',
  2: 'Ищи двойной удар.',
  3: 'Сначала шах — потом главный ход.',
  4: 'Не жалей материала — жертва окупится.',
}

function tryConvert(row) {
  // CSV: PuzzleId,FEN,Moves,Rating,RatingDeviation,Popularity,NbPlays,Themes,GameUrl,OpeningTags,DailyDate
  const [id, fen, movesUci, rating, rd, popularity, plays, themes] = row
  const uci = movesUci.trim().split(/\s+/)
  if (uci.length - 1 > MAX_PLIES) return null

  // Первый ход в базе — ход соперника, создающий позицию задачи
  const g = new Chess(fen)
  try {
    g.move(uci[0])
  } catch {
    return null
  }
  const puzzleFen = g.fen()

  // Решение: чередование ходов игрока и соперника, в SAN
  const solution = []
  for (let i = 1; i < uci.length; i++) {
    let mv
    try {
      mv = g.move(uci[i])
    } catch {
      return null
    }
    if (!mv) return null
    solution.push(mv.san)
  }
  if (solution.length === 0) return null
  // Задача должна кончаться победой/матом, если заявлена как мат
  const isMate = themes.split(/\s+/).includes('mate')
  if (isMate && !g.isCheckmate()) return null

  return { fen: puzzleFen, solution }
}

// Построчный обход распакованного zstd-потока
async function* csvLines(path) {
  const chunks = []
  const dec = new fzstd.Decompress((out) => {
    if (out && out.length) chunks.push(Buffer.from(out))
  })
  const stream = fs.createReadStream(path)
  let carry = ''
  for await (const buf of stream) {
    dec.push(new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength))
    while (chunks.length) {
      carry += chunks.shift().toString('utf8')
      let nl
      while ((nl = carry.indexOf('\n')) >= 0) {
        yield carry.slice(0, nl)
        carry = carry.slice(nl + 1)
      }
    }
  }
  dec.push(new Uint8Array(0), true)
  while (chunks.length) {
    carry += chunks.shift().toString('utf8')
    let nl
    while ((nl = carry.indexOf('\n')) >= 0) {
      yield carry.slice(0, nl)
      carry = carry.slice(nl + 1)
    }
  }
  if (carry.trim()) yield carry
}

async function main() {
  let lineNo = 0
  let themeCount = new Map()
  for await (const line of csvLines(src)) {
    lineNo++
    if (lineNo === 1 || !line) continue // header
    const row = line.split(',')
    if (row.length < 8) continue

    const [id, fen, movesUci, ratingStr, rdStr, popStr, playsStr, themesStr] = row
    const rating = Number(ratingStr)
    const rd = Number(rdStr)
    const popularity = Number(popStr)
    const plays = Number(playsStr)
    if (rating < RATING_MIN || rating > RATING_MAX) continue
    if (rd > RD_MAX || popularity < POPULARITY_MIN || plays < PLAYS_MIN) continue

    const themeSet = new Set(themesStr.trim().split(/\s+/))
    // отбрасываем мутные задачи: очень длинные, "equality" (ничья) и пр.
    if (themeSet.has('equality') || themeSet.has('veryLong')) continue

    for (const { ru, tag } of THEME_MAP) {
      const bucket = PER_THEME.get(ru)
      if (bucket.length >= WANT) continue
      if (!themeSet.has(tag)) continue
      // матовые темы не должны пересекаться: mateIn1 не попадает в mateIn2 и наоборот
      if (tag === 'mateIn1' && themeSet.has('mateIn2')) continue
      if (tag === 'mateIn2' && themeSet.has('mateIn1')) continue
      if (tag === 'endgame' && !themeSet.has('mate')) continue // эндшпиль берём только с матом

      const converted = tryConvert(row)
      if (!converted) continue
      const diff = difficultyOf(rating)
      bucket.push({
        id: `lp-${id}`,
        fen: converted.fen,
        solution: converted.solution,
        hint: `${HINTS[ru]} ${HINT_SHORT[diff] ?? ''}`.trim(),
        theme: ru,
        difficulty: diff,
        xp: diff * 10,
        rating,
        popularity,
        gameUrl: row[8] || '',
      })
      themeCount.set(ru, bucket.length)
      break // строка уходит только в одну тему
    }

    const total = [...PER_THEME.values()].reduce((n, b) => n + b.length, 0)
    if (lineNo % 500000 === 0) console.error(`строка ${lineNo / 1e6}M, отобрано ${total}`)
    if (total >= WANT * THEME_MAP.length) break
  }

  const result = []
  for (const { ru } of THEME_MAP) {
    const bucket = PER_THEME.get(ru)
      .slice() // сортируем: популярнее и легче — раньше
      .sort((a, b) => a.rating - b.rating)
    result.push(...bucket)
    console.log(`${ru.padEnd(20)} ${bucket.length}`)
  }

  fs.writeFileSync(
    'scripts/puzzles-lichess.json',
    JSON.stringify({ puzzles: result }, null, 2)
  )
  console.log(`Итого: ${result.length} задач → scripts/puzzles-lichess.json`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
