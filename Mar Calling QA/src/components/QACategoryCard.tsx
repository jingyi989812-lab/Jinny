import type { CategoryStat } from '@/services/analytics';
import { SECTION_STATUS_META } from '@/services/scoring';
import { Bar } from './ui';

const STATUS_COPY: Record<string, string> = {
  excellent: 'Team strength ✨',
  strong: 'Good foundation',
  developing: 'Growing nicely',
  needs_improvement: 'Training priority',
  missed: 'Needs attention',
};

/** Category card: section, average points, percentage, status and the top recurring gap. */
export function QACategoryCard({ stat, onClick }: { stat: CategoryStat; onClick?: () => void }) {
  const meta = SECTION_STATUS_META[stat.status];
  return (
    <div className="card card-tight lift clickable" onClick={onClick} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onClick?.()}>
      <div className="row" style={{ gap: 10 }}>
        <span style={{ fontSize: 26 }} aria-hidden>
          {stat.emoji}
        </span>
        <div style={{ minWidth: 0 }}>
          <div className="eyebrow">
            {stat.code} · {stat.name}
          </div>
          <div className="tabular" style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 650 }}>
            {stat.averageScore} <span className="muted" style={{ fontSize: 15 }}>/ {stat.maxScore}</span>
          </div>
        </div>
        <span className="spacer" />
        <div className="tabular" style={{ fontWeight: 800, fontSize: 18 }}>
          {stat.percentage}%
        </div>
      </div>
      <div style={{ margin: '10px 0' }}>
        <Bar percentage={stat.percentage} status={stat.status} label={stat.name} />
      </div>
      <div className="row small" style={{ gap: 6 }}>
        <span className={`pill pill-${meta.tone}`}>
          {meta.emoji} {STATUS_COPY[stat.status]}
        </span>
      </div>
      {stat.topGap && (
        <div className="small muted" style={{ marginTop: 8 }}>
          Most common gap: <strong style={{ color: 'var(--ink)' }}>{stat.topGap.title}</strong> ({stat.topGap.count} calls)
        </div>
      )}
    </div>
  );
}
