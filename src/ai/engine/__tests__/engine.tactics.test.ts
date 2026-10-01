import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { searchBestMove, bestMove } from '../index';
import { MATE_IN_MAX } from '../types';

/**
 * Тактическая корректность нового движка: маты, матовый счёт, бюджет времени,
 * детерминированность и персона слабых уровней (инъекция ГПСЧ).
 */

const MATE_IN_1_QXF7 = 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 1';
const BACKRANK_M1 = '6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1';
const KRK_MATE_IN_2 = '7k/8/5K2/8/8/8/8/R7 w - - 0 1'; // 1.Kg6! Kg8 2.Ra8#
const KRK_BLACK_TO_MOVE = '7k/8/6K1/8/8/8/8/7R b - - 0 1';
const CHECKMATED_FEN = 'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 0 3';
const MIDDLEGAME_FEN = 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 1';

describe('searchBestMove: тактика', () => {
  it('находит мат в 1 (Qxf7#)', () => {
    expect(bestMove(MATE_IN_1_QXF7, 8)).toBe('Qxf7#');
  });

  it('находит мат в 1 (Ra8#)', () => {
    expect(bestMove(BACKRANK_M1, 8)).toBe('Ra8#');
  });

  it('находит мат в 2 и возвращает матовый счёт (KRK)', () => {
    const res = searchBestMove(KRK_MATE_IN_2, 8);
    expect(res.san).toMatch(/^K/); // единственные выигрышные первые ходы — Kg6 и Kf7
    expect(res.scoreCp).toBeGreaterThanOrEqual(MATE_IN_MAX);
    expect(res.depth).toBeGreaterThanOrEqual(3);
    // Честная верификация форсированного мата: на любой ответ чёрных у белых есть мат
    const g = new Chess(KRK_MATE_IN_2);
    g.move(res.san!);
    const replies = g.moves();
    expect(replies.length).toBeGreaterThanOrEqual(1);
    for (const reply of replies) {
      g.move(reply);
      const hasMate = (g.moves({ verbose: true }) as { san: string }[]).some((m) => {
        g.move(m.san);
        const mate = g.isCheckmate();
        g.undo();
        return mate;
      });
      expect(hasMate).toBe(true);
      g.undo();
    }
  });

  it('проигрывающая сторона получает отрицательный матовый счёт', () => {
    const res = searchBestMove(KRK_BLACK_TO_MOVE, 8);
    expect(res.scoreCp).toBeLessThanOrEqual(-MATE_IN_MAX);
  });

  it('возвращает null при мате/пате и на невалидном FEN', () => {
    expect(bestMove(CHECKMATED_FEN, 8)).toBeNull();
    expect(bestMove('это не fen', 8)).toBeNull();
  });
});

describe('searchBestMove: бюджет времени и прогресс', () => {
  it('укладывается в бюджет времени на уровне 8 в миттельшпиле', { timeout: 5_000 }, () => {
    const res = searchBestMove(MIDDLEGAME_FEN, 8);
    expect(res.timeMs).toBeLessThanOrEqual(1200); // бюджет 800 мс + запас на прерывание
    const g = new Chess(MIDDLEGAME_FEN);
    expect(g.moves()).toContain(res.san);
  });

  it('с щедрым бюджетом уходит в глубину ≥2 и возвращает легальный ход', { timeout: 5_000 }, () => {
    const res = searchBestMove(MIDDLEGAME_FEN, 8, { timeBudgetMs: 2500 });
    expect(res.depth).toBeGreaterThanOrEqual(2);
    const g = new Chess(MIDDLEGAME_FEN);
    expect(g.moves()).toContain(res.san);
  });

  it('сообщает прогресс по глубинам', () => {
    const depths: number[] = [];
    searchBestMove(KRK_MATE_IN_2, 8, {
      onProgress: (info) => depths.push(info.depth),
    });
    expect(depths.length).toBeGreaterThanOrEqual(1);
    expect(depths[0]).toBe(1);
    expect([...depths].sort((a, b) => a - b)).toEqual(depths); // глубина монотонно растёт
  });
});

describe('searchBestMove: персона уровней', () => {
  it('уровень 8 детерминирован (без шума и зевков)', () => {
    const a = bestMove(MIDDLEGAME_FEN, 8);
    const b = bestMove(MIDDLEGAME_FEN, 8);
    expect(a).toBe(b);
  });

  it('персона «зевак» на уровне 1 играет предсказуемо-случайный ход при фиксированном ГПСЧ', () => {
    // rng()=0.1 < blunderChance(0.25) → случайный ход: rootMoves[floor(0.1 * len)]
    const game = new Chess(MIDDLEGAME_FEN);
    const expected = game.moves({ verbose: true })[Math.floor(0.1 * game.moves().length)].san;
    const res = searchBestMove(MIDDLEGAME_FEN, 1, { rng: () => 0.1 });
    expect(res.san).toBe(expected);
    expect(res.depth).toBe(0); // зевок — без поиска
  });

  it('шум с нулевым разбросом ГПСЧ выбирает объективно лучший ход', () => {
    // rng()=0.5 → шум (0.5-0.5)*2*noise = 0: даже на шумном уровне 5
    // выбор совпадает с истинным аргмаксимумом — матом в 1 (Qxf7#)
    const clean = bestMove(MIDDLEGAME_FEN, 5, { rng: () => 0.5 });
    expect(clean).toBe('Qxf7#');
  });
});
