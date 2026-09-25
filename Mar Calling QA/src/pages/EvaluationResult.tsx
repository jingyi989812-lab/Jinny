import { useMemo, useRef, useState } from 'react';
import { StandardCard } from '@/components/StandardCard';
import { standardForCall } from '@/services/cscStandard';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { getFramework } from '@/config/frameworks';
import { AchievementBadge } from '@/components/AchievementBadge';
import { CallTimeline } from '@/components/CallTimeline';
import { CoachingCard } from '@/components/CoachingCard';
import { EmptyState } from '@/components/EmptyState';
import { EvaluationSummary } from '@/components/EvaluationSummary';
import { EvidenceCard } from '@/components/EvidenceCard';
import { Heart, Sparkle } from '@/components/illustrations';
import { QAReviewPanel } from '@/components/QAReviewPanel';
import { RoleModelCard } from '@/components/RoleModelCard';
import { ScoreRing } from '@/components/ScoreRing';
import { TranscriptViewer, type TranscriptHandle } from '@/components/TranscriptViewer';
import { Bar, CallTypePill, SectionStatusPill, StatusPill } from '@/components/ui';
import { badgesForCall } from '@/services/achievements';
import { evaluateCall, parseTranscript } from '@/services/qaEvaluator';
import { effectiveResult, OVERALL_STATUS_META } from '@/services/scoring';
import { useT } from '@/services/i18n';
import { useStore } from '@/services/store';

const CHEERS = ['Keep this!', "You're doing this really well.", 'This is becoming one of your strengths.', 'Lovely — share this with the team!', 'Your customers can feel this 💛'];

export function EvaluationResult() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const store = useStore();
  const navigate = useNavigate();
  const tr = useT();
  const call = store.getCall(id ?? '');
  const transcriptRef = useRef<TranscriptHandle>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [claudeBusy, setClaudeBusy] = useState(false);

  const parsed = useMemo(() => (call ? parseTranscript(call.transcript, call.staffName) : null), [call]);
  const badges = useMemo(() => {
    if (!call) return [];
    const history = store.calls.filter((c) => c.staffId === call.staffId).sort((a, b) => a.callDate.localeCompare(b.callDate) || a.id.localeCompare(b.id));
    return badgesForCall(call, history.filter((c) => c.id !== call.id));
  }, [call, store.calls]);

  if (call && !store.can.canSeeOtherCalls && call.staffId !== store.myStaffId) {
    return (
      <div className="page card">
        <EmptyState
          title="That call belongs to a colleague"
          message="You can open your own calls and your own coaching. Team-wide views live in the QA / MARCOM console."
          action="📞 My calls"
          to="/calls"
        />
      </div>
    );
  }

  if (!call || !parsed) {
    return (
      <div className="page card">
        <EmptyState title="We couldn't find that call." message="It may have been removed from this device." action="📞 Back to Call Records" to="/calls" />
      </div>
    );
  }

  const ev = call.evaluation;
  const fw = getFramework(call.frameworkId);
  const r = effectiveResult(call);
  const meta = OVERALL_STATUS_META[r.status];
  const staff = store.staff.find((s) => s.id === call.staffId);
  const isNew = params.get('new') === '1';
  const standard = standardForCall(call);

  const reEvaluateWithClaude = async () => {
    setClaudeBusy(true);
    try {
      const next = await evaluateCall(
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
        'claude',
      );
      store.replaceEvaluation(call.id, next);
      store.toast(`✨ Claude scored this call ${next.overallPercentage}%`);
    } catch (e) {
      store.toast(`⚠️ ${e instanceof Error ? e.message : 'Claude evaluation failed'}`);
    } finally {
      setClaudeBusy(false);
    }
  };

  const jump = (lineIndex: number) => {
    document.getElementById('transcript')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.setTimeout(() => transcriptRef.current?.jumpTo(lineIndex), 350);
  };
  const openSection = (sectionId: string) => {
    setOpenSections((s) => ({ ...s, [sectionId]: true }));
    window.setTimeout(() => document.getElementById(`section-${sectionId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };
  const behaviourOf = (behaviourId?: string) => fw.sections.flatMap((s) => s.behaviours).find((b) => b.id === behaviourId);
  const top3 = ev.gaps.slice(0, 3);

  return (
    <div className="page">
      <div className="row-wrap no-print">
        <Link to="/calls" className="link small">
          ← Call Records
        </Link>
        <span className="spacer" />
        {store.can.canExport && (
          <button className="btn btn-sm" onClick={() => navigate(`/calls/${call.id}/report`)}>
            📄 Export QA Report
          </button>
        )}
        {store.canReview && (
          <a className="btn btn-sm btn-yellow" href="#qa-review" onClick={(e) => { e.preventDefault(); document.getElementById('qa-review')?.scrollIntoView({ behavior: 'smooth' }); }}>
            🧑‍⚖️ QA Review
          </a>
        )}
      </div>

      {isNew && (
        <div className="card card-yellow reveal row-wrap" style={{ border: '2px solid var(--ink)', boxShadow: '4px 4px 0 var(--pink)' }}>
          <span style={{ fontSize: 34 }} aria-hidden>
            🎉
          </span>
          <div>
            <h2 style={{ fontSize: 24 }}>Your coaching card is ready!</h2>
            <p className="small muted">Every quote below was matched against your transcript ({ev.verification.checkedQuotes} quotes checked, {ev.verification.removedQuotes} removed).</p>
          </div>
        </div>
      )}

      {ev.engine.provider === 'mock-heuristic' ? (
        <div className="card card-tight small row-wrap" style={{ background: 'var(--sky-50)', borderColor: '#D5E3EE' }}>
          🧪 <strong>Demo evaluator</strong>
          <span className="muted" style={{ flex: '1 1 300px' }}>{ev.engine.disclaimer}</span>
          {store.canReview && store.claudeHealth.keyConfigured && (
            <button className="btn btn-sm btn-primary" onClick={reEvaluateWithClaude} disabled={claudeBusy}>
              {claudeBusy ? '⏳ Claude is reading…' : '✨ Evaluate with Claude'}
            </button>
          )}
        </div>
      ) : (
        <div className="card card-tight small row-wrap card-green">
          ✨ <strong>Evaluated by Claude</strong>
          <span className="muted">
            {ev.engine.model} · {new Date(ev.createdAt).toLocaleString('en-GB')} · {ev.verification.checkedQuotes} quotes checked, {ev.verification.removedQuotes} removed. A QA reviewer confirms the final score.
          </span>
        </div>
      )}
      {ev.diarized === false && (
        <div className="card card-tight small row-wrap card-yellow">
          🗣️ <strong>Speakers not identified</strong>
          <span className="muted">
            This transcript has no Consultant / Customer labels, so a quote may come from either person and AI confidence is capped at medium. A transcript with speaker labels will score more reliably.
          </span>
        </div>
      )}
      {ev.parseNotes.length > 0 && (
        <div className="card card-tight small card-flat" style={{ background: 'var(--grey-50)' }}>
          📝 Transcript notes: {ev.parseNotes.join(' ')}
        </div>
      )}

      <section className="hero" style={{ gridTemplateColumns: 'minmax(0, 1fr) auto', background: 'radial-gradient(90% 120% at 100% 0%, #FDEEF0 0%, transparent 60%), radial-gradient(80% 100% at 0% 100%, #EDF5EA 0%, transparent 60%), var(--paper)' }}>
        <div className="stack">
          <span className="eyebrow">
            {call.staffName} · {call.id}
          </span>
          <h1 style={{ fontSize: 'clamp(30px, 4.4vw, 52px)' }}>
            Your Call Has Been Reviewed <Heart size={36} style={{ verticalAlign: 'middle' }} />
          </h1>
          <p className="hand" style={{ fontSize: 26, lineHeight: 1.15, color: 'var(--ink-2)' }}>
            Here's what you did well,
            <br />
            what you missed,
            <br />
            and what to try next.
          </p>
          <div className="row-wrap">
            <StatusPill status={r.status} formal />
            {r.reviewed ? <span className="tag tag-reference">🧑‍⚖️ QA confirmed</span> : <span className="tag">⏳ Awaiting QA review</span>}
            <span className="tag">{fw.shortLabel}</span>
            <CallTypePill callType={call.callType} source={call.callTypeSource} reason={call.callTypeReason} />
          </div>
          <p className="small muted">{meta.friendly}</p>
        </div>
        <div className="stack" style={{ alignItems: 'center', position: 'relative' }}>
          <ScoreRing percentage={r.percentage} status={r.status} size={220} label={`${r.score} / ${r.max} pts`} onClick={() => document.getElementById('scorecard')?.scrollIntoView({ behavior: 'smooth' })} />
          <span className="tiny faint">tap the score for the scorecard</span>
          <Sparkle size={30} style={{ position: 'absolute', top: -4, right: -6 }} className="twinkle" />
        </div>
      </section>

      <div className="split">
        <EvaluationSummary call={call} staff={staff} />

        <div className="card anchor-target" id="scorecard">
          <div className="card-head">
            <div>
              <div className="eyebrow">🧾 ICC Scorecard</div>
              <h2 style={{ marginTop: 4 }}>{fw.frameworkName}</h2>
              <div className="sub">{fw.frameworkVersion} · tap a row for the detailed analysis</div>
            </div>
          </div>
          <div className="stack" style={{ gap: 4 }}>
            {ev.sections.map((s) =>
              s.applicable === false ? (
                <div key={s.sectionId} className="row-wrap small" style={{ padding: '10px 8px', opacity: 0.6 }}>
                  <span aria-hidden>{s.emoji}</span>
                  <strong>{s.name}</strong>
                  <span className="tag">{s.code}</span>
                  <span className="spacer" />
                  <span className="tag tag-placeholder" title={s.notApplicable[0]}>
                    Not scored for this call type
                  </span>
                </div>
              ) : (
              <button
                key={s.sectionId}
                onClick={() => openSection(s.sectionId)}
                style={{ textAlign: 'left', background: 'none', border: 0, borderRadius: 14, padding: '10px 8px', cursor: 'pointer' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#FFF7DC')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
              >
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: '4px 10px', alignItems: 'center' }}>
                  <div className="row" style={{ gap: 8, minWidth: 0 }}>
                    <span style={{ fontSize: 20 }} aria-hidden>
                      {s.emoji}
                    </span>
                    <strong style={{ minWidth: 0 }}>{s.name}</strong>
                    <span className="tag">{s.code}</span>
                  </div>
                  <span className="tabular nowrap" style={{ fontWeight: 800 }}>
                    {s.score} / {s.maxScore} <span className="muted" style={{ fontWeight: 600 }}>· {s.percentage}%</span>
                  </span>
                  <span className="small muted">{s.strengths.length} observed · {s.gaps.length} missed</span>
                  <SectionStatusPill status={s.status} />
                </div>
                <div style={{ marginTop: 8 }}>
                  <Bar percentage={s.percentage} status={s.status} height={8} />
                </div>
              </button>
              ),
            )}
          </div>
          <hr className="divider" style={{ margin: '12px 0' }} />
          <div className="row">
            <strong>Total</strong>
            <span className="spacer" />
            <strong className="tabular" style={{ fontSize: 18 }}>
              {ev.overallScore} / {ev.maxScore} · {ev.overallPercentage}% (AI)
            </strong>
          </div>
          <p className="tiny faint" style={{ marginTop: 6 }}>
            Section maxima from the ICC reference. Behaviour-level point split and status thresholds are placeholders — see Settings.
          </p>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div>
            <h2>🗺️ {tr({ en: 'Call Journey', zh: '通话流程' })}</h2>
            <div className="sub">How the conversation flowed through the ICC stages</div>
          </div>
        </div>
        <CallTimeline journey={ev.journey} onSelect={(j) => j.sectionIds[0] && openSection(j.sectionIds[0])} />
      </div>

      <div className="split-rev">
        <div className="card card-green">
          <div className="card-head">
            <h2>🌟 {tr({ en: 'You Did Well', zh: '你做得好的地方' })}</h2>
          </div>
          {ev.strengths.length ? (
            <div className="stack">
              {ev.strengths.map((f, i) => (
                <div key={f.id} className="card card-flat card-tight" style={{ background: '#fff' }}>
                  <div className="row" style={{ alignItems: 'flex-start' }}>
                    <span aria-hidden>✅</span>
                    <div style={{ flex: 1 }}>
                      <strong>{f.title}</strong>
                      <div className="hand" style={{ fontSize: 20, color: 'var(--green-800)' }}>
                        {CHEERS[i % CHEERS.length]}
                      </div>
                    </div>
                  </div>
                  {f.evidence[0] && (
                    <div style={{ marginTop: 8 }}>
                      <EvidenceCard evidence={f.evidence[0]} onJump={jump} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">Insufficient evidence to determine strengths from this transcript.</p>
          )}
        </div>

        <div className="card card-pink">
          <div className="card-head">
            <h2>🎯 {tr({ en: 'Your Top 3 Improvements', zh: '最值得改进的三件事' })}</h2>
          </div>
          {top3.length ? (
            <div className="stack">
              {top3.map((g, i) => {
                const b = behaviourOf(g.behaviourId);
                return (
                  <div key={g.id} className="card card-flat card-tight lift" style={{ background: '#fff' }}>
                    <div className="row" style={{ alignItems: 'flex-start', gap: 12 }}>
                      <span className="hand" style={{ fontSize: 40, lineHeight: 0.9, color: 'var(--pink-600)' }}>
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <strong style={{ fontSize: 17 }}>
                          {ev.sections.find((s) => s.sectionId === g.sectionId)?.emoji} {g.title}
                        </strong>
                        <div className="small" style={{ marginTop: 6 }}>
                          <strong>What happened:</strong> {g.detail}
                        </div>
                        <div className="small" style={{ marginTop: 4 }}>
                          <strong>Why it matters:</strong> {b?.whyItMatters}
                        </div>
                        <div className="small" style={{ marginTop: 4 }}>
                          <strong>Next time:</strong> {b?.coachingTip} <span className="tag tag-suggest">suggestion</span>
                        </div>
                        <div className="row-wrap" style={{ marginTop: 8 }}>
                          {g.evidence.find((e) => e.type === 'quote') && (
                            <button className="link small" onClick={() => jump(g.evidence.find((e) => e.type === 'quote')!.lineIndex!)}>
                              🔎 See evidence
                            </button>
                          )}
                          {g.lessonId && (
                            <button className="link small" onClick={() => navigate(`/learn?lesson=${g.lessonId}`)}>
                              📚 Practise this
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="muted">No gaps detected against the framework. 🎉</p>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div>
            <h2>🎬 Key Moments</h2>
            <div className="sub">Tap a moment to jump to it in the transcript</div>
          </div>
        </div>
        {ev.keyMoments.length ? (
          <div className="grid grid-3">
            {ev.keyMoments.map((k) => {
              const style = { best: ['⭐', 'Best Moment', 'card-green'], missed: ['⚠️', 'Missed Opportunity', 'card-pink'], coaching: ['💡', 'Coaching Moment', 'card-yellow'] }[k.kind];
              return (
                <div key={k.id} className={`card card-flat card-tight lift clickable ${style[2]}`} onClick={() => k.evidence.lineIndex !== undefined && jump(k.evidence.lineIndex)} role="button" tabIndex={0}>
                  <div className="eyebrow">
                    {style[0]} {style[1]}
                  </div>
                  <strong style={{ display: 'block', marginTop: 6 }}>{k.title}</strong>
                  <p className="small muted" style={{ margin: '4px 0 10px' }}>
                    {k.detail}
                  </p>
                  <EvidenceCard evidence={k.evidence} />
                </div>
              );
            })}
          </div>
        ) : (
          <p className="muted">Insufficient evidence to determine key moments.</p>
        )}
      </div>

      <div className="split" style={{ alignItems: 'start' }}>
        <div className="stack-lg">
          <div className="section-title">
            <h2>🔬 {tr({ en: 'Section-by-Section Analysis', zh: '逐项分析' })}</h2>
            <span className="spacer" />
            <button className="btn btn-sm btn-ghost" onClick={() => setOpenSections(Object.fromEntries(ev.sections.map((s) => [s.sectionId, !Object.values(openSections).some(Boolean)])))}>
              {Object.values(openSections).some(Boolean) ? 'Collapse all' : 'Expand all'}
            </button>
          </div>
          {ev.sections.some((s) => s.applicable === false) && (
            <p className="small muted">
              {ev.sections.filter((s) => s.applicable === false).map((s) => s.name).join(', ')} not scored for this call type (placeholder rule — see Settings).
            </p>
          )}
          {ev.sections.filter((s) => s.applicable !== false).map((s) => (
            <CoachingCard key={s.sectionId} section={s} open={!!openSections[s.sectionId]} onToggle={() => setOpenSections((o) => ({ ...o, [s.sectionId]: !o[s.sectionId] }))} onJump={jump} />
          ))}
        </div>
        {store.can.canSeeTranscripts ? (
        <div className="card anchor-target" id="transcript" style={{ position: 'sticky', top: 16 }}>
          <div className="card-head">
            <div>
              <h2>🗒️ {tr({ en: 'Transcript', zh: '文字稿' })}</h2>
              <div className="sub">
                {parsed.lines.length} lines · {parsed.hasTimestamps ? 'with timestamps' : 'no timestamps'} · source: {call.transcriptSource === 'notebooklm-paste' ? 'pasted transcript' : call.transcriptSource === 'recording-import' ? 'recording import' : 'fictional demo'}
              </div>
            </div>
          </div>
          <TranscriptViewer ref={transcriptRef} lines={parsed.lines} staffName={call.staffName} />
        </div>
        ) : (
          <div className="card card-tight small muted">🔒 Transcripts are not shown in the management view.</div>
        )}
      </div>

      <div className="card">
        <div className="card-head">
          <div>
            <h2>🏆 Role Model Moment</h2>
            <div className="sub">Current approach vs ideal approach — reference lines are labelled with their source document</div>
          </div>
        </div>
        {ev.roleModelComparison.length ? (
          <div className="stack-lg">
            {ev.roleModelComparison.map((rm) => (
              <RoleModelCard key={rm.sectionId} item={rm} onJump={jump} />
            ))}
          </div>
        ) : (
          <p className="muted">No major gaps needed a role-model comparison on this call. 🌟</p>
        )}
      </div>

      <StandardCard result={standard} onJump={jump} />


      <div className="split-rev">
        <div className="card card-lilac">
          <div className="card-head">
            <div>
              <h2>💛 {tr({ en: 'EQ Observation', zh: 'EQ 观察' })}</h2>
              <div className="sub">Coaching feedback only — not added to the ICC score</div>
            </div>
            <span className="spacer" />
            <span className="pill pill-lilac">UNSCORED OBSERVATION</span>
          </div>
          <div className="stack">
            {ev.eqObservation.map((e) => (
              <div key={e.dimensionId} className="card card-flat card-tight" style={{ background: '#fff' }}>
                <div className="row-wrap">
                  <span aria-hidden>{e.emoji}</span>
                  <strong>{e.label}</strong>
                  {!e.inReference && <span className="tag">app extension</span>}
                  <span className="spacer" />
                  <span className={`pill ${e.status === 'present' ? 'pill-good' : e.status === 'weak' ? 'pill-warn' : e.status === 'absent' ? 'pill-serious' : 'pill-neutral'}`}>
                    {e.status === 'present' ? '✓ Present' : e.status === 'weak' ? '△ Weak' : e.status === 'absent' ? '✘ Absent' : '❔ Insufficient evidence'}
                  </span>
                </div>
                <p className="small" style={{ marginTop: 6 }}>
                  {e.observation}
                </p>
                {e.status !== 'present' && e.status !== 'insufficient' && (
                  <p className="small muted" style={{ marginTop: 4 }}>
                    <em>Coaching suggestion:</em> {e.coaching}
                  </p>
                )}
                {e.evidence.filter((x) => x.type === 'quote').slice(0, 1).map((x, i) => (
                  <div key={i} style={{ marginTop: 8 }}>
                    <EvidenceCard evidence={x} onJump={jump} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="stack-lg">
          <div className="card">
            <div className="card-head">
              <div>
                <h2>🗓️ {tr({ en: '30-Day Action Plan', zh: '30 天行动计划' })}</h2>
                <div className="sub">Built from this call's gaps</div>
              </div>
            </div>
            <div className="stack">
              {fw.actionPlanPhases.map((phase) => {
                const items = ev.actionPlan.filter((a) => a.phase === phase.id);
                if (!items.length) return null;
                return (
                  <div key={phase.id} className="row" style={{ alignItems: 'flex-start', gap: 14 }}>
                    <span className="pill pill-ink" style={{ minWidth: 96, justifyContent: 'center' }}>
                      {phase.label}
                    </span>
                    <div className="stack" style={{ gap: 6, flex: 1 }}>
                      {items.map((a) => (
                        <div key={a.id} className="row" style={{ gap: 8, alignItems: 'flex-start' }}>
                          <input type="checkbox" aria-label={a.action} style={{ marginTop: 4 }} />
                          <span>
                            {a.action}{' '}
                            {a.lessonId && (
                              <button className="link tiny" onClick={() => navigate(`/learn?lesson=${a.lessonId}`)}>
                                lesson
                              </button>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <div>
                <h2>👤 Customer Profile</h2>
                <div className="sub">{ev.diarized === false ? 'Mentioned in the call (speaker not identified)' : 'Only what the customer said in the transcript'}</div>
              </div>
            </div>
            <div className="grid grid-2" style={{ gap: 12 }}>
              {ev.customerProfile.map((p) => (
                <div key={p.label}>
                  <div className="eyebrow">{p.label}</div>
                  <div className={`small ${p.notDiscussed ? 'faint' : ''}`} style={{ marginTop: 2 }}>
                    {p.notDiscussed ? p.value : `“${p.value}”`}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card card-yellow">
            <div className="card-head">
              <div>
                <h2>🏅 Badges from this call</h2>
                <div className="sub">Earned from real QA results — tap to see why</div>
              </div>
            </div>
            {badges.length ? (
              <div className="row-wrap" style={{ gap: 4 }}>
                {badges.map((b) => (
                  <AchievementBadge key={b.id} id={b.id} reason={b.reason} />
                ))}
              </div>
            ) : (
              <p className="small muted">No badges on this call yet — your next call could unlock one! 🌱</p>
            )}
          </div>
        </div>
      </div>

      <QAReviewPanel call={call} />
    </div>
  );
}
