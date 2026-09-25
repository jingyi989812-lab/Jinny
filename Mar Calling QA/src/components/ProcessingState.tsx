import { useEffect, useState } from 'react';
import { Sparkle } from './illustrations';

export const PROCESSING_STEPS = [
  { icon: '🎧', text: 'Listening to the conversation...' },
  { icon: '🔍', text: 'Checking ICC flow...' },
  { icon: '🧠', text: 'Analysing customer discovery...' },
  { icon: '💬', text: 'Reviewing communication...' },
  { icon: '📅', text: 'Checking appointment closing...' },
  { icon: '✨', text: 'Preparing your coaching report...' },
];

export const STEP_MS = 650;

export function ProcessingState({ engineLabel }: { engineLabel: string }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setStep((s) => Math.min(s + 1, PROCESSING_STEPS.length - 1)), STEP_MS);
    return () => window.clearInterval(t);
  }, []);
  return (
    <div className="card processing reveal" aria-live="polite">
      <div style={{ position: 'relative', width: 120, height: 120 }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: '3px dashed var(--ink)',
            animation: 'spin 8s linear infinite',
          }}
        />
        <div style={{ position: 'absolute', inset: 14, borderRadius: '50%', background: 'var(--yellow)', border: '2.5px solid var(--ink)', display: 'grid', placeItems: 'center', fontSize: 44, animation: 'pulse 1.3s ease-in-out infinite' }}>
          {PROCESSING_STEPS[step].icon}
        </div>
        <Sparkle size={26} style={{ position: 'absolute', right: -8, top: 4 }} className="twinkle" />
        <Sparkle size={18} color="#F6C6CC" style={{ position: 'absolute', left: -6, bottom: 10 }} className="twinkle" />
      </div>
      <div>
        <h2 style={{ fontSize: 26 }}>Your AI coach is reviewing the call</h2>
        <p className="muted small" style={{ marginTop: 4 }}>
          {engineLabel}
        </p>
      </div>
      <div className="proc-steps">
        {PROCESSING_STEPS.map((s, i) => (
          <div key={s.text} className={`proc-step ${i === step ? 'active' : i < step ? 'done' : ''}`}>
            <span aria-hidden style={{ fontSize: 20 }}>
              {s.icon}
            </span>
            {s.text}
            <span className="check" aria-hidden>
              {i < step ? '✅' : i === step ? '⏳' : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
