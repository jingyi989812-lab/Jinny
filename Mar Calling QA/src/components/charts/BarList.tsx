import type { ReactNode } from 'react';
import type { SectionStatus } from '@/types/framework';
import { Bar } from '../ui';

export interface BarItem {
  key: string;
  label: ReactNode;
  value: number; // 0–100 for bar length
  display: ReactNode;
  status: SectionStatus;
  hint?: string;
  onClick?: () => void;
}

/** Horizontal bars with direct labels; each row is a large click target. */
export function BarList({ items }: { items: BarItem[] }) {
  if (!items.length) return <div className="empty small muted">Nothing to show yet.</div>;
  return (
    <div className="stack" style={{ gap: 6 }}>
      {items.map((it) => (
        <div
          key={it.key}
          className={it.onClick ? 'clickable' : ''}
          onClick={it.onClick}
          role={it.onClick ? 'button' : undefined}
          tabIndex={it.onClick ? 0 : undefined}
          onKeyDown={(e) => it.onClick && e.key === 'Enter' && it.onClick()}
          title={it.hint}
          style={{ padding: '8px 10px', borderRadius: 14, transition: 'background .2s' }}
          onMouseEnter={(e) => it.onClick && (e.currentTarget.style.background = '#FFF7DC')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <div className="row" style={{ marginBottom: 6, gap: 8 }}>
            <div style={{ fontWeight: 700, minWidth: 0 }}>{it.label}</div>
            <span className="spacer" />
            <div className="tabular" style={{ fontWeight: 800 }}>
              {it.display}
            </div>
          </div>
          <Bar percentage={it.value} status={it.status} />
        </div>
      ))}
    </div>
  );
}
