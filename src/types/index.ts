export interface Puzzle {
  id: string;
  fen: string;
  solution: string[]; // algebraic notation moves
  hint: string;
  theme: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  xp: number;
  rating: number;
}

export interface Lesson {
  id: string;
  title: string;
  theme: string;
  puzzles: string[]; // puzzle IDs
  completed: boolean;
  locked: boolean;
  position: { x: number; y: number };
}

/** Запись в тетради ошибок */
export interface MistakeEntry {
  puzzleId: string;
  fen: string;
  playedSan: string;
  correctSan: string;
  theme: string;
  ts: number;
}

/** Сыгранная партия (против ИИ или hot-seat) */
export interface GameRecord {
  id: string;
  date: string;
  mode: 'ai' | 'hotseat';
  level?: number;
  color?: 'w' | 'b';
  result: 'w' | 'b' | 'draw';
  moves: string[]; // SAN
}

/** Ежедневная миссия */
export interface DailyMission {
  id: string;
  goal: number;
  progress: number;
  bonusXp: number;
  claimed: boolean;
}

export interface UserProgress {
  xp: number;
  level: number;
  streak: number;
  lastPlayed: string | null;
  completedPuzzles: string[];
  completedLessons: string[];
  currentLesson: string | null;
  /** Персональный рейтинг задач (как Эло на lichess) */
  puzzleElo: number;
  /** Ежедневные миссии и пазл дня */
  daily: { dateKey: string; missions: DailyMission[]; dailyPuzzleDone: boolean };
  /** Недельный счётчик XP для лиги */
  weekly: { weekKey: string; xp: number; lastPlace: number | null };
  /** Дивизион лиги: 3 — бронза, 2 — серебро, 1 — золото */
  leagueDiv: 1 | 2 | 3;
  /** Рекорд режима Выживание */
  survivalBest: { xp: number; combo: number; date: string } | null;
  /** Тетрадь ошибок */
  mistakes: MistakeEntry[];
  /** История партий (до 20) */
  gameHistory: GameRecord[];
  /** Активность по дням (ключ YYYY-MM-DD → число решённых задач); дозаполняется normalize() */
  activityLog: Record<string, number>;
  /** Рекорд Блиц-спринта; дозаполняется normalize() */
  sprintBest: SprintBest | null;
  /** Пройденные дебюты (id); XP за дебют начисляется один раз; дозаполняется normalize() */
  openingsStudied: string[];
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
  icon: string;
}

/* ================= Админ-панель и новые режимы ================= */

/** Тариф подписки. Каноническое определение — здесь; одноимённый union
 *  в SubscriptionContext структурно идентичен и взаимно совместим с ним */
export type Plan = 'free' | 'monthly' | 'yearly' | 'lifetime';

/** Промокод на премиум (локальное хранилище админ-панели) */
export interface Promo {
  code: string;
  plan: Plan;
  /** Срок действия, выдаваемый промокодом, в днях */
  days: number;
  maxUses: number;
  uses: number;
  active: boolean;
}

/** Рекорд Блиц-спринта */
export interface SprintBest {
  score: number;
  /** Дата рекорда, YYYY-MM-DD */
  date: string;
}

/** Локально выданный план пользователя; until — ISO-срок.
 *  Старое хранение (строка 'monthly') читается как { plan: 'monthly' } */
export interface LocalPlan {
  plan: Plan;
  until?: string;
}

/** Данные дашборда админ-панели (собирается по локальным прогрессам) */
export interface DashboardData {
  userCount: number;
  /** Активные за последние 7 дней */
  active7d: number;
  totalXp: number;
  totalSolved: number;
  premiumCount: number;
  /** 14 слотов от сегодняшнего дня назад (date YYYY-MM-DD → число задач) */
  activity14: { date: string; count: number }[];
  /** Темы с наибольшим числом ошибок, по убыванию */
  weakThemes: { theme: string; count: number }[];
  /** Задачи по числу решивших пользователей: сначала наименее решённые */
  hardestPuzzles: { id: string; theme: string; solvedBy: number }[];
}
