import type { RoleModelComparison } from '@/types/qa';
import { EvidenceCard } from './EvidenceCard';

export function RoleModelCard({ item, onJump }: { item: RoleModelComparison; onJump: (i: number) => void }) {
  return (
    <div className="card card-flat" style={{ padding: 18 }}>
      <div className="row-wrap" style={{ marginBottom: 12 }}>
        <strong>{item.sectionName}</strong>
        <span className="spacer" />
        {item.idealKind === 'reference' ? <span className="tag tag-reference">📄 Reference role-model line</span> : <span className="tag tag-suggest">💡 Suggested phrasing</span>}
      </div>
      <div className="grid grid-2" style={{ alignItems: 'stretch' }}>
        <div className="card card-flat card-tight" style={{ background: 'var(--grey-50)' }}>
          <div className="eyebrow">Current approach</div>
          <div style={{ marginTop: 8 }}>
            <EvidenceCard evidence={item.current} onJump={onJump} />
          </div>
          <p className="small muted" style={{ marginTop: 8 }}>
            {item.currentSummary}
          </p>
        </div>
        <div className="card card-flat card-tight card-green" style={{ position: 'relative' }}>
          <div className="eyebrow">Ideal approach</div>
          <p style={{ marginTop: 8, fontSize: 16, lineHeight: 1.6, fontWeight: 600 }}>“{item.ideal}”</p>
          {item.idealGlossEn && (
            <p className="small muted" style={{ marginTop: 6 }}>
              <em>English gloss (unofficial):</em> {item.idealGlossEn}
            </p>
          )}
          <p className="tiny faint" style={{ marginTop: 8 }}>
            {item.idealAttribution}
          </p>
        </div>
      </div>
      <div className="row" style={{ marginTop: 12, gap: 8, alignItems: 'flex-start' }}>
        <span className="sticker">Why this works</span>
        <p className="small" style={{ paddingTop: 4 }}>
          {item.whyItWorks}
        </p>
      </div>
    </div>
  );
}
