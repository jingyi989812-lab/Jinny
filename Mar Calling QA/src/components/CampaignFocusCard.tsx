import { CAMPAIGN_FOCUS } from '@/config/strategyFocus';
import { SourceTag } from '@/components/ui';
import type { FocusResult, FocusSummary } from '@/services/campaignFocus';

/** Per-call view: did this call carry the campaign message? */
export function CampaignFocusCard({ result, onJump }: { result: FocusResult; onJump?: (lineIndex: number) => void }) {
  if (!CAMPAIGN_FOCUS.active) return null;
  return (
    <div className="card card-flat" style={{ background: 'var(--sky-50)', borderColor: '#D5E3EE' }}>
      <div className="card-head">
        <div>
          <h2 style={{ fontSize: 22 }}>
            🎯 Campaign focus · <span lang="zh">{CAMPAIGN_FOCUS.headline}</span>
          </h2>
          <div className="sub">
            {CAMPAIGN_FOCUS.headlineEn} · {CAMPAIGN_FOCUS.period}
          </div>
        </div>
        <span className="spacer" />
        <span className="pill pill-lilac">UNSCORED OBSERVATION</span>
      </div>
      <div className="row-wrap" style={{ gap: 8, marginBottom: 10 }}>
        <strong className="tabular">
          {result.covered} / {result.total} keywords used
        </strong>
        {result.onMessage && <span className="pill pill-good">🌟 Fully on message</span>}
        {!result.diarized && <span className="tag">no speaker labels — attribution uncertain</span>}
      </div>
      <div className="stack" style={{ gap: 8 }}>
        {result.hits.map((h) => (
          <div key={h.keyword.id} className="card card-flat card-tight" style={{ background: '#fff' }}>
            <div className="row-wrap">
              <span aria-hidden>{h.keyword.emoji}</span>
              <strong>{h.keyword.label}</strong>
              <span className="spacer" />
              <span className={`pill ${h.present ? 'pill-good' : 'pill-warn'}`}>{h.present ? '✓ Said' : '✘ Not said'}</span>
            </div>
            {h.present && h.quote ? (
              <button
                className="small"
                onClick={() => h.lineIndex !== undefined && onJump?.(h.lineIndex)}
                style={{ background: 'none', border: 0, padding: '6px 0 0', textAlign: 'left', cursor: onJump ? 'pointer' : 'default', font: 'inherit' }}
              >
                “{h.quote.length > 150 ? `${h.quote.slice(0, 147)}…` : h.quote}”
              </button>
            ) : (
              <p className="small muted" style={{ marginTop: 6 }}>
                <em>Try:</em> “{h.keyword.example}” <span className="tag tag-suggest">suggestion</span>
              </p>
            )}
          </div>
        ))}
      </div>
      <p className="tiny faint" style={{ marginTop: 10 }}>
        Keyword check only — it shows whether the message was said, not how convincingly. Never added to the ICC score.{' '}
        <SourceTag source={CAMPAIGN_FOCUS.source} />
      </p>
    </div>
  );
}

/** Team view: how much of the month's calls carried the campaign message. */
export function CampaignFocusSummaryCard({ summary, monthLabel, onPick }: { summary: FocusSummary; monthLabel: string; onPick?: (keywordId: string) => void }) {
  if (!CAMPAIGN_FOCUS.active) return null;
  return (
    <div className="card">
      <div className="card-head">
        <div>
          <h2>
            🎯 Campaign focus · <span lang="zh">{CAMPAIGN_FOCUS.headline}</span>
          </h2>
          <div className="sub">
            {monthLabel} · {summary.calls} calls · is the new positioning reaching customers?
          </div>
        </div>
        <span className="spacer" />
        <span className="pill pill-lilac">UNSCORED</span>
      </div>
      <p className="small muted" style={{ marginTop: -4, marginBottom: 12 }}>
        {CAMPAIGN_FOCUS.why}
      </p>
      <div className="stack" style={{ gap: 10 }}>
        {summary.byKeyword.map((k) => (
          <div key={k.keyword.id}>
            <div className="row-wrap" style={{ gap: 8 }}>
              <span aria-hidden>{k.keyword.emoji}</span>
              <strong>{k.keyword.label}</strong>
              <span className="spacer" />
              <span className="tabular small">
                {k.count} / {summary.calls} calls · {k.share}%
              </span>
            </div>
            <button
              className="bar-track"
              onClick={() => onPick?.(k.keyword.id)}
              aria-label={`${k.keyword.label}: ${k.share}% of calls`}
              style={{ height: 12, marginTop: 4, width: '100%', border: 0, padding: 0, cursor: onPick ? 'pointer' : 'default' }}
            >
              <div className={`bar-fill ${k.share >= 60 ? 'bar-good' : k.share >= 30 ? 'bar-warn' : 'bar-serious'}`} style={{ width: `${k.share}%` }} />
            </button>
          </div>
        ))}
      </div>
      <div className="card card-flat card-tight" style={{ background: 'var(--yellow-50)', marginTop: 14 }}>
        <strong className="tabular">
          {summary.onMessage} of {summary.calls} calls ({summary.onMessageShare}%)
        </strong>{' '}
        used every part of the message.
      </div>
      <p className="tiny faint" style={{ marginTop: 8 }}>
        Keyword check on consultant lines only. Set the current focus in <code>src/config/strategyFocus.ts</code>. <SourceTag source={CAMPAIGN_FOCUS.source} />
      </p>
    </div>
  );
}
