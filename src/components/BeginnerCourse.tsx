import { useState } from 'react';
import { X } from 'lucide-react';
import { useI18n } from '../contexts/I18nContext';
import { courseSlides } from '../data/course';
import { StaticBoard } from './StaticBoard';

interface BeginnerCourseProps {
  onDone: () => void;
}

export function BeginnerCourse({ onDone }: BeginnerCourseProps) {
  const { t, lang } = useI18n();
  const [idx, setIdx] = useState(0);
  const slide = courseSlides[idx];
  const isLast = idx === courseSlides.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in p-4">
      <div className="glass-card p-6 max-w-sm w-full max-h-[85vh] overflow-y-auto no-scrollbar animate-bounce-in" style={{ borderRadius: '1.5rem' }}>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            {t('course')} · {idx + 1}/{courseSlides.length}
          </span>
          <button onClick={onDone} className="btn btn-ghost p-2" aria-label="×">
            <X size={20} strokeWidth={2.4} aria-hidden="true" />
          </button>
        </div>

        <div key={idx} className="animate-slide-up">
          <div className="text-4xl text-center my-4" aria-hidden="true">{slide.icon}</div>
          <h3 className="text-xl font-black text-center mb-3" style={{ color: 'var(--text-primary)' }}>
            {slide.title[lang]}
          </h3>
          {slide.fen && (
            <div className="max-w-[200px] mx-auto mb-4">
              <StaticBoard fen={slide.fen} />
            </div>
          )}
          <p className="text-sm leading-relaxed mb-6 text-center" style={{ color: 'var(--text-secondary)' }}>
            {slide.text[lang]}
          </p>
        </div>

        {/* Точки прогресса */}
        <div className="flex justify-center gap-1.5 mb-5">
          {courseSlides.map((_, i) => (
            <span
              key={i}
              className="w-2 h-2 rounded-full transition-all"
              style={{ background: i === idx ? 'var(--text-primary)' : i < idx ? '#22c55e' : 'var(--border-color)' }}
            />
          ))}
        </div>

        <button
          onClick={() => (isLast ? onDone() : setIdx(idx + 1))}
          className="w-full py-3.5 rounded-xl font-bold"
          style={{
            background: isLast ? 'linear-gradient(135deg, #d4a017, #f97316)' : 'var(--text-primary)',
            color: isLast ? '#fff' : 'var(--bg-primary)',
          }}
        >
          {isLast ? t('courseDone') : t('next')}
        </button>
      </div>
    </div>
  );
}
