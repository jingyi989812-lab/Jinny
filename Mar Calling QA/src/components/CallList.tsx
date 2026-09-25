import { useNavigate } from 'react-router-dom';
import { formatDate } from '@/services/analytics';
import { formatDuration } from '@/services/qaEvaluator/transcriptParser';
import { effectiveResult } from '@/services/scoring';
import { useStore } from '@/services/store';
import type { Call } from '@/types/call';
import { Avatar } from './illustrations';
import { CallTypePill, LeadNumber, StatusPill } from './ui';

function sectionName(call: Call, id?: string) {
  return call.evaluation.sections.find((s) => s.sectionId === id);
}

export function CallTable({ calls }: { calls: Call[] }) {
  const navigate = useNavigate();
  const { staff } = useStore();
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Staff</th>
            <th>Duration</th>
            <th>Score</th>
            <th>Status</th>
            <th>Type</th>
            <th>Main strength</th>
            <th>Main gap</th>
            <th>Lead</th>
          </tr>
        </thead>
        <tbody>
          {calls.map((c) => {
            const r = effectiveResult(c);
            const s = staff.find((x) => x.id === c.staffId);
            const strength = sectionName(c, c.evaluation.summary.mainStrength?.sectionId);
            const gap = sectionName(c, c.evaluation.summary.mainGap?.sectionId);
            return (
              <tr key={c.id} className="clickable" onClick={() => navigate(`/calls/${c.id}`)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && navigate(`/calls/${c.id}`)}>
                <td className="nowrap">
                  <strong>{formatDate(c.callDate)}</strong>
                  <div className="tiny faint">{c.id}</div>
                </td>
                <td>
                  <div className="row" style={{ gap: 8 }}>
                    {s && <Avatar style={s.avatar} size={32} title={s.name} />}
                    <strong>{c.staffName}</strong>
                  </div>
                </td>
                <td className="tabular">{formatDuration(c.durationSec)}</td>
                <td className="tabular">
                  <strong style={{ fontSize: 17 }}>{r.percentage}%</strong>
                  {r.reviewed && <div className="tiny faint">QA reviewed</div>}
                </td>
                <td>
                  <StatusPill status={r.status} />
                </td>
                <td>
                  <CallTypePill callType={c.callType} source={c.callTypeSource} />
                </td>
                <td>{strength ? `${strength.emoji} ${strength.name}` : '—'}</td>
                <td>{gap ? `${gap.emoji} ${gap.name}` : '—'}</td>
                <td className="small">
                  <LeadNumber value={c.leadNumber} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function CallCards({ calls }: { calls: Call[] }) {
  const navigate = useNavigate();
  const { staff } = useStore();
  return (
    <div className="grid grid-3">
      {calls.map((c) => {
        const r = effectiveResult(c);
        const s = staff.find((x) => x.id === c.staffId);
        const gap = sectionName(c, c.evaluation.summary.mainGap?.sectionId);
        const strength = sectionName(c, c.evaluation.summary.mainStrength?.sectionId);
        return (
          <div key={c.id} className="card card-tight lift clickable" onClick={() => navigate(`/calls/${c.id}`)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && navigate(`/calls/${c.id}`)}>
            <div className="row">
              {s && <Avatar style={s.avatar} size={42} title={s.name} />}
              <div>
                <strong>{c.staffName}</strong>
                <div className="tiny muted">
                  {formatDate(c.callDate)} · {formatDuration(c.durationSec)}
                </div>
              </div>
              <span className="spacer" />
              <div className="kpi-value" style={{ fontSize: 26, marginTop: 0 }}>
                {r.percentage}%
              </div>
            </div>
            <div className="row-wrap" style={{ marginTop: 10, gap: 6 }}>
              <StatusPill status={r.status} />
              {c.callType && c.callType !== 'new_lead' && <CallTypePill callType={c.callType} />}
              <span className="tag">
                <LeadNumber value={c.leadNumber} />
              </span>
            </div>
            <div className="small" style={{ marginTop: 10 }}>
              🌟 {strength ? strength.name : '—'} &nbsp; 🎯 {gap ? gap.name : '—'}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function RecentCallsList({ calls }: { calls: Call[] }) {
  const navigate = useNavigate();
  const { staff } = useStore();
  return (
    <div className="stack" style={{ gap: 8 }}>
      {calls.map((c) => {
        const r = effectiveResult(c);
        const s = staff.find((x) => x.id === c.staffId);
        return (
          <button
            key={c.id}
            className="row"
            onClick={() => navigate(`/calls/${c.id}`)}
            style={{ textAlign: 'left', background: '#fff', border: '1.5px solid var(--line)', borderRadius: 16, padding: '10px 12px', cursor: 'pointer', gap: 10 }}
          >
            {s && <Avatar style={s.avatar} size={38} title={s.name} />}
            <div style={{ minWidth: 0 }}>
              <strong>{c.staffName}</strong>
              <div className="tiny muted">
                {formatDate(c.callDate)} · {formatDuration(c.durationSec)}
              </div>
            </div>
            <span className="spacer" />
            <StatusPill status={r.status} />
            <strong className="tabular" style={{ minWidth: 44, textAlign: 'right' }}>
              {r.percentage}%
            </strong>
          </button>
        );
      })}
    </div>
  );
}
