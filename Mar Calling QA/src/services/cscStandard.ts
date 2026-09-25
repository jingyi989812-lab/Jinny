/**
 * Checks a call against the CSC standard (src/config/cscStandard.ts):
 * 有效劳动 = 创造需求, produced by 懂得问问题 + 体现专家.
 *
 * Plus the mindset habits and customer objections from the MARCOM manager's
 * coaching framework (src/config/coachingLens.ts).
 *
 * Everything here is UNSCORED. Keyword and position signals only: they show
 * what was said and in what order, never how well it was said.
 */
import { CSC_STANDARD } from '@/config/cscStandard';
import { MINDSET_CHECKS, OBJECTIONS, type MindsetCheck, type ObjectionType } from '@/config/coachingLens';
import type { Call } from '@/types/call';
import type { TranscriptLine } from '@/types/qa';
import { focusForCall } from './campaignFocus';
import { buildContext, DETECTORS, isQuestion } from './qaEvaluator/detectors';
import { parseTranscript } from './qaEvaluator/transcriptParser';

const PRICE = /RM\s?\d|\b(199|198|399|499|1998)\b|价钱|價錢|多少钱|多少錢|promo(tion)?|优惠|優惠|配套|package/i;
const PITCH = /光疗|光療|treatment|护理|護理|facial|检测|檢測|AI|laser|镭射|鐳射|配套|package/i;
const NEXT_STEP = /whatsapp|再(联系|聯絡|打给你|打給你)|我(会|會)(发|發|再)|send (you|the)|follow ?up|等你(消息|回复|回覆)|(明天|下个星期|下個星期).{0,6}(联系|聯絡|打)/i;

export interface StandardQuestions {
  count: number;
  /** Questions asked after the customer had already answered one — going a level deeper. */
  deeper: number;
  meetsTarget: boolean;
  target: number;
  samples: TranscriptLine[];
}

export interface MindsetFlag {
  check: MindsetCheck;
  flagged: boolean;
  evidence?: string;
}

export interface ObjectionHit {
  type: ObjectionType;
  quote: string;
  lineIndex: number;
}

export interface StandardResult {
  questions: StandardQuestions;
  /** 体现专家 — the three pillars, reusing the campaign-focus check. */
  pillars: Array<{ id: string; label: string; present: boolean; quote?: string }>;
  pillarsCovered: number;
  /** 创造需求 — did anything move the customer from symptom to consequence? */
  createdNeed: boolean;
  createdNeedWhy: string;
  mindset: MindsetFlag[];
  objections: ObjectionHit[];
  diarized: boolean;
}

const PILLAR_IDS = ['doctor_led', 'clinic', 'pigmentation'];

export function standardForCall(call: Call): StandardResult {
  const parsed = parseTranscript(call.transcript, call.staffName);
  const ctx = buildContext(parsed.lines, call.staffName);
  const focus = focusForCall(call);

  /* 懂得问问题 — count real questions the consultant asked. */
  const questionLines = ctx.agent.filter((l) => isQuestion(l.text));
  const customerIdx = new Set(ctx.customer.map((l) => l.index));
  const deeper = questionLines.filter((q) => {
    /* a question that lands after the customer has already said something in reply */
    const before = parsed.lines.slice(0, q.index).reverse();
    const lastCustomer = before.find((l) => customerIdx.has(l.index));
    if (!lastCustomer) return false;
    return before.some((l) => l.index < lastCustomer.index && !customerIdx.has(l.index) && isQuestion(l.text));
  }).length;
  const target = CSC_STANDARD.capabilities[0].target;
  const questions: StandardQuestions = {
    count: questionLines.length,
    deeper,
    target,
    meetsTarget: questionLines.length >= target,
    samples: questionLines.slice(0, 2),
  };

  /* 体现专家 — the three pillars from the campaign-focus check. */
  const pillars = PILLAR_IDS.map((id) => {
    const hit = focus.hits.find((h) => h.keyword.id === id);
    return { id, label: hit?.keyword.label ?? id, present: Boolean(hit?.present), quote: hit?.quote };
  });
  const pillarsCovered = pillars.filter((p) => p.present).length;

  /* 创造需求 — did the call go past the symptom to what it costs her? */
  const needSignals: Array<[string, boolean]> = [
    ['asked how long it has been a problem', DETECTORS.duration_probe(ctx).present],
    ['surfaced how it affects her', DETECTORS.emotional_pain(ctx).present],
    ['explained why the skin behaves this way', DETECTORS.root_cause(ctx).present],
    ['clarified a vague concern', DETECTORS.clarify_vague(ctx).present],
  ];
  const met = needSignals.filter(([, ok]) => ok);
  const createdNeed = met.length > 0;

  /* 思维 — the habits underneath. Position matters, so use line order. */
  const firstQuestion = questionLines[0]?.index ?? Infinity;
  const firstPrice = ctx.agent.find((l) => PRICE.test(l.text));
  const firstPitch = ctx.agent.find((l) => PITCH.test(l.text));
  const hesitated = ctx.hesitations.length > 0;
  const booked = DETECTORS.appointment_confirmed(ctx).present;
  const nextStep = ctx.agent.some((l) => NEXT_STEP.test(l.text));

  const flag = (id: string, flagged: boolean, evidence?: string): MindsetFlag => ({
    check: MINDSET_CHECKS.find((m) => m.id === id)!,
    flagged,
    evidence,
  });
  const mindset: MindsetFlag[] = [
    flag('price_mindset', Boolean(firstPrice) && firstPrice!.index < firstQuestion, firstPrice?.text),
    flag('one_shot', hesitated && !booked && !nextStep, ctx.hesitations[0]?.text),
    flag('pitch_before_need', Boolean(firstPitch) && firstPitch!.index < firstQuestion, firstPitch?.text),
  ];

  /* The pushback she actually gave — her lines only. */
  const objections: ObjectionHit[] = [];
  for (const type of OBJECTIONS) {
    const line = ctx.customer.find((l) => type.pattern.test(l.text));
    if (line) objections.push({ type, quote: line.text.length > 120 ? `${line.text.slice(0, 117)}…` : line.text, lineIndex: line.index });
  }

  return {
    questions,
    pillars,
    pillarsCovered,
    createdNeed,
    createdNeedWhy: createdNeed ? `Consultant ${met.map(([label]) => label).join(', ')}.` : 'The call stayed on the symptom and the offer — nothing moved it to what the problem costs her.',
    mindset,
    objections,
    diarized: parsed.diarized,
  };
}

export interface StandardSummary {
  calls: number;
  avgQuestions: number;
  metQuestionTarget: number;
  allThreePillars: number;
  createdNeed: number;
  mindset: Array<{ check: MindsetCheck; count: number; share: number }>;
  objections: Array<{ type: ObjectionType; count: number; share: number }>;
}

export function standardSummary(calls: Call[]): StandardSummary {
  const results = calls.map(standardForCall);
  const n = results.length || 1;
  const pct = (x: number) => Math.round((x / n) * 100);
  return {
    calls: results.length,
    avgQuestions: Math.round((results.reduce((s, r) => s + r.questions.count, 0) / n) * 10) / 10,
    metQuestionTarget: results.filter((r) => r.questions.meetsTarget).length,
    allThreePillars: results.filter((r) => r.pillarsCovered === 3).length,
    createdNeed: results.filter((r) => r.createdNeed).length,
    mindset: MINDSET_CHECKS.map((check) => {
      const count = results.filter((r) => r.mindset.find((m) => m.check.id === check.id)?.flagged).length;
      return { check, count, share: pct(count) };
    }).sort((a, b) => b.count - a.count),
    objections: OBJECTIONS.map((type) => {
      const count = results.filter((r) => r.objections.some((o) => o.type.id === type.id)).length;
      return { type, count, share: pct(count) };
    })
      .filter((o) => o.count > 0)
      .sort((a, b) => b.count - a.count),
  };
}
