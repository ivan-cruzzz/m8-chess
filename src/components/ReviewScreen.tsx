import { useMemo, useState } from 'react';
import { Repeat, Sparkles, X, Check, ArrowRight, NotebookPen } from 'lucide-react';
import { useI18n } from '../contexts/I18nContext';
import { getPuzzleById } from '../data/puzzles';
import { ChessPuzzle } from './ChessPuzzle';
import { CoachTip } from './CoachTip';
import { StaticBoard } from './StaticBoard';
import type { UserProgress, MistakeEntry } from '../types';
import type { SolvedMeta } from '../hooks/useProgress';

interface ReviewScreenProps {
  progress: UserProgress;
  onSolved: (meta: SolvedMeta) => void;
  onMistakeSolved: (puzzleId: string, fen: string) => void;
}

export function ReviewScreen({ progress, onSolved, onMistakeSolved }: ReviewScreenProps) {
  const { t } = useI18n();
  const [reviewing, setReviewing] = useState(false);
  const [queue, setQueue] = useState<MistakeEntry[]>([]);
  const [idx, setIdx] = useState(0);

  // Статистика слабых тем
  const themeStats = useMemo(() => {
    const byTheme = new Map<string, number>();
    for (const m of progress.mistakes) {
      byTheme.set(m.theme, (byTheme.get(m.theme) ?? 0) + 1);
    }
    return [...byTheme.entries()].sort((a, b) => b[1] - a[1]);
  }, [progress.mistakes]);

  const startReview = () => {
    // Последние 15 ошибок; каждая позиция уникальна по puzzleId
    const seen = new Set<string>();
    const uniq: MistakeEntry[] = [];
    for (const m of progress.mistakes) {
      if (seen.has(m.puzzleId)) continue;
      seen.add(m.puzzleId);
      uniq.push(m);
    }
    setQueue(uniq.slice(0, 15));
    setIdx(0);
    setReviewing(true);
  };

  const currentEntry = queue[idx];
  const currentPuzzle = currentEntry ? getPuzzleById(currentEntry.puzzleId) : undefined;

  if (reviewing && currentEntry && currentPuzzle) {
    return (
      <div className="w-full max-w-md mx-auto animate-fade-in">
        <div className="w-full max-w-lg mx-auto px-4 pt-4 flex items-center justify-between">
          <button onClick={() => setReviewing(false)} className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {t('exitPractice')} ×
          </button>
          <span className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>
            {idx + 1} / {queue.length}
          </span>
        </div>
        <ChessPuzzle
          key={currentPuzzle.id + '-review-' + idx}
          puzzle={currentPuzzle}
          onComplete={(_xp, meta) => {
            onSolved({ xp: 0, rating: currentPuzzle.rating, mistakes: meta?.mistakes ?? 0, hintUsed: meta?.hintUsed ?? false, source: 'review' });
            onMistakeSolved(currentEntry.puzzleId, currentEntry.fen);
            setIdx((i) => i + 1);
          }}
          onSkip={() => setIdx((i) => i + 1)}
        />
      </div>
    );
  }

  if (reviewing) {
    // очередь кончилась
    return (
      <div className="w-full max-w-md mx-auto px-4 py-16 text-center animate-bounce-in">
        <div className="text-5xl mb-4 animate-float" aria-hidden="true">✅</div>
        <p className="mb-6 font-bold" style={{ color: 'var(--text-primary)' }}>{t('noMistakes')}</p>
        <button onClick={() => setReviewing(false)} className="py-3 px-6 rounded-xl font-bold" style={{ background: 'var(--text-primary)', color: 'var(--bg-primary)' }}>
          {t('back')}
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto px-4 py-8 animate-fade-in">
      <h2 className="display-title text-center mb-1 text-ink flex items-center justify-center gap-2">
        <NotebookPen size={24} strokeWidth={2.2} className="text-muted" aria-hidden="true" />
        {t('mistakesTitle')}
      </h2>
      <p className="text-caption text-center mb-8 text-muted">
        {progress.mistakes.length} {t('mistakesCount')}
      </p>

      {progress.mistakes.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <div className="text-gold mb-3 flex justify-center" aria-hidden="true">
            <Sparkles size={32} strokeWidth={2} />
          </div>
          <p className="text-sm font-semibold text-ink">{t('noMistakes')}</p>
        </div>
      ) : (
        <>
          <button
            onClick={startReview}
            className="w-full glass-card p-5 mb-6 flex items-center gap-4 text-left transition-transform active:scale-[0.98]"
          >
            <span className="text-gold shrink-0" aria-hidden="true">
              <Repeat size={26} strokeWidth={2.2} />
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-ink">{t('reviewAgain')}</p>
              <p className="text-caption text-muted">{Math.min(progress.mistakes.length, 15)} →</p>
            </div>
            <ArrowRight size={20} strokeWidth={2.4} className="text-gold shrink-0" aria-hidden="true" />
          </button>

          {/* Слабые темы */}
          {themeStats.length > 0 && (
            <div className="glass-card p-5 mb-6">
              <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>
                {t('weakThemes')}
              </p>
              <div className="flex flex-col gap-2">
                {themeStats.slice(0, 5).map(([themeName, count]) => (
                  <div key={themeName} className="flex items-center gap-3">
                    <span className="text-xs w-28 truncate shrink-0" style={{ color: 'var(--text-secondary)' }}>{themeName}</span>
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min((count / Math.max(1, themeStats[0][1])) * 100, 100)}%`,
                          background: 'linear-gradient(90deg, #ef4444, #f97316)',
                        }}
                      />
                    </div>
                    <span className="text-[10px] font-bold shrink-0" style={{ color: 'var(--text-muted)' }}>{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Список ошибок */}
          <div className="flex flex-col gap-2">
            {progress.mistakes.slice(0, 20).map((m, i) => (
              <div key={`${m.puzzleId}-${m.playedSan}-${i}`} className="glass-card p-3 flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 shrink-0">
                    <StaticBoard fen={m.fen} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs truncate font-semibold text-ink">{m.theme}</p>
                    <p className="text-xs flex items-center gap-1 text-danger">
                      <X size={12} strokeWidth={3} aria-hidden="true" />
                      {t('yourMoveWas')}: {m.playedSan}
                    </p>
                    <p className="text-xs flex items-center gap-1 text-success truncate">
                      <Check size={12} strokeWidth={3} aria-hidden="true" />
                      {t('correctMoveWas')}: {m.correctSan}
                    </p>
                  </div>
                </div>
                <CoachTip
                  buildRequest={(lang) => ({
                    action: 'explain',
                    fen: m.fen,
                    san: m.playedSan,
                    correctSan: m.correctSan,
                    puzzleId: m.puzzleId,
                    lang,
                  })}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
