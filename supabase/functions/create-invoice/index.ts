// Edge-функция: создать счёт NOWPayments для тарифа
// Деплой: supabase functions deploy create-invoice
// Секрет: supabase secrets set NPW_API_KEY=xxx
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const PLANS: Record<string, number> = {
  monthly: 3.49,
  yearly: 21.9,
  lifetime: 44.9,
};

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

    const { plan } = await req.json();
    const price = PLANS[plan];
    if (!price) {
      return json({ error: 'bad_plan' }, 400);
    }

    const order_id = `${user.id}::${plan}::${Date.now()}`;
    const r = await fetch('https://api.nowpayments.io/v1/invoice', {
      method: 'POST',
      headers: {
        'x-api-key': npwKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        price_amount: price,
        price_currency: 'usd',
        pay_currency: null, // выбор монеты на странице оплаты
        order_id,
        order_description: `M8 Premium — ${plan}`,
      }),
    });

    if (!r.ok) {
      const text = await r.text();
      console.error('NOWPayments error', r.status, text);
      return json({ error: 'gateway_error' }, 502);
    }

    const invoice = await r.json();
    return json({ invoice_id: invoice.id, pay_url: invoice.invoice_url, order_id });
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
