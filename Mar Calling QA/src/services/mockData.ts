/**
 * DEMO DATA — fictional staff profiles and synthetic call transcripts.
 *
 * Nothing here is real customer data. Every demo call is a generated transcript
 * that is scored by the SAME evaluator the app uses for pasted
 * transcripts — so all dashboard numbers, findings and evidence are derived
 * from transcript lines rather than hard-coded.
 *
 * Replace with a database query in production.
 */
import { PRIMARY_FRAMEWORK } from '@/config/frameworks';
import { LEAD_SOURCES, OUTLETS, REVIEWERS } from '@/config/organisation';
import { SAMPLE_CALL_META, SAMPLE_TRANSCRIPT } from '@/content/sampleTranscript';
import type { Call } from '@/types/call';
import type { QAReview } from '@/types/qa';
import type { Staff } from '@/types/staff';
import { formatDuration } from './qaEvaluator/transcriptParser';
import { evaluateWithMock } from './qaEvaluator/mockEvaluator';
import { statusForScore } from './scoring';

export const DEMO_STAFF: Staff[] = [
  {
    id: 'yiling',
    name: 'Yiling',
    role: 'Senior CSC Consultant',
    outlet: 'BM',
    joinedMonth: '2024-02',
    avatar: { skin: '#F3D2B3', hair: '#2D2323', hairStyle: 'long', shirt: '#F6C9CF', accessory: 'earrings' },
    isDemo: true,
    showInTeam: true,
    motto: 'Listen first, then light the way.',
  },
  {
    id: 'meredith',
    name: 'Meredith',
    role: 'CSC Consultant',
    outlet: 'Kuala Lumpur',
    joinedMonth: '2024-09',
    avatar: { skin: '#E9BF9A', hair: '#5A3A2A', hairStyle: 'bob', shirt: '#BFD8B8', accessory: 'glasses' },
    isDemo: true,
    showInTeam: true,
    motto: 'Every “maybe” is a chance.',
  },
  {
    id: 'suzanne',
    name: 'Suzanne',
    role: 'CSC Consultant',
    outlet: 'Penang',
    joinedMonth: '2025-03',
    avatar: { skin: '#F6DCC3', hair: '#1F1A1E', hairStyle: 'bun', shirt: '#FFE39B', accessory: 'clip' },
    isDemo: true,
    showInTeam: true,
    motto: 'Warm voice, clear next step.',
  },
  {
    id: 'adeline',
    name: 'Adeline',
    role: 'CSC Consultant',
    outlet: 'Johor Bahru',
    joinedMonth: '2025-06',
    avatar: { skin: '#D9A882', hair: '#3B2A22', hairStyle: 'ponytail', shirt: '#CFE0F0' },
    isDemo: true,
    showInTeam: true,
    motto: 'Small steps, big smiles.',
  },
  {
    id: 'demo-agent',
    name: 'Demo Agent',
    role: 'Sample profile (fictional)',
    outlet: 'BM',
    joinedMonth: '2026-09',
    avatar: { skin: '#EFC7A5', hair: '#4A3B35', hairStyle: 'short', shirt: '#E7E2F5' },
    isDemo: true,
    showInTeam: false,
  },
];

// ─── deterministic random ──────────────────────────────────────────────────
function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Feature =
  | 'greeting' | 'name' | 'brand' | 'purpose' | 'customerName' | 'icebreaker' | 'connectionIssue'
  | 'concern' | 'clarify' | 'mirror' | 'duration' | 'previous' | 'empathy' | 'compliment' | 'lifestyle' | 'emotion'
  | 'aiScan' | 'doctor' | 'rootCause' | 'concernSolution' | 'light' | 'lightPurpose' | 'testimonial' | 'experience' | 'branches'
  | 'recommend' | 'offer' | 'hesitation' | 'noObligation' | 'deadline' | 'gift' | 'slots'
  | 'twoOptions' | 'confirmed' | 'recap' | 'handoff' | 'humor' | 'flow';

/** Base probability each behaviour appears; staff skill and month growth shift these. */
const BASE: Record<Feature, number> = {
  greeting: 0.97, name: 0.92, brand: 0.86, purpose: 0.88, customerName: 0.7, icebreaker: 0.55, connectionIssue: 0.08,
  concern: 0.97, clarify: 0.5, mirror: 0.62, duration: 0.8, previous: 0.9, empathy: 0.8, compliment: 0.35, lifestyle: 0.66, emotion: 0.72,
  aiScan: 0.88, doctor: 0.55, rootCause: 0.45, concernSolution: 0.85, light: 0.88, lightPurpose: 0.72, testimonial: 0.6, experience: 0.45, branches: 0.5,
  recommend: 0.88, offer: 0.9, hesitation: 0.62, noObligation: 0.78, deadline: 0.62, gift: 0.6, slots: 0.4,
  twoOptions: 0.74, confirmed: 0.66, recap: 0.6, handoff: 0.12, humor: 0.25, flow: 0.82,
};

interface StaffProfile {
  skill: number; // added to every positive behaviour
  growth: number; // added per month (0 = April)
  focus: Partial<Record<Feature, number>>; // behaviour-specific adjustments
}

const PROFILES: Record<string, StaffProfile> = {
  yiling: { skill: 0.03, growth: 0.012, focus: { lifestyle: 0.15, emotion: 0.12, testimonial: 0.15, confirmed: 0.08 } },
  meredith: { skill: -0.12, growth: 0.04, focus: { confirmed: 0.1, twoOptions: 0.1, gift: 0.12, brand: -0.05 } },
  suzanne: { skill: -0.1, growth: 0.022, focus: { confirmed: -0.1, gift: -0.08, deadline: -0.08, empathy: 0.1 } },
  adeline: { skill: -0.16, growth: 0.034, focus: { brand: -0.18, name: -0.08, purpose: -0.1, lightPurpose: 0.05 } },
};

const NEGATIVE: Feature[] = ['connectionIssue', 'hesitation', 'handoff'];
const MONTHS = ['2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09'];
const CALLS_PER_MONTH = [16, 18, 20, 22, 24, 27];

const CUSTOMERS = ['Ms Lee', 'Ms Wong', 'Ms Chan', 'Ms Lim', 'Ms Ng', 'Ms Ooi', 'Ms Goh', 'Ms Teh', 'Ms Yap', 'Ms Koh', 'Ms Loh', 'Ms Chong'];
const CONCERNS = [
  { say: 'Mainly acne marks on my cheeks, and my pores are quite big.', short: 'acne marks and big pores', sensitive: false },
  { say: 'I have dark spots and some pigmentation on both cheeks.', short: 'dark spots and pigmentation', sensitive: false },
  { say: 'My skin gets red easily and feels sensitive, especially after facials.', short: 'redness and sensitive skin', sensitive: true },
  { say: 'My skin looks dull and quite oily, and I still get pimples.', short: 'dull, oily skin and pimples', sensitive: false },
];
const SLOTS: Array<[string, string, string, string]> = [
  ['Tuesday', '11am', 'Thursday', '3pm'],
  ['Saturday', '10am', 'Sunday', '2pm'],
  ['Wednesday', '4pm', 'Friday', '12pm'],
  ['Monday', '2pm', 'Saturday', '11am'],
];

interface Line {
  who: 'Consultant' | 'Customer';
  text: string;
}

function buildTranscript(f: Record<Feature, boolean>, rnd: () => number, ctx: { agent: string; outlet: string; source: string; mixed: boolean }) {
  const pick = <T,>(arr: T[]) => arr[Math.floor(rnd() * arr.length)];
  const cust = pick(CUSTOMERS);
  const concern = pick(CONCERNS);
  const [d1, t1, d2, t2] = pick(SLOTS);
  const L: Line[] = [];
  const A = (text: string) => L.push({ who: 'Consultant', text });
  const C = (text: string) => L.push({ who: 'Customer', text });
  const filler = f.recommend ? '' : 'Um, ';

  // Opening
  if (f.connectionIssue) {
    A('Hello? Can you hear me?');
    C("Hello? Sorry, can you hear me? The line is bad.");
    A('Can you hear me now? Hello?');
    C('Ah, okay, now can.');
  }
  const hello = f.greeting ? (ctx.mixed ? '你好' : pick(['Hello, good morning!', 'Hi, good afternoon!'])) : '';
  A(`${hello} ${f.customerName ? `Is this ${cust}?` : 'Is this the owner of this number?'}`.trim());
  C('Yes, speaking.');
  const who = f.name ? `this is ${ctx.agent}` : "I'm calling";
  const from = f.brand ? 'from U.R. Klinik' : 'from the clinic';
  const why = f.purpose ? ` I'm following up on the enquiry you left on our ${ctx.source} page.` : ' I would like to share about our skin treatments.';
  A(`Hi, ${who} ${from}.${why}`);
  C(f.purpose ? 'Oh yes, I remember seeing your ad.' : 'Oh, okay. What is it about?');
  if (f.icebreaker) A("Thanks for picking up, hope you're having a good day!");

  // Discovery
  if (f.concern) A("May I know what's bothering you most about your skin at the moment?");
  else A('We have some treatments that might interest you.');
  C(f.concern ? concern.say : `Actually, ${concern.say.charAt(0).toLowerCase()}${concern.say.slice(1)}`);
  if (f.clarify) {
    A('Can you describe how it looks, is there any redness or peeling?');
    C(concern.sensitive ? 'Some redness, but no peeling.' : 'Not really, just the marks and texture.');
  }
  if (f.duration) {
    A('How long have you had this problem?');
    C(pick(['About two years already.', 'Since last year.', 'Quite long, maybe three years.']));
  }
  if (f.previous) {
    A('Have you tried any treatments before?');
    C('Yes, I did laser and some facials before, but not much improvement.');
  }
  if (f.empathy || f.compliment) {
    A(`${f.empathy ? 'No wonder you feel frustrated, I understand.' : 'Okay.'}${f.compliment ? " You're really diligent about your skin." : ''}`);
  }
  if (f.lifestyle) {
    A('What does your daily skincare routine look like? Do you use sunscreen?');
    C('Not every day, and I sleep quite late.');
  }
  if (f.emotion) {
    A('How does it affect you day to day? Does it bother your confidence?');
    C('Yes, I feel a bit shy without makeup.');
  }
  if (f.mirror) A(`So your main concern is the ${concern.short}, I hear you.`);

  // Solution
  const ack = () => f.flow && C(pick(['Oh, okay.', 'I see.', 'Okay, I understand.', 'Mm, okay.']));
  if (f.aiScan) {
    A(`First we will do an AI Skin Analysis to see what's happening underneath your skin.${f.doctor ? ' Our doctor will review the report with you.' : ''}`);
    ack();
  }
  if (f.rootCause) A('Because of repeated strong treatments, your skin barrier may be weaker, that is why the skin reacts easily.');
  const treatment = f.light ? 'our 3-light therapy' : 'a facial treatment that can help';
  const rec = f.recommend ? 'I recommend' : 'maybe you can try';
  A(`${filler}${f.concernSolution ? `For your ${concern.short}, ` : ''}${f.concernSolution ? rec : rec.charAt(0).toUpperCase() + rec.slice(1)} ${treatment}.`);
  ack();
  if (f.light && f.lightPurpose) A('The red light calms redness, the blue light helps with acne bacteria, and the yellow light helps brighten the skin.');
  C('Is it painful?');
  A("It's very gentle, and there is no downtime.");
  if (f.testimonial) {
    A('Many of our customers with a similar concern have seen good results.');
    ack();
  }
  if (f.experience || f.branches) {
    A(
      [f.experience ? 'We have 12 years of experience with this concern' : '', f.branches ? `our ${ctx.outlet} outlet is quite near you` : '']
        .filter(Boolean)
        .join(', and ') + '.',
    );
  }

  // Offer & objection
  if (f.offer) A('Our first-time trial package includes the AI Skin Analysis and one session.');
  else A('You can come in and see how it works.');
  if (f.humor) C('Sounds nice, haha.');
  if (f.hesitation) {
    C(ctx.mixed ? 'Okay lah, 我考慮一下先.' : pick(['Sounds good, but I need to think about it first.', 'Hmm, let me think about it first.']));
    A(f.noObligation ? "I understand. You're not committing to anything, just come and let the doctor take a look." : 'Okay, sure.');
  }
  if (!f.flow) A('We have helped a lot of people with this kind of skin, so the treatment is very suitable and you can see the improvement step by step when you follow the full plan with us.');
  if (f.deadline) A(ctx.mixed ? '這個優惠兩個星期內有效。' : 'This promotion is only valid within the next 2 weeks.');
  if (f.gift) A(ctx.mixed ? '現在預約我們會送你免費保養品 set.' : "If you book now, you'll also get a free skincare gift set.");
  if (f.slots) A('There are only a few slots left this week.');
  if (f.humor) A("Haha, I'll make it easy for you!");

  // Close
  if (f.twoOptions) A(`I have ${d1} at ${t1} or ${d2} at ${t2}, which one suits you better?`);
  else A('When are you free to come in?');
  if (f.confirmed) {
    C(`${d1} ${t1} is okay.`);
    A(`Great, I've booked you for ${d1} at ${t1} at our ${ctx.outlet} outlet.`);
    C('Okay, see you then.');
    if (f.recap) A("Please arrive 10 minutes early, and I'll WhatsApp you a reminder the day before.");
  } else {
    C(pick(["Let me check my schedule first and I'll let you know.", 'Not sure yet, let me check first.']));
    if (f.handoff) A('Okay, I will ask my senior colleague to call you back.');
    else if (f.recap) A("Okay, I'll WhatsApp you the details.");
  }
  A(`Thank you${f.customerName ? ` ${cust}` : ''}, have a nice day!`);
  C('Thank you, bye.');

  // timestamps
  let t = 0;
  const out: string[] = [];
  for (const line of L) {
    out.push(`[${formatDuration(t)}] ${line.who}: ${line.text}`);
    t += Math.max(3, Math.round(line.text.length / 9 + rnd() * 6));
  }
  return { transcript: out.join('\n'), durationSec: t + 4 };
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

let cachedCalls: Call[] | null = null;

export function generateDemoCalls(): Call[] {
  if (cachedCalls) return cachedCalls;
  const rnd = mulberry32(20260915);
  const team = DEMO_STAFF.filter((s) => s.showInTeam);
  const calls: Call[] = [];
  let seq = 1;

  MONTHS.forEach((month, mi) => {
    const count = CALLS_PER_MONTH[mi];
    const maxDay = month === '2026-09' ? 15 : 28;
    for (let i = 0; i < count; i++) {
      const staff = team[i % team.length];
      const profile = PROFILES[staff.id];
      const features = {} as Record<Feature, boolean>;
      const callMood = (rnd() - 0.5) * 0.3; // some calls simply go better than others
      (Object.keys(BASE) as Feature[]).forEach((k) => {
        const neg = NEGATIVE.includes(k);
        const adj = neg ? 0 : profile.skill + profile.growth * mi * 1.5 + (profile.focus[k] ?? 0);
        const p = Math.min(0.98, Math.max(0.02, BASE[k] + adj + callMood + (rnd() - 0.5) * 0.1));
        features[k] = rnd() < p;
      });
      const day = 1 + Math.floor(rnd() * maxDay);
      const callDate = `${month}-${pad(day)}`;
      const outlet = rnd() < 0.7 ? staff.outlet : OUTLETS[Math.floor(rnd() * OUTLETS.length)];
      const source = LEAD_SOURCES[Math.floor(rnd() * LEAD_SOURCES.length)];
      const mixed = rnd() < 0.2;
      const { transcript, durationSec } = buildTranscript(features, rnd, { agent: staff.name, outlet, source, mixed });
      const id = `CALL-${month.replace('-', '')}-${String(seq++).padStart(3, '0')}`;
      const leadNumber = `0190${String(Math.floor(rnd() * 1e6)).padStart(6, '0')}`;
      const evaluation = evaluateWithMock({
        callId: id,
        staffName: staff.name,
        callDate,
        duration: durationSec,
        outlet,
        leadSource: source,
        language: mixed ? 'Mixed (EN / 中文)' : 'English',
        transcript,
        frameworkId: PRIMARY_FRAMEWORK.id,
      });
      evaluation.createdAt = `${callDate}T10:00:00.000Z`;

      calls.push({
        id,
        staffId: staff.id,
        staffName: staff.name,
        callDate,
        durationSec,
        leadNumber,
        outlet,
        leadSource: source,
        language: mixed ? 'Mixed (EN / 中文)' : 'English',
        reviewer: REVIEWERS[0],
        frameworkId: PRIMARY_FRAMEWORK.id,
        transcript,
        transcriptSource: 'demo-synthetic',
        evaluation,
        qaReviews: demoReviews(evaluation.overallScore, evaluation.overallPercentage, callDate, rnd),
        createdAt: `${callDate}T10:00:00.000Z`,
        isDemo: true,
      });
    }
  });

  // The fictional sample call from PART 39
  const sampleId = 'CALL-DEMO-SAMPLE';
  const sampleEval = evaluateWithMock({
    callId: sampleId,
    staffName: SAMPLE_CALL_META.staffName,
    callDate: SAMPLE_CALL_META.callDate,
    duration: SAMPLE_CALL_META.durationSec,
    outlet: SAMPLE_CALL_META.outlet,
    leadSource: SAMPLE_CALL_META.leadSource,
    language: SAMPLE_CALL_META.language,
    transcript: SAMPLE_TRANSCRIPT,
    frameworkId: PRIMARY_FRAMEWORK.id,
  });
  sampleEval.createdAt = `${SAMPLE_CALL_META.callDate}T09:30:00.000Z`;
  calls.push({
    id: sampleId,
    staffId: 'demo-agent',
    ...SAMPLE_CALL_META,
    frameworkId: PRIMARY_FRAMEWORK.id,
    transcript: SAMPLE_TRANSCRIPT,
    transcriptSource: 'demo-synthetic',
    evaluation: sampleEval,
    qaReviews: [],
    createdAt: sampleEval.createdAt,
    isDemo: true,
  });

  cachedCalls = calls.sort((a, b) => b.callDate.localeCompare(a.callDate) || b.id.localeCompare(a.id));
  return cachedCalls;
}

/** A realistic share of demo calls already carry a human QA decision. */
function demoReviews(aiScore: number, aiPct: number, date: string, rnd: () => number): QAReview[] {
  const r = rnd();
  if (r > 0.3) return [];
  const edited = r < 0.05;
  const finalScore = edited ? Math.min(100, aiScore + (rnd() < 0.5 ? -4 : 3)) : aiScore;
  const { percentage, status } = statusForScore(PRIMARY_FRAMEWORK.id, finalScore);
  return [
    {
      id: `rev-${date}-${Math.floor(rnd() * 1e6)}`,
      action: edited ? 'edited' : 'accepted',
      aiScore,
      aiPercentage: aiPct,
      finalScore,
      finalPercentage: percentage,
      finalStatus: status,
      reviewer: REVIEWERS[0],
      comment: edited ? 'Adjusted after listening to the recording.' : 'AI result reviewed and accepted.',
      overrideReason: edited
        ? finalScore > aiScore
          ? 'Customer name used in a paraphrase the keyword scan missed.'
          : 'Offer was mentioned but unclear on the recording.'
        : '',
      timestamp: `${date}T16:30:00.000Z`,
    },
  ];
}
