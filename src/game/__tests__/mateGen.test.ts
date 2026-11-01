import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { generateMatePuzzle, verifyMateInN, FALLBACK_BANK } from '../mateGen';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

describe('generateMatePuzzle', () => {
  it('детерминирован по seed: два вызова с тем же seed дают одинаковые fen и решение', () => {
    const a = generateMatePuzzle({ kind: 'mate1', seed: 42 });
    const b = generateMatePuzzle({ kind: 'mate1', seed: 42 });
    expect(a.fen).toBe(b.fen);
    expect(a.solution).toEqual(b.solution);

    const c = generateMatePuzzle({ kind: 'mate2', seed: 7 });
    const d = generateMatePuzzle({ kind: 'mate2', seed: 7 });
    expect(c.fen).toBe(d.fen);
    expect(c.solution).toEqual(d.solution);
  });

  it('генерирует легальные FEN, которые грузит chess.js, ход белых', () => {
    for (const kind of ['mate1', 'mate2'] as const) {
      for (let seed = 1; seed <= 5; seed++) {
        const p = generateMatePuzzle({ kind, seed });
        const g = new Chess(p.fen); // невалидный FEN бросил бы исключение
        expect(g.fen()).toBe(p.fen); // позиция доходит до chess.js без искажений
        expect(g.turn()).toBe('w');
      }
    }
  }, 30000);

  it('решение задачи реально приводит к мату на доске', () => {
    for (const kind of ['mate1', 'mate2'] as const) {
      for (let seed = 1; seed <= 5; seed++) {
        const p = generateMatePuzzle({ kind, seed });
        const g = new Chess(p.fen);
        for (const san of p.solution) g.move(san); // нелегальный SAN бросил бы исключение
        expect(g.isCheckmate()).toBe(true);
      }
    }
  }, 30000);

  it('20 подряд генераций каждого вида — без повторов fen, каждая проходит verifyMateInN', () => {
    for (const kind of ['mate1', 'mate2'] as const) {
      const fens = new Set<string>();
      for (let seed = 100; seed < 120; seed++) {
        const p = generateMatePuzzle({ kind, seed });
        fens.add(p.fen);
        expect(verifyMateInN(p.fen, kind === 'mate1' ? 1 : 2)).toBe(true);
      }
      expect(fens.size).toBe(20);
    }
  }, 60000);
});

describe('verifyMateInN', () => {
  it('подтверждает известный мат в 1 (ладейный мат на последней горизонтали)', () => {
    expect(verifyMateInN('6k1/5ppp/8/8/8/8/8/R6K w - - 0 1', 1)).toBe(true);
  });

  it('подтверждает известный форсированный мат в 2 (1.Крg6 Крg8 2.Фb8#)', () => {
    expect(verifyMateInN('7k/8/5K2/8/8/8/8/1Q6 w - - 0 1', 2)).toBe(true);
  });

  it('отвергает нематовую позицию (начальная расстановка)', () => {
    expect(verifyMateInN(START_FEN, 1)).toBe(false);
    expect(verifyMateInN(START_FEN, 2)).toBe(false);
  });
});

describe('FALLBACK_BANK', () => {
  it('содержит 10 проверенных позиций (5 мат в 1 + 5 мат в 2), все проходят верификацию', () => {
    expect(FALLBACK_BANK).toHaveLength(10);
    const m1 = FALLBACK_BANK.filter((p) => p.kind === 'mate1');
    const m2 = FALLBACK_BANK.filter((p) => p.kind === 'mate2');
    expect(m1).toHaveLength(5);
    expect(m2).toHaveLength(5);
    for (const p of m1) {
      expect(verifyMateInN(p.fen, 1)).toBe(true);
    }
    for (const p of m2) {
      expect(verifyMateInN(p.fen, 2)).toBe(true);
    }
  });

  it('записанные решения банка доводят позицию до мата', () => {
    for (const p of FALLBACK_BANK) {
      const g = new Chess(p.fen);
      for (const san of p.solution) g.move(san);
      expect(g.isCheckmate()).toBe(true);
    }
  });
});
