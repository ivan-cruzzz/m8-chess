/** Контракты AI-слоя: параметры поиска, результат, протокол Web Worker. */

export interface SearchLimits {
  maxDepth: number;
  timeBudgetMs: number;
}

/** Персона уровня сложности: чем выше уровень, тем глубже поиск и меньше «человеческих ошибок». */
export interface LevelPersonality {
  depth: number;
  timeBudgetMs: number;
  /** Амплитуда шума оценки в сантипешках: слабые уровни выбирают ход среди близких по качеству. */
  noise: number;
  /** Вероятность полностью случайного хода (персона «зевак»), 0..1. */
  blunderChance: number;
}

export interface SearchResult {
  san: string | null;
  /** Глубина полностью завершённой итерации. */
  depth: number;
  scoreCp: number;
  nodes: number;
  timeMs: number;
}

export interface SearchProgress {
  depth: number;
  san: string;
  scoreCp: number;
  nodes: number;
}

export interface SearchOptions {
  timeBudgetMs?: number;
  maxDepth?: number;
  /** Инъекция ГПСЧ для тестируемости персона слабых уровней. */
  rng?: () => number;
  onProgress?: (info: SearchProgress) => void;
}

/** Сообщения главного потока → воркеру. */
export type EngineRequest =
  | { type: 'search'; id: number; fen: string; level: number; timeBudgetMs?: number }
  | { type: 'stop' };

/** Сообщения воркера → главному потоку. */
export type EngineResponse =
  | { type: 'ready' }
  | { type: 'search-progress'; id: number; info: SearchProgress }
  | { type: 'search-result'; id: number; result: SearchResult }
  | { type: 'error'; id: number; message: string };

/** Мат ближе обычной оценки: MATE_SCORE − ply. */
export const MATE_SCORE = 100_000;
export const MATE_IN_MAX = MATE_SCORE - 1_000;
