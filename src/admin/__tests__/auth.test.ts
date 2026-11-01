import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  adminPasswordExists,
  setupAdminPassword,
  verifyAdminPassword,
  startAdminSession,
  adminSessionActive,
  endAdminSession,
} from '../auth';

// Тестовый пароль: только здесь, в хранилище попадать не должен ни в каком виде
const PW = 'test-password-123';

/** Собирает всё содержимое обоих хранилищ одной строкой — для проверки «пароля нигде нет» */
function allStorageText(): string {
  const parts: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)!;
    parts.push(k, localStorage.getItem(k) ?? '');
  }
  for (let i = 0; i < sessionStorage.length; i++) {
    const k = sessionStorage.key(i)!;
    parts.push(k, sessionStorage.getItem(k) ?? '');
  }
  return parts.join('\n');
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe('admin auth: пароль', () => {
  it('до установки пароля adminPasswordExists() = false', () => {
    expect(adminPasswordExists()).toBe(false);
  });

  it('setupAdminPassword хранит только saltHex:hashHex — пароля в хранилищах нет', async () => {
    await setupAdminPassword(PW);
    expect(adminPasswordExists()).toBe(true);
    // Ровно один ключ, значение строго "16-байтная соль : 32-байтный хеш" в hex
    expect(localStorage.length).toBe(1);
    const raw = localStorage.getItem(localStorage.key(0)!);
    expect(raw).toMatch(/^[0-9a-f]{32}:[0-9a-f]{64}$/);
    // Ни пароль, ни его обрывок не просачиваются ни в один ключ обоих хранилищ
    expect(allStorageText()).not.toContain(PW);
    expect(allStorageText()).not.toContain('password');
  });

  it('verifyAdminPassword: верный пароль true, неверный false', async () => {
    await setupAdminPassword(PW);
    expect(await verifyAdminPassword(PW)).toBe(true);
    expect(await verifyAdminPassword('другой-пароль')).toBe(false);
  });

  it('повторный setupAdminPassword падает — пароль уже задан', async () => {
    await setupAdminPassword(PW);
    await expect(setupAdminPassword('second')).rejects.toThrow();
  });
});

describe('admin auth: сессия на 30 минут', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('start/end: сразу после входа сессия активна, после endAdminSession — нет', () => {
    expect(adminSessionActive()).toBe(false);
    startAdminSession();
    expect(adminSessionActive()).toBe(true);
    endAdminSession();
    expect(adminSessionActive()).toBe(false);
  });

  it('сессия живёт 30 минут и истекает (время подменено)', () => {
    vi.useFakeTimers();
    const base = new Date('2026-11-01T12:00:00Z').getTime();
    vi.setSystemTime(base);

    startAdminSession();
    // за минуту до истечения — ещё активна
    vi.setSystemTime(base + 29 * 60 * 1000);
    expect(adminSessionActive()).toBe(true);
    // через 31 минуту — истекла
    vi.setSystemTime(base + 31 * 60 * 1000);
    expect(adminSessionActive()).toBe(false);
  });
});
