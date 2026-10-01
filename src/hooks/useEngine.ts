import { useCallback, useEffect, useRef } from 'react';
import { engineClient } from '../ai/client/engineClient';
import type { EngineSearchHandle } from '../ai/client/engineClient';

/**
 * Доступ к шахматному движку из компонентов. Поиск идёт в Web Worker'е
 * (fallback — синхронно, см. engineClient), поэтому главный поток не блокируется.
 *
 * — findBestMove(fen, level) → Promise<SAN | null>; новый вызов отменяет предыдущий;
 * — stop() отменяет текущий поиск (вызывается и при размонтировании).
 */
export function useEngine() {
  const handleRef = useRef<EngineSearchHandle | null>(null);

  useEffect(() => {
    const handle = handleRef;
    return () => handle.current?.cancel();
  }, []);

  const findBestMove = useCallback((fen: string, level: number): Promise<string | null> => {
    handleRef.current?.cancel();
    const handle = engineClient.search(fen, level);
    handleRef.current = handle;
    return handle.promise.then((r) => r.san);
  }, []);

  const stop = useCallback(() => {
    handleRef.current?.cancel();
    handleRef.current = null;
  }, []);

  return { findBestMove, stop };
}
