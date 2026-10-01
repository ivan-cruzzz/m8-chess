import { describe, it, expect, beforeEach, vi } from 'vitest';
import { askCoach, isCoachAvailable } from '../coachService';
import { getCachedResponse } from '../cache';
import type { CoachRequest } from '../types';

/**
 * Мок supabase-клиента с геттером: тесты переключают offline (null) и
 * invoke-режимы без пересоздания модуля.
 */
const state = vi.hoisted(() => ({
  supabase: null as null | { functions: { invoke: ReturnType<typeof vi.fn> } },
}));

vi.mock('../../../lib/supabase', () => ({
  get supabase() {
    return state.supabase;
  },
}));

const REQ: CoachRequest = { action: 'hint', fen: 'fen-x', lang: 'ru' };

beforeEach(() => {
  localStorage.clear();
  state.supabase = null;
});

describe('askCoach: офлайн-режим (Supabase не настроен)', () => {
  it('isCoachAvailable = false', () => {
    expect(isCoachAvailable()).toBe(false);
  });

  it('без кэша возвращает offline', async () => {
    expect(await askCoach(REQ)).toEqual({ ok: false, reason: 'offline' });
  });

  it('кэш отвечает даже офлайн', async () => {
    localStorage.setItem(
      'coach:v1|hint|ru|fen-x||||',
      JSON.stringify({ v: 1, data: { title: 'Т', text: 'Из кэша' }, ts: Date.now() }),
    );
    const res = await askCoach(REQ);
    expect(res).toEqual({ ok: true, data: { title: 'Т', text: 'Из кэша' }, cached: true });
  });
});

describe('askCoach: вызов edge-функции', () => {
  it('успешный ответ сохраняется в кэш', async () => {
    const invoke = vi.fn().mockResolvedValue({
      data: { cached: false, response: { title: 'Идея', text: 'Развивай коня' } },
      error: null,
    });
    state.supabase = { functions: { invoke } };

    const res = await askCoach(REQ);
    expect(res).toEqual({ ok: true, data: { title: 'Идея', text: 'Развивай коня' }, cached: false });
    expect(invoke).toHaveBeenCalledWith('ai-coach', { body: REQ });
    // ответ попал в локальный кэш — повторный вызов не пойдёт в сеть
    expect(getCachedResponse(REQ)).not.toBeNull();
    const second = await askCoach(REQ);
    expect(second).toMatchObject({ ok: true, cached: true });
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it('серверный кэш-хит возвращается как cached', async () => {
    const invoke = vi.fn().mockResolvedValue({
      data: { cached: true, response: { title: 'С', text: 'Серверный кэш' } },
      error: null,
    });
    state.supabase = { functions: { invoke } };
    const res = await askCoach({ ...REQ, fen: 'server-cached' });
    expect(res).toMatchObject({ ok: true, cached: true });
  });

  it('маппинг известных ошибок сервера', async () => {
    for (const reason of ['unauthorized', 'quota_exceeded', 'not_configured'] as const) {
      const invoke = vi.fn().mockResolvedValue({ data: { error: reason }, error: null });
      state.supabase = { functions: { invoke } };
      expect(await askCoach({ ...REQ, fen: 'err-' + reason })).toEqual({ ok: false, reason });
    }
  });

  it('сетевой сбой invoke трактуется как общая ошибка', async () => {
    const invoke = vi.fn().mockRejectedValue(new Error('network'));
    state.supabase = { functions: { invoke } };
    expect(await askCoach({ ...REQ, fen: 'throw' })).toEqual({ ok: false, reason: 'error' });
  });

  it('некорректная форма ответа отклоняется', async () => {
    const invoke = vi.fn().mockResolvedValue({ data: { cached: false, response: { title: 'без текста' } }, error: null });
    state.supabase = { functions: { invoke } };
    expect(await askCoach({ ...REQ, fen: 'bad-shape' })).toEqual({ ok: false, reason: 'error' });
  });
});
