import { useEffect, useState } from 'react';
import { NotebookPen, Sparkles, ArrowRight, Swords, BadgeCheck } from 'lucide-react';
import { useI18n } from '../contexts/I18nContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { UserProgress } from '../types';
import { StreakStrip } from './StreakStrip';
import { LeagueCard } from './LeagueCard';

interface ProfileProps {
  progress: UserProgress;
  onReset: () => void;
  onOpenReview?: () => void;
}

export function Profile({ progress, onReset, onOpenReview }: ProfileProps) {
  const { t } = useI18n();
  const { user } = useAuth();
  const [verified, setVerified] = useState(false);
  const xpInCurrentLevel = progress.xp - (progress.level - 1) * 100;

  // Верификация: роль admin из профиля в БД (галочка как в Telegram)
  useEffect(() => {
    setVerified(false);
    if (!supabase || !user) return;
    void (async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();
        setVerified(data?.role === 'admin');
      } catch {
        setVerified(false);
      }
    })();
  }, [user]);
  const progressPercent = Math.min((xpInCurrentLevel / 100) * 100, 100);

  const puzzlesCount = progress.completedPuzzles.length;

  const achievements = [
    { id: 'first-win', title: t('firstWin'), desc: t('firstWinDesc'), icon: '🥇', value: puzzlesCount, goal: 1 },
    { id: 'streak-3', title: t('streak3'), desc: t('streak3Desc'), icon: '🔥', value: progress.streak, goal: 3 },
    { id: 'streak-7', title: t('streak7'), desc: t('streak7Desc'), icon: '⚡', value: progress.streak, goal: 7 },
    { id: 'puzzle-10', title: t('puzzle10'), desc: t('puzzle10Desc'), icon: '♟', value: puzzlesCount, goal: 10 },
    { id: 'puzzle-50', title: t('puzzle50'), desc: t('puzzle50Desc'), icon: '♛', value: puzzlesCount, goal: 50 },
    { id: 'level-5', title: t('level5'), desc: t('level5Desc'), icon: '⭐', value: progress.level, goal: 5 },
  ];
  const unlockedCount = achievements.filter((a) => a.value >= a.goal).length;

  const statCard = (icon: string, value: string | number, label: string) => (
    <div className="glass-card p-4 flex flex-col items-center gap-1">
      <span className="text-xl" aria-hidden="true">{icon}</span>
      <span className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>{value}</span>
      <span className="text-[11px] text-center" style={{ color: 'var(--text-muted)' }}>{label}</span>
    </div>
  );

  return (
    <div className="w-full max-w-md mx-auto px-4 py-8 animate-fade-in">
      <h2 className="display-title mb-6 text-center" style={{ color: 'var(--text-primary)' }}>
        {t('profile')}
      </h2>

      {/* Hero */}
      <div className="glass-card p-6 mb-4">
        <div className="flex items-center gap-4 mb-5">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-3xl shrink-0"
            style={{
              background: 'linear-gradient(135deg, #1a1a1a 0%, #3a2d12 100%)',
              boxShadow: '0 8px 20px -8px rgba(0,0,0,0.5)',
            }}
            aria-hidden="true"
          >
            ♟
          </div>
          <div className="min-w-0">
            <p className="text-lg font-black truncate flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
              <span className="truncate">{user?.username ?? t('guest')}</span>
              {verified && (
                <span
                  title="Verified"
                  aria-label="Verified"
                  className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #2AABEE 0%, #229ED9 100%)' }}
                >
                  <BadgeCheck size={14} strokeWidth={2.6} className="text-white" aria-hidden="true" />
                </span>
              )}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {t('level')} {progress.level} · <span className="text-gold-accent font-bold">{progress.xp} {t('xp')}</span>
            </p>
            <p className="text-xs mt-0.5 flex items-center gap-1 text-muted">
              <Swords size={13} strokeWidth={2.2} aria-hidden="true" />
              {t('elo')}: <b className="text-ink">{progress.puzzleElo}</b>
            </p>
          </div>
        </div>

        {/* XP до следующего уровня */}
        <div className="flex justify-between text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>
          <span>{xpInCurrentLevel} / 100 {t('xp')}</span>
          <span>{t('level')} {progress.level + 1}</span>
        </div>
        <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${progressPercent}%`, background: 'linear-gradient(90deg, #d4a017, #f59e0b, #f97316)' }}
          />
        </div>
      </div>

      {/* Серия */}
      <div className="mb-4">
        <StreakStrip progress={progress} />
      </div>

      {/* Тетрадь ошибок — вход */}
      {onOpenReview && (
        <button
          onClick={onOpenReview}
          className="w-full glass-card p-4 mb-4 flex items-center gap-3 text-left transition-transform active:scale-[0.98]"
        >
          <span className="text-muted shrink-0" aria-hidden="true">
            {progress.mistakes.length > 0 ? <NotebookPen size={24} strokeWidth={2.2} /> : <Sparkles size={24} strokeWidth={2} />}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-ink">{t('mistakesTitle')}</p>
            <p className="text-caption text-muted">
              {progress.mistakes.length} {t('mistakesCount')}
            </p>
          </div>
          <ArrowRight size={18} strokeWidth={2.4} className="text-gold shrink-0" aria-hidden="true" />
        </button>
      )}

      {/* Лига */}
      <div className="mb-4">
        <LeagueCard progress={progress} />
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {statCard('🧩', puzzlesCount, t('puzzlesSolved'))}
        {statCard('📚', progress.completedLessons.length, t('lessonsCompleted'))}
        {statCard('🔥', progress.streak, t('streakDays'))}
        {statCard('🏆', `${unlockedCount}/${achievements.length}`, t('achievements'))}
      </div>

      {/* Достижения с прогрессом */}
      <div className="glass-card p-5 mb-6">
        <h3 className="text-sm font-bold mb-4 uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
          {t('achievements')} · {unlockedCount}/{achievements.length}
        </h3>
        <div className="flex flex-col gap-3">
          {achievements.map((ach) => {
            const done = ach.value >= ach.goal;
            const pct = Math.min((ach.value / ach.goal) * 100, 100);
            return (
              <div
                key={ach.id}
                className="flex items-center gap-3 p-3 rounded-xl transition-all"
                style={{
                  background: done ? 'rgba(245,158,11,0.08)' : 'var(--bg-tertiary)',
                  opacity: done ? 1 : 0.75,
                }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-base shrink-0"
                  style={{
                    background: done ? 'linear-gradient(135deg, #d4a017, #f97316)' : 'var(--bg-secondary)',
                    boxShadow: done ? '0 4px 10px -3px rgba(245,158,11,0.5)' : undefined,
                  }}
                  aria-hidden="true"
                >
                  {ach.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-bold truncate" style={{ color: done ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {ach.title}
                    </p>
                    <span className="text-[10px] font-semibold shrink-0" style={{ color: 'var(--text-muted)' }}>
                      {Math.min(ach.value, ach.goal)}/{ach.goal}
                    </span>
                  </div>
                  <p className="text-[11px] mb-1.5" style={{ color: 'var(--text-muted)' }}>{ach.desc}</p>
                  <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${pct}%`,
                        background: done ? 'linear-gradient(90deg, #d4a017, #f97316)' : 'var(--text-muted)',
                        opacity: done ? 1 : 0.4,
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Сброс */}
      <button
        onClick={onReset}
        className="w-full py-3 text-xs transition-colors hover:opacity-70"
        style={{ color: 'var(--text-muted)' }}
      >
        {t('resetProgress')}
      </button>
    </div>
  );
}
