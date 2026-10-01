import { useMemo } from 'react';
import { useI18n } from '../contexts/I18nContext';
import { leagueBots } from '../hooks/useProgress';
import type { UserProgress } from '../types';

interface LeagueCardProps {
  progress: UserProgress;
}

export function LeagueCard({ progress }: LeagueCardProps) {
  const { t } = useI18n();

  const table = useMemo(() => {
    const bots = leagueBots(progress.weekly.weekKey || 'w0');
    const dayOfWeek = new Date().getUTCDay() || 7; // 1..7
    const rows = bots.map((b) => ({ name: b.name, xp: Math.round(b.pace * dayOfWeek), me: false }));
    rows.push({ name: t('leagueYou'), xp: progress.weekly.xp, me: true });
    return rows.sort((a, b) => b.xp - a.xp);
  }, [progress.weekly.weekKey, progress.weekly.xp, t]);

  const myPlace = table.findIndex((r) => r.me) + 1;
  const divName = progress.leagueDiv === 1 ? t('leagueDiv1') : progress.leagueDiv === 2 ? t('leagueDiv2') : t('leagueDiv3');
  const divIcon = progress.leagueDiv === 1 ? '🥇' : progress.leagueDiv === 2 ? '🥈' : '🥉';

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
            {divIcon} {t('leagueTitle')}
          </p>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{t('leaguePromo')}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>#{myPlace}</p>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{divName}</p>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        {table.map((row, i) => (
          <div
            key={row.name + i}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm"
            style={{
              background: row.me ? 'rgba(245,158,11,0.12)' : 'transparent',
              fontWeight: row.me ? 800 : 500,
              color: row.me ? 'var(--text-primary)' : 'var(--text-secondary)',
            }}
          >
            <span className="w-6 text-xs text-right shrink-0" style={{ color: i < 3 ? '#22c55e' : i >= 7 ? 'var(--color-danger)' : 'var(--text-muted)' }}>
              {i + 1}
            </span>
            <span className="flex-1 truncate">{row.me ? `${row.name} 👑` : row.name}</span>
            <span className="text-xs font-bold shrink-0" style={{ color: row.me ? 'var(--color-gold)' : 'var(--text-muted)' }}>
              {row.xp} XP
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
