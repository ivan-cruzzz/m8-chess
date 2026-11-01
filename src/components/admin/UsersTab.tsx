import { useCallback, useEffect, useState } from 'react';
import { Ban, RotateCcw, Trash2, Undo2 } from 'lucide-react';
import { useI18n } from '../../contexts/I18nContext';
import { supabaseEnabled } from '../../lib/supabase';
import {
  listLocalUsers,
  readProgressFor,
  resetProgressFor,
  deleteLocalUser,
  listSupabaseUsers,
  setUserBanned,
  type SupabaseRow,
} from '../../admin/store';

const fill = (s: string, vars: Record<string, string | number>) =>
  Object.entries(vars).reduce((acc, [k, v]) => acc.replace(`{${k}}`, String(v)), s);

interface LocalRow {
  email: string;
  username: string;
  xp: number;
  level: number;
  elo: number;
  streak: number;
  lastDay: string | null;
}

/** Последний день любой активности профиля (activityLog или lastPlayed у старых) */
const lastDayOf = (p: { activityLog: Record<string, number>; lastPlayed: string | null }): string | null => {
  const days = Object.keys(p.activityLog);
  return days.length > 0 ? days.sort().at(-1)! : p.lastPlayed;
};

/** Вкладка Пользователи: локальные (прогресс, сброс, удаление) и Supabase (роль, блокировка) */
export function UsersTab() {
  const { t } = useI18n();
  const [locals, setLocals] = useState<LocalRow[]>([]);
  const [sbRows, setSbRows] = useState<SupabaseRow[] | null>(null);
  const [sbFailed, setSbFailed] = useState(false);
  const [notice, setNotice] = useState('');

  const reloadLocals = useCallback(() => {
    setLocals(
      listLocalUsers().map((u) => {
        const p = readProgressFor(u.email);
        return {
          email: u.email,
          username: u.username,
          xp: p?.xp ?? 0,
          level: p?.level ?? 1,
          elo: p?.puzzleElo ?? 1000,
          streak: p?.streak ?? 0,
          lastDay: p ? lastDayOf(p) : null,
        };
      })
    );
  }, []);

  const reloadSupabase = useCallback(async () => {
    if (!supabaseEnabled) return;
    const rows = await listSupabaseUsers();
    setSbRows(rows);
    setSbFailed(rows === null);
  }, []);

  useEffect(() => {
    reloadLocals();
    void reloadSupabase();
  }, [reloadLocals, reloadSupabase]);

  const resetProgress = (u: LocalRow) => {
    // Подтверждение обязательно: операция необратима для игрока
    if (!window.confirm(fill(t('adminResetConfirm'), { name: u.username }))) return;
    resetProgressFor(u.email);
    reloadLocals();
    setNotice(t('adminResetDone'));
  };

  const deleteUser = (u: LocalRow) => {
    if (!window.confirm(fill(t('adminDeleteConfirm'), { name: u.username }))) return;
    deleteLocalUser(u.email);
    reloadLocals();
    setNotice(t('adminUserDeleted'));
  };

  const toggleBan = async (row: SupabaseRow) => {
    await setUserBanned(row.id, !row.banned);
    await reloadSupabase();
    setNotice(t('adminBannedDone'));
  };

  return (
    <div className="space-y-5">
      {notice && <p className="text-caption text-success">{notice}</p>}

      {/* Локальные пользователи */}
      <div className="glass-card p-4">
        <p className="text-sm font-bold text-ink mb-3">{t('adminLocalUsers')}</p>
        {locals.length === 0 ? (
          <p className="text-caption text-muted">{t('adminNoLocalUsers')}</p>
        ) : (
          <ul className="space-y-3">
            {locals.map((u) => (
              <li key={u.email} className="rounded-xl border border-line p-3">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-ink truncate">{u.username}</p>
                    <p className="text-caption text-muted truncate">{u.email}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => resetProgress(u)}
                      aria-label={t('resetProgress')}
                      title={t('resetProgress')}
                      className="btn btn-secondary p-2"
                    >
                      <RotateCcw size={14} strokeWidth={2.2} aria-hidden="true" />
                    </button>
                    <button
                      onClick={() => deleteUser(u)}
                      aria-label={t('deleteUser')}
                      title={t('deleteUser')}
                      className="btn btn-danger p-2"
                    >
                      <Trash2 size={14} strokeWidth={2.2} aria-hidden="true" />
                    </button>
                  </div>
                </div>
                <p className="text-caption text-muted">
                  XP {u.xp} · {t('level')} {u.level} · {t('elo')} {u.elo} · {t('streak')} {u.streak}
                  {u.lastDay ? ` · ${t('adminLastActivity')}: ${u.lastDay}` : ''}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Supabase-пользователи: только в облачном режиме */}
      <div className="glass-card p-4">
        <p className="text-sm font-bold text-ink mb-3">Supabase</p>
        {!supabaseEnabled ? (
          <p className="text-caption text-muted flex items-center gap-2">
            <Ban size={14} strokeWidth={2.2} aria-hidden="true" />
            {t('adminSupabaseOff')}
          </p>
        ) : sbFailed ? (
          <p className="text-caption text-danger">{t('adminSupabaseError')}</p>
        ) : (sbRows ?? []).length === 0 ? (
          <p className="text-caption text-muted">{t('adminNoLocalUsers')}</p>
        ) : (
          <ul className="space-y-2">
            {(sbRows ?? []).map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm text-ink truncate">
                    {row.username || row.id.slice(0, 8)}
                    {row.role === 'admin' && <span className="ml-1 text-caption text-gold">{row.role}</span>}
                    {row.banned && <span className="ml-1 text-caption text-danger">{t('adminBannedLabel')}</span>}
                  </p>
                  <p className="text-caption text-muted">
                    {t('adminRoleLabel')}: {row.role || 'user'}
                  </p>
                </div>
                <button
                  onClick={() => void toggleBan(row)}
                  className={`btn ${row.banned ? 'btn-secondary' : 'btn-danger'} py-1.5 px-2 text-xs shrink-0`}
                >
                  {row.banned ? (
                    <Undo2 size={12} strokeWidth={2.2} aria-hidden="true" />
                  ) : (
                    <Ban size={12} strokeWidth={2.2} aria-hidden="true" />
                  )}
                  {row.banned ? t('adminUnban') : t('adminBan')}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
