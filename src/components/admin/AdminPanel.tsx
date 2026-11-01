import { useState } from 'react';
import { LayoutDashboard, Users, Crown, Settings as SettingsIcon, LogOut } from 'lucide-react';
import { useI18n } from '../../contexts/I18nContext';
import { endAdminSession } from '../../admin/auth';
import { DashboardTab } from './DashboardTab';
import { UsersTab } from './UsersTab';
import { PremiumTab } from './PremiumTab';
import { SettingsTab } from './SettingsTab';

type AdminTab = 'dashboard' | 'users' | 'premium' | 'settings';

interface AdminPanelProps {
  /** Выход возвращает игрока на экран настроек */
  onExit: () => void;
}

/** Каркас панели: четыре вкладки, вся работа с данными — только через admin/store и admin/auth */
export function AdminPanel({ onExit }: AdminPanelProps) {
  const { t } = useI18n();
  const [tab, setTab] = useState<AdminTab>('dashboard');

  const tabs: Array<{ id: AdminTab; label: string; icon: typeof LayoutDashboard }> = [
    { id: 'dashboard', label: t('adminTabDashboard'), icon: LayoutDashboard },
    { id: 'users', label: t('adminTabUsers'), icon: Users },
    { id: 'premium', label: t('adminTabPremium'), icon: Crown },
    { id: 'settings', label: t('adminTabSettings'), icon: SettingsIcon },
  ];

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-6 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-h2 text-ink">{t('adminPanel')}</h2>
        <button
          onClick={() => {
            // «Выйти» закрывает сессию сразу, без ожидания 30-минутного TTL
            endAdminSession();
            onExit();
          }}
          className="btn btn-secondary py-2 px-3 text-xs"
        >
          <LogOut size={14} strokeWidth={2.2} aria-hidden="true" />
          {t('logout')}
        </button>
      </div>

      {/* Переключатель вкладок */}
      <div className="grid grid-cols-4 gap-1 p-1 mb-5 rounded-xl bg-elevated" role="tablist">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`flex flex-col items-center gap-0.5 py-2 rounded-lg text-[11px] font-semibold transition-colors ${
              tab === id ? 'bg-card text-ink shadow-subtle' : 'text-muted'
            }`}
          >
            <Icon size={16} strokeWidth={2.2} aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'dashboard' && <DashboardTab />}
      {tab === 'users' && <UsersTab />}
      {tab === 'premium' && <PremiumTab />}
      {tab === 'settings' && <SettingsTab />}
    </div>
  );
}
