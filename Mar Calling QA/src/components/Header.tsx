import { useNavigate } from 'react-router-dom';
import { LangToggle, useT } from '@/services/i18n';
import { ROLE_META } from '@/services/privacy';
import { useStore } from '@/services/store';
import type { UserRole } from '@/types/staff';

export function MobileBar({ onMenu }: { onMenu: () => void }) {
  return (
    <div className="mobile-bar">
      <button className="btn btn-sm" onClick={onMenu} aria-label="Open menu">
        ☰
      </button>
      <strong style={{ fontFamily: 'var(--font-display)' }}>MARCOM Calling QA</strong>
    </div>
  );
}

export function Header() {
  const { role, setRole, canRevealLeads, revealLeads, setRevealLeads } = useStore();
  const t = useT();
  const navigate = useNavigate();
  return (
    <div className="topbar no-print">
      <LangToggle />
      <span className="internal-chip">🔒 {t({ en: 'Internal use only', zh: '仅供内部使用' })}</span>
      <span className="spacer" />
      {canRevealLeads && (
        <label className="row small" style={{ gap: 6, fontWeight: 700, cursor: 'pointer' }} title="Authorised QA users may reveal full lead numbers">
          <input type="checkbox" checked={revealLeads} onChange={(e) => setRevealLeads(e.target.checked)} />
          {t({ en: 'Show full details', zh: '显示完整资料' })}
        </label>
      )}
      <div className="role-switch" title="Simulated role — real authentication is coming soon">
        <span aria-hidden>{ROLE_META[role].emoji}</span>
        <label className="sr-only" htmlFor="role">
          Viewing as
        </label>
        <select id="role" value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
          {(Object.keys(ROLE_META) as UserRole[]).map((r) => (
            <option key={r} value={r}>
              {ROLE_META[r].label}
            </option>
          ))}
        </select>
      </div>
      <button className="btn btn-primary btn-sm hide-mobile" onClick={() => navigate("/evaluate")}>
        ✨ Analyse a call
      </button>
    </div>
  );
}
