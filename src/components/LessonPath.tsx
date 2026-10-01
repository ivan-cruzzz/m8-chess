import { Check, Lock, BookOpen } from 'lucide-react';
import { useI18n } from '../contexts/I18nContext';
import type { Lesson, UserProgress } from '../types';

interface LessonPathProps {
  lesson: Lesson;
  progress: UserProgress;
  onSelectPuzzle: (puzzleId: string) => void;
  onBack: () => void;
  onTheory?: () => void;
}

/**
 * Тропинка урока в стиле Duolingo: по узлу на задачу.
 * Узел доступен, если предыдущая задача решена; решённые можно перерешивать.
 */
export function LessonPath({ lesson, progress, onSelectPuzzle, onBack, onTheory }: LessonPathProps) {
  const { t } = useI18n();

  const solvedCount = lesson.puzzles.filter((id) => progress.completedPuzzles.includes(id)).length;
  const allSolved = solvedCount === lesson.puzzles.length;

  const isSolved = (puzzleId: string) => progress.completedPuzzles.includes(puzzleId);
  const isUnlocked = (index: number) => index === 0 || isSolved(lesson.puzzles[index - 1]);
  const currentNodeIdx = lesson.puzzles.findIndex((id, i) => !isSolved(id) && isUnlocked(i));

  return (
    <div className="w-full max-w-md mx-auto px-4 py-6 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="btn btn-ghost -ml-2 px-2 py-1 text-sm">
          {t('back')}
        </button>
        {onTheory && (
          <button onClick={onTheory} className="btn btn-secondary py-1.5 px-3 text-xs rounded-full">
            <BookOpen size={14} strokeWidth={2.2} aria-hidden="true" />
            {t('theory')}
          </button>
        )}
        <span className="text-sm font-bold text-gold">
          {solvedCount}/{lesson.puzzles.length}
        </span>
      </div>

      <h2 className="display-title text-center mb-2 text-ink">{lesson.title}</h2>
      <p className="text-sm text-center mb-8 text-muted">
        {allSolved ? '🏆 ' : ''}
        <span className="font-bold text-gold-accent">{solvedCount}</span>
        <span> / {lesson.puzzles.length}</span>
      </p>

      <div className="relative">
        {/* Соединительная линия */}
        <svg
          className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2 w-4 h-full pointer-events-none"
          style={{ zIndex: 0 }}
        >
          <line x1="8" y1="24" x2="8" y2="100%" stroke="var(--line)" strokeWidth="4" strokeLinecap="round" />
          {lesson.puzzles.map((_id, index) => {
            if (index === 0) return null;
            if (!isSolved(lesson.puzzles[index - 1])) return null;
            const y1 = index * 88 - 20;
            const y2 = y1 + 88;
            return (
              <line key={index} x1="8" y1={y1} x2="8" y2={y2} stroke="var(--success)" strokeWidth="4" strokeLinecap="round" />
            );
          })}
        </svg>

        {/* Узлы-задачи */}
        <div className="flex flex-col gap-6 relative z-10">
          {lesson.puzzles.map((puzzleId, index) => {
            const solved = isSolved(puzzleId);
            const unlocked = isUnlocked(index);
            const isCurrent = index === currentNodeIdx;

            const nodeClass = solved
              ? 'bg-success text-white shadow-[0_10px_15px_-3px_rgb(22_163_74_/_0.3)]'
              : unlocked
              ? 'bg-ink text-bg shadow-medium'
              : 'bg-elevated text-muted';

            return (
              <div key={puzzleId} className="flex items-center animate-fade-in" style={{ animationDelay: `${index * 0.07}s` }}>
                <div className="flex-1 pr-4 text-right min-w-0">
                  {index % 2 === 0 && (
                    <span className={`text-caption font-bold ${solved ? 'text-success' : 'text-muted'}`}>
                      {solved && <Check size={12} className="inline mr-0.5 -translate-y-px" aria-hidden="true" />}
                      {index + 1}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => unlocked && onSelectPuzzle(puzzleId)}
                  disabled={!unlocked}
                  aria-label={`${lesson.title} — ${index + 1}`}
                  className={`relative w-14 h-14 rounded-full flex items-center justify-center text-xl font-black shadow-lg transition-all duration-300 select-none ${
                    unlocked ? 'hover:scale-110 active:scale-95 cursor-pointer' : 'cursor-not-allowed'
                  } ${isCurrent ? 'animate-pulse-ring' : ''} ${nodeClass}`}
                >
                  {solved ? (
                    <Check size={22} strokeWidth={3} aria-hidden="true" />
                  ) : unlocked ? (
                    <span aria-hidden="true">♟</span>
                  ) : (
                    <Lock size={20} strokeWidth={2.2} aria-hidden="true" />
                  )}
                </button>
                <div className="flex-1 pl-4 text-left min-w-0">
                  {index % 2 === 1 && (
                    <span className={`text-caption font-bold ${solved ? 'text-success' : 'text-muted'}`}>
                      {solved && <Check size={12} className="inline mr-0.5 -translate-y-px" aria-hidden="true" />}
                      {index + 1}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
