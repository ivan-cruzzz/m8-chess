import { useState, useEffect, useCallback } from 'react';
import type { UserProgress, MistakeEntry, GameRecord, DailyMission } from '../types';
import { defaultProgress } from '../data/lessons';
import { useAuth } from '../contexts/AuthContext';

// Прогресс хранится отдельно для каждого пользователя
const LEGACY_KEY = 'chess-duolingo-progress';
const keyFor = (userId: string) => `chessup-progress:${userId}`;

/* ---------- Даты и недели ---------- */

const todayKey = () => new Date().toISOString().split('T')[0];

const weekKeyOf = (d = new Date()) => {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
};

/** Детерминированный хеш строки */
const hashStr = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

/** Честный детерминированный ГПСЧ (mulberry32): у LCG младшие биты циклятся */
function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- Ежедневные миссии ---------- */

interface MissionTemplate {
  id: string;
  goal: number;
  bonusXp: number;
}

const MISSION_POOL: MissionTemplate[] = [
  { id: 'solve3', goal: 3, bonusXp: 20 },
  { id: 'solve5', goal: 5, bonusXp: 30 },
  { id: 'nohint2', goal: 2, bonusXp: 15 },
  { id: 'perfect2', goal: 2, bonusXp: 20 },
  { id: 'perfect3', goal: 3, bonusXp: 25 },
  { id: 'xp100', goal: 100, bonusXp: 15 },
];

function missionsForDate(dateKey: string): DailyMission[] {
  const rand = mulberry32(hashStr(dateKey) || 1);
  const pool = [...MISSION_POOL];
  // Фишер-Йетс: перемешиваем и берём 3 — без циклов поиска уникальных
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 3).map((tpl) => ({ ...tpl, progress: 0, claimed: false }));
}

/* ---------- Лига: боты недели ---------- */

const BOT_NAMES = [
  'Алексей', 'Марина', 'Гоша', 'Лиза', 'Виктор', 'Нина', 'Паша', 'Даша', 'Стас', 'Оля', 'Артём', 'Кира',
  'Егор', 'Соня', 'Лев', 'Вера',
];

/** 10 ботов с дневным темпом XP, детерминированным по неделе */
export function leagueBots(weekKey: string): Array<{ name: string; pace: number }> {
  const rand = mulberry32(hashStr(weekKey) || 1);
  const names = [...BOT_NAMES];
  // Фишер-Йетс: уникальность имён гарантирована перемешиванием, без while-поиска
  for (let i = names.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [names[i], names[j]] = [names[j], names[i]];
  }
  return names
    .slice(0, 10)
    .map((name) => ({ name, pace: 25 + Math.floor(rand() * 9) * 14 })) // 25..137 XP/день
    .sort((a, b) => b.pace - a.pace);
}

/* ---------- Загрузка / сохранение ---------- */

/** Миграция и дозаполнение новых полей + ежедневный/недельный ресет */
function normalize(p: Partial<UserProgress>): UserProgress {
  const merged: UserProgress = {
    ...defaultProgress,
    ...p,
    daily: { ...defaultProgress.daily, ...(p.daily ?? {}) },
    weekly: { ...defaultProgress.weekly, ...(p.weekly ?? {}) },
  };

  // Новый день — новые миссии
  const tk = todayKey();
  if (merged.daily.dateKey !== tk) {
    merged.daily = { dateKey: tk, missions: missionsForDate(tk), dailyPuzzleDone: false };
  }

  // Новая неделя — оцениваем прошлую лигу и обнуляем счётчик
  const wk = weekKeyOf();
  if (merged.weekly.weekKey && merged.weekly.weekKey !== wk) {
    const bots = leagueBots(merged.weekly.weekKey);
    const botXps = bots.map((b) => b.pace * 7);
    const userXp = merged.weekly.xp;
    let place = 1;
    for (const bx of botXps) if (bx > userXp) place++;
    merged.weekly = { weekKey: wk, xp: 0, lastPlace: place };
    if (place <= 3 && merged.leagueDiv > 1) merged.leagueDiv = (merged.leagueDiv - 1) as 1 | 2 | 3;
    else if (place >= 9 && merged.leagueDiv < 3) merged.leagueDiv = (merged.leagueDiv + 1) as 1 | 2 | 3;
  } else if (!merged.weekly.weekKey) {
    merged.weekly = { weekKey: wk, xp: 0, lastPlace: null };
  }

  return merged;
}

function loadProgress(storageKey: string): UserProgress {
  try {
    let raw = localStorage.getItem(storageKey);
    if (!raw) {
      const legacy = localStorage.getItem(LEGACY_KEY);
      if (legacy) {
        raw = legacy;
        localStorage.setItem(storageKey, legacy);
        localStorage.removeItem(LEGACY_KEY);
      }
    }
    if (!raw) return normalize({});
    return normalize(JSON.parse(raw) as Partial<UserProgress>);
  } catch {
    return normalize({});
  }
}

/* ---------- Эло ---------- */

const eloDeltaWin = (elo: number, puzzleRating: number) => {
  const expected = 1 / (1 + Math.pow(10, (puzzleRating - elo) / 400));
  return Math.max(4, Math.round(32 * (1 - expected)));
};
const eloDeltaLoss = (elo: number, puzzleRating: number) => {
  const expected = 1 / (1 + Math.pow(10, (puzzleRating - elo) / 400));
  return -Math.max(4, Math.round(32 * expected));
};

const levelOf = (xp: number) => Math.floor(xp / 100) + 1;

export interface SolvedMeta {
  xp: number;
  rating: number;
  mistakes: number; // неверных ходов при решении
  hintUsed: boolean;
  source: 'lesson' | 'practice' | 'daily' | 'review';
}

export function useProgress() {
  const { user } = useAuth();
  const storageKey = keyFor(user?.id || 'guest');
  const [progress, setProgress] = useState<UserProgress>(() => loadProgress(storageKey));
  const [loaded, setLoaded] = useState(false);
  const [loadedKey, setLoadedKey] = useState(storageKey);

  useEffect(() => {
    if (storageKey !== loadedKey) {
      setProgress(loadProgress(storageKey));
      setLoadedKey(storageKey);
    }
    setLoaded(true);
  }, [storageKey, loadedKey]);

  useEffect(() => {
    if (loaded && loadedKey === storageKey) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(progress));
      } catch { /* ignore */ }
    }
  }, [progress, loaded, loadedKey, storageKey]);

  /** Общая обработка «задача решена»: XP, Эло, серия, неделя, миссии */
  const applySolved = (prev: UserProgress, meta: SolvedMeta): UserProgress => {
    const today = todayKey();
    const wasToday = prev.lastPlayed === today;
    const newXp = prev.xp + meta.xp;

    const next: UserProgress = {
      ...prev,
      xp: newXp,
      level: levelOf(newXp),
      streak: wasToday ? prev.streak : prev.streak + 1,
      lastPlayed: today,
      puzzleElo:
        meta.source === 'review'
          ? prev.puzzleElo
          : Math.max(
              100,
              prev.puzzleElo + (meta.mistakes === 0 ? eloDeltaWin(prev.puzzleElo, meta.rating) : Math.round(eloDeltaWin(prev.puzzleElo, meta.rating) / 2))
            ),
      weekly: { ...prev.weekly, xp: prev.weekly.xp + meta.xp },
    };

    // Миссии (review не считается — защита от фарма)
    if (meta.source !== 'review') {
      next.daily = {
        ...next.daily,
        missions: next.daily.missions.map((m) => {
          if (m.claimed) return m;
          let add = 0;
          if (m.id === 'solve3' || m.id === 'solve5') add = 1;
          if (m.id === 'nohint2') add = meta.hintUsed ? 0 : 1;
          if (m.id === 'perfect2' || m.id === 'perfect3') add = meta.mistakes === 0 ? 1 : 0;
          if (m.id === 'xp100') add = meta.xp;
          if (!add) return m;
          const p = Math.min(m.progress + add, m.goal);
          return { ...m, progress: p, claimed: m.claimed || p >= m.goal };
        }),
      };
      // разово начисляем бонусы миссий, завершённых в этом проходе
      let bonus = 0;
      const before = prev.daily.missions;
      for (let i = 0; i < next.daily.missions.length; i++) {
        const wasDone = before[i]?.claimed;
        const nowDone = next.daily.missions[i].claimed;
        if (!wasDone && nowDone) bonus += next.daily.missions[i].bonusXp;
      }
      if (bonus) {
        next.xp += bonus;
        next.level = levelOf(next.xp);
        next.weekly = { ...next.weekly, xp: next.weekly.xp + bonus };
      }
    }

    return next;
  };

  const completePuzzle = useCallback((puzzleId: string, xp: number, meta?: Omit<SolvedMeta, 'xp' | 'source'>) => {
    setProgress((prev) => {
      const base = applySolved(prev, { xp, rating: meta?.rating ?? 1000, mistakes: meta?.mistakes ?? 0, hintUsed: meta?.hintUsed ?? false, source: 'lesson' });
      if (base === prev) return prev;
      if (base.completedPuzzles.includes(puzzleId)) return base;
      return {
        ...base,
        completedPuzzles: [...base.completedPuzzles, puzzleId],
      };
    });
  }, []);

  /** Решение вне уроков: практика / пазл дня / выживание (не отмечает уроки) */
  const noteExternalSolved = useCallback((meta: SolvedMeta) => {
    setProgress((prev) => applySolved(prev, meta));
  }, []);

  const noteDailyPuzzleDone = useCallback((meta: Omit<SolvedMeta, 'source' | 'rating'> & { rating: number }) => {
    setProgress((prev) => {
      const base = applySolved(prev, { ...meta, source: 'daily' });
      return { ...base, daily: { ...base.daily, dailyPuzzleDone: true } };
    });
  }, []);

  /** Провал задачи (конец жизни в Выживании) — минус Эло */
  const notePuzzleFailed = useCallback((rating: number) => {
    setProgress((prev) => ({
      ...prev,
      puzzleElo: Math.max(100, prev.puzzleElo + eloDeltaLoss(prev.puzzleElo, rating)),
    }));
  }, []);

  const completeLesson = useCallback((lessonId: string) => {
    setProgress((prev) => {
      if (prev.completedLessons.includes(lessonId)) return prev;
      return {
        ...prev,
        completedLessons: [...prev.completedLessons, lessonId],
      };
    });
  }, []);

  /* ---------- Тетрадь ошибок ---------- */

  const recordMistake = useCallback((entry: Omit<MistakeEntry, 'ts'>) => {
    setProgress((prev) => {
      // дедуп: одна и та же позиция + тот же неверный ход
      if (prev.mistakes.some((m) => m.puzzleId === entry.puzzleId && m.playedSan === entry.playedSan && m.fen === entry.fen)) return prev;
      const next = [{ ...entry, ts: Date.now() }, ...prev.mistakes];
      return { ...prev, mistakes: next.slice(0, 100) };
    });
  }, []);

  const removeMistake = useCallback((puzzleId: string, fen: string) => {
    setProgress((prev) => ({
      ...prev,
      mistakes: prev.mistakes.filter((m) => !(m.puzzleId === puzzleId && m.fen === fen)),
    }));
  }, []);

  /* ---------- Партии ---------- */

  const addGame = useCallback((rec: Omit<GameRecord, 'id' | 'date'>) => {
    setProgress((prev) => ({
      ...prev,
      gameHistory: [
        { ...rec, id: `g${Date.now()}`, date: new Date().toISOString() },
        ...prev.gameHistory,
      ].slice(0, 20),
    }));
  }, []);

  /* ---------- Выживание ---------- */

  const noteSurvivalScore = useCallback((xp: number, combo: number) => {
    setProgress((prev) => {
      if (prev.survivalBest && prev.survivalBest.xp >= xp) return prev;
      return { ...prev, survivalBest: { xp, combo, date: todayKey() } };
    });
  }, []);

  const resetProgress = useCallback(() => {
    setProgress(normalize({}));
  }, []);

  /** Полная замена (импорт профиля) */
  const replaceProgress = useCallback((data: Partial<UserProgress>) => {
    setProgress(normalize(data));
  }, []);

  return {
    progress, loaded,
    completePuzzle, noteExternalSolved, noteDailyPuzzleDone, notePuzzleFailed,
    completeLesson, recordMistake, removeMistake,
    addGame, noteSurvivalScore, resetProgress, replaceProgress,
  };
}
