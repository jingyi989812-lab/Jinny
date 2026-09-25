import { CSC_STANDARD } from '@/config/cscStandard';
import { STANDARD_SOURCE } from '@/config/cscStandard';
import { SourceTag } from '@/components/ui';
import type { StandardResult, StandardSummary } from '@/services/cscStandard';

const Tick = ({ on }: { on: boolean }) => <span className={`pill ${on ? 'pill-good' : 'pill-warn'}`}>{on ? '✓' : '✘'}</span>;

/** Per call: 有效劳动 = 创造需求 — did this call do the work that counts? */
export function StandardCard({ result, onJump }: { result: StandardResult; onJump?: (lineIndex: number) => void }) {
  if (!CSC_STANDARD.active) return null;
  const [ask, expert] = CSC_STANDARD.capabilities;
  return (
    <div className="card" style={{ borderColor: 'var(--ink)' }}>
      <div className="card-head">
        <div>
          <div className="eyebrow">🎓 CSC standard · MARCOM</div>
          <h2 style={{ marginTop: 4 }}>
            有效劳动 = <span lang="zh">{CSC_STANDARD.effectiveWork.zh}</span>
          </h2>
          <div className="sub">{CSC_STANDARD.effectiveWork.en} — the two things that produce it</div>
        </div>
        <span className="spacer" />
        <span className="pill pill-lilac">UNSCORED</span>
      </div>

      <div className="grid grid-2">
        <div className="card card-flat card-tight">
          <div className="row-wrap">
            <strong>
              ❓ <span lang="zh">{ask.zh}</span> · {ask.en}
            </strong>
            <span className="spacer" />
            <Tick on={result.questions.meetsTarget} />
          </div>
          <p className="small" style={{ marginTop: 6 }}>
            <strong className="tabular">{result.questions.count}</strong> questions asked
            {result.questions.deeper > 0 && (
              <>
                , <strong className="tabular">{result.questions.deeper}</strong> of them going a level deeper
              </>
            )}
            . <span className="muted">Working target: {result.questions.target}+.</span>
          </p>
          {result.questions.samples[0] && (
            <button className="link small" onClick={() => onJump?.(result.questions.samples[0].index)}>
              🔎 “{result.questions.samples[0].text.slice(0, 60)}…”
            </button>
          )}
        </div>

        <div className="card card-flat card-tight">
          <div className="row-wrap">
            <strong>
              🩺 <span lang="zh">{expert.zh}</span> · {expert.en}
            </strong>
            <span className="spacer" />
            <span className="pill pill-neutral tabular">{result.pillarsCovered} / 3</span>
          </div>
          <div className="stack" style={{ gap: 6, marginTop: 8 }}>
            {result.pillars.map((p, i) => (
              <div key={p.id} className="row-wrap small">
                <span>
                  {['①', '②', '③'][i]} <span lang="zh">{expert.pillars?.[i]?.zh}</span>
                </span>
                <span className="spacer" />
                <Tick on={p.present} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card card-flat card-tight" style={{ marginTop: 12, background: result.createdNeed ? 'var(--green-50)' : 'var(--yellow-50)' }}>
        <div className="row-wrap">
          <strong>
            💡 <span lang="zh">创造需求</span> · Did the call create the need?
          </strong>
          <span className="spacer" />
          <Tick on={result.createdNeed} />
        </div>
        <p className="small" style={{ marginTop: 4 }}>
          {result.createdNeedWhy}
        </p>
      </div>

      {result.mindset.some((m) => m.flagged) && (
        <div className="stack" style={{ gap: 8, marginTop: 12 }}>
          <div className="eyebrow">🧠 思维 Mindset — the habit underneath</div>
          {result.mindset
            .filter((m) => m.flagged)
            .map((m) => (
              <div key={m.check.id} className="card card-flat card-tight card-pink">
                <strong>
                  {m.check.emoji} <span lang="zh">{m.check.labelZh}</span> · {m.check.label}
                </strong>
                <p className="small" style={{ marginTop: 4 }}>
                  {m.check.tell}
                </p>
                <p className="small" style={{ marginTop: 4 }}>
                  <strong lang="zh">{m.check.shift}</strong>
                </p>
                <p className="small muted" style={{ marginTop: 4 }}>
                  {m.check.coaching} <span className="tag tag-suggest">suggestion</span>
                </p>
              </div>
            ))}
        </div>
      )}

      {result.objections.length > 0 && (
        <div className="stack" style={{ gap: 8, marginTop: 12 }}>
          <div className="eyebrow">🙋 What the customer pushed back with</div>
          {result.objections.map((o) => (
            <div key={o.type.id} className="card card-flat card-tight">
              <div className="row-wrap">
                <strong>
                  {o.type.emoji} <span lang="zh">{o.type.labelZh}</span>
                </strong>
                <span className="spacer" />
                <button className="link small" onClick={() => onJump?.(o.lineIndex)}>
                  🔎 see it
                </button>
              </div>
              <p className="small" style={{ marginTop: 4 }}>“{o.quote}”</p>
              <p className="small muted" style={{ marginTop: 4 }}>
                {o.type.response} <span className="tag tag-suggest">suggestion</span>
              </p>
            </div>
          ))}
        </div>
      )}

      <p className="tiny faint" style={{ marginTop: 10 }}>
        Keyword and ordering signals only — they show what was said and when, not how well. Never added to the ICC score. <SourceTag source={STANDARD_SOURCE} />
      </p>
    </div>
  );
}

/** Month view: how the team is working to the standard. */
export function StandardSummaryCard({ summary, monthLabel }: { summary: StandardSummary; monthLabel: string }) {
  if (!CSC_STANDARD.active || !summary.calls) return null;
  const share = (n: number) => Math.round((n / summary.calls) * 100);
  const rows: Array<[string, string, number]> = [
    ['❓ 懂得问问题', `${summary.metQuestionTarget} of ${summary.calls} calls asked ${CSC_STANDARD.capabilities[0].target}+ questions`, share(summary.metQuestionTarget)],
    ['🩺 体现专家', `${summary.allThreePillars} of ${summary.calls} calls used all three pillars`, share(summary.allThreePillars)],
    ['💡 创造需求', `${summary.createdNeed} of ${summary.calls} calls went past the symptom`, share(summary.createdNeed)],
  ];
  return (
    <div className="card">
      <div className="card-head">
        <div>
          <div className="eyebrow">🎓 CSC standard · {monthLabel}</div>
          <h2 style={{ marginTop: 4 }}>
            <span lang="zh">有效劳动：创造需求</span>
          </h2>
          <div className="sub">
            {CSC_STANDARD.identity.zh} · {CSC_STANDARD.whyUs.zh}
          </div>
        </div>
        <span className="spacer" />
        <span className="pill pill-lilac">UNSCORED</span>
      </div>

      <div className="stack" style={{ gap: 12 }}>
        {rows.map(([label, detail, pct]) => (
          <div key={label}>
            <div className="row-wrap">
              <strong>{label}</strong>
              <span className="spacer" />
              <span className="tabular small">{pct}%</span>
            </div>
            <div className="bar-track" style={{ height: 12, marginTop: 4 }}>
              <div className={`bar-fill ${pct >= 60 ? 'bar-good' : pct >= 30 ? 'bar-warn' : 'bar-serious'}`} style={{ width: `${pct}%` }} />
            </div>
            <p className="tiny muted" style={{ marginTop: 3 }}>
              {detail}
            </p>
          </div>
        ))}
      </div>

      <hr className="divider" style={{ margin: '16px 0' }} />
      <div className="grid grid-2">
        <div>
          <div className="eyebrow">🧠 思维 Mindset flags</div>
          <div className="stack" style={{ gap: 6, marginTop: 8 }}>
            {summary.mindset.map((m) => (
              <div key={m.check.id} className="row-wrap small">
                <span lang="zh">
                  {m.check.emoji} {m.check.labelZh}
                </span>
                <span className="spacer" />
                <span className="tabular">
                  {m.count} · {m.share}%
                </span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="eyebrow">🙋 Customer objections</div>
          <div className="stack" style={{ gap: 6, marginTop: 8 }}>
            {summary.objections.length ? (
              summary.objections.slice(0, 5).map((o) => (
                <div key={o.type.id} className="row-wrap small">
                  <span lang="zh">
                    {o.type.emoji} {o.type.labelZh}
                  </span>
                  <span className="spacer" />
                  <span className="tabular">
                    {o.count} · {o.share}%
                  </span>
                </div>
              ))
            ) : (
              <p className="small muted">None detected in this period.</p>
            )}
          </div>
        </div>
      </div>

      <p className="tiny faint" style={{ marginTop: 10 }}>
        Keyword signals on labelled transcripts. Objections are read from the customer's lines. <SourceTag source={STANDARD_SOURCE} />
      </p>
    </div>
  );
}
