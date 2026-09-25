import type { ReactNode } from 'react';
import { Sparkle } from './illustrations';
import { Trend } from './ui';

export function KPICard({
  icon,
  tint,
  value,
  label,
  delta,
  deltaSuffix = '',
  vs,
  footnote,
  onClick,
  delay = 0,
  invertDelta = false,
}: {
  icon: string;
  tint: string;
  value: ReactNode;
  label: string;
  delta?: number | null;
  deltaSuffix?: string;
  vs?: string;
  footnote?: string;
  onClick?: () => void;
  delay?: number;
  invertDelta?: boolean;
}) {
  return (
    <div
      className={`card kpi lift reveal ${onClick ? 'clickable' : ''}`}
      style={{ animationDelay: `${delay}s` }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => onClick && (e.key === 'Enter' || e.key === ' ') && onClick()}
    >
      <div className="kpi-icon" style={{ background: tint }} aria-hidden>
        {icon}
      </div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-label">{label}</div>
      {delta !== undefined && <Trend delta={delta} suffix={deltaSuffix} vs={vs} invert={invertDelta} />}
      {footnote && <div className="tiny faint">{footnote}</div>}
      <Sparkle size={30} color={tint} className="kpi-doodle" style={{ position: 'absolute', right: 14, top: 14 }} />
    </div>
  );
}
