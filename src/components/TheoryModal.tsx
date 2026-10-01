import { BookOpen, X } from 'lucide-react';
import { useI18n } from '../contexts/I18nContext';
import { getTheory } from '../data/theory';
import { StaticBoard } from './StaticBoard';

interface TheoryModalProps {
  theme: string;
  onClose: () => void;
}

export function TheoryModal({ theme, onClose }: TheoryModalProps) {
  const { t, lang } = useI18n();
  const entry = getTheory(theme);

  if (!entry) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in p-4">
      <div className="glass-card p-6 max-w-sm w-full max-h-[85vh] overflow-y-auto no-scrollbar animate-bounce-in" style={{ borderRadius: '1.5rem' }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-h2 flex items-center gap-2 text-ink">
            <BookOpen size={20} strokeWidth={2.2} className="text-gold" aria-hidden="true" />
            {entry.title[lang]}
          </h3>
          <button onClick={onClose} className="btn btn-ghost p-2" aria-label="×">
            <X size={20} strokeWidth={2.4} aria-hidden="true" />
          </button>
        </div>
        <div className="max-w-[220px] mx-auto mb-4">
          <StaticBoard fen={entry.exampleFen} />
        </div>
        <p className="text-sm leading-relaxed mb-5" style={{ color: 'var(--text-secondary)' }}>
          {entry.text[lang]}
        </p>
        <button onClick={onClose} className="btn btn-primary w-full py-3">
          {t('startLearning')}
        </button>
      </div>
    </div>
  );
}
