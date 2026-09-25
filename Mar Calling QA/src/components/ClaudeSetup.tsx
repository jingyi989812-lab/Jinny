import { useMemo, useRef, useState } from 'react';
import { SAMPLE_CALL_META, SAMPLE_TRANSCRIPT } from '@/content/sampleTranscript';
import { PRIMARY_FRAMEWORK } from '@/config/frameworks';
import { evaluateCall } from '@/services/qaEvaluator';
import { CLAUDE_MODEL } from '@/services/qaEvaluator/claudeEvaluator';
import type { ClaudeUsage } from '@/services/store';
import { useStore } from '@/services/store';
import type { Call } from '@/types/call';

/**
 * Claude Opus 5 list prices (USD per million tokens) — used only for an on-screen ESTIMATE.
 * Billing truth is the Anthropic Console.
 */
const PRICE = { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 };

export function estimateCost(u: Pick<ClaudeUsage, 'inputTokens' | 'outputTokens' | 'cacheReadTokens' | 'cacheWriteTokens'>) {
  return (u.inputTokens * PRICE.input + u.outputTokens * PRICE.output + u.cacheReadTokens * PRICE.cacheRead + u.cacheWriteTokens * PRICE.cacheWrite) / 1_000_000;
}
const usd = (n: number) => (n < 0.01 ? '< $0.01' : `$${n.toFixed(n < 1 ? 3 : 2)}`);

function Step({ n, done, title, children }: { n: number; done: boolean; title: string; children: React.ReactNode }) {
  return (
    <div className="row" style={{ alignItems: 'flex-start', gap: 12 }}>
      <span
        className="nav-icon"
        style={{ background: done ? 'var(--green)' : '#fff', fontWeight: 800, fontSize: 15 }}
        aria-label={done ? `Step ${n} done` : `Step ${n}`}
      >
        {done ? '✓' : n}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <strong>{title}</strong>
        <div className="small muted" style={{ marginTop: 2 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

export function ClaudeSetup() {
  const store = useStore();
  const h = store.claudeHealth;
  const [checking, setChecking] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string; cost?: number } | null>(null);
  const [bulk, setBulk] = useState<{ done: number; total: number; failed: string[] } | null>(null);
  const cancelRef = useRef(false);

  const targets = useMemo(() => store.calls.filter((c) => c.transcriptSource === 'recording-import' && c.evaluation.engine.provider !== 'claude'), [store.calls]);
  const avgCost = store.claudeUsage.calls ? estimateCost(store.claudeUsage) / store.claudeUsage.calls : null;

  const recheck = async () => {
    setChecking(true);
    const r = await store.refreshClaudeHealth();
    setChecking(false);
    store.toast(r.keyConfigured ? '✅ API key found' : r.reachable ? 'No key yet — run npm run set-key' : 'Local API not reachable — is the app running with npm run dev?');
  };

  const test = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const ev = await evaluateCall(
        {
          callId: 'CLAUDE-TEST',
          staffName: SAMPLE_CALL_META.staffName,
          callDate: SAMPLE_CALL_META.callDate,
          duration: SAMPLE_CALL_META.durationSec,
          outlet: SAMPLE_CALL_META.outlet,
          leadSource: SAMPLE_CALL_META.leadSource,
          language: SAMPLE_CALL_META.language,
          transcript: SAMPLE_TRANSCRIPT,
          frameworkId: PRIMARY_FRAMEWORK.id,
        },
        'claude',
      );
      const u = ev.claude?.judgements.usage;
      const cost = u ? estimateCost(u) : undefined;
      if (u) store.recordClaudeUsage(u);
      setTestResult({
        ok: true,
        message: `Claude scored the fictional demo call ${ev.overallScore}/${ev.maxScore} (${ev.overallPercentage}%) with ${ev.verification.checkedQuotes} quotes checked and ${ev.verification.removedQuotes} removed.`,
        cost,
      });
    } catch (e) {
      setTestResult({ ok: false, message: e instanceof Error ? e.message : 'Test failed' });
    } finally {
      setTesting(false);
    }
  };

  const runBulk = async () => {
    const list: Call[] = targets;
    const estimate = avgCost ? ` Estimated cost ≈ ${usd(avgCost * list.length)} (based on your average so far).` : ' Typical cost is roughly $0.10–$0.30 per call; run the test first for a real estimate.';
    if (!window.confirm(`Send ${list.length} imported transcripts to Claude for evaluation?${estimate}\n\nTranscripts (not lead numbers or file names) are sent to Anthropic's API.`)) return;
    cancelRef.current = false;
    setBulk({ done: 0, total: list.length, failed: [] });
    let next = 0;
    const worker = async () => {
      while (!cancelRef.current && next < list.length) {
        const call = list[next++];
        try {
          const ev = await evaluateCall(
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
          store.replaceEvaluation(call.id, ev);
          setBulk((b) => b && { ...b, done: b.done + 1 });
        } catch (e) {
          setBulk((b) => b && { ...b, done: b.done + 1, failed: [...b.failed, `${call.id}: ${e instanceof Error ? e.message : 'failed'}`] });
        }
      }
    };
    await Promise.all([worker(), worker(), worker()]);
    store.toast(cancelRef.current ? 'Stopped — finished calls were saved' : '✨ Claude evaluations complete');
  };

  const u = store.claudeUsage;
  const ready = h.reachable && h.keyConfigured;

  return (
    <div className="card" style={{ border: ready ? '2px solid var(--green-600)' : '2px dashed var(--line-2)' }}>
      <div className="card-head">
        <div>
          <h2>✨ Claude evaluation engine</h2>
          <div className="sub">
            Model <code>{h.model ?? CLAUDE_MODEL}</code> · your key stays on this computer, the browser never sees it
          </div>
        </div>
        <span className="spacer" />
        <span className={`pill ${ready ? 'pill-good' : 'pill-warn'}`}>{ready ? '🟢 Connected' : h.reachable ? '🟡 Waiting for API key' : '⚪ Local API not running'}</span>
      </div>

      <div className="stack">
        <Step n={1} done={h.reachable} title="Run the app on this computer">
          Start it with <code>npm run dev</code>. The local QA API runs inside it.
        </Step>
        <Step n={2} done={h.keyConfigured} title="Save your Anthropic API key (hidden)">
          In a terminal in the project folder, run <code>npm run set-key</code> and paste the key when asked. Nothing shows while you paste, and the key is saved to <code>.env.local</code> (never in the code, never in chat).{' '}
          Get a key at <strong>console.anthropic.com → API Keys</strong>.
          <div style={{ marginTop: 8 }}>
            <button className="btn btn-sm" onClick={recheck} disabled={checking}>
              {checking ? 'Checking…' : '🔄 I saved it — check again'}
            </button>
          </div>
        </Step>
        <Step n={3} done={Boolean(testResult?.ok)} title="Test with the fictional demo call">
          Sends only the made-up demo transcript. Costs a few cents.
          <div style={{ marginTop: 8 }}>
            <button className="btn btn-sm btn-yellow" onClick={test} disabled={!ready || testing}>
              {testing ? '⏳ Claude is reading the call…' : '🧪 Run test'}
            </button>
          </div>
          {testResult && (
            <div className={`card card-flat card-tight ${testResult.ok ? 'card-green' : 'card-pink'}`} style={{ marginTop: 8 }}>
              {testResult.ok ? '✅ ' : '⚠️ '}
              {testResult.message}
              {testResult.cost !== undefined && <div className="tiny muted">This call: ≈ {usd(testResult.cost)} (estimate)</div>}
            </div>
          )}
        </Step>
        <Step n={4} done={store.provider === 'claude'} title="Use Claude for new evaluations">
          <label className="row" style={{ cursor: ready ? 'pointer' : 'not-allowed', marginTop: 4 }}>
            <input type="checkbox" disabled={!ready} checked={store.provider === 'claude'} onChange={(e) => store.setProvider(e.target.checked ? 'claude' : 'mock')} />
            Evaluate pasted transcripts and “Re-evaluate” with Claude (instead of the keyword demo evaluator)
          </label>
        </Step>
        <Step n={5} done={targets.length === 0 && store.calls.some((c) => c.evaluation.engine.provider === 'claude')} title="Re-evaluate your imported recordings with Claude">
          {targets.length} imported call{targets.length === 1 ? '' : 's'} still use the keyword demo evaluator. Runs 3 at a time; finished calls are saved as they complete.
          <div className="row-wrap" style={{ marginTop: 8 }}>
            <button className="btn btn-sm btn-primary" onClick={runBulk} disabled={!ready || !targets.length || (bulk !== null && bulk.done < bulk.total)}>
              ✨ Evaluate {targets.length} with Claude
            </button>
            {bulk && bulk.done < bulk.total && (
              <button className="btn btn-sm btn-ghost" onClick={() => (cancelRef.current = true)}>
                Stop
              </button>
            )}
          </div>
          {bulk && (
            <div className="stack" style={{ gap: 6, marginTop: 10 }}>
              <div className="bar-track" style={{ height: 12 }}>
                <div className="bar-fill bar-good" style={{ width: `${(bulk.done / Math.max(1, bulk.total)) * 100}%` }} />
              </div>
              <span className="tiny tabular">
                {bulk.done} / {bulk.total} done{bulk.failed.length ? ` · ${bulk.failed.length} failed` : ''}
              </span>
              {bulk.failed.length > 0 && (
                <details className="tiny">
                  <summary>Show failures</summary>
                  {bulk.failed.map((f) => (
                    <div key={f}>{f}</div>
                  ))}
                </details>
              )}
            </div>
          )}
        </Step>
      </div>

      <hr className="divider" style={{ margin: '16px 0' }} />
      <div className="row-wrap small">
        <strong>Usage on this computer:</strong>
        <span className="tabular">
          {u.calls} evaluation{u.calls === 1 ? '' : 's'} · {(u.inputTokens + u.cacheReadTokens + u.cacheWriteTokens).toLocaleString()} input / {u.outputTokens.toLocaleString()} output tokens
        </span>
        <span className="pill pill-neutral">≈ {usd(estimateCost(u))} estimated</span>
        {avgCost !== null && <span className="muted">avg ≈ {usd(avgCost)} per call</span>}
        <span className="spacer" />
        <button className="link tiny" onClick={store.resetClaudeUsage}>
          reset counter
        </button>
      </div>
      <p className="tiny faint" style={{ marginTop: 6 }}>
        Estimate uses Claude Opus 5 list prices; your Anthropic Console shows actual billing. Transcripts sent to the API may contain customer conversations — make sure this fits your company's data policy.
      </p>
    </div>
  );
}
