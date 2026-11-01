/**
 * Данные админ-панели без React. Читает чужие данные устройства только через
 * контрактные функции; имена ключей и шейпы хранения — деталь модуля.
 * Supabase используется лишь когда клиент настроен, иначе все локальные
 * списки работают офлайн.
 */
import type { UserProgress, Promo, LocalPlan, DashboardData, Plan } from '../types';
import { defaultProgress } from '../data/lessons';
import { getPuzzleById } from '../data/puzzles';
import { supabase } from '../lib/supabase';

const USERS_KEY = 'chessup-users';
const PROGRESS_PREFIX = 'chessup-progress:';
const PLAN_PREFIX = 'chessup-plan:';
const PROMOS_KEY = 'chessup-promos';

/** Строка таблицы profiles (Supabase), нужная панели */
export interface SupabaseRow {
  id: string;
  username?: string;
  role?: string;
  banned?: boolean;
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* ignore */ }
}

/** Дозаполнение новых полей у старых сохранений (те же значения, что в normalize хука) */
function withDefaults(p: Partial<UserProgress>): UserProgress {
  return {
    ...defaultProgress,
    ...p,
    activityLog: p.activityLog ?? {},
    sprintBest: p.sprintBest ?? null,
    openingsStudied: p.openingsStudied ?? [],
  };
}

const isoDate = (d: Date) => d.toISOString().split('T')[0];

/* ================= Локальные пользователи ================= */

export function listLocalUsers(): { email: string; username: string }[] {
  return readJson<{ username?: string; email: string }[]>(USERS_KEY, []).map((u) => ({
    email: u.email,
    username: u.username ?? u.email.split('@')[0],
  }));
}

export function readProgressFor(userId: string): UserProgress | null {
  const raw = localStorage.getItem(PROGRESS_PREFIX + userId);
  if (!raw) return null;
  try {
    return withDefaults(JSON.parse(raw) as Partial<UserProgress>);
  } catch {
    return null;
  }
}

/** Сброс прогресса: пользователь остаётся, прогресс возвращается к дефолтному */
export function resetProgressFor(userId: string): void {
  writeJson(PROGRESS_PREFIX + userId, withDefaults({}));
}

/** Удаление локального пользователя вместе с прогрессом и выданным планом */
export function deleteLocalUser(email: string): void {
  const users = readJson<{ username?: string; email: string }[]>(USERS_KEY, []).filter((u) => u.email !== email);
  writeJson(USERS_KEY, users);
  try {
    localStorage.removeItem(PROGRESS_PREFIX + email);
    localStorage.removeItem(PLAN_PREFIX + email);
  } catch { /* ignore */ }
}

/* ================= Supabase-пользователи (когда включён) ================= */

/** null — когда Supabase выключен или недоступен */
export async function listSupabaseUsers(): Promise<SupabaseRow[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from('profiles').select('id, username, role, banned');
  if (error) return null;
  return (data ?? []) as SupabaseRow[];
}

/** Блокировка/разблокировка: колонка profiles.banned, доступна роли admin по RLS */
export async function setUserBanned(id: string, banned: boolean): Promise<void> {
  if (!supabase) throw new Error('supabase_disabled');
  const { error } = await supabase.from('profiles').update({ banned }).eq('id', id);
  if (error) throw new Error(error.message);
}

/* ================= Премиум: локальные планы ================= */

export function setUserPlan(userId: string, plan: Plan, untilIso?: string): void {
  const grant: LocalPlan = untilIso ? { plan, until: untilIso } : { plan };
  writeJson(PLAN_PREFIX + userId, grant);
}

/** Отбор плана: ключ удаляется, подписка возвращается к free */
export function revokeUserPlan(userId: string): void {
  try {
    localStorage.removeItem(PLAN_PREFIX + userId);
  } catch { /* ignore */ }
}

export function listLocalPlans(): { userId: string; grant: LocalPlan }[] {
  const out: { userId: string; grant: LocalPlan }[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(PLAN_PREFIX)) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      // Обратная совместимость: старое значение — строка плана ('monthly'), новое — объект {plan, until?}
      let grant: LocalPlan;
      if (raw.startsWith('{')) {
        const parsed = readJson<Partial<LocalPlan>>(key, {});
        grant = { plan: (parsed.plan ?? 'free') as Plan, until: parsed.until };
      } else {
        grant = { plan: raw as Plan };
      }
      out.push({ userId: key.slice(PLAN_PREFIX.length), grant });
    }
  } catch { /* ignore */ }
  return out;
}

/* ================= Промокоды ================= */

export function savePromo(p: Promo): void {
  const promos = readJson<Promo[]>(PROMOS_KEY, []);
  const idx = promos.findIndex((x) => x.code === p.code);
  if (idx >= 0) promos[idx] = p;
  else promos.push(p);
  writeJson(PROMOS_KEY, promos);
}

export function listPromos(): Promo[] {
  return readJson<Promo[]>(PROMOS_KEY, []);
}

export function setPromoActive(code: string, active: boolean): void {
  const promos = readJson<Promo[]>(PROMOS_KEY, []);
  const promo = promos.find((x) => x.code === code);
  if (!promo) return;
  promo.active = active;
  writeJson(PROMOS_KEY, promos);
}

/** Чистая валидация: вызывающий сам инкрементирует uses и сохраняет */
export function validatePromo(promos: Promo[], code: string): { ok: true; promo: Promo } | { ok: false; error: 'not_found' | 'exhausted' | 'inactive' } {
  const promo = promos.find((x) => x.code === code);
  if (!promo) return { ok: false, error: 'not_found' };
  if (!promo.active) return { ok: false, error: 'inactive' };
  if (promo.uses >= promo.maxUses) return { ok: false, error: 'exhausted' };
  return { ok: true, promo };
}

/* ================= Дашборд ================= */

/** Все userId, у которых на устройстве есть прогресс */
function progressUserIds(): string[] {
  const ids: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(PROGRESS_PREFIX)) ids.push(key.slice(PROGRESS_PREFIX.length));
    }
  } catch { /* ignore */ }
  return ids;
}

/** План пользователя (с обратной совместимостью со строкой); null — не выдавался */
function planFor(userId: string): LocalPlan | null {
  const found = listLocalPlans().find((x) => x.userId === userId);
  return found ? found.grant : null;
}

function isPremium(grant: LocalPlan | null): boolean {
  if (!grant || grant.plan === 'free') return false;
  return !grant.until || new Date(grant.until) > new Date();
}

export function aggregateDashboard(): DashboardData {
  const cutoff7 = isoDate(new Date(Date.now() - 6 * 86400000)); // 7 календарных дней включая сегодня

  const userIds = progressUserIds();
  const progresses = userIds
    .map((id) => readProgressFor(id))
    .filter((p): p is UserProgress => p !== null);

  let totalXp = 0;
  let totalSolved = 0;
  let active7d = 0;
  let premiumCount = 0;
  const themeErrors = new Map<string, number>();
  const puzzleSolved = new Map<string, number>();

  for (let i = 0; i < progresses.length; i++) {
    const p = progresses[i];
    totalXp += p.xp;
    totalSolved += p.completedPuzzles.length;

    // Последний день любой активности: activityLog или (для старых профилей) lastPlayed
    const days = Object.keys(p.activityLog ?? {});
    const lastDay = days.length > 0 ? days.sort().at(-1)! : p.lastPlayed;
    if (lastDay && lastDay >= cutoff7) active7d++;

    if (isPremium(planFor(userIds[i]))) premiumCount++;

    for (const m of p.mistakes) themeErrors.set(m.theme, (themeErrors.get(m.theme) ?? 0) + 1);
    for (const id of p.completedPuzzles) puzzleSolved.set(id, (puzzleSolved.get(id) ?? 0) + 1);
  }

  // 14 слотов активности: от сегодня назад, счёт по всем пользователям
  const activity14: { date: string; count: number }[] = [];
  for (let offset = 13; offset >= 0; offset--) {
    const date = isoDate(new Date(Date.now() - offset * 86400000));
    let count = 0;
    for (const p of progresses) count += p.activityLog?.[date] ?? 0;
    activity14.push({ date, count });
  }

  const weakThemes = [...themeErrors.entries()]
    .map(([theme, count]) => ({ theme, count }))
    .sort((a, b) => b.count - a.count || a.theme.localeCompare(b.theme))
    .slice(0, 5);

  // «Самые трудные» — наименее решённые: по возрастанию числа решивших
  const hardestPuzzles = [...puzzleSolved.entries()]
    .map(([id, solvedBy]) => ({ id, theme: getPuzzleById(id)?.theme ?? '', solvedBy }))
    .sort((a, b) => a.solvedBy - b.solvedBy || a.id.localeCompare(b.id))
    .slice(0, 5);

  return {
    userCount: progresses.length,
    active7d,
    totalXp,
    totalSolved,
    premiumCount,
    activity14,
    weakThemes,
    hardestPuzzles,
  };
}
