/**
 * Analytics — every dashboard number is computed here from call records.
 * Nothing is hard-coded. Category analytics are always scoped to ONE framework
 * so section weights from different ICC versions are never merged.
 */
import { getFramework } from '@/config/frameworks';
import { focusForCall } from './campaignFocus';
import type { Call } from '@/types/call';
import type { LessonId, OverallStatus, QAFramework, SectionStatus } from '@/types/framework';
import type { Staff } from '@/types/staff';
import { effectiveResult, pct, sectionBand } from './scoring';

export interface CallFilter {
  staffId?: string;
  from?: string;
  to?: string;
  month?: string;
  minScore?: number;
  maxScore?: number;
  status?: OverallStatus;
  sectionId?: string; // calls where this section is below "strong"
  outlet?: string;
  issue?: string;
  /** Campaign-focus keyword id: keep only calls MISSING it. */
  focusMissing?: string; // behaviour id
  search?: string;
  frameworkId?: string;
  callType?: string;
}

export const monthOf = (date: string) => date.slice(0, 7);
export function monthLabel(month: string, style: 'short' | 'long' = 'short') {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: style === 'short' ? 'short' : 'long', year: 'numeric' });
}
export function monthName(month: string) {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'long' });
}
export function prevMonth(month: string) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
export function formatDate(date: string) {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
export const round1 = (n: number) => Math.round(n * 10) / 10;

export function filterCalls(calls: Call[], f: CallFilter): Call[] {
  const q = f.search?.trim().toLowerCase();
  const qDigits = q?.replace(/\D/g, '');
  return calls.filter((c) => {
    const r = effectiveResult(c);
    if (f.staffId && c.staffId !== f.staffId) return false;
    if (f.frameworkId && c.frameworkId !== f.frameworkId) return false;
    if (f.month && monthOf(c.callDate) !== f.month) return false;
    if (f.from && c.callDate < f.from) return false;
    if (f.to && c.callDate > f.to) return false;
    if (f.minScore !== undefined && r.percentage < f.minScore) return false;
    if (f.maxScore !== undefined && r.percentage > f.maxScore) return false;
    if (f.status && r.status !== f.status) return false;
    if (f.outlet && c.outlet !== f.outlet) return false;
    if (f.callType && (c.callType ?? 'new_lead') !== f.callType) return false;
    if (f.sectionId) {
      const s = c.evaluation.sections.find((x) => x.sectionId === f.sectionId);
      if (!s || s.applicable === false || s.percentage >= 70) return false;
    }
    if (f.issue && !c.evaluation.sections.some((s) => s.gaps.some((g) => g.behaviourId === f.issue))) return false;
    // Campaign focus keyword the consultant did not say (unscored observation).
    if (f.focusMissing && focusForCall(c).hits.find((h) => h.keyword.id === f.focusMissing)?.present !== false) return false;
    if (q) {
      const hay = `${c.staffName} ${c.id}`.toLowerCase();
      const digitsMatch = qDigits && qDigits.length >= 3 && c.leadNumber.includes(qDigits);
      if (!hay.includes(q) && !digitsMatch) return false;
    }
    return true;
  });
}

export function latestMonth(calls: Call[]): string {
  return calls.reduce((m, c) => (monthOf(c.callDate) > m ? monthOf(c.callDate) : m), '0000-00');
}

export interface KPISet {
  total: number;
  average: number;
  pass: number;
  needsImprovement: number;
  fail: number;
  passRate: number;
}

export function kpis(calls: Call[]): KPISet {
  const results = calls.map(effectiveResult);
  const count = (s: OverallStatus) => results.filter((r) => r.status === s).length;
  return {
    total: calls.length,
    average: round1(avg(results.map((r) => r.percentage))),
    pass: count('pass'),
    needsImprovement: count('needs_improvement'),
    fail: count('fail'),
    passRate: calls.length ? Math.round((count('pass') / calls.length) * 100) : 0,
  };
}

export interface TrendPoint {
  month: string;
  label: string;
  average: number;
  count: number;
  passRate: number;
}

export function monthlyTrend(calls: Call[]): TrendPoint[] {
  const months = [...new Set(calls.map((c) => monthOf(c.callDate)))].sort();
  return months.map((m) => {
    const k = kpis(calls.filter((c) => monthOf(c.callDate) === m));
    return { month: m, label: monthLabel(m).split(' ')[0], average: k.average, count: k.total, passRate: k.passRate };
  });
}

export type MotivationLabel = { emoji: string; label: string; tone: string };

export function motivationFor(average: number, delta: number | null): MotivationLabel {
  if (delta !== null && delta >= 5) return { emoji: '🔥', label: 'On Fire', tone: 'pink' };
  if (average >= 88) return { emoji: '🌟', label: 'Great Job', tone: 'yellow' };
  if (delta !== null && delta > 0) return { emoji: '💪', label: 'Improving', tone: 'green' };
  return { emoji: '🌱', label: 'Growing', tone: 'green' };
}

export interface StaffStat {
  staff: Staff;
  count: number;
  average: number;
  thisMonth: number | null;
  lastMonth: number | null;
  delta: number | null;
  passRate: number;
  latestCall: Call | null;
  motivation: MotivationLabel;
  focusSection: { sectionId: string; name: string; emoji: string; percentage: number } | null;
  strongestSection: { sectionId: string; name: string; emoji: string; percentage: number } | null;
  spark: number[];
}

export function staffStats(calls: Call[], staff: Staff[], month: string, frameworkId: string): StaffStat[] {
  return staff.map((s) => {
    const mine = calls.filter((c) => c.staffId === s.id).sort((a, b) => a.callDate.localeCompare(b.callDate));
    const thisM = mine.filter((c) => monthOf(c.callDate) === month);
    const lastM = mine.filter((c) => monthOf(c.callDate) === prevMonth(month));
    const thisAvg = thisM.length ? round1(kpis(thisM).average) : null;
    const lastAvg = lastM.length ? round1(kpis(lastM).average) : null;
    const delta = thisAvg !== null && lastAvg !== null ? round1(thisAvg - lastAvg) : null;
    const k = kpis(mine);
    const cats = categoryStats(mine.filter((c) => c.frameworkId === frameworkId), getFramework(frameworkId));
    const sortedCats = [...cats].filter((c) => c.count > 0).sort((a, b) => a.percentage - b.percentage);
    const focus = sortedCats[0];
    const best = sortedCats[sortedCats.length - 1];
    return {
      staff: s,
      count: mine.length,
      average: k.average,
      thisMonth: thisAvg,
      lastMonth: lastAvg,
      delta,
      passRate: k.passRate,
      latestCall: mine[mine.length - 1] ?? null,
      motivation: motivationFor(thisAvg ?? k.average, delta),
      focusSection: focus ? { sectionId: focus.sectionId, name: focus.name, emoji: focus.emoji, percentage: focus.percentage } : null,
      strongestSection: best ? { sectionId: best.sectionId, name: best.name, emoji: best.emoji, percentage: best.percentage } : null,
      spark: monthlyTrend(mine).map((p) => p.average),
    };
  });
}

export interface CategoryStat {
  sectionId: string;
  code: string;
  name: string;
  emoji: string;
  maxScore: number;
  averageScore: number;
  percentage: number;
  status: SectionStatus;
  count: number;
  lessonId: LessonId;
  topGap: { title: string; behaviourId: string; count: number } | null;
}

export function categoryStats(calls: Call[], framework: QAFramework): CategoryStat[] {
  const scoped = calls.filter((c) => c.frameworkId === framework.id);
  return framework.sections.map((sec) => {
    const results = scoped.map((c) => c.evaluation.sections.find((s) => s.sectionId === sec.id)).filter((s) => s && s.applicable !== false) as Call['evaluation']['sections'];
    const averageScore = round1(avg(results.map((r) => r.score)));
    const percentage = results.length ? pct(averageScore, sec.maxScore) : 0;
    const gapCounts = new Map<string, { title: string; count: number }>();
    for (const r of results)
      for (const g of r.gaps) {
        const key = g.behaviourId ?? g.title;
        gapCounts.set(key, { title: g.title, count: (gapCounts.get(key)?.count ?? 0) + 1 });
      }
    const top = [...gapCounts.entries()].sort((a, b) => b[1].count - a[1].count)[0];
    return {
      sectionId: sec.id,
      code: sec.code,
      name: sec.name,
      emoji: sec.emoji,
      maxScore: sec.maxScore,
      averageScore,
      percentage,
      status: sectionBand(framework, percentage).status,
      count: results.length,
      lessonId: sec.lessonId,
      topGap: top ? { behaviourId: top[0], title: top[1].title, count: top[1].count } : null,
    };
  });
}

export interface CategoryChange extends CategoryStat {
  previous: number | null;
  delta: number | null;
  direction: 'improved' | 'declined' | 'stable' | 'new';
}

export function categoryComparison(calls: Call[], framework: QAFramework, month: string): CategoryChange[] {
  const now = categoryStats(calls.filter((c) => monthOf(c.callDate) === month), framework);
  const before = categoryStats(calls.filter((c) => monthOf(c.callDate) === prevMonth(month)), framework);
  return now.map((c) => {
    const p = before.find((b) => b.sectionId === c.sectionId);
    if (!p || !p.count || !c.count) return { ...c, previous: null, delta: null, direction: 'new' as const };
    const delta = c.percentage - p.percentage;
    return { ...c, previous: p.percentage, delta, direction: delta >= 3 ? 'improved' : delta <= -3 ? 'declined' : 'stable' };
  });
}

export interface RecurringIssue {
  behaviourId: string;
  title: string;
  sectionId: string;
  sectionName: string;
  emoji: string;
  lessonId?: LessonId;
  count: number;
  share: number;
  whyItMatters: string;
}

export function recurringIssues(calls: Call[], framework: QAFramework): RecurringIssue[] {
  const scoped = calls.filter((c) => c.frameworkId === framework.id);
  const map = new Map<string, RecurringIssue>();
  for (const c of scoped) {
    const seen = new Set<string>();
    for (const s of c.evaluation.sections)
      for (const g of s.gaps) {
        const key = g.behaviourId ?? g.title;
        if (seen.has(key)) continue;
        seen.add(key);
        const sec = framework.sections.find((x) => x.id === s.sectionId);
        const beh = sec?.behaviours.find((b) => b.id === g.behaviourId);
        const cur = map.get(key) ?? {
          behaviourId: key,
          title: g.title,
          sectionId: s.sectionId,
          sectionName: s.name,
          emoji: s.emoji,
          lessonId: g.lessonId,
          count: 0,
          share: 0,
          whyItMatters: beh?.whyItMatters ?? '',
        };
        cur.count++;
        map.set(key, cur);
      }
  }
  return [...map.values()]
    .map((i) => ({ ...i, share: scoped.length ? Math.round((i.count / scoped.length) * 100) : 0 }))
    .sort((a, b) => b.count - a.count);
}

export function strongestBehaviours(calls: Call[], framework: QAFramework) {
  const scoped = calls.filter((c) => c.frameworkId === framework.id);
  const basic = new Set(['warm_greeting', 'agent_name', 'call_purpose', 'natural_flow', 'no_handoff_close', 'connection_recovery']);
  const map = new Map<string, { behaviourId: string; title: string; count: number; sectionName: string; emoji: string }>();
  for (const c of scoped)
    for (const s of c.evaluation.sections)
      for (const f of s.strengths) {
        const key = f.behaviourId ?? f.title;
        if (basic.has(key)) continue;
        const cur = map.get(key) ?? { behaviourId: key, title: f.title, count: 0, sectionName: s.name, emoji: s.emoji };
        cur.count++;
        map.set(key, cur);
      }
  return [...map.values()]
    .map((b) => ({ ...b, share: scoped.length ? Math.round((b.count / scoped.length) * 100) : 0 }))
    .sort((a, b) => b.count - a.count);
}

/** Share of staff whose monthly average improved vs the previous month. */
export function improvementRate(stats: StaffStat[]): number | null {
  const comparable = stats.filter((s) => s.delta !== null);
  if (!comparable.length) return null;
  return Math.round((comparable.filter((s) => (s.delta ?? 0) > 0).length / comparable.length) * 100);
}

export interface GrowthSummary {
  current: number | null;
  previous: number | null;
  delta: number | null;
  currentLabel: string;
  previousLabel: string;
  byCategory: CategoryChange[];
  biggestImprovement: CategoryChange | null;
  nextFocus: CategoryStat | null;
  topIssue: RecurringIssue | null;
}

/** Personal growth: latest month with calls vs the month before it. */
export function growthSummary(calls: Call[], staffId: string, framework: QAFramework): GrowthSummary {
  const mine = calls.filter((c) => c.staffId === staffId && c.frameworkId === framework.id);
  const month = latestMonth(mine);
  const prev = prevMonth(month);
  const cur = mine.filter((c) => monthOf(c.callDate) === month);
  const before = mine.filter((c) => monthOf(c.callDate) === prev);
  const current = cur.length ? kpis(cur).average : null;
  const previous = before.length ? kpis(before).average : null;
  const byCategory = categoryComparison(mine, framework, month);
  const improved = byCategory.filter((c) => (c.delta ?? 0) > 0).sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0));
  const catsNow = categoryStats(cur.length ? cur : mine, framework).filter((c) => c.count);
  const focus = [...catsNow].sort((a, b) => a.percentage - b.percentage)[0] ?? null;
  return {
    current,
    previous,
    delta: current !== null && previous !== null ? round1(current - previous) : null,
    currentLabel: month !== '0000-00' ? monthName(month) : '—',
    previousLabel: monthName(prev),
    byCategory,
    biggestImprovement: improved[0] ?? null,
    nextFocus: focus,
    topIssue: recurringIssues(cur.length ? cur : mine, framework).find((i) => i.sectionId === focus?.sectionId) ?? null,
  };
}
