import { ProvisionalBanner } from '@/components/ProvisionalBanner';
import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getFramework } from '@/config/frameworks';
import { AchievementBadge } from '@/components/AchievementBadge';
import { RecentCallsList } from '@/components/CallList';
import { BarList } from '@/components/charts/BarList';
import { TrendChart } from '@/components/charts/TrendChart';
import { EmptyState } from '@/components/EmptyState';
import { Avatar, PlantGrowth, Sparkle } from '@/components/illustrations';
import { Trend } from '@/components/ui';
import { ACHIEVEMENTS, staffBadges } from '@/services/achievements';
import { growthSummary, kpis, monthlyTrend } from '@/services/analytics';
import { sectionBand } from '@/services/scoring';
import { useStore } from '@/services/store';
import type { AchievementId } from '@/types/staff';

export function MyGrowth() {
  const { staffId: routeStaff } = useParams();
  const store = useStore();
  const navigate = useNavigate();
  const fw = getFramework(store.frameworkId);
  const remembered = store.staff.find((s) => s.id === store.viewAsStaffId) ?? store.teamStaff[0] ?? store.staff[0];
  const staffId = routeStaff ?? remembered?.id ?? '';
  const person = store.staff.find((s) => s.id === staffId);
  const isTeamView = Boolean(routeStaff);

  const mine = useMemo(() => store.calls.filter((c) => c.staffId === staffId), [store.calls, staffId]);
  const g = useMemo(() => growthSummary(store.calls, staffId, fw), [store.calls, staffId, fw]);
  const badges = useMemo(() => staffBadges(store.calls, staffId), [store.calls, staffId]);
  const trend = monthlyTrend(mine);
  const teamTrend = monthlyTrend(store.calls.filter((c) => store.teamStaff.some((s) => s.id === c.staffId)));

  if (!person) {
    return (
      <div className="page card">
        <EmptyState title="We couldn't find that person." message="Pick someone from Team Performance." action="👩‍💼 Team Performance" to="/team" />
      </div>
    );
  }

  const earned = new Set(badges.map((b) => b.definition.id));
  const k = kpis(mine);
  const level = g.delta === null ? 2 : g.delta > 0 ? 3 : g.delta === 0 ? 2 : 1;

  return (
    <div className="page">
      {isTeamView ? (
        <Link to="/team" className="link small">
          ← Team Performance
        </Link>
      ) : (
        <div className="row-wrap">
          <span className="small muted">Viewing growth for</span>
          <select className="select" style={{ width: 'auto' }} value={staffId} onChange={(e) => store.setViewAsStaffId(e.target.value)} aria-label="Choose staff member">
            {store.staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <span className="tiny faint">(sign-in coming soon — this will be automatic)</span>
        </div>
      )}

      <ProvisionalBanner />
      <section className="hero" style={{ gridTemplateColumns: 'minmax(0, 1fr) auto' }}>
        <div className="stack">
          <div className="row" style={{ gap: 14 }}>
            <Avatar style={person.avatar} size={84} title={person.name} />
            <div>
              <span className="pill pill-ink">🏆 {isTeamView ? 'STAFF GROWTH' : 'MY GROWTH'}</span>
              <h1 style={{ fontSize: 'clamp(30px, 4.5vw, 50px)', marginTop: 8 }}>{person.name}</h1>
              <div className="muted small">
                {person.role} · {person.outlet} · {k.total} evaluated calls
              </div>
            </div>
          </div>
          {person.motto && <p className="hand" style={{ fontSize: 26, color: 'var(--ink-2)' }}>“{person.motto}”</p>}
        </div>
        <div className="float hide-mobile">
          <PlantGrowth size={170} level={level} />
        </div>
      </section>

      {!mine.length ? (
        <div className="card">
          <EmptyState title="No evaluated calls yet." message="Once a call is evaluated, your growth story starts here 🌱" />
        </div>
      ) : (
        <>
          <div className="grid grid-3">
            <div className="card center">
              <div className="eyebrow">Previous · {g.previousLabel}</div>
              <div className="kpi-value" style={{ color: 'var(--ink-3)' }}>
                {g.previous !== null ? `${Math.round(g.previous)}%` : '—'}
              </div>
            </div>
            <div className="card center card-yellow" style={{ position: 'relative' }}>
              <div className="eyebrow">Current · {g.currentLabel}</div>
              <div className="kpi-value" style={{ fontSize: 52 }}>
                {g.current !== null ? `${Math.round(g.current)}%` : '—'}
              </div>
              <Sparkle size={28} style={{ position: 'absolute', right: 16, top: 14 }} className="twinkle" />
            </div>
            <div className={`card center ${g.delta !== null && g.delta >= 0 ? 'card-green' : 'card-pink'}`}>
              <div className="eyebrow">Improvement</div>
              <div className="kpi-value">{g.delta === null ? '—' : `${g.delta > 0 ? '+' : ''}${g.delta}`}</div>
              <div className="small muted">{g.delta === null ? 'Needs two months of calls' : g.delta >= 0 ? 'points — lovely progress!' : 'points — a small dip, totally normal 💛'}</div>
            </div>
          </div>

          <div className="split">
            <div className="card">
              <div className="card-head">
                <div>
                  <h2>📈 Your score journey</h2>
                  <div className="sub">Monthly average vs team average</div>
                </div>
              </div>
              <TrendChart
                series={[
                  { name: person.name, color: '#D35C6E', points: trend.map((t) => ({ label: t.label, value: t.average, detail: `${t.count} calls` })) },
                  {
                    name: 'Team average',
                    color: '#928B97',
                    dashed: true,
                    points: trend.map((t) => ({ label: t.label, value: teamTrend.find((x) => x.month === t.month)?.average ?? null })),
                  },
                ]}
              />
            </div>
            <div className="stack-lg">
              {g.biggestImprovement && (
                <div className="card card-green">
                  <div className="eyebrow">🚀 Your biggest improvement</div>
                  <p style={{ fontFamily: 'var(--font-display)', fontSize: 26, marginTop: 6 }}>
                    {g.biggestImprovement.emoji} {g.biggestImprovement.name}
                  </p>
                  <p className="small">
                    <Trend delta={g.biggestImprovement.delta} suffix=" pts" vs={g.previousLabel} /> — keep doing what's working!
                  </p>
                </div>
              )}
              {g.nextFocus && (
                <div className="card card-pink">
                  <div className="eyebrow">🎯 Your next focus</div>
                  <p style={{ fontFamily: 'var(--font-display)', fontSize: 26, marginTop: 6 }}>
                    {g.nextFocus.emoji} {g.nextFocus.name}
                  </p>
                  {g.topIssue && <p className="small">Practise: {g.topIssue.title.charAt(0).toLowerCase() + g.topIssue.title.slice(1)}.</p>}
                  <button className="btn btn-sm" style={{ marginTop: 10 }} onClick={() => navigate(`/learn?lesson=${g.nextFocus!.lessonId}`)}>
                    📚 Practise this
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <div>
                <h2>🧩 Improvement by category</h2>
                <div className="sub">
                  {g.currentLabel} vs {g.previousLabel}
                </div>
              </div>
            </div>
            <BarList
              items={g.byCategory
                .filter((c) => c.count)
                .map((c) => ({
                  key: c.sectionId,
                  label: (
                    <span className="row" style={{ gap: 8 }}>
                      {c.emoji} {c.name} <Trend delta={c.delta} suffix=" pts" />
                    </span>
                  ),
                  value: c.percentage,
                  display: `${c.percentage}%`,
                  status: sectionBand(fw, c.percentage).status,
                  onClick: () => navigate(`/calls?staff=${staffId}&section=${c.sectionId}`),
                }))}
            />
          </div>

          <div className="card card-yellow">
            <div className="card-head">
              <div>
                <h2>🏅 Achievements</h2>
                <div className="sub">Earned only from real QA results — tap any badge to see how</div>
              </div>
            </div>
            <div className="row-wrap" style={{ gap: 6, justifyContent: 'flex-start' }}>
              {(Object.keys(ACHIEVEMENTS) as AchievementId[]).map((id) => {
                const b = badges.find((x) => x.definition.id === id);
                return <AchievementBadge key={id} id={id} count={b?.count} reason={b?.latest.reason} locked={!earned.has(id)} />;
              })}
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <div>
                <h2>📞 Recent calls</h2>
              </div>
              <span className="spacer" />
              <button className="btn btn-sm" onClick={() => navigate(`/calls?staff=${staffId}`)}>
                All {person.name}'s calls →
              </button>
            </div>
            <RecentCallsList calls={mine.slice(0, 6)} />
          </div>
        </>
      )}
    </div>
  );
}
