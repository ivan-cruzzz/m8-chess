// Check-payment: статус счёта NOWPayments; при оплате активирует Premium.
// Standalone-версия (без импортов). Секреты: NPW_API_KEY.
const SB = Deno.env.get('SUPABASE_URL')!;
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const PAID = new Set(['finished', 'confirmed']);
const PLANS = ['monthly', 'yearly', 'lifetime'];

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

async function npwGet(path: string, key: string) {
  const r = await fetch(`https://api.nowpayments.io/v1${path}`, { headers: { 'x-api-key': key } });
  return r.ok ? r.json() : null;
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
    const invoiceId = String(body?.invoice_id ?? '');
    if (!invoiceId) return json({ error: 'bad_request' }, 400);

    // Статус: сначала invoice, затем payment (зависит от типа счёта)
    let status = 'unknown';
    let orderDescription = '';
    const inv = await npwGet(`/invoice/${invoiceId}`, npwKey);
    if (inv) {
      status = inv.payment_status ?? 'unknown';
      orderDescription = inv.order_description ?? '';
    } else {
      const pay = await npwGet(`/payment/${invoiceId}`, npwKey);
      if (pay) {
        status = pay.payment_status ?? 'unknown';
        orderDescription = pay.order_description ?? '';
      }
    }

    if (!PAID.has(status)) {
      return json({ status, activated: false });
    }

    // План из описания заказа: "M8 Premium - yearly"
    const plan = orderDescription.split('-').pop()?.trim();
    const validPlan = PLANS.includes(plan ?? '') ? plan! : 'monthly';

    const now = new Date();
    let paidUntil: string | null = null;
    if (validPlan === 'monthly') paidUntil = new Date(now.getTime() + 31 * 864e5).toISOString();
    if (validPlan === 'yearly') paidUntil = new Date(now.getTime() + 366 * 864e5).toISOString();

    // Активация Premium (service role, PostgREST upsert)
    const up = await fetch(`${SB}/rest/v1/subscriptions`, {
      method: 'POST',
      headers: {
        apikey: SERVICE,
        Authorization: `Bearer ${SERVICE}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        user_id: user,
        plan: validPlan,
        paid_until: paidUntil,
        invoice_id: invoiceId,
        updated_at: new Date().toISOString(),
      }),
    });
    if (!up.ok) {
      console.error('subscriptions upsert error', up.status, await up.text());
      return json({ error: 'db_error' }, 500);
    }

    return json({ status, activated: true, plan: validPlan });
  } catch (e) {
    console.error(e);
    return json({ error: 'internal' }, 500);
  }
});
