import { Chess } from 'chess.js';

/* ---------- Публичные типы ---------- */

export type MateKind = 'mate1' | 'mate2';

export interface MatePuzzle {
  fen: string;
  /** Решение в SAN: 1 ход для mate1, 3 полухода (ход, ответ, мат) для mate2 */
  solution: string[];
  kind: MateKind;
}

/* ---------- Детерминированный ГПСЧ (mulberry32) ---------- */

function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- Клетки и наборы фигур ---------- */

const FILES = 'abcdefgh';
const RANKS = '12345678';

const ALL_SQUARES: string[] = [];
for (const f of FILES) for (const r of RANKS) ALL_SQUARES.push(f + r);

/** Крайние клетки — король получателя мата: у края маты встречаются чаще всего */
const EDGE_SQUARES = ALL_SQUARES.filter((sq) => {
  const f = sq[0];
  const r = sq[1];
  return f === 'a' || f === 'h' || r === '1' || r === '8';
});

const fileOf = (sq: string) => FILES.indexOf(sq[0]);
const rankOf = (sq: string) => RANKS.indexOf(sq[1]);
/** Расстояние Чебышёва (по-королевски) */
const kingDist = (a: string, b: string) =>
  Math.max(Math.abs(fileOf(a) - fileOf(b)), Math.abs(rankOf(a) - rankOf(b)));

/** Наборы фигур атакующей стороны (помимо короля) — по контракту interfaces.md */
const PIECE_SETS: string[][] = [
  ['q'], ['r'], ['r', 'r'], ['q', 'r'], ['q', 'p'], ['r', 'p'], ['b', 'b'], ['b', 'n'],
];
// Веса выбора: тяжёлые фигуры при случайной расстановке дают маты на порядок чаще,
// лёгкие пары добавляют разнообразия, но почти не матуют — берём их реже
const SET_WEIGHTS = [3, 3, 1, 2, 2, 1, 1, 1];
const SET_WEIGHT_TOTAL = SET_WEIGHTS.reduce((a, b) => a + b, 0);

function pickWeightedSet(rng: () => number): string[] {
  let roll = rng() * SET_WEIGHT_TOTAL;
  for (let i = 0; i < PIECE_SETS.length; i++) {
    roll -= SET_WEIGHTS[i];
    if (roll < 0) return PIECE_SETS[i];
  }
  return PIECE_SETS[0];
}

/** Тасование Фишера—Йетса на ГПСЧ — детерминированно по seed */
function shuffled<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ---------- Сборка случайной позиции ---------- */

/** FEN из расстановки: ход белых (атакующая сторона), без рокировок */
function fenFrom(placement: Map<string, string>, turn: 'w' | 'b' = 'w'): string {
  const rows: string[] = [];
  for (let rankIdx = 7; rankIdx >= 0; rankIdx--) {
    let row = '';
    let empty = 0;
    for (let fileIdx = 0; fileIdx < 8; fileIdx++) {
      const piece = placement.get(FILES[fileIdx] + RANKS[rankIdx]);
      if (!piece) {
        empty++;
        continue;
      }
      if (empty) {
        row += String(empty);
        empty = 0;
      }
      row += piece; // белые — заглавные, чёрные — строчные
    }
    if (empty) row += String(empty);
    rows.push(row);
  }
  return `${rows.join('/')} ${turn} - - 0 1`;
}

/**
 * Одна случайная расстановка с эвристиками, повышающими частоту матов:
 * король получателя — на краю, король атакующего — в двух ходах короля
 * (почти замкнутая сеть), фигуры — в радиусе 3 от короля получателя.
 * Возвращает null, если позиция нелегальна или кто-то уже под шахом до хода.
 */
function buildRandomFen(rng: () => number): string | null {
  const defenderK = EDGE_SQUARES[Math.floor(rng() * EDGE_SQUARES.length)];

  // Король атакующего: обычно на расстоянии 2 (закрывает поля отхода, но не матует сам),
  // иногда на 3 — чтобы попадались и более «открытые» позиции
  const wantedDist = rng() < 0.7 ? 2 : 3;
  const kingSpots = ALL_SQUARES.filter((sq) => kingDist(sq, defenderK) === wantedDist);
  const attackerK = kingSpots[Math.floor(rng() * kingSpots.length)];

  const pieces = pickWeightedSet(rng);
  const placement = new Map<string, string>([
    [defenderK, 'k'],
    [attackerK, 'K'],
  ]);

  // Свободные клетки рядом с королём получателя: сначала в радиусе 3,
  // при нехватке добираем с любой свободной
  const nearby = shuffled(
    ALL_SQUARES.filter((sq) => !placement.has(sq) && kingDist(sq, defenderK) <= 3),
    rng
  );
  const spots = [
    ...nearby,
    ...shuffled(ALL_SQUARES.filter((sq) => !placement.has(sq) && !nearby.includes(sq)), rng),
  ];

  // Фигуры атакующего — белые (регистр поднимаем), пешки не на 1-й/8-й горизонтали
  for (const piece of pieces) {
    const upper = piece.toUpperCase();
    const idx = spots.findIndex((sq) => upper !== 'P' || (sq[1] !== '1' && sq[1] !== '8'));
    if (idx < 0) return null; // некуда ставить пешку — практически невозможно
    placement.set(spots[idx], upper);
    spots.splice(idx, 1);
  }

  const fen = fenFrom(placement, 'w');
  try {
    // Получатель мата не должен быть под шахом до хода (иначе позиция нелегальна)
    if (new Chess(fenFrom(placement, 'b')).inCheck()) return null;
    // Атакующий тоже начинает не под шахом — задачи чище
    const g = new Chess(fen);
    if (g.inCheck()) return null;
    return g.fen(); // каноническая запись chess.js — для стабильного round-trip в тестах
  } catch {
    return null;
  }
}

/* ---------- Поиск матов на chess.js ---------- */

/** Матующий ход для стороны, чья очередь: возвращает Move с SAN или null */
function findMatingMove(g: Chess): { san: string } | null {
  for (const m of g.moves({ verbose: true })) {
    g.move({ from: m.from, to: m.to, promotion: m.promotion });
    const mate = g.isCheckmate();
    g.undo();
    if (mate) return { san: m.san };
  }
  return null;
}

/**
 * Форсированный мат не более чем в n ходов для стороны, чья очередь.
 * n=1 — существует матующий ход; n=2 — существует ход, после которого
 * ЛЮБОЙ ответ противника наказывается матом в 1 (все ответы перебираются).
 */
export function verifyMateInN(fen: string, n: 1 | 2): boolean {
  let g: Chess;
  try {
    g = new Chess(fen);
  } catch {
    return false;
  }
  if (n === 1) return findMatingMove(g) !== null;

  for (const m1 of g.moves({ verbose: true })) {
    g.move({ from: m1.from, to: m1.to, promotion: m1.promotion });
    let forced: boolean;
    if (g.isCheckmate()) {
      forced = true; // мат в 1 тоже считается «не более чем в 2»
    } else {
      const replies = g.moves({ verbose: true });
      forced = replies.length > 0; // пат — не мат
      for (const r of replies) {
        g.move({ from: r.from, to: r.to, promotion: r.promotion });
        const mated = findMatingMove(g) !== null;
        g.undo();
        if (!mated) {
          forced = false;
          break;
        }
      }
    }
    g.undo();
    if (forced) return true;
  }
  return false;
}

/** Линия форсированного мата в 2 (ход, ответ, мат) — с гарантией «не мат в 1» */
function findMate2Line(fen: string): string[] | null {
  const g = new Chess(fen);
  if (findMatingMove(g)) return null; // есть мат в 1 — задача «мат в 2» была бы испорчена

  // Ограничение кандидатов первого хода (ускорение перебора без потери корректности —
  // найденное всё равно проверяется на форсированность): шахи, ходы короля и ходы
  // фигур к королю противника — почти все учебные маты в 2 живут среди них
  let defenderKing = 'e8';
  {
    const rows = fen.split(' ')[0].split('/');
    for (let i = 0; i < 8; i++) {
      const col = rows[i].indexOf('k');
      if (col >= 0) {
        defenderKing = FILES[col] + String(8 - i);
        break;
      }
    }
  }

  const candidates = g
    .moves({ verbose: true })
    .filter(
      (m) =>
        m.san.includes('+') ||
        m.san.includes('#') ||
        m.piece === 'k' ||
        kingDist(m.to, defenderKing) <= 2
    );

  for (const m1 of candidates) {
    g.move({ from: m1.from, to: m1.to, promotion: m1.promotion });
    const replies = g.moves({ verbose: true });
    let forced = replies.length > 0;
    let line: string[] | null = null;
    for (const r of replies) {
      g.move({ from: r.from, to: r.to, promotion: r.promotion });
      const mate = findMatingMove(g);
      g.undo();
      if (!mate) {
        forced = false;
        break;
      }
      if (!line) line = [m1.san, r.san, mate.san];
    }
    g.undo();
    if (forced && line) return line;
  }
  return null;
}

/* ---------- Запасной банк проверенных позиций (5 + 5) ---------- */

/** Классические позиции: ладейный/ферзевый мат на последней горизонтали,
 *  спаренный мат (Nf7#) и форсированные варианты «подводка короля — мат по линии» */
export const FALLBACK_BANK: readonly MatePuzzle[] = [
  { kind: 'mate1', fen: '6k1/5ppp/8/8/8/8/8/R6K w - - 0 1', solution: ['Ra8#'] },
  { kind: 'mate1', fen: '6k1/5ppp/8/8/8/8/8/Q6K w - - 0 1', solution: ['Qa8#'] },
  { kind: 'mate1', fen: '6rk/6pp/8/6N1/8/8/8/6K1 w - - 0 1', solution: ['Nf7#'] },
  { kind: 'mate1', fen: '7k/1R6/8/8/8/8/R7/7K w - - 0 1', solution: ['Ra8#'] },
  { kind: 'mate1', fen: 'k7/8/1K6/8/8/4Q3/8/8 w - - 0 1', solution: ['Qe8#'] },
  { kind: 'mate2', fen: '7k/8/5K2/8/8/8/8/1Q6 w - - 0 1', solution: ['Kg6', 'Kg8', 'Qb8#'] },
  { kind: 'mate2', fen: '7k/8/8/8/8/8/R7/1R5K w - - 0 1', solution: ['Rb7', 'Kg8', 'Ra8#'] },
  { kind: 'mate2', fen: '7k/8/5K2/8/8/8/8/R7 w - - 0 1', solution: ['Kg6', 'Kg8', 'Ra8#'] },
  { kind: 'mate2', fen: '7k/6p1/8/5K2/8/8/8/Q7 w - - 0 1', solution: ['Kg6', 'Kg8', 'Qa8#'] },
  { kind: 'mate2', fen: '7k/7p/8/8/8/8/R7/1R5K w - - 0 1', solution: ['Rb7', 'Kg8', 'Ra8#'] },
];

/* ---------- Генератор ---------- */

const MAX_ATTEMPTS = 200;

/**
 * Генерация задачи на мат: случайные расстановки с эвристиками + точная
 * верификация перебором на chess.js. Детерминирована по seed (mulberry32).
 * Если за MAX_ATTEMPTS попыток мат не найден — берётся позиция из FALLBACK_BANK
 * (выбор тоже детерминирован ГПСЧ).
 */
export function generateMatePuzzle(opts: { kind: MateKind; seed?: number }): MatePuzzle {
  const kind = opts.kind;
  const rng = mulberry32(opts.seed ?? (Math.floor(Math.random() * 0x7fffffff) || 1));

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const fen = buildRandomFen(rng);
    if (!fen) continue;
    if (kind === 'mate1') {
      const g = new Chess(fen);
      const mate = findMatingMove(g);
      if (mate) return { fen, solution: [mate.san], kind };
    } else {
      const line = findMate2Line(fen);
      if (line) return { fen, solution: line, kind };
    }
  }

  // Запасной банк: 5 матов в 1 и 5 матов в 2, все проверены тестами
  const pool = FALLBACK_BANK.filter((p) => p.kind === kind);
  return pool[Math.floor(rng() * pool.length)];
}
