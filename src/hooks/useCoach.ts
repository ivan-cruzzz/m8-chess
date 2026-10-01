import { useCallback, useState } from 'react';
import { askCoach } from '../ai/coach/coachService';
import type { CoachFailureReason, CoachRequest, CoachResponse } from '../ai/coach/types';

export type CoachStatus = 'idle' | 'loading' | 'done' | 'error';

export interface CoachState {
  status: CoachStatus;
  data: CoachResponse | null;
  reason: CoachFailureReason | null;
  cached: boolean;
}

/**
 * LLM-тренёр в компонентах: ask(request) ставит статус loading → done/error.
 * Кэш на стороне askCoach — повторные вопросы отвечают мгновенно и офлайн.
 */
export function useCoach() {
  const [state, setState] = useState<CoachState>({ status: 'idle', data: null, reason: null, cached: false });

  const ask = useCallback(async (request: CoachRequest) => {
    setState({ status: 'loading', data: null, reason: null, cached: false });
    const result = await askCoach(request);
    if (result.ok) {
      setState({ status: 'done', data: result.data, reason: null, cached: result.cached });
    } else {
      setState({ status: 'error', data: null, reason: result.reason, cached: false });
    }
    return result;
  }, []);

  const reset = useCallback(() => {
    setState({ status: 'idle', data: null, reason: null, cached: false });
  }, []);

  return { state, ask, reset };
}
