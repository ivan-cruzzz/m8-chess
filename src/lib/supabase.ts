import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** Принудительный локальный режим: вход только встроенным админом, без сети */
const forceLocal = import.meta.env.VITE_LOCAL_ADMIN === '1';

/** Supabase подключён? Если нет — приложение работает в локальном режиме */
export const supabaseEnabled = Boolean(url && anonKey) && !forceLocal;

/** Единственный клиент (null в локальном режиме) */
export const supabase: SupabaseClient | null = supabaseEnabled
  ? createClient(url!, anonKey!, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null;
