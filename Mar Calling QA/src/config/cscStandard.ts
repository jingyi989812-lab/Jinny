/**
 * THE CSC STANDARD — the framework from the MARCOM meeting whiteboard
 * (24 Sept 2026), written down so the app can check against it.
 *
 *     利润 = 战略 × 组织
 *     我们是什么？        世界级祛斑诊所
 *     为什么顾客选我们？   专家
 *     CSC 目标：80 TU
 *     有效劳动：创造需求  ├ 懂得问问题
 *                        └ 体现专家 ① 医生操作 ② 祛斑诊所 ③ 专做祛斑
 *
 * The ICC scorecard (CSC Call Template) still produces the score. This is the
 * standard the team is being asked to work to, checked alongside it and never
 * folded into the number.
 */
import type { SourceRef } from '@/types/framework';

export const STANDARD_SOURCE: SourceRef = {
  document: 'PLACEHOLDER',
  note: 'MARCOM meeting whiteboard, 24 Sept 2026 (利润 = 战略 × 组织 · 有效劳动：创造需求). Not from the ICC reference documents — edit in src/config/cscStandard.ts.',
};

export const CSC_STANDARD = {
  active: true,
  formula: '利润 = 战略 × 组织',
  identity: { zh: '世界级祛斑诊所', en: 'A world-class pigmentation clinic' },
  whyUs: { zh: '专家', en: 'Expertise — the reason a customer picks us over anyone else' },
  /** 有效劳动 — the work that actually counts. */
  effectiveWork: { zh: '创造需求', en: 'Create the need' },
  /** The two capabilities that produce it. */
  capabilities: [
    {
      id: 'ask_questions',
      zh: '懂得问问题',
      en: 'Know how to ask',
      description: 'Questions that open the customer up and go one level deeper than her first answer.',
      /** A call this far below the mark is where coaching starts. */
      target: 4,
      targetNote: 'consultant questions per call (working target — not set on the whiteboard)',
    },
    {
      id: 'show_expertise',
      zh: '体现专家',
      en: 'Show the expert',
      description: 'The three pillars, said out loud: a doctor operates, we are a clinic, we do pigmentation only.',
      pillars: [
        { n: 1, zh: '医生操作', en: 'The doctor performs and decides the treatment' },
        { n: 2, zh: '祛斑诊所', en: 'A clinic — not a beauty salon' },
        { n: 3, zh: '专做祛斑', en: 'Pigmentation is all we do' },
      ],
    },
  ],
  /** Numbers written on the board. Kept as-is; their definitions were not. */
  targets: [
    { id: 'tu', label: 'CSC 目标', value: '80 TU', note: 'Per the whiteboard. "TU" is not defined in any document we hold — confirm with MARCOM before the app reports against it.' },
    { id: 'break_build', label: 'Break & Build', value: '28 / 人 / 月', note: '每人每月 28 个 break & build.' },
    { id: 'code', label: '8616', value: '8616', note: 'Written beside 世界级祛斑诊所; meaning not recorded.' },
  ],
} as const;
