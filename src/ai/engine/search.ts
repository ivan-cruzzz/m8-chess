import { Chess, type Move } from 'chess.js';
import { evaluate, PIECE_VALUE } from './evaluation';
import { positionKey } from './positionKey';
import { levelConfig } from './levels';
import { MATE_SCORE, MATE_IN_MAX } from './types';
import type { SearchResult, SearchOptions } from './types';

/**
 * Ядро поиска: negamax с альфа-бета, итеративным углублением и бюджетом времени,
 * транспозиционной таблицей, quiescence-поиском (MVV-LVA + дельта-отсечение),
 * расширением шаха, killer/history-эвристиками.
 *
 * Гарантии контракта:
 *  — возврат ЛЕГАЛЬНОГО хода не позже бюджета (первая итерация глубины 1
 *    всегда завершается: её стоимость равна одному вызову movegen);
 *  — при отсутствии ходов или невалидном FEN — san: null;
 *  — матовый счёт: MATE_SCORE − ply от лица стороны к ходу.
 */

const TT_MAX_ENTRIES = 150_000;
const MAX_PLY = 96;
/** Порог начала новой итерации: не тратим последние 40% бюджета на заведомо незавершимую глубину. */
const ITERATION_RESUME_FACTOR = 0.6;

const ABORT = { abort: true };
const now = (): number => (typeof performance !== 'undefined' ? performance.now() : Date.now());

interface TTEntry {
  depth: number;
  score: number;
  flag: 'EXACT' | 'LOWER' | 'UPPER';
  bestSan: string | null;
}

interface SearchState {
  game: Chess;
  tt: Map<string, TTEntry>;
  killers: (string | null)[][];
  history: Map<string, number>;
  nodes: number;
  deadline: number;
}

const moveKey = (m: Move): string => m.from + m.to + (m.promotion ?? '');

function orderMoves(moves: Move[], ttBest: string | null, killers: (string | null)[], history: Map<string, number>): Move[] {
  const scored = moves.map((m) => {
    let s: number;
    if (ttBest !== null && m.san === ttBest) {
      s = 1e9;
    } else if (m.captured || m.promotion) {
      s = 1e6;
      if (m.captured) s += PIECE_VALUE[m.captured] * 100 - PIECE_VALUE[m.piece];
      if (m.promotion) s += PIECE_VALUE[m.promotion];
    } else if (killers[0] !== null && moveKey(m) === killers[0]) {
      s = 9e5;
    } else if (killers[1] !== null && moveKey(m) === killers[1]) {
      s = 8e5;
    } else {
      s = history.get(moveKey(m)) ?? 0;
    }
    return { m, s };
  });
  scored.sort((a, b) => b.s - a.s);
  return scored.map((x) => x.m);
}

function negamax(state: SearchState, depth: number, alpha: number, beta: number, ply: number): number {
  state.nodes++;
  if ((state.nodes & 255) === 0 && now() > state.deadline) throw ABORT;

  const game = state.game;
  if (game.isGameOver()) {
    if (game.isCheckmate()) return -MATE_SCORE + ply;
    return 0;
  }
  if (ply >= MAX_PLY) return evaluate(game);

  if (depth <= 0) return quiescence(state, alpha, beta, ply);

  const key = positionKey(game);
  const tte = state.tt.get(key);
  if (tte && tte.depth >= depth) {
    if (tte.flag === 'EXACT') return tte.score;
    if (tte.flag === 'LOWER' && tte.score >= beta) return tte.score;
    if (tte.flag === 'UPPER' && tte.score <= alpha) return tte.score;
  }

  // Расширение шаха: не даём «обрезать» тактическую последовательность
  if (game.inCheck()) depth += 1;

  const moves = game.moves({ verbose: true }) as Move[];
  const ordered = orderMoves(moves, tte?.bestSan ?? null, state.killers[ply] ?? [null, null], state.history);

  let best = -Infinity;
  let bestSan: string | null = null;
  const alphaOrig = alpha;

  for (const m of ordered) {
    state.game.move(m);
    const score = -negamax(state, depth - 1, -beta, -alpha, ply + 1);
    state.game.undo();
    if (score > best) {
      best = score;
      bestSan = m.san;
    }
    if (best > alpha) alpha = best;
    if (alpha >= beta) {
      if (!m.captured) {
        const k = state.killers[ply] ?? (state.killers[ply] = [null, null]);
        const mk = moveKey(m);
        if (k[0] !== mk) {
          k[1] = k[0];
          k[0] = mk;
        }
        state.history.set(mk, (state.history.get(mk) ?? 0) + depth * depth);
      }
      break;
    }
  }

  // Матовые оценки не кладём в TT: их нужно корректировать на ply при извлечении,
  // проще и надёжнее — не кэшировать (корректность важнее скорости на mating-деревьях).
  if (Math.abs(best) <= MATE_IN_MAX) {
    const flag = best <= alphaOrig ? 'UPPER' : best >= beta ? 'LOWER' : 'EXACT';
    state.tt.set(key, { depth, score: best, flag, bestSan });
  }
  return best;
}

function quiescence(state: SearchState, alpha: number, beta: number, ply: number): number {
  state.nodes++;
  if ((state.nodes & 255) === 0 && now() > state.deadline) throw ABORT;

  const game = state.game;
  if (game.isGameOver()) {
    if (game.isCheckmate()) return -MATE_SCORE + ply;
    return 0;
  }

  const standPat = evaluate(game);
  if (standPat >= beta) return standPat;
  if (standPat > alpha) alpha = standPat;
  if (ply >= MAX_PLY) return standPat;

  const moves = game.moves({ verbose: true }) as Move[];
  const tactical = moves.filter((m) => m.captured !== undefined || m.promotion !== undefined);
  const ordered = orderMoves(tactical, null, [null, null], state.history);

  for (const m of ordered) {
    // Дельта-отсечение: взятие заведомо не поднимает alpha даже с запасом
    if (m.captured && standPat + PIECE_VALUE[m.captured] + 200 < alpha) continue;
    state.game.move(m);
    const score = -quiescence(state, -beta, -alpha, ply + 1);
    state.game.undo();
    if (score >= beta) return score;
    if (score > alpha) alpha = score;
  }
  return alpha;
}

export function searchBestMove(fen: string, level: number, options: SearchOptions = {}): SearchResult {
  const started = now();
  let game: Chess;
  try {
    game = new Chess(fen);
  } catch {
    return { san: null, depth: 0, scoreCp: 0, nodes: 0, timeMs: elapsedMs(started) };
  }

  const cfg = levelConfig(level);
  const rng = options.rng ?? Math.random;
  const maxDepth = Math.max(1, Math.min(options.maxDepth ?? cfg.depth, MAX_PLY));
  const budget = Math.max(30, options.timeBudgetMs ?? cfg.timeBudgetMs);

  const rootMoves = game.moves({ verbose: true }) as Move[];
  if (rootMoves.length === 0) {
    return { san: null, depth: 0, scoreCp: 0, nodes: 0, timeMs: elapsedMs(started) };
  }

  // Персона «зевак»: слабые уровни иногда играют случайно
  if (cfg.blunderChance > 0 && rng() < cfg.blunderChance) {
    const m = rootMoves[Math.floor(rng() * rootMoves.length)];
    return { san: m.san, depth: 0, scoreCp: 0, nodes: rootMoves.length, timeMs: elapsedMs(started) };
  }

  const baseHistoryLen = game.history().length;
  const state: SearchState = {
    game,
    tt: new Map(),
    killers: Array.from({ length: MAX_PLY + 2 }, () => [null, null] as (string | null)[]),
    history: new Map(),
    nodes: 0,
    deadline: started + budget,
  };

  let bestSan = rootMoves[0].san;
  let bestScore = -Infinity;
  let completedDepth = 0;
  let rootScores: { san: string; score: number }[] = [];

  for (let depth = 1; depth <= maxDepth; depth++) {
    if (completedDepth >= 1 && now() - started > budget * ITERATION_RESUME_FACTOR) break;
    if (state.tt.size > TT_MAX_ENTRIES) state.tt.clear();
    try {
      let alpha = -Infinity;
      const iteration: { san: string; score: number }[] = [];
      const ordered = orderMoves(rootMoves, bestSan, state.killers[0], state.history);
      for (const m of ordered) {
        game.move(m);
        const score = -negamax(state, depth - 1, -Infinity, -alpha, 1);
        game.undo();
        iteration.push({ san: m.san, score });
        if (score > alpha) {
          alpha = score;
          bestSan = m.san;
        }
      }
      bestScore = alpha;
      rootScores = iteration;
      completedDepth = depth;
      options.onProgress?.({ depth, san: bestSan, scoreCp: bestScore, nodes: state.nodes });
    } catch (e) {
      if (e !== ABORT) throw e;
      // Прерывание из глубины рекурсии раскрутило стек без undo — восстанавливаем доску
      while (game.history().length > baseHistoryLen) game.undo();
      break;
    }
  }

  // Персона слабого уровня: выбираем среди ходов, «размытых» шумом оценки
  if (cfg.noise > 0 && rootScores.length > 0) {
    const noised = rootScores.map((rs) => ({ san: rs.san, score: rs.score, noisy: rs.score + (rng() - 0.5) * 2 * cfg.noise }));
    noised.sort((a, b) => b.noisy - a.noisy);
    bestSan = noised[0].san;
    bestScore = noised[0].score;
  }

  return {
    san: bestSan,
    depth: completedDepth,
    scoreCp: bestScore === -Infinity ? 0 : Math.round(bestScore),
    nodes: state.nodes,
    timeMs: elapsedMs(started),
  };
}

/** Совместимость со старым API src/game/engine: только SAN. */
export function bestMove(fen: string, level: number, options?: SearchOptions): string | null {
  return searchBestMove(fen, level, options).san;
}

function elapsedMs(started: number): number {
  return Math.max(0, Math.round(now() - started));
}
