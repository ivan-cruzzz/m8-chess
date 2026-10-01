/** Публичный API AI-слоя: движок (воркер/поиск) и LLM-тренёр. */
export { searchBestMove, bestMove, levelConfig, LEVELS, MIN_LEVEL, MAX_LEVEL, evaluate, PIECE_VALUE, MATE_SCORE, MATE_IN_MAX } from './engine';
export type { SearchResult, SearchOptions, SearchProgress, SearchLimits, LevelPersonality, EngineRequest, EngineResponse } from './engine';
export { EngineClient, engineClient } from './client/engineClient';
export type { EngineSearchHandle } from './client/engineClient';
export { askCoach, isCoachAvailable, getCachedResponse, putCachedResponse, clearCoachCache, coachCacheKey, PROMPT_VERSION } from './coach';
export type { CoachRequest, CoachResponse, CoachResult, CoachAction, CoachLang, CoachFailureReason } from './coach';
