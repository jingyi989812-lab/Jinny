import { ProvisionalBanner } from '@/components/ProvisionalBanner';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFramework } from '@/config/frameworks';
import { BRAND } from '@/config/organisation';
import { BarList } from '@/components/charts/BarList';
import { RecentCallsList } from '@/components/CallList';
import { EmptyState } from '@/components/EmptyState';
import { HeroIllustration, Heart, Sparkle, Squiggle } from '@/components/illustrations';
import { KPICard } from '@/components/KPICard';
import { TeamMemberCard } from '@/components/TeamMemberCard';
import { ChipToggle, ComingSoon, Modal, SectionTitle } from '@/components/ui';
import {
  categoryStats,
  kpis,
  latestMonth,
  monthName,
  monthOf,
  prevMonth,
  recurringIssues,
  round1,
  staffStats,
  strongestBehaviours,
} from '@/services/analytics';
import { useT } from '@/services/i18n';
import { useStore } from '@/services/store';

const MOTIVATION = [
  { quote: 'Every “I’ll think about it” is an invitation to offer two clear options.', by: 'Close tip' },
  { quote: 'Listen for the feeling behind the concern — that is where trust begins.', by: 'Discovery tip' },
  { quote: 'Name the gift, name the deadline, then name the slot.', by: 'Urgency tip' },
  { quote: 'Good people. Great conversations. Brighter results.', by: 'MARCOM QA' },
];

export function Home() {
  const store = useStore();
  const { teamStaff, frameworkId } = store;
  /* A consultant's home only ever counts their own calls. */
  const calls = store.visibleCalls;
  const t = useT();
  const navigate = useNavigate();
  const fw = getFramework(frameworkId);
  const [scope, setScope] = useState<'month' | 'all'>('month');
  const [soon, setSoon] = useState(false);

  const month = latestMonth(calls);
  const prev = prevMonth(month);
  const scoped = scope === 'month' ? calls.filter((c) => monthOf(c.callDate) === month) : calls;
  const prevScoped = calls.filter((c) => monthOf(c.callDate) === prev);
  const k = kpis(scoped);
  const kp = kpis(prevScoped);
  const cmp = scope === 'month' && prevScoped.length > 0;

  const stats = useMemo(() => staffStats(calls, teamStaff, month, frameworkId), [calls, teamStaff, month, frameworkId]);
  const cats = useMemo(() => categoryStats(scoped, fw), [scoped, fw]);
  const issues = useMemo(() => recurringIssues(scoped, fw).slice(0, 5), [scoped, fw]);
  const shareable = useMemo(() => strongestBehaviours(scoped, fw)[0], [scoped, fw]);
  const motivation = MOTIVATION[new Date().getDate() % MOTIVATION.length];

  if (!calls.length) {
    return (
      <div className="page">
        <Hero />
        <div className="card">
          <EmptyState />
        </div>
      </div>
    );
  }

  const monthWord = monthName(month);
  const prevWord = monthName(prev);
  const go = (q: string) => navigate(`/calls?${scope === 'month' ? `month=${month}&` : ''}${q}`);

  return (
    <div className="page">
      <Hero />
      <ProvisionalBanner />

      <SectionTitle title={scope === 'month' ? `${t({ en: 'This month', zh: '本月' })} · ${monthWord}` : t({ en: 'All time', zh: '全部时间' })} note={t({ en: 'numbers update from real evaluations', zh: '数字来自真实的评估结果' })}>
        <ChipToggle
          value={scope}
          onChange={setScope}
          options={[
            { value: 'month', label: `📅 ${monthWord}` },
            { value: 'all', label: `🗂️ ${t({ en: 'All time', zh: '全部' })}` },
          ]}
        />
      </SectionTitle>

      <div className="grid grid-5 kpi-row">
        <KPICard icon="🎧" tint="#FFE08A" value={k.total} label={t({ en: 'Calls Evaluated', zh: '已评估通话' })} delta={cmp ? k.total - kp.total : undefined} vs={prevWord} onClick={() => go('')} delay={0} />
        <KPICard
          icon="📈"
          tint="#D8CFF2"
          value={`${k.average}%`}
          label={t({ en: 'Average Score', zh: '平均分数' })}
          delta={cmp ? round1(k.average - kp.average) : undefined}
          deltaSuffix=" pts"
          vs={prevWord}
          onClick={() => navigate('/team')}
          delay={0.05}
        />
        <KPICard icon="😊" tint="#B9D6B0" value={k.pass} label={t({ en: 'Pass', zh: '合格' })} delta={cmp ? k.pass - kp.pass : undefined} vs={prevWord} onClick={() => go('status=pass')} delay={0.1} />
        <KPICard
          icon="😐"
          tint="#FFEFB8"
          value={k.needsImprovement}
          label="Need Improvement"
          delta={cmp ? k.needsImprovement - kp.needsImprovement : undefined}
          invertDelta
          vs={prevWord}
          onClick={() => go('status=needs_improvement')}
          delay={0.15}
        />
        <KPICard
          icon="😟"
          tint="#F6C6CC"
          value={k.fail}
          label="Needs Practice (Fail)"
          delta={cmp ? k.fail - kp.fail : undefined}
          invertDelta
          vs={prevWord}
          onClick={() => go('status=fail')}
          delay={0.2}
        />
      </div>
      <p className="tiny faint" style={{ marginTop: -16 }}>
        Pass ≥ {fw.overallBands[0].minPercentage}% · Needs Improvement ≥ {fw.overallBands[1].minPercentage}% —{' '}
        <button className="link tiny" onClick={() => navigate('/settings')}>
          placeholder thresholds, not defined in the ICC reference documents
        </button>
        . Final scores include human QA overrides.
      </p>

      <div className="split">
        {store.can.canSeeTeam && (
        <div className="card">
          <div className="card-head">
            <div>
              <h2>👩‍💼 Team Performance</h2>
              <div className="sub">{monthWord} average · tap a person to see their growth</div>
            </div>
            <span className="spacer" />
            <button className="btn btn-sm" onClick={() => navigate('/team')}>
              See team →
            </button>
          </div>
          <div className="grid grid-2">
            {stats.map((s) => (
              <TeamMemberCard key={s.staff.id} stat={s} compact vs={prevWord} onClick={() => navigate(`/team/${s.staff.id}`)} />
            ))}
          </div>
          <p className="note-hand" style={{ marginTop: 14, color: 'var(--ink-2)' }}>
            Everyone grows at their own pace 🌱 — celebrate progress, not just points.
          </p>
        </div>
        )}

        <div className="card">
          <div className="card-head">
            <div>
              <h2>🧩 ICC Category Performance</h2>
              <div className="sub">
                {fw.frameworkName} · {fw.frameworkVersion} · tap a category to see calls below 70%
              </div>
            </div>
          </div>
          <BarList
            items={cats.map((c) => ({
              key: c.sectionId,
              label: (
                <>
                  {c.emoji} {c.name} <span className="faint tiny">/{c.maxScore}</span>
                </>
              ),
              value: c.percentage,
              display: `${c.averageScore} / ${c.maxScore} · ${c.percentage}%`,
              status: c.status,
              hint: c.topGap ? `Most common gap: ${c.topGap.title}` : undefined,
              onClick: () => go(`section=${c.sectionId}`),
            }))}
          />
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div>
            <h2>🎯 Most Common Mistakes</h2>
            <div className="sub">Recurring gaps across {scope === 'month' ? monthWord : 'all'} evaluations — tap to see the calls</div>
          </div>
          <span className="spacer" />
          <button className="btn btn-sm" onClick={() => navigate('/insights')}>
            All insights →
          </button>
        </div>
        {issues.length ? (
          <div className="grid grid-5">
            {issues.map((i, idx) => (
              <button
                key={i.behaviourId}
                className="card card-tight lift"
                style={{ textAlign: 'left', cursor: 'pointer', background: idx === 0 ? 'var(--pink-50)' : 'var(--paper)' }}
                onClick={() => go(`issue=${i.behaviourId}`)}
              >
                <div className="row">
                  <span className="hand" style={{ fontSize: 30, lineHeight: 1 }}>
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <span className="spacer" />
                  <span style={{ fontSize: 24 }} aria-hidden>
                    {i.emoji}
                  </span>
                </div>
                <div style={{ fontWeight: 700, marginTop: 6, lineHeight: 1.3 }}>{i.title}</div>
                <div className="small muted" style={{ marginTop: 6 }}>
                  <strong className="tabular" style={{ color: 'var(--ink)' }}>
                    {i.count}
                  </strong>{' '}
                  cases · {i.share}% of calls
                </div>
              </button>
            ))}
          </div>
        ) : (
          <p className="muted">No recurring gaps — wonderful! 🎉</p>
        )}
      </div>

      <div className="split">
        <div className="card">
          <div className="card-head">
            <div>
              <h2>📞 Recent Calls</h2>
              <div className="sub">Latest evaluations</div>
            </div>
            <span className="spacer" />
            <button className="btn btn-sm" onClick={() => navigate('/calls')}>
              All calls →
            </button>
          </div>
          <RecentCallsList calls={calls.slice(0, 5)} />
        </div>
        <div className="stack-lg">
          <div className="card card-ink" style={{ overflow: 'hidden' }}>
            <div className="eyebrow" style={{ color: 'var(--yellow)' }}>
              ☀️ Today's Motivation
            </div>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: 24, lineHeight: 1.25, marginTop: 10 }}>“{motivation.quote}”</p>
            <p className="muted small" style={{ marginTop: 8 }}>
              — {motivation.by}
            </p>
            <Sparkle size={40} style={{ position: 'absolute', right: 18, bottom: 16 }} className="float" />
          </div>
          {shareable && (
            <div className="card card-green">
              <div className="eyebrow">💬 Worth sharing with the team</div>
              <p style={{ fontWeight: 700, marginTop: 6, fontSize: 17 }}>
                {shareable.emoji} {shareable.title}
              </p>
              <p className="small muted">
                Seen in {shareable.share}% of {scope === 'month' ? monthWord : ''} calls — a real team strength.
              </p>
            </div>
          )}
        </div>
      </div>

      <div>
        <SectionTitle title="⚡ Quick Actions" />
        <div className="grid grid-2" style={{ marginTop: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))' }}>
          {[
            { icon: '🎧', label: 'Upload Recording', sub: 'Audio upload', tint: 'var(--lilac-50)', onClick: () => setSoon(true), soon: true },
            { icon: '📝', label: 'Evaluate Transcript', sub: 'Paste or import transcripts', tint: 'var(--yellow-50)', onClick: () => navigate('/evaluate') },
            { icon: '📊', label: 'View Reports', sub: 'Call library', tint: 'var(--green-50)', onClick: () => navigate('/calls') },
            { icon: '📚', label: 'Learning Hub', sub: 'MARCOM Calling Academy', tint: 'var(--pink-50)', onClick: () => navigate('/learn') },
          ].map((a) => (
            <button key={a.label} className="card lift" onClick={a.onClick} style={{ textAlign: 'left', cursor: 'pointer', background: a.tint }}>
              <div className="row">
                <span style={{ fontSize: 34 }} aria-hidden>
                  {a.icon}
                </span>
                <span className="spacer" />
                {a.soon && <ComingSoon />}
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 650, marginTop: 8 }}>{a.label}</div>
              <div className="small muted">{a.sub}</div>
            </button>
          ))}
        </div>
      </div>

      <Modal open={soon} onClose={() => setSoon(false)} title="🎧 Upload Recording — Coming Soon">
        <div className="stack">
          <p>
            Audio upload and automatic transcription are <strong>not connected yet</strong>. For now:
          </p>
          <ol className="small" style={{ margin: 0, paddingLeft: 20, lineHeight: 1.8 }}>
            <li>Transcribe the call recording with your usual transcription tool.</li>
            <li>Copy the transcript.</li>
            <li>Paste it into Upload &amp; Evaluate.</li>
          </ol>
          <button
            className="btn btn-primary"
            onClick={() => {
              setSoon(false);
              navigate('/evaluate');
            }}
          >
            📝 Add a transcript
          </button>
        </div>
      </Modal>
    </div>
  );
}

function Hero() {
  const navigate = useNavigate();
  const t = useT();
  const { can } = useStore();
  return (
    <section className="hero reveal">
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div className="row" style={{ gap: 8 }}>
          <span className="pill pill-ink">UR KLINIK · MARCOM QA</span>
          <Heart size={20} />
        </div>
        <h1 style={{ marginTop: 18 }}>
          {t({ en: 'Every Call Creates a Brighter Tomorrow', zh: '每一通电话，成就更明亮的明天' })}
        </h1>
        <Squiggle width={180} style={{ marginTop: 6 }} />
        <div className="hero-tagline">{BRAND.tagline}</div>
        <div className="row-wrap" style={{ marginTop: 22 }}>
          {can.canReview && (
            <button className="btn btn-primary" onClick={() => navigate('/evaluate')}>
              ✨ {t({ en: 'Analyse a call', zh: '分析通话' })}
            </button>
          )}
          <button className="btn" onClick={() => navigate('/growth')}>
            🏆 {t({ en: 'See my growth', zh: '我的成长' })}
          </button>
        </div>
        <div className="hero-note">
          {t({ en: 'Good people. Great conversations. Brighter results. 💛', zh: '好的同事。好的对话。更好的成果。💛' })}
        </div>
      </div>
      <div className="hero-art">
        <div className="bubble float" style={{ top: 0, left: '2%' }}>
          {t({ en: 'Small improvements make a BIG difference!', zh: '小小的进步，累积成大大的不同！' })}
        </div>
        <div style={{ paddingTop: 50 }}>
          <HeroIllustration />
        </div>
      </div>
    </section>
  );
}
