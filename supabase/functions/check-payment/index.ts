// Edge-функция: проверить статус счёта NOWPayments и активировать Premium
// Деплой: supabase functions deploy check-payment
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const PAID_STATUSES = new Set(['finished', 'confirmed']);

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

    const npwKey = Deno.env.get('NPW_API_KEY');
    if (!npwKey) {
      return json({ error: 'payments_not_configured' }, 503);
    }

    const { invoice_id } = await req.json();
    if (!invoice_id) {
      return json({ error: 'bad_request' }, 400);
    }

    // Статус инвойса; при 404 пробуем payment-эндпоинт
    let status = 'unknown';
    let r = await fetch(`https://api.nowpayments.io/v1/invoice/${invoice_id}`, {
      headers: { 'x-api-key': npwKey },
    });
    if (r.ok) {
      const data = await r.json();
      status = data.payment_status ?? data.status ?? 'unknown';
    } else {
      r = await fetch(`https://api.nowpayments.io/v1/payment/${invoice_id}`, {
        headers: { 'x-api-key': npwKey },
      });
      if (r.ok) {
        const data = await r.json();
        status = data.payment_status ?? 'unknown';
      }
    }

    if (!PAID_STATUSES.has(status)) {
      return json({ status, activated: false });
    }

    // Активируем Premium от имени сервера (service_role)
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Тариф восстановим из order_id инвойса
    const inv = await fetch(`https://api.nowpayments.io/v1/invoice/${invoice_id}`, {
      headers: { 'x-api-key': npwKey },
    });
    const invoice = inv.ok ? await inv.json() : null;
    const plan = (invoice?.order_description ?? '').split('— ')[1]?.trim();
    const validPlan = ['monthly', 'yearly', 'lifetime'].includes(plan) ? plan : 'monthly';

    const now = new Date();
    let paidUntil: string | null = null;
    if (validPlan === 'monthly') paidUntil = new Date(now.getTime() + 31 * 864e5).toISOString();
    if (validPlan === 'yearly') paidUntil = new Date(now.getTime() + 366 * 864e5).toISOString();

    const { error } = await admin.from('subscriptions').upsert({
      user_id: user.id,
      plan: validPlan,
      paid_until: paidUntil,
      invoice_id: String(invoice_id),
      updated_at: new Date().toISOString(),
    });
    if (error) {
      console.error('upsert error', error);
      return json({ error: 'db_error' }, 500);
    }

    return json({ status, activated: true, plan: validPlan });
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
