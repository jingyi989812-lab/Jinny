import { useEffect, useState } from 'react';
import type { OverallStatus } from '@/types/framework';

const TONE: Record<OverallStatus, string> = { pass: '#4F9A64', needs_improvement: '#E2A23A', fail: '#D35C6E' };

/** Large circular score. Animates from 0 on mount. */
export function ScoreRing({
  percentage,
  status,
  size = 200,
  stroke = 18,
  label,
  onClick,
}: {
  percentage: number;
  status: OverallStatus;
  size?: number;
  stroke?: number;
  label?: string;
  onClick?: () => void;
}) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const t = window.setTimeout(() => setShown(percentage), 80);
    return () => window.clearTimeout(t);
  }, [percentage]);
  const r = (size - stroke) / 2 - 4;
  const c = 2 * Math.PI * r;
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      className="ring-wrap"
      onClick={onClick}
      style={onClick ? { background: 'none', border: 0, padding: 0, cursor: 'pointer' } : undefined}
      aria-label={`Score ${percentage}%${onClick ? ' — open detailed scorecard' : ''}`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r + stroke / 2 + 3} fill="#FFFDF8" stroke="#2A2630" strokeWidth="2.5" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EBE7E0" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={TONE[status]}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - shown / 100)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(.2,.8,.2,1)' }}
        />
        <circle cx={size / 2} cy={size / 2} r={r - stroke / 2 - 4} fill="none" stroke="#2A2630" strokeWidth="1.5" strokeDasharray="3 5" opacity="0.35" />
      </svg>
      <div className="ring-center">
        <div>
          <div className="ring-value" style={{ fontSize: size * 0.26 }}>
            {Math.round(shown)}
            <span style={{ fontSize: size * 0.12 }}>%</span>
          </div>
          {label && <div className="small muted" style={{ fontWeight: 700 }}>{label}</div>}
        </div>
      </div>
    </Tag>
  );
}
