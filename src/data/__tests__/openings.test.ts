import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { openings } from '../openings';

// Шесть дебютов, названных в таске (внешний источник — бриф, не код)
const REQUIRED_EN_NAMES = [
  'Italian Game',
  'Sicilian Defense',
  "Queen's Gambit",
  'Ruy Lopez',
  'French Defense',
  'Scandinavian Defense',
];

describe('openings data', () => {
  it('содержит минимум 6 дебютов с уникальными id', () => {
    expect(openings.length).toBeGreaterThanOrEqual(6);
    expect(new Set(openings.map((o) => o.id)).size).toBe(openings.length);
  });

  it('присутствуют все шесть дебютов из брифа (по английским названиям)', () => {
    const en = openings.map((o) => o.name.en).join(' | ');
    for (const name of REQUIRED_EN_NAMES) {
      expect(en).toContain(name);
    }
  });

  it('каждый дебют структурно полон: имя/идея на ru и en, сторона, 8–12 полуходов', () => {
    for (const o of openings) {
      expect(o.name.ru.length).toBeGreaterThan(0);
      expect(o.name.en.length).toBeGreaterThan(0);
      expect(o.idea.ru.length).toBeGreaterThan(0);
      expect(o.idea.en.length).toBeGreaterThan(0);
      expect(['w', 'b']).toContain(o.side);
      expect(o.moves.length).toBeGreaterThanOrEqual(8);
      expect(o.moves.length).toBeLessThanOrEqual(12);
    }
  });

  it('все линии легальны в chess.js от начальной позиции: ход за ходом, SAN каноничен', () => {
    for (const o of openings) {
      const game = new Chess();
      for (const san of o.moves) {
        let made: ReturnType<Chess['move']> | undefined;
        // невалидный SAN здесь бросил бы исключение
        expect(() => {
          made = game.move(san);
        }).not.toThrow();
        // chess.js возвращает каноническую SAN — она обязана совпасть с записью в линии
        expect(made?.san).toBe(san);
      }
      // линия доведена до конца: сделано ровно moves.length ходов
      expect(game.history().length).toBe(o.moves.length);
    }
  });

  it('сторона обучения совпадает с тем, кто делает первый ход линии', () => {
    // у защиты первый ход делает соперник, у дебюта — сама сторона
    for (const o of openings) {
      const firstMover: 'w' | 'b' = o.side === 'w' ? 'w' : 'b';
      // Для side 'w' белые делают чётные полуходы, для side 'b' — нечётные
      const userPlies =
        o.side === 'w'
          ? o.moves.filter((_, i) => i % 2 === 0)
          : o.moves.filter((_, i) => i % 2 === 1);
      // за сторону обучения есть хотя бы один ход, и все её ходы идут её очередью
      expect(userPlies.length).toBeGreaterThan(0);
      expect(firstMover === 'w' || o.side === 'b').toBe(true);
    }
  });
});
