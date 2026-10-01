import { useState } from 'react';
import { ArrowUpFromLine, ArrowDownToLine } from 'lucide-react';
import { useI18n } from '../contexts/I18nContext';
import type { UserProgress } from '../types';

interface TransferCardProps {
  progress: UserProgress;
  onImport: (data: Partial<UserProgress>) => void;
}

const PREFIX = 'CHUP1.';

function checksum(s: string): number {
  let sum = 0;
  for (let i = 0; i < s.length; i++) sum = (sum + s.charCodeAt(i) * (i + 1)) % 65521;
  return sum;
}

export function encodeProfile(p: Partial<UserProgress>): string {
  const json = JSON.stringify(p);
  const b64 = btoa(unescape(encodeURIComponent(json)));
  const cs = checksum(b64).toString(36);
  return PREFIX + cs + '.' + b64;
}

export function decodeProfile(code: string): Partial<UserProgress> | null {
  try {
    const trimmed = code.trim();
    if (!trimmed.startsWith(PREFIX)) return null;
    const rest = trimmed.slice(PREFIX.length);
    const dot = rest.indexOf('.');
    if (dot < 0) return null;
    const cs = rest.slice(0, dot);
    const b64 = rest.slice(dot + 1);
    if (checksum(b64).toString(36) !== cs) return null;
    const json = decodeURIComponent(escape(atob(b64)));
    const data = JSON.parse(json);
    if (typeof data !== 'object' || data === null || typeof data.xp !== 'number') return null;
    return data as Partial<UserProgress>;
  } catch {
    return null;
  }
}

export function TransferCard({ progress, onImport }: TransferCardProps) {
  const { t } = useI18n();
  const [mode, setMode] = useState<null | 'export' | 'import'>(null);
  const [code, setCode] = useState('');
  const [input, setInput] = useState('');
  const [msg, setMsg] = useState('');
  const [copied, setCopied] = useState(false);

  const doExport = () => {
    setCode(encodeProfile(progress));
    setMode('export');
    setMsg('');
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  };

  const doImport = () => {
    const data = decodeProfile(input);
    if (!data) {
      setMsg(t('transferBad'));
      return;
    }
    if (window.confirm(t('transferConfirm'))) {
      onImport(data);
      setMsg(t('transferDone'));
      setMode(null);
      setInput('');
    }
  };

  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold mb-3 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
        {t('transferTitle')}
      </h3>
      <div className="flex gap-2">
        <button
          onClick={doExport}
          className="btn btn-secondary flex-1 py-3 text-sm"
        >
          <ArrowUpFromLine size={16} strokeWidth={2.2} aria-hidden="true" />
          {t('transferExport')}
        </button>
        <button
          onClick={() => { setMode('import'); setMsg(''); }}
          className="btn btn-secondary flex-1 py-3 text-sm"
        >
          <ArrowDownToLine size={16} strokeWidth={2.2} aria-hidden="true" />
          {t('transferImport')}
        </button>
      </div>

      {mode === 'export' && (
        <div className="mt-3 animate-fade-in">
          <p className="text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>{t('transferCode')}:</p>
          <div className="glass-card p-3 flex gap-2 items-start">
            <code className="flex-1 text-[10px] break-all font-mono max-h-24 overflow-y-auto" style={{ color: 'var(--text-secondary)' }}>
              {code}
            </code>
            <button onClick={copy} className="text-xs font-bold px-3 py-1.5 rounded-lg shrink-0" style={{ background: 'var(--text-primary)', color: 'var(--bg-primary)' }}>
              {copied ? t('transferCopied') : '⧉'}
            </button>
          </div>
        </div>
      )}

      {mode === 'import' && (
        <div className="mt-3 animate-fade-in">
          <p className="text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>{t('transferPaste')}:</p>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 rounded-xl text-xs font-mono outline-none resize-none"
            style={{ background: 'var(--bg-secondary)', border: '2px solid var(--border-color)', color: 'var(--text-primary)' }}
          />
          <button
            onClick={doImport}
            className="btn btn-primary mt-2 w-full py-2.5 text-sm"
          >
            {t('transferApply')}
          </button>
          {msg && <p className={`text-xs mt-2 text-center ${msg === t('transferBad') ? 'text-danger' : 'text-success'}`}>{msg}</p>}
        </div>
      )}
    </div>
  );
}
