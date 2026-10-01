import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getCachedResponse, putCachedResponse, clearCoachCache } from '../cache';
import { coachCacheKey, PROMPT_VERSION, buildSystemPrompt, buildUserPrompt } from '../prompts';
import type { CoachRequest } from '../types';

const REQ: CoachRequest = { action: 'hint', fen: 'start-fen', lang: 'ru' };

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('кэш тренера', () => {
  it('put → get возвращает данные', () => {
    putCachedResponse(REQ, { title: 'Т', text: 'Подсказка' });
    expect(getCachedResponse(REQ)).toEqual({ title: 'Т', text: 'Подсказка' });
  });

  it('промах по другому запросу', () => {
    putCachedResponse(REQ, { title: 'Т', text: 'Подсказка' });
    expect(getCachedResponse({ ...REQ, fen: 'other' })).toBeNull();
  });

  it('записи старше TTL не возвращаются', () => {
    putCachedResponse(REQ, { title: 'Т', text: 'Старая' });
    vi.setSystemTime(Date.now() + 31 * 24 * 3600 * 1000);
    expect(getCachedResponse(REQ)).toBeNull();
  });

  it('битая запись игнорируется', () => {
    localStorage.setItem('coach:' + coachCacheKey(REQ), '{не json');
    expect(getCachedResponse(REQ)).toBeNull();
  });

  it('лимит записей вытесняет самые старые', () => {
    let ts = 1_000_000_000_000;
    for (let i = 0; i < 105; i++) {
      const req: CoachRequest = { action: 'hint', fen: 'fen-' + i, lang: 'ru' };
      vi.setSystemTime(ts + i * 1000);
      putCachedResponse(req, { title: 't', text: 'x' });
    }
    vi.setSystemTime(ts + 200_000);
    expect(getCachedResponse({ action: 'hint', fen: 'fen-0', lang: 'ru' })).toBeNull();
    expect(getCachedResponse({ action: 'hint', fen: 'fen-104', lang: 'ru' })).not.toBeNull();
  });

  it('clearCoachCache чистит только записи тренера', () => {
    localStorage.setItem('other-key', 'value');
    putCachedResponse(REQ, { title: 'Т', text: 'Подсказка' });
    clearCoachCache();
    expect(getCachedResponse(REQ)).toBeNull();
    expect(localStorage.getItem('other-key')).toBe('value');
  });
});

describe('промпты и ключи', () => {
  it('PROMPT_VERSION входит в ключ кэша', () => {
    expect(coachCacheKey(REQ)).toContain(PROMPT_VERSION);
  });

  it('ключ стабилен и различает запросы', () => {
    expect(coachCacheKey(REQ)).toBe(coachCacheKey({ ...REQ }));
    expect(coachCacheKey(REQ)).not.toBe(coachCacheKey({ ...REQ, lang: 'en' }));
    expect(coachCacheKey(REQ)).not.toBe(coachCacheKey({ ...REQ, san: 'Qxf7' }));
  });

  it('системный промпт требует JSON и язык ответа', () => {
    const ru = buildSystemPrompt('ru');
    expect(ru).toContain('JSON');
    expect(ru).toContain('русском');
    expect(buildSystemPrompt('en')).toContain('English');
  });

  it('пользовательский промпт содержит контекст по каждому действию', () => {
    const fen = 'rnbqkbnr/pppp w kq - 0 1';
    expect(buildUserPrompt({ action: 'hint', fen, lang: 'ru' })).toContain(fen);
    expect(buildUserPrompt({ action: 'explain', fen, san: 'Ke2', correctSan: 'Kd1', lang: 'ru' })).toContain('Ke2');
    expect(buildUserPrompt({ action: 'review', moves: ['e4', 'e5'], lang: 'ru' })).toContain('e4 e5');
  });
});
