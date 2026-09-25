/**
 * CAMPAIGN FOCUS — the message MARCOM wants in this period's calls.
 *
 * This is deliberately NOT part of the ICC score: the scorecard comes from the
 * CSC Call Template and does not change week to week. Campaign focus is an
 * unscored observation so the team can see, per call and across the month,
 * whether the current positioning is actually reaching customers.
 *
 * Keyword matching only — it shows whether the words were said, not how well.
 */
import type { SourceRef } from '@/types/framework';

export interface FocusKeyword {
  id: string;
  label: string;
  emoji: string;
  /** What "good" sounds like, for coaching. */
  example: string;
  pattern: RegExp;
  /** Removed from the line before matching (e.g. the brand name, so "UR Clinic" is not read as positioning). */
  strip?: RegExp;
}

export interface CampaignFocus {
  id: string;
  active: boolean;
  headline: string;
  headlineEn: string;
  period: string;
  why: string;
  keywords: FocusKeyword[];
  source: SourceRef;
}

export const CAMPAIGN_FOCUS: CampaignFocus = {
  id: 'world-class-pigmentation-clinic',
  active: true,
  headline: '世界级祛斑诊所',
  headlineEn: 'World-class pigmentation clinic',
  period: 'September 2026',
  why: 'The differentiator against other aesthetic providers: a clinic with doctors, specialising in pigmentation — not a beauty salon offering a promotion.',
  keywords: [
    {
      id: 'doctor',
      label: '医生 · Doctor',
      emoji: '👩‍⚕️',
      example: '我们的医生会看你的斑点种类和黑色素的层次',
      pattern: /医生|醫生|doctor|doktor|dermatolog|皮肤科|皮膚科/i,
    },
    {
      id: 'doctor_led',
      label: '医生操作 · Doctor-led treatment',
      emoji: '🩺',
      example: '医生会先帮你看过皮肤，再决定用哪一个光疗',
      pattern:
        /(医生|醫生|doctor|doktor)[^。！？\n]{0,25}(会看|會看|看|讲解|講解|咨询|諮詢|建议|建議|推荐|推薦|帮你|幫你|跟你|决定|決定|操作|做|consult|check|review|explain|will)/i,
    },
    {
      id: 'clinic',
      label: '诊所 · Clinic (not a salon)',
      emoji: '🏥',
      example: '我们这里是诊所，不是美容院',
      pattern: /诊所|診所|klinik|clinic|medical|医疗|醫療|美容院|beauty salon|spa\b/i,
      // "UR Klinik" is the brand; saying it is not the same as positioning UR as a clinic.
      strip: /\b(?:u\.?\s?r\.?|ur|you\s?are|urklinik|urin)\s*(?:klinik|clinic)?\b/gi,
    },
    {
      id: 'pigmentation',
      label: '祛斑 · Pigmentation speciality',
      emoji: '✨',
      example: '我们12年专注祛斑，这是我们的专业',
      pattern: /祛斑|去斑|去班|去版|黑斑|雀斑|晒斑|曬斑|色斑|斑点|斑點|pigmentasi|pigment|jeragat/i,
    },
  ],
  source: {
    document: 'PLACEHOLDER',
    note: 'MARCOM calling focus for September 2026 (team brief) — not from the ICC reference documents. Edit in src/config/strategyFocus.ts.',
  },
};
