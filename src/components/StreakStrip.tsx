import { Flame, MoonStar } from 'lucide-react';
import { useI18n } from '../contexts/I18nContext';
import type { UserProgress } from '../types';

interface StreakStripProps {
  progress: UserProgress;
}

const dayMs = 24 * 60 * 60 * 1000;
const isoDay = (d: Date) => d.toISOString().split('T')[0];

/**
 * Недельная полоса серии (Пн–Вс): активные дни восстановлены из streak и lastPlayed
 * (последние N подряд идущих дней). Сегодняшний день — с кольцом.
 */
export function StreakStrip({ progress }: StreakStripProps) {
  const { lang } = useI18n();
  const weekLabels = lang === 'ru'
    ? ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
    : ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  const today = new Date();
  const todayIso = isoDay(today);

  // Дни серии: последние min(streak, 7) дней, заканчивая lastPlayed
  const activeDays = new Set<string>();
  if (progress.lastPlayed && progress.streak > 0) {
    const end = new Date(progress.lastPlayed + 'T00:00:00');
    for (let i = 0; i < Math.min(progress.streak, 7); i++) {
      activeDays.add(isoDay(new Date(end.getTime() - i * dayMs)));
    }
  }

  // Понедельник текущей недели
  const monday = new Date(today);
  const dow = (today.getDay() + 6) % 7; // 0 = Пн
  monday.setDate(today.getDate() - dow);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return {
      label: weekLabels[i],
      iso: isoDay(d),
      active: activeDays.has(isoDay(d)),
      isToday: isoDay(d) === todayIso,
      isFuture: d.getTime() > today.getTime() && isoDay(d) !== todayIso,
    };
  });

  return (
    <div className="glass-card p-4 flex items-center gap-4">
      <div className="flex flex-col items-center shrink-0">
        <span className="text-gold" aria-hidden="true">
          {progress.streak > 0 ? <Flame size={24} strokeWidth={2.2} /> : <MoonStar size={22} strokeWidth={2} />}
        </span>
        <span className="text-xl font-black leading-none mt-1 text-ink">
          {progress.streak}
        </span>
      </div>
      <div className="w-px self-stretch bg-line" />
      <div className="flex-1 flex justify-between">
        {days.map((d) => (
          <div key={d.iso} className="flex flex-col items-center gap-1">
            <span className="text-[10px] font-semibold text-muted">{d.label}</span>
            <span
              aria-hidden="true"
              className="w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300"
              style={{
                background: d.active ? 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)' : 'var(--bg-elevated)',
                boxShadow: d.active ? '0 4px 10px -3px rgba(245, 158, 11, 0.5)' : undefined,
                outline: d.isToday ? '2px solid var(--ink)' : undefined,
                outlineOffset: 2,
                opacity: d.isFuture ? 0.4 : 1,
                fontSize: 10,
                color: d.active ? '#fff' : 'var(--ink-muted)',
                fontWeight: 700,
              }}
            >
              {d.active ? '✓' : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
