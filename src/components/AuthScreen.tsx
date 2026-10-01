import { useState } from 'react';
import { useAuth, type AuthResult } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';

type FormMode = 'login' | 'register' | 'reset';

/** Человекочекие сообщения из ошибок Supabase */
function friendlyError(t: (k: string) => string, err: string): string {
  const e = err.toLowerCase();
  if (e.includes('invalid login') || e.includes('invalid credentials')) return t('errInvalidCredentials');
  if (e.includes('already registered') || e.includes('already exists')) return t('errEmailTaken');
  if (e.includes('password') && e.includes('least')) return t('errPasswordShort');
  if (e.includes('rate limit') || e.includes('too many')) return e;
  return err;
}

export function AuthScreen() {
  const { t } = useI18n();
  const { login, register, resetPassword, authMode } = useAuth();
  const [mode, setMode] = useState<FormMode>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const switchMode = (m: FormMode) => {
    setMode(m);
    setError('');
    setNotice('');
  };

  const handleResult = (res: AuthResult) => {
    if (res.ok) {
      if (res.needsConfirmation) setNotice(t('authConfirmEmail'));
    } else {
      setError(friendlyError(t, res.error));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    try {
      if (mode === 'login') {
        handleResult(await login(email, password));
      } else if (mode === 'register') {
        if (username.length < 2) {
          setError(t('errUsernameShort'));
          return;
        }
        if (password.length < 4) {
          setError(t('errPasswordShort'));
          return;
        }
        handleResult(await register(username, email, password));
      } else {
        handleResult(await resetPassword(email));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-bg">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4" aria-hidden="true">♟</div>
          <h1 className="text-h1 font-black text-ink">M8</h1>
          <p className="text-sm mt-1 text-muted">{t('appTitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label htmlFor="reg-username" className="block text-sm font-medium mb-1 text-ink-secondary">
                {t('username')}
              </label>
              <input
                id="reg-username"
                name="username"
                autoComplete="nickname"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 outline-none transition-colors bg-card border-line focus:border-ink text-ink"
                required
              />
            </div>
          )}

          <div>
            <label htmlFor="auth-email" className="block text-sm font-medium mb-1 text-ink-secondary">
              {t('email')}
            </label>
            <input
              id="auth-email"
              name="email"
              autoComplete="email"
              inputMode="email"
              spellCheck={false}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 outline-none transition-colors bg-card border-line focus:border-ink text-ink"
              required
            />
          </div>

          {mode !== 'reset' && (
            <div>
              <div className="flex items-baseline justify-between mb-1">
                <label htmlFor="auth-password" className="block text-sm font-medium text-ink-secondary">
                  {t('password')}
                </label>
                {mode === 'login' && authMode === 'supabase' && (
                  <button
                    type="button"
                    onClick={() => switchMode('reset')}
                    className="text-xs underline text-muted"
                  >
                    {t('authResetLink')}
                  </button>
                )}
              </div>
              <input
                id="auth-password"
                name="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 outline-none transition-colors bg-card border-line focus:border-ink text-ink"
                required
              />
            </div>
          )}

          {error && (
            <div role="alert" className="text-sm text-danger text-center">{error}</div>
          )}
          {notice && (
            <div role="status" className="text-sm text-center text-success">{notice}</div>
          )}

          <button type="submit" disabled={busy} className="btn btn-primary w-full py-3">
            {busy
              ? t('loading')
              : mode === 'login'
              ? t('signIn')
              : mode === 'register'
              ? t('signUp')
              : t('authResetLink')}
          </button>
        </form>

        <div className="text-center mt-6 space-y-2">
          {mode === 'login' && (
            <button onClick={() => switchMode('register')} className="text-sm hover:underline text-muted">
              {t('noAccount')} {t('signUp')}
            </button>
          )}
          {mode === 'register' && (
            <button onClick={() => switchMode('login')} className="text-sm hover:underline text-muted">
              {t('haveAccount')} {t('signIn')}
            </button>
          )}
          {mode === 'reset' && (
            <button onClick={() => switchMode('login')} className="text-sm hover:underline text-muted">
              ← {t('signIn')}
            </button>
          )}
          {authMode === 'local' && (
            <p className="text-[10px] opacity-60">offline mode</p>
          )}
        </div>
      </div>
    </div>
  );
}
