import { describe, it, expect, beforeEach } from 'vitest';
import { validatePromo, aggregateDashboard } from '../store';
import type { Promo, UserProgress } from '../../types';

/** ISO-дата (YYYY-MM-DD) со сдвигом в днях от сегодня */
function isoDate(dayOffset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  return d.toISOString().split('T')[0];
}

/** Полный прогресс-фикстура: у u1 свежая активность, у u2 — десятидневная давность */
function fixtureProgress(over: Partial<UserProgress>): UserProgress {
  return {
    xp: 0,
    level: 1,
    streak: 0,
    lastPlayed: null,
    completedPuzzles: [],
    completedLessons: [],
    currentLesson: null,
    puzzleElo: 1000,
    daily: { dateKey: '', missions: [], dailyPuzzleDone: false },
    weekly: { weekKey: '', xp: 0, lastPlace: null },
    leagueDiv: 3,
    survivalBest: null,
    mistakes: [],
    gameHistory: [],
    activityLog: {},
    sprintBest: null,
    openingsStudied: [],
    ...over,
  };
}

const PROMO: Promo = { code: 'M8X', plan: 'monthly', days: 30, maxUses: 5, uses: 2, active: true };

beforeEach(() => {
  localStorage.clear();
});

describe('validatePromo (чистая функция)', () => {
  it('валидный код → ok + сам промокод', () => {
    const res = validatePromo([PROMO], 'M8X');
    expect(res).toEqual({ ok: true, promo: PROMO });
  });

  it('неизвестный код → not_found', () => {
    expect(validatePromo([PROMO], 'NOPE')).toEqual({ ok: false, error: 'not_found' });
  });

  it('исчерпанный лимит (uses >= maxUses) → exhausted', () => {
    const used = { ...PROMO, uses: 5 };
    expect(validatePromo([used], 'M8X')).toEqual({ ok: false, error: 'exhausted' });
  });

  it('выключенный промокод → inactive', () => {
    const off = { ...PROMO, active: false };
    expect(validatePromo([off], 'M8X')).toEqual({ ok: false, error: 'inactive' });
  });
});

describe('aggregateDashboard на фикстуре из двух прогрессов', () => {
  beforeEach(() => {
    localStorage.clear();
    // u1: 120 XP, 3 задачи, сегодня активен, 2 ошибки «Мат в один ход» и 1 «Дебют»
    localStorage.setItem(
      'chessup-progress:u1',
      JSON.stringify(
        fixtureProgress({
          xp: 120,
          lastPlayed: isoDate(0),
          completedPuzzles: ['lp-a', 'lp-b', 'lp-c'],
          mistakes: [
            { puzzleId: 'lp-a', fen: 'f', playedSan: 'Q?', correctSan: 'R!', theme: 'Мат в один ход', ts: 1 },
            { puzzleId: 'lp-b', fen: 'f', playedSan: 'Q?', correctSan: 'R!', theme: 'Мат в один ход', ts: 2 },
            { puzzleId: 'lp-c', fen: 'f', playedSan: 'Q?', correctSan: 'R!', theme: 'Дебют', ts: 3 },
          ],
          activityLog: { [isoDate(0)]: 2, [isoDate(-1)]: 1 },
        }),
      ),
    );
    // u2: 70 XP, 1 задача (lp-a), последняя активность 10 дней назад, премиум-план на 30 дней
    localStorage.setItem(
      'chessup-progress:u2',
      JSON.stringify(
        fixtureProgress({
          xp: 70,
          lastPlayed: isoDate(-10),
          completedPuzzles: ['lp-a'],
          mistakes: [
            { puzzleId: 'lp-a', fen: 'f', playedSan: 'Q?', correctSan: 'R!', theme: 'Эндшпиль', ts: 4 },
          ],
          activityLog: {},
        }),
      ),
    );
    localStorage.setItem(
      'chessup-plan:u2',
      JSON.stringify({ plan: 'monthly', until: new Date(Date.now() + 30 * 86400000).toISOString() }),
    );
  });

  it('KPI сходятся: пользователи, активные за 7 дней, XP, решённые, премиум', () => {
    const d = aggregateDashboard();
    expect(d.userCount).toBe(2);
    expect(d.active7d).toBe(1); // только u1 (у u2 активность 10 дней назад)
    expect(d.totalXp).toBe(190);
    expect(d.totalSolved).toBe(4);
    expect(d.premiumCount).toBe(1); // только u2
  });

  it('activity14 — ровно 14 слотов до сегодняшнего дня включительно', () => {
    const d = aggregateDashboard();
    expect(d.activity14).toHaveLength(14);
    expect(d.activity14[13]).toEqual({ date: isoDate(0), count: 2 }); // только u1: 2 решения сегодня
    expect(d.activity14[12]).toEqual({ date: isoDate(-1), count: 1 });
    expect(d.activity14[0].date).toBe(isoDate(-13));
    expect(d.activity14[0].count).toBe(0);
  });

  it('weakThemes по убыванию ошибок, hardestPuzzles — по числу решивших', () => {
    const d = aggregateDashboard();
    expect(d.weakThemes[0]).toEqual({ theme: 'Мат в один ход', count: 2 });
    expect(d.weakThemes.map((t) => t.theme)).toContain('Дебют');
    // lp-a решили оба (2), lp-b и lp-c — по одному; самые «трудные» — впереди
    expect(d.hardestPuzzles.map((p) => p.id)).toEqual(['lp-b', 'lp-c', 'lp-a']);
    expect(d.hardestPuzzles.map((p) => p.solvedBy)).toEqual([1, 1, 2]);
  });
});
