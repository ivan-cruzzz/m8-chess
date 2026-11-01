import { useCallback, useEffect, useState } from 'react';
import { BadgeCheck, Ticket } from 'lucide-react';
import { useI18n } from '../../contexts/I18nContext';
import type { Plan } from '../../contexts/SubscriptionContext';
import {
  listLocalUsers,
  listSupabaseUsers,
  setUserPlan,
  revokeUserPlan,
  listLocalPlans,
  listPromos,
  savePromo,
  setPromoActive,
  type SupabaseRow,
} from '../../admin/store';
import { fill } from '../../admin/fill';

const PLANS: Plan[] = ['monthly', 'yearly', 'lifetime'];
const planKey = (p: Plan) => (p === 'monthly' ? 'premiumMonthly' : p === 'yearly' ? 'premiumYearly' : 'premiumLifetime');

/** Событие для SubscriptionContext: выданный/отобранный план виден игроку без перезахода */
const notifyPlanChanged = () => window.dispatchEvent(new Event('chessup-plan-changed'));

interface GrantRow {
  userId: string;
  text: string;
}

/** Вкладка Премиум: выдача/отбор плана (план + срок) и управление промокодами */
export function PremiumTab() {
  const { t } = useI18n();
  const [users, setUsers] = useState<{ id: string; label: string }[]>([]);
  const [grants, setGrants] = useState<GrantRow[]>([]);
  const [promos, setPromos] = useState(listPromos);

  // Форма выдачи плана
  const [target, setTarget] = useState('');
  const [plan, setPlan] = useState<Plan>('monthly');
  const [days, setDays] = useState(0);
  const [notice, setNotice] = useState('');

  // Форма промокода
  const [code, setCode] = useState('');
  const [promoPlan, setPromoPlan] = useState<Plan>('monthly');
  const [promoDays, setPromoDays] = useState(30);
  const [promoMaxUses, setPromoMaxUses] = useState(1);

  const reloadGrants = useCallback(() => {
    const rows: GrantRow[] = listLocalPlans().map(({ userId, grant }) => ({
      userId,
      text: `${t(planKey(grant.plan))}${grant.until ? ` → ${grant.until.slice(0, 10)}` : ''}`,
    }));
    setGrants(rows);
  }, [t]);

  useEffect(() => {
    const local = listLocalUsers().map((u) => ({ id: u.email, label: `${u.username} (${u.email})` }));
    setUsers(local);
    void listSupabaseUsers().then((rows: SupabaseRow[] | null) => {
      if (!rows) return;
      // Облачные пользователи получают локальную выдачу по UUID — работает на этом устройстве
      const known = new Set(local.map((u) => u.id));
      setUsers((prev) => [...prev, ...rows.filter((r) => !known.has(r.id)).map((r) => ({ id: r.id, label: r.username || r.id.slice(0, 8) }))]);
    });
    reloadGrants();
  }, [reloadGrants]);

  const grant = () => {
    if (!target) return;
    const untilIso = days > 0 ? new Date(Date.now() + days * 86_400_000).toISOString() : undefined;
    setUserPlan(target, plan, untilIso);
    notifyPlanChanged();
    reloadGrants();
    setNotice(t('adminGrantDone'));
  };

  const revoke = () => {
    if (!target) return;
    revokeUserPlan(target);
    notifyPlanChanged();
    reloadGrants();
    setNotice(t('adminGrantDone'));
  };

  const createPromo = () => {
    const clean = code.trim();
    if (!clean) return;
    savePromo({ code: clean, plan: promoPlan, days: promoDays, maxUses: Math.max(1, promoMaxUses), uses: 0, active: true });
    setPromos(listPromos());
    setCode('');
  };

  const togglePromo = (promoCode: string, active: boolean) => {
    setPromoActive(promoCode, active);
    setPromos(listPromos());
  };

  return (
    <div className="space-y-5">
      {notice && <p className="text-caption text-success">{notice}</p>}

      {/* Выдача/отбор плана */}
      <div className="glass-card p-4 space-y-3">
        <p className="text-sm font-bold text-ink flex items-center gap-2">
          <BadgeCheck size={16} strokeWidth={2.2} className="text-gold" aria-hidden="true" />
          {t('adminGrantTitle')}
        </p>
        <label className="block">
          <span className="text-caption text-muted">{t('adminGrantUser')}</span>
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="w-full mt-1 px-3 py-2.5 rounded-xl border-2 border-line bg-card text-sm text-ink"
          >
            <option value="">—</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.label}</option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="text-caption text-muted">{t('adminGrantPlanLabel')}</span>
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value as Plan)}
              className="w-full mt-1 px-3 py-2.5 rounded-xl border-2 border-line bg-card text-sm text-ink"
            >
              {PLANS.map((p) => (
                <option key={p} value={p}>{t(planKey(p))}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-caption text-muted">{t('adminGrantDays')}</span>
            <input
              type="number"
              min={0}
              value={days}
              onChange={(e) => setDays(Math.max(0, Number(e.target.value) || 0))}
              className="w-full mt-1 px-3 py-2.5 rounded-xl border-2 border-line bg-card text-sm text-ink"
            />
          </label>
        </div>
        <div className="flex gap-2">
          <button onClick={grant} disabled={!target} className="btn btn-primary flex-1 py-2.5 text-sm rounded-xl">
            {t('adminGrant')}
          </button>
          <button onClick={revoke} disabled={!target} className="btn btn-danger flex-1 py-2.5 text-sm rounded-xl">
            {t('adminRevoke')}
          </button>
        </div>
        {/* Уже выданные планы: у кого и до какого числа */}
        {grants.length > 0 && (
          <ul className="text-caption text-muted space-y-1 pt-1">
            {grants.map((g) => (
              <li key={g.userId} className="truncate">
                {g.userId}: <b className="text-ink">{g.text}</b>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Промокоды */}
      <div className="glass-card p-4 space-y-3">
        <p className="text-sm font-bold text-ink flex items-center gap-2">
          <Ticket size={16} strokeWidth={2.2} className="text-gold" aria-hidden="true" />
          {t('adminPromoTitle')}
        </p>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder={t('adminPromoCode')}
          className="w-full px-3 py-2.5 rounded-xl border-2 border-line bg-card text-sm text-ink"
        />
        <div className="grid grid-cols-3 gap-2">
          <label className="block">
            <span className="text-caption text-muted">{t('adminGrantPlanLabel')}</span>
            <select
              value={promoPlan}
              onChange={(e) => setPromoPlan(e.target.value as Plan)}
              className="w-full mt-1 px-2 py-2.5 rounded-xl border-2 border-line bg-card text-sm text-ink"
            >
              {PLANS.map((p) => (
                <option key={p} value={p}>{t(planKey(p))}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-caption text-muted">{t('adminPromoDays')}</span>
            <input
              type="number"
              min={0}
              value={promoDays}
              onChange={(e) => setPromoDays(Math.max(0, Number(e.target.value) || 0))}
              className="w-full mt-1 px-2 py-2.5 rounded-xl border-2 border-line bg-card text-sm text-ink"
            />
          </label>
          <label className="block">
            <span className="text-caption text-muted">{t('adminPromoMaxUses')}</span>
            <input
              type="number"
              min={1}
              value={promoMaxUses}
              onChange={(e) => setPromoMaxUses(Math.max(1, Number(e.target.value) || 1))}
              className="w-full mt-1 px-2 py-2.5 rounded-xl border-2 border-line bg-card text-sm text-ink"
            />
          </label>
        </div>
        <button onClick={createPromo} disabled={!code.trim()} className="btn btn-primary w-full py-2.5 text-sm rounded-xl">
          {t('adminPromoCreate')}
        </button>

        {promos.length === 0 ? (
          <p className="text-caption text-muted">{t('adminNoPromos')}</p>
        ) : (
          <ul className="space-y-2 pt-1">
            {promos.map((p) => (
              <li key={p.code} className="flex items-center justify-between gap-2 rounded-xl border border-line p-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-ink truncate">
                    {p.code}
                    {!p.active && <span className="ml-1 text-caption text-danger">{t('adminPromoDisabled')}</span>}
                  </p>
                  <p className="text-caption text-muted">
                    {t(planKey(p.plan))} · {p.days}d · {fill(t('adminPromoUses'), { uses: p.uses, max: p.maxUses })}
                  </p>
                </div>
                <button
                  onClick={() => togglePromo(p.code, !p.active)}
                  className={`btn ${p.active ? 'btn-danger' : 'btn-secondary'} py-1.5 px-2 text-xs shrink-0`}
                >
                  {p.active ? t('adminPromoOff') : t('adminPromoOn')}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
