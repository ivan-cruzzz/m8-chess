/** Контракты LLM-тренёра: запросы, ответы, результат вызова сервиса. */

export type CoachAction = 'hint' | 'explain' | 'review';
export type CoachLang = 'ru' | 'en';

export interface CoachRequest {
  action: CoachAction;
  /** Позиция в FEN (для hint/explain). */
  fen?: string;
  /** Ход игрока (для explain — обычно неверный). */
  san?: string;
  /** Правильный ход (для explain, когда он уже раскрыт). */
  correctSan?: string;
  /** Партия SAN-ходами от начала (для review). */
  moves?: string[];
  /** Идентификатор задачи — попадает в кэш-ключ и промпт. */
  puzzleId?: string;
  lang: CoachLang;
}

export interface CoachResponse {
  title: string;
  text: string;
}

export type CoachFailureReason =
  | 'offline'
  | 'unauthorized'
  | 'quota_exceeded'
  | 'not_configured'
  | 'error';

export type CoachResult =
  | { ok: true; data: CoachResponse; cached: boolean }
  | { ok: false; reason: CoachFailureReason };
