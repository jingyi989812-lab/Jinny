/**
 * MARCOM Calling Academy content — derived from the two ICC reference documents.
 * Each example is labelled: 'reference' (verbatim from a document) or
 * 'suggested' (written for this app as coaching phrasing).
 */
import type { LessonId, SourceRef } from '@/types/framework';
import { P } from './iccPlaybook';

export interface LessonExample {
  kind: 'reference' | 'suggested';
  text: string;
  gloss?: string;
  attribution: string;
}

export interface Lesson {
  id: LessonId;
  emoji: string;
  title: string;
  tagline: string;
  duration?: string;
  commonMistake: string[];
  betterApproach: string[];
  whyItMatters: string;
  practice: LessonExample[];
  sources: SourceRef[];
  tint: string;
}

const T = (note: string): SourceRef => ({ document: 'CSC_Call_Template_Jun15.pdf', note });
const X = (note: string): SourceRef => ({ document: 'XinNi_ICC_Report_v2.pdf', note });

export const LESSONS: Lesson[] = [
  {
    id: 'introduction',
    emoji: '🎤',
    title: 'Introduction',
    tagline: 'Name, brand, reason — warm and in 30 seconds.',
    duration: '30 sec',
    commonMistake: [
      'Introduction unclear — no brand name stated.',
      'Introduction too slow — re-introducing yourself several times.',
      'Opening time lost to connection problems with no warm recovery.',
    ],
    betterApproach: [
      'State your name + brand name clearly.',
      "Mention the lead's enquiry / reason for the call.",
      'Keep it warm and conversational — not scripted.',
      'Have a warm, personalised re-opener ready the moment the audio clears.',
    ],
    whyItMatters: 'Introduction quality varies widely across the team. Standardising the opener means every call starts the same, confident way.',
    practice: [
      {
        kind: 'suggested',
        text: "Hello, is this [Name]? Hi! This is [Agent Name], calling from U.R. Klinik — I'm following up on the enquiry you left about your skin.",
        attribution: 'Suggested phrasing based on the CSC Call Template step 1 structure (the template sample script is partly illegible in the PDF).',
      },
      {
        kind: 'reference',
        text: '看來今天電話線跟我一樣紧張！',
        gloss: 'Looks like the phone line is as nervous as I am today!',
        attribution: 'XinNi_ICC_Report_v2 — EQ coaching example for a bad connection (English gloss added by this app).',
      },
    ],
    sources: [T('Script step 1 — INTRODUCTION (30 sec); Universal gap "Introduction quality varies widely"'), X('Focus area 5; Section A gaps')],
    tint: 'var(--yellow-50)',
  },
  {
    id: 'discovery',
    emoji: '🔍',
    title: 'Discovery',
    tagline: 'Let them describe THEIR issue — then go one level deeper.',
    duration: '2–3 min',
    commonMistake: [
      'Never asking about daily lifestyle or skincare habits (sun protection, routine, diet).',
      'Leaving the timeline of the concern muddled.',
      'Mirroring only the surface symptom, not the frustration behind it.',
    ],
    betterApproach: [
      'Ask open questions — let them describe THEIR issue.',
      'Probe duration: "How long have you had this problem?"',
      "Ask what they've tried before.",
      'Surface the emotional pain.',
      'Add one lifestyle question before moving to solutions.',
    ],
    whyItMatters: 'Lifestyle and history are the missing link to root-cause education — without them the solution sounds like just another product.',
    practice: [
      {
        kind: 'reference',
        text: '我聽到你說皮膚易潮紅、毛孔大，而且你已經試過很多雷射都沒改善，難怪你會覺得沒信心。我先幫你整理一下你做過的每一項，再告訴你為什麼效果不明顯。',
        gloss:
          "I hear that your skin flushes easily and your pores are large, and you've already tried many lasers without improvement — no wonder you feel unsure. Let me first go through everything you've done, then explain why the results weren't obvious.",
        attribution: 'Role model (Irene Wong) — XinNi_ICC_Report_v2, Section B (English gloss added by this app).',
      },
      {
        kind: 'suggested',
        text: 'Before I explain the treatment — what does your daily routine look like? Do you use sunscreen every day?',
        attribution: 'Suggested phrasing',
      },
    ],
    sources: [T('Script step 2 — DISCOVERY C1 (2–3 min)'), X('Section B — Did well / Gap / Role model / Coaching tip')],
    tint: 'var(--green-50)',
  },
  {
    id: 'product',
    emoji: '💡',
    title: 'Product Knowledge',
    tagline: 'Concern → cause → solution. Always mention the AI Skin Analysis.',
    duration: '2–3 min',
    commonMistake: [
      'No AI Skin Analysis mention; no 3-light system explained.',
      'Listing services instead of telling a root-cause story.',
      'No doctor or specialist credited; no success story shared.',
    ],
    betterApproach: [
      'Connect their specific concern → specific solution.',
      'Mention the 3 light types by purpose (not just by name).',
      'AI Skin Analysis = key differentiator — always mention!',
      'Reference testimonials if possible.',
      'Spend one sentence on WHY this is happening before naming the treatment.',
      'Add a doctor / specialist credibility line when introducing the AI scan.',
    ],
    whyItMatters: 'Connecting cause to solution builds far more conviction — the treatment becomes a logical next step rather than another product to try.',
    practice: [
      {
        kind: 'reference',
        text: '我們的皮膚科醒生會亲自審查你的報告',
        gloss: 'Our dermatologist will personally review your report.',
        attribution: 'XinNi_ICC_Report_v2 — Focus area 4 credibility line (English gloss added by this app).',
      },
      {
        kind: 'suggested',
        text: 'Because your skin has been through many strong treatments, the barrier may be weaker — that is why it flushes. So we start with the AI Skin Analysis, then the 3-light therapy focuses on calming and repairing first.',
        attribution: 'Suggested phrasing',
      },
    ],
    sources: [T('Script step 3 — PRODUCT KNOWLEDGE C2'), X('Sections C and D; Focus areas 3 and 4')],
    tint: 'var(--lilac-50)',
  },
  {
    id: 'rapport',
    emoji: '❤️',
    title: 'Rapport & Tone',
    tagline: 'Natural flow, empathy, confidence — plus a little EQ magic.',
    commonMistake: [
      'Staying transactional — no compliment, no light humour.',
      "Pitching before acknowledging the customer's frustration.",
    ],
    betterApproach: [
      'Keep a natural, confident tone and let the customer talk.',
      'Name the feeling before offering the solution.',
      'Give a genuine compliment right after the treatment-history question.',
    ],
    whyItMatters: 'Empathy before pitching lowers resistance, and a warm conversation keeps the lead engaged throughout.',
    practice: [
      {
        kind: 'reference',
        text: '你真的很用心在照顧自己的皮膚。',
        gloss: 'You really take such good care of your skin.',
        attribution: 'XinNi_ICC_Report_v2 — EQ Observation, Compliment coaching (English gloss added by this app).',
      },
    ],
    sources: [T('Rapport & Tone criteria "Natural flow, empathy, confidence"; Irene strength "natural, confident tone"'), X('EQ Observation (Unscored); Section E coaching tip')],
    tint: 'var(--pink-50)',
  },
  {
    id: 'objection',
    emoji: '🧠',
    title: 'Objection Handling',
    tagline: 'Acknowledge, reassure, then offer a concrete next step.',
    commonMistake: [
      'Not acknowledging frustration from multiple failed past treatments before pitching again.',
      'When the customer hedges ("考虑一下" / consider first), offering no specific incentive.',
    ],
    betterApproach: [
      'When a customer signals fatigue from past treatments, name it out loud first.',
      'Reassure there is no obligation — make the first visit feel safe.',
      'Turn hesitation into a reason to act (gift + deadline + specific slot).',
    ],
    whyItMatters: '"Consider first" usually means no booking. Reassurance plus a concrete reason keeps the momentum.',
    practice: [
      {
        kind: 'reference',
        text: "You're not committing to anything, just come and let the doctor take a look.",
        attribution: 'CSC_Call_Template_Jun15 — Script step 4, "If hesitant".',
      },
      {
        kind: 'reference',
        text: '難怪你會有點怕…',
        gloss: 'No wonder you feel a little worried…',
        attribution: 'XinNi_ICC_Report_v2 — Section E coaching tip (English gloss added by this app).',
      },
    ],
    sources: [T('Script step 4 — "If hesitant"'), X('Section E — Objection Handling')],
    tint: 'var(--sky-50)',
  },
  {
    id: 'urgency',
    emoji: '🎁',
    title: 'Urgency & Offer',
    tagline: 'Name the gift. Name the deadline. Make it repeatable.',
    commonMistake: [
      'No one mentions the 2-week promotional deadline.',
      'No one offers the free skincare gift at close.',
      'Incentive language trails off or is unclear.',
    ],
    betterApproach: [
      'ALWAYS mention the 2-week deadline + free skincare gift.',
      'Script a fixed one-line urgency close: named gift + clear timeframe + limited-slot cue.',
      'Rehearse it so it survives even a bad connection.',
    ],
    whyItMatters: 'Mentioning the deadline creates urgency — described in the team report as the #1 booking driver. The gift is a concrete reason to act NOW, not "next week".',
    practice: [
      {
        kind: 'reference',
        text: '本星期內預約首次進體驗，我們會送上兩星期免費保養品組合，幫你在家也能繼續讓皮膚實你。名額每週只有少數兩個名額。',
        gloss:
          "Book your first trial within this week and we'll give you a two-week free skincare set, so your skin keeps improving at home. There are only a couple of slots each week.",
        attribution: 'Role model (Irene Wong) — XinNi_ICC_Report_v2, Section F (English gloss added by this app).',
      },
    ],
    sources: [T('Universal Gaps — Entire Team (deadline, gift)'), X('Section F — Urgency & Offer; Focus area 2')],
    tint: 'var(--yellow-50)',
  },
  {
    id: 'closing',
    emoji: '📅',
    title: 'Closing',
    tagline: 'Two specific options. Confirm before hanging up.',
    duration: '1 min',
    commonMistake: [
      'Did NOT book a specific date/time.',
      'Ending with "consider first" — lead uncommitted.',
      'Handing the close to a senior colleague instead of securing it.',
    ],
    betterApproach: [
      "Give 2 specific options — don't ask an open 'when are you free'.",
      'Confirm the appointment before hanging up!',
      'Recap what happens at the visit and when you will send a reminder.',
      'Only loop in a colleague after the booking is locked in.',
    ],
    whyItMatters: "Always end with a confirmed slot — 'Consider first' = no booking.",
    practice: [
      {
        kind: 'reference',
        text: '那我幫你先鉛住星期六上午十點，到時我們的專員會在現場接待你，你只需要提前十分鐘到就好，我們星期五再發訊息提醒你。',
        gloss: "Let me lock in Saturday 10am for you. Our specialist will receive you on site — just arrive 10 minutes early, and we'll message you a reminder on Friday.",
        attribution: 'Role model (Irene Wong) — XinNi_ICC_Report_v2, Section G (English gloss added by this app).',
      },
      {
        kind: 'reference',
        text: '那我幫你安排星期六 上午十點好嗎？',
        gloss: 'Shall I arrange Saturday 10am for you?',
        attribution: 'XinNi_ICC_Report_v2 — Focus area 1 (English gloss added by this app).',
      },
    ],
    sources: [T('Script step 4 — CLOSE (1 min); Universal gap "No specific date/time confirmed"'), X('Section G; Focus area 1')],
    tint: 'var(--pink-50)',
  },
];

/** Reference lines from the team's ICC 秘籍 playbook, added to the matching lessons. */
const PLAYBOOK_EXAMPLES: Array<[LessonId, string, string, string]> = [
  ['introduction', 'Hello 我是UR Klinik一对一皮肤顾问 [名字]', "Hello, I'm [name], your one-to-one skin consultant from UR Klinik.", 'Ice Breaker (I)'],
  ['discovery', '请问你面临什么皮肤困扰呢? … 你的斑点是一点点还是一片片的?', 'What skin concern are you facing? … Are the spots small, or in patches?', 'Content (C) · Day 5 call'],
  ['product', '你来了我们会先做AI皮肤检测，医生会看斑点种类和黑色素的层次，再精准对症下药打散黑色素，过程不痛没有修复期，很安全～', 'We start with an AI skin analysis; the doctor checks the pigment type and depth, then targets it precisely. Painless, no downtime.', 'Content (C)'],
  ['objection', '这个是保护消费者权益哦给你知道 如果你觉得没效果/服务不好 都可以申请无条件退款', 'To protect you as a customer: if there is no effect or the service is poor, you can request an unconditional refund.', 'Content (C) · Refund policy'],
  ['urgency', '我可以先帮你把优惠和整套限量Skin care Set 先留起来给你', 'I can hold the promotion and the full limited skincare set for you first.', 'Day 4'],
  ['closing', '我们的营业时间是 星期一到星期六 11am-7pm哦～ Last appointment 是530pm · 你通常weekday也方便吗? 还是只有周末可以呢?', 'We are open Mon–Sat 11am–7pm, last appointment 5:30pm. Are weekdays convenient, or only weekends?', 'Closing (C)'],
];
for (const [id, text, gloss, where] of PLAYBOOK_EXAMPLES) {
  const lesson = LESSONS.find((l) => l.id === id);
  if (!lesson) continue;
  lesson.practice.push({ kind: 'reference', text, gloss, attribution: `ICC 秘籍 playbook — ${where} (English gloss added by this app).` });
  lesson.sources.push(P(`NEW CUSTOMER — ${where}`));
}

export const CALL_FLOW = [
  { step: 1, title: 'Introduction', duration: '30 sec', emoji: '🎤', lessonId: 'introduction' as LessonId },
  { step: 2, title: 'Discovery — C1', duration: '2–3 min', emoji: '🔍', lessonId: 'discovery' as LessonId },
  { step: 3, title: 'Product Knowledge — C2', duration: '2–3 min', emoji: '💡', lessonId: 'product' as LessonId },
  { step: 4, title: 'Close — Book Date/Time', duration: '1 min', emoji: '📅', lessonId: 'closing' as LessonId },
];

export const PRACTICE_SCENARIOS = [
  { id: 'think', customer: 'I need to think about it.', focus: 'Reassure + offer two specific slots + mention the gift/deadline.' },
  { id: 'price', customer: 'Your price is expensive.', focus: 'Acknowledge, reframe the trial as a low-risk first step, invite to the AI Skin Analysis.' },
  { id: 'laser', customer: 'I already tried laser before.', focus: 'Empathise with the past experience, explain root cause, connect to a different approach.' },
  { id: 'time', customer: "I don't have time this week.", focus: 'Offer two specific options next week and confirm one before hanging up.' },
];

export const getLesson = (id?: LessonId) => LESSONS.find((l) => l.id === id);
