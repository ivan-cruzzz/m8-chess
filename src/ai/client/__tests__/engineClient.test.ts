import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { EngineClient } from '../engineClient';
import type { EngineWorker } from '../engineClient';
import type { SearchResult } from '../../engine/types';

const START_FEN = new Chess().fen();
const RESULT: SearchResult = { san: 'e4', depth: 3, scoreCp: 15, nodes: 100, timeMs: 5 };

/** Фейковый воркер: отвечает вручную из теста, имитируя message-протокол. */
class FakeWorker implements EngineWorker {
  onmessage: ((e: { data: unknown }) => void) | null = null;
  onerror: (() => void) | null = null;
  posted: unknown[] = [];
  terminated = false;

  postMessage(message: unknown): void {
    this.posted.push(message);
  }

  terminate(): void {
    this.terminated = true;
  }

  reply(id: number, result: SearchResult): void {
    queueMicrotask(() => this.onmessage?.({ data: { type: 'search-result', id, result } }));
  }

  replyError(id: number, message: string): void {
    queueMicrotask(() => this.onmessage?.({ data: { type: 'error', id, message } }));
  }
}

describe('EngineClient: RPC через воркер (инъекция фабрики)', () => {
  it('передаёт запрос в воркер и получает результат по id', async () => {
    const fake = new FakeWorker();
    const client = new EngineClient({ createWorker: () => fake });
    const handle = client.search(START_FEN, 8);
    expect(client.usesWorker).toBe(true);
    expect(fake.posted).toEqual([{ type: 'search', id: 1, fen: START_FEN, level: 8, timeBudgetMs: undefined }]);
    fake.reply(1, RESULT);
    await expect(handle.promise).resolves.toEqual(RESULT);
  });

  it('id запросов монотонно растут', async () => {
    const fake = new FakeWorker();
    const client = new EngineClient({ createWorker: () => fake });
    const h1 = client.search(START_FEN, 1);
    const h2 = client.search(START_FEN, 2);
    fake.reply(2, RESULT);
    fake.reply(1, { ...RESULT, san: 'd4' });
    const [r2, r1] = await Promise.all([h2.promise, h1.promise]);
    expect(r2.san).toBe('e4');
    expect(r1.san).toBe('d4');
  });

  it('отмена резолвит пустым результатом; поздний ответ воркера игнорируется', async () => {
    const fake = new FakeWorker();
    const client = new EngineClient({ createWorker: () => fake });
    const handle = client.search(START_FEN, 8);
    handle.cancel();
    await expect(handle.promise).resolves.toMatchObject({ san: null });
    // Поздний ответ не должен падать и не должен резолвить отменённый запрос
    fake.reply(1, RESULT);
    await expect(handle.promise).resolves.toMatchObject({ san: null });
  });

  it('ошибка воркера реджектит ожидание и переводит клиент в sync-режим', async () => {
    const fake = new FakeWorker();
    const client = new EngineClient({ createWorker: () => fake });
    const handle = client.search(START_FEN, 8);
    fake.onerror?.();
    await expect(handle.promise).rejects.toThrow('engine worker failed');
    expect(fake.terminated).toBe(true);
    expect(client.usesWorker).toBe(false);
    // Дальше — синхронный fallback с реальным движком
    const res = await client.search(START_FEN, 1).promise;
    expect(res.san).not.toBeNull();
    expect(new Chess(START_FEN).moves()).toContain(res.san);
  });

  it('ошибочный ответ протокола реджектит промис', async () => {
    const fake = new FakeWorker();
    const client = new EngineClient({ createWorker: () => fake });
    const handle = client.search(START_FEN, 8);
    fake.replyError(1, 'boom');
    await expect(handle.promise).rejects.toThrow('boom');
  });

  it('фабрика, вернувшая null, отключает воркер навсегда', async () => {
    let calls = 0;
    const client = new EngineClient({
      createWorker: () => {
        calls++;
        return null;
      },
    });
    await client.search(START_FEN, 1).promise;
    await client.search(START_FEN, 1).promise;
    expect(calls).toBe(1); // повторно фабрика не вызывается
  });
});

describe('EngineClient: sync-fallback (Worker недоступен)', () => {
  it('возвращает легальный ход из стартовой позиции', async () => {
    const client = new EngineClient();
    const res = await client.search(START_FEN, 8).promise;
    expect(client.usesWorker).toBe(false);
    expect(res.san).not.toBeNull();
    expect(new Chess(START_FEN).moves()).toContain(res.san);
  });

  it('отмена до выполнения резолвится пустым результатом', async () => {
    const client = new EngineClient();
    const handle = client.search(START_FEN, 8);
    handle.cancel();
    const res = await handle.promise;
    expect(res.san).toBeNull();
  });

  it('null на позиции без ходов', async () => {
    const client = new EngineClient();
    const fen = 'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 0 3';
    const res = await client.search(fen, 5).promise;
    expect(res.san).toBeNull();
  });

  it('экземпляры клиента изолированы', async () => {
    const a = new EngineClient();
    const b = new EngineClient();
    const [ra, rb] = await Promise.all([a.search(START_FEN, 1).promise, b.search(START_FEN, 1).promise]);
    expect(ra.san).not.toBeNull();
    expect(rb.san).not.toBeNull();
  });
});
