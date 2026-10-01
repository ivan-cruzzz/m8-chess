import { supabase } from '../lib/supabase';
import type { Plan } from '../contexts/SubscriptionContext';

/** Можно ли платить криптой: Supabase подключён */
export const canPayWithCrypto = () => supabase !== null;

export interface InvoiceInfo {
  invoice_id: string;
  pay_url: string;
}

/** Создать счёт NOWPayments (через edge-функцию, ключ не покидает сервер) */
export async function createInvoice(plan: Plan): Promise<
  { ok: true; invoice: InvoiceInfo } | { ok: false; reason: 'unauthorized' | 'payments_not_configured' | 'error' }
> {
  if (!supabase) return { ok: false, reason: 'payments_not_configured' };
  const { data, error } = await supabase.functions.invoke('create-invoice', { body: { plan } });
  if (error || !data || data.error) {
    const reason = data?.error === 'payments_not_configured' ? 'payments_not_configured' : 'error';
    return { ok: false, reason };
  }
  return { ok: true, invoice: { invoice_id: data.invoice_id, pay_url: data.pay_url } };
}

export type PaymentStatus =
  | 'waiting' | 'confirming' | 'confirmed' | 'sending' | 'finished'
  | 'failed' | 'refunded' | 'expired' | 'unknown';

/** Проверить оплату; при успехе Premium уже активирован в БД сервером */
export async function checkPayment(
  invoiceId: string,
): Promise<{ activated: boolean; status: PaymentStatus; plan?: Plan }> {
  if (!supabase) return { activated: false, status: 'unknown' };
  const { data, error } = await supabase.functions.invoke('check-payment', {
    body: { invoice_id: invoiceId },
  });
  if (error || !data || data.error) return { activated: false, status: 'unknown' };
  return {
    activated: Boolean(data.activated),
    status: (data.status ?? 'unknown') as PaymentStatus,
    plan: data.plan,
  };
}
