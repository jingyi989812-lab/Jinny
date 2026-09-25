import { useState } from 'react';
import { ACHIEVEMENTS } from '@/services/achievements';
import type { AchievementId } from '@/types/staff';
import { Medal } from './illustrations';
import { Modal } from './ui';

/** Badge with a click-to-explain modal showing the earning rule and evidence. */
export function AchievementBadge({ id, count, reason, locked }: { id: AchievementId; count?: number; reason?: string; locked?: boolean }) {
  const [open, setOpen] = useState(false);
  const def = ACHIEVEMENTS[id];
  return (
    <>
      <button className={`badge ${locked ? 'locked' : ''}`} onClick={() => setOpen(true)} aria-label={`${def.title} badge${locked ? ' (not yet earned)' : ''}`}>
        <Medal tint={def.tint} emoji={def.emoji} locked={locked} size={70} />
        <span className="badge-title">{def.title}</span>
        {count && count > 1 ? <span className="tiny muted">×{count}</span> : <span className="tiny muted">{locked ? 'Not yet' : 'Earned'}</span>}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={`${def.emoji} ${def.title}`}>
        <div className="stack">
          <p>{def.description}</p>
          <div className="card card-flat card-yellow card-tight">
            <div className="eyebrow">How it's earned</div>
            <p style={{ marginTop: 4 }}>{def.rule}</p>
          </div>
          {reason && !locked && (
            <p className="small muted">
              ✅ Latest: {reason}
              {count ? ` · earned ${count} time${count > 1 ? 's' : ''}` : ''}
            </p>
          )}
          {locked && <p className="small muted">🌱 Not earned yet — it unlocks automatically from real QA results.</p>}
          <p className="tiny faint">Badges are calculated from evaluated calls only. Nothing is awarded at random.</p>
        </div>
      </Modal>
    </>
  );
}
