/** Small shared UI primitives. */
import { useEffect, type ReactNode } from 'react';
import type { CallType, OverallStatus, SectionStatus, SourceRef } from '@/types/framework';
import { PRIMARY_FRAMEWORK } from '@/config/frameworks';
import type { Confidence } from '@/types/qa';
import { OVERALL_STATUS_META, SECTION_STATUS_META } from '@/services/scoring';
import { maskLead } from '@/services/privacy';
import { useStore } from '@/services/store';

export function StatusPill({ status, formal = false }: { status: OverallStatus; formal?: boolean }) {
  const m = OVERALL_STATUS_META[status];
  return (
    <span className={`pill pill-${m.tone}`}>
      <span aria-hidden>{m.emoji}</span> {formal ? m.formal : m.label}
    </span>
  );
}

export function SectionStatusPill({ status }: { status: SectionStatus }) {
  const m = SECTION_STATUS_META[status];
  return (
    <span className={`pill pill-${m.tone}`}>
      <span aria-hidden>{m.emoji}</span> {m.label}
    </span>
  );
}

export const barClass = (status: SectionStatus) => `bar-${SECTION_STATUS_META[status].tone}`;

export function ConfidenceTag({ level, reason }: { level: Confidence; reason?: string }) {
  const meta = { high: ['🟢', 'High confidence'], medium: ['🟡', 'Medium confidence'], low: ['⚪', 'Low confidence'] }[level];
  return (
    <span className="tag" title={reason}>
      <span aria-hidden>{meta[0]}</span> AI confidence: {meta[1].split(' ')[0]}
    </span>
  );
}

export function SourceTag({ source }: { source: SourceRef }) {
  const placeholder = source.document === 'PLACEHOLDER';
  return (
    <span className={`tag ${placeholder ? 'tag-placeholder' : 'tag-reference'}`} title={source.note}>
      {placeholder ? '🚧 Placeholder' : `📄 ${source.document.replace('.pdf', '')}`}
    </span>
  );
}

export function SuggestionTag() {
  return <span className="tag tag-suggest">💡 Suggested phrasing</span>;
}

export function ComingSoon({ label = 'Coming soon' }: { label?: string }) {
  return <span className="tag tag-soon">⏳ {label}</span>;
}

export function Trend({ delta, suffix = '%', vs, invert = false }: { delta: number | null | undefined; suffix?: string; vs?: string; invert?: boolean }) {
  if (delta === null || delta === undefined) return <span className="trend trend-flat">— no comparison yet</span>;
  const good = invert ? delta < -0.05 : delta > 0.05;
  const bad = invert ? delta > 0.05 : delta < -0.05;
  const cls = good ? 'trend-up' : bad ? 'trend-down' : 'trend-flat';
  const arrow = delta > 0.05 ? '▲' : delta < -0.05 ? '▼' : '●';
  return (
    <span className={`trend ${cls}`}>
      <span aria-hidden>{arrow}</span> {delta > 0 ? '+' : ''}
      {Math.round(delta * 10) / 10}
      {suffix}
      {vs ? <span className="faint" style={{ fontWeight: 600 }}>&nbsp;vs {vs}</span> : null}
    </span>
  );
}

export function LeadNumber({ value }: { value: string }) {
  const { revealLeads } = useStore();
  return (
    <span className="tabular" title={revealLeads ? 'Full number visible (authorised view)' : 'Masked for privacy'}>
      {revealLeads ? value : maskLead(value)}
    </span>
  );
}

export function Bar({ percentage, status, height = 12, label }: { percentage: number; status: SectionStatus; height?: number; label?: string }) {
  return (
    <div className="bar-track" style={{ height }} role="meter" aria-valuenow={percentage} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className={`bar-fill ${barClass(status)}`} style={{ width: `${Math.max(2, percentage)}%` }} />
    </div>
  );
}

export function Modal({ open, onClose, children, title }: { open: boolean; onClose: () => void; children: ReactNode; title: string }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="overlay" onClick={onClose} role="presentation">
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ marginBottom: 12 }}>
          <h3 style={{ fontSize: 22 }}>{title}</h3>
          <span className="spacer" />
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ChipToggle<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="chip-toggle" role="tablist">
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={o.value === value} className={o.value === value ? 'on' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function SectionTitle({ title, note, children }: { title: ReactNode; note?: string; children?: ReactNode }) {
  return (
    <div className="section-title">
      <h2>{title}</h2>
      {note && <span className="hand">{note}</span>}
      <span className="spacer" />
      {children}
    </div>
  );
}

export function CallTypePill({ callType, source, reason }: { callType?: CallType; source?: 'estimated' | 'qa' | 'default'; reason?: string }) {
  const p = PRIMARY_FRAMEWORK.callTypeProfiles.find((x) => x.callType === (callType ?? 'new_lead'))!;
  return (
    <span className={`pill ${p.callType === 'new_lead' ? 'pill-neutral' : 'pill-lilac'}`} title={reason ?? p.description}>
      {p.emoji} {p.label}
      {source === 'estimated' && <span style={{ fontWeight: 600, opacity: 0.7 }}> · estimated</span>}
      {source === 'qa' && <span style={{ fontWeight: 600, opacity: 0.7 }}> · set by QA</span>}
    </span>
  );
}
