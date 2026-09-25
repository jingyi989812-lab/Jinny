import type { JourneyStageResult } from '@/types/qa';
import { SECTION_STATUS_META } from '@/services/scoring';
import { formatDuration } from '@/services/qaEvaluator/transcriptParser';

const TINT: Record<string, string> = { excellent: '#EDF5EA', good: '#EDF5EA', warn: '#FFF7DC', serious: '#FDEEF0', critical: '#FBE3E7' };

/** The call journey — Opening → Discovery → Solution → Objection → Urgency → Closing. */
export function CallTimeline({ journey, onSelect }: { journey: JourneyStageResult[]; onSelect?: (stage: JourneyStageResult) => void }) {
  const flow = journey.filter((j) => j.stage !== 'rapport');
  const rapport = journey.find((j) => j.stage === 'rapport');
  return (
    <div>
      <div className="journey">
        {flow.map((j, i) => {
          const meta = SECTION_STATUS_META[j.status];
          return (
            <button
              key={j.stage}
              className="jstep reveal"
              style={{ animationDelay: `${i * 0.08}s`, background: 'none', border: 0, cursor: onSelect ? 'pointer' : 'default' }}
              onClick={() => onSelect?.(j)}
            >
              <span className="jdot wiggle" style={{ background: TINT[meta.tone] }} aria-hidden>
                {j.emoji}
              </span>
              <strong style={{ fontSize: 14 }}>{j.label}</strong>
              <span className={`pill pill-${meta.tone}`}>
                {meta.emoji} {meta.label}
              </span>
              <span className="tiny muted tabular">
                {j.percentage}% · {j.timeSpentSec !== null ? `~${formatDuration(j.timeSpentSec)}` : 'time n/a'}
              </span>
              <span className="tiny" style={{ maxWidth: 160, lineHeight: 1.35 }}>
                {j.keyObservation}
              </span>
            </button>
          );
        })}
      </div>
      {rapport && (
        <div className="row small" style={{ marginTop: 6, padding: '10px 14px', borderRadius: 14, background: 'var(--yellow-50)', border: '1.5px dashed #F3DCA0', flexWrap: 'wrap' }}>
          <span aria-hidden>💛</span>
          <strong>Across the whole call · Rapport & Tone</strong>
          <span className={`pill pill-${SECTION_STATUS_META[rapport.status].tone}`}>
            {SECTION_STATUS_META[rapport.status].emoji} {SECTION_STATUS_META[rapport.status].label}
          </span>
          <span className="muted">{rapport.keyObservation}</span>
        </div>
      )}
      <div className="tiny faint" style={{ marginTop: 8 }}>
        Time per stage is approximate — it is estimated from transcript timestamps where the stage's evidence first appears.
      </div>
    </div>
  );
}
