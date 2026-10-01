import { searchBestMove } from '../engine/search';
import type { EngineResponse, SearchResult } from '../engine/types';

/**
 * RPC-клиент движка: главный поток общается с Web Worker'ом по протоколу
 * EngineRequest/EngineResponse. Отмена — по id: отменённый запрос резолвится
 * «пустым» результатом (san: null), чтобы await не зависал.
 *
 * Если Worker недоступен (старый WebView, тестовое окружение) — синхронный
 * fallback: поиск выполняется на главном потоке в setTimeout-задаче,
 * бюджет времени движка ограничивает блокировку. Фабрика воркера injectable
 * для юнит-тестов RPC-пути.
 */

/** Минимальный структурный тип воркера — реальный Worker ему удовлетворяет. */
export interface EngineWorker {
  postMessage(message: unknown): void;
  terminate(): void;
  onmessage: ((e: { data: EngineResponse }) => void) | null;
  onerror: (() => void) | null;
}

export interface EngineClientOptions {
  createWorker?: () => EngineWorker | null;
}

export interface EngineSearchHandle {
  promise: Promise<SearchResult>;
  cancel(): void;
}

const NULL_RESULT: SearchResult = { san: null, depth: 0, scoreCp: 0, nodes: 0, timeMs: 0 };

interface PendingEntry {
  fen: string;
  level: number;
  timeBudgetMs?: number;
  resolve: (r: SearchResult) => void;
  reject: (e: Error) => void;
}

export class EngineClient {
  private worker: EngineWorker | null = null;
  private workerBroken = false;
  private nextId = 1;
  private pending = new Map<number, PendingEntry>();
  private readonly createWorker: () => EngineWorker | null;

  constructor(options: EngineClientOptions = {}) {
    this.createWorker = options.createWorker ?? defaultCreateWorker;
  }

  /** Виден наружу для диагностики: работает ли поиск в воркере. */
  get usesWorker(): boolean {
    return this.worker !== null;
  }

  search(fen: string, level: number, timeBudgetMs?: number): EngineSearchHandle {
    const worker = this.ensureWorker();
    if (!worker) return this.searchSync(fen, level, timeBudgetMs);

    const id = this.nextId++;
    let settle: (r: SearchResult) => void = () => {};
    const promise = new Promise<SearchResult>((resolve, reject) => {
      settle = resolve;
      this.pending.set(id, { fen, level, timeBudgetMs, resolve, reject });
    });
    worker.postMessage({ type: 'search', id, fen, level, timeBudgetMs });

    return {
      promise,
      cancel: () => {
        // Запрос уже отвечен или уже отменён — не трогаем
        if (this.pending.delete(id)) settle(NULL_RESULT);
      },
    };
  }

  private searchSync(fen: string, level: number, timeBudgetMs?: number): EngineSearchHandle {
    let cancelled = false;
    return {
      promise: new Promise<SearchResult>((resolve) => {
        setTimeout(() => {
          resolve(cancelled ? NULL_RESULT : searchBestMove(fen, level, { timeBudgetMs }));
        }, 0);
      }),
      cancel: () => {
        cancelled = true;
      },
    };
  }

  private ensureWorker(): EngineWorker | null {
    if (this.worker) return this.worker;
    if (this.workerBroken) return null;
    const worker = this.createWorker();
    if (!worker) {
      this.workerBroken = true;
      return null;
    }
    this.worker = worker;
    worker.onmessage = (e) => {
      const msg = e.data;
      if (msg.type === 'search-result' || msg.type === 'error') {
        const entry = this.pending.get(msg.id);
        if (!entry) return; // результат уже отменён
        this.pending.delete(msg.id);
        if (msg.type === 'search-result') entry.resolve(msg.result);
        else entry.reject(new Error(msg.message));
      }
      // 'search-progress' и 'ready' здесь не нужны; прогресс зарезервирован
      // под будущую индикацию глубины в UI
    };
    worker.onerror = () => {
      // Воркер не работает (сбой загрузки/окружения): переводим клиент в
      // синхронный режим навсегда и ПЕРЕЗАПУСКАем незавершённые поиски
      // синхронно — игра не должна зависать ни при каких условиях
      this.workerBroken = true;
      this.worker?.terminate();
      this.worker = null;
      const stuck = [...this.pending.values()];
      this.pending.clear();
      for (const entry of stuck) {
        this.searchSync(entry.fen, entry.level, entry.timeBudgetMs).promise.then(entry.resolve).catch(() => entry.resolve(NULL_RESULT));
      }
    };
    return this.worker;
  }
}

function defaultCreateWorker(): EngineWorker | null {
  if (typeof Worker === 'undefined') return null;
  try {
    return new Worker(new URL('../engine/worker.ts', import.meta.url), { type: 'module' }) as unknown as EngineWorker;
  } catch {
    return null;
  }
}

/** Синглтон на всё приложение: один воркер обслуживает все экраны. */
export const engineClient = new EngineClient();
