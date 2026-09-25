import type { ActionPlanPhase, Band, CallTypeProfile, EQDimension, OverallStatus, SectionStatus } from '@/types/framework';

/**
 * Section status bands.
 * The Xin Ni report labels 70% and 73% "Strong", 60% "Developing" and 27–33% "Gap".
 * Exact boundaries are NOT stated anywhere, so the cut-offs below are inferred
 * placeholders. "Excellent" is an app extension (not in the reference).
 */
export const SECTION_BANDS: Band<SectionStatus>[] = [
  {
    status: 'excellent',
    minPercentage: 85,
    label: 'Excellent',
    emoji: '🌟',
    source: { document: 'PLACEHOLDER', note: '"Excellent" is an app extension; 85% cut-off to be confirmed by QA lead.' },
  },
  {
    status: 'strong',
    minPercentage: 70,
    label: 'Strong',
    emoji: '✅',
    source: { document: 'XinNi_ICC_Report_v2.pdf', note: '70% and 73% are labelled "Strong". Lower bound inferred.' },
  },
  {
    status: 'developing',
    minPercentage: 50,
    label: 'Developing',
    emoji: '🌱',
    source: { document: 'XinNi_ICC_Report_v2.pdf', note: '60% is labelled "Developing". 50% lower bound is a placeholder.' },
  },
  {
    status: 'needs_improvement',
    minPercentage: 1,
    label: 'Needs Improvement',
    emoji: '⚠️',
    source: { document: 'XinNi_ICC_Report_v2.pdf', note: '27% and 33% are labelled "Gap". Shown as "Needs Improvement" in this app.' },
  },
  {
    status: 'missed',
    minPercentage: 0,
    label: 'Missed',
    emoji: '❌',
    source: { document: 'PLACEHOLDER', note: 'No behaviour in the section was observed (0%).' },
  },
];

/**
 * Overall result bands. NEITHER reference document defines a pass mark.
 * These are placeholders so the dashboard can function; they must be confirmed.
 */
export const OVERALL_BANDS: Band<OverallStatus>[] = [
  {
    status: 'pass',
    minPercentage: 75,
    label: 'Pass',
    emoji: '😊',
    source: { document: 'PLACEHOLDER', note: 'Pass mark not defined in reference documents. 75% placeholder — confirm with QA lead.' },
  },
  {
    status: 'needs_improvement',
    minPercentage: 60,
    label: 'Needs Improvement',
    emoji: '😐',
    source: { document: 'PLACEHOLDER', note: 'Not defined in reference documents. 60–74% placeholder.' },
  },
  {
    status: 'fail',
    minPercentage: 0,
    label: 'Needs Practice',
    emoji: '😟',
    source: { document: 'PLACEHOLDER', note: 'Formal status "Fail" (shown as "Needs Practice"). Below 60% placeholder.' },
  },
];

/**
 * EQ dimensions — UNSCORED. The Xin Ni report lists exactly three:
 * Compliment (会贊美), Humor (会幽默), Graceful Decline (会拒絕).
 * Empathy / Confidence / Emotional connection are app extensions and are labelled as such.
 */
export const COMMON_EQ_DIMENSIONS: EQDimension[] = [
  {
    id: 'compliment',
    label: 'Compliment',
    labelZh: '会贊美',
    emoji: '😊',
    inReference: true,
    coachingTip: 'Insert a genuine compliment right after the treatment-history question, e.g. "你真的很用心在照顧自己的皮膚。"',
    source: { document: 'XinNi_ICC_Report_v2.pdf', note: 'EQ Observation (Unscored) — Compliment (会贊美)' },
  },
  {
    id: 'humor',
    label: 'Humor',
    labelZh: '会幽默',
    emoji: '😄',
    inReference: true,
    coachingTip: 'Use a light, self-deprecating line (e.g. about a bad connection) to break tension naturally.',
    source: { document: 'XinNi_ICC_Report_v2.pdf', note: 'EQ Observation (Unscored) — Humor (会幽默)' },
  },
  {
    id: 'graceful_decline',
    label: 'Graceful Decline',
    labelZh: '会拒絕',
    emoji: '🤝',
    inReference: true,
    coachingTip: 'Own the moment of hesitation with a confident, warm redirect (offer the trial slot directly) before considering a hand-off.',
    source: { document: 'XinNi_ICC_Report_v2.pdf', note: 'EQ Observation (Unscored) — Graceful Decline (会拒絕)' },
  },
  {
    id: 'empathy',
    label: 'Empathy',
    emoji: '💛',
    inReference: false,
    coachingTip: 'Name the feeling before offering the solution.',
    source: { document: 'PLACEHOLDER', note: 'App extension. Empathy is scored inside Rapport & Tone; shown here as coaching only.' },
  },
  {
    id: 'confidence',
    label: 'Confidence',
    emoji: '🎤',
    inReference: false,
    coachingTip: 'Recommend clearly, then pause and let the customer respond.',
    source: { document: 'PLACEHOLDER', note: 'App extension. Confidence is scored inside Rapport & Tone; shown here as coaching only.' },
  },
  {
    id: 'emotional_connection',
    label: 'Emotional Connection',
    emoji: '❤️',
    inReference: false,
    coachingTip: 'Connect the treatment to how the customer wants to feel, not only to the symptom.',
    source: { document: 'PLACEHOLDER', note: 'App extension — not in the reference EQ observation.' },
  },
];

export const COMMON_ACTION_PLAN_PHASES: ActionPlanPhase[] = [
  { id: 'immediate', label: 'Immediate', source: { document: 'XinNi_ICC_Report_v2.pdf', note: 'Priority Action Plan — Next 30 Days: IMMEDIATE' } },
  { id: 'week2', label: 'Week 2', source: { document: 'XinNi_ICC_Report_v2.pdf', note: 'Priority Action Plan — Next 30 Days: WEEK 2' } },
  { id: 'week3_4', label: 'Week 3–4', source: { document: 'XinNi_ICC_Report_v2.pdf', note: 'Priority Action Plan — Next 30 Days: WEEK 3-4' } },
];

/**
 * Call-type scoring profiles — PLACEHOLDER.
 * Both reference reports evaluate first sales conversations about a lead's enquiry.
 * Neither defines how follow-up or existing-customer calls should be scored, so these
 * profiles are an app proposal to be confirmed by the QA lead (can be switched off in Settings).
 */
export const CALL_TYPE_PROFILES: CallTypeProfile[] = [
  {
    callType: 'new_lead',
    label: 'New lead',
    emoji: '🆕',
    description: 'First sales conversation about the lead\'s enquiry — the call type the ICC reference reports evaluate. Every section is scored.',
    scoredStages: 'all',
    source: { document: 'CSC_Call_Template_Jun15.pdf', note: 'Reference calls are first sales conversations with leads from an enquiry / advertisement.' },
  },
  {
    callType: 'follow_up',
    label: 'Follow-up',
    emoji: '🔁',
    description: 'A later call after an earlier conversation (e.g. the lead said they would think about it). Discovery and product explanation may already have happened, so only opening, objection handling, urgency, closing and rapport are scored.',
    scoredStages: ['opening', 'objection', 'urgency', 'closing', 'rapport'],
    source: { document: 'PLACEHOLDER', note: 'Not defined in the reference documents — proposed scope, confirm with QA lead.' },
  },
  {
    callType: 'existing_customer',
    label: 'Existing customer',
    emoji: '💎',
    description: 'A customer already doing treatment (e.g. booking the next session). Only opening, closing and rapport are scored.',
    scoredStages: ['opening', 'closing', 'rapport'],
    source: { document: 'PLACEHOLDER', note: 'Not defined in the reference documents — proposed scope, confirm with QA lead.' },
  },
];
