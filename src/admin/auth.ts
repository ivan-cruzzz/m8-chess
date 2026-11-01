/**
 * Вход в админ-панель без React. Владеет двумя ключами хранилищ:
 *  - хеш пароля в localStorage в формате `saltHex:hashHex` (PBKDF2-SHA-256, 100k итераций);
 *  - срок истечения сессии (ISO) в sessionStorage.
 * Пароль нигде не хранится в открытом виде; формат и имена ключей — деталь модуля.
 */
import { hashPassword, randomSaltHex } from '../lib/pbkdf2';

const ADMIN_HASH_KEY = 'chessup-admin-hash';
const ADMIN_SESSION_KEY = 'chessup-admin-session';
/** Сессия живёт 30 минут от момента входа */
const SESSION_TTL_MS = 30 * 60 * 1000;

function readStoredHash(): string | null {
  try {
    return localStorage.getItem(ADMIN_HASH_KEY);
  } catch {
    return null;
  }
}

/** Задан ли пароль панели (первый вход уже был) */
export function adminPasswordExists(): boolean {
  return readStoredHash() !== null;
}

/**
 * Первый вход: задаёт пароль панели. Падает, если пароль уже существует —
 * перезадать его через этот метод нельзя. Отказ хранилища (квота, приватный
 * режим) ПРОБРАСЫВАЕТСЯ наружу: пароль не задан, вызывающий обязан показать
 * сбой и не открывать сессию.
 */
export async function setupAdminPassword(pw: string): Promise<void> {
  if (adminPasswordExists()) throw new Error('admin_password_exists');
  const full = await hashPassword(pw, randomSaltHex());
  // Без try/catch: глотание отказа здесь притворялось бы успешной установкой
  localStorage.setItem(ADMIN_HASH_KEY, full);
}

/** Проверка пароля панели; при незаданном пароле — false */
export async function verifyAdminPassword(pw: string): Promise<boolean> {
  const stored = readStoredHash();
  if (!stored) return false;
  const sep = stored.indexOf(':');
  if (sep <= 0) return false;
  const computed = await hashPassword(pw, stored.slice(0, sep));
  return computed === stored;
}

/** Открыть сессию панели: в sessionStorage пишется ISO-срок истечения */
export function startAdminSession(): void {
  try {
    sessionStorage.setItem(ADMIN_SESSION_KEY, new Date(Date.now() + SESSION_TTL_MS).toISOString());
  } catch { /* ignore */ }
}

/** Активна ли сессия (не истёк ли 30-минутный срок) */
export function adminSessionActive(): boolean {
  try {
    const raw = sessionStorage.getItem(ADMIN_SESSION_KEY);
    if (!raw) return false;
    const expiresAt = Date.parse(raw);
    if (Number.isNaN(expiresAt)) return false;
    return Date.now() < expiresAt;
  } catch {
    return false;
  }
}

/** Закрыть сессию панели */
export function endAdminSession(): void {
  try {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
  } catch { /* ignore */ }
}
