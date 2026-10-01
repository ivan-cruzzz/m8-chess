import type { Chess } from 'chess.js';

/**
 * Статическая оценка в сантипешках от лица стороны к ходу (конвенция negamax).
 * Состав: материал + позиционные таблицы (PST) + пара слонов + структура пешек
 * (двойные/изолированные/проходные) + пешечный щит короля в миттельшпиле.
 * Мобильность намеренно не считается: полный movegen на каждом листе дороже,
 * чем даёт точности, — активность фигур уже частично учтена в PST.
 */

export const PIECE_VALUE: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

// Таблицы с точки зрения белых; индекс 0 = a8 (порядок строк chess.js .board()).
// Для чёрных индекс зеркалится: 63 - idx.
const PST: Record<string, number[]> = {
  p: [0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, -20, -20, 10, 10, 5, 5, -5, -10, 0, 0, -10, -5, 5, 0, 0, 0, 20, 20, 0, 0, 0, 5, 5, 10, 25, 25, 10, 5, 5, 10, 10, 20, 30, 30, 20, 10, 10, 50, 50, 50, 50, 50, 50, 50, 50, 0, 0, 0, 0, 0, 0, 0, 0],
  n: [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 5, 5, 0, -20, -40, -30, 5, 10, 15, 15, 10, 5, -30, -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 10, 15, 15, 10, 0, -30, -40, -20, 0, 0, 0, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50],
  b: [-20, -10, -10, -10, -10, -10, -10, -20, -10, 5, 0, 0, 0, 0, 5, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 0, 10, 10, 10, 10, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 0, 0, 0, 0, 0, 0, -10, -20, -10, -10, -10, -10, -10, -10, -20],
  r: [0, 0, 0, 5, 5, 0, 0, 0, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 5, 0, 0, 0, 0, 0, 0, 5, 0, 0, 5, 10, 10, 5, 0, 0],
  q: [-20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 5, 0, 0, 0, 0, -10, -10, 5, 5, 5, 5, 5, 0, -10, 0, 0, 5, 5, 5, 5, 0, -5, -5, 0, 5, 5, 5, 5, 0, -5, -10, 0, 5, 5, 5, 5, 0, -10, -10, 0, 0, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20],
  k: [-30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20, -20, -20, -10, 20, 30, 10, 0, 0, 10, 30, 20, 20, 20, 0, 0, 0, 0, 20, 20],
};

const PASSED_BONUS = [0, 10, 20, 35, 60, 100, 150, 0];
const DOUBLED_PENALTY = 12;
const ISOLATED_PENALTY = 12;
const BISHOP_PAIR_BONUS = 30;
const SHELTER_PAWN_BONUS = 8;
const SHELTER_MAX = 24;
/** Порог «миттельшпиля» для пешечного щита: суммарный не-пешечный материал обеих сторон. */
const SHELTER_MATERIAL_THRESHOLD = 2600;

interface PawnFileMap {
  white: number[];
  black: number[];
}

function fileMap(): number[] {
  return [0, 0, 0, 0, 0, 0, 0, 0];
}

export function evaluate(game: Chess): number {
  const board = game.board();
  let score = 0;
  const bishops = { w: 0, b: 0 };
  const pawns: PawnFileMap = { white: fileMap(), black: fileMap() };
  // Клетки королей: [row, file]
  let whiteKing: [number, number] | null = null;
  let blackKing: [number, number] | null = null;
  let nonPawnMaterial = 0;

  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const sq = board[r][f];
      if (!sq) continue;
      const white = sq.color === 'w';
      const idx = white ? r * 8 + f : 63 - (r * 8 + f);
      const val = PIECE_VALUE[sq.type] + PST[sq.type][idx];
      score += white ? val : -val;
      if (sq.type === 'b') bishops[white ? 'w' : 'b']++;
      if (sq.type === 'p') pawns[white ? 'white' : 'black'][f]++;
      if (sq.type === 'k') {
        if (white) whiteKing = [r, f];
        else blackKing = [r, f];
      } else if (sq.type !== 'p') {
        nonPawnMaterial += PIECE_VALUE[sq.type];
      }
    }
  }

  if (bishops.w >= 2) score += BISHOP_PAIR_BONUS;
  if (bishops.b >= 2) score -= BISHOP_PAIR_BONUS;

  // Структура пешек: двойные и изолированные
  for (let f = 0; f < 8; f++) {
    if (pawns.white[f] > 1) score -= DOUBLED_PENALTY * (pawns.white[f] - 1);
    if (pawns.black[f] > 1) score += DOUBLED_PENALTY * (pawns.black[f] - 1);
    const wNeighbors = (f > 0 ? pawns.white[f - 1] : 0) + (f < 7 ? pawns.white[f + 1] : 0);
    const bNeighbors = (f > 0 ? pawns.black[f - 1] : 0) + (f < 7 ? pawns.black[f + 1] : 0);
    if (pawns.white[f] > 0 && wNeighbors === 0) score -= ISOLATED_PENALTY;
    if (pawns.black[f] > 0 && bNeighbors === 0) score += ISOLATED_PENALTY;
  }

  // Проходные пешки: ни одной вражеской пешки впереди на своей и соседних линиях
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const sq = board[r][f];
      if (!sq || sq.type !== 'p') continue;
      const white = sq.color === 'w';
      let passed = true;
      for (let df = -1; df <= 1 && passed; df++) {
        const nf = f + df;
        if (nf < 0 || nf > 7) continue;
        for (let nr = white ? r - 1 : r + 1; nr >= 0 && nr <= 7; nr += white ? -1 : 1) {
          const other = board[nr][nf];
          if (other && other.type === 'p' && other.color !== sq.color) {
            passed = false;
            break;
          }
        }
      }
      if (!passed) continue;
      // Продвинутость: для белых чем меньше r, тем ближе к превращению
      const advance = white ? 7 - r : r;
      score += white ? PASSED_BONUS[advance] : -PASSED_BONUS[advance];
    }
  }

  // Пешечный щит короля (только в миттельшпиле)
  if (nonPawnMaterial > SHELTER_MATERIAL_THRESHOLD) {
    score += shelterScore(board, pawns.white, whiteKing, true);
    score -= shelterScore(board, pawns.black, blackKing, false);
  }

  return game.turn() === 'w' ? score : -score;
}

function shelterScore(
  board: ReturnType<Chess['board']>,
  ownPawns: number[],
  king: [number, number] | null,
  white: boolean,
): number {
  if (!king) return 0;
  const [kr, kf] = king;
  let bonus = 0;
  for (let df = -1; df <= 1; df++) {
    const f = kf + df;
    if (f < 0 || f > 7) continue;
    if (ownPawns[f] === 0) continue;
    // Пешка щита стоит перед королём (для белых — большая строка r)
    for (let r = kr + (white ? 1 : -1); r >= 0 && r <= 7; r += white ? 1 : -1) {
      const sq = board[r][f];
      if (sq && sq.type === 'p' && sq.color === (white ? 'w' : 'b')) {
        bonus += SHELTER_PAWN_BONUS;
        break;
      }
    }
  }
  return Math.min(bonus, SHELTER_MAX);
}
