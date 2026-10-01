import { Check, Lock, Crown, Flame } from 'lucide-react';
import { useI18n } from '../contexts/I18nContext';
import { lessons, FREE_LESSON_COUNT } from '../data/lessons';
import type { UserProgress } from '../types';
import { StreakStrip } from './StreakStrip';

interface LessonMapProps {
  progress: UserProgress;
  onSelectLesson: (lessonId: string) => void;
  isPremium: boolean;
  onPremiumClick: () => void;
}

export function LessonMap({ progress, onSelectLesson, isPremium, onPremiumClick }: LessonMapProps) {
  const { t } = useI18n();

  /** Урок закрыт подпиской (доступен только Premium) */
  const isPremiumLocked = (index: number): boolean =>
    !isPremium && index >= FREE_LESSON_COUNT;

  const isLessonUnlocked = (index: number): boolean => {
    if (isPremiumLocked(index)) return false;
    // Premium открывает все уроки сразу
    if (isPremium) return true;
    if (index === 0) return true;
    const prevLesson = lessons[index - 1];
    return progress.completedLessons.includes(prevLesson.id);
  };

  const getLessonStatus = (lessonId: string, index: number): 'completed' | 'current' | 'locked' | 'premium' => {
    if (progress.completedLessons.includes(lessonId)) return 'completed';
    if (isPremiumLocked(index)) return 'premium';
    if (isLessonUnlocked(index)) return 'current';
    return 'locked';
  };

  return (
    <div className="w-full max-w-md mx-auto px-4 py-8">
      {/* Заголовок */}
      <div className="text-center mb-6">
        <div
          className="w-14 h-14 mx-auto mb-3 rounded-2xl flex items-center justify-center bg-ink text-bg shadow-medium animate-pulse-ring"
          aria-hidden="true"
        >
          <Flame size={26} strokeWidth={2.2} />
        </div>
        <h2 className="display-title mb-1 text-ink">{t('lessonMap')}</h2>
        <p className="text-sm text-muted">{t('lessonMapDesc')}</p>
      </div>

      {/* Серия */}
      <div className="mb-8">
        <StreakStrip progress={progress} />
      </div>

      <div className="relative">
        {/* Соединительная линия */}
        <svg
          className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2 w-4 h-full pointer-events-none"
          style={{ zIndex: 0 }}
        >
          <line x1="8" y1="32" x2="8" y2="100%" stroke="var(--line)" strokeWidth="4" strokeLinecap="round" />
          {lessons.map((_lesson, index) => {
            if (index === 0) return null;
            const prevStatus = getLessonStatus(lessons[index - 1].id, index - 1);
            if (prevStatus !== 'completed') return null;
            const y1 = index * 80 - 16;
            const y2 = y1 + 80;
            return (
              <line
                key={index}
                x1="8"
                y1={y1}
                x2="8"
                y2={y2}
                stroke={isPremiumLocked(index) ? 'var(--gold)' : 'var(--success)'}
                strokeWidth="4"
                strokeLinecap="round"
              />
            );
          })}
        </svg>

        {/* Уроки */}
        <div className="flex flex-col gap-12 relative z-10">
          {lessons.map((lesson, index) => {
            const status = getLessonStatus(lesson.id, index);
            const isUnlocked = isLessonUnlocked(index);
            const premiumLock = status === 'premium';

            const nodeClass =
              status === 'completed'
                ? 'bg-success text-white shadow-[0_10px_15px_-3px_rgb(22_163_74_/_0.3)]'
                : status === 'current'
                ? 'bg-ink text-bg shadow-medium'
                : premiumLock
                ? 'text-white shadow-gold [background:linear-gradient(135deg,#d4a017,#f97316)]'
                : 'bg-elevated text-muted';

            return (
              <div
                key={lesson.id}
                className="flex items-center animate-fade-in"
                style={{ animationDelay: `${index * 0.08}s` }}
              >
                <div className="flex-1 pr-4 min-w-0">
                  {index % 2 === 0 && status !== 'locked' && (
                    <div className="text-right">
                      <p className="text-sm font-bold text-ink truncate">
                        {premiumLock && <Crown size={13} className="inline mr-1 -translate-y-px text-gold" aria-hidden="true" />}
                        {lesson.title}
                      </p>
                      <p className="text-caption text-muted">
                        {lesson.puzzles.length} {t('puzzles')}
                      </p>
                    </div>
                  )}
                </div>

                {/* Узел урока */}
                <div className="flex flex-col items-center">
                  <button
                    onClick={() => {
                      if (isUnlocked) onSelectLesson(lesson.id);
                      else if (premiumLock) onPremiumClick();
                    }}
                    disabled={!isUnlocked && !premiumLock}
                    aria-label={premiumLock ? t('premiumLockedTitle') : lesson.title}
                    className={`relative w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 select-none ${
                      isUnlocked || premiumLock
                        ? 'hover:scale-110 active:scale-95 cursor-pointer'
                        : 'cursor-not-allowed'
                    } ${status === 'current' ? 'animate-pulse-ring' : ''} ${nodeClass}`}
                  >
                    {status === 'completed' ? (
                      <Check size={26} strokeWidth={3} aria-hidden="true" />
                    ) : status === 'current' ? (
                      <span className="text-2xl" aria-hidden="true">♟</span>
                    ) : premiumLock ? (
                      <Crown size={24} strokeWidth={2.4} aria-hidden="true" />
                    ) : (
                      <Lock size={22} strokeWidth={2.2} aria-hidden="true" />
                    )}
                  </button>
                </div>

                <div className="flex-1 pl-4 min-w-0">
                  {index % 2 === 1 && status !== 'locked' && (
                    <div className="text-left">
                      <p className="text-sm font-bold text-ink truncate">
                        {premiumLock && <Crown size={13} className="inline mr-1 -translate-y-px text-gold" aria-hidden="true" />}
                        {lesson.title}
                      </p>
                      <p className="text-caption text-muted">
                        {lesson.puzzles.length} {t('puzzles')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Premium-баннер */}
      {!isPremium && (
        <button
          onClick={onPremiumClick}
          className="w-full mt-12 mb-4 p-5 text-left relative overflow-hidden animate-fade-in transition-transform rounded-[1.25rem] text-white shadow-medium"
          style={{ background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2117 60%, #4a3208 100%)' }}
        >
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-gold"
              style={{ background: 'linear-gradient(135deg, #d4a017 0%, #f97316 100%)' }}
              aria-hidden="true"
            >
              <Crown size={24} strokeWidth={2.2} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-black text-base">{t('premiumTitle')}</p>
              <p className="text-xs opacity-70">{t('premiumLockedDesc')}</p>
            </div>
            <span className="text-sm font-bold shrink-0 text-gold-accent">
              {t('premiumCta')} →
            </span>
          </div>
        </button>
      )}

      {/* Статистика */}
      <div className="glass-card p-5 text-center">
        <div className="flex items-center justify-around">
          <div>
            <p className="text-lg mb-0.5" aria-hidden="true">📚</p>
            <p className="text-2xl font-black text-ink">{progress.completedLessons.length}</p>
            <p className="text-caption text-muted">{t('lessonsCompleted')}</p>
          </div>
          <div className="w-px h-14 bg-line" />
          <div>
            <p className="text-lg mb-0.5" aria-hidden="true">🧩</p>
            <p className="text-2xl font-black text-ink">{progress.completedPuzzles.length}</p>
            <p className="text-caption text-muted">{t('puzzlesSolved')}</p>
          </div>
          <div className="w-px h-14 bg-line" />
          <div>
            <p className="text-lg mb-0.5" aria-hidden="true">🔥</p>
            <p className="text-2xl font-black text-gold">{progress.streak}</p>
            <p className="text-caption text-muted">{t('streakDays')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
