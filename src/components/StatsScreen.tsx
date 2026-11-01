import { useMemo } from 'react';
import { CalendarDays, Flame, Swords, Target, Trophy, Zap, ArrowRight } from 'lucide-react';
import { useI18n } from '../contexts/I18nContext';
import { puzzles } from '../data/puzzles';
import type { UserProgress } from '../types';

interface StatsScreenProps {
  progress: UserProgress;
  onBack: () => void;
}

/** Ключ дня в формате activityLog (YYYY-MM-DD, UTC — как todayKey() в useProgress) */
const dateKeyOf = (d: Date) => d.toISOString().split('T')[0];

/** Уровень заливки клетки календаря: 0 — пусто, 1..3 — по числу задач */
function activityLevel(count: number): 0 | 1 | 2 | 3 {
  if (count <= 0) return 0;
  if (count <= 2) return 1;
  if (count <= 4) return 2;
  return 3;
}

const LEVEL_COLORS: Record<0 | 1 | 2 | 3, string> = {
  0: 'var(--bg-tertiary)',
  1: 'rgba(34, 197, 94, 0.35)',
  2: 'rgba(34, 197, 94, 0.65)',
  3: 'rgb(34, 197, 94)',
};

export function StatsScreen({ progress, onBack }: StatsScreenProps) {
  const { t } = useI18n();

  /** XP по темам: сумма XP решённых задач каждой темы */
  const themeStats = useMemo(() => {
    const byTheme = new Map<string, { xp: number; solved: number }>();
    for (const p of puzzles) {
      if (!progress.completedPuzzles.includes(p.id)) continue;
      const cur = byTheme.get(p.theme) ?? { xp: 0, solved: 0 };
      cur.xp += p.xp;
      cur.solved += 1;
      byTheme.set(p.theme, cur);
    }
    return [...byTheme.entries()]
      .map(([theme, s]) => ({ theme, ...s }))
      .sort((a, b) => b.xp - a.xp);
  }, [progress.completedPuzzles]);

  const maxXp = themeStats.length ? themeStats[0].xp : 0;

  /** Сетка 8 недель × 7 дней: колонки — недели (старые слева), от понедельника до воскресенья */
  const weeks = useMemo(() => {
    const today = new Date();
    const utcToday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    // понедельник текущей недели
    const dayNum = (utcToday.getUTCDay() + 6) % 7;
    const monday = new Date(utcToday);
    monday.setUTCDate(monday.getUTCDate() - dayNum);
    const cols: { key: string; count: number; future: boolean }[][] = [];
    for (let w = 7; w >= 0; w--) {
      const col: { key: string; count: number; future: boolean }[] = [];
      for (let d = 0; d < 7; d++) {
        const day = new Date(monday);
        day.setUTCDate(monday.getUTCDate() - w * 7 + d);
        const key = dateKeyOf(day);
        col.push({ key, count: progress.activityLog[key] ?? 0, future: day > utcToday });
      }
      cols.push(col);
    }
    return cols;
  }, [progress.activityLog]);

  const activeDays = useMemo(
    () => Object.values(progress.activityLog).filter((n) => n > 0).length,
    [progress.activityLog]
  );

  /** Счёт партий из gameHistory: против ИИ — победы/поражения игрока, hotseat — победы сторон */
  const games = useMemo(() => {
    const ai = { w: 0, l: 0, d: 0 };
    const hs = { w: 0, b: 0, d: 0 };
    for (const rec of progress.gameHistory) {
      if (rec.mode === 'ai') {
        if (rec.result === 'draw') ai.d += 1;
        else if (rec.result === rec.color) ai.w += 1;
        else ai.l += 1;
      } else if (rec.result === 'draw') hs.d += 1;
      else if (rec.result === 'w') hs.w += 1;
      else hs.b += 1;
    }
    return { ai, hs };
  }, [progress.gameHistory]);

  const hasActivity = activeDays > 0;

  const summaryCard = (icon: React.ReactNode, value: string | number, label: string) => (
    <div className="glass-card p-3 flex flex-col items-center gap-0.5">
      <span className="text-gold" aria-hidden="true">{icon}</span>
      <span className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>{value}</span>
      <span className="text-[11px] text-center text-muted">{label}</span>
    </div>
  );

  return (
    <div className="w-full max-w-md mx-auto px-4 py-8 animate-fade-in">
      <button onClick={onBack} className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
        {t('back')}
      </button>
      <h2 className="display-title mb-6 text-center" style={{ color: 'var(--text-primary)' }}>
        {t('statsTitle')}
      </h2>

      {/* Сводка: уровень / XP / Эло / стрик */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {summaryCard(<Trophy size={16} strokeWidth={2.2} />, progress.level, t('level'))}
        {summaryCard(<Zap size={16} strokeWidth={2.2} />, progress.xp, t('xp'))}
        {summaryCard(<Swords size={16} strokeWidth={2.2} />, progress.puzzleElo, t('elo'))}
        {summaryCard(<Flame size={16} strokeWidth={2.2} />, progress.streak, t('streakDays'))}
      </div>

      {/* XP по темам */}
      <div className="glass-card p-5 mb-4">
        <h3 className="text-sm font-bold mb-4 uppercase tracking-wide text-muted">
          <Target size={14} strokeWidth={2.4} className="inline mr-1.5 -mt-0.5" aria-hidden="true" />
          {t('statsXpByTheme')}
        </h3>
        {themeStats.length === 0 ? (
          <p className="text-sm text-center py-2" style={{ color: 'var(--text-muted)' }}>
            {t('statsEmptyThemes')}
          </p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {themeStats.map((s) => (
              <div key={s.theme}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-ink">{s.theme}</span>
                  <span className="text-muted">
                    {s.solved} {t('puzzles')} · <b className="text-gold-accent">{s.xp} {t('xp')}</b>
                  </span>
                </div>
                <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${Math.round((s.xp / maxXp) * 100)}%`, background: 'linear-gradient(90deg, #d4a017, #f59e0b, #f97316)' }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Календарь активности: 8 недель, 7×8 */}
      <div className="glass-card p-5 mb-4">
        <h3 className="text-sm font-bold mb-1 uppercase tracking-wide text-muted">
          <CalendarDays size={14} strokeWidth={2.4} className="inline mr-1.5 -mt-0.5" aria-hidden="true" />
          {t('statsCalendar')}
        </h3>
        <p className="text-caption text-muted mb-4">
          {hasActivity
            ? `${t('statsActiveDays')}: ${activeDays}`
            : t('statsEmptyCalendar')}
        </p>
        <div className="flex gap-1 justify-between" dir="ltr">
          {weeks.map((col, wi) => (
            <div key={wi} className="flex flex-col gap-1 flex-1">
              {col.map((day) => (
                <div
                  key={day.key}
                  title={`${day.key}: ${day.count}`}
                  className="aspect-square rounded-[3px]"
                  style={{
                    background: day.future ? 'transparent' : LEVEL_COLORS[activityLevel(day.count)],
                    opacity: day.future ? 0 : 1,
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Рекорды */}
      <div className="glass-card p-5 mb-4">
        <h3 className="text-sm font-bold mb-4 uppercase tracking-wide text-muted">
          <Trophy size={14} strokeWidth={2.4} className="inline mr-1.5 -mt-0.5" aria-hidden="true" />
          {t('statsRecords')}
        </h3>
        {!progress.survivalBest && !progress.sprintBest ? (
          <p className="text-sm text-center py-2" style={{ color: 'var(--text-muted)' }}>
            {t('statsEmptyRecords')}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {progress.survivalBest && (
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--bg-tertiary)' }}>
                <Zap size={18} strokeWidth={2.4} className="text-gold shrink-0" aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-ink">{t('survival')}</p>
                  <p className="text-caption text-muted">
                    {t('survivalResult')
                      .replace('{xp}', String(progress.survivalBest.xp))
                      .replace('{combo}', String(progress.survivalBest.combo))}
                  </p>
                </div>
                <span className="text-caption text-muted shrink-0">{progress.survivalBest.date}</span>
              </div>
            )}
            {progress.sprintBest && (
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--bg-tertiary)' }}>
                <Target size={18} strokeWidth={2.4} className="text-gold shrink-0" aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-ink">{t('sprintTitle')}</p>
                  <p className="text-caption text-muted">
                    {t('sprintResult').replace('{n}', String(progress.sprintBest.score))}
                  </p>
                </div>
                <span className="text-caption text-muted shrink-0">{progress.sprintBest.date}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Счёт партий: против ИИ и hotseat */}
      <div className="glass-card p-5 mb-4">
        <h3 className="text-sm font-bold mb-4 uppercase tracking-wide text-muted">
          <Swords size={14} strokeWidth={2.4} className="inline mr-1.5 -mt-0.5" aria-hidden="true" />
          {t('statsGames')}
        </h3>
        {progress.gameHistory.length === 0 ? (
          <p className="text-sm text-center py-2" style={{ color: 'var(--text-muted)' }}>
            {t('noGames')}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--bg-tertiary)' }}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-ink">{t('playVsAi')}</p>
                <p className="text-caption text-muted">
                  {t('statsWins')}: {games.ai.w} · {t('statsLosses')}: {games.ai.l} · {t('statsDraws')}: {games.ai.d}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--bg-tertiary)' }}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-ink">{t('playHotseat')}</p>
                <p className="text-caption text-muted">
                  {t('playWhite')}: {games.hs.w} · {t('playBlack')}: {games.hs.b} · {t('statsDraws')}: {games.hs.d}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <button onClick={onBack} className="btn btn-primary w-full py-3.5">
        {t('profile')}
        <ArrowRight size={18} strokeWidth={2.4} aria-hidden="true" />
      </button>
    </div>
  );
}
