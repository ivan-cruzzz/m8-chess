import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

export type Plan = 'free' | 'monthly' | 'yearly' | 'lifetime';

interface SubscriptionContextValue {
  plan: Plan;
  isPremium: boolean;
  /** Источник истины: бд (Supabase) или локально (демо) */
  source: 'db' | 'local';
  subscribe: (plan: Plan) => void;
  cancel: () => void;
  /** Перечитать подписку из БД (после оплаты) */
  refresh: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

// Подписка хранится отдельно для каждого пользователя (локальный режим)
const keyFor = (userId: string) => `chessup-plan:${userId}`;

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
  const [plan, setPlan] = useState<Plan>(() => {
    try {
      return (localStorage.getItem(keyFor(userId)) as Plan) || 'free';
    } catch {
      return 'free';
    }
  });
  const [source, setSource] = useState<'db' | 'local'>('local');

  // Смена пользователя → локальное значение, затем подтягиваем БД
  useEffect(() => {
    if (!supabase) {
      try {
        setPlan((localStorage.getItem(keyFor(userId)) as Plan) || 'free');
      } catch { /* ignore */ }
      setSource('local');
      return;
    }
    try {
      setPlan((localStorage.getItem(keyFor(userId)) as Plan) || 'free');
    } catch { /* ignore */ }
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

  const persistLocal = useCallback((p: Plan) => {
    setPlan(p);
    setSource('local');
    try {
      localStorage.setItem(keyFor(userId), p);
    } catch { /* ignore */ }
  }, [userId]);

  const subscribe = useCallback((newPlan: Plan) => persistLocal(newPlan), [persistLocal]);
  const cancel = useCallback(() => persistLocal('free'), [persistLocal]);
  const refresh = useCallback(async () => {
    await refreshFromDb();
  }, [refreshFromDb]);

  return (
    <SubscriptionContext.Provider value={{ plan, isPremium: plan !== 'free', source, subscribe, cancel, refresh }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error('useSubscription must be used within SubscriptionProvider');
  return ctx;
}
