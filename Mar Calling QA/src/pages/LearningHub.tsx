import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useT } from '@/services/i18n';
import { CALL_FLOW, getLesson, LESSONS, PRACTICE_SCENARIOS } from '@/content/learningHub';
import { COMMON_CONCERNS, CONCERN_CHART, DAY1_SCRIPT, FOLLOW_UP_CADENCE, P, PLAYBOOK_FACTS } from '@/content/iccPlaybook';
import { AcademyIllustration } from '@/components/illustrations';
import { ComingSoon, SourceTag } from '@/components/ui';
import { buildContext, DETECTORS } from '@/services/qaEvaluator/detectors';
import type { TranscriptLine } from '@/types/qa';
import type { LessonId } from '@/types/framework';

export function LearningHub() {
  const t = useT();
  const [params, setParams] = useSearchParams();
  const active = (params.get('lesson') as LessonId) ?? 'introduction';
  const lesson = getLesson(active) ?? LESSONS[0];

  useEffect(() => {
    if (params.get('lesson')) document.getElementById('lesson')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [params]);

  return (
    <div className="page">
      <section className="hero" style={{ gridTemplateColumns: 'minmax(0, 1fr) auto' }}>
        <div>
          <span className="pill pill-ink">📚 MARCOM CALLING ACADEMY</span>
          <h1 style={{ marginTop: 14, fontSize: 'clamp(30px, 4.5vw, 52px)' }}>
            {t({ en: 'Learn the ICC way', zh: '用 ICC 的方式学' })}
          </h1>
          <p className="muted" style={{ marginTop: 10, maxWidth: 560 }}>
            Bite-sized lessons built from the ICC reference materials — the common mistake, the better approach, why it matters, and real role-model lines to practise.
          </p>
        </div>
        <div className="float hide-mobile">
          <AcademyIllustration size={200} />
        </div>
      </section>

      <div className="card">
        <div className="card-head">
          <div>
            <h2>🧭 Recommended ICC call flow</h2>
            <div className="sub">From the CSC Call Template — combine rapport style with discovery depth</div>
          </div>
          <span className="spacer" />
          <SourceTag source={{ document: 'CSC_Call_Template_Jun15.pdf', note: 'Recommended Call Script Template (Based on Both Calls)' }} />
        </div>
        <div className="journey">
          {CALL_FLOW.map((s) => (
            <button key={s.step} className="jstep" style={{ background: 'none', border: 0, cursor: 'pointer' }} onClick={() => setParams({ lesson: s.lessonId })}>
              <span className="jdot wiggle" style={{ background: active === s.lessonId ? 'var(--yellow)' : '#fff' }}>
                {s.emoji}
              </span>
              <strong>
                {s.step}. {s.title}
              </strong>
              <span className="pill pill-neutral">⏱️ {s.duration}</span>
            </button>
          ))}
        </div>
      </div>

      <PlaybookCard />

      <div className="hscroll" role="tablist" aria-label="Lessons">
        {LESSONS.map((l) => (
          <button
            key={l.id}
            role="tab"
            aria-selected={l.id === active}
            className="card card-tight lift"
            onClick={() => setParams({ lesson: l.id })}
            style={{ textAlign: 'left', cursor: 'pointer', background: l.tint, border: l.id === active ? '2px solid var(--ink)' : undefined, boxShadow: l.id === active ? '3px 3px 0 var(--ink)' : undefined }}
          >
            <span style={{ fontSize: 30 }} aria-hidden>
              {l.emoji}
            </span>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 650, marginTop: 6 }}>{l.title}</div>
            <div className="small muted">{l.tagline}</div>
          </button>
        ))}
      </div>

      <div className="card anchor-target" id="lesson" style={{ background: lesson.tint }}>
        <div className="card-head">
          <span style={{ fontSize: 44 }} aria-hidden>
            {lesson.emoji}
          </span>
          <div>
            <div className="eyebrow">Lesson</div>
            <h2 style={{ fontSize: 32 }}>{lesson.title}</h2>
            <div className="sub">{lesson.tagline}</div>
          </div>
          <span className="spacer" />
          {lesson.duration && <span className="pill pill-neutral">⏱️ {lesson.duration}</span>}
        </div>
        <div className="grid grid-2">
          <div className="card card-flat" style={{ background: '#fff' }}>
            <div className="eyebrow">😬 Common mistake</div>
            <ul style={{ margin: '8px 0 0', paddingLeft: 18, lineHeight: 1.7 }}>
              {lesson.commonMistake.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
          <div className="card card-flat" style={{ background: '#fff' }}>
            <div className="eyebrow">🌟 Better approach</div>
            <ul style={{ margin: '8px 0 0', paddingLeft: 18, lineHeight: 1.7 }}>
              {lesson.betterApproach.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="card card-flat card-ink" style={{ marginTop: 20 }}>
          <div className="eyebrow" style={{ color: 'var(--yellow)' }}>
            💡 Why it matters
          </div>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 22, lineHeight: 1.35, marginTop: 6 }}>{lesson.whyItMatters}</p>
        </div>
        <div style={{ marginTop: 20 }}>
          <div className="eyebrow">🎙️ Practice example</div>
          <div className="grid grid-2" style={{ marginTop: 10 }}>
            {lesson.practice.map((p) => (
              <div key={p.text} className="card card-flat" style={{ background: '#fff' }}>
                {p.kind === 'reference' ? <span className="tag tag-reference">📄 Reference line</span> : <span className="tag tag-suggest">💡 Suggested phrasing</span>}
                <p className="hand" style={{ fontSize: 24, lineHeight: 1.25, marginTop: 10 }}>
                  “{p.text}”
                </p>
                {p.gloss && (
                  <p className="small muted" style={{ marginTop: 6 }}>
                    <em>English gloss (unofficial):</em> {p.gloss}
                  </p>
                )}
                <p className="tiny faint" style={{ marginTop: 8 }}>
                  {p.attribution}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="row-wrap" style={{ marginTop: 16, gap: 6 }}>
          <span className="tiny faint">Sources:</span>
          {lesson.sources.map((s) => (
            <SourceTag key={s.note} source={s} />
          ))}
        </div>
      </div>

      <PracticeMode />
    </div>
  );
}

type PlaybookTab = 'script' | 'facts' | 'cadence';

function PlaybookCard() {
  const [tab, setTab] = useState<PlaybookTab>('script');
  const tabs: Array<[PlaybookTab, string]> = [
    ['script', '📝 Day 1 script'],
    ['facts', '📋 Fact sheet'],
    ['cadence', '🗓️ 21-day follow-up'],
  ];
  return (
    <div className="card anchor-target" id="playbook" style={{ background: 'var(--yellow-50)' }}>
      <div className="card-head">
        <div>
          <h2>📒 ICC 秘籍 — New customer playbook</h2>
          <div className="sub">The team's own script: what to say, the facts to get right, and when to follow up</div>
        </div>
        <span className="spacer" />
        <SourceTag source={P('NEW CUSTOMER sheet — Day 1 Ice Breaker / Content / Closing and Day 2–21 follow-up')} />
      </div>
      <div className="row-wrap" role="tablist" aria-label="Playbook" style={{ gap: 8, marginBottom: 16 }}>
        {tabs.map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} className={`btn btn-sm ${tab === id ? 'btn-yellow' : ''}`} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'script' && (
        <div className="stack">
          {DAY1_SCRIPT.map((step) => (
            <div key={step.code} className="card card-flat" style={{ background: '#fff' }}>
              <div className="row" style={{ gap: 8 }}>
                <span style={{ fontSize: 24 }} aria-hidden>
                  {step.emoji}
                </span>
                <strong style={{ fontFamily: 'var(--font-display)', fontSize: 20 }}>{step.title}</strong>
                <span className="pill pill-neutral">({step.code === 'Close' ? 'C' : step.code})</span>
              </div>
              <div className="stack" style={{ gap: 10, marginTop: 10 }}>
                {step.lines.map((l) => (
                  <div key={l.text}>
                    <div>“{l.text}”</div>
                    <div className="tiny muted">
                      <em>English gloss (unofficial):</em> {l.gloss}
                    </div>
                  </div>
                ))}
              </div>
              {step.code === 'C' && (
                <div className="row-wrap tiny" style={{ gap: 6, marginTop: 12 }}>
                  <span className="faint">Concern chart:</span>
                  {CONCERN_CHART.map((c) => (
                    <span key={c} className="pill pill-neutral">
                      {c}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
          <p className="tiny faint">Copied from the playbook sheet; [名字] replaces the example consultant name. Say it in your own natural words — the evaluator looks for the behaviour, not the exact sentence.</p>
        </div>
      )}

      {tab === 'facts' && (
        <div className="grid grid-2">
          {PLAYBOOK_FACTS.map((f) => (
            <div key={f.label} className="card card-flat card-tight" style={{ background: '#fff' }}>
              <div className="eyebrow">
                {f.emoji} {f.label}
              </div>
              <div style={{ marginTop: 4 }}>{f.value}</div>
            </div>
          ))}
          <div className="card card-flat card-tight" style={{ background: '#fff' }}>
            <div className="eyebrow">🤔 Why leads don't book (Day 7 check)</div>
            <div className="row-wrap" style={{ gap: 6, marginTop: 6 }}>
              {COMMON_CONCERNS.map((c) => (
                <span key={c} className="pill pill-neutral">
                  {c}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'cadence' && (
        <ol className="stack" style={{ listStyle: 'none', padding: 0, margin: 0, gap: 10 }}>
          {FOLLOW_UP_CADENCE.map((s) => (
            <li key={s.day} className="card card-flat card-tight" style={{ background: s.channel === 'call' ? 'var(--sky-50)' : '#fff' }}>
              <div className="row-wrap" style={{ gap: 8 }}>
                <strong className="tabular" style={{ minWidth: 64 }}>
                  {s.day}
                </strong>
                <span className="pill pill-neutral">{s.channel === 'call' ? '📞 Call' : '💬 WhatsApp'}</span>
                <strong>{s.title}</strong>
              </div>
              {s.script && <div style={{ marginTop: 6 }}>“{s.script}”</div>}
              <div className="tiny muted" style={{ marginTop: 4 }}>
                {s.gloss}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function PracticeMode() {
  const [scenario, setScenario] = useState(PRACTICE_SCENARIOS[0].id);
  const [answer, setAnswer] = useState('');
  const [checked, setChecked] = useState(false);
  const sc = PRACTICE_SCENARIOS.find((s) => s.id === scenario)!;

  const result = useMemo(() => {
    if (!checked || !answer.trim()) return null;
    const lines: TranscriptLine[] = [
      { index: 0, timestamp: null, seconds: null, speakerLabel: 'Customer', speaker: 'customer', text: sc.customer },
      { index: 1, timestamp: null, seconds: null, speakerLabel: 'You', speaker: 'agent', text: answer },
    ];
    const ctx = buildContext(lines);
    const checks = [
      { label: 'Empathy', ok: DETECTORS.empathy(ctx).present, tip: 'Acknowledge the feeling first — e.g. "I completely understand…"' },
      { label: 'No-commitment reassurance', ok: DETECTORS.no_obligation(ctx).present, tip: '"You\'re not committing to anything, just come and let the doctor take a look."' },
      { label: 'Two specific options', ok: DETECTORS.two_options(ctx).present, tip: 'Offer two specific slots, e.g. "Tuesday 11am or Thursday 3pm?"' },
      { label: 'Urgency (gift / deadline)', ok: DETECTORS.skincare_gift(ctx).present || DETECTORS.promo_deadline(ctx).present, tip: 'Mention the free skincare gift and the 2-week deadline.' },
      { label: 'Confident recommendation', ok: DETECTORS.confidence(ctx).present, tip: 'Use clear language: "I recommend starting with the AI Skin Analysis."' },
    ];
    return checks;
  }, [checked, answer, sc]);

  return (
    <div className="card" style={{ border: '2px dashed var(--ink)' }}>
      <div className="card-head">
        <div>
          <h2>🎭 Practice Call</h2>
          <div className="sub">Practise a tricky moment and get instant feedback</div>
        </div>
        <span className="spacer" />
        <ComingSoon label="AI coach coming soon" />
      </div>
      <div className="row-wrap" style={{ gap: 8 }}>
        {PRACTICE_SCENARIOS.map((s) => (
          <button
            key={s.id}
            className={`btn btn-sm ${s.id === scenario ? 'btn-yellow' : ''}`}
            onClick={() => {
              setScenario(s.id);
              setChecked(false);
            }}
          >
            “{s.customer}”
          </button>
        ))}
      </div>
      <div className="grid grid-2" style={{ marginTop: 16 }}>
        <div className="stack">
          <div className="bubble" style={{ position: 'relative', maxWidth: '100%' }}>
            🙂 Customer: “{sc.customer}”
          </div>
          <p className="small muted" style={{ marginTop: 14 }}>
            🎯 Aim for: {sc.focus}
          </p>
          <textarea className="textarea" rows={4} placeholder="Type how you would respond…" value={answer} onChange={(e) => { setAnswer(e.target.value); setChecked(false); }} aria-label="Your response" />
          <button className="btn btn-primary" onClick={() => setChecked(true)} disabled={!answer.trim()}>
            ✨ Check my response
          </button>
        </div>
        <div className="card card-flat" style={{ background: 'var(--grey-50)' }}>
          {result ? (
            <div className="stack">
              <div className="eyebrow">🌟 What you did well</div>
              {result.filter((r) => r.ok).length ? (
                result.filter((r) => r.ok).map((r) => <div key={r.label}>✅ {r.label}</div>)
              ) : (
                <div className="small muted">Keep going — every attempt builds the habit 🌱</div>
              )}
              <div className="eyebrow" style={{ marginTop: 8 }}>
                🎯 Try this next
              </div>
              {result
                .filter((r) => !r.ok)
                .slice(0, 3)
                .map((r) => (
                  <div key={r.label} className="small">
                    <strong>{r.label}:</strong> {r.tip} <span className="tag tag-suggest">suggestion</span>
                  </div>
                ))}
              <p className="tiny faint" style={{ marginTop: 6 }}>
                Preview uses the same keyword checks as the demo evaluator — not AI. Empathy, clarity, ICC alignment and confidence scoring by Claude are coming soon.
              </p>
            </div>
          ) : (
            <div className="empty small muted" style={{ padding: 20 }}>
              Your feedback will appear here ✍️
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
