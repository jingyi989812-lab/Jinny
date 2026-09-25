import { Link, useParams } from 'react-router-dom';
import { CAMPAIGN_FOCUS } from '@/config/strategyFocus';
import { focusForCall } from '@/services/campaignFocus';
import { getFramework } from '@/config/frameworks';
import { EvidenceCard } from '@/components/EvidenceCard';
import { Avatar, Heart, Sparkle, Squiggle } from '@/components/illustrations';
import { ScoreRing } from '@/components/ScoreRing';
import { Bar, ComingSoon, LeadNumber, SectionStatusPill, StatusPill } from '@/components/ui';
import { formatDate } from '@/services/analytics';
import { formatDuration } from '@/services/qaEvaluator/transcriptParser';
import { effectiveResult } from '@/services/scoring';
import { useStore } from '@/services/store';

/** Printable coaching report. Browser "Save as PDF" today; server PDF generation later. */
export function ReportExport() {
  const { id } = useParams();
  const store = useStore();
  const call = store.getCall(id ?? '');
  if (!call) {
    return (
      <div style={{ padding: 40 }}>
        Call not found. <Link to="/calls">Back to Call Records</Link>
      </div>
    );
  }
  const ev = call.evaluation;
  const fw = getFramework(call.frameworkId);
  const r = effectiveResult(call);
  const staff = store.staff.find((s) => s.id === call.staffId);
  const review = call.qaReviews[call.qaReviews.length - 1];
  const campaign = focusForCall(call);

  const H = ({ n, children }: { n: string; children: React.ReactNode }) => (
    <div className="row" style={{ gap: 10, margin: '30px 0 12px', breakAfter: 'avoid' }}>
      <span style={{ background: 'var(--ink)', color: 'var(--yellow)', borderRadius: 10, padding: '2px 10px', fontWeight: 800 }}>{n}</span>
      <h2 style={{ fontSize: 24 }}>{children}</h2>
    </div>
  );

  return (
    <div style={{ background: 'var(--cream)', minHeight: '100vh', padding: '24px 16px 60px', position: 'relative', zIndex: 1 }}>
      <div className="row-wrap no-print" style={{ maxWidth: 900, margin: '0 auto 16px' }}>
        <Link to={`/calls/${call.id}`} className="link small">
          ← Back to report
        </Link>
        <span className="spacer" />
        <ComingSoon label="Native PDF export coming soon" />
        <button className="btn btn-primary btn-sm" onClick={() => window.print()}>
          🖨️ Print / Save as PDF
        </button>
      </div>

      <article style={{ maxWidth: 900, margin: '0 auto', background: 'var(--paper)', borderRadius: 28, border: '1.5px solid var(--line)', boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
        <header style={{ background: 'var(--ink)', color: 'var(--cream)', padding: '34px 40px', position: 'relative', overflow: 'hidden' }}>
          <div className="row-wrap">
            <span className="pill" style={{ background: 'var(--yellow)', color: 'var(--ink)' }}>
              UR KLINIK · MARCOM QA
            </span>
            <span className="spacer" />
            <span className="tiny" style={{ opacity: 0.7 }}>
              🔒 Confidential — Internal Use Only
            </span>
          </div>
          <h1 style={{ fontSize: 40, marginTop: 18, color: '#fff' }}>QA Coaching Report</h1>
          <Squiggle width={160} color="#FFE08A" />
          <p style={{ opacity: 0.8, marginTop: 8 }}>
            {call.staffName} · {call.id} · {formatDate(call.callDate)} · Framework: {fw.frameworkName} {fw.frameworkVersion}
          </p>
          <Sparkle size={44} style={{ position: 'absolute', right: 40, top: 70 }} />
          <Heart size={28} style={{ position: 'absolute', right: 100, top: 120 }} />
        </header>

        <div style={{ padding: '10px 40px 40px' }}>
          <div className="row-wrap" style={{ gap: 28, marginTop: 24 }}>
            <ScoreRing percentage={r.percentage} status={r.status} size={170} label={`${r.score} / ${r.max}`} />
            <div className="stack" style={{ flex: 1, minWidth: 260 }}>
              <div className="row" style={{ gap: 12 }}>
                {staff && <Avatar style={staff.avatar} size={56} />}
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 650 }}>{call.staffName}</div>
                  <div className="small muted">{staff?.role ?? 'Consultant'}</div>
                </div>
                <span className="spacer" />
                <StatusPill status={r.status} formal />
              </div>
              <div className="grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
                {[
                  ['Date', formatDate(call.callDate)],
                  ['Duration', formatDuration(call.durationSec)],
                  ['Outlet', call.outlet],
                  ['Source', call.leadSource],
                  ['Language', call.language],
                  ['Reviewer', review?.reviewer ?? call.reviewer],
                ].map(([k, v]) => (
                  <div key={k}>
                    <div className="eyebrow">{k}</div>
                    <div style={{ fontWeight: 700 }}>{v}</div>
                  </div>
                ))}
                <div>
                  <div className="eyebrow">Lead</div>
                  <div style={{ fontWeight: 700 }}>
                    <LeadNumber value={call.leadNumber} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-2" style={{ marginTop: 20 }}>
            <div className="card card-flat card-green card-tight">
              <div className="eyebrow">🌟 Main strength</div>
              <strong>{ev.summary.mainStrength?.label ?? '—'}</strong>
            </div>
            <div className="card card-flat card-pink card-tight">
              <div className="eyebrow">🎯 Main gap</div>
              <strong>{ev.summary.mainGap?.label ?? '—'}</strong>
            </div>
          </div>
          <p style={{ marginTop: 14, lineHeight: 1.7 }}>{ev.summary.narrative}</p>

          <H n="01">ICC Scorecard</H>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {ev.sections.map((s) => (
                <tr key={s.sectionId} style={{ borderBottom: '1.5px dashed var(--line-2)' }}>
                  <td style={{ padding: '10px 6px', width: '34%' }}>
                    <strong>
                      {s.emoji} {s.code} — {s.name}
                    </strong>
                  </td>
                  <td style={{ padding: '10px 6px', width: '34%' }}>
                    <Bar percentage={s.percentage} status={s.status} height={10} />
                  </td>
                  <td style={{ padding: '10px 6px' }} className="tabular nowrap">
                    <strong>
                      {s.score}/{s.maxScore}
                    </strong>{' '}
                    ({s.percentage}%)
                  </td>
                  <td style={{ padding: '10px 6px' }}>
                    <SectionStatusPill status={s.status} />
                  </td>
                </tr>
              ))}
              <tr>
                <td style={{ padding: '10px 6px' }}>
                  <strong>TOTAL</strong>
                </td>
                <td />
                <td style={{ padding: '10px 6px' }} className="tabular">
                  <strong>
                    {ev.overallScore}/{ev.maxScore}
                  </strong>{' '}
                  AI{review ? ` · ${review.finalScore} QA final` : ''}
                </td>
                <td />
              </tr>
            </tbody>
          </table>

          <H n="02">Strengths & gaps</H>
          <div className="grid grid-2">
            <div className="card card-flat card-green">
              <div className="eyebrow">✅ Strengths</div>
              <ul style={{ margin: '8px 0 0', paddingLeft: 18, lineHeight: 1.7 }}>
                {ev.sections.flatMap((s) => s.strengths).slice(0, 8).map((f) => (
                  <li key={f.id}>{f.title}</li>
                ))}
              </ul>
            </div>
            <div className="card card-flat card-pink">
              <div className="eyebrow">⚠️ Areas to improve</div>
              <ul style={{ margin: '8px 0 0', paddingLeft: 18, lineHeight: 1.7 }}>
                {ev.gaps.slice(0, 8).map((f) => (
                  <li key={f.id}>{f.title}</li>
                ))}
              </ul>
            </div>
          </div>

          <H n="03">Evidence & coaching by section</H>
          <div className="stack-lg">
            {ev.sections.map((s) => (
              <div key={s.sectionId} className="card card-flat" style={{ breakInside: 'avoid' }}>
                <div className="row-wrap">
                  <strong style={{ fontSize: 18 }}>
                    {s.emoji} {s.name}
                  </strong>
                  <span className="spacer" />
                  <span className="tabular">
                    {s.score}/{s.maxScore}
                  </span>
                  <SectionStatusPill status={s.status} />
                </div>
                {s.gaps.slice(0, 2).map((g) => (
                  <div key={g.id} style={{ marginTop: 10 }}>
                    <div className="small" style={{ fontWeight: 700 }}>
                      ❌ {g.title}
                    </div>
                    <div className="stack" style={{ gap: 6, marginTop: 6 }}>
                      {g.evidence.slice(0, 2).map((e, i) => (
                        <EvidenceCard key={i} evidence={e} />
                      ))}
                    </div>
                  </div>
                ))}
                {!s.gaps.length && s.strengths[0] && (
                  <div style={{ marginTop: 10 }}>
                    <div className="small" style={{ fontWeight: 700 }}>
                      ✅ {s.strengths[0].title}
                    </div>
                    {s.strengths[0].evidence[0] && (
                      <div style={{ marginTop: 6 }}>
                        <EvidenceCard evidence={s.strengths[0].evidence[0]} />
                      </div>
                    )}
                  </div>
                )}
                <p className="small" style={{ marginTop: 10, background: 'var(--sky-50)', padding: '8px 12px', borderRadius: 12 }}>
                  🎯 <strong>Coaching tip (suggestion):</strong> {s.coaching.text}
                </p>
              </div>
            ))}
          </div>

          {ev.roleModelComparison.length > 0 && (
            <>
              <H n="04">Role model comparison</H>
              <div className="stack">
                {ev.roleModelComparison.map((rm) => (
                  <div key={rm.sectionId} className="grid grid-2" style={{ breakInside: 'avoid' }}>
                    <div className="card card-flat card-tight" style={{ background: 'var(--grey-50)' }}>
                      <div className="eyebrow">What was said · {rm.sectionName}</div>
                      <div style={{ marginTop: 6 }}>
                        <EvidenceCard evidence={rm.current} />
                      </div>
                    </div>
                    <div className="card card-flat card-tight card-green">
                      <div className="eyebrow">{rm.idealKind === 'reference' ? 'Role model (reference)' : 'Suggested phrasing'}</div>
                      <p style={{ marginTop: 6, fontWeight: 600 }}>“{rm.ideal}”</p>
                      {rm.idealGlossEn && <p className="tiny muted">Gloss (unofficial): {rm.idealGlossEn}</p>}
                      <p className="tiny faint">{rm.idealAttribution}</p>
                      <p className="small" style={{ marginTop: 6 }}>
                        <em>Why it's stronger:</em> {rm.whyItWorks}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <H n="05">EQ observation (unscored)</H>
          <div className="card card-flat card-lilac">
            <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none', lineHeight: 1.7 }}>
              {ev.eqObservation
                .filter((e) => e.inReference)
                .map((e) => (
                  <li key={e.dimensionId} style={{ marginBottom: 8 }}>
                    <strong>
                      {e.status === 'present' ? '✓' : e.status === 'weak' ? '△' : e.status === 'absent' ? '✘' : '❔'} {e.label}
                    </strong>{' '}
                    — {e.observation}
                    {e.status !== 'present' && e.status !== 'insufficient' && <div className="small muted">Coaching: {e.coaching}</div>}
                  </li>
                ))}
            </ul>
          </div>

          {CAMPAIGN_FOCUS.active && (
            <>
              <H n="06">
                Campaign focus (unscored) — {CAMPAIGN_FOCUS.headline} · {CAMPAIGN_FOCUS.headlineEn}
              </H>
              <div className="card card-flat">
                <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none', lineHeight: 1.7 }}>
                  {campaign.hits.map((h) => (
                    <li key={h.keyword.id} style={{ marginBottom: 6 }}>
                      <strong>
                        {h.present ? '✓' : '✘'} {h.keyword.label}
                      </strong>
                      {h.present && h.quote ? <span className="small"> — “{h.quote}”</span> : <span className="small muted"> — not said. Try: “{h.keyword.example}”</span>}
                    </li>
                  ))}
                </ul>
                <p className="tiny faint" style={{ marginTop: 8 }}>
                  Keyword check on consultant lines only — never part of the ICC score.
                </p>
              </div>
            </>
          )}

          <H n={CAMPAIGN_FOCUS.active ? '07' : '06'}>Priority action plan — next 30 days</H>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 6px' }}>
            <tbody>
              {ev.actionPlan.map((a) => (
                <tr key={a.id}>
                  <td style={{ width: 120, verticalAlign: 'top' }}>
                    <span className="pill pill-ink">{fw.actionPlanPhases.find((p) => p.id === a.phase)?.label}</span>
                  </td>
                  <td style={{ background: 'var(--grey-50)', borderRadius: 12, padding: '8px 12px' }}>{a.action}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {review && (
            <>
              <H n="07">QA review</H>
              <div className="card card-flat card-yellow card-tight small">
                AI score {review.aiScore}/{ev.maxScore} → QA final {review.finalScore}/{ev.maxScore} ({review.finalPercentage}%) · {review.reviewer} · {new Date(review.timestamp).toLocaleString('en-GB')}
                {review.overrideReason && <div>Reason: {review.overrideReason}</div>}
                {review.comment && <div>Comment: {review.comment}</div>}
              </div>
            </>
          )}

          <footer className="tiny faint" style={{ marginTop: 36, borderTop: '1.5px dashed var(--line-2)', paddingTop: 14 }}>
            Generated by MARCOM Calling QA · {ev.engine.provider === 'mock-heuristic' ? 'Demo evaluator (keyword checks, not AI)' : `Claude (${ev.engine.model})`} · Every quote verified against the transcript ({ev.verification.checkedQuotes} checked) · Coaching tips are suggestions · Confidential — Internal Use Only
          </footer>
        </div>
      </article>
    </div>
  );
}
