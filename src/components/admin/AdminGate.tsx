import { useState, type FormEvent, type ReactNode } from 'react';
import { Shield } from 'lucide-react';
import { useI18n } from '../../contexts/I18nContext';
import {
  adminPasswordExists,
  setupAdminPassword,
  verifyAdminPassword,
  startAdminSession,
  adminSessionActive,
} from '../../admin/auth';

interface AdminGateProps {
  children: ReactNode;
}

/**
 * Вход в админ-панель: при первом входе задаётся пароль (два поля, проверка
 * совпадения), дальше — только ввод пароля. Успех открывает 30-минутную сессию,
 * после чего рендерятся дети. Без пароля данные панели не видны вовсе.
 */
export function AdminGate({ children }: AdminGateProps) {
  const { t } = useI18n();
  // exists один раз на монтирование: перезадать пароль через эту форму нельзя
  const [exists] = useState(() => adminPasswordExists());
  const [authed, setAuthed] = useState(() => adminSessionActive());
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!pw) return;
    if (!exists && pw !== pw2) {
      setError(t('adminMismatch'));
      return;
    }
    setBusy(true);
    try {
      if (!exists) {
        await setupAdminPassword(pw);
      } else if (!(await verifyAdminPassword(pw))) {
        setError(t('adminWrongPassword'));
        return;
      }
      startAdminSession();
      setAuthed(true);
    } catch {
      setError(t('adminWrongPassword'));
    } finally {
      setBusy(false);
    }
  };

  if (authed) return <>{children}</>;

  return (
    <div className="w-full max-w-sm mx-auto px-4 py-10 animate-fade-in">
      <div className="glass-card p-6">
        <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-2xl text-gold bg-elevated">
          <Shield size={26} strokeWidth={2.2} aria-hidden="true" />
        </div>
        <h2 className="text-h2 text-center text-ink mb-1">
          {exists ? t('adminGateLoginTitle') : t('adminGateSetupTitle')}
        </h2>
        <p className="text-caption text-center text-muted mb-5">
          {exists ? t('adminGateLoginDesc') : t('adminGateSetupDesc')}
        </p>
        <form onSubmit={submit} className="space-y-3">
          <input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder={t('password')}
            autoComplete={exists ? 'current-password' : 'new-password'}
            className="w-full px-4 py-3 rounded-xl border-2 border-line bg-card text-sm text-ink outline-none focus:border-gold"
          />
          {!exists && (
            <input
              type="password"
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              placeholder={t('adminRepeatPassword')}
              autoComplete="new-password"
              className="w-full px-4 py-3 rounded-xl border-2 border-line bg-card text-sm text-ink outline-none focus:border-gold"
            />
          )}
          {error && <p className="text-sm text-danger" role="alert">{error}</p>}
          <button type="submit" disabled={busy || !pw} className="btn btn-primary w-full py-3 text-sm rounded-xl">
            {exists ? t('signIn') : t('adminSave')}
          </button>
        </form>
      </div>
    </div>
  );
}
