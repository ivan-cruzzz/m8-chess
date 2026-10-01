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
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
  icon: string;
}
