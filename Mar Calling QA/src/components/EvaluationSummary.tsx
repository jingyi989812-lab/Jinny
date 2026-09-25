import { formatDate } from '@/services/analytics';
import { formatDuration } from '@/services/qaEvaluator/transcriptParser';
import { effectiveResult } from '@/services/scoring';
import type { Call } from '@/types/call';
import type { Staff } from '@/types/staff';
import { Avatar } from './illustrations';
import { LeadNumber, StatusPill } from './ui';

/** CALL SNAPSHOT — executive summary in the style of the reference QA reports. */
export function EvaluationSummary({ call, staff }: { call: Call; staff?: Staff }) {
  const ev = call.evaluation;
  const r = effectiveResult(call);
  const Item = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
      <div className="eyebrow">{label}</div>
      <div style={{ fontWeight: 700, marginTop: 2 }}>{children}</div>
    </div>
  );
  return (
    <div className="card" style={{ background: 'linear-gradient(135deg, #FFFDF8 0%, #FFF7DC 100%)' }}>
      <div className="card-head">
        <div>
          <div className="eyebrow">📸 Call Snapshot</div>
          <h2 style={{ marginTop: 4 }}>Executive summary</h2>
        </div>
        <span className="spacer" />
        <span className="tag">{call.id}</span>
      </div>
      <div className="row" style={{ gap: 14, marginBottom: 18 }}>
        {staff && <Avatar style={staff.avatar} size={64} title={staff.name} />}
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 650 }}>{call.staffName}</div>
          <div className="small muted">
            {staff?.role ?? 'Consultant'} · {call.outlet}
          </div>
        </div>
        <span className="spacer" />
        <div style={{ textAlign: 'right' }}>
          <div className="kpi-value" style={{ marginTop: 0 }}>
            {r.percentage}%
          </div>
          <StatusPill status={r.status} />
        </div>
      </div>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16 }}>
        <Item label="Date">{formatDate(call.callDate)}</Item>
        <Item label="Duration">{formatDuration(call.durationSec)}</Item>
        <Item label="Overall score">
          {r.score} / {r.max}
          {r.reviewed && <span className="tiny faint"> (QA final)</span>}
        </Item>
        <Item label="Lead">
          <LeadNumber value={call.leadNumber} />
        </Item>
        <Item label="Source">{call.leadSource}</Item>
        <Item label="Language">{call.language}</Item>
        {call.transcriptSource === 'recording-import' && <Item label="Recording">#{call.id.split('-').pop()}</Item>}
      </div>
      <div className="grid grid-2" style={{ marginTop: 18 }}>
        <div className="card card-flat card-green card-tight">
          <div className="eyebrow">🌟 Main strength</div>
          <div style={{ fontWeight: 800, fontSize: 17, marginTop: 4 }}>{ev.summary.mainStrength?.label ?? 'Insufficient evidence to determine.'}</div>
        </div>
        <div className="card card-flat card-pink card-tight">
          <div className="eyebrow">🎯 Main gap</div>
          <div style={{ fontWeight: 800, fontSize: 17, marginTop: 4 }}>{ev.summary.mainGap?.label ?? 'No gaps detected 🎉'}</div>
        </div>
      </div>
      <p style={{ marginTop: 16, lineHeight: 1.65 }}>{ev.summary.narrative}</p>
      <p className="tiny faint" style={{ marginTop: 6 }}>
        Summary auto-generated from the findings below · {ev.frameworkVersion}
      </p>
    </div>
  );
}
