import { NavLink } from 'react-router-dom';
import { BRAND } from '@/config/organisation';
import { useT } from '@/services/i18n';
import { useStore } from '@/services/store';

import type { RoleCapabilities } from '@/services/privacy';

interface NavItem {
  to: string;
  label: { en: string; zh: string };
  icon: string;
  end?: boolean;
  /** Only shown when the role has this capability. */
  can?: keyof RoleCapabilities;
  /** A consultant sees "My Calls"; QA sees the whole library. */
  staffLabel?: boolean;
}

export const NAV: NavItem[] = [
  { to: '/', label: { en: 'Home', zh: '首页' }, icon: '🏠', end: true },
  { to: '/evaluate', label: { en: 'Upload & Evaluate', zh: '上传分析' }, icon: '🎧', can: 'canReview' },
  { to: '/calls', label: { en: 'My Calls', zh: '我的通话' }, icon: '📞', staffLabel: true },
  { to: '/team', label: { en: 'Team Performance', zh: '团队表现' }, icon: '👩‍💼', can: 'canSeeTeam' },
  { to: '/insights', label: { en: 'QA Insights', zh: 'QA 洞察' }, icon: '🔍', can: 'canSeeTeam' },
  { to: '/learn', label: { en: 'Learning Hub', zh: '学习中心' }, icon: '📚' },
  { to: '/growth', label: { en: 'My Growth', zh: '我的成长' }, icon: '🏆' },
  { to: '/settings', label: { en: 'Settings', zh: '设置' }, icon: '⚙️', can: 'canSeeInternals' },
];

export function Sidebar({
  open,
  onNavigate,
  collapsed,
  expanded,
  isTablet,
  onToggle,
}: {
  /** Mobile drawer open. */
  open: boolean;
  onNavigate: () => void;
  /** Desktop: user collapsed the panel to an icon rail. */
  collapsed: boolean;
  /** Tablet: user popped the full panel out over the page. */
  expanded: boolean;
  isTablet: boolean;
  onToggle: () => void;
}) {
  const t = useT();
  const { can } = useStore();
  const items = NAV.filter((n) => !n.can || can[n.can]);
  const showingFull = isTablet ? expanded : !collapsed;
  return (
    <>
      <div className={`drawer-backdrop ${open || expanded ? 'open' : ''}`} onClick={onNavigate} />
      <aside className={`sidebar ${open ? 'open' : ''} ${collapsed ? 'collapsed' : ''} ${expanded ? 'expanded' : ''}`} aria-label="Main navigation">
        <div className="sidebar-top">
          <NavLink to="/" className="brand" onClick={onNavigate} title="Home">
            <span className="brand-mark" aria-hidden>
              🎧
            </span>
            <span className="brand-text">
              <strong>{BRAND.name}</strong>
              <span>{BRAND.product}</span>
            </span>
          </NavLink>
          <button
            className="sidebar-toggle"
            onClick={onToggle}
            aria-expanded={showingFull}
            aria-label={showingFull ? 'Collapse menu' : 'Expand menu'}
            title={`${showingFull ? 'Collapse' : 'Expand'} menu  ( [ )`}
          >
            <span className="sidebar-toggle-icon" aria-hidden />
          </button>
        </div>
        <nav className="nav">
          {items.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} onClick={onNavigate} title={t(n.label)}>
              <span className="nav-icon" aria-hidden>
                {n.icon}
              </span>
              <span className="nav-label">{n.staffLabel && can.canSeeOtherCalls ? t({ en: 'Call Records', zh: '通话记录' }) : t(n.label)}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="sidebar-note">
            {t({ en: 'Small improvements make a BIG difference ✨', zh: '小小的进步，累积成大大的不同 ✨' })}
          </div>
          <div className="tiny faint hide-tablet" style={{ padding: '0 8px' }}>
            🔒 {t({ en: 'Internal use only · v0.1 prototype', zh: '仅供内部使用 · v0.1 原型' })}
          </div>
        </div>
      </aside>
    </>
  );
}
