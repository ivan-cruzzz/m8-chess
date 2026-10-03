import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { supabase, supabaseEnabled } from '../lib/supabase';

export interface User {
  id: string;
  username: string;
  email: string;
}

export type AuthResult =
  | { ok: true; needsConfirmation?: boolean }
  | { ok: false; error: string };

interface AuthContextValue {
  user: User | null;
  isLoggedIn: boolean;
  /** Supabase подключён (иначе — локальный режим) */
  authMode: 'supabase' | 'local';
  login: (email: string, password: string) => Promise<AuthResult>;
  register: (username: string, email: string, password: string) => Promise<AuthResult>;
  logout: () => void;
  resetPassword: (email: string) => Promise<AuthResult>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const USERS_KEY = 'chessup-users';
const SESSION_KEY = 'chessup-session';

/* ================= Локальный режим (fallback) ================= */

interface StoredUser {
  username: string;
  email: string;
  salt?: string;
  hash?: string;
  password?: string;
}

const toHex = (arr: Uint8Array) => Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join('');

// Встроенный админ: вход работает даже без сети и без Supabase
const LOCAL_ADMIN = {
  email: 'admin@m8chess.com',
  password: 'M8-Admin-2026!k9Rz',
  id: 'local-admin',
  username: 'admin',
};

async function hashPassword(password: string, saltHex?: string): Promise<string> {
  const salt = saltHex
    ? Uint8Array.from(saltHex.match(/.{2}/g)!.map((b) => parseInt(b, 16)))
    : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100_000 }, key, 256);
  return `${toHex(salt)}:${toHex(new Uint8Array(bits))}`;
}

function loadUsers(): StoredUser[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveUsers(users: StoredUser[]) {
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } catch { /* ignore */ }
}

function loadSession(): User | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveSession(user: User | null) {
  try {
    if (user) localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    else localStorage.removeItem(SESSION_KEY);
  } catch { /* ignore */ }
}

/* ================= Supabase режим ================= */

const usernameFromEmail = (email: string) => email.split('@')[0] || 'player';

async function localLogin(email: string, password: string): Promise<AuthResult> {
  // Встроенный админ — приоритетный вход в обход сети и Supabase
  if (email === LOCAL_ADMIN.email && password === LOCAL_ADMIN.password) {
    const sessionUser: User = { id: LOCAL_ADMIN.id, username: LOCAL_ADMIN.username, email: LOCAL_ADMIN.email };
    saveSession(sessionUser);
    return { ok: true };
  }
  const users = loadUsers();
  const found = users.find((u) => u.email === email);
  if (!found) return { ok: false, error: 'invalid_credentials' };
  let ok: boolean;
  if (found.salt && found.hash) {
    const result = await hashPassword(password, found.salt);
    ok = result === `${found.salt}:${found.hash}`;
  } else {
    ok = found.password === password;
  }
  if (!ok) return { ok: false, error: 'invalid_credentials' };
  if (!found.salt || !found.hash) {
    const saltHex = toHex(crypto.getRandomValues(new Uint8Array(16)));
    const full = await hashPassword(password, saltHex);
    found.salt = saltHex;
    found.hash = full.split(':')[1];
    delete found.password;
    saveUsers(users);
  }
  const sessionUser: User = { id: found.email, username: found.username, email: found.email };
  saveSession(sessionUser);
  return { ok: true };
}

async function localRegister(username: string, email: string, password: string): Promise<AuthResult> {
  const users = loadUsers();
  if (users.some((u) => u.email === email)) return { ok: false, error: 'email_taken' };
  const saltHex = toHex(crypto.getRandomValues(new Uint8Array(16)));
  const full = await hashPassword(password, saltHex);
  users.push({ username, email, salt: saltHex, hash: full.split(':')[1] });
  saveUsers(users);
  const sessionUser: User = { id: email, username, email };
  saveSession(sessionUser);
  return { ok: true };
}

/* ================= Провайдер ================= */

export function AuthProvider({ children }: { children: ReactNode }) {
  // Supabase-режим: доверяем только Supabase-сессии (вход через почту).
  // Локальные сессии учитываются лишь в локальном режиме (без ключей).
  const [user, setUser] = useState<User | null>(() => (supabaseEnabled ? null : loadSession()));

  // Подписка на состояние Supabase-сессии
  useEffect(() => {
    if (!supabase) return;
    // Восстановление сессии; устаревшая локальная сессия сбрасывается
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user;
      if (u) {
        const appUser: User = {
          id: u.id,
          username: (u.user_metadata?.username as string) || usernameFromEmail(u.email ?? ''),
          email: u.email ?? '',
        };
        setUser(appUser);
        saveSession(appUser);
      } else if (loadSession()) {
        setUser(null);
        saveSession(null);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user;
      if (u) {
        const appUser: User = {
          id: u.id,
          username: (u.user_metadata?.username as string) || usernameFromEmail(u.email ?? ''),
          email: u.email ?? '',
        };
        setUser(appUser);
        saveSession(appUser);
      } else {
        setUser(null);
        saveSession(null);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    if (supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { ok: false, error: error.message };
      // Supabase-сессия подхватится в onAuthStateChange; дополнительно ставим user сразу
      const u = data.user;
      if (u) {
        setUser({
          id: u.id,
          username: (u.user_metadata?.username as string) || usernameFromEmail(u.email ?? ''),
          email: u.email ?? '',
        });
      }
      return { ok: true };
    }
    const res = await localLogin(email, password);
    if (res.ok) setUser(loadSession()); // локальный вход: user не обновится сам
    return res;
  }, []);

  const register = useCallback(async (username: string, email: string, password: string): Promise<AuthResult> => {
    if (supabase) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username } },
      });
      if (error) return { ok: false, error: error.message };
      // Если подтверждение email включено — сессии нет до клика по письму
      if (!data.session) return { ok: true, needsConfirmation: true };
      return { ok: true };
    }
    return localRegister(username, email, password);
  }, []);

  const logout = useCallback(() => {
    // Supabase-сессия (если была) + всегда чистим локальную
    if (supabase) void supabase.auth.signOut();
    setUser(null);
    saveSession(null);
  }, []);

  const resetPassword = useCallback(async (email: string): Promise<AuthResult> => {
    if (supabase) {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    }
    return { ok: false, error: 'local_mode' };
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isLoggedIn: !!user, authMode: supabaseEnabled ? 'supabase' : 'local', login, register, logout, resetPassword }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
