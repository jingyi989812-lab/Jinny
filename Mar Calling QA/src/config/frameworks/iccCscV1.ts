/**
 * ICC CSC Framework v1 — individual coaching report format.
 *
 * Source: XinNi_ICC_Report_v2.pdf ("Framework: ICC CSC Framework v1").
 * Seven sections A–G. Max scores are taken from its SCORECARD (7/10, 11/15 …),
 * which sum to 90 points. Kept as a SEPARATE framework — its weights are
 * deliberately not merged with the ICC Benchmark (/100).
 */
import type { QAFramework, SourceRef } from '@/types/framework';
import { pick } from './behaviourLibrary';
import { CALL_TYPE_PROFILES, COMMON_ACTION_PLAN_PHASES, COMMON_EQ_DIMENSIONS, OVERALL_BANDS, SECTION_BANDS } from './shared';

const X = (note: string): SourceRef => ({ document: 'XinNi_ICC_Report_v2.pdf', note });
const EQUAL_SPLIT: SourceRef = {
  document: 'PLACEHOLDER',
  note: 'Reference gives the section total only. Behaviours below are derived from the section\'s "Did well" / "Gap" findings; points split equally.',
};

export const ICC_CSC_V1: QAFramework = {
  id: 'icc-csc-v1',
  frameworkName: 'ICC CSC Framework',
  frameworkVersion: 'v1',
  shortLabel: 'ICC CSC v1 (A–G) /90',
  description:
    'Seven-section individual coaching format (A–G): Opening & Rapport, Needs Discovery, Education & Solution, Clinic & Doctor Credibility, Objection Handling, Urgency & Offer, Closing & Appointment Booking.',
  maxTotal: 90,
  isPrimary: false,
  source: X('SCORECARD and SECTION-BY-SECTION ANALYSIS'),
  sourceNotes: [
    'Section maxima (10 + 15 + 15 + 10 + 10 + 15 + 15) total 90. The report shows 54% for 49/90, which is consistent.',
    'The report header is dated June 15, 2025 while the CSC Call Template is dated June 15, 2026 — date of this version to be confirmed.',
    'Behaviour lists per section are derived from the report\'s findings for one call; they are not a formal SOP checklist.',
  ],
  sections: [
    {
      id: 'opening',
      code: 'A',
      name: 'Opening & Rapport',
      shortName: 'Opening',
      emoji: '🎤',
      maxScore: 10,
      criteria: 'Identify self and clinic, reason for call, personal warmth, recovery from connection issues',
      journeyStage: 'opening',
      lessonId: 'introduction',
      source: X('A — Opening & Rapport · 10 pts'),
      pointAllocation: EQUAL_SPLIT,
      behaviours: [
        pick('agent_name'),
        pick('brand_name'),
        pick('call_purpose'),
        pick('customer_name'),
        pick('icebreaker_compliment'),
        pick('connection_recovery'),
      ],
    },
    {
      id: 'needs_discovery',
      code: 'B',
      name: 'Needs Discovery',
      shortName: 'Discovery',
      emoji: '🔍',
      maxScore: 15,
      criteria: 'Concerns, clarification, mirroring, treatment history, lifestyle, timeline',
      journeyStage: 'discovery',
      lessonId: 'discovery',
      source: X('B — Needs Discovery · 15 pts'),
      pointAllocation: EQUAL_SPLIT,
      behaviours: [
        pick('concern_probe'),
        pick('clarify_vague'),
        pick('mirror_concern'),
        pick('previous_treatment'),
        pick('lifestyle'),
        pick('duration_probe'),
      ],
      roleModels: [{
        line: '我聽到你說皮膚易潮紅、毛孔大，而且你已經試過很多雷射都沒改善，難怪你會覺得沒信心。我先幫你整理一下你做過的每一項，再告訴你為什麼效果不明顯。',
        glossEn:
          "I hear that your skin flushes easily and your pores are large, and you've already tried many lasers without improvement — no wonder you feel unsure. Let me first go through everything you've done, then explain why the results weren't obvious.",
        attributedTo: 'Irene Wong (role model)',
        whyItWorks:
          "Restates the customer's frustration in full (not just the surface symptom), validates the emotion, and signals a structured investigation before pitching.",
        source: X('Section B — "Role Model (Irene)" and "Why it\'s stronger"'),
      }],
    },
    {
      id: 'education',
      code: 'C',
      name: 'Education & Solution Introduction',
      shortName: 'Education',
      emoji: '💡',
      maxScore: 15,
      criteria: 'AI skin analysis, light therapy, root cause, concern-to-solution story',
      journeyStage: 'solution',
      lessonId: 'product',
      source: X('C — Education & Solution Introduction · 15 pts'),
      pointAllocation: EQUAL_SPLIT,
      behaviours: [pick('ai_skin_analysis'), pick('light_system'), pick('root_cause'), pick('concern_to_solution')],
    },
    {
      id: 'credibility',
      code: 'D',
      name: 'Clinic & Doctor Credibility',
      shortName: 'Credibility',
      emoji: '🏥',
      maxScore: 10,
      criteria: 'Clinic experience, branches, doctor/specialist, success stories',
      journeyStage: 'credibility',
      lessonId: 'product',
      source: X('D — Clinic & Doctor Credibility · 10 pts'),
      pointAllocation: EQUAL_SPLIT,
      behaviours: [
        pick('clinic_experience'),
        pick('clinic_branches'),
        pick('doctor_credibility'),
        pick('differentiation_testimonial'),
      ],
    },
    {
      id: 'objection',
      code: 'E',
      name: 'Objection Handling',
      shortName: 'Objections',
      emoji: '🧠',
      maxScore: 10,
      criteria: 'No-obligation reassurance, low-risk trial, empathy before pitching, incentive on hesitation',
      journeyStage: 'objection',
      lessonId: 'objection',
      source: X('E — Objection Handling · 10 pts'),
      pointAllocation: EQUAL_SPLIT,
      behaviours: [pick('no_obligation'), pick('trial_risk_reduction'), pick('empathy'), pick('hesitation_incentive')],
    },
    {
      id: 'urgency',
      code: 'F',
      name: 'Urgency & Offer',
      shortName: 'Urgency',
      emoji: '🎁',
      maxScore: 15,
      criteria: '2-week free skincare gift, deadline, limited slots, clear offer',
      journeyStage: 'urgency',
      lessonId: 'urgency',
      source: X('F — Urgency & Offer · 15 pts'),
      pointAllocation: EQUAL_SPLIT,
      behaviours: [pick('skincare_gift'), pick('promo_deadline'), pick('limited_slots'), pick('clear_offer')],
      roleModels: [{
        line: '本星期內預約首次進體驗，我們會送上兩星期免費保養品組合，幫你在家也能繼續讓皮膚實你。名額每週只有少數兩個名額。',
        glossEn:
          "Book your first trial within this week and we'll give you a two-week free skincare set, so your skin keeps improving at home. There are only a couple of slots each week.",
        attributedTo: 'Irene Wong (role model)',
        whyItWorks:
          'Concrete and repeatable — a named gift, a clear timeframe, and a scarcity cue — versus a trailing, unclear sentence that gives the customer nothing specific to act on.',
        source: X('Section F — "Role Model (Irene)" and "Why it\'s stronger"'),
      }],
    },
    {
      id: 'closing',
      code: 'G',
      name: 'Closing & Appointment Booking',
      shortName: 'Closing',
      emoji: '📅',
      maxScore: 15,
      criteria: 'Find a slot, confirm date/time, recap next steps, own the close',
      journeyStage: 'closing',
      lessonId: 'closing',
      source: X('G — Closing & Appointment Booking · 15 pts'),
      pointAllocation: EQUAL_SPLIT,
      behaviours: [
        pick('availability_probe'),
        pick('appointment_confirmed'),
        pick('recap_next_steps'),
        pick('no_handoff_close'),
      ],
      roleModels: [{
        line: '那我幫你先鉛住星期六上午十點，到時我們的專員會在現場接待你，你只需要提前十分鐘到就好，我們星期五再發訊息提醒你。',
        glossEn:
          "Let me lock in Saturday 10am for you. Our specialist will receive you on site — just arrive 10 minutes early, and we'll message you a reminder on Friday.",
        attributedTo: 'Irene Wong (role model)',
        whyItWorks:
          'Secures an exact date and time herself, sets expectations for the visit, and adds a confirmation touchpoint — rather than deferring the decision to a colleague.',
        source: X('Section G — "Role Model (Irene)" and "Why it\'s stronger"'),
      }],
    },
  ],
  sectionBands: SECTION_BANDS,
  overallBands: OVERALL_BANDS,
  eqDimensions: COMMON_EQ_DIMENSIONS,
  actionPlanPhases: COMMON_ACTION_PLAN_PHASES,
  callTypeProfiles: CALL_TYPE_PROFILES,
};
