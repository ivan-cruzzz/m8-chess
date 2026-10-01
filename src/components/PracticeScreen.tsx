import { useMemo, useState, useEffect, useRef } from 'react';
import { Zap, Heart, Timer, ArrowRight } from 'lucide-react';
import { useI18n } from '../contexts/I18nContext';
import { puzzles } from '../data/puzzles';
import { lessons } from '../data/lessons';
import { ChessPuzzle } from './ChessPuzzle';
import type { UserProgress, Puzzle } from '../types';
import type { SolvedMeta } from '../hooks/useProgress';

interface PracticeScreenProps {
  progress: UserProgress;
  onSolved: (meta: SolvedMeta) => void;
  onFailed: (rating: number) => void;
  onSurvivalScore: (xp: number, combo: number) => void;
}

type Mode = 'menu' | 'practice' | 'survival';

/** Очередь задач, отсортированная по близости к рейтингу игрока */
function buildQueue(elo: number, theme: string, unsolvedOnly: boolean, completed: string[]): Puzzle[] {
  let pool = puzzles.filter((p) => (theme === '' || p.theme === theme));
  if (unsolvedOnly) pool = pool.filter((p) => !completed.includes(p.id));
  if (pool.length === 0) pool = puzzles;
  return [...pool].sort((a, b) => Math.abs(a.rating - elo) - Math.abs(b.rating - elo));
}

export function PracticeScreen({ progress, onSolved, onFailed, onSurvivalScore }: PracticeScreenProps) {
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
  };

  const current = queue[idx];

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
        <div className="glass-card p-5">
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
          setIdx((i) => i + 1);
        }}
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
