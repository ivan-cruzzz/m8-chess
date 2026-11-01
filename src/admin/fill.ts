/**
 * Замена подстановок {name} в строках i18n (в проекте подстановки ручные).
 * Общий хелпер админ-вкладок: каждый ключ словаря подставляется один раз
 * слева направо, неизвестные плейсхолдеры остаются как есть.
 */
export function fill(s: string, vars: Record<string, string | number>): string {
  return Object.entries(vars).reduce((acc, [k, v]) => acc.replace(`{${k}}`, String(v)), s);
}
