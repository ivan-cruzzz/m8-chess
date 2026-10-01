// Генерирует src/data/puzzles.ts и src/data/lessons.ts из scripts/puzzles-lichess.json
import fs from 'node:fs'

const { puzzles } = JSON.parse(fs.readFileSync('scripts/puzzles-lichess.json', 'utf8'))

// Порядок уроков как в текущем приложении (координаты узлов карты сохраняем)
const LESSONS = [
  { id: 'basics-1', title: 'Мат в 1', theme: 'Мат в 1', position: { x: 50, y: 10 } },
  { id: 'basics-2', title: 'Вилка', theme: 'Вилка', position: { x: 50, y: 25 } },
  { id: 'basics-3', title: 'Связка', theme: 'Связка', position: { x: 30, y: 40 } },
  { id: 'intermediate-1', title: 'Сквозной удар', theme: 'Сквозной удар', position: { x: 70, y: 40 } },
  { id: 'intermediate-2', title: 'Открытый удар', theme: 'Открытый удар', position: { x: 50, y: 55 } },
  { id: 'intermediate-3', title: 'Мат в 2', theme: 'Мат в 2', position: { x: 30, y: 70 } },
  { id: 'intermediate-4', title: 'Двойной шах', theme: 'Двойной шах', position: { x: 70, y: 70 } },
  { id: 'advanced-1', title: 'Отвлечение', theme: 'Отвлечение', position: { x: 30, y: 85 } },
  { id: 'advanced-2', title: 'Освобождение линии', theme: 'Освобождение линии', position: { x: 70, y: 85 } },
  { id: 'advanced-3', title: 'Промежуточный ход', theme: 'Промежуточный ход', position: { x: 50, y: 100 } },
  { id: 'advanced-4', title: 'Жертва', theme: 'Жертва', position: { x: 30, y: 115 } },
  { id: 'advanced-5', title: 'Завлечение', theme: 'Завлечение', position: { x: 70, y: 115 } },
  { id: 'endgame-1', title: 'Эндшпиль', theme: 'Эндшпиль', position: { x: 50, y: 130 } },
]

const byTheme = new Map()
for (const p of puzzles) {
  if (!byTheme.has(p.theme)) byTheme.set(p.theme, [])
  byTheme.get(p.theme).push(p.id)
}

// puzzles.ts
const puzzleEntries = puzzles
  .map(
    (p) => `  {
    id: '${p.id}',
    fen: '${p.fen}',
    solution: [${p.solution.map((s) => `'${s}'`).join(', ')}],
    hint: ${JSON.stringify(p.hint)},
    theme: '${p.theme}',
    difficulty: ${p.difficulty},
    xp: ${p.xp},
    rating: ${p.rating ?? 1000},
  },`
  )
  .join('\n')

const puzzlesTs = `import type { Puzzle } from '../types';

// Задачи из официальной открытой базы lichess (database.lichess.org),
// отобраны по темам уроков, рейтинг 800–1600, решения — канонические из базы.
export const puzzles: Puzzle[] = [
${puzzleEntries}
];

export const getPuzzleById = (id: string): Puzzle | undefined => puzzles.find((p) => p.id === id);
`

// lessons.ts (сохраняем структуру: FREE_LESSON_COUNT, defaultProgress)
const lessonEntries = LESSONS.map((l) => {
  const ids = (byTheme.get(l.theme) ?? []).map((id) => `'${id}'`).join(', ')
  return `  {
    id: '${l.id}',
    title: '${l.title}',
    theme: '${l.theme}',
    puzzles: [${ids}],
    completed: false,
    locked: true,
    position: { x: ${l.position.x}, y: ${l.position.y} },
  },`
}).join('\n')

const lessonsTs = `import type { Lesson, UserProgress } from '../types';

/** Сколько уроков доступно без подписки */
export const FREE_LESSON_COUNT = 3;

export const lessons: Lesson[] = [
${lessonEntries}
];

export const defaultProgress: UserProgress = {
  xp: 0,
  level: 1,
  streak: 0,
  lastPlayed: null,
  completedPuzzles: [],
  completedLessons: [],
  currentLesson: null,
};
`

fs.writeFileSync('src/data/puzzles.ts', puzzlesTs)
fs.writeFileSync('src/data/lessons.ts', lessonsTs)

const counts = LESSONS.map((l) => `${l.title}: ${(byTheme.get(l.theme) ?? []).length}`).join(', ')
console.log('puzzles.ts и lessons.ts сгенерированы.')
console.log(counts)
console.log(`Всего задач: ${puzzles.length}`)
