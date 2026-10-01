import { describe, it, expect, vi, afterEach } from 'vitest';
import { Chess } from 'chess.js';
import { bestMove, bestMoveAsync } from '../engine';

/**
 * Characterization-тесты: фиксируют публичный контракт движка
 * (легальность SAN, null при мате/пате, клампинг уровня, async-обёртка).
 * Контракт обязателен и для новой реализации в src/ai/engine,
 * поэтому тесты импортируют стабильный путь src/game/engine.
 */

const START_FEN = new Chess().fen();
const MIDDLEGAME_FEN = 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 1';
const ENDGAME_FEN = '8/2k5/8/8/8/8/5K2/8 w - - 0 1';
// Детский мат: белым поставлен мат — ходов нет
const CHECKMATED_FEN = 'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 0 3';

afterEach(() => {
  vi.useRealTimers();
});

describe('bestMove: контракт', () => {
  it('возвращает легальный SAN из стартовой позиции', () => {
    const game = new Chess(START_FEN);
    const san = bestMove(START_FEN, 5);
    expect(san).not.toBeNull();
    expect(game.moves()).toContain(san);
  });

  it('возвращает легальный SAN в миттельшпиле', () => {
    const game = new Chess(MIDDLEGAME_FEN);
    const san = bestMove(MIDDLEGAME_FEN, 8);
    expect(san).not.toBeNull();
    expect(game.moves()).toContain(san);
  });

  it('возвращает легальный SAN в эндшпиле', () => {
    const game = new Chess(ENDGAME_FEN);
    const san = bestMove(ENDGAME_FEN, 3);
    expect(san).not.toBeNull();
    expect(game.moves()).toContain(san);
  });

  it('возвращает null, когда легальных ходов нет (мат)', () => {
    expect(bestMove(CHECKMATED_FEN, 8)).toBeNull();
  });

  it('не бросает исключений при уровне вне диапазона (клампинг)', () => {
    const game = new Chess(MIDDLEGAME_FEN);
    for (const level of [0, -3, 99, 1000]) {
      const san = bestMove(MIDDLEGAME_FEN, level);
      expect(san).not.toBeNull();
      expect(game.moves()).toContain(san);
    }
  });
});

describe('bestMoveAsync: контракт', () => {
  it('вызывает колбэк с легальным SAN после задержки', () => {
    vi.useFakeTimers();
    const game = new Chess(START_FEN);
    const cb = vi.fn();
    bestMoveAsync(START_FEN, 5, cb);
    expect(cb).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2000);
    expect(cb).toHaveBeenCalledTimes(1);
    const san = cb.mock.calls[0][0] as string | null;
    expect(san).not.toBeNull();
    expect(game.moves()).toContain(san);
  });

  it('передаёт null в колбэк, когда ходов нет', () => {
    vi.useFakeTimers();
    const cb = vi.fn();
    bestMoveAsync(CHECKMATED_FEN, 8, cb);
    vi.advanceTimersByTime(2000);
    expect(cb).toHaveBeenCalledWith(null);
  });
});
