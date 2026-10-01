import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play as PlayIcon,
  Gift,
  User,
  Crown,
  Settings as SettingsIcon,
  Flame,
  Target,
  GraduationCap,
} from 'lucide-react';
import { useProgress } from './hooks/useProgress';
import { useAuth } from './contexts/AuthContext';
import { useI18n } from './contexts/I18nContext';
import { useTheme } from './contexts/ThemeContext';
import { useSubscription } from './contexts/SubscriptionContext';
import { LessonMap } from './components/LessonMap';
import { LessonPath } from './components/LessonPath';
import { ChessPuzzle } from './components/ChessPuzzle';
import { Profile } from './components/Profile';
import { Onboarding } from './components/Onboarding';
import { Confetti } from './components/Confetti';
import { AuthScreen } from './components/AuthScreen';
import { PremiumScreen } from './components/PremiumScreen';
import { PlayScreen } from './components/PlayScreen';
import { DailyScreen } from './components/DailyScreen';
import { PracticeScreen } from './components/PracticeScreen';
import { ReviewScreen } from './components/ReviewScreen';
import { TheoryModal } from './components/TheoryModal';
import { BeginnerCourse } from './components/BeginnerCourse';
import { TransferCard } from './components/TransferCard';
import { getPuzzleById } from './data/puzzles';
import { lessons } from './data/lessons';

type Screen = 'map' | 'lesson' | 'puzzle' | 'play' | 'daily' | 'practice' | 'review' | 'profile' | 'settings' | 'premium';

const ONBOARDING_KEY = 'chessup-onboarding-done';
const COURSE_KEY = 'chessup-course-done';

function App() {
  const { t } = useI18n();
  const { isLoggedIn } = useAuth();
  const { isPremium } = useSubscription();
  const [screen, setScreen] = useState<Screen>('map');
  const [currentPuzzleId, setCurrentPuzzleId] = useState<string | null>(null);
  const [currentLessonId, setCurrentLessonId] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [xpFloat, setXpFloat] = useState<{ amount: number; key: number } | null>(null);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const [showTheory, setShowTheory] = useState(false);
  const [showCourse, setShowCourse] = useState(false);
  const prevLevelRef = useRef<number | null>(null);
  const {
    progress, loaded,
    completePuzzle, completeLesson,
    noteExternalSolved, notePuzzleFailed, noteSurvivalScore,
    recordMistake, removeMistake, addGame, resetProgress, replaceProgress,
  } = useProgress();

  // Курс новичка — один раз для новых пользователей
  useEffect(() => {
    if (loaded && isLoggedIn && progress.completedPuzzles.length === 0 && !localStorage.getItem(COURSE_KEY)) {
      setShowCourse(true);
    }
  }, [loaded, isLoggedIn, progress.completedPuzzles.length]);

  useEffect(() => {
    const done = localStorage.getItem(ONBOARDING_KEY);
    if (!done && loaded && isLoggedIn) {
      setShowOnboarding(true);
    }
  }, [loaded, isLoggedIn]);

  const handleOnboardingComplete = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setShowOnboarding(false);
  };

  // Duolingo-флоу: урок → тропинка задач → задача → возврат на тропинку
  const handleSelectLesson = (lessonId: string) => {
    setCurrentLessonId(lessonId);
    setCurrentPuzzleId(null);
    setScreen('lesson');
  };

  const handleSelectPuzzle = (lessonId: string, puzzleId: string) => {
    setCurrentLessonId(lessonId);
    setCurrentPuzzleId(puzzleId);
    setScreen('puzzle');
  };

  const handlePuzzleComplete = (xp: number, meta?: { mistakes: number; hintUsed: boolean }) => {
    if (!currentLessonId) return;
    const lesson = lessons.find((l) => l.id === currentLessonId);
    if (!lesson || !currentPuzzleId) return;
    const puzzle = getPuzzleById(currentPuzzleId);
    completePuzzle(currentPuzzleId, xp, {
      rating: puzzle?.rating ?? 1000,
      mistakes: meta?.mistakes ?? 0,
      hintUsed: meta?.hintUsed ?? false,
    });
    const allDone = lesson.puzzles.every((id) =>
      id === currentPuzzleId || progress.completedPuzzles.includes(id)
    );
    // Конфетти — только в момент ПЕРВОГО завершения урока (перерешивание не празднуется)
    const wasAlreadyCompleted = progress.completedLessons.includes(currentLessonId);
    if (allDone && !wasAlreadyCompleted) {
      completeLesson(currentLessonId);
      setShowConfetti(true);
    }
    // всплывающий «+N XP»
    setXpFloat({ amount: xp, key: Date.now() });
    // всегда возвращаемся на тропинку урока
    setScreen('lesson');
  };

  /** Запись ошибки в тетрадь (для всех контекстов задач) */
  const handleWrongMove = useCallback(
    (info: { fen: string; playedSan: string; expectedSan: string; puzzleId: string; theme: string }) => {
      recordMistake({
        puzzleId: info.puzzleId,
        fen: info.fen,
        playedSan: info.playedSan,
        correctSan: info.expectedSan,
        theme: info.theme,
      });
    },
    [recordMistake]
  );

  // Тухнущий «+N XP» и отслеживание роста уровня
  useEffect(() => {
    if (!xpFloat) return;
    const id = setTimeout(() => setXpFloat(null), 1400);
    return () => clearTimeout(id);
  }, [xpFloat]);

  useEffect(() => {
    if (!loaded) return;
    const prev = prevLevelRef.current;
    prevLevelRef.current = progress.level;
    if (prev !== null && progress.level > prev) {
      setLevelUp(progress.level);
      const id = setTimeout(() => setLevelUp(null), 2400);
      return () => clearTimeout(id);
    }
  }, [progress.level, loaded]);

  const handleSkip = () => setScreen('lesson');

  const currentLesson = currentLessonId ? lessons.find((l) => l.id === currentLessonId) : null;
  const currentPuzzle = currentLesson && currentPuzzleId ? getPuzzleById(currentPuzzleId) : null;

  // Auth gate
  if (!isLoggedIn) {
    return <AuthScreen />;
  }

  // Loading
  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center">
          <div className="text-5xl mb-4 animate-pulse">♟</div>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('loading')}</p>
        </div>
      </div>
    );
  }

  // Onboarding
  if (showOnboarding) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <Confetti active={showConfetti} onDone={() => setShowConfetti(false)} />

      {/* Всплывающий «+N XP» */}
      {xpFloat && (
        <div
          key={xpFloat.key}
          className="fixed top-28 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-xp-float"
          style={{
            fontSize: '1.5rem',
            fontWeight: 900,
            background: 'linear-gradient(135deg, #d4a017 0%, #f59e0b 60%, #f97316 100%)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
            filter: 'drop-shadow(0 2px 8px rgba(245,158,11,0.35))',
          }}
          aria-hidden="true"
        >
          +{xpFloat.amount} XP
        </div>
      )}

      {/* Повышение уровня */}
      {levelUp !== null && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 backdrop-blur-sm animate-fade-in">
          <div className="glass-card px-10 py-8 text-center animate-level-pop" style={{ borderRadius: '1.5rem' }}>
            <div className="text-5xl mb-3 animate-float" aria-hidden="true">⭐</div>
            <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>
              {t('level')}
            </p>
            <p className="text-6xl font-black text-gold-accent leading-none mb-2">{levelUp}</p>
            <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{t('levelUp')}</p>
          </div>
        </div>
      )}

      {/* Top Bar */}
      <header
        className="sticky top-0 z-40 backdrop-blur-md border-b"
        style={{ background: 'var(--header-bg)', borderColor: 'var(--border-color)' }}
      >
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => setScreen('map')}
            className="flex items-center gap-1.5 text-sm font-bold transition-colors"
            style={{ color: screen === 'map' || screen === 'lesson' || screen === 'puzzle' ? 'var(--ink)' : 'var(--ink-muted)' }}
          >
            <GraduationCap size={18} strokeWidth={2.2} aria-hidden="true" />
            <span className="hidden sm:inline">{t('lessons')}</span>
          </button>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 rounded-full px-3 py-1 bg-elevated">
              <span className="text-xs font-bold text-ink-secondary">{progress.level}</span>
              <div className="w-16 h-1.5 rounded-full overflow-hidden bg-line">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    background: isPremium
                      ? 'linear-gradient(90deg, #f59e0b, #f97316)'
                      : 'var(--ink)',
                    width: `${Math.min(((progress.xp - (progress.level - 1) * 100) / 100) * 100, 100)}%`,
                  }}
                />
              </div>
            </div>
            <span className="flex items-center gap-1 text-sm font-bold text-gold">
              <Flame size={16} strokeWidth={2.2} aria-hidden="true" />
              {progress.streak}
            </span>
            <button
              onClick={() => setScreen('play')}
              aria-label={t('play')}
              title={t('play')}
              className="hidden md:block transition-colors"
              style={{ color: screen === 'play' ? 'var(--ink)' : 'var(--ink-muted)' }}
            >
              <PlayIcon size={20} strokeWidth={2} aria-hidden="true" />
            </button>
            <button
              onClick={() => setScreen('daily')}
              aria-label={t('daily')}
              title={t('daily')}
              className="hidden md:block transition-colors relative"
              style={{ color: screen === 'daily' ? 'var(--ink)' : 'var(--ink-muted)' }}
            >
              <Gift size={20} strokeWidth={2} aria-hidden="true" />
              {progress.daily.missions.some((m) => !m.claimed && m.progress < m.goal) && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-danger" aria-hidden="true" />
              )}
            </button>
            <button
              onClick={() => setScreen('profile')}
              aria-label={t('profile')}
              className="hidden md:block transition-colors"
              style={{ color: screen === 'profile' ? 'var(--ink)' : 'var(--ink-muted)' }}
            >
              <User size={20} strokeWidth={2} aria-hidden="true" />
            </button>
            <button
              onClick={() => setScreen('premium')}
              aria-label={t('premiumTitle')}
              title={t('premiumTitle')}
              className="transition-transform hover:scale-110"
              style={{ color: isPremium ? 'var(--gold)' : 'var(--ink-muted)' }}
            >
              <Crown size={20} strokeWidth={2.2} fill={isPremium ? 'currentColor' : 'none'} aria-hidden="true" />
            </button>
          </div>

          <button
            onClick={() => setScreen(screen === 'settings' ? 'map' : 'settings')}
            aria-label={t('settings')}
            className="transition-colors"
            style={{ color: screen === 'settings' ? 'var(--ink)' : 'var(--ink-muted)' }}
          >
            <SettingsIcon size={20} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto no-scrollbar">
        {(screen === 'map' || (screen === 'puzzle' && !currentPuzzle && !currentLesson)) && (
          <LessonMap
            progress={progress}
            onSelectLesson={handleSelectLesson}
            isPremium={isPremium}
            onPremiumClick={() => setScreen('premium')}
          />
        )}

        {screen === 'lesson' && currentLesson && (
          <LessonPath
            lesson={currentLesson}
            progress={progress}
            onSelectPuzzle={(puzzleId) => handleSelectPuzzle(currentLesson.id, puzzleId)}
            onBack={() => setScreen('map')}
            onTheory={() => setShowTheory(true)}
          />
        )}

        {screen === 'premium' && (
          <PremiumScreen onBack={() => setScreen('map')} />
        )}

        {screen === 'play' && (
          <PlayScreen history={progress.gameHistory} onGameFinished={addGame} />
        )}

        {screen === 'daily' && (
          <DailyScreen progress={progress} onPuzzleSolved={noteExternalSolved} onPractice={() => setScreen('practice')} />
        )}

        {screen === 'practice' && (
          <PracticeScreen
            progress={progress}
            onSolved={noteExternalSolved}
            onFailed={notePuzzleFailed}
            onSurvivalScore={noteSurvivalScore}
          />
        )}

        {screen === 'review' && (
          <ReviewScreen
            progress={progress}
            onSolved={noteExternalSolved}
            onMistakeSolved={removeMistake}
          />
        )}

        {/* key={puzzle.id}: каждая задача — новый экземпляр доски, перенос фигур невозможен */}
        {screen === 'puzzle' && currentPuzzle && (
          <ChessPuzzle
            key={currentPuzzle.id}
            puzzle={currentPuzzle}
            onComplete={handlePuzzleComplete}
            onSkip={handleSkip}
            onWrongMove={(w) => handleWrongMove({ ...w, puzzleId: currentPuzzle.id, theme: currentPuzzle.theme })}
          />
        )}

        {screen === 'profile' && (
          <Profile progress={progress} onReset={resetProgress} onOpenReview={() => setScreen('review')} />
        )}

        {screen === 'settings' && (
          <SettingsScreen onNavigate={setScreen} progress={progress} onImportProgress={replaceProgress} />
        )}
      </main>

      {/* Модалки: теория темы и курс новичка */}
      {showTheory && currentLesson && (
        <TheoryModal theme={currentLesson.theme} onClose={() => setShowTheory(false)} />
      )}
      {showCourse && (
        <BeginnerCourse
          onDone={() => {
            localStorage.setItem(COURSE_KEY, 'true');
            setShowCourse(false);
          }}
        />
      )}

      {/* Bottom Nav */}
      <nav
        aria-label={t('settings')}
        className="sticky bottom-0 z-40 backdrop-blur-md border-t md:hidden"
        style={{ background: 'var(--header-bg)', borderColor: 'var(--border-color)' }}
      >
        <div className="max-w-lg mx-auto h-16 flex items-center justify-around">
          <button
            onClick={() => setScreen('map')}
            aria-current={screen === 'map' || screen === 'lesson' || screen === 'puzzle' ? 'page' : undefined}
            className="flex flex-col items-center gap-0.5 text-caption transition-colors"
            style={{ color: screen === 'map' || screen === 'lesson' || screen === 'puzzle' ? 'var(--ink)' : 'var(--ink-muted)' }}
          >
            <Target size={24} strokeWidth={2} aria-hidden="true" />
            {t('lessons')}
          </button>
          <button
            onClick={() => setScreen('play')}
            aria-current={screen === 'play' ? 'page' : undefined}
            className="flex flex-col items-center gap-0.5 text-caption transition-colors"
            style={{ color: screen === 'play' ? 'var(--ink)' : 'var(--ink-muted)' }}
          >
            <PlayIcon size={24} strokeWidth={2} aria-hidden="true" />
            {t('play')}
          </button>
          <button
            onClick={() => setScreen('daily')}
            aria-current={screen === 'daily' ? 'page' : undefined}
            className="flex flex-col items-center gap-0.5 text-caption transition-colors relative"
            style={{ color: screen === 'daily' ? 'var(--ink)' : 'var(--ink-muted)' }}
          >
            <Gift size={24} strokeWidth={2} aria-hidden="true" />
            {t('daily')}
            {progress.daily.missions.some((m) => !m.claimed && m.progress < m.goal) && (
              <span className="absolute top-0 right-2 w-2 h-2 rounded-full bg-danger" aria-hidden="true" />
            )}
          </button>
          <button
            onClick={() => setScreen('profile')}
            aria-current={screen === 'profile' ? 'page' : undefined}
            className="flex flex-col items-center gap-0.5 text-caption transition-colors"
            style={{ color: screen === 'profile' ? 'var(--ink)' : 'var(--ink-muted)' }}
          >
            <User size={24} strokeWidth={2} aria-hidden="true" />
            {t('profile')}
          </button>
          <button
            onClick={() => setScreen('settings')}
            aria-current={screen === 'settings' ? 'page' : undefined}
            className="flex flex-col items-center gap-0.5 text-caption transition-colors"
            style={{ color: screen === 'settings' ? 'var(--ink)' : 'var(--ink-muted)' }}
          >
            <SettingsIcon size={24} strokeWidth={2} aria-hidden="true" />
            {t('settings')}
          </button>
        </div>
      </nav>
    </div>
  );
}

/* Settings screen */
function SettingsScreen({
  onNavigate,
  progress,
  onImportProgress,
}: {
  onNavigate: (s: Screen) => void;
  progress: import('./types').UserProgress;
  onImportProgress: (data: Partial<import('./types').UserProgress>) => void;
}) {
  const { t, lang, setLang } = useI18n();
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  const { plan, isPremium } = useSubscription();

  return (
    <div className="w-full max-w-md mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold mb-6 text-center" style={{ color: 'var(--text-primary)' }}>
        {t('settings')}
      </h2>

      {/* User card */}
      {user && (
        <div
          className="rounded-2xl p-5 mb-6 border"
          style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl" style={{ background: 'var(--bg-tertiary)' }}>
              👤
            </div>
            <div>
              <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{user.username}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{user.email}</p>
            </div>
          </div>
        </div>
      )}

      {/* Language */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold mb-3 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          {t('language')}
        </h3>
        <div className="flex gap-2">
          {(['ru', 'en'] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className="flex-1 py-3 rounded-xl border-2 font-medium text-sm transition-all"
              style={{
                borderColor: lang === l ? 'var(--text-primary)' : 'var(--border-color)',
                background: lang === l ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
                color: 'var(--text-primary)',
              }}
            >
              {l === 'ru' ? '🇷🇺 Русский' : '🇬🇧 English'}
            </button>
          ))}
        </div>
      </div>

      {/* Theme */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold mb-3 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          {t('theme')}
        </h3>
        <div className="flex gap-2">
          {(['light', 'dark'] as const).map((th) => (
            <button
              key={th}
              onClick={() => setTheme(th)}
              className="flex-1 py-3 rounded-xl border-2 font-medium text-sm transition-all"
              style={{
                borderColor: theme === th ? 'var(--text-primary)' : 'var(--border-color)',
                background: theme === th ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
                color: 'var(--text-primary)',
              }}
            >
              {th === 'light' ? '☀️ ' + t('light') : '🌙 ' + t('dark')}
            </button>
          ))}
        </div>
      </div>

      {/* Subscription */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold mb-3 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          {t('premiumCurrent')}
        </h3>
        <button
          onClick={() => onNavigate('premium')}
          className="w-full rounded-2xl p-4 flex items-center gap-3 transition-transform hover:scale-[1.02] active:scale-[0.98]"
          style={{
            background: isPremium
              ? 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)'
              : 'var(--bg-secondary)',
            boxShadow: isPremium ? '0 10px 20px -6px rgba(245,158,11,0.4)' : undefined,
            border: isPremium ? undefined : '2px solid var(--border-color)',
          }}
        >
          <span className="text-2xl" aria-hidden="true">{isPremium ? '👑' : '♛'}</span>
          <div className="text-left">
            <p className="font-bold text-sm" style={{ color: isPremium ? '#fff' : 'var(--text-primary)' }}>
              {isPremium ? `${t('premium')} · ${t(plan === 'yearly' ? 'premiumYearly' : plan === 'monthly' ? 'premiumMonthly' : 'premiumLifetime')}` : t('premiumFree')}
            </p>
            <p className="text-xs" style={{ color: isPremium ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)' }}>
              {isPremium ? t('premiumFeature1') : t('premiumLockedDesc')}
            </p>
          </div>
        </button>
      </div>

      {/* Transfer */}
      <TransferCard progress={progress} onImport={onImportProgress} />

      {/* Logout */}
      <button
        onClick={() => { logout(); onNavigate('map'); }}
        className="w-full py-3 rounded-xl border-2 font-medium text-sm transition-all"
        style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}
      >
        {t('logout')}
      </button>
    </div>
  );
}

export default App;
