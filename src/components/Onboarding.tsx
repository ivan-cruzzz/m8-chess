import { useState } from 'react';
import { useI18n } from '../contexts/I18nContext';

interface OnboardingProps {
  onComplete: () => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const { t } = useI18n();
  const [step, setStep] = useState(0);

  const steps = [
    { icon: '♟', title: t('welcome'), text: t('welcomeDesc') },
    { icon: '🎯', title: t('solvePuzzles'), text: t('solvePuzzlesDesc') },
    { icon: '🔥', title: t('keepStreak'), text: t('keepStreakDesc') },
  ];

  const current = steps[step];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: 'var(--bg-primary)' }}>
      <div className="w-full max-w-sm text-center animate-fade-in">
        <div className="text-7xl mb-6">{current.icon}</div>
        <h1 className="text-2xl font-black mb-3" style={{ color: 'var(--text-primary)' }}>{current.title}</h1>
        <p className="mb-8 leading-relaxed" style={{ color: 'var(--text-muted)' }}>{current.text}</p>

        <div className="flex justify-center gap-2 mb-8">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all ${
                i === step ? 'w-6' : 'w-2'
              }`}
              style={{ background: i === step ? 'var(--text-primary)' : 'var(--border-color)' }}
            />
          ))}
        </div>

        <button
          onClick={() => {
            if (step < steps.length - 1) setStep(step + 1);
            else onComplete();
          }}
          className="w-full py-4 rounded-2xl font-bold text-lg transition-all active:scale-95"
          style={{ background: 'var(--text-primary)', color: 'var(--bg-primary)' }}
        >
          {step < steps.length - 1 ? t('next') : t('startLearning')}
        </button>
      </div>
    </div>
  );
}
