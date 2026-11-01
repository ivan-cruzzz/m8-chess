import { useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { useI18n } from '../../contexts/I18nContext';
import { supabaseEnabled } from '../../lib/supabase';

const PREFIX = 'chessup-';

/** Все ключи приложения из localStorage (chessup-* — данные игроков и панели) */
function collectKeys(): string[] {
  const keys: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX)) keys.push(k);
    }
  } catch { /* ignore */ }
  return keys;
}

/**
 * Вкладка Настройки: статус окружения и полный бэкап всех chessup-* ключей
 * JSON-файлом (Blob для экспорта, FileReader для импорта — без зависимостей).
 */
export function SettingsTab() {
  const { t } = useI18n();
  const [notice, setNotice] = useState('');
  const [noticeBad, setNoticeBad] = useState(false);

  const exportAll = () => {
    const data: Record<string, string | null> = {};
    for (const k of collectKeys()) data[k] = localStorage.getItem(k);
    const payload = {
      app: 'm8-admin-backup',
      exportedAt: new Date().toISOString(),
      data,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chessup-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setNoticeBad(false);
    setNotice(t('adminExportAll'));
  };

  const importAll = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as { app?: string; data?: Record<string, string | null> };
        if (parsed.app !== 'm8-admin-backup' || !parsed.data || typeof parsed.data !== 'object') {
          setNoticeBad(true);
          setNotice(t('adminImportBad'));
          return;
        }
        // Подтверждение обязательно: импорт перезаписывает все данные приложения
        if (!window.confirm(t('adminImportConfirm'))) return;
        for (const [key, value] of Object.entries(parsed.data)) {
          // Защита: восстанавливаем только ключи приложения
          if (!key.startsWith(PREFIX)) continue;
          if (value === null) localStorage.removeItem(key);
          else localStorage.setItem(key, value);
        }
        setNoticeBad(false);
        setNotice(t('adminImportDone'));
      } catch {
        setNoticeBad(true);
        setNotice(t('adminImportBad'));
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-5">
      {/* Статус окружения */}
      <div className="glass-card p-4">
        <p className="text-sm font-bold text-ink mb-3">{t('adminEnvTitle')}</p>
        <p className="text-sm">
          <span className="text-muted">{t('adminEnvSupabase')}: </span>
          <b className={supabaseEnabled ? 'text-success' : 'text-muted'}>{supabaseEnabled ? t('adminEnvOn') : t('adminEnvOff')}</b>
        </p>
      </div>

      {/* Бэкап данных */}
      <div className="glass-card p-4 space-y-3">
        <p className="text-sm font-bold text-ink">{t('adminDataTitle')}</p>
        <button onClick={exportAll} className="btn btn-primary w-full py-3 text-sm rounded-xl flex items-center justify-center gap-2">
          <Download size={16} strokeWidth={2.2} aria-hidden="true" />
          {t('adminExportAll')}
        </button>
        <label className="btn btn-secondary w-full py-3 text-sm rounded-xl flex items-center justify-center gap-2 cursor-pointer">
          <Upload size={16} strokeWidth={2.2} aria-hidden="true" />
          {t('adminImportAll')}
          <input
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importAll(f);
              e.target.value = '';
            }}
          />
        </label>
        {notice && <p className={`text-caption ${noticeBad ? 'text-danger' : 'text-success'}`}>{notice}</p>}
        <p className="text-caption text-muted">localStorage · {collectKeys().length} × {PREFIX}*</p>
      </div>
    </div>
  );
}
