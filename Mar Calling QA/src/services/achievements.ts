/**
 * Achievement badges — earned ONLY from real QA results. Thresholds are
 * gamification settings (not part of the ICC rubric) and can be tuned here.
 */
import { getFramework } from '@/config/frameworks';
import type { Call } from '@/types/call';
import type { AchievementDefinition, AchievementId, EarnedAchievement } from '@/types/staff';
import { effectiveResult } from './scoring';

export const ACHIEVEMENT_RULES = {
  listenerMinPct: 85,
  productMinPct: 85,
  streakLength: 3,
  growingMinPoints: 5,
  masterCalls: 3,
  masterSectionMinPct: 70,
  masterAverageMinPct: 85,
};

export const ACHIEVEMENTS: Record<AchievementId, AchievementDefinition> = {
  great_listener: {
    id: 'great_listener',
    title: 'Great Listener',
    emoji: '🏅',
    description: 'Strong discovery questions.',
    rule: `Discovery section scored ${ACHIEVEMENT_RULES.listenerMinPct}% or higher on a call.`,
    tint: 'yellow',
  },
  sharp_closer: {
    id: 'sharp_closer',
    title: 'Sharp Closer',
    emoji: '🎯',
    description: 'Secured a specific appointment.',
    rule: 'A specific date and time was confirmed and agreed by the customer (with transcript evidence).',
    tint: 'pink',
  },
  product_pro: {
    id: 'product_pro',
    title: 'Product Pro',
    emoji: '🧠',
    description: 'Strong product / treatment explanation.',
    rule: `Product Knowledge / Solution section scored ${ACHIEVEMENT_RULES.productMinPct}% or higher on a call.`,
    tint: 'lilac',
  },
  customer_empathy: {
    id: 'customer_empathy',
    title: 'Customer Empathy',
    emoji: '💛',
    description: 'Strong emotional connection.',
    rule: 'Empathy was shown AND a compliment or emotional-impact question appeared in the same call.',
    tint: 'yellow',
  },
  hot_streak: {
    id: 'hot_streak',
    title: 'Hot Streak',
    emoji: '🔥',
    description: 'Improved score across multiple calls.',
    rule: `Score went up on ${ACHIEVEMENT_RULES.streakLength} evaluated calls in a row.`,
    tint: 'pink',
  },
  growing: {
    id: 'growing',
    title: 'Growing',
    emoji: '🌱',
    description: 'Meaningful improvement from the previous evaluation.',
    rule: `Scored at least ${ACHIEVEMENT_RULES.growingMinPoints} percentage points higher than the previous evaluated call.`,
    tint: 'green',
  },
  icc_master: {
    id: 'icc_master',
    title: 'ICC Master',
    emoji: '🏆',
    description: 'Consistently strong across the ICC framework.',
    rule: `Last ${ACHIEVEMENT_RULES.masterCalls} calls: every ICC section at least ${ACHIEVEMENT_RULES.masterSectionMinPct}% and average at least ${ACHIEVEMENT_RULES.masterAverageMinPct}%.`,
    tint: 'green',
  },
};

function stagePct(call: Call, stage: 'discovery' | 'solution'): number | null {
  const fw = getFramework(call.frameworkId);
  const ids = fw.sections.filter((s) => s.journeyStage === stage).map((s) => s.id);
  const secs = call.evaluation.sections.filter((s) => ids.includes(s.sectionId) && s.applicable !== false);
  if (!secs.length) return null;
  return Math.round((secs.reduce((a, s) => a + s.score, 0) / secs.reduce((a, s) => a + s.maxScore, 0)) * 100);
}

const hasStrength = (call: Call, behaviourSuffix: string) =>
  call.evaluation.sections.some((s) => s.strengths.some((f) => f.behaviourId?.endsWith(behaviourSuffix)));

/** Badges earned on one call, given the staff member's earlier calls (oldest → newest). */
export function badgesForCall(call: Call, history: Call[]): EarnedAchievement[] {
  const out: EarnedAchievement[] = [];
  const add = (id: AchievementId, reason: string) => out.push({ id, callId: call.id, earnedOn: call.callDate, reason });
  const pctNow = effectiveResult(call).percentage;

  const disc = stagePct(call, 'discovery');
  if (disc !== null && disc >= ACHIEVEMENT_RULES.listenerMinPct) add('great_listener', `Discovery ${disc}% on ${call.id}`);
  if (hasStrength(call, 'appointment_confirmed')) add('sharp_closer', `Confirmed appointment on ${call.id}`);
  const prod = stagePct(call, 'solution');
  if (prod !== null && prod >= ACHIEVEMENT_RULES.productMinPct) add('product_pro', `Product explanation ${prod}% on ${call.id}`);
  const eq = call.evaluation.eqObservation;
  const warm = eq.some((e) => e.dimensionId === 'compliment' && e.status === 'present') || hasStrength(call, 'emotional_pain');
  if (hasStrength(call, 'empathy') && warm) add('customer_empathy', `Empathy + warmth on ${call.id}`);

  const prior = history.filter((c) => c.callDate < call.callDate || (c.callDate === call.callDate && c.id < call.id));
  const seq = [...prior.slice(-(ACHIEVEMENT_RULES.streakLength)), call].map((c) => effectiveResult(c).percentage);
  if (seq.length === ACHIEVEMENT_RULES.streakLength + 1 && seq.every((v, i) => i === 0 || v > seq[i - 1]))
    add('hot_streak', `${ACHIEVEMENT_RULES.streakLength} improving calls in a row ending ${call.id}`);
  const prev = prior[prior.length - 1];
  if (prev && pctNow - effectiveResult(prev).percentage >= ACHIEVEMENT_RULES.growingMinPoints)
    add('growing', `+${pctNow - effectiveResult(prev).percentage} pts vs previous call`);
  const last = [...prior.slice(-(ACHIEVEMENT_RULES.masterCalls - 1)), call];
  if (
    last.length === ACHIEVEMENT_RULES.masterCalls &&
    last.every((c) => c.frameworkId === call.frameworkId && c.evaluation.sections.every((s) => s.applicable === false || s.percentage >= ACHIEVEMENT_RULES.masterSectionMinPct)) &&
    last.reduce((a, c) => a + effectiveResult(c).percentage, 0) / last.length >= ACHIEVEMENT_RULES.masterAverageMinPct
  )
    add('icc_master', `Last ${ACHIEVEMENT_RULES.masterCalls} calls strong in every section`);
  return out;
}

export interface StaffBadge {
  definition: AchievementDefinition;
  count: number;
  latest: EarnedAchievement;
}

export function staffBadges(calls: Call[], staffId: string): StaffBadge[] {
  const mine = calls.filter((c) => c.staffId === staffId).sort((a, b) => a.callDate.localeCompare(b.callDate) || a.id.localeCompare(b.id));
  const map = new Map<AchievementId, StaffBadge>();
  mine.forEach((call, i) => {
    for (const e of badgesForCall(call, mine.slice(0, i))) {
      const cur = map.get(e.id);
      map.set(e.id, { definition: ACHIEVEMENTS[e.id], count: (cur?.count ?? 0) + 1, latest: e });
    }
  });
  return (Object.keys(ACHIEVEMENTS) as AchievementId[]).filter((id) => map.has(id)).map((id) => map.get(id)!);
}
