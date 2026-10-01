// Edge-функция: LLM-тренёр (подсказки, объяснения, разбор партий).
// Деплой: supabase functions deploy ai-coach
// Секреты: AI_PROVIDER_KEY (обязателен), AI_PROVIDER_URL, AI_MODEL,
//          AI_COACH_FREE_LIMIT, AI_COACH_PREMIUM_LIMIT (квоты в день, опционально)
// Таблицы: coach_cache, coach_usage (см. supabase/migrations/20260821000000_ai_coach.sql)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const DEFAULT_PROVIDER_URL = 'https://api.openai.com/v1';
const DEFAULT_MODEL = 'gpt-4o-mini';
const FREE_LIMIT = Number(Deno.env.get('AI_COACH_FREE_LIMIT') ?? 5);
const PREMIUM_LIMIT = Number(Deno.env.get('AI_COACH_PREMIUM_LIMIT') ?? 50);

const ACTIONS = new Set(['hint', 'explain', 'review']);

interface CoachBody {
  action?: string;
  fen?: string;
  san?: string;
  correctSan?: string;
  moves?: string[];
  puzzleId?: string;
  lang?: string;
}

Deno.serve(async (req) => {
  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return json({ error: 'unauthorized' }, 401);
    }

    const apiKey = Deno.env.get('AI_PROVIDER_KEY');
    if (!apiKey) {
      return json({ error: 'not_configured' }, 503);
    }

    const body = (await req.json()) as CoachBody;
    if (!body.action || !ACTIONS.has(body.action) || (body.lang !== 'ru' && body.lang !== 'en')) {
      return json({ error: 'bad_request' }, 400);
    }

    // Серверный кэш: попадание не расходует квоту и не зовёт провайдера
    const cacheKey = await hashOf(cacheKeyOf(body));
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const { data: cached } = await admin.from('coach_cache').select('response').eq('cache_key', cacheKey).maybeSingle();
    if (cached?.response) {
      return json({ cached: true, response: cached.response });
    }

    // Квота на день: free — FREE_LIMIT, premium (активная подписка) — PREMIUM_LIMIT
    const premium = await hasActivePremium(admin, user.id);
    const limit = premium ? PREMIUM_LIMIT : FREE_LIMIT;
    const today = new Date().toISOString().slice(0, 10);
    const { data: usage } = await admin.from('coach_usage').select('used').eq('user_id', user.id).eq('day', today).maybeSingle();
    const used = usage?.used ?? 0;
    if (used >= limit) {
      return json({ error: 'quota_exceeded' }, 429);
    }
    const { error: incrError } = await admin.from('coach_usage').upsert({
      user_id: user.id,
      day: today,
      used: used + 1,
    });
    if (incrError) {
      console.error('quota upsert error', incrError);
      return json({ error: 'db_error' }, 500);
    }

    // Вызов OpenAI-совместимого API (OpenAI/DeepSeek/OpenRouter и т.п.)
    const providerUrl = (Deno.env.get('AI_PROVIDER_URL') ?? DEFAULT_PROVIDER_URL).replace(/\/+$/, '');
    const model = Deno.env.get('AI_MODEL') ?? DEFAULT_MODEL;
    const completion = await fetch(providerUrl + '/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        max_tokens: 400,
        messages: [
          { role: 'system', content: systemPrompt(body.lang) },
          { role: 'user', content: userPrompt(body) },
        ],
      }),
    });
    if (!completion.ok) {
      console.error('provider error', completion.status, await completion.text());
      return json({ error: 'provider_error' }, 502);
    }
    const payload = await completion.json();
    const content: string = payload?.choices?.[0]?.message?.content ?? '';

    const parsed = parseCoachJson(content);
    if (!parsed) {
      return json({ error: 'bad_model_response' }, 502);
    }

    // Кладём в серверный кэш (ошибка вставки не ломает ответ)
    const { error: cacheError } = await admin.from('coach_cache').insert({
      cache_key: cacheKey,
      action: body.action,
      lang: body.lang,
      response: parsed,
    });
    if (cacheError && cacheError.code !== '23505') {
      console.error('cache insert error', cacheError);
    }

    return json({ cached: false, response: parsed });
  } catch (e) {
    console.error(e);
    return json({ error: 'internal' }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}

/** Ключ кэша — тот же алгоритм, что в src/ai/coach/prompts.ts (PROMPT_VERSION v1). */
function cacheKeyOf(b: CoachBody): string {
  return [
    'v1',
    b.action ?? '',
    b.lang ?? '',
    b.fen ?? '',
    b.san ?? '',
    b.correctSan ?? '',
    b.moves?.join(' ') ?? '',
    b.puzzleId ?? '',
  ].join('|');
}

async function hashOf(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return [...new Uint8Array(digest)].map((x) => x.toString(16).padStart(2, '0')).join('');
}

async function hasActivePremium(admin: ReturnType<typeof createClient>, userId: string): Promise<boolean> {
  const { data } = await admin.from('subscriptions').select('plan, paid_until').eq('user_id', userId).maybeSingle();
  if (!data) return false;
  if (data.plan === 'lifetime') return true;
  return Boolean(data.paid_until && new Date(data.paid_until) > new Date());
}

function systemPrompt(lang: string): string {
  const langLine = lang === 'ru' ? 'Отвечай на русском языке.' : 'Answer in English.';
  return [
    'Ты — дружелюбный шахматный тренер мобильного приложения M8.',
    'Объясняй коротко, понятно новичку, без жаргона (или сразу расшифровывай).',
    'Формат ответа — СТРОГО один JSON-объект без markdown-обёрток:',
    '{"title": "<заголовок до 40 символов>", "text": "<2–4 предложения>"}',
    langLine,
  ].join(' ');
}

function userPrompt(b: CoachBody): string {
  switch (b.action) {
    case 'hint':
      return 'Позиция (FEN): ' + (b.fen ?? '') + '\nДай подсказку к лучшему ходу, НЕ называя сам ход и не раскрывая комбинацию целиком.';
    case 'explain':
      return [
        'Позиция (FEN): ' + (b.fen ?? ''),
        'Игрок сыграл: ' + (b.san ?? '?'),
        b.correctSan ? 'Правильный ход был: ' + b.correctSan : '',
        'Объясни, почему ход игрока неудачен и в чём идея правильного хода.',
      ].filter(Boolean).join('\n');
    default:
      return 'Партия в SAN: ' + (b.moves?.join(' ') ?? '') + '\nДай краткий разбор: план игры, ключевой момент и одну главную рекомендацию.';
  }
}

/** Модель иногда оборачивает JSON в ```…``` — вычищаем и парсим. */
function parseCoachJson(content: string): { title: string; text: string } | null {
  const cleaned = content.replace(/```(?:json)?/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    const obj = JSON.parse(cleaned.slice(start, end + 1));
    if (typeof obj.title !== 'string' || typeof obj.text !== 'string') return null;
    if (!obj.title || !obj.text) return null;
    return { title: obj.title.slice(0, 80), text: obj.text.slice(0, 1200) };
  } catch {
    return null;
  }
}
