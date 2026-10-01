import { useState, useEffect, useRef } from 'react';
import { Crown, Check, Sparkles, BookOpen, Brain, Layers, HeartHandshake, Zap, Bitcoin, ExternalLink, Loader2 } from 'lucide-react';
import { useI18n } from '../contexts/I18nContext';
import { useSubscription, type Plan } from '../contexts/SubscriptionContext';
import { canPayWithCrypto, createInvoice, checkPayment, type InvoiceInfo } from '../services/cryptoPay';

interface PremiumScreenProps {
  onBack: () => void;
}

const PLANS: Array<{ id: Plan; price: string; period: string; badge?: string }> = [
  { id: 'monthly', price: '299 ₽', period: 'premiumPerMonth' },
  { id: 'yearly', price: '1 990 ₽', period: 'premiumPerYear', badge: 'premiumYearlyBadge' },
  { id: 'lifetime', price: '3 990 ₽', period: 'premiumOnce' },
];

type PayState =
  | { phase: 'idle' }
  | { phase: 'creating' }
  | { phase: 'waiting'; invoice: InvoiceInfo }
  | { phase: 'checking'; invoice: InvoiceInfo }
  | { phase: 'unavailable' }
  | { phase: 'error' };

export function PremiumScreen({ onBack }: PremiumScreenProps) {
  const { t } = useI18n();
  const { plan, isPremium, subscribe, cancel, refresh } = useSubscription();
  const [selected, setSelected] = useState<Plan>('yearly');
  const [justActivated, setJustActivated] = useState(false);
  const [pay, setPay] = useState<PayState>({ phase: 'idle' });
  const pollRef = useRef<number | null>(null);

  // Остановка поллинга при размонтировании
  useEffect(() => () => {
    if (pollRef.current !== null) clearInterval(pollRef.current);
  }, []);

  const cryptoAvailable = canPayWithCrypto();

  const startPayment = async () => {
    setPay({ phase: 'creating' });
    const res = await createInvoice(selected);
    if (!res.ok) {
      setPay({ phase: res.reason === 'payments_not_configured' ? 'unavailable' : 'error' });
      return;
    }
    setPay({ phase: 'waiting', invoice: res.invoice });
    window.open(res.invoice.pay_url, '_blank', 'noopener');

    // Автополлинг раз в 6 секунд, до 30 минут
    let tries = 0;
    pollRef.current = window.setInterval(async () => {
      tries++;
      if (tries > 300) {
        if (pollRef.current) clearInterval(pollRef.current);
        setPay({ phase: 'error' });
        return;
      }
      const st = await checkPayment(res.invoice.invoice_id);
      if (st.activated) {
        if (pollRef.current) clearInterval(pollRef.current);
        await refresh();
        setPay({ phase: 'idle' });
        setJustActivated(true);
      }
    }, 6000);
  };

  const manualCheck = async () => {
    if (pay.phase !== 'waiting') return;
    setPay({ phase: 'checking', invoice: pay.invoice });
    const st = await checkPayment(pay.invoice.invoice_id);
    if (st.activated) {
      await refresh();
      setPay({ phase: 'idle' });
      setJustActivated(true);
    } else {
      setPay({ phase: 'waiting', invoice: pay.invoice });
    }
  };

  /** Демо-активация (только локальный режим без Supabase) */
  const demoActivate = () => {
    subscribe(selected);
    setJustActivated(true);
  };

  const features = [
    { icon: BookOpen, main: true, text: t('premiumFeature1') },
    { icon: Layers, text: t('premiumFeature2') },
    { icon: Sparkles, text: t('premiumFeature3') },
    { icon: Brain, text: t('premiumFeature4') },
    { icon: HeartHandshake, text: t('premiumFeature5') },
  ];

  return (
    <div className="w-full max-w-md mx-auto px-4 py-8 animate-fade-in">
      <button onClick={onBack} className="btn btn-ghost -ml-2 px-2 py-1 mb-4 text-sm">
        {t('back')}
      </button>

      {justActivated ? (
        <div className="text-center py-10 animate-bounce-in">
          <div className="text-6xl mb-4 animate-float" aria-hidden="true">👑</div>
          <h2 className="text-h1 mb-2 text-ink">{t('premiumActivated')}</h2>
          <p className="text-sm mb-8 text-muted">{t('premiumActivatedDesc')}</p>
          <button onClick={onBack} className="btn btn-gold w-full py-4 text-base rounded-2xl">
            {t('premiumBack')}
          </button>
        </div>
      ) : (
        <>
          {/* Hero: строгое золото на глубоком тёмном */}
          <div
            className="rounded-3xl p-8 text-center mb-6 relative overflow-hidden text-white shadow-medium"
            style={{ background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2117 60%, #4a3208 100%)' }}
          >
            <div
              className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center shadow-gold"
              style={{ background: 'linear-gradient(135deg, #d4a017 0%, #f97316 100%)' }}
              aria-hidden="true"
            >
              <Crown size={32} strokeWidth={2} />
            </div>
            <h1 className="text-h1 mb-1">{t('premiumTitle')}</h1>
            <p className="text-sm opacity-70">{t('premiumTagline')}</p>
          </div>

          {/* Выгоды: строгая иерархия от главной */}
          <ul className="mb-6 space-y-3">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <li
                  key={i}
                  className={`glass-card flex items-center gap-3 animate-fade-in ${f.main ? 'p-4' : 'p-3 opacity-90'}`}
                  style={{ animationDelay: `${i * 0.06}s` }}
                >
                  <span
                    className={`flex items-center justify-center rounded-xl shrink-0 ${f.main ? 'w-10 h-10 text-white shadow-gold' : 'w-8 h-8 text-gold bg-elevated'}`}
                    style={f.main ? { background: 'linear-gradient(135deg, #d4a017, #f97316)' } : undefined}
                    aria-hidden="true"
                  >
                    <Icon size={f.main ? 20 : 16} strokeWidth={2.2} />
                  </span>
                  <span className={`${f.main ? 'text-sm font-bold' : 'text-sm font-medium'} text-ink min-w-0 flex-1`}>
                    {f.text}
                  </span>
                  <Check size={16} strokeWidth={3} className="text-success shrink-0" aria-hidden="true" />
                </li>
              );
            })}
          </ul>

          {/* Тарифы */}
          <div className="grid grid-cols-3 gap-2 mb-6">
            {PLANS.map((p) => {
              const isSelected = selected === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelected(p.id)}
                  className={`relative rounded-2xl border-2 p-3 text-center flex flex-col items-center gap-1 transition-all ${
                    isSelected ? 'border-gold shadow-gold' : 'border-line bg-card'
                  }`}
                  style={isSelected ? { background: 'rgba(212,160,23,0.08)' } : undefined}
                >
                  {p.badge && (
                    <span
                      className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap text-white"
                      style={{ background: 'linear-gradient(135deg, #d4a017, #f97316)' }}
                    >
                      {t(p.badge)}
                    </span>
                  )}
                  <span className="text-caption font-semibold uppercase tracking-wide text-muted">
                    {t('premium' + p.id.charAt(0).toUpperCase() + p.id.slice(1))}
                  </span>
                  <span className="text-base font-black text-ink">{p.price}</span>
                  <span className="text-[10px] text-muted">{t(p.period)}</span>
                </button>
              );
            })}
          </div>

          {/* CTA — крипто-оплата или демо */}
          {cryptoAvailable ? (
            <div className="space-y-3">
              <button
                onClick={startPayment}
                disabled={pay.phase === 'creating' || pay.phase === 'waiting' || pay.phase === 'checking'}
                className="btn btn-gold w-full py-4 text-base rounded-2xl"
              >
                {pay.phase === 'creating' || pay.phase === 'checking' ? (
                  <>
                    <Loader2 size={18} className="animate-spin" aria-hidden="true" />
                    {t('premiumProcessing')}
                  </>
                ) : (
                  <>
                    <Bitcoin size={20} strokeWidth={2.2} aria-hidden="true" />
                    {t('payTitle')}
                  </>
                )}
              </button>
              <p className="text-center text-caption text-muted">{t('payHint')}</p>

              {pay.phase === 'waiting' && (
                <div className="glass-card p-4 text-center animate-fade-in" role="status">
                  <p className="text-sm font-bold text-ink mb-1">{t('payWaiting')}</p>
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => window.open(pay.invoice.pay_url, '_blank', 'noopener')}
                      className="btn btn-secondary py-2 px-3 text-xs"
                    >
                      <ExternalLink size={14} strokeWidth={2.2} aria-hidden="true" />
                      {t('payOpenCheckout')}
                    </button>
                    <button onClick={manualCheck} className="btn btn-primary py-2 px-3 text-xs">
                      {t('payCheck')}
                    </button>
                  </div>
                </div>
              )}
              {pay.phase === 'unavailable' && (
                <p className="text-center text-caption text-muted">{t('payUnavailable')}</p>
              )}
              {pay.phase === 'error' && (
                <p className="text-center text-caption text-danger" role="alert">{t('payError')}</p>
              )}
            </div>
          ) : (
            <button onClick={demoActivate} className="btn btn-gold w-full py-4 text-base rounded-2xl">
              <Zap size={18} strokeWidth={2.2} aria-hidden="true" />
              {t('premiumActivate')} (demo)
            </button>
          )}

          {/* Текущий план */}
          {isPremium && (
            <div className="mt-6 rounded-2xl border-2 border-line p-4 text-center animate-fade-in">
              <p className="text-caption mb-2 text-muted">
                {t('premiumCurrent')}: <b className="text-gold">♛ {t('premium')}</b>
                {plan !== 'lifetime' && ` · ${PLANS.find((p) => p.id === plan)?.price}`}
              </p>
              <button onClick={cancel} className="text-xs underline transition-opacity hover:opacity-70 text-muted">
                {t('premiumCancel')}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
