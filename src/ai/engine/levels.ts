import type { LevelPersonality } from './types';

/**
 * Персоны уровней 1–8. В отличие от старой карты (только глубина 1–3 и шум),
 * здесь у каждого уровня свой бюджет времени, а сильные уровни получают
 * глубину 4–6 с гарантированным возвратом хода в рамках бюджета.
 */
export const LEVELS: Record<number, LevelPersonality> = {
  1: { depth: 1, timeBudgetMs: 120, noise: 120, blunderChance: 0.25 },
  2: { depth: 1, timeBudgetMs: 160, noise: 70, blunderChance: 0.1 },
  3: { depth: 2, timeBudgetMs: 250, noise: 45, blunderChance: 0.05 },
  4: { depth: 3, timeBudgetMs: 350, noise: 25, blunderChance: 0 },
  5: { depth: 3, timeBudgetMs: 450, noise: 15, blunderChance: 0 },
  6: { depth: 4, timeBudgetMs: 550, noise: 8, blunderChance: 0 },
  7: { depth: 5, timeBudgetMs: 700, noise: 0, blunderChance: 0 },
  8: { depth: 6, timeBudgetMs: 800, noise: 0, blunderChance: 0 },
};

export const MIN_LEVEL = 1;
export const MAX_LEVEL = 8;

export function levelConfig(level: number): LevelPersonality {
  const clamped = Math.max(MIN_LEVEL, Math.min(MAX_LEVEL, Math.trunc(level) || MIN_LEVEL));
  return LEVELS[clamped];
}
