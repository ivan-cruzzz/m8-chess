import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';
import { validatePromo, listPromos, savePromo } from '../admin/store';

export type Plan = 'free' | 'monthly' | 'yearly' | 'lifetime';

/** Результат активации промокода: три различимые ошибки для UI */
export type RedeemResult = { ok: true; plan: Plan } | { ok: false; error: 'not_found' | 'exhausted' | 'inactive' };

interface SubscriptionContextValue {
  plan: Plan;
  isPremium: boolean;
  /** Источник истины: бд (Supabase) или локально (демо) */
  source: 'db' | 'local';
  subscribe: (plan: Plan) => void;
  cancel: () => void;
  /** Перечитать подписку из БД (после оплаты) */
  refresh: () => Promise<void>;
  /** Активация промокода: валидация + выдача плана + расход лимита */
  redeemPromo: (code: string) => Promise<RedeemResult>;
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

// Подписка хранится отдельно для каждого пользователя (локальный режим)
const keyFor = (userId: string) => `chessup-plan:${userId}`;

const KNOWN_PLANS: readonly Plan[] = ['free', 'monthly', 'yearly', 'lifetime'];

/**
 * Чтение локального плана с обратной совместимостью:
 *  - старое хранение — строка плана ('monthly'), срока у неё нет;
 *  - новое хранение — JSON {plan, until?}: истёкший срок читается как free.
 * Чистая функция: now передаётся явно для тестируемости.
 */
export function planFromStored(raw: string | null, now: Date = new Date()): Plan {
  if (!raw) return 'free';
  const trimmed = raw.trim();
  if (trimmed.startsWith('{')) {
    try {
      const grant = JSON.parse(trimmed) as { plan?: string; until?: string };
      const plan = KNOWN_PLANS.find((p) => p === grant.plan);
      if (!plan || plan === 'free') return 'free';
      if (grant.until && new Date(grant.until) <= now) return 'free';
      return plan;
    } catch {
      return 'free';
    }
  }
  return KNOWN_PLANS.find((p) => p === trimmed) ?? 'free';
}

/** Premium из строки БД: lifetime бессрочно, monthly/yearly — до paid_until */
function planFromRow(row: { plan: string; paid_until: string | null } | null): Plan {
  if (!row) return 'free';
  if (row.plan === 'lifetime') return 'lifetime';
  if ((row.plan === 'monthly' || row.plan === 'yearly') && row.paid_until) {
    return new Date(row.paid_until) > new Date() ? row.plan : 'free';
  }
  return 'free';
}

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id || 'guest';
  const [plan, setPlan] = useState<Plan>(() => planFromStored(readRaw(userId)));
  const [source, setSource] = useState<'db' | 'local'>('local');

  function readRaw(id: string): string | null {
    try {
      return localStorage.getItem(keyFor(id));
    } catch {
      return null;
    }
  }

  // Смена пользователя → локальное значение, затем подтягиваем БД
  useEffect(() => {
    setPlan(planFromStored(readRaw(userId)));
    if (!supabase) {
      setSource('local');
      return;
    }
    void refreshFromDb();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const refreshFromDb = useCallback(async () => {
    if (!supabase || !user) return;
    const { data } = await supabase
      .from('subscriptions')
      .select('plan, paid_until')
      .eq('user_id', user.id)
      .maybeSingle();
    const dbPlan = planFromRow(data);
    setPlan(dbPlan);
    setSource('db');
    // кэш для оффлайна
    try {
      localStorage.setItem(keyFor(user.id), dbPlan);
    } catch { /* ignore */ }
  }, [user]);

  // План, выданный админ-панелью на этом устройстве, виден игроку сразу:
  // панель диспатчит 'chessup-plan-changed', плюс перечитываем при синхронизации другой вкладки
  useEffect(() => {
    const reread = () => setPlan(planFromStored(readRaw(userId)));
    window.addEventListener('chessup-plan-changed', reread);
    window.addEventListener('storage', reread);
    return () => {
      window.removeEventListener('chessup-plan-changed', reread);
      window.removeEventListener('storage', reread);
    };
  }, [userId]);

  /** Сохранение выданного плана в новом формате {plan, until?} — ключ не меняется */
  const persistGrant = useCallback((grant: { plan: Plan; until?: string }) => {
    setPlan(grant.plan);
    setSource('local');
    try {
      localStorage.setItem(keyFor(userId), JSON.stringify(grant));
    } catch { /* ignore */ }
  }, [userId]);

  const subscribe = useCallback((newPlan: Plan) => persistGrant({ plan: newPlan }), [persistGrant]);
  const cancel = useCallback(() => persistGrant({ plan: 'free' }), [persistGrant]);
  const refresh = useCallback(async () => {
    await refreshFromDb();
  }, [refreshFromDb]);

  /**
   * Промокод: чистая валидация, затем выдача {plan, until} и инкремент uses.
   * Промокоды локальные — работают и без Supabase.
   */
  const redeemPromo = useCallback(async (code: string): Promise<RedeemResult> => {
    const res = validatePromo(listPromos(), code.trim());
    if (!res.ok) return { ok: false, error: res.error };
    const promo = res.promo;
    persistGrant({
      plan: promo.plan,
      until: promo.days > 0 ? new Date(Date.now() + promo.days * 86_400_000).toISOString() : undefined,
    });
    // Расход лимита — обязанность вызывающего validatePromo (см. контракт store)
    savePromo({ ...promo, uses: promo.uses + 1 });
    return { ok: true, plan: promo.plan };
  }, [persistGrant]);

  return (
    <SubscriptionContext.Provider value={{ plan, isPremium: plan !== 'free', source, subscribe, cancel, refresh, redeemPromo }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error('useSubscription must be used within SubscriptionProvider');
  return ctx;
}
