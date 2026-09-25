/**
 * ICC Benchmark — PRIMARY production rubric.
 *
 * Source: CSC_Call_Template_Jun15.pdf ("CSC Call Quality Analysis Report",
 * Framework: ICC Benchmark). Section codes, names, criteria text and max
 * scores are copied from its "ICC Scorecard Comparison" table (total /100).
 *
 * What the document does NOT define (marked PLACEHOLDER below):
 *  - how points are split between behaviours inside a section
 *  - section status bands and overall pass / needs-improvement / fail thresholds
 */
import type { QAFramework, SourceRef } from '@/types/framework';
import { pick } from './behaviourLibrary';
import { CALL_TYPE_PROFILES, COMMON_ACTION_PLAN_PHASES, COMMON_EQ_DIMENSIONS, OVERALL_BANDS, SECTION_BANDS } from './shared';

const T = (note: string): SourceRef => ({ document: 'CSC_Call_Template_Jun15.pdf', note });
const EQUAL_SPLIT: SourceRef = {
  document: 'PLACEHOLDER',
  note: 'Reference gives the section total only. Points are split equally across the listed behaviours until the QA lead confirms a weighting.',
};

export const ICC_BENCHMARK: QAFramework = {
  id: 'icc-benchmark-2026-06',
  frameworkName: 'ICC Benchmark',
  frameworkVersion: 'CSC Call Template · Jun 15 2026',
  shortLabel: 'ICC Benchmark /100',
  description:
    'Five ICC components scored out of 100 — Introduction, Discovery (C1), Product Knowledge (C2), Close, Rapport & Tone — with the 4-step recommended call script.',
  maxTotal: 100,
  isPrimary: true,
  source: T('ICC Scorecard Comparison table and Recommended Call Script Template'),
  sourceNotes: [
    'Xin Ni\'s component scores in the ICC Scorecard (6 + 18 + 17 + 15 + 15) add up to 71/100, while the Executive Summary shows 72%. This app always calculates the total from section scores.',
    'The team report names Irene Wong as "Gold Standard" benchmark; the Xin Ni individual report names her "Role Model".',
    'No pass mark or status thresholds are defined in this document — see the placeholder bands.',
    'Offer details differ between documents (RM399 package vs RM39.90 trial). Offer prices are therefore not scored; only the presence of the deadline, gift and a clear offer is checked.',
  ],
  sections: [
    {
      id: 'introduction',
      code: 'I',
      name: 'Introduction',
      shortName: 'Intro',
      emoji: '🎤',
      maxScore: 10,
      criteria: 'Warm greeting, name, brand, purpose',
      journeyStage: 'opening',
      lessonId: 'introduction',
      recommendedDuration: '30 sec',
      source: T('I — Introduction · 10 pts · "Warm greeting, name, brand, purpose"'),
      pointAllocation: EQUAL_SPLIT,
      behaviours: [pick('warm_greeting'), pick('agent_name'), pick('brand_name'), pick('call_purpose')],
    },
    {
      id: 'discovery',
      code: 'C1',
      name: 'Discovery',
      shortName: 'Discovery',
      emoji: '🔍',
      maxScore: 20,
      criteria: 'Probing skin concerns, doubts, lifestyle',
      journeyStage: 'discovery',
      lessonId: 'discovery',
      recommendedDuration: '2–3 min',
      source: T('C1 — Discovery · 20 pts · "Probing skin concerns, doubts, lifestyle"'),
      pointAllocation: EQUAL_SPLIT,
      behaviours: [
        pick('concern_probe'),
        pick('duration_probe'),
        pick('previous_treatment'),
        pick('lifestyle'),
        pick('emotional_pain'),
      ],
      roleModels: [{
        line: '我聽到你說皮膚易潮紅、毛孔大，而且你已經試過很多雷射都沒改善，難怪你會覺得沒信心。我先幫你整理一下你做過的每一項，再告訴你為什麼效果不明顯。',
        glossEn:
          "I hear that your skin flushes easily and your pores are large, and you've already tried many lasers without improvement — no wonder you feel unsure. Let me first go through everything you've done, then explain why the results weren't obvious.",
        attributedTo: 'Irene Wong (role model)',
        whyItWorks:
          "Restates the customer's frustration in full (not just the surface symptom), validates the emotion, and signals a structured investigation before pitching.",
        source: { document: 'XinNi_ICC_Report_v2.pdf', note: 'Section B — "Role Model (Irene)" column and "Why it\'s stronger"' },
      }],
    },
    {
      id: 'product',
      code: 'C2',
      name: 'Product Knowledge',
      shortName: 'Product',
      emoji: '💡',
      maxScore: 20,
      criteria: '3-light system, AI scan, differentiation',
      journeyStage: 'solution',
      lessonId: 'product',
      recommendedDuration: '2–3 min',
      source: T('C2 — Product Knowledge · 20 pts · "3-light system, AI scan, differentiation"'),
      pointAllocation: EQUAL_SPLIT,
      behaviours: [
        pick('concern_to_solution'),
        pick('light_system'),
        pick('light_purpose'),
        pick('ai_skin_analysis'),
        pick('differentiation_testimonial'),
      ],
    },
    {
      id: 'close',
      code: 'Close',
      name: 'Close',
      shortName: 'Close',
      emoji: '📅',
      maxScore: 25,
      criteria: 'Specific date/time, urgency, promo offer',
      journeyStage: 'closing',
      lessonId: 'closing',
      recommendedDuration: '1 min',
      source: T('Close · 25 pts · "Specific date/time, urgency, promo offer"'),
      pointAllocation: {
        document: 'PLACEHOLDER',
        note: 'Equal split across the five script-step-4 behaviours. "Reassure hesitation" only applies if the customer hesitated; otherwise its share is redistributed.',
      },
      behaviours: [
        pick('two_options'),
        pick('promo_deadline'),
        pick('skincare_gift'),
        pick('no_obligation'),
        pick('appointment_confirmed'),
      ],
      roleModels: [
        {
          line: '本星期內預約首次進體驗，我們會送上兩星期免費保養品組合，幫你在家也能繼續讓皮膚實你。名額每週只有少數兩個名額。',
          glossEn:
            "Book your first trial within this week and we'll give you a two-week free skincare set, so your skin keeps improving at home. There are only a couple of slots each week.",
          attributedTo: 'Irene Wong (role model)',
          whyItWorks:
            'Concrete and repeatable — a named gift, a clear timeframe, and a scarcity cue — versus a trailing, unclear sentence that gives the customer nothing specific to act on.',
          source: { document: 'XinNi_ICC_Report_v2.pdf', note: 'Section F — "Role Model (Irene)" column and "Why it\'s stronger"' },
        },
        {
          line: '那我幫你先鉛住星期六上午十點，到時我們的專員會在現場接待你，你只需要提前十分鐘到就好，我們星期五再發訊息提醒你。',
          glossEn:
            "Let me lock in Saturday 10am for you. Our specialist will receive you on site — just arrive 10 minutes early, and we'll message you a reminder on Friday.",
          attributedTo: 'Irene Wong (role model)',
          whyItWorks:
            'Secures an exact date and time herself, sets expectations for the visit, and adds a confirmation touchpoint — rather than deferring the decision and losing momentum.',
          source: { document: 'XinNi_ICC_Report_v2.pdf', note: 'Section G — "Role Model (Irene)" column and "Why it\'s stronger"' },
        },
      ],
    },
    {
      id: 'rapport',
      code: 'R&T',
      name: 'Rapport & Tone',
      shortName: 'Rapport',
      emoji: '💛',
      maxScore: 25,
      criteria: 'Natural flow, empathy, confidence',
      journeyStage: 'rapport',
      lessonId: 'rapport',
      source: T('Rapport & Tone · 25 pts · "Natural flow, empathy, confidence"'),
      pointAllocation: EQUAL_SPLIT,
      behaviours: [pick('natural_flow'), pick('empathy'), pick('confidence')],
    },
  ],
  sectionBands: SECTION_BANDS,
  overallBands: OVERALL_BANDS,
  eqDimensions: COMMON_EQ_DIMENSIONS,
  actionPlanPhases: COMMON_ACTION_PLAN_PHASES,
  callTypeProfiles: CALL_TYPE_PROFILES,
};
