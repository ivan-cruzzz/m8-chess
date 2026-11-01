/**
 * Общий хелпер хеширования паролей: PBKDF2-SHA-256, 100 000 итераций,
 * соль 16 байт, результат в формате `saltHex:hashHex`.
 * Та же схема, что исторически использовалась в AuthContext для локальных
 * пользователей, — формат хранения менять нельзя (совместимость данных).
 */

const PBKDF2_ITERATIONS = 100_000;
const SALT_BYTES = 16;
const HASH_BITS = 256;

const toHex = (arr: Uint8Array) => Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join('');

/** Случайная соль в hex (16 байт) */
export function randomSaltHex(): string {
  return toHex(crypto.getRandomValues(new Uint8Array(SALT_BYTES)));
}

/**
 * Хеширует пароль. Без saltHex — генерируется новая случайная соль;
 * с saltHex — воспроизводимый хеш для сверки (результат совпадает с сохранённым
 * `saltHex:hashHex` при верном пароле).
 */
export async function hashPassword(password: string, saltHex?: string): Promise<string> {
  const salt = saltHex
    ? Uint8Array.from(saltHex.match(/.{2}/g)!.map((b) => parseInt(b, 16)))
    : crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: PBKDF2_ITERATIONS }, key, HASH_BITS);
  return `${toHex(salt)}:${toHex(new Uint8Array(bits))}`;
}
