import { useMemo, useState } from 'react';
import { CallCards, CallTable } from '@/components/CallList';
import { EmptyState } from '@/components/EmptyState';
import { FilterBar, useCallFilter } from '@/components/FilterBar';
import { ChipToggle } from '@/components/ui';
import { filterCalls, kpis, monthOf } from '@/services/analytics';
import { useT } from '@/services/i18n';
import { useStore } from '@/services/store';

export function CallRecords() {
  const t = useT();
  const { calls, role, viewAsStaffId, staff } = useStore();
  const [filter] = useCallFilter();
  const [view, setView] = useState<'table' | 'cards'>(() => (window.innerWidth < 720 ? 'cards' : 'table'));
  const [limit, setLimit] = useState(40);

  // Staff see their own calls only (simulated role-based visibility).
  const visible = role === 'staff' ? calls.filter((c) => c.staffId === viewAsStaffId) : calls;
  const months = useMemo(() => [...new Set(calls.map((c) => monthOf(c.callDate)))].sort().reverse(), [calls]);
  const rows = useMemo(() => filterCalls(visible, filter), [visible, filter]);
  const k = kpis(rows);
  const me = staff.find((s) => s.id === viewAsStaffId);

  return (
    <div className="page">
      <div className="row-wrap">
        <div className="stack" style={{ gap: 4 }}>
          <h1 style={{ fontSize: 'clamp(28px, 4vw, 42px)' }}>📞 {t({ en: 'Call Records', zh: '通话记录' })}</h1>
          <p className="muted">{t({ en: 'Your searchable call library — every card opens the full coaching report.', zh: '可搜索的通话库 — 点任何一通，看完整的辅导报告。' })}</p>
        </div>
        <span className="spacer" />
        <ChipToggle
          value={view}
          onChange={setView}
          options={[
            { value: 'table', label: '🧾 Table' },
            { value: 'cards', label: '🃏 Cards' },
          ]}
        />
      </div>

      {role === 'staff' && me && (
        <div className="card card-yellow card-tight small">👀 Staff view — showing only {me.name}'s calls. Change who you are in My Growth.</div>
      )}

      <FilterBar show={['search', 'staff', 'month', 'from', 'to', 'score', 'status', 'type', 'section', 'outlet', 'issue', 'focusMissing']} months={months} />

      <div className="row-wrap small">
        <strong className="tabular">{rows.length} calls</strong>
        {rows.length > 0 && (
          <>
            <span className="muted">· average {k.average}%</span>
            <span className="muted">
              · 😊 {k.pass} · 😐 {k.needsImprovement} · 😟 {k.fail}
            </span>
          </>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="card">
          {visible.length === 0 ? (
            <EmptyState />
          ) : (
            <EmptyState title="No calls match these filters." message="Try clearing a filter or widening the date range." action={null} />
          )}
        </div>
      ) : view === 'table' ? (
        <CallTable calls={rows.slice(0, limit)} />
      ) : (
        <CallCards calls={rows.slice(0, limit)} />
      )}
      {rows.length > limit && (
        <div className="center">
          <button className="btn" onClick={() => setLimit((l) => l + 40)}>
            Show more ({rows.length - limit} left)
          </button>
        </div>
      )}
    </div>
  );
}
