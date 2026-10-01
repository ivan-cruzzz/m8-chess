/**
 * @deprecated Модуль оставлен как тонкая обёртка для обратной совместимости.
 * Новая реализация: src/ai/engine (итеративное углубление, TT, quiescence,
 * бюджет времени). Игровой код должен переходить на useEngine()/src/ai/engine.
 */
import { bestMove as searchMove } from '../ai/engine';

export { searchBestMove } from '../ai/engine';

/** Лучший ход для стороны, чья очередь. @deprecated используйте src/ai/engine */
export function bestMove(fen: string, level: number): string | null {
  return searchMove(fen, level);
}

/** Обёртка с задержкой для UX. @deprecated используйте useEngine() */
export function bestMoveAsync(fen: string, level: number, cb: (san: string | null) => void) {
  // Бюджет времени нового движка ограничивает поиск; задержка — только чтобы
  // ход ИИ не «моргал» мгновенно на слабых уровнях.
  const delay = 200 + Math.random() * 300;
  setTimeout(() => cb(bestMove(fen, level)), delay);
}
