import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { UserProgress } from '../../types';
import { useProgress, normalize } from '../useProgress';

// Хук читает user.id из AuthContext — подменяем, чтобы тест шёл в изоляции от Supabase
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'backfill-user', username: 'tester', email: 't@example.com' } }),
}));

/** Профиль старого формата: без activityLog / sprintBest / openingsStudied */
function legacyProfile(): Partial<UserProgress> {
  return {
    xp: 55,
    level: 2,
    streak: 1,
    lastPlayed: null,
    completedPuzzles: ['lp-a'],
    completedLessons: [],
    currentLesson: null,
    puzzleElo: 1000,
    daily: { dateKey: '', missions: [], dailyPuzzleDone: false },
    weekly: { weekKey: '', xp: 0, lastPlace: null },
    leagueDiv: 3,
    survivalBest: null,
    mistakes: [],
    gameHistory: [],
  };
}

beforeEach(() => {
  localStorage.clear();
});

describe('backfill: normalize() дозаполняет старые сохранения', () => {
  it('старый профиль получает activityLog={}, sprintBest=null, openingsStudied=[]', () => {
    const p = normalize(legacyProfile());
    expect(p.activityLog).toEqual({});
    expect(p.sprintBest).toBeNull();
    expect(p.openingsStudied).toEqual([]);
  });

  it('уже существующие новые поля normalize() не затирает', () => {
    const p = normalize({
      ...legacyProfile(),
      activityLog: { '2026-01-01': 4 },
      sprintBest: { score: 9, date: '2026-01-01' },
      openingsStudied: ['italian'],
    });
    expect(p.activityLog).toEqual({ '2026-01-01': 4 });
    expect(p.sprintBest).toEqual({ score: 9, date: '2026-01-01' });
    expect(p.openingsStudied).toEqual(['italian']);
  });
});

describe('backfill через публичный API хука', () => {
  it('useProgress отдаёт дозаполненный прогресс старого сохранения', () => {
    localStorage.setItem('chessup-progress:backfill-user', JSON.stringify(legacyProfile()));
    const { result } = renderHook(() => useProgress());
    expect(result.current.progress.activityLog).toEqual({});
    expect(result.current.progress.sprintBest).toBeNull();
    expect(result.current.progress.openingsStudied).toEqual([]);
    // старые данные при этом не потеряны
    expect(result.current.progress.xp).toBe(55);
    expect(result.current.progress.completedPuzzles).toEqual(['lp-a']);
  });
});
