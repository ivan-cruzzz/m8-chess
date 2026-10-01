import { coachCacheKey } from './prompts';
import type { CoachRequest, CoachResponse } from './types';

/**
 * Клиентский кэш тренера: повторные подсказки к той же позиции бесплатны
 * и работают офлайн. Ключ повторяет серверный (см. coachCacheKey) — попадания
 * в кэш не расходуют дневную квоту. TTL 30 дней, лимит 100 записей
 * с вытеснением самых старых.
 */

const PREFIX = 'coach:';
const TTL_MS = 30 * 24 * 3600 * 1000;
const MAX_ENTRIES = 100;

interface CacheRecord {
  v: 1;
  data: CoachResponse;
  ts: number;
}

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    // localStorage может быть недоступен (приватный режим)
    return null;
  }
}

export function getCachedResponse(req: CoachRequest): CoachResponse | null {
  const s = storage();
  if (!s) return null;
  const raw = s.getItem(PREFIX + coachCacheKey(req));
  if (!raw) return null;
  try {
    const rec = JSON.parse(raw) as CacheRecord;
    if (rec.v !== 1 || typeof rec.ts !== 'number') return null;
    if (Date.now() - rec.ts > TTL_MS) return null;
    if (!rec.data || typeof rec.data.title !== 'string' || typeof rec.data.text !== 'string') return null;
    return rec.data;
  } catch {
    return null;
  }
}

export function putCachedResponse(req: CoachRequest, data: CoachResponse): void {
  const s = storage();
  if (!s) return;
  try {
    s.setItem(PREFIX + coachCacheKey(req), JSON.stringify({ v: 1, data, ts: Date.now() } satisfies CacheRecord));
    evictIfNeeded(s);
  } catch {
    // Переполнение квоты localStorage — молча живём без кэша
  }
}

export function clearCoachCache(): void {
  const s = storage();
  if (!s) return;
  for (let i = s.length - 1; i >= 0; i--) {
    const key = s.key(i);
    if (key?.startsWith(PREFIX)) s.removeItem(key);
  }
}

function evictIfNeeded(s: Storage): void {
  const coachKeys: { key: string; ts: number }[] = [];
  for (let i = 0; i < s.length; i++) {
    const key = s.key(i);
    if (!key || !key.startsWith(PREFIX)) continue;
    try {
      const rec = JSON.parse(s.getItem(key) ?? '') as CacheRecord;
      coachKeys.push({ key, ts: rec.ts ?? 0 });
    } catch {
      coachKeys.push({ key, ts: 0 });
    }
  }
  if (coachKeys.length <= MAX_ENTRIES) return;
  coachKeys.sort((a, b) => a.ts - b.ts);
  for (const { key } of coachKeys.slice(0, coachKeys.length - MAX_ENTRIES)) {
    s.removeItem(key);
  }
}
