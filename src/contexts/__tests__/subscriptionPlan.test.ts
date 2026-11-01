import { describe, it, expect } from 'vitest';
import { planFromStored } from '../SubscriptionContext';

// Фиксированное «сейчас», чтобы тесты срока не зависели от часов машины
const NOW = new Date('2026-11-01T12:00:00Z');

describe('planFromStored: совместимость чтения локального плана', () => {
  it('отсутствие значения — free', () => {
    expect(planFromStored(null, NOW)).toBe('free');
    expect(planFromStored('', NOW)).toBe('free');
  });

  it('старое хранение — строка плана без срока, читается как бессрочный план', () => {
    expect(planFromStored('monthly', NOW)).toBe('monthly');
    expect(planFromStored('yearly', NOW)).toBe('yearly');
    expect(planFromStored('lifetime', NOW)).toBe('lifetime');
    expect(planFromStored('free', NOW)).toBe('free');
  });

  it('новое хранение {plan, until} — срок в будущем: план активен', () => {
    const raw = JSON.stringify({ plan: 'yearly', until: '2026-12-01T00:00:00.000Z' });
    expect(planFromStored(raw, NOW)).toBe('yearly');
  });

  it('новое хранение {plan, until} — срок в прошлом: free', () => {
    const raw = JSON.stringify({ plan: 'monthly', until: '2026-10-01T00:00:00.000Z' });
    expect(planFromStored(raw, NOW)).toBe('free');
  });

  it('граница срока: until === now уже считается истёкшим (free)', () => {
    const raw = JSON.stringify({ plan: 'monthly', until: '2026-11-01T12:00:00.000Z' });
    expect(planFromStored(raw, NOW)).toBe('free');
  });

  it('{plan} без срока — бессрочный', () => {
    expect(planFromStored(JSON.stringify({ plan: 'lifetime' }), NOW)).toBe('lifetime');
  });

  it('битый JSON и неизвестный план — free, а не падение', () => {
    expect(planFromStored('{oops', NOW)).toBe('free');
    expect(planFromStored(JSON.stringify({ plan: 'gold' }), NOW)).toBe('free');
    expect(planFromStored('diamond', NOW)).toBe('free');
  });
});
