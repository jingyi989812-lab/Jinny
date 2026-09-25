import { StandardSummaryCard } from '@/components/StandardCard';
import { standardSummary } from '@/services/cscStandard';
import { ProvisionalBanner } from '@/components/ProvisionalBanner';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFramework } from '@/config/frameworks';
import { TrendChart } from '@/components/charts/TrendChart';
import { EmptyState } from '@/components/EmptyState';
import { FilterBar, useCallFilter } from '@/components/FilterBar';
import { SourceTag, Trend } from '@/components/ui';
import {
  categoryComparison,
  categoryStats,
  filterCalls,
  kpis,
  latestMonth,
  monthlyTrend,
  monthName,
  monthOf,
  prevMonth,
  recurringIssues,
  round1,
  strongestBehaviours,
} from '@/services/analytics';
import { useT } from '@/services/i18n';
import { useStore } from '@/services/store';

export function QAInsights() {
  const t = useT();
  const { calls, frameworkId } = useStore();
  const navigate = useNavigate();
  const fw = getFramework(frameworkId);
  const [filter] = useCallFilter();
  const months = useMemo(() => [...new Set(calls.map((c) => monthOf(c.callDate)))].sort().reverse(), [calls]);
  const scopedAll = useMemo(() => filterCalls(calls, { ...filter, month: undefined }), [calls, filter]);
  const month = filter.month ?? latestMonth(scopedAll);
  const prev = prevMonth(month);
  const thisCalls = scopedAll.filter((c) => monthOf(c.callDate) === month);
  const lastCalls = scopedAll.filter((c) => monthOf(c.callDate) === prev);
  const issues = recurringIssues(thisCalls, fw);
  const issuesPrev = recurringIssues(lastCalls, fw);
  const compare = categoryComparison(scopedAll, fw, month);
  const kNow = kpis(thisCalls);
  const kPrev = kpis(lastCalls);
  const shareable = strongestBehaviours(thisCalls, fw).slice(0, 4);
  const trainNext = [...categoryStats(thisCalls, fw)].filter((c) => c.count).sort((a, b) => a.percentage - b.percentage)[0];
  const standard = useMemo(() => standardSummary(thisCalls), [thisCalls]);

  if (!calls.length) {
    return (
      <div className="page card">
        <EmptyState />
      </div>
    );
  }

  const improved = compare.filter((c) => c.direction === 'improved').sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0));
  const declined = compare.filter((c) => c.direction === 'declined').sort((a, b) => (a.delta ?? 0) - (b.delta ?? 0));
  const stable = compare.filter((c) => c.direction === 'stable');
  const hasPrev = lastCalls.length > 0;

  const insight = !hasPrev
    ? `Not enough history yet to compare ${monthName(month)} with ${monthName(prev)}.`
    : improved[0]
      ? `The team's biggest improvement in ${monthName(month)} is ${improved[0].name} (${improved[0].delta! > 0 ? '+' : ''}${improved[0].delta} pts).${declined[0] ? ` Keep an eye on ${declined[0].name}, which dipped ${Math.abs(declined[0].delta!)} pts.` : ''}`
      : declined[0]
        ? `${declined[0].name} dipped ${Math.abs(declined[0].delta!)} pts in ${monthName(month)} — a good theme for the next huddle.`
        : `Scores were steady across every ICC category in ${monthName(month)}.`;

  return (
    <div className="page">
      <div className="stack" style={{ gap: 4 }}>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 42px)' }}>🔍 {t({ en: 'What Is The Team Struggling With?', zh: '团队卡在哪里？' })}</h1>
        <p className="muted">{t({ en: 'Recurring findings aggregated automatically from every evaluated call.', zh: '从每一通已评估的通话自动汇总出来的重复问题。' })}</p>
      </div>

      <ProvisionalBanner />
      <FilterBar show={['staff', 'month', 'outlet']} months={months} />

      <div className="split">
        <div className="card">
          <div className="card-head">
            <div>
              <h2>🧱 Top Recurring Issues</h2>
              <div className="sub">
                {monthName(month)} · {thisCalls.length} calls · {fw.frameworkName}
              </div>
            </div>
          </div>
          {issues.length ? (
            <div className="stack">
              {issues.slice(0, 7).map((i, idx) => {
                const before = issuesPrev.find((p) => p.behaviourId === i.behaviourId);
                return (
                  <button
                    key={i.behaviourId}
                    className="card card-flat card-tight lift"
                    style={{ textAlign: 'left', cursor: 'pointer', background: idx < 3 ? 'var(--pink-50)' : '#fff' }}
                    onClick={() => navigate(`/calls?month=${month}&issue=${i.behaviourId}`)}
                  >
                    <div className="row" style={{ alignItems: 'flex-start', gap: 12 }}>
                      <span className="hand" style={{ fontSize: 34, lineHeight: 0.9 }}>
                        {idx + 1}.
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <strong>
                          {i.emoji} {i.title}
                        </strong>
                        <div className="small muted">{i.whyItMatters}</div>
                        <div className="row-wrap small" style={{ marginTop: 6 }}>
                          <span className="tag">{i.sectionName}</span>
                          {i.lessonId && (
                            <span
                              className="link small"
                              role="link"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/learn?lesson=${i.lessonId}`);
                              }}
                            >
                              📚 Train this
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div className="kpi-value" style={{ fontSize: 28, marginTop: 0 }}>
                          {i.count}
                        </div>
                        <div className="tiny muted">cases · {i.share}%</div>
                        {hasPrev && <Trend delta={before ? i.count - before.count : null} suffix="" invert />}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="muted">No recurring issues in this period 🎉</p>
          )}
        </div>

        <div className="stack-lg">
          <StandardSummaryCard summary={standard} monthLabel={monthName(month)} />


          <div className="card card-ink">
            <div className="eyebrow" style={{ color: 'var(--yellow)' }}>
              ✨ Auto-generated insight
            </div>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: 23, lineHeight: 1.3, marginTop: 8 }}>{insight}</p>
            <p className="tiny muted" style={{ marginTop: 8 }}>
              Calculated from category averages — not an AI opinion.
            </p>
          </div>

          <div className="card">
            <div className="card-head">
              <div>
                <h2>📆 This Month vs Last Month</h2>
                <div className="sub">
                  {monthName(month)} vs {monthName(prev)}
                </div>
              </div>
            </div>
            <div className="row" style={{ gap: 18, flexWrap: 'wrap' }}>
              <div>
                <div className="eyebrow">Average score</div>
                <div className="row" style={{ gap: 10, alignItems: 'baseline' }}>
                  <span className="kpi-value" style={{ fontSize: 28, color: 'var(--ink-3)' }}>
                    {hasPrev ? `${kPrev.average}%` : '—'}
                  </span>
                  <span aria-hidden>→</span>
                  <span className="kpi-value" style={{ fontSize: 36 }}>
                    {kNow.average}%
                  </span>
                </div>
                <Trend delta={hasPrev ? round1(kNow.average - kPrev.average) : null} suffix=" pts" />
              </div>
            </div>
            <hr className="divider" style={{ margin: '14px 0' }} />
            {[
              ['📈 Improved', improved, 'pill-good'],
              ['📉 Declined', declined, 'pill-serious'],
              ['➖ Stable', stable, 'pill-neutral'],
            ].map(([label, list, cls]) => (
              <div key={label as string} className="row-wrap" style={{ marginBottom: 8, gap: 6 }}>
                <strong style={{ minWidth: 100 }}>{label as string}:</strong>
                {(list as typeof compare).length ? (
                  (list as typeof compare).map((c) => (
                    <span key={c.sectionId} className={`pill ${cls as string}`}>
                      {c.emoji} {c.name} {c.delta !== null && c.delta !== 0 ? `${c.delta > 0 ? '+' : ''}${c.delta}` : ''}
                    </span>
                  ))
                ) : (
                  <span className="small faint">{hasPrev ? 'none' : 'no comparison yet'}</span>
                )}
              </div>
            ))}
          </div>

          {trainNext && (
            <div className="card card-yellow">
              <div className="eyebrow">🎓 What should we train next?</div>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: 22, marginTop: 6 }}>
                {trainNext.emoji} {trainNext.name} ({trainNext.percentage}%)
              </p>
              {trainNext.topGap && <p className="small muted">Most common gap: {trainNext.topGap.title}</p>}
              <button className="btn btn-sm btn-primary" style={{ marginTop: 10 }} onClick={() => navigate(`/learn?lesson=${trainNext.lessonId}`)}>
                📚 Open the lesson
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="split">
        <div className="card">
          <div className="card-head">
            <div>
              <h2>📈 Pass rate trend</h2>
              <div className="sub">Share of calls at or above the (placeholder) pass mark</div>
            </div>
          </div>
          <TrendChart series={[{ name: 'Pass rate', color: '#4F9A64', points: monthlyTrend(scopedAll).map((t) => ({ label: t.label, value: t.passRate, detail: `${t.count} calls` })) }]} min={0} />
        </div>
        <div className="card card-green">
          <div className="card-head">
            <div>
              <h2>💬 Strongest behaviours worth sharing</h2>
              <div className="sub">Real team strengths in {monthName(month)}</div>
            </div>
          </div>
          <div className="stack">
            {shareable.map((b) => (
              <div key={b.behaviourId} className="row card card-flat card-tight" style={{ background: '#fff' }}>
                <span aria-hidden>{b.emoji}</span>
                <strong style={{ flex: 1 }}>{b.title}</strong>
                <span className="pill pill-good">{b.share}% of calls</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div>
            <h2>📄 Reference baseline — Universal Gaps (Jun 15 team report)</h2>
            <div className="sub">Shown for context only. The live issues above are calculated from your evaluated calls.</div>
          </div>
          <span className="spacer" />
          <SourceTag source={{ document: 'CSC_Call_Template_Jun15.pdf', note: 'Universal Gaps — Entire Team' }} />
        </div>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          {[
            ['❌ Missing', 'No one mentions the 2-week promotional deadline', 'Mentioning the deadline creates urgency — the #1 booking driver'],
            ['❌ Missing', 'No one offers the free skincare gift at close', "The gift is a concrete reason to act NOW, not 'next week'"],
            ['❌ Missing', 'No specific date/time confirmed on call', "Always end with a confirmed slot — 'Consider first' = no booking"],
            ['⚠️ Weak', 'Introduction quality varies widely', 'Standardise the opener — every call should start the same way'],
          ].map(([type, what, why]) => (
            <div key={what} className="card card-flat card-tight" style={{ background: 'var(--grey-50)' }}>
              <span className="tag">{type}</span>
              <strong style={{ display: 'block', marginTop: 6 }}>{what}</strong>
              <p className="small muted" style={{ marginTop: 4 }}>
                {why}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
