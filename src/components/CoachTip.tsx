import { Sparkles, X, Loader2 } from 'lucide-react';
import { useI18n, type Lang } from '../contexts/I18nContext';
import { useCoach } from '../hooks/useCoach';
import { isCoachAvailable } from '../ai/coach/coachService';
import type { CoachRequest } from '../ai/coach/types';

interface CoachTipProps {
  /** Запрос собирается в момент нажатия — всегда актуальная позиция. */
  buildRequest: (lang: Lang) => CoachRequest;
}

/**
 * Переиспользуемая точка входа к LLM-тренеру: кнопка → карточка с объяснением.
 * Кэшированные ответы приходят мгновенно; офлайн-приложение (без Supabase)
 * кнопку не показывает.
 */
export function CoachTip({ buildRequest }: CoachTipProps) {
  const { t, lang } = useI18n();
  const { state, ask, reset } = useCoach();

  if (!isCoachAvailable()) return null;

  if (state.status === 'done' && state.data) {
    return (
      <div
        className="w-full py-3 px-4 rounded-xl text-sm animate-fade-in border"
        style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)' }}
        role="status"
      >
        <div className="flex items-start justify-between gap-2">
          <p className="font-bold text-left" style={{ color: 'var(--text-primary)' }}>
            <Sparkles size={14} className="inline mr-1 -mt-0.5" aria-hidden="true" />
            {state.data.title}
          </p>
          <button onClick={reset} aria-label={t('coachClose')} className="shrink-0 transition-colors" style={{ color: 'var(--text-muted)' }}>
            <X size={16} aria-hidden="true" />
          </button>
        </div>
        <p className="mt-1 text-left leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {state.data.text}
        </p>
        {state.cached && (
          <p className="mt-1 text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            {t('coachCached')}
          </p>
        )}
      </div>
    );
  }

  const failureText =
    state.reason === 'quota_exceeded'
      ? t('coachQuota')
      : state.reason === 'offline'
        ? t('coachOffline')
        : t('coachError');

  return (
    <div className="w-full flex flex-col gap-2">
      {state.status === 'error' && (
        <p className="text-xs text-left px-1" style={{ color: 'var(--color-danger, #dc2626)' }}>
          {failureText}
        </p>
      )}
      <button
        onClick={() => ask(buildRequest(lang))}
        disabled={state.status === 'loading'}
        className="btn w-full py-3 px-4 text-sm font-medium border-2 border-line text-ink-secondary bg-card disabled:opacity-60"
      >
        {state.status === 'loading' ? (
          <Loader2 size={16} className="animate-spin" aria-hidden="true" />
        ) : (
          <Sparkles size={16} strokeWidth={2.2} aria-hidden="true" />
        )}
        {state.status === 'loading' ? t('coachThinking') : t('coachAsk')}
      </button>
    </div>
  );
}
