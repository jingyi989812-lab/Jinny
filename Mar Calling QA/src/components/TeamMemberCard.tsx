import type { StaffStat } from '@/services/analytics';
import { Avatar } from './illustrations';
import { Sparkline } from './charts/TrendChart';
import { Trend } from './ui';

export function TeamMemberCard({ stat, onClick, compact, vs }: { stat: StaffStat; onClick?: () => void; compact?: boolean; vs?: string }) {
  const score = stat.thisMonth ?? stat.average;
  const tones: Record<string, string> = { yellow: 'var(--yellow-50)', pink: 'var(--pink-50)', green: 'var(--green-50)' };
  return (
    <div
      className="card lift clickable"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
      style={{ padding: compact ? 16 : 20, background: tones[stat.motivation.tone] }}
      aria-label={`${stat.staff.name}, ${score}%`}
    >
      <div className="row" style={{ gap: 12 }}>
        <Avatar style={stat.staff.avatar} size={compact ? 50 : 62} title={stat.staff.name} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: compact ? 18 : 20, fontWeight: 650, lineHeight: 1.1 }}>{stat.staff.name}</div>
          <div className="tiny muted" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {stat.staff.role}
          </div>
        </div>
        <span className="pill pill-neutral" style={{ background: '#fff' }}>
          {stat.motivation.emoji} {stat.motivation.label}
        </span>
      </div>
      <div className="row" style={{ marginTop: 12, gap: 10, alignItems: 'flex-end' }}>
        <div className="kpi-value" style={{ fontSize: compact ? 32 : 38, marginTop: 0 }}>
          {Math.round(score)}
          <span style={{ fontSize: 16 }}>%</span>
        </div>
        <div style={{ paddingBottom: 4 }}>
          <Trend delta={stat.delta} vs={vs} />
        </div>
        <span className="spacer" />
        <Sparkline values={stat.spark} width={compact ? 64 : 90} />
      </div>
      {!compact && stat.focusSection && (
        <div className="small muted" style={{ marginTop: 10 }}>
          🌟 Strongest: <strong style={{ color: 'var(--ink)' }}>{stat.strongestSection?.name}</strong> · 🎯 Next focus:{' '}
          <strong style={{ color: 'var(--ink)' }}>{stat.focusSection.name}</strong>
        </div>
      )}
    </div>
  );
}
