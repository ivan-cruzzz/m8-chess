import type { CoachRequest } from './types';

/**
 * Версионируемые шаблоны промптов. Изменение PROMPT_VERSION инвалидирует
 * и клиентский, и серверный кэш — можно смело менять формулировки.
 */
export const PROMPT_VERSION = 'v1';

/** Стабильный ключ запроса: одинаков на клиенте и сервере, попадает в кэш. */
export function coachCacheKey(req: CoachRequest): string {
  return [
    PROMPT_VERSION,
    req.action,
    req.lang,
    req.fen ?? '',
    req.san ?? '',
    req.correctSan ?? '',
    req.moves?.join(' ') ?? '',
    req.puzzleId ?? '',
  ].join('|');
}

export function buildSystemPrompt(lang: CoachRequest['lang']): string {
  const langLine = lang === 'ru'
    ? 'Отвечай на русском языке.'
    : 'Answer in English.';
  return [
    'Ты — дружелюбный шахматный тренер мобильного приложения M8.',
    'Объясняй коротко, понятно новичку, без жаргона (или сразу расшифровывай).',
    'Формат ответа — СТРОГО один JSON-объект без markdown-обёрток:',
    '{"title": "<заголовок до 40 символов>", "text": "<2–4 предложения>"}',
    langLine,
  ].join(' ');
}

export function buildUserPrompt(req: CoachRequest): string {
  switch (req.action) {
    case 'hint':
      return [
        'Позиция (FEN): ' + (req.fen ?? ''),
        'Дай подсказку к лучшему ходу, НЕ называя сам ход и не раскрывая комбинацию целиком.',
      ].join('\n');
    case 'explain':
      return [
        'Позиция (FEN): ' + (req.fen ?? ''),
        'Игрок сыграл: ' + (req.san ?? '?'),
        req.correctSan ? 'Правильный ход был: ' + req.correctSan : '',
        'Объясни, почему ход игрока неудачен и в чём идея правильного хода.',
      ]
        .filter(Boolean)
        .join('\n');
    case 'review':
      return [
        'Партия в SAN: ' + (req.moves?.join(' ') ?? ''),
        'Дай краткий разбор: план игры, ключевой момент и одну главную рекомендацию.',
      ].join('\n');
  }
}
