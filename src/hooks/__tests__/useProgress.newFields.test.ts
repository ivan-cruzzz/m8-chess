import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useProgress } from '../useProgress';

// Хук читает user.id из AuthContext — подменяем, чтобы тест шёл в изоляции от Supabase
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'fields-user', username: 'tester', email: 't@example.com' } }),
}));

const todayKey = () => new Date().toISOString().split('T')[0];

beforeEach(() => {
  localStorage.clear();
});

describe('noteSprintScore: рекорд спринта', () => {
  it('пишет рекорд только если новый счёт лучше', () => {
    const { result } = renderHook(() => useProgress());

    act(() => result.current.noteSprintScore(5));
    expect(result.current.progress.sprintBest).toEqual({ score: 5, date: todayKey() });

    // хуже предыдущего — рекорд не меняется
    act(() => result.current.noteSprintScore(3));
    expect(result.current.progress.sprintBest).toEqual({ score: 5, date: todayKey() });

    // лучше — перезаписывается
    act(() => result.current.noteSprintScore(8));
    expect(result.current.progress.sprintBest).toEqual({ score: 8, date: todayKey() });
  });
});

describe('noteOpeningDone: бонус XP за дебют', () => {
  it('начисляет XP один раз на дебют', () => {
    const { result } = renderHook(() => useProgress());
    const xp0 = result.current.progress.xp;

    act(() => result.current.noteOpeningDone('italian', 25));
    expect(result.current.progress.xp).toBe(xp0 + 25);
    expect(result.current.progress.openingsStudied).toEqual(['italian']);

    // повторное прохождение того же дебюта — XP не начисляется
    act(() => result.current.noteOpeningDone('italian', 25));
    expect(result.current.progress.xp).toBe(xp0 + 25);
    expect(result.current.progress.openingsStudied).toEqual(['italian']);

    // другой дебют — снова начисляется
    act(() => result.current.noteOpeningDone('sicilian', 25));
    expect(result.current.progress.xp).toBe(xp0 + 50);
    expect(result.current.progress.openingsStudied).toEqual(['italian', 'sicilian']);
  });
});
