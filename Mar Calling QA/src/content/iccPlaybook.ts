/**
 * ICC 秘籍 — the team's New Customer playbook (Google Sheet, exported as PDF).
 *
 * Script lines are copied verbatim from the sheet (Simplified Chinese as written).
 * English glosses are added by this app and labelled unofficial. The sheet is
 * used as coaching reference and as extra vocabulary for the evaluators; it does
 * NOT change the ICC Benchmark section weights, which come from the CSC Call Template.
 */
import type { DetectorId, SourceRef } from '@/types/framework';

export const PLAYBOOK_DOCUMENT = 'ICC 秘籍 - Google Sheets.pdf' as const;
export const P = (note: string): SourceRef => ({ document: PLAYBOOK_DOCUMENT, note });

export interface PlaybookLine {
  text: string;
  gloss: string;
}

export interface PlaybookStep {
  code: 'I' | 'C' | 'Close';
  title: string;
  emoji: string;
  lines: PlaybookLine[];
}

/** DAY 1 — first contact, structured as Ice Breaker (I) · Content (C) · Closing (C). */
export const DAY1_SCRIPT: PlaybookStep[] = [
  {
    code: 'I',
    title: 'Ice Breaker',
    emoji: '👋',
    lines: [
      { text: 'Hello 我是UR Klinik一对一皮肤顾问 [名字]', gloss: "Hello, I'm [name], your one-to-one skin consultant from UR Klinik." },
      { text: '选择祛斑，不只是看价格 更要看专业与保障', gloss: "When choosing pigmentation removal, don't just look at price — look at expertise and guarantees." },
      { text: '【URKLINIK 12年专注祛斑】不满意全额退款保障 · 采用 ISO9001 品质管理标准100%安全有效', gloss: '12 years focused on pigmentation · full refund if not satisfied · ISO 9001 quality standard, safe and effective.' },
    ],
  },
  {
    code: 'C',
    title: 'Content',
    emoji: '💡',
    lines: [
      { text: '请问你面临什么皮肤困扰呢?', gloss: 'What skin concern are you facing? (show the A–F concern chart)' },
      { text: 'ohhh 没问题 光疗可以帮你祛除 同时可以预防反黑或反弹的问题，做了也更安心', gloss: 'No problem — light therapy can remove it and also prevents darkening or rebound.' },
      { text: '你来了我们会先做AI皮肤检测，医生会看斑点种类和黑色素的层次，再精准对症下药打散黑色素，过程不痛没有修复期，很安全～', gloss: 'We start with an AI skin analysis; the doctor checks the pigment type and depth, then targets it precisely. Painless, no downtime, safe.' },
      { text: '你之前有做过什么祛斑项目吗? 我们现在有新人优惠', gloss: 'Have you done any pigmentation treatment before? We have a first-timer offer now.' },
      { text: '我们Penang, JB, KL 都有 klinik 哦，你是住哪里的呢?', gloss: 'We have clinics in Penang, JB and KL — where do you live?' },
      { text: '我们现在有优惠 很值得～ RM399 NETT没有任何隐藏费用 包含AI皮肤检测 + 专业医生咨询 + 3种光疗护理 + 水光高氧净肤 Facial 护理 + 全套Limited Edition 护肤系列 Skin Care 免费送你～', gloss: 'RM399 NETT, no hidden fees: AI skin analysis + doctor consultation + 3 light therapies + hydrating oxygen facial + a free limited-edition skincare set.' },
      { text: '这个是最多顾客try了都好评的，做完就可以看到明显效果 肤色也会整体提亮 缩小毛孔 保湿补水 紧致肌肤 同时可以预防斑点再生', gloss: 'Our most-reviewed treatment — visible results after one session, brighter tone, smaller pores, hydration, firmer skin, and helps prevent new spots.' },
      { text: '这个是保护消费者权益哦给你知道 如果你觉得没效果/服务不好 都可以申请无条件退款', gloss: 'To protect you as a customer: if you feel there is no effect or the service is poor, you can request an unconditional refund.' },
    ],
  },
  {
    code: 'Close',
    title: 'Closing',
    emoji: '📅',
    lines: [
      { text: '我们的营业时间是 星期一到星期六 11am-7pm哦～ Last appointment 是530pm', gloss: 'We are open Monday–Saturday, 11am–7pm. Last appointment is 5:30pm.' },
      { text: '你通常weekday也方便吗? 还是只有周末可以呢?', gloss: 'Are weekdays usually convenient for you, or only weekends?' },
    ],
  },
];

/** Facts consultants should state correctly. */
export const PLAYBOOK_FACTS: Array<{ emoji: string; label: string; value: string }> = [
  { emoji: '💰', label: 'New customer offer', value: 'RM399 NETT — no hidden fees' },
  { emoji: '🔬', label: 'Included', value: 'AI skin analysis + doctor consultation · 3 light therapies · hydrating oxygen facial (水光高氧净肤) · free limited-edition skincare set' },
  { emoji: '💛', label: 'Gold Light', value: '祛红血丝、抑制黑色素、防反黑 — reduces redness / visible capillaries, inhibits melanin, prevents darkening' },
  { emoji: '🤍', label: 'Spectra White', value: '均匀肤色、祛斑美白 — evens skin tone, lightens pigmentation' },
  { emoji: '❤️', label: 'Ruvy Touch', value: '快速祛斑、淡化痘疤痘印 — fast pigment removal, fades acne scars and marks' },
  { emoji: '🛡️', label: 'Refund policy', value: 'Unconditional full refund if no effect or poor service (first trial only)' },
  { emoji: '🏆', label: 'Credibility', value: '12 years focused on pigmentation · ISO 9001 quality management' },
  { emoji: '📍', label: 'Locations', value: 'Penang · JB · KL' },
  { emoji: '🕚', label: 'Opening hours', value: 'Mon–Sat 11am–7pm · last appointment 5:30pm' },
  { emoji: '⏳', label: 'First visit', value: 'About 3 hours (skin analysis + full treatment) · appointment required, no walk-ins' },
];

/** Concern chart shown during Content (A–F). */
export const CONCERN_CHART = ['A · Melasma', 'B · ABNOM', 'C · Age spot', 'D · Freckles', 'E · Uneven skin tone', 'F · Acne scar'];

/** Day-7 concern check — the usual reasons a lead has not booked. */
export const COMMON_CONCERNS = ['预算问题 · Budget', '顾虑效果方面 · Worried about results', '敏感肌肤 · Sensitive skin', '还在安排时间 · Still arranging time', '其他 · Other'];

export interface CadenceStep {
  day: string;
  channel: 'call' | 'whatsapp';
  title: string;
  script?: string;
  gloss: string;
}

/** Follow-up cadence for a new lead that has not booked. */
export const FOLLOW_UP_CADENCE: CadenceStep[] = [
  { day: 'Day 1', channel: 'whatsapp', title: 'Ice Breaker · Content · Closing', gloss: 'The full ICC first-contact script above.' },
  { day: 'Day 2', channel: 'whatsapp', title: 'Promo + Refund Policy', script: '只需 RM399 NETT，皮肤直接变亮变干净 · 无效可退款，安心体验', gloss: 'If no reply on Day 1: send the 399 template (painless, non-invasive, gentle) and the refund policy.' },
  { day: 'Day 3', channel: 'whatsapp', title: 'Before / After', script: 'Dear 你的斑大概也是这样吗? 这是顾客first trial 护理后的效果', gloss: 'Share a customer before/after from their first trial.' },
  { day: 'Day 4', channel: 'whatsapp', title: 'Hold the offer', script: '你这几天会有时间过来吗? 我可以先帮你把优惠和整套限量Skin care Set 先留起来给你', gloss: 'Offer to hold the promotion and the limited skincare set for them.' },
  { day: 'Day 5', channel: 'call', title: 'First call', script: 'Hello你好请问是XXX吗? 你那天有询问的祛斑护理 · 你有收到我的whatsapp吗? · 你是面临斑点问题对吗? 你的斑点是一点点还是一片片的?', gloss: "Call: reference their enquiry and the WhatsApp, confirm the concern, and ask whether the spots are small or patchy. If no answer, WhatsApp: \"I just called, you were probably busy.\"" },
  { day: 'Day 6', channel: 'whatsapp', title: 'Call to action', script: 'Hi dear 你这个星期安排到时间过来吗? 我们的护理一次就可以看到明显效果哦', gloss: 'Ask about this week; one session shows visible results and helps prevent rebound.' },
  { day: 'Day 7', channel: 'whatsapp', title: 'Concern check', script: 'Dear 你忘了回复我 是有什么顾虑是吗? 1. 预算问题 2. 顾虑效果方面 3. 敏感肌肤 4. 还在安排时间 5. 其他', gloss: 'Ask which concern is holding them back: budget, results, sensitive skin, timing, other.' },
  { day: 'Day 13', channel: 'call', title: 'Follow-up call', script: 'Dear 你最近有时间过来吗? 只是想要跟你followup一下 因为我们有保留skin care set给你哦', gloss: 'Follow-up call: remind them the skincare set is being held for them.' },
  { day: 'Day 14', channel: 'whatsapp', title: 'Promo again (another phone)', script: '想遮住? 想解决?', gloss: 'Send the "Heaven / Hell" template from a different phone: cover it up, or solve it?' },
  { day: 'Day 21', channel: 'call', title: 'Final call · shuffle leads', gloss: 'Last call; if no answer, WhatsApp. The lead is then shuffled to another consultant.' },
];

/** Verbatim playbook lines that show each behaviour. Shown on coaching cards. */
export const PLAYBOOK_LINES: Partial<Record<DetectorId, string>> = {
  agent_name: 'Hello 我是UR Klinik一对一皮肤顾问 [名字]',
  brand_name: 'Hello 我是UR Klinik一对一皮肤顾问 [名字]',
  call_purpose: '你那天有询问的祛斑护理 · 你有收到我的whatsapp吗?',
  concern_probe: '请问你面临什么皮肤困扰呢?',
  clarify_vague: '你的斑点是一点点还是一片片的?',
  previous_treatment: '你之前有做过什么祛斑项目吗?',
  ai_skin_analysis: '你来了我们会先做AI皮肤检测，医生会看斑点种类和黑色素的层次',
  light_system: 'Gold Light · Spectra White · Ruvy Touch — 3种光疗护理',
  light_purpose: 'Gold Light：祛红血丝、抑制黑色素、防反黑 · Spectra White：均匀肤色、祛斑美白 · Ruvy Touch：快速祛斑、淡化痘疤痘印',
  concern_to_solution: 'ohhh 没问题 光疗可以帮你祛除 同时可以预防反黑或反弹的问题',
  root_cause: '医生会看斑点种类和黑色素的层次，再精准对症下药打散黑色素',
  differentiation_testimonial: '这个是最多顾客try了都好评的，做完就可以看到明显效果 · 过程不痛没有修复期',
  clinic_experience: '【URKLINIK 12年专注祛斑】采用 ISO9001 品质管理标准',
  clinic_branches: '我们Penang, JB, KL 都有 klinik 哦，你是住哪里的呢?',
  doctor_credibility: '医生会看斑点种类和黑色素的层次，再精准对症下药',
  no_obligation: '如果你觉得没效果/服务不好 都可以申请无条件退款',
  trial_risk_reduction: '这个是保护消费者权益哦给你知道 如果你觉得没效果/服务不好 都可以申请无条件退款',
  hesitation_incentive: '我可以先帮你把优惠和整套限量Skin care Set 先留起来给你',
  skincare_gift: '全套Limited Edition 护肤系列 Skin Care 免费送你～',
  clear_offer: 'RM399 NETT没有任何隐藏费用 包含AI皮肤检测 + 专业医生咨询 + 3种光疗护理 + 水光高氧净肤 Facial 护理',
  availability_probe: '你通常weekday也方便吗? 还是只有周末可以呢?',
  recap_next_steps: '首次护理3小时（包含皮肤分析 + 完整疗程）· 需提前预约，不接受 walk in',
};

/** Compact fact sheet for the Claude evaluator prompt. */
export const PLAYBOOK_PROMPT = [
  'TEAM PLAYBOOK (ICC 秘籍, new customer) — use it to recognise these behaviours in any language or paraphrase:',
  '- Ice Breaker: name + "UR Klinik 一对一皮肤顾问"; 12 years focused on pigmentation (12年专注祛斑), ISO 9001, full refund guarantee.',
  '- Content: ask the skin concern (面临什么皮肤困扰; spots small or patchy 一点点还是一片片); AI skin analysis where the doctor checks pigment type and melanin depth (root cause); painless, no downtime (不痛, 没有修复期); ask previous treatments; locations Penang / JB / KL and where the customer lives.',
  '- Offer: RM399 NETT with no hidden fees = AI skin analysis + doctor consultation + 3 light therapies + hydrating oxygen facial + free limited-edition skincare set. Other promotions (e.g. RM199, weekday promos) also exist in real calls.',
  '- The 3 lights by purpose: Gold Light (金光) reduces redness/capillaries, inhibits melanin, prevents darkening; Spectra White (白光) evens tone and lightens spots; Ruvy Touch (红光) removes pigment fast and fades acne marks.',
  '- Refund policy: unconditional refund if no effect or poor service (first trial) — counts as low-risk trial framing and as reassurance.',
  '- Closing: hours Mon–Sat 11am–7pm, last appointment 5:30pm; ask weekday or weekend; first visit about 3 hours; appointment required, no walk-ins; offer to hold the promotion and skincare set (留起来/保留).',
  '- Follow-up cadence: Day 5 first call (references the enquiry and WhatsApp); Day 13 follow-up call ("我们有保留skin care set给你"); Day 21 final call.',
].join('\n');
