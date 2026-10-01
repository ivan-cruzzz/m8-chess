// Create-invoice: счёт NOWPayments для тарифа M8 Premium.
// Standalone-версия (без импортов) — гарантирует старт edge-функции.
// Секреты: NPW_API_KEY. JWT проверяет шлюз (verify_jwt).
const PLANS: Record<string, number> = {
  monthly: 3.49,
  yearly: 21.9,
  lifetime: 44.9,
};

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

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    },
  });
}

Deno.serve(async (req) => {
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

    const npwKey = Deno.env.get('NPW_API_KEY');
    if (!npwKey) return json({ error: 'payments_not_configured' }, 503);

    const body = await req.json();
    const plan = body?.plan as string;
    const price = PLANS[plan];
    if (!price) return json({ error: 'bad_plan' }, 400);

    const order_id = `${user}::${plan}::${Date.now()}`;
    const r = await fetch('https://api.nowpayments.io/v1/invoice', {
      method: 'POST',
      headers: { 'x-api-key': npwKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        price_amount: price,
        price_currency: 'usd',
        order_id,
        order_description: `M8 Premium - ${plan}`,
      }),
    });
    if (!r.ok) {
      console.error('nowpayments error', r.status, await r.text());
      return json({ error: 'gateway_error' }, 502);
    }
    const invoice = await r.json();
    return json({ invoice_id: invoice.id, pay_url: invoice.invoice_url, order_id });
  } catch (e) {
    console.error(e);
    return json({ error: 'internal' }, 500);
  }
});
