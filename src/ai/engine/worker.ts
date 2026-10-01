import { searchBestMove } from './search';
import type { EngineRequest, EngineResponse } from './types';

/**
 * Entry-point Web Worker'а шахматного движка.
 *
 * Протокол — EngineRequest/EngineResponse (см. types.ts). Особенность:
 * поиск синхронен и занимает воркер целиком, поэтому сообщение 'stop'
 * физически не может быть обработано до завершения поиска (очередь сообщений).
 * Реальная отмена выполняется на клиенте: EngineClient отбрасывает результат
 * по id, а максимальная занятость воркера ограничена бюджетом времени поиска.
 */
interface WorkerContext {
  onmessage: ((e: MessageEvent<EngineRequest>) => void) | null;
  postMessage(message: EngineResponse): void;
}

const ctx = self as unknown as WorkerContext;

ctx.onmessage = (e: MessageEvent<EngineRequest>) => {
  const req = e.data;
  if (req.type !== 'search') return; // 'stop' — см. комментарий выше
  try {
    const result = searchBestMove(req.fen, req.level, {
      timeBudgetMs: req.timeBudgetMs,
      onProgress: (info) => ctx.postMessage({ type: 'search-progress', id: req.id, info }),
    });
    ctx.postMessage({ type: 'search-result', id: req.id, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    ctx.postMessage({ type: 'error', id: req.id, message });
  }
};
