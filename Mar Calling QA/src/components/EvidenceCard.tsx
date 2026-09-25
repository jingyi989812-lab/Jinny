import type { Evidence } from '@/types/qa';

/**
 * Renders one piece of evidence. Quotes show the transcript timestamp only if
 * the transcript has one. Absences and insufficient evidence are shown as such.
 */
export function EvidenceCard({ evidence, onJump }: { evidence: Evidence; onJump?: (lineIndex: number) => void }) {
  if (evidence.type === 'quote' && evidence.quote) {
    const canJump = onJump && typeof evidence.lineIndex === 'number';
    return (
      <div
        className={`evidence ${canJump ? 'clickable' : ''}`}
        onClick={() => canJump && onJump!(evidence.lineIndex!)}
        role={canJump ? 'button' : undefined}
        tabIndex={canJump ? 0 : undefined}
        onKeyDown={(e) => canJump && e.key === 'Enter' && onJump!(evidence.lineIndex!)}
        title={canJump ? 'Jump to this moment in the transcript' : undefined}
      >
        {evidence.timestamp ? <span className="ts">{evidence.timestamp}</span> : <span className="ts ts-none" title="The transcript has no timestamp for this line">no time</span>}
        <div style={{ minWidth: 0 }}>
          <div className="speaker">{evidence.speaker === 'agent' ? 'Consultant' : evidence.speaker === 'customer' ? 'Customer' : 'Speaker not identified'}</div>
          <div className="quote">{evidence.quote}</div>
        </div>
        {canJump && (
          <span className="faint tiny nowrap hide-mobile" style={{ marginLeft: 'auto' }}>
            ↪ jump
          </span>
        )}
      </div>
    );
  }
  const icon = evidence.type === 'absence' ? '🔎' : evidence.type === 'metric' ? '📏' : '❔';
  return (
    <div className="evidence" style={{ background: evidence.type === 'insufficient' ? 'var(--grey-50)' : '#fff', borderStyle: 'dashed' }}>
      <span aria-hidden>{icon}</span>
      <div className="small muted">{evidence.note}</div>
    </div>
  );
}
