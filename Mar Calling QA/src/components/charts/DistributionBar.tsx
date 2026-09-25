export interface DistSegment {
  key: string;
  label: string;
  emoji: string;
  count: number;
  color: string;
  onClick?: () => void;
}

/** Stacked 100% bar with 2px surface gaps, direct labels and a legend. */
export function DistributionBar({ segments }: { segments: DistSegment[] }) {
  const total = segments.reduce((s, x) => s + x.count, 0);
  if (!total) return <div className="empty small muted">No evaluated calls yet.</div>;
  return (
    <div className="stack">
      <div style={{ display: 'flex', gap: 2, height: 34, borderRadius: 12, overflow: 'hidden', background: '#FFFDF8' }} role="img" aria-label={segments.map((s) => `${s.label} ${s.count}`).join(', ')}>
        {segments
          .filter((s) => s.count)
          .map((s) => (
            <button
              key={s.key}
              onClick={s.onClick}
              title={`${s.label}: ${s.count} (${Math.round((s.count / total) * 100)}%)`}
              style={{ flex: s.count, background: s.color, border: 0, cursor: s.onClick ? 'pointer' : 'default', color: '#fff', fontWeight: 800, fontSize: 13, minWidth: 0, padding: 0 }}
            >
              {s.count / total > 0.08 ? `${Math.round((s.count / total) * 100)}%` : ''}
            </button>
          ))}
      </div>
      <div className="row-wrap" style={{ gap: 14 }}>
        {segments.map((s) => (
          <button key={s.key} className="row btn-ghost" onClick={s.onClick} style={{ gap: 8, border: 0, background: 'none', cursor: s.onClick ? 'pointer' : 'default', padding: 0 }}>
            <span style={{ width: 12, height: 12, borderRadius: 4, background: s.color, display: 'inline-block' }} />
            <span aria-hidden>{s.emoji}</span>
            <span style={{ fontWeight: 700 }}>{s.label}</span>
            <span className="muted tabular">{s.count}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
