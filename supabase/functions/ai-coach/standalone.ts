// AI-тренёр M8 — версия без внешних импортов (гарантированный boot).
// Аутентификация: шлюз Supabase (verify_jwt) уже проверил токен;
// user id берём из payload JWT. БД — прямой PostgREST (fetch).
const DEFAULT_PROVIDER_URL = 'https://api.mistral.ai/v1';
const DEFAULT_MODEL = 'mistral-small-latest';
const FREE_LIMIT = Number(Deno.env.get('AI_COACH_FREE_LIMIT') ?? 5);
const PREMIUM_LIMIT = Number(Deno.env.get('AI_COACH_PREMIUM_LIMIT') ?? 50);
const SB = Deno.env.get('SUPABASE_URL')!;
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ACTIONS = new Set(['hint', 'explain', 'review']);

function rest(path: string, init: any = {}) {
  return fetch(`${SB}/rest/v1${path}`, {
    ...init,
    headers: {
      apikey: SERVICE,
      Authorization: `Bearer ${SERVICE}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
      ...(init.headers ?? {}),
    },
  });
}

function userIdFromJwt(authHeader: string): string | null {
  const token = authHeader.replace(/^Bearer\s+/i, '');
  const part = token.split('.')[1];
  if (!part) return null;
  try {
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
    return (JSON.parse(json).sub as string) ?? null;
  } catch {
    return null;
  }
}

async function hashOf(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return [...new Uint8Array(digest)].map((x) => x.toString(16).padStart(2, '0')).join('');
}

function cacheKeyOf(b: any): string {
  return ['v1', b.action ?? '', b.lang ?? '', b.fen ?? '', b.san ?? '', b.correctSan ?? '', b.moves?.join(' ') ?? '', b.puzzleId ?? ''].join('|');
}

Deno.serve(async (req) => {
  // CORS preflight (браузер шлёт OPTIONS перед POST с Authorization)
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Max-Age': '86400',
      },
    });
  }
  try {
    const user = userIdFromJwt(req.headers.get('Authorization') ?? '');
    if (!user) return json({ error: 'unauthorized' }, 401);

    const apiKey = Deno.env.get('AI_PROVIDER_KEY');
    if (!apiKey) return json({ error: 'not_configured' }, 503);

    const body = await req.json();
    if (!body.action || !ACTIONS.has(body.action) || (body.lang !== 'ru' && body.lang !== 'en')) {
      return json({ error: 'bad_request' }, 400);
    }

    // Кэш
    const cacheKey = await hashOf(cacheKeyOf(body));
    const cachedRes = await rest(`/coach_cache?cache_key=eq.${cacheKey}&select=response`);
    const cachedRow = (await cachedRes.json() as any[])[0];
    if (cachedRow?.response) return json({ cached: true, response: cachedRow.response });

    // Premium?
    const subRes = await rest(`/subscriptions?user_id=eq.${user}&select=plan,paid_until`);
    const sub = (await subRes.json() as any[])[0];
    const premium = sub?.plan === 'lifetime' || (sub?.paid_until && new Date(sub.paid_until) > new Date());
    const limit = premium ? PREMIUM_LIMIT : FREE_LIMIT;

    // Квота (upsert через merge-duplicates)
    const today = new Date().toISOString().slice(0, 10);
    const usageRes = await rest(`/coach_usage?user_id=eq.${user}&day=eq.${today}&select=used`);
    const used = (await usageRes.json() as any[])[0]?.used ?? 0;
    if (used >= limit) return json({ error: 'quota_exceeded' }, 429);
    await rest('/coach_usage', {
      method: 'POST',
      body: JSON.stringify({ user_id: user, day: today, used: used + 1 }),
    }).catch(() => {});

    // LLM
    const providerUrl = (Deno.env.get('AI_PROVIDER_URL') ?? DEFAULT_PROVIDER_URL).replace(/\/+$/, '');
    const model = Deno.env.get('AI_MODEL') ?? DEFAULT_MODEL;
    const completion = await fetch(providerUrl + '/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
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
    if (!parsed) return json({ error: 'bad_model_response' }, 502);

    await rest('/coach_cache', {
      method: 'POST',
      body: JSON.stringify({ cache_key: cacheKey, action: body.action, lang: body.lang, response: parsed }),
    }).catch(() => {});

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

function userPrompt(b: any): string {
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

function parseCoachJson(content: string): { title: string; text: string } | null {
  const cleaned = content.replace(/```(?:json)?/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    const obj = JSON.parse(cleaned.slice(start, end + 1));
    if (typeof obj.title !== 'string' || typeof obj.text !== 'string' || !obj.title || !obj.text) return null;
    return { title: obj.title.slice(0, 80), text: obj.text.slice(0, 1200) };
  } catch {
    return null;
  }
}
