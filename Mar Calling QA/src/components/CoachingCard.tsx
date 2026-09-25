import { useNavigate } from 'react-router-dom';
import type { Finding, SectionResult } from '@/types/qa';
import { EvidenceCard } from './EvidenceCard';
import { Bar, ConfidenceTag, SectionStatusPill, SuggestionTag } from './ui';

function FindingBlock({ f, onJump }: { f: Finding; onJump: (i: number) => void }) {
  return (
    <div className="stack" style={{ gap: 6 }}>
      <div className="row" style={{ gap: 8, alignItems: 'flex-start' }}>
        <span aria-hidden>{f.kind === 'strength' ? '✅' : '❌'}</span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 700 }}>{f.title}</div>
          <div className="small muted">{f.detail}</div>
        </div>
        <ConfidenceTag level={f.confidence} reason={f.confidenceReason} />
      </div>
      <div className="stack" style={{ gap: 6, paddingLeft: 26 }}>
        {f.evidence.map((e, i) => (
          <EvidenceCard key={i} evidence={e} onJump={onJump} />
        ))}
      </div>
    </div>
  );
}

/** Section-by-section analysis: went well · missed · why it matters · coaching tip · evidence. */
export function CoachingCard({ section, open, onToggle, onJump }: { section: SectionResult; open: boolean; onToggle: () => void; onJump: (i: number) => void }) {
  const navigate = useNavigate();
  return (
    <div className="card anchor-target" id={`section-${section.sectionId}`} style={{ padding: 0, overflow: 'hidden' }}>
      <button
        onClick={onToggle}
        aria-expanded={open}
        style={{ width: '100%', background: 'none', border: 0, padding: '18px 22px', cursor: 'pointer', textAlign: 'left' }}
      >
        <div className="row-wrap" style={{ gap: 12 }}>
          <span className="jdot" style={{ width: 48, height: 48, fontSize: 22, borderRadius: 16, boxShadow: '2px 2px 0 var(--ink)' }} aria-hidden>
            {section.emoji}
          </span>
          <div style={{ minWidth: 0 }}>
            <div className="eyebrow">{section.code}</div>
            <h3 style={{ fontSize: 21 }}>{section.name}</h3>
          </div>
          <span className="spacer" />
          <strong className="tabular" style={{ fontSize: 20 }}>
            {section.score} / {section.maxScore}
          </strong>
          <span className="tabular muted">{section.percentage}%</span>
          <SectionStatusPill status={section.status} />
          <span aria-hidden style={{ fontSize: 18, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>
            ⌄
          </span>
        </div>
        <div style={{ marginTop: 12 }}>
          <Bar percentage={section.percentage} status={section.status} height={8} />
        </div>
      </button>
      {open && (
        <div className="stack-lg" style={{ padding: '0 22px 22px' }}>
          <div className="row small" style={{ gap: 8, flexWrap: 'wrap' }}>
            <ConfidenceTag level={section.confidence} />
            <span className="muted">{section.confidenceReason}</span>
          </div>

          <div className="card card-flat card-green card-tight stack">
            <div className="eyebrow">🌟 What went well</div>
            {section.strengths.length ? (
              section.strengths.map((f) => <FindingBlock key={f.id} f={f} onJump={onJump} />)
            ) : (
              <p className="small muted">No behaviours in this section were observed in the transcript — this is a fresh opportunity to grow 🌱</p>
            )}
          </div>

          <div className="card card-flat card-pink card-tight stack">
            <div className="eyebrow">⚠️ What was missed</div>
            {section.gaps.length ? (
              section.gaps.map((f) => <FindingBlock key={f.id} f={f} onJump={onJump} />)
            ) : (
              <p className="small muted">Nothing missed here. Beautiful work! 🎉</p>
            )}
            {section.notApplicable.length > 0 && (
              <div className="tiny faint">
                Not applicable in this call: {section.notApplicable.join(' · ')}
              </div>
            )}
          </div>

          <div className="grid grid-2">
            <div className="card card-flat card-yellow card-tight">
              <div className="eyebrow">💡 Why it matters</div>
              <p style={{ marginTop: 6 }}>{section.whyItMatters}</p>
            </div>
            <div className="card card-flat card-tight" style={{ background: 'var(--sky-50)', borderColor: '#D5E3EE' }}>
              <div className="row">
                <div className="eyebrow">🎯 Coaching tip</div>
                <span className="spacer" />
                <span className="tag tag-suggest">AI suggestion</span>
              </div>
              <p style={{ marginTop: 6 }}>{section.coaching.text}</p>
              {section.coaching.suggestedPhrasing && (
                <div style={{ marginTop: 10 }}>
                  <SuggestionTag />
                  <p className="hand" style={{ fontSize: 21, lineHeight: 1.2, marginTop: 6 }}>
                    “{section.coaching.suggestedPhrasing}”
                  </p>
                </div>
              )}
              {section.coaching.playbookLine && (
                <div style={{ marginTop: 10 }}>
                  <span className="tag tag-reference">📒 ICC 秘籍 script</span>
                  <p className="small" style={{ marginTop: 6 }}>
                    {section.coaching.playbookLine}
                  </p>
                </div>
              )}
              {section.coaching.lessonId && (
                <button className="link small" style={{ marginTop: 8 }} onClick={() => navigate(`/learn?lesson=${section.coaching.lessonId}`)}>
                  📚 Open the related lesson
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
