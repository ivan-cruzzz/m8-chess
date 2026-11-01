import { useMemo, useState, useEffect, useRef } from 'react';
import { Zap, Heart, Timer, ArrowRight, Target, BookOpen } from 'lucide-react';
import { useI18n } from '../contexts/I18nContext';
import { puzzles } from '../data/puzzles';
import { lessons } from '../data/lessons';
import { openings } from '../data/openings';
import { ChessPuzzle } from './ChessPuzzle';
import { StaticBoard } from './StaticBoard';
import { generateMatePuzzle } from '../game/mateGen';
import type { MateKind, MatePuzzle } from '../game/mateGen';
import type { UserProgress, Puzzle } from '../types';
import type { SolvedMeta } from '../hooks/useProgress';

/** Длительность Блиц-спринта, секунд */
const SPRINT_SECONDS = 180;
/** Штраф за неверный ход в спринте, секунд */
const SPRINT_WRONG_PENALTY = 10;
/** Неверных попыток в Генераторе матов до показа решения */
const MATS_MAX_WRONG = 3;

interface PracticeScreenProps {
  progress: UserProgress;
  onSolved: (meta: SolvedMeta) => void;
  onFailed: (rating: number) => void;
  onSurvivalScore: (xp: number, combo: number) => void;
  /** Рекорд спринта (noteSprintScore); опционален, чтобы не ломать текущую точку вызова */
  onSprintScore?: (score: number) => void;
  /** Переход в Тренажёр дебютов (отдельный экран App); опционален, как и остальные входы */
  onOpenOpenings?: () => void;
}

type Mode = 'menu' | 'practice' | 'survival' | 'sprint' | 'mats';

/** Очередь задач, отсортированная по близости к рейтингу игрока */
function buildQueue(elo: number, theme: string, unsolvedOnly: boolean, completed: string[]): Puzzle[] {
  let pool = puzzles.filter((p) => (theme === '' || p.theme === theme));
  if (unsolvedOnly) pool = pool.filter((p) => !completed.includes(p.id));
  if (pool.length === 0) pool = puzzles;
  return [...pool].sort((a, b) => Math.abs(a.rating - elo) - Math.abs(b.rating - elo));
}

/** Поток задач для спринта: пул по рейтингу (elo+150, иначе весь) в случайном порядке */
function buildSprintPool(elo: number): Puzzle[] {
  const close = puzzles.filter((p) => p.rating <= elo + 150);
  const pool = close.length >= 8 ? close : [...puzzles];
  // Тасование Фишера—Йетса
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
}

export function PracticeScreen({ progress, onSolved, onFailed, onSurvivalScore, onSprintScore, onOpenOpenings }: PracticeScreenProps) {
  const { t } = useI18n();
  const [mode, setMode] = useState<Mode>('menu');
  const [theme, setTheme] = useState('');
  const [unsolvedOnly, setUnsolvedOnly] = useState(true);
  const [queue, setQueue] = useState<Puzzle[]>([]);
  const [idx, setIdx] = useState(0);

  // Выживание
  const [lives, setLives] = useState(3);
  const [combo, setCombo] = useState(1);
  const [survivalXp, setSurvivalXp] = useState(0);
  const [timeLeft, setTimeLeft] = useState(45);
  const [survivalOver, setSurvivalOver] = useState(false);
  const timerRef = useRef<number | null>(null);

  // Блиц-спринт
  const [sprintScore, setSprintScore] = useState(0);
  const [sprintOver, setSprintOver] = useState(false);
  const [sprintPrevBest, setSprintPrevBest] = useState(0);
  const sprintScoreRef = useRef(0); // значение для финиша без гонок с интервалом

  // Генератор матов
  const [matKind, setMatKind] = useState<MateKind>('mate1');
  const [matPuzzle, setMatPuzzle] = useState<Puzzle | null>(null);
  const [matNext, setMatNext] = useState<MatePuzzle | null>(null);
  const [matWrong, setMatWrong] = useState(0);
  const [matShowSolution, setMatShowSolution] = useState(false);
  const [matLoading, setMatLoading] = useState(false);
  const matSeqRef = useRef(0); // счётчик для уникальных id задач

  const themes = useMemo(() => lessons.map((l) => l.theme), []);

  const start = (m: Mode) => {
    const q = buildQueue(progress.puzzleElo, theme, unsolvedOnly, progress.completedPuzzles);
    setQueue(q);
    setIdx(0);
    setMode(m);
    if (m === 'survival') {
      setLives(3);
      setCombo(1);
      setSurvivalXp(0);
      setSurvivalOver(false);
      setTimeLeft(45);
    }
    if (m === 'sprint') {
      setQueue(buildSprintPool(progress.puzzleElo));
      setIdx(0);
      setSprintScore(0);
      sprintScoreRef.current = 0;
      setSprintPrevBest(progress.sprintBest?.score ?? 0);
      setSprintOver(false);
      setTimeLeft(SPRINT_SECONDS);
    }
  };

  /** Старт генератора матов: первая позиция считается вне клика, чтобы не блокировать отрисовку */
  const startMats = (kind: MateKind) => {
    setMode('mats');
    setMatKind(kind);
    setMatPuzzle(null);
    setMatNext(null);
    setMatWrong(0);
    setMatShowSolution(false);
    setMatLoading(true);
    window.setTimeout(() => {
      setMatPuzzle(toMatPuzzle(generateMatePuzzle({ kind }), ++matSeqRef.current));
      setMatLoading(false);
    }, 50);
  };

  /** Сгенерированный мат → задача для ChessPuzzle (id нужен уникальный для сброса доски) */
  function toMatPuzzle(mp: MatePuzzle, seq: number): Puzzle {
    const mate1 = mp.kind === 'mate1';
    return {
      id: `mat-${mp.kind}-${seq}`,
      fen: mp.fen,
      solution: mp.solution,
      hint: mate1 ? t('matsHint1') : t('matsHint2'),
      theme: mate1 ? t('matsMateIn1') : t('matsMateIn2'),
      difficulty: mate1 ? 1 : 3,
      xp: mate1 ? 10 : 15,
      rating: mate1 ? 800 : 1200,
    };
  }

  /** Следующая сгенерированная позиция: заранее подготовленная или свежая */
  const nextMatPuzzle = () => {
    const raw = matNext ?? generateMatePuzzle({ kind: matKind });
    setMatPuzzle(toMatPuzzle(raw, ++matSeqRef.current));
    setMatNext(null);
    setMatWrong(0);
    setMatShowSolution(false);
  };

  const current = queue[idx];

  // Генератор матов: следующая позиция готовится заранее, пока игрок решает текущую
  useEffect(() => {
    if (mode !== 'mats' || !matPuzzle || matNext) return;
    const id = window.setTimeout(() => {
      setMatNext(generateMatePuzzle({ kind: matKind }));
    }, 100);
    return () => window.clearTimeout(id);
  }, [mode, matPuzzle, matNext, matKind]);

  // Таймер выживания
  useEffect(() => {
    if (mode !== 'survival' || survivalOver || !current) return;
    setTimeLeft(30 + current.difficulty * 5);
    timerRef.current = window.setInterval(() => {
      setTimeLeft((tl) => {
        if (tl <= 1) {
          window.clearInterval(timerRef.current ?? undefined);
          // Время вышло — минус жизнь
          setLives((l) => {
            const nl = l - 1;
            if (nl <= 0) {
              setSurvivalOver(true);
              onSurvivalScore(survivalXp, combo);
              onFailed(current.rating);
            }
            return nl;
          });
          setCombo(1);
          setIdx((i) => i + 1);
          return 0;
        }
        return tl - 1;
      });
    }, 1000);
    return () => window.clearInterval(timerRef.current ?? undefined);
  }, [mode, idx, survivalOver, current, survivalXp, combo, onSurvivalScore, onFailed]);

  // Таймер спринта: единые 3 минуты, на задачу не сбрасывается
  useEffect(() => {
    if (mode !== 'sprint' || sprintOver || !current) return;
    const id = window.setInterval(() => {
      setTimeLeft((tl) => (tl <= 1 ? 0 : tl - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [mode, sprintOver, current]);

  // Ноль на таймере спринта — финиш: рекорд и экран результата
  useEffect(() => {
    if (mode !== 'sprint' || sprintOver || timeLeft > 0 || !current) return;
    setSprintOver(true);
    onSprintScore?.(sprintScoreRef.current);
  }, [mode, sprintOver, timeLeft, current, onSprintScore]);

  /** Неверный ход: в спринте — минус 10 секунд, в генераторе — попытка */
  const handleWrongMove = () => {
    if (mode === 'sprint') setTimeLeft((tl) => Math.max(0, tl - SPRINT_WRONG_PENALTY));
    if (mode === 'mats') {
      const w = matWrong + 1;
      setMatWrong(w);
      if (w >= MATS_MAX_WRONG) setMatShowSolution(true);
    }
  };

  /** Спринт: следующая задача; пул закончился — новый перемешанный */
  const advanceSprint = () => {
    if (idx + 1 >= queue.length) {
      setQueue(buildSprintPool(progress.puzzleElo));
      setIdx(0);
    } else {
      setIdx(idx + 1);
    }
  };

  if (mode === 'menu') {
    return (
      <div className="w-full max-w-md mx-auto px-4 py-8 animate-fade-in">
        <h2 className="display-title text-center mb-1" style={{ color: 'var(--text-primary)' }}>
          {t('practiceTitle')}
        </h2>
        <p className="text-sm text-center mb-2" style={{ color: 'var(--text-muted)' }}>
          {t('elo')}: <b className="text-gold-accent">{progress.puzzleElo}</b>
        </p>

        <div className="glass-card p-5 mb-4">
          <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>
            {t('chooseTheme')}
          </p>
          <div className="flex flex-wrap gap-1.5 mb-4">
            <button
              onClick={() => setTheme('')}
              className="px-3 py-2 rounded-xl text-xs font-semibold transition-all"
              style={{
                background: theme === '' ? 'var(--text-primary)' : 'var(--bg-tertiary)',
                color: theme === '' ? 'var(--bg-primary)' : 'var(--text-secondary)',
              }}
            >
              {t('allThemes')}
            </button>
            {themes.map((th) => (
              <button
                key={th}
                onClick={() => setTheme(th)}
                className="px-3 py-2 rounded-xl text-xs font-semibold transition-all"
                style={{
                  background: theme === th ? 'var(--text-primary)' : 'var(--bg-tertiary)',
                  color: theme === th ? 'var(--bg-primary)' : 'var(--text-secondary)',
                }}
              >
                {th}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 mb-4 text-sm cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
            <input type="checkbox" checked={unsolvedOnly} onChange={(e) => setUnsolvedOnly(e.target.checked)} />
            {t('unsolvedOnly')}
          </label>
          <button
            onClick={() => start('practice')}
            className="btn btn-gold w-full py-3.5"
          >
            {t('startPractice')}
            <ArrowRight size={18} strokeWidth={2.4} aria-hidden="true" />
          </button>
        </div>

        {/* Выживание */}
        <div className="glass-card p-5 mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="font-bold text-ink flex items-center gap-2">
              <Zap size={18} strokeWidth={2.4} className="text-gold" aria-hidden="true" />
              {t('survival')}
            </p>
            {progress.survivalBest && (
              <span className="text-caption text-muted">
                {t('survivalBest')}: <b className="text-gold-accent">{progress.survivalBest.xp} XP</b>
              </span>
            )}
          </div>
          <p className="text-caption mb-4 text-muted">
            3 {t('survivalLives').toLowerCase()} · {t('survivalTime').toLowerCase()} · x2…x5 XP
          </p>
          <button
            onClick={() => start('survival')}
            className="btn btn-primary w-full py-3.5"
          >
            {t('startSurvival')}
            <Zap size={18} strokeWidth={2.4} aria-hidden="true" />
          </button>
        </div>

        {/* Блиц-спринт */}
        <div className="glass-card p-5 mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="font-bold text-ink flex items-center gap-2">
              <Timer size={18} strokeWidth={2.4} className="text-gold" aria-hidden="true" />
              {t('sprintTitle')}
            </p>
            {progress.sprintBest && (
              <span className="text-caption text-muted">
                {t('sprintBest')}: <b className="text-gold-accent">{progress.sprintBest.score}</b>
              </span>
            )}
          </div>
          <p className="text-caption mb-4 text-muted">{t('sprintDesc')}</p>
          <button
            onClick={() => start('sprint')}
            className="btn btn-primary w-full py-3.5"
          >
            {t('sprintStart')}
            <Timer size={18} strokeWidth={2.4} aria-hidden="true" />
          </button>
        </div>

        {/* Генератор матов */}
        <div className="glass-card p-5 mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="font-bold text-ink flex items-center gap-2">
              <Target size={18} strokeWidth={2.4} className="text-gold" aria-hidden="true" />
              {t('matsTitle')}
            </p>
          </div>
          <p className="text-caption mb-4 text-muted">{t('matsDesc')}</p>
          <div className="flex gap-2">
            <button onClick={() => startMats('mate1')} className="btn btn-primary flex-1 py-3.5">
              {t('matsMateIn1')}
            </button>
            <button onClick={() => startMats('mate2')} className="btn btn-primary flex-1 py-3.5">
              {t('matsMateIn2')}
            </button>
          </div>
        </div>

        {/* Тренажёр дебютов — переход на отдельный экран */}
        {onOpenOpenings && (
          <button
            onClick={onOpenOpenings}
            className="glass-card p-5 w-full text-left transition-transform active:scale-[0.98]"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="font-bold text-ink flex items-center gap-2">
                <BookOpen size={18} strokeWidth={2.4} className="text-gold" aria-hidden="true" />
                {t('openingsTitle')}
              </p>
              <span className="text-caption text-muted">
                {progress.openingsStudied.length}/{openings.length}
              </span>
            </div>
            <p className="text-caption mb-4 text-muted">{t('openingsDesc')}</p>
            <span className="btn btn-primary w-full py-3.5 pointer-events-none inline-flex justify-center">
              {t('openingsStart')}
              <ArrowRight size={18} strokeWidth={2.4} aria-hidden="true" />
            </span>
          </button>
        )}
      </div>
    );
  }

  if (mode === 'sprint' && sprintOver) {
    const isRecord = sprintScore > sprintPrevBest;
    return (
      <div className="w-full max-w-md mx-auto px-4 py-16 text-center animate-bounce-in">
        <div className="text-6xl mb-4 animate-float" aria-hidden="true">⏱</div>
        <h2 className="display-title mb-2" style={{ color: 'var(--text-primary)' }}>{t('sprintOver')}</h2>
        <p className="text-sm mb-1" style={{ color: 'var(--text-muted)' }}>
          {t('sprintResult').replace('{n}', String(sprintScore))}
        </p>
        {isRecord && sprintScore > 0 && (
          <p className="text-sm font-bold mb-2 text-gold-accent">{t('sprintNewRecord')}</p>
        )}
        <p className="text-caption mb-8 text-muted">
          {t('sprintBest')}: <b className="text-gold-accent">{Math.max(sprintPrevBest, sprintScore)}</b>
        </p>
        <button
          onClick={() => setMode('menu')}
          className="w-full py-3.5 rounded-xl font-bold"
          style={{ background: 'linear-gradient(135deg, #d4a017, #f97316)', color: '#fff' }}
        >
          {t('practiceTitle')} →
        </button>
      </div>
    );
  }

  if (mode === 'mats') {
    const attemptsLeft = Math.max(0, MATS_MAX_WRONG - matWrong);
    return (
      <div className="w-full max-w-md mx-auto animate-fade-in">
        <div className="w-full max-w-lg mx-auto px-4 pt-4 flex items-center justify-between">
          <button onClick={() => setMode('menu')} className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {t('exitPractice')} ×
          </button>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {matKind === 'mate1' ? t('matsMateIn1') : t('matsMateIn2')}
          </span>
          {!matShowSolution && matPuzzle && (
            <span className="text-xs font-bold" style={{ color: attemptsLeft <= 1 ? 'var(--danger)' : 'var(--text-muted)' }}>
              {t('matsAttemptsLeft').replace('{n}', String(attemptsLeft))}
            </span>
          )}
        </div>
        {matLoading || !matPuzzle ? (
          <div className="w-full max-w-lg mx-auto px-4 py-16 text-center">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('matsGenerating')}</p>
          </div>
        ) : matShowSolution ? (
          <div className="w-full max-w-lg mx-auto px-4 py-4">
            <div className="glass-card p-4 mb-4 text-center">
              <p className="text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
                {t('matsSolution')}
              </p>
              <StaticBoard fen={matPuzzle.fen} className="mb-3" />
              <p className="text-sm text-gold-accent font-bold" dir="ltr">
                {matPuzzle.solution.join(' → ')}
              </p>
            </div>
            <button onClick={nextMatPuzzle} className="btn btn-gold w-full py-3.5">
              {t('nextTask')}
              <ArrowRight size={18} strokeWidth={2.4} aria-hidden="true" />
            </button>
          </div>
        ) : (
          <ChessPuzzle
            key={matPuzzle.id}
            puzzle={matPuzzle}
            onComplete={(_xp, meta) => {
              onSolved({
                xp: matPuzzle.xp,
                rating: matPuzzle.rating,
                mistakes: meta?.mistakes ?? 0,
                hintUsed: meta?.hintUsed ?? false,
                source: 'practice',
              });
              nextMatPuzzle();
            }}
            onWrongMove={handleWrongMove}
            onSkip={() => setMode('menu')}
          />
        )}
      </div>
    );
  }

  if (survivalOver) {
    return (
      <div className="w-full max-w-md mx-auto px-4 py-16 text-center animate-bounce-in">
        <div className="text-6xl mb-4 animate-float" aria-hidden="true">💀</div>
        <h2 className="display-title mb-2" style={{ color: 'var(--text-primary)' }}>{t('survivalOver')}</h2>
        <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>
          {t('survivalResult').replace('{xp}', String(survivalXp)).replace('{combo}', String(combo))}
        </p>
        <button
          onClick={() => setMode('menu')}
          className="w-full py-3.5 rounded-xl font-bold"
          style={{ background: 'linear-gradient(135deg, #d4a017, #f97316)', color: '#fff' }}
        >
          {t('survival')} →
        </button>
      </div>
    );
  }

  if (!current) {
    return (
      <div className="w-full max-w-md mx-auto px-4 py-16 text-center">
        <p className="mb-6" style={{ color: 'var(--text-muted)' }}>✅</p>
        <button onClick={() => setMode('menu')} className="py-3 px-6 rounded-xl font-bold" style={{ background: 'var(--text-primary)', color: 'var(--bg-primary)' }}>
          {t('exitPractice')}
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto animate-fade-in">
      {mode === 'survival' && (
        <div className="w-full max-w-lg mx-auto px-4 pt-4 flex items-center justify-between">
          <span className="flex items-center gap-0.5" style={{ color: lives > 1 ? 'var(--danger)' : 'var(--danger)' }} aria-label={`${t('survivalLives')}: ${lives}`}>
            {Array.from({ length: Math.max(0, lives) }).map((_, i) => (
              <Heart key={i} size={18} strokeWidth={2.2} fill="currentColor" aria-hidden="true" />
            ))}
          </span>
          <span className={`flex items-center gap-1 text-sm font-bold ${timeLeft <= 10 ? 'text-danger' : 'text-muted'}`}>
            <Timer size={18} strokeWidth={2.2} aria-hidden="true" />
            {timeLeft}s
          </span>
          <span className="text-sm font-black text-gold-accent">x{combo} · {survivalXp} XP</span>
        </div>
      )}
      {mode === 'practice' && (
        <div className="w-full max-w-lg mx-auto px-4 pt-4 flex items-center justify-between">
          <button onClick={() => setMode('menu')} className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('exitPractice')} ×</button>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {t('elo')}: <b className="text-gold-accent">{progress.puzzleElo}</b>
          </span>
          <span className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>{theme || t('allThemes')}</span>
        </div>
      )}
      {mode === 'sprint' && (
        <div className="w-full max-w-lg mx-auto px-4 pt-4 flex items-center justify-between">
          <button onClick={() => setMode('menu')} className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('exitPractice')} ×</button>
          <span className={`flex items-center gap-1 text-sm font-bold ${timeLeft <= 10 ? 'text-danger' : 'text-muted'}`}>
            <Timer size={18} strokeWidth={2.2} aria-hidden="true" />
            {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
          </span>
          <span className="text-sm font-black text-gold-accent">{t('sprintScore')}: {sprintScore}</span>
        </div>
      )}
      <ChessPuzzle
        key={current.id + '-' + idx}
        puzzle={current}
        onComplete={(xp, meta) => {
          const earned = mode === 'survival' ? xp * combo : xp;
          onSolved({
            xp: earned,
            rating: current.rating,
            mistakes: meta?.mistakes ?? 0,
            hintUsed: meta?.hintUsed ?? false,
            source: 'practice',
          });
          if (mode === 'survival') {
            setSurvivalXp((v) => v + earned);
            setCombo((c) => (meta?.mistakes === 0 ? Math.min(5, c + 1) : 1));
          }
          if (mode === 'sprint') {
            sprintScoreRef.current += 1;
            setSprintScore(sprintScoreRef.current);
            advanceSprint();
            return;
          }
          setIdx((i) => i + 1);
        }}
        onWrongMove={mode === 'sprint' ? handleWrongMove : undefined}
        onSkip={() => {
          if (mode === 'survival') {
            const nl = lives - 1;
            setLives(nl);
            setCombo(1);
            onFailed(current.rating);
            if (nl <= 0) {
              setSurvivalOver(true);
              onSurvivalScore(survivalXp, combo);
            }
          }
          setIdx((i) => i + 1);
        }}
      />
    </div>
  );
}
