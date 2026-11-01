import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '../../contexts/I18nContext';
import { aggregateDashboard, listSupabaseUsers } from '../../admin/store';
import { fill } from '../../admin/fill';

/** Вкладка Дашборда: KPI, график активности 14 дней (CSS-бары), проблемные темы, решаемость */
export function DashboardTab() {
  const { t } = useI18n();
  const data = useMemo(() => aggregateDashboard(), []);
  // null — Supabase выключен или недоступен: облачный счётчик просто не показывается
  const [sbCount, setSbCount] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    listSupabaseUsers().then((rows) => {
      if (alive) setSbCount(rows ? rows.length : null);
    });
    return () => {
      alive = false;
    };
  }, []);

  const maxActivity = Math.max(1, ...data.activity14.map((a) => a.count));

  const kpis = [
    { label: t('adminKpiUsers'), value: data.userCount },
    { label: t('adminKpiActive7d'), value: data.active7d },
    { label: t('adminKpiXp'), value: data.totalXp },
    { label: t('adminKpiSolved'), value: data.totalSolved },
    { label: t('adminKpiPremium'), value: data.premiumCount },
  ];

  return (
    <div className="space-y-5">
      {data.userCount === 0 && (
        <p className="glass-card p-4 text-sm text-muted text-center">{t('adminEmptyDashboard')}</p>
      )}

      {/* KPI-плитки */}
      <div className="grid grid-cols-2 gap-2">
        {kpis.map((k) => (
          <div key={k.label} className="glass-card p-3">
            <p className="text-caption text-muted">{k.label}</p>
            <p className="text-2xl font-black text-ink">{k.value}</p>
          </div>
        ))}
        {sbCount !== null && (
          <div className="glass-card p-3">
            <p className="text-caption text-muted">{fill(t('adminSupabaseUsersN'), { n: sbCount })}</p>
          </div>
        )}
      </div>

      {/* График активности: 14 CSS-баров, без библиотек */}
      <div className="glass-card p-4">
        <p className="text-sm font-bold text-ink mb-3">{t('adminActivity14')}</p>
        {data.userCount === 0 ? (
          <p className="text-caption text-muted">{t('adminEmptyDashboard')}</p>
        ) : (
          <div className="flex items-end gap-1 h-24" role="img" aria-label={t('adminActivity14')}>
            {data.activity14.map((a) => (
              <div key={a.date} className="flex-1 flex flex-col items-center gap-1" title={`${a.date}: ${a.count}`}>
                <div
                  className="w-full rounded-t"
                  style={{
                    height: `${Math.max(4, (a.count / maxActivity) * 80)}px`,
                    background: a.count > 0 ? 'linear-gradient(180deg, #f59e0b, #f97316)' : 'var(--line)',
                  }}
                />
                <span className="text-[8px] text-muted leading-none">{a.date.slice(8)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Проблемные темы: по убыванию ошибок */}
      <div className="glass-card p-4">
        <p className="text-sm font-bold text-ink mb-3">{t('adminWeakThemesTitle')}</p>
        {data.weakThemes.length === 0 ? (
          <p className="text-caption text-muted">{t('adminNoWeakThemes')}</p>
        ) : (
          <ul className="space-y-2">
            {data.weakThemes.map((w) => (
              <li key={w.theme} className="flex items-center justify-between text-sm">
                <span className="text-ink">{w.theme}</span>
                <span className="text-caption text-muted">{fill(t('adminMistakesN'), { n: w.count })}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Самые сложные: наименее решённые */}
      {data.hardestPuzzles.length > 0 && (
        <div className="glass-card p-4">
          <p className="text-sm font-bold text-ink mb-3">{t('adminHardestTitle')}</p>
          <ul className="space-y-2">
            {data.hardestPuzzles.map((p) => (
              <li key={p.id} className="flex items-center justify-between text-sm gap-2">
                <span className="text-ink truncate">{p.id}</span>
                <span className="text-caption text-muted shrink-0">
                  {p.theme ? `${p.theme} · ` : ''}
                  {fill(t('adminSolvedBy'), { n: p.solvedBy })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
