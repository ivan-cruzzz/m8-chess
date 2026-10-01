import { useMemo, useState } from 'react';
import { Target, CheckCircle2, Gift, ArrowRight, Puzzle } from 'lucide-react';
import { useI18n } from '../contexts/I18nContext';
import { puzzles, getPuzzleById } from '../data/puzzles';
import { ChessPuzzle } from './ChessPuzzle';
import type { UserProgress } from '../types';
import type { SolvedMeta } from '../hooks/useProgress';

interface DailyScreenProps {
  progress: UserProgress;
  onPuzzleSolved: (meta: SolvedMeta) => void;
  onPractice?: () => void;
}

/** Детерминированный хеш */
const hashStr = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

/** Пазл дня: стабилен в пределах даты, не повторяет последние N дней */
function dailyPuzzleFor(dateKey: string, completedIds: string[]): string | undefined {
  const recent = new Set(completedIds.slice(-30));
  const candidates = puzzles.filter((p) => !recent.has(p.id));
  const pool = candidates.length > 0 ? candidates : puzzles;
  return pool[hashStr('daily' + dateKey) % pool.length].id;
}

export function DailyScreen({ progress, onPuzzleSolved, onPractice }: DailyScreenProps) {
  const { t } = useI18n();
  const [solving, setSolving] = useState(false);
  const dateKey = progress.daily.dateKey || new Date().toISOString().split('T')[0];

  const dailyPuzzleId = useMemo(() => dailyPuzzleFor(dateKey, progress.completedPuzzles), [dateKey]);
  const dailyPuzzle = dailyPuzzleId ? getPuzzleById(dailyPuzzleId) : undefined;

  const missionText = (id: string, goal: number): string => {
    if (id === 'nohint2') return t('missionNoHint').replace('{n}', String(goal));
    if (id === 'perfect2' || id === 'perfect3') return t('missionPerfect').replace('{n}', String(goal));
    if (id === 'xp100') return t('missionXp').replace('{n}', String(goal));
    return t('missionSolve').replace('{n}', String(goal));
  };

  if (solving && dailyPuzzle) {
    return (
      <div className="w-full max-w-md mx-auto animate-fade-in">
        <ChessPuzzle
          key={dailyPuzzle.id}
          puzzle={dailyPuzzle}
          onComplete={(xp, meta) => {
            onPuzzleSolved({
              xp,
              rating: dailyPuzzle.rating,
              mistakes: meta?.mistakes ?? 0,
              hintUsed: meta?.hintUsed ?? false,
              source: 'daily',
            });
            setSolving(false);
          }}
          onSkip={() => setSolving(false)}
        />
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto px-4 py-8 animate-fade-in">
      <h2 className="display-title text-center mb-1" style={{ color: 'var(--text-primary)' }}>
        {t('dailyMissions')}
      </h2>
      <p className="text-xs text-center mb-8" style={{ color: 'var(--text-muted)' }}>
        {new Date().toLocaleDateString()}
      </p>

      {/* Миссии */}
      <div className="flex flex-col gap-3 mb-8">
        {progress.daily.missions.map((m) => {
          const done = m.progress >= m.goal;
          const pct = Math.min((m.progress / m.goal) * 100, 100);
          return (
            <div key={m.id} className="glass-card p-4 flex items-center gap-3">
              <span className={`shrink-0 ${done ? 'text-success' : 'text-gold'}`} aria-hidden="true">
                {done ? <CheckCircle2 size={22} strokeWidth={2.2} /> : <Target size={22} strokeWidth={2.2} />}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline gap-2 mb-1.5">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                    {missionText(m.id, m.goal)}
                  </p>
                  <span className="text-[10px] font-bold shrink-0" style={{ color: done ? '#22c55e' : 'var(--text-muted)' }}>
                    {Math.min(m.progress, m.goal)}/{m.goal}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: done ? '#22c55e' : 'linear-gradient(90deg, #d4a017, #f97316)' }}
                  />
                </div>
              </div>
              {done && <span className="text-xs font-bold shrink-0" style={{ color: 'var(--color-gold)' }}>+{m.bonusXp}</span>}
            </div>
          );
        })}
      </div>

      {/* Пазл дня */}
      <h3 className="text-sm font-bold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>
        {t('dailyPuzzle')}
      </h3>
      {progress.daily.dailyPuzzleDone ? (
        <div className="glass-card p-6 text-center">
          <div className="text-4xl mb-2" aria-hidden="true">✅</div>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t('dailyPuzzleDone')}</p>
        </div>
      ) : dailyPuzzle ? (
        <button
          onClick={() => setSolving(true)}
          className="w-full glass-card p-5 flex items-center gap-4 text-left transition-transform active:scale-[0.98]"
        >
          <span
            className="w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0 shadow-gold"
            style={{ background: 'linear-gradient(135deg, #d4a017, #f97316)' }}
            aria-hidden="true"
          >
            <Gift size={22} strokeWidth={2.2} />
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-ink">{dailyPuzzle.theme}</p>
            <p className="text-caption text-muted">
              {t('elo')}: {dailyPuzzle.rating} · +{dailyPuzzle.xp} XP
            </p>
          </div>
          <ArrowRight size={20} strokeWidth={2.4} className="text-gold shrink-0" aria-hidden="true" />
        </button>
      ) : null}

      {onPractice && (
        <button
          onClick={onPractice}
          className="w-full glass-card p-4 mt-6 flex items-center gap-3 text-left transition-transform active:scale-[0.98]"
        >
          <span className="text-muted shrink-0" aria-hidden="true">
            <Puzzle size={22} strokeWidth={2.2} />
          </span>
          <p className="flex-1 text-sm font-bold text-ink min-w-0 truncate">
            {t('practiceTitle')}
          </p>
          <ArrowRight size={18} strokeWidth={2.4} className="text-muted shrink-0" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
