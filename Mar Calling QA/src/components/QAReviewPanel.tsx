import { useState } from 'react';
import { REVIEWERS } from '@/config/organisation';
import { evaluateCall } from '@/services/qaEvaluator';
import { effectiveResult, OVERALL_STATUS_META, statusForScore } from '@/services/scoring';
import { useStore } from '@/services/store';
import type { Call } from '@/types/call';
import type { QAReview } from '@/types/qa';
import { PRIMARY_FRAMEWORK } from '@/config/frameworks';
import type { CallType } from '@/types/framework';
import { CallTypePill, StatusPill } from './ui';

/** Human QA override — the AI is never the final authority. */
export function QAReviewPanel({ call }: { call: Call }) {
  const store = useStore();
  const ev = call.evaluation;
  const latest = call.qaReviews[call.qaReviews.length - 1];
  const r = effectiveResult(call);
  const [editing, setEditing] = useState(false);
  const [finalScore, setFinalScore] = useState<number>(r.score);
  const [reviewer, setReviewer] = useState(latest?.reviewer ?? call.reviewer ?? REVIEWERS[0]);
  const [comment, setComment] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const record = (action: QAReview['action'], score: number, extra: Partial<QAReview> = {}) => {
    const s = statusForScore(call.frameworkId, score, ev.maxScore);
    store.addReview(call.id, {
      id: `rev-${Date.now()}`,
      action,
      aiScore: ev.overallScore,
      aiPercentage: ev.overallPercentage,
      finalScore: score,
      finalPercentage: s.percentage,
      finalStatus: s.status,
      reviewer,
      comment,
      overrideReason: reason,
      timestamp: new Date().toISOString(),
      ...extra,
    });
  };

  const accept = () => {
    record('accepted', ev.overallScore, { overrideReason: '' });
    setEditing(false);
    store.toast('✅ AI result accepted');
  };

  const saveEdit = () => {
    if (finalScore !== ev.overallScore && !reason.trim()) {
      store.toast('Please add a reason for the override ✏️');
      return;
    }
    record('edited', finalScore);
    setEditing(false);
    setComment('');
    setReason('');
    store.toast('✏️ Evaluation updated by QA');
  };

  const reEvaluate = async (provider = store.provider) => {
    setBusy(true);
    let next;
    try {
      next = await evaluateCall(
      {
        callId: call.id,
        staffName: call.staffName,
        callDate: call.callDate,
        duration: call.durationSec,
        outlet: call.outlet,
        leadSource: call.leadSource,
        language: call.language,
        transcript: call.transcript,
        frameworkId: call.frameworkId,
        callType: store.scoreByCallType ? call.callType : 'new_lead',
        callTypeLocked: call.callTypeSource === 'qa' || !store.scoreByCallType,
      },
      provider,
    );
    } catch (e) {
      setBusy(false);
      store.toast(`⚠️ ${e instanceof Error ? e.message : 'Re-evaluation failed'}`);
      return;
    }
    store.replaceEvaluation(call.id, next);
    const s = statusForScore(call.frameworkId, next.overallScore, next.maxScore);
    store.addReview(call.id, {
      id: `rev-${Date.now()}`,
      action: 're-evaluated',
      aiScore: next.overallScore,
      aiPercentage: next.overallPercentage,
      finalScore: next.overallScore,
      finalPercentage: s.percentage,
      finalStatus: s.status,
      reviewer,
      comment: next.engine.provider === 'claude' ? 'Re-evaluated by Claude.' : 'Re-evaluated with the demo evaluator.',
      overrideReason: '',
      timestamp: new Date().toISOString(),
    });
    setBusy(false);
    setFinalScore(next.overallScore);
    store.toast(next.engine.provider === 'claude' ? '✨ Re-evaluated by Claude' : '🔄 Call re-evaluated');
  };

  const preview = statusForScore(call.frameworkId, finalScore, ev.maxScore);

  return (
    <div className="card anchor-target" id="qa-review" style={{ border: '2px solid var(--ink)', boxShadow: '4px 4px 0 var(--yellow)' }}>
      <div className="card-head">
        <div>
          <div className="eyebrow">🧑‍⚖️ QA Review</div>
          <h2 style={{ marginTop: 4 }}>Human decision</h2>
          <div className="sub">AI suggests, people decide. The final score counts in every dashboard.</div>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card card-flat card-tight">
          <div className="eyebrow">AI score</div>
          <div className="kpi-value" style={{ fontSize: 30, marginTop: 4 }}>
            {ev.overallPercentage}%
          </div>
          <div className="small muted">
            {ev.overallScore} / {ev.maxScore} · <StatusPill status={ev.status} />
          </div>
        </div>
        <div className="card card-flat card-tight card-yellow">
          <div className="eyebrow">QA final score</div>
          <div className="kpi-value" style={{ fontSize: 30, marginTop: 4 }}>
            {latest ? `${latest.finalPercentage}%` : '—'}
          </div>
          <div className="small muted">{latest ? <>{latest.finalScore} / {ev.maxScore} · <StatusPill status={latest.finalStatus} /></> : 'Awaiting QA review'}</div>
        </div>
      </div>

      <div className="row-wrap small" style={{ marginTop: 14 }}>
        <strong>Call type:</strong>
        <CallTypePill callType={call.callType} source={call.callTypeSource} reason={call.callTypeReason} />
        {store.canReview && (
          <select
            className="select"
            style={{ width: 'auto', minHeight: 36 }}
            value={call.callType ?? 'new_lead'}
            aria-label="Change call type"
            onChange={(e) => {
              store.setCallType(call.id, e.target.value as CallType);
              store.toast('🔁 Call type updated — score recalculated');
            }}
          >
            {PRIMARY_FRAMEWORK.callTypeProfiles.map((p) => (
              <option key={p.callType} value={p.callType}>
                {p.emoji} {p.label}
              </option>
            ))}
          </select>
        )}
        {call.callTypeSource === 'estimated' && call.callTypeReason && <span className="faint tiny">{call.callTypeReason}</span>}
      </div>

      {store.canReview ? (
        <>
          {editing && (
            <div className="stack" style={{ marginTop: 16 }}>
              <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                <div className="field">
                  <label htmlFor="final">QA Final Score (out of {ev.maxScore})</label>
                  <input
                    id="final"
                    className="input"
                    type="number"
                    min={0}
                    max={ev.maxScore}
                    value={finalScore}
                    onChange={(e) => setFinalScore(Math.max(0, Math.min(ev.maxScore, Number(e.target.value))))}
                  />
                  <span className="tiny muted">
                    = {preview.percentage}% · {OVERALL_STATUS_META[preview.status].emoji} {OVERALL_STATUS_META[preview.status].label}
                  </span>
                </div>
                <div className="field">
                  <label htmlFor="reviewer">QA Reviewer</label>
                  <select id="reviewer" className="select" value={reviewer} onChange={(e) => setReviewer(e.target.value)}>
                    {REVIEWERS.map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="field">
                <label htmlFor="reason">Reason for override {finalScore !== ev.overallScore ? '*' : ''}</label>
                <input id="reason" className="input" placeholder="e.g. Appointment was confirmed on the recording but missing from the transcript" value={reason} onChange={(e) => setReason(e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="comment">QA Comment</label>
                <textarea id="comment" className="textarea" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Coaching note for the consultant…" />
              </div>
              <div className="row-wrap">
                <button className="btn btn-primary" onClick={saveEdit}>
                  💾 Save QA decision
                </button>
                <button className="btn btn-ghost" onClick={() => setEditing(false)}>
                  Cancel
                </button>
              </div>
            </div>
          )}
          {!editing && (
            <div className="row-wrap" style={{ marginTop: 16 }}>
              <button className="btn btn-green" onClick={accept}>
                ✅ Accept AI Result
              </button>
              <button className="btn" onClick={() => setEditing(true)}>
                ✏️ Edit Evaluation
              </button>
              <button className="btn btn-ghost" onClick={() => reEvaluate()} disabled={busy}>
                {busy ? '⏳ Re-evaluating…' : store.provider === 'claude' ? '✨ Re-evaluate with Claude' : '🔄 Re-evaluate'}
              </button>
            </div>
          )}
        </>
      ) : (
        <p className="small muted" style={{ marginTop: 14 }}>
          🔒 Only the QA / MARCOM Manager can confirm or override results. Switch role in the top bar to try it.
        </p>
      )}

      {call.qaReviews.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <div className="eyebrow">Audit trail</div>
          <div className="stack" style={{ gap: 8, marginTop: 8 }}>
            {[...call.qaReviews].reverse().map((rv) => (
              <div key={rv.id} className="evidence small" style={{ flexDirection: 'column', gap: 2 }}>
                <div className="row-wrap" style={{ gap: 8 }}>
                  <strong>{rv.action === 'accepted' ? '✅ Accepted' : rv.action === 'edited' ? '✏️ Edited' : '🔄 Re-evaluated'}</strong>
                  <span className="muted">
                    AI {rv.aiScore} → Final {rv.finalScore} ({rv.finalPercentage}%)
                  </span>
                  <span className="spacer" />
                  <span className="faint tiny">
                    {rv.reviewer} · {new Date(rv.timestamp).toLocaleString('en-GB')}
                  </span>
                </div>
                {rv.overrideReason && <div>Reason: {rv.overrideReason}</div>}
                {rv.comment && <div className="muted">“{rv.comment}”</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
