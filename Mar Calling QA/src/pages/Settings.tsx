import { useState } from 'react';
import { FRAMEWORKS } from '@/config/frameworks';
import { OUTLETS_ARE_PLACEHOLDER } from '@/config/organisation';
import { CSC_STANDARD, STANDARD_SOURCE } from '@/config/cscStandard';
import { ComingSoon, SectionStatusPill, SourceTag, StatusPill } from '@/components/ui';
import { ACHIEVEMENT_RULES } from '@/services/achievements';
import { ROLE_META } from '@/services/privacy';
import { ClaudeSetup } from '@/components/ClaudeSetup';
import { CLAUDE_MODEL } from '@/services/qaEvaluator/claudeEvaluator';
import { EVALUATION_RULES } from '@/services/qaEvaluator/prompt';
import { useT } from '@/services/i18n';
import { useStore } from '@/services/store';
import type { UserRole } from '@/types/staff';

export function Settings() {
  const t = useT();
  const store = useStore();
  const [openFw, setOpenFw] = useState(FRAMEWORKS[0].id);
  const claudeReady = store.claudeHealth.reachable && store.claudeHealth.keyConfigured;

  return (
    <div className="page">
      <div className="stack" style={{ gap: 4 }}>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 42px)' }}>⚙️ {t({ en: 'Settings', zh: '设置' })}</h1>
        <p className="muted">{t({ en: 'Framework, evaluation engine, privacy and integrations.', zh: '框架、评估引擎、隐私与系统对接。' })}</p>
      </div>

      <div className="card card-ink">
        <div className="row-wrap">
          <span style={{ fontSize: 30 }}>🔒</span>
          <div>
            <h2 style={{ color: 'var(--yellow)' }}>Internal Use Only</h2>
            <p className="muted small">
              This application contains customer conversation information. Lead numbers are masked in general views, demo data is fictional, and data you create is stored only in this browser until a secure database and sign-in are connected.
            </p>
          </div>
        </div>
      </div>

      <div className="split">
        <div className="card">
          <div className="card-head">
            <div>
              <h2>👥 Role & visibility</h2>
              <div className="sub">What each door shows. Enforced in the browser only — real separation needs sign-in and server-side filtering.</div>
            </div>
            <span className="spacer" />
            <ComingSoon label="Sign-in coming soon" />
          </div>
          <div className="stack">
            {(Object.keys(ROLE_META) as UserRole[]).map((r) => (
              <label key={r} className="card card-flat card-tight row" style={{ cursor: 'pointer', background: store.role === r ? 'var(--yellow-50)' : '#fff' }}>
                <input type="radio" name="role" checked={store.role === r} onChange={() => store.setRole(r)} />
                <span style={{ fontSize: 22 }}>{ROLE_META[r].emoji}</span>
                <div>
                  <strong>{ROLE_META[r].label}</strong>
                  <div className="small muted">{ROLE_META[r].description}</div>
                  <div className="tiny faint">
                    {[
                      ROLE_META[r].canSeeOtherCalls ? 'All calls' : 'Own calls only',
                      ROLE_META[r].canSeeTeam ? 'Team + insights' : 'No team views',
                      ROLE_META[r].canSeeTranscripts ? 'Transcripts' : 'No transcripts',
                      ROLE_META[r].canReview ? 'Can confirm / override QA' : 'Read-only results',
                      ROLE_META[r].canRevealLeads ? 'Can reveal lead numbers' : 'Lead numbers masked',
                      ROLE_META[r].canSeeInternals ? 'Settings & engine' : 'No settings',
                    ].join(' · ')}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <h2>🧠 Evaluation engine</h2>
              <div className="sub">Which engine evaluates new transcripts</div>
            </div>
          </div>
          <div className="stack">
            <label className="card card-flat card-tight row" style={{ cursor: 'pointer', background: store.provider === 'mock' ? 'var(--yellow-50)' : '#fff' }}>
              <input type="radio" name="engine" checked={store.provider === 'mock'} onChange={() => store.setProvider('mock')} />
              <div>
                <strong>🧪 Demo evaluator</strong>
                <div className="small muted">Offline keyword detection. Free and instant, but not AI judgement.</div>
              </div>
            </label>
            <label className="card card-flat card-tight row" style={{ cursor: claudeReady ? 'pointer' : 'not-allowed', opacity: claudeReady ? 1 : 0.65, background: store.provider === 'claude' ? 'var(--yellow-50)' : '#fff' }}>
              <input type="radio" name="engine" disabled={!claudeReady} checked={store.provider === 'claude'} onChange={() => store.setProvider('claude')} />
              <div>
                <strong>✨ Claude ({CLAUDE_MODEL})</strong> {!claudeReady && <span className="tag">set up below</span>}
                <div className="small muted">Claude judges each ICC behaviour with quotes; the app calculates scores centrally and checks every quote.</div>
              </div>
            </label>
            <details>
              <summary className="small" style={{ cursor: 'pointer', fontWeight: 700 }}>
                AI evaluation rules sent to Claude
              </summary>
              <ol className="small" style={{ paddingLeft: 20, lineHeight: 1.7 }}>
                {EVALUATION_RULES.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ol>
            </details>
          </div>
        </div>
      </div>

      <div className="anchor-target" id="claude">
        <ClaudeSetup />
      </div>

      <div className="card">
        <div className="card-head">
          <div>
            <h2>📐 ICC framework registry</h2>
            <div className="sub">
              Stored centrally in <code>src/config/frameworks</code>. Versions are kept separate — weights are never merged.
            </div>
          </div>
        </div>
        <div className="row-wrap" style={{ marginBottom: 16 }}>
          {FRAMEWORKS.map((f) => (
            <button key={f.id} className={`btn btn-sm ${openFw === f.id ? 'btn-yellow' : ''}`} onClick={() => setOpenFw(f.id)}>
              {f.isPrimary ? '⭐ ' : ''}
              {f.frameworkName} · {f.frameworkVersion}
            </button>
          ))}
        </div>
        {FRAMEWORKS.filter((f) => f.id === openFw).map((f) => (
          <div key={f.id} className="stack-lg">
            <div className="row-wrap">
              <p style={{ flex: 1 }}>{f.description}</p>
              <SourceTag source={f.source} />
              <span className="pill pill-ink">Total {f.maxTotal} pts</span>
              {f.isPrimary && <span className="pill pill-good">Primary production rubric</span>}
            </div>
            <div className="table-wrap">
              <table className="table" style={{ minWidth: 760 }}>
                <thead>
                  <tr>
                    <th>Section</th>
                    <th>Max</th>
                    <th>Criteria (from source)</th>
                    <th>Behaviours checked</th>
                    <th>Source</th>
                  </tr>
                </thead>
                <tbody>
                  {f.sections.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <strong>
                          {s.emoji} {s.code} — {s.name}
                        </strong>
                        {s.recommendedDuration && <div className="tiny faint">⏱️ {s.recommendedDuration}</div>}
                      </td>
                      <td className="tabular">
                        <strong>{s.maxScore}</strong>
                      </td>
                      <td className="small">{s.criteria}</td>
                      <td className="small">
                        <ul style={{ margin: 0, paddingLeft: 16 }}>
                          {s.behaviours.map((b) => (
                            <li key={b.id} title={b.source.note}>
                              {b.label}
                              {b.conditional ? ' (if hesitation)' : ''}
                            </li>
                          ))}
                        </ul>
                        <div style={{ marginTop: 6 }}>
                          <SourceTag source={s.pointAllocation} />
                        </div>
                      </td>
                      <td>
                        <SourceTag source={s.source} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="grid grid-2">
              <div className="card card-flat card-tight card-yellow">
                <div className="eyebrow">Overall result bands</div>
                <div className="stack" style={{ marginTop: 8, gap: 6 }}>
                  {f.overallBands.map((b) => (
                    <div key={b.status} className="row-wrap small">
                      <StatusPill status={b.status} formal />
                      <span>≥ {b.minPercentage}%</span>
                      <SourceTag source={b.source} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="card card-flat card-tight card-yellow">
                <div className="eyebrow">Section status bands</div>
                <div className="stack" style={{ marginTop: 8, gap: 6 }}>
                  {f.sectionBands.map((b) => (
                    <div key={b.status} className="row-wrap small">
                      <SectionStatusPill status={b.status} />
                      <span>≥ {b.minPercentage}%</span>
                      <SourceTag source={b.source} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="card card-flat card-tight card-pink">
              <div className="eyebrow">⚠️ Notes & open questions found in the source documents</div>
              <ul className="small" style={{ margin: '8px 0 0', paddingLeft: 18, lineHeight: 1.7 }}>
                {f.sourceNotes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </div>
            <div className="card card-flat card-tight card-lilac">
              <div className="eyebrow">💛 EQ dimensions (unscored)</div>
              <div className="row-wrap" style={{ marginTop: 8 }}>
                {f.eqDimensions.map((d) => (
                  <span key={d.id} className={`tag ${d.inReference ? 'tag-reference' : ''}`} title={d.source.note}>
                    {d.emoji} {d.label} {d.labelZh ?? ''} {d.inReference ? '' : '· extension'}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-head">
          <div>
            <h2>📞 Scoring by call type</h2>
            <div className="sub">The ICC reference reports evaluate first sales calls. Other call types are scored on a narrower scope.</div>
          </div>
          <span className="spacer" />
          <label className="row small" style={{ cursor: 'pointer', fontWeight: 700 }}>
            <input type="checkbox" checked={store.scoreByCallType} onChange={(e) => { store.setScoreByCallType(e.target.checked); store.toast('Scores recalculated'); }} />
            Adjust scoring by call type
          </label>
        </div>
        <div className="grid grid-3">
          {FRAMEWORKS[0].callTypeProfiles.map((p) => (
            <div key={p.callType} className="card card-flat card-tight">
              <div className="row-wrap">
                <strong>
                  {p.emoji} {p.label}
                </strong>
                <span className="spacer" />
                <SourceTag source={p.source} />
              </div>
              <p className="small muted" style={{ marginTop: 6 }}>
                {p.description}
              </p>
              <p className="tiny" style={{ marginTop: 6 }}>
                Scored: {p.scoredStages === 'all' ? 'every section' : p.scoredStages.join(', ')}
              </p>
            </div>
          ))}
        </div>
        <p className="tiny faint" style={{ marginTop: 10 }}>
          Call types are estimated from transcript cues and can be corrected by QA on each report.
        </p>
      </div>

      <div className="card">
        <div className="card-head">
          <div>
            <h2>🎓 CSC standard</h2>
            <div className="sub">The MARCOM framework the calls are checked against — observed, never scored</div>
          </div>
          <span className="spacer" />
          <span className={`pill ${CSC_STANDARD.active ? 'pill-good' : 'pill-neutral'}`}>{CSC_STANDARD.active ? 'Active' : 'Off'}</span>
        </div>
        <div className="row-wrap" style={{ gap: 10 }}>
          <strong style={{ fontFamily: 'var(--font-display)', fontSize: 20 }} lang="zh">
            {CSC_STANDARD.formula}
          </strong>
          <span className="pill pill-neutral" lang="zh">
            我们是什么？{CSC_STANDARD.identity.zh}
          </span>
          <span className="pill pill-neutral" lang="zh">
            为什么选我们？{CSC_STANDARD.whyUs.zh}
          </span>
          <span className="spacer" />
          <SourceTag source={STANDARD_SOURCE} />
        </div>
        <div className="grid grid-2" style={{ marginTop: 12 }}>
          {CSC_STANDARD.capabilities.map((c) => (
            <div key={c.id} className="card card-flat card-tight">
              <strong lang="zh">
                {c.zh} · <span lang="en">{c.en}</span>
              </strong>
              <p className="small muted" style={{ marginTop: 4 }}>
                {c.description}
              </p>
              {'pillars' in c && (
                <ul className="small" style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                  {c.pillars.map((p) => (
                    <li key={p.n} lang="zh">
                      {p.zh} — <span lang="en">{p.en}</span>
                    </li>
                  ))}
                </ul>
              )}
              {'target' in c && (
                <p className="tiny muted" style={{ marginTop: 6 }}>
                  Working target: {c.target} {c.targetNote}
                </p>
              )}
            </div>
          ))}
        </div>
        <div className="row-wrap small" style={{ marginTop: 12 }}>
          {CSC_STANDARD.targets.map((x) => (
            <span key={x.id} className="pill pill-neutral" title={x.note}>
              {x.label}: {x.value}
            </span>
          ))}
        </div>
        <p className="tiny faint" style={{ marginTop: 10 }}>
          From the MARCOM meeting whiteboard (24 Sept 2026). "TU" and "8616" were written without a definition — confirm them before the app reports against them. Edit
          the standard in <code>src/config/cscStandard.ts</code>; the mindset checks and objection list live in <code>src/config/coachingLens.ts</code>.
        </p>
      </div>

      <div className="split">
        <div className="card">
          <div className="card-head">
            <div>
              <h2>🔌 Integrations</h2>
              <div className="sub">Honest status — nothing here pretends to be connected</div>
            </div>
          </div>
          <div className="stack">
            {[
              ['📝', 'Transcripts', 'Paste a transcript or import a recording compilation in Upload & Evaluate.', 'manual'],
              ['✨', 'Claude API evaluation', claudeReady ? 'Connected through the local QA API on this computer.' : 'Needs an API key — see the setup card above.', claudeReady ? 'ready' : 'soon'],
              ['🎙️', 'Speech transcription provider', 'Direct audio upload + transcription.', 'soon'],
              ['🗄️', 'Database', 'Calls and reviews are stored in this browser only.', 'soon'],
              ['🔐', 'Authentication & roles', 'Roles are simulated in the top bar.', 'soon'],
              ['☁️', 'Cloud storage for recordings', 'Not connected.', 'soon'],
              ['📄', 'PDF generation', 'Use Export QA Report → Print / Save as PDF for now.', 'soon'],
            ].map(([icon, name, note, status]) => (
              <div key={name} className="row card card-flat card-tight">
                <span style={{ fontSize: 22 }}>{icon}</span>
                <div style={{ flex: 1 }}>
                  <strong>{name}</strong>
                  <div className="small muted">{note}</div>
                </div>
                {status === 'manual' ? <span className="pill pill-warn">Manual workflow</span> : status === 'ready' ? <span className="pill pill-good">Ready</span> : <ComingSoon />}
              </div>
            ))}
          </div>
        </div>

        <div className="stack-lg">
          <div className="card">
            <div className="card-head">
              <div>
                <h2>🏅 Badge rules</h2>
                <div className="sub">Gamification settings (not part of the ICC rubric)</div>
              </div>
            </div>
            <ul className="small" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.8 }}>
              <li>Great Listener: Discovery ≥ {ACHIEVEMENT_RULES.listenerMinPct}%</li>
              <li>Product Pro: Product / Solution ≥ {ACHIEVEMENT_RULES.productMinPct}%</li>
              <li>Hot Streak: {ACHIEVEMENT_RULES.streakLength} improving calls in a row</li>
              <li>Growing: +{ACHIEVEMENT_RULES.growingMinPoints} pts vs previous call</li>
              <li>
                ICC Master: last {ACHIEVEMENT_RULES.masterCalls} calls, every section ≥ {ACHIEVEMENT_RULES.masterSectionMinPct}% and average ≥ {ACHIEVEMENT_RULES.masterAverageMinPct}%
              </li>
            </ul>
          </div>

          <div className="card">
            <div className="card-head">
              <div>
                <h2>🗂️ Data on this device</h2>
                <div className="sub">
                  {store.userCalls.length} evaluated call(s) · {Object.values(store.reviews).flat().length} QA decision(s)
                </div>
              </div>
            </div>
            <div className="stack">
              <label className="row small" style={{ cursor: 'pointer' }}>
                <input type="checkbox" checked={store.showDemoData} onChange={(e) => store.setShowDemoData(e.target.checked)} />
                Show fictional demo data (Yiling, Meredith, Suzanne, Adeline, Demo Agent)
              </label>
              {import.meta.env.DEV && (
                <button className="btn btn-sm" onClick={() => store.reloadLocalRecordings()}>
                  📥 Reload recordings from this computer (local-data)
                </button>
              )}
              {OUTLETS_ARE_PLACEHOLDER && <p className="tiny faint">Outlet and lead-source lists are placeholders in src/config/organisation.ts.</p>}
              <button
                className="btn btn-sm btn-pink"
                onClick={() => {
                  if (window.confirm('Remove calls, QA decisions and drafts you created on this device? Demo data will remain.')) {
                    store.resetLocalData();
                    store.toast('🧹 Local data cleared');
                  }
                }}
              >
                🧹 Clear my local data
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
