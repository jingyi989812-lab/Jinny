import { ProvisionalBanner } from '@/components/ProvisionalBanner';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFramework } from '@/config/frameworks';
import { BarList } from '@/components/charts/BarList';
import { DistributionBar } from '@/components/charts/DistributionBar';
import { TrendChart } from '@/components/charts/TrendChart';
import { EmptyState } from '@/components/EmptyState';
import { FilterBar, useCallFilter } from '@/components/FilterBar';
import { KPICard } from '@/components/KPICard';
import { TeamMemberCard } from '@/components/TeamMemberCard';
import { SectionTitle } from '@/components/ui';
import {
  categoryStats,
  filterCalls,
  improvementRate,
  kpis,
  latestMonth,
  monthlyTrend,
  monthName,
  monthOf,
  prevMonth,
  recurringIssues,
  staffStats,
} from '@/services/analytics';
import { sectionBand } from '@/services/scoring';
import { useT } from '@/services/i18n';
import { useStore } from '@/services/store';

export function TeamPerformance() {
  const t = useT();
  const { calls, teamStaff, frameworkId } = useStore();
  const navigate = useNavigate();
  const fw = getFramework(frameworkId);
  const [filter] = useCallFilter();

  const months = useMemo(() => [...new Set(calls.map((c) => monthOf(c.callDate)))].sort().reverse(), [calls]);
  const teamIds = new Set(teamStaff.map((s) => s.id));
  const teamCalls = calls.filter((c) => teamIds.has(c.staffId));
  const rows = useMemo(() => filterCalls(teamCalls, filter), [teamCalls, filter]);
  const refMonth = filter.month ?? latestMonth(rows);
  const stats = useMemo(
    () => staffStats(rows.length ? teamCalls.filter((c) => !filter.staffId || c.staffId === filter.staffId) : [], teamStaff.filter((s) => !filter.staffId || s.id === filter.staffId), refMonth, frameworkId),
    [rows, teamCalls, teamStaff, filter.staffId, refMonth, frameworkId],
  );
  const k = kpis(rows);
  const cats = categoryStats(rows, fw).filter((c) => c.count);
  const sorted = [...cats].sort((a, b) => b.percentage - a.percentage);
  const trend = monthlyTrend(filterCalls(teamCalls, { ...filter, month: undefined, from: undefined, to: undefined }));
  const issues = recurringIssues(rows, fw).slice(0, 6);
  const imp = improvementRate(stats);

  if (!teamCalls.length) {
    return (
      <div className="page card">
        <EmptyState />
      </div>
    );
  }

  const go = (q: string) => navigate(`/calls?${q}`);
  const filterQs = [filter.month && `month=${filter.month}`, filter.staffId && `staff=${filter.staffId}`].filter(Boolean).join('&');

  return (
    <div className="page">
      <div className="stack" style={{ gap: 4 }}>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 42px)' }}>👩‍💼 {t({ en: 'Team Performance', zh: '团队表现' })}</h1>
        <p className="muted">{t({ en: 'How the team is doing, who is growing, and what to train next.', zh: '团队现在怎么样、谁在进步、下一步练什么。' })}</p>
      </div>

      <ProvisionalBanner />
      <FilterBar show={['staff', 'month', 'from', 'to', 'score', 'type']} months={months} />

      <div className="grid grid-6">
        <KPICard icon="📈" tint="#D8CFF2" value={`${k.average}%`} label="Average score" footnote={`${k.total} calls in view`} />
        <KPICard
          icon="😊"
          tint="#B9D6B0"
          value={`${k.passRate}%`}
          label="Pass rate"
          footnote={`vs placeholder pass mark ${fw.overallBands[0].minPercentage}%`}
          onClick={() => go(`status=pass&${filterQs}`)}
        />
        <KPICard icon="🌱" tint="#FFE08A" value={imp === null ? '—' : `${imp}%`} label="Improvement rate" footnote={`Staff improving ${monthName(refMonth)} vs ${monthName(prevMonth(refMonth))}`} />
        <KPICard icon="🎧" tint="#F6C6CC" value={k.total} label="Total calls" onClick={() => go(filterQs)} />
        <KPICard icon={sorted[0]?.emoji ?? '🌟'} tint="#EDF5EA" value={sorted[0] ? `${sorted[0].percentage}%` : '—'} label={`🌟 Strongest · ${sorted[0]?.name ?? '—'}`} />
        <KPICard
          icon={sorted[sorted.length - 1]?.emoji ?? '🎯'}
          tint="#FDEEF0"
          value={sorted.length ? `${sorted[sorted.length - 1].percentage}%` : '—'}
          label={`🎯 Focus area · ${sorted[sorted.length - 1]?.name ?? '—'}`}
          onClick={() => sorted.length && go(`section=${sorted[sorted.length - 1].sectionId}&${filterQs}`)}
        />
      </div>

      <div className="split">
        <div className="card">
          <div className="card-head">
            <div>
              <h2>📈 Score trend by month</h2>
              <div className="sub">Team average (final scores, including QA overrides)</div>
            </div>
          </div>
          <TrendChart
            series={[{ name: 'Team average', color: '#2A2630', points: trend.map((t) => ({ label: t.label, value: t.average, detail: `${t.count} calls · ${t.passRate}% pass` })) }]}
            reference={{ value: fw.overallBands[0].minPercentage, label: `Pass mark (placeholder) ${fw.overallBands[0].minPercentage}%` }}
          />
        </div>
        <div className="card">
          <div className="card-head">
            <div>
              <h2>🍩 Result distribution</h2>
              <div className="sub">Tap a segment to see those calls</div>
            </div>
          </div>
          <DistributionBar
            segments={[
              { key: 'pass', label: 'Pass', emoji: '😊', count: k.pass, color: '#4F9A64', onClick: () => go(`status=pass&${filterQs}`) },
              { key: 'ni', label: 'Needs Improvement', emoji: '😐', count: k.needsImprovement, color: '#E2A23A', onClick: () => go(`status=needs_improvement&${filterQs}`) },
              { key: 'fail', label: 'Needs Practice', emoji: '😟', count: k.fail, color: '#D35C6E', onClick: () => go(`status=fail&${filterQs}`) },
            ]}
          />
          <hr className="divider" style={{ margin: '18px 0' }} />
          <div className="card-head" style={{ marginBottom: 8 }}>
            <h3>👩‍💼 Score by staff</h3>
          </div>
          <BarList
            items={stats
              .filter((s) => s.count)
              .sort((a, b) => (b.thisMonth ?? b.average) - (a.thisMonth ?? a.average))
              .map((s) => {
                const v = s.thisMonth ?? s.average;
                return {
                  key: s.staff.id,
                  label: `${s.motivation.emoji} ${s.staff.name}`,
                  value: v,
                  display: `${v}%`,
                  status: sectionBand(fw, v).status,
                  onClick: () => navigate(`/team/${s.staff.id}`),
                };
              })}
          />
          <p className="tiny faint" style={{ marginTop: 6 }}>
            {monthName(refMonth)} averages · ordered for readability, not ranking — everyone's growth path is different.
          </p>
        </div>
      </div>

      <SectionTitle title="🌱 Staff development" note="tap a person" />
      <div className="grid grid-2">
        {stats.map((s) => (
          <TeamMemberCard key={s.staff.id} stat={s} vs={monthName(prevMonth(refMonth))} onClick={() => navigate(`/team/${s.staff.id}`)} />
        ))}
      </div>

      <div className="split">
        <div className="card">
          <div className="card-head">
            <div>
              <h2>🧩 Category performance</h2>
              <div className="sub">
                {fw.frameworkName} · tap to see calls below 70% in that category
              </div>
            </div>
          </div>
          <BarList
            items={categoryStats(rows, fw).map((c) => ({
              key: c.sectionId,
              label: `${c.emoji} ${c.name}`,
              value: c.percentage,
              display: `${c.averageScore}/${c.maxScore} · ${c.percentage}%`,
              status: c.status,
              onClick: () => go(`section=${c.sectionId}&${filterQs}`),
            }))}
          />
        </div>
        <div className="card">
          <div className="card-head">
            <div>
              <h2>🎯 Most common gaps</h2>
              <div className="sub">Share of calls where each behaviour was missing</div>
            </div>
          </div>
          <BarList
            items={issues.map((i) => ({
              key: i.behaviourId,
              label: `${i.emoji} ${i.title}`,
              value: i.share,
              display: `${i.count} · ${i.share}%`,
              status: i.share >= 40 ? 'needs_improvement' : i.share >= 20 ? 'developing' : 'strong',
              onClick: () => go(`issue=${i.behaviourId}&${filterQs}`),
            }))}
          />
        </div>
      </div>

      <div className="card card-yellow">
        <div className="card-head">
          <div>
            <h2>🧭 Who could use coaching support?</h2>
            <div className="sub">Framed as a focus area for each person — never a ranking</div>
          </div>
        </div>
        <div className="grid grid-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
          {stats
            .filter((s) => s.focusSection)
            .map((s) => (
              <button key={s.staff.id} className="card card-flat card-tight lift" style={{ textAlign: 'left', cursor: 'pointer', background: '#fff' }} onClick={() => navigate(`/team/${s.staff.id}`)}>
                <strong>{s.staff.name}</strong>
                <div className="small" style={{ marginTop: 4 }}>
                  Suggested focus: <strong>{s.focusSection!.emoji} {s.focusSection!.name}</strong> ({s.focusSection!.percentage}%)
                </div>
                <div className="small muted">Keep celebrating: {s.strongestSection?.emoji} {s.strongestSection?.name}</div>
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}
