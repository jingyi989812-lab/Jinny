import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getFramework } from '@/config/frameworks';
import { OUTLETS } from '@/config/organisation';
import { CAMPAIGN_FOCUS } from '@/config/strategyFocus';
import { monthLabel, type CallFilter } from '@/services/analytics';
import { useStore } from '@/services/store';
import type { OverallStatus } from '@/types/framework';

export type FilterKey = 'search' | 'staff' | 'month' | 'from' | 'to' | 'score' | 'status' | 'section' | 'outlet' | 'issue' | 'type' | 'focusMissing';

/** Filters live in the URL, so every chart click can deep-link to a filtered view. */
export function useCallFilter(): [CallFilter, (patch: Partial<Record<FilterKey, string>>) => void, URLSearchParams] {
  const [params, setParams] = useSearchParams();
  const filter = useMemo<CallFilter>(() => {
    const score = params.get('score');
    const [min, max] = score ? score.split('-').map(Number) : [undefined, undefined];
    return {
      search: params.get('search') ?? undefined,
      staffId: params.get('staff') ?? undefined,
      month: params.get('month') ?? undefined,
      from: params.get('from') ?? undefined,
      to: params.get('to') ?? undefined,
      minScore: min,
      maxScore: max,
      status: (params.get('status') as OverallStatus) ?? undefined,
      sectionId: params.get('section') ?? undefined,
      outlet: params.get('outlet') ?? undefined,
      issue: params.get('issue') ?? undefined,
      focusMissing: params.get('focusMissing') ?? undefined,
      callType: params.get('type') ?? undefined,
    };
  }, [params]);
  const update = (patch: Partial<Record<FilterKey, string>>) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next, { replace: true });
  };
  return [filter, update, params];
}

export function FilterBar({ show, months }: { show: FilterKey[]; months: string[] }) {
  const { teamStaff, staff, frameworkId } = useStore();
  const [, update, params] = useCallFilter();
  const fw = getFramework(frameworkId);
  const has = (k: FilterKey) => show.includes(k);
  const active = show.some((k) => params.get(k));
  const issueLabel = params.get('issue');
  const focusMissing = params.get('focusMissing');
  const focusKeyword = CAMPAIGN_FOCUS.keywords.find((k) => k.id === focusMissing);

  return (
    <div className="card card-tight" style={{ boxShadow: 'var(--shadow-sm)' }}>
      <div className="row-wrap" style={{ gap: 10 }}>
        {has('search') && (
          <input
            className="input"
            style={{ flex: '2 1 220px' }}
            placeholder="🔎 Search staff name, lead number or call ID"
            value={params.get('search') ?? ''}
            onChange={(e) => update({ search: e.target.value })}
            aria-label="Search calls"
          />
        )}
        {has('staff') && (
          <select className="select" style={{ flex: '1 1 150px' }} value={params.get('staff') ?? ''} onChange={(e) => update({ staff: e.target.value })} aria-label="Staff">
            <option value="">👩‍💼 All staff</option>
            {(show.includes('search') ? staff : teamStaff).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}
        {has('month') && (
          <select className="select" style={{ flex: '1 1 140px' }} value={params.get('month') ?? ''} onChange={(e) => update({ month: e.target.value, from: '', to: '' })} aria-label="Month">
            <option value="">📅 All months</option>
            {months.map((m) => (
              <option key={m} value={m}>
                {monthLabel(m, 'long')}
              </option>
            ))}
          </select>
        )}
        {has('from') && (
          <input className="input" type="date" style={{ flex: '1 1 140px' }} value={params.get('from') ?? ''} onChange={(e) => update({ from: e.target.value, month: '' })} aria-label="From date" />
        )}
        {has('to') && (
          <input className="input" type="date" style={{ flex: '1 1 140px' }} value={params.get('to') ?? ''} onChange={(e) => update({ to: e.target.value, month: '' })} aria-label="To date" />
        )}
        {has('score') && (
          <select className="select" style={{ flex: '1 1 140px' }} value={params.get('score') ?? ''} onChange={(e) => update({ score: e.target.value })} aria-label="Score range">
            <option value="">🎯 Any score</option>
            <option value="90-100">90–100%</option>
            <option value="75-89">75–89%</option>
            <option value="60-74">60–74%</option>
            <option value="0-59">Below 60%</option>
          </select>
        )}
        {has('status') && (
          <select className="select" style={{ flex: '1 1 150px' }} value={params.get('status') ?? ''} onChange={(e) => update({ status: e.target.value })} aria-label="Status">
            <option value="">✅ Any status</option>
            <option value="pass">😊 Pass</option>
            <option value="needs_improvement">😐 Needs Improvement</option>
            <option value="fail">😟 Needs Practice (Fail)</option>
          </select>
        )}
        {has('section') && (
          <select className="select" style={{ flex: '1 1 170px' }} value={params.get('section') ?? ''} onChange={(e) => update({ section: e.target.value })} aria-label="Category below 70%">
            <option value="">🧩 Any category</option>
            {fw.sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.emoji} {s.name} below 70%
              </option>
            ))}
          </select>
        )}
        {has('type') && (
          <select className="select" style={{ flex: '1 1 150px' }} value={params.get('type') ?? ''} onChange={(e) => update({ type: e.target.value })} aria-label="Call type">
            <option value="">📞 Any call type</option>
            {fw.callTypeProfiles.map((p) => (
              <option key={p.callType} value={p.callType}>
                {p.emoji} {p.label}
              </option>
            ))}
          </select>
        )}
        {has('outlet') && (
          <select className="select" style={{ flex: '1 1 140px' }} value={params.get('outlet') ?? ''} onChange={(e) => update({ outlet: e.target.value })} aria-label="Outlet">
            <option value="">🏥 All outlets</option>
            {OUTLETS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        )}
        {active && (
          <button className="btn btn-ghost btn-sm" onClick={() => update(Object.fromEntries(show.map((k) => [k, ''])))}>
            ✕ Clear filters
          </button>
        )}
      </div>
      {focusKeyword && (
        <div className="row-wrap small" style={{ marginTop: 10 }}>
          <span className="pill pill-lilac">
            🎯 Campaign focus missing: {focusKeyword.emoji} {focusKeyword.label}
          </span>
          <button className="link small" onClick={() => update({ focusMissing: '' })}>
            clear
          </button>
        </div>
      )}
      {issueLabel && (
        <div className="row small" style={{ marginTop: 10 }}>
          <span className="pill pill-serious">
            Showing calls with issue: {fw.sections.flatMap((s) => s.behaviours).find((b) => b.id === issueLabel)?.gapTitle ?? issueLabel}
          </span>
          <button className="link small" onClick={() => update({ issue: '' })}>
            remove
          </button>
        </div>
      )}
    </div>
  );
}
