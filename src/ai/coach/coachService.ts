import { supabase } from '../../lib/supabase';
import { getCachedResponse, putCachedResponse } from './cache';
import type { CoachRequest, CoachResult } from './types';

/**
 * Клиент LLM-тренёра. Сначала кэш (офлайн, бесплатно, без квоты),
 * затем Edge Function `ai-coach` (ключ провайдера хранится в Supabase Secrets).
 */

/** Можно ли пользоваться тренером: Supabase подключён. */
export const isCoachAvailable = (): boolean => supabase !== null;

export async function askCoach(req: CoachRequest): Promise<CoachResult> {
  const cached = getCachedResponse(req);
  if (cached) return { ok: true, data: cached, cached: true };

  if (!supabase) return { ok: false, reason: 'offline' };

  try {
    const { data, error } = await supabase.functions.invoke('ai-coach', { body: req });
    if (error || !data || data.error) {
      const reason = data?.error;
      if (reason === 'unauthorized' || reason === 'quota_exceeded' || reason === 'not_configured') {
        return { ok: false, reason };
      }
      return { ok: false, reason: 'error' };
    }
    const response = data.response;
    if (typeof response?.title !== 'string' || typeof response?.text !== 'string') {
      return { ok: false, reason: 'error' };
    }
    if (!data.cached) putCachedResponse(req, response);
    return { ok: true, data: response, cached: Boolean(data.cached) };
  } catch {
    // Сетевая ошибка invoke бросает исключение — трактуем как общую
    return { ok: false, reason: 'error' };
  }
}
