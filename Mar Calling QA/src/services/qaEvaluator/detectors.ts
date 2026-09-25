/**
 * MOCK EVALUATOR — keyword heuristics.
 *
 * Each detector looks for an ICC behaviour in the parsed transcript and returns
 * the exact transcript lines it relied on. It never produces text of its own —
 * evidence is always a real line (or a documented absence).
 *
 * Patterns are bilingual (English + Chinese) because CSC calls often code-switch.
 * Keyword matching cannot judge quality or paraphrase — which is why a real
 * Claude evaluator replaces this in production (see claudeEvaluator.ts).
 */
import type { DetectorId } from '@/types/framework';
import type { Confidence, TranscriptLine } from '@/types/qa';

export interface DetectionContext {
  lines: TranscriptLine[];
  agent: TranscriptLine[];
  customer: TranscriptLine[];
  /** Agent lines in the opening window. */
  introAgent: TranscriptLine[];
  /** All lines in the opening window. */
  introLines: TranscriptLine[];
  /** Customer hesitation lines ("I'll think about it"). */
  hesitations: TranscriptLine[];
  /** Concern keywords the customer actually used. */
  customerConcernTerms: string[];
  staffName?: string;
  /** false when speakers are not labelled: agent/customer pools both contain every line. */
  diarized: boolean;
  /** Is this line (possibly) from the customer? Always true when not diarized. */
  maybeCustomer: (l: TranscriptLine) => boolean;
}

export interface Detection {
  applicable: boolean;
  present: boolean;
  /** Lines that show the behaviour (strength evidence) or show the problem (gap evidence). */
  matches: TranscriptLine[];
  /** Lines that give context for a gap (e.g. where the call ended). */
  context: TranscriptLine[];
  confidence: Confidence;
  reason: string;
  /** Extra explanation for a partial/weak observation. */
  detail?: string;
  /** Numeric metric notes (heuristic detectors). */
  metric?: string;
  /** Replaces the behaviour's default gap title when the situation differs (e.g. "not mentioned" vs "poorly explained"). */
  gapTitle?: string;
}

// ─── lexicons ──────────────────────────────────────────────────────────────
export const isQuestion = (t: string) =>
  /[?？]/.test(t) || /^(what|how|which|when|where|why|do|does|did|have|has|can|could|may|are|is)\b/i.test(t) || /(嗎|吗|呢|咩|嘛|係咪|是不是|對不對|对不对)[，。,.!！\s]*$/.test(t) || /(什麼|什么|哪一|多久|幾時|几时|有沒有|有没有)/.test(t);

export const HESITATION =
  /(think about it|think first|consider|not sure|maybe (later|next)|let me (check|think|discuss|ask)|discuss with|ask my (husband|wife|partner|family|mum|mom)|no time|too busy|expensive|too much money|next time|see first|考慮|考虑|想一下|想想|再看看|再說|再说|問問|问问|沒時間|没时间|太貴|太贵|先不用|再考慮|再考虑|考慮看看|考虑看看|沒空|没空|不得空|\bbusy\b|sibuk|fikir dulu|send me (the )?(details|info))/i;

const CONCERN_TERMS: Array<[string, RegExp]> = [
  ['pores', /pores?|毛孔/i],
  ['acne', /acne|pimples?|breakouts?|痘痘|暗瘡|暗疮|粉刺/i],
  ['marks', /scars?|marks|blemish|痘印|痘疤|疤/i],
  ['pigmentation', /pigment|melasma|dark spots?|freckles?|jeragat|斑|[去祛黑](班|般|版)/i],
  ['sensitivity', /sensitiv|redness|flush|red(dens)?\b|敏感|潮紅|潮红|泛紅|泛红/i],
  ['dullness', /dull|uneven (skin )?tone|暗沉|暗黃|暗黄/i],
  ['wrinkles', /wrinkles?|fine lines?|sagging|皺紋|皱纹|細紋|细纹/i],
  ['oily skin', /oily|oil control|出油|油性/i],
  ['dry skin', /\bdry\b|dehydrat|乾燥|干燥/i],
];

const DAY =
  /(monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|this weekend|星期[一二三四五六日天]|禮拜[一二三四五六日天]|礼拜[一二三四五六日天]|週[一二三四五六日]|周[一二三四五六日]|今天|今晚|明天|後天|后天|這個禮拜[一二三四五六日天]?|这个礼拜[一二三四五六日天]?|下個禮拜[一二三四五六日天]?|下个礼拜[一二三四五六日天]?|\bweekend\b|\bweekdays?\b|周末|週末|平日|\bthis (week|saturday|sunday)|\d{1,2}\s?[號号]|\d{1,2}(st|nd|rd|th)\b|[一二三四五六七八九十]{1,3}月|九月尾|月底|hari (isnin|selasa|rabu|khamis|jumaat|sabtu|ahad))/gi;
const TIME = /(\b\d{1,2}(?::\d{2})?\s?(?:am|pm)\b|\b\d{1,2}:\d{2}\b|\d{1,2}\s?[點点]|[一二三四五六七八九十]{1,2}[點点]|上午|下午|早上|晚上|\bmorning\b|\bafternoon\b|\bevening\b)/gi;

const DAY_TEST = new RegExp(DAY.source, 'i');
/** For counting distinct appointment options: weekday names and clock times only. */
const WEEKDAY = /(monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|星期[一二三四五六日天]|禮拜[一二三四五六日天]|礼拜[一二三四五六日天]|週[一二三四五六日]|周[一二三四五六日]|明天|後天|后天)/gi;
const CLOCK = /(\b\d{1,2}(?::\d{2})?\s?(?:am|pm)\b|\b\d{1,2}:\d{2}\b|\d{1,2}\s?[點点]半?|[一二三四五六七八九十]{1,2}[點点]半?)/gi;
const distinct = (text: string, re: RegExp) => new Set((text.match(re) ?? []).map((m) => m.toLowerCase().replace(/\s/g, ''))).size;

// ─── helpers ───────────────────────────────────────────────────────────────
const found = (matches: TranscriptLine[], reason: string, confidence: Confidence = 'high'): Detection => ({
  applicable: true,
  present: true,
  matches: matches.slice(0, 2),
  context: [],
  confidence,
  reason,
});

const missing = (reason: string, context: TranscriptLine[] = [], confidence: Confidence = 'medium'): Detection => ({
  applicable: true,
  present: false,
  matches: [],
  context: context.slice(0, 2),
  confidence,
  reason,
});

const notApplicable = (reason: string): Detection => ({
  applicable: false,
  present: false,
  matches: [],
  context: [],
  confidence: 'medium',
  reason,
});

function scan(lines: TranscriptLine[], re: RegExp, opts: { question?: boolean } = {}): TranscriptLine[] {
  return lines.filter((l) => re.test(l.text) && (!opts.question || isQuestion(l.text)));
}

function simple(
  pool: (c: DetectionContext) => TranscriptLine[],
  re: RegExp,
  foundReason: string,
  missingReason: string,
  opts: { question?: boolean; context?: (c: DetectionContext) => TranscriptLine[] } = {},
) {
  return (c: DetectionContext): Detection => {
    const hits = scan(pool(c), re, opts);
    return hits.length
      ? found(hits, foundReason)
      : missing(`${missingReason} Keyword scan only — a paraphrase may have been missed.`, opts.context?.(c) ?? []);
  };
}

const lastLines = (c: DetectionContext, n = 2) => c.lines.slice(-n);
const lateAgent = (c: DetectionContext) => c.agent.filter((l) => l.index >= c.lines.length * 0.4);

// ─── detectors ─────────────────────────────────────────────────────────────
export const DETECTORS: Record<DetectorId, (c: DetectionContext) => Detection> = {
  warm_greeting: simple(
    (c) => c.introAgent,
    /(\b(hello|hi|hey|helo|hai|good (morning|afternoon|evening)|selamat|assalamualaikum)\b|你好|您好|哈囉|哈啰|喂)/i,
    'Greeting found in the consultant\'s opening lines.',
    'No greeting found in the consultant\'s opening lines.',
  ),

  agent_name: (c) => {
    const staff = c.staffName?.trim();
    const re = /(\b(?:[Mm]y name is|[Tt]his is|I am|I'm|[Ii]t's|[Ii] am|[Ss]aya|[Nn]ama saya)\s+[A-Z][a-z]+|\b[A-Z][a-z]+ here\b|我是|我叫|我係)/;
    const hits = c.introAgent.filter(
      (l) => re.test(l.text) || (staff && staff.length > 1 && l.text.toLowerCase().includes(staff.toLowerCase())),
    );
    return hits.length
      ? found(hits, 'Consultant introduced themself in the opening.')
      : missing('No self-introduction by name found in the opening. Keyword scan only.', c.introAgent);
  },

  brand_name: simple(
    (c) => c.introAgent,
    /(\bu\.?\s?r\.?\s?(klinik|clinic)|\bur(klinik|clinic)|UR\s?(診所|诊所|医美|醫美))/i,
    'Brand name (U.R. Klinik / UR Clinic) found in the opening.',
    'Brand name "U.R. Klinik" not found in the consultant\'s opening lines.',
    { context: (c) => c.introAgent },
  ),

  call_purpose: simple(
    (c) => c.introAgent,
    /(enquir|inquir|follow(ing)?[- ]?up|you (left|filled|submitted|registered|clicked|saw|sent)|your (details|form|message|request|interest)|advert|\bads?\b|facebook|instagram|tiktok|website|咨詢|諮詢|咨询|詢問|询问|廣告|广告|留言|登記|登记|報名|报名|之前.{0,6}(問|问)|收到你的|whatsapp|有收到|(問|问|聞|闻)過|(問|问|聞|闻)过|(祛|去)(斑|班).{0,3}(護理|护理)|\bFB\b|\bIG\b|iklan|pertanyaan)/i,
    'Consultant referenced the lead\'s enquiry or advert.',
    'No reference to the lead\'s enquiry or reason for calling found in the opening.',
  ),

  customer_name: (c) => {
    const re = /(\b(Ms|Miss|Mrs|Mr|Madam|Puan|Cik)\.?\s+[A-Z][a-z]+|[一-鿿](小姐|先生|女士))/;
    const hits = c.agent.filter((l) => l.index < c.lines.length * 0.5 && re.test(l.text));
    return hits.length
      ? found(hits, 'Consultant addressed the customer by name.', 'medium')
      : missing('No use of the customer\'s name detected (honorific + name). Keyword scan only.', c.introAgent);
  },

  icebreaker_compliment: simple(
    (c) => c.agent.filter((l) => l.index < c.lines.length * 0.4),
    /(how are you|how's your day|hope you('re| are) (well|having|doing)|nice to (talk|speak)|lovely|sounds? (so )?(cheerful|happy|energetic)|你好嗎|今天好嗎|最近好嗎|最近好吗|聲音很好聽)/i,
    'A personal icebreaker was used early in the call.',
    'No personal icebreaker or compliment found before business questions.',
  ),

  connection_recovery: (c) => {
    const re = /(can you hear me|hear me\s*[?？]|you there\s*[?？]|line (is )?(bad|breaking)|bad (line|connection)|\bsignal\b|聽得到|听得到|聽到嗎|听到吗|聽不到|听不到)/i;
    const hits = scan(c.introLines, re);
    if (hits.length >= 3)
      return {
        ...missing(`${hits.length} connection-check exchanges in the opening before the conversation settled.`, [], 'high'),
        matches: hits.slice(0, 2),
      };
    return found([], 'No repeated connection-check exchanges in the opening.', 'medium');
  },

  concern_probe: simple(
    (c) => c.agent,
    /((?<!no )(concern|problem|issue)|worr|bother|troubl|skin (condition|type|problem)|what (brings|made) you|looking to (improve|treat)|want to (improve|treat|fix)|masalah|(皮膚|皮肤|臉|脸|肌膚|肌肤).{0,8}(問題|问题|困擾|困扰|狀況|状况|情況|情况)|遇到.{0,6}(問題|问题)|面臨|面临|面对|面對|(斑點|斑点|斑|班)(的)?(問題|问题)|(主要|想要?).{0,3}改善|(?<![沒没]有?|不)(問題|问题)(?!的話)|困擾|困扰|改善.{0,4}(什麼|什么|哪))/i,
    'Consultant asked about the customer\'s concern.',
    'No question about the customer\'s skin concern found.',
    { question: true },
  ),

  clarify_vague: simple(
    (c) => c.agent,
    /(what do you mean|can you describe|describe|like (redness|peeling|itch)|redness|peeling|sting|itchy|是指|紅.*(還是|还是)|一點點|一点点|一片片|一片|脫皮|脱皮|癢|痒|刺痛)/i,
    'Consultant asked the customer to clarify a vague description.',
    'No clarifying follow-up question found.',
    { question: true },
  ),

  mirror_concern: (c) => {
    const lead = /(so (your|you)|you mentioned|you said|I hear|sounds like|your (main )?(concern|problem|issue) is|你的問題是|你的问题是|你說|你说|我聽到|我听到)/i;
    const hits = c.agent.filter((l) => lead.test(l.text) && termsIn(l.text).some((t) => c.customerConcernTerms.includes(t)));
    return hits.length
      ? found(hits, 'Consultant restated the customer\'s concern in their own words.')
      : missing('No restatement of the customer\'s concern found. Keyword scan only.');
  },

  duration_probe: simple(
    (c) => c.agent,
    /(how long|since when|when did (it|this|that|you) (start|begin|first)|how many (years|months)|多久|多長時間|多长时间|幾時開始|几时开始|什麼時候開始|什么时候开始)/i,
    'Consultant asked how long the concern has lasted.',
    'No question about how long the concern has lasted.',
  ),

  previous_treatment: simple(
    (c) => c.agent,
    /(tried|done (any|some)?\s?.{0,20}before|previous(ly)?|before this|any treatments?|seen a (doctor|dermatologist)|做過|做过|試過|试过|之前有|以前有)/i,
    'Consultant asked about previous treatments.',
    'No question about previous treatments found.',
    { question: true },
  ),

  lifestyle: simple(
    (c) => c.agent,
    /(routine|sunscreen|sun ?block|sun exposure|outdoor|sleep|diet|stress|lifestyle|skincare (products|habits)|make-?up|cleanser|作息|防曬|防晒|保養習慣|保养习惯|睡眠|飲食|饮食|化妝|化妆)/i,
    'Consultant asked about lifestyle or skincare habits.',
    'No lifestyle or skincare-habit question found (routine, sun protection, sleep, diet).',
    { question: true },
  ),

  emotional_pain: simple(
    (c) => c.agent,
    /(make(s)? you feel|affect(s|ed|ing)? (your|you)|confidence|self-?conscious|embarrass|bother(s|ing)? you (the )?most|how do you feel|自信|心情|困擾你|困扰你|影響你|影响你)/i,
    'Consultant surfaced how the concern affects the customer.',
    'No question about how the concern affects the customer emotionally.',
  ),

  ai_skin_analysis: simple(
    (c) => c.agent,
    /(\bAI\b.{0,20}(skin|scan|analy|detect|test|report)|\bAIP|skin analy[sz](er|is)|皮膚檢測|皮肤检测|皮膚分析|皮肤分析|皮膚測試|皮肤测试|AI\s?檢測|AI\s?检测|AI\s?測試|AI\s?皮膚|AI\s?皮肤|AI\s?分析|皮膚檢查|皮肤检查|skin (test|scan|check))/i,
    'AI Skin Analysis was mentioned.',
    'No mention of the AI Skin Analysis found.',
  ),

  light_system: simple(
    (c) => c.agent,
    /((3|three)[- ]?(light|lights|colou?rs? of light)|light therap|光療|光疗|三種光|三种光|三個光|三个光|三道光|(red|blue|yellow|amber)[- ]light|紅光|红光|藍光|蓝光|黃光|黄光|做光|打光|照光|terapi cahaya|gold light|white light|spectra|ruvy|pro ?light|金光|白光|三種光療|三种光疗|(3|三)(種|种|個|个|組|组)(光療|光疗|護理|护理))/i,
    'The light therapy system was mentioned.',
    'No mention of the 3-light therapy system found.',
  ),

  light_purpose: (c) => {
    const colour = /(\b(red|blue|yellow|amber|gold|white)\b|spectra|ruvy|紅光|红光|藍光|蓝光|黃光|黄光|金光|白光)/i;
    const colourAll = new RegExp(colour.source, 'gi');
    const purpose = /(\bfor\b|\bto\b|help|calm|reduc|kill|bacteria|repair|heal|brighten|collagen|inflamm|消炎|修復|修复|殺菌|杀菌|美白|鎮定|镇定|淡化|血絲|血丝|黑色素|反黑|膚色|肤色|(祛|去)(斑|班)|痘疤|痘印)/i;
    const hits = c.agent.filter((l) => colour.test(l.text) && purpose.test(l.text));
    const colours = new Set(hits.flatMap((l) => (l.text.match(colourAll) ?? []).map((m) => m.toLowerCase())));
    if (colours.size >= 2) return found(hits, `Consultant explained ${colours.size} light types by what they do.`);
    const named = scan(c.agent, /((3|three)[- ]?light|light therap|光療|光疗|gold light|spectra|ruvy|金光|白光)/i);
    return named.length
      ? missing('The light system was named, but fewer than two light types were explained by purpose (mentioned, but not explained).', named)
      : { ...missing('No light types were mentioned at all, so none were explained by purpose (not mentioned).'), gapTitle: 'Light types not mentioned' };
  },

  concern_to_solution: (c) => {
    const solution = /(help|treat|improve|solve|target|suitable|recommend|light|therap|scan|analy[sz]|check|解決|解决|改善|幫你|帮你|適合|适合|光療|光疗|檢測|检测)/i;
    if (!c.customerConcernTerms.length)
      return missing('The customer\'s concern was not clearly stated, so no concern-to-solution link could be checked.', [], 'low');
    const hits = c.agent.filter(
      (l) => solution.test(l.text) && termsIn(l.text).some((t) => c.customerConcernTerms.includes(t)) && l.index > (c.customer[0]?.index ?? 0),
    );
    return hits.length
      ? found(hits, 'Consultant tied the recommendation to the concern the customer described.', 'medium')
      : missing('No consultant line links the recommended solution back to the customer\'s stated concern.');
  },

  root_cause: (c) => {
    const cause = /(because|the reason|cause[sd]?|barrier|why (your|this)|damag|over-?treat|trigger|melanin|原因|因為|因为|屏障|受損|受损|為什麼|为什么|根源|黑色素|色素|層次|层次|分解)/i;
    const skin = /(skin|pores?|sensitiv|red|acne|pigment|melanin|皮膚|皮肤|毛孔|敏感|痘|斑|班|色素)/i;
    const hits = c.agent.filter((l) => cause.test(l.text) && skin.test(l.text));
    return hits.length
      ? found(hits, 'Consultant explained a reason behind the skin concern.', 'medium')
      : missing('No explanation of why the skin behaves this way was found.');
  },

  differentiation_testimonial: simple(
    (c) => c.agent,
    /(different from|unlike|other clinics|what makes us|customers? (like you|who|with)|many (of our )?(customers|clients|patients)|testimonial|review|before[- ]and[- ]after|success|很多(顧客|顾客|客人)|(其他|其它)(顧客|顾客|客人)|效果很好|案例|分別|区别|不一樣|不一样|好評|好评|不痛|不會痛|不会痛|(沒有|没有|無|无|零)(任何)?(修復期|修复期|恢復期|恢复期)|no downtime|painless|傳統|传统)/i,
    'Consultant referenced results or what makes the clinic different.',
    'No differentiation or customer result was referenced.',
  ),

  clinic_experience: simple(
    (c) => c.agent,
    /(\d+\s*(years|yrs)\b|years of experience|\d+\s*年(經驗|经验|專注|专注|了)|十二年|多年|ISO\s?9001)/i,
    'Clinic experience was mentioned.',
    'No mention of the clinic\'s experience.',
  ),

  clinic_branches: simple(
    (c) => c.agent,
    /(\d+\s*(branches|outlets|centres|centers)|\bbranch(es)?\b|\boutlets?\b|分店|分行|門市|门市|penang|檳城|槟城|\bJB\b|\bKL\b|新山|吉隆坡|住哪|住在哪|dekat mana)/i,
    'Branches or the nearest outlet were mentioned.',
    'No branch or outlet mentioned.',
  ),

  doctor_credibility: simple(
    (c) => c.agent,
    /(doctor|doktor|dermatologist|\bDr\.?\s|physician|medical team|醫生|医生|皮膚科|皮肤科)/i,
    'A doctor or specialist was referenced.',
    'No doctor or specialist was mentioned.',
  ),

  no_obligation: (c) => {
    if (!c.hesitations.length) return notApplicable('The customer did not hesitate, so reassurance was not required.');
    const re =
      /(not committing|no (obligation|commitment|pressure|hard sell)|don'?t (have|need) to (buy|commit|sign)|just come (and|to|for)|let the doctor (take a look|see|check)|no need to (buy|commit)|沒有壓力|没有压力|不用(買|买|承諾|承诺)|沒有满意也沒問題|没有满意也没问题|不滿意也沒關係|不满意也没关系|refund|退款|退錢|退钱|無條件|无条件|無效可退|无效可退)/i;
    const hits = scan(c.agent, re);
    return hits.length
      ? found(hits, 'Consultant reassured the customer there is no commitment.')
      : missing('The customer hesitated, but no no-commitment reassurance was found.', c.hesitations);
  },

  trial_risk_reduction: simple(
    (c) => c.agent,
    /(\btrial\b|first (visit|session|time)|try (it )?(first|out)|only RM|just RM|RM\s?\d+|體驗|体验|試做|试做|refund|退款|退錢|退钱|無條件|无条件)/i,
    'Consultant positioned a trial / first visit as a small first step.',
    'No low-risk trial framing found.',
  ),

  empathy: simple(
    (c) => c.agent,
    /(I (completely |totally |really )?understand|understandable|must (be|have been) (so )?(frustrat|hard|difficult|tough|stressful)|no wonder|I know (how|it'?s|that)|I can imagine|that'?s (so )?(frustrating|tough|hard)|don'?t worry|難怪|难怪|理解你|明白你|辛苦|不用擔心|不用担心|faham)/i,
    'Consultant acknowledged the customer\'s feelings.',
    'No empathy statement found (e.g. "I understand", "no wonder…").',
  ),

  hesitation_incentive: (c) => {
    if (!c.hesitations.length) return notApplicable('The customer did not hesitate.');
    const first = c.hesitations[0].index;
    const re = /(gift|free|complimentary|deadline|limited|only \w+ slots?|promo|refund|送|免費|免费|名額|名额|優惠|优惠|保留|留起來|留起来|退款)/i;
    const hits = c.agent.filter((l) => l.index > first && re.test(l.text));
    return hits.length
      ? found(hits, 'After the customer hesitated, the consultant gave a concrete reason to act.')
      : missing('After the customer hesitated, no specific incentive followed.', c.hesitations);
  },

  promo_deadline: simple(
    (c) => c.agent,
    /(\b(within|before|until|by|ends?|expires?|valid (for|until)|only (for|until)|deadline|limited[- ]time)\s.{0,25}(weeks?|days|month|friday|saturday|sunday|monday|tuesday|wednesday|thursday|\d)|this week only|(兩|两|2)\s?(個|个)?(星期|週|周)內|(兩|两|2)\s?(個|个)?(星期|週|周)内|本(星期|週|周)(內|内)|截止|之前(預約|预约|報名|报名)|(到|至|valid (till|until|to))\s?(這個|这个|今個|今个)?\s?(月|[一二三四五六七八九十\d]{1,2}\s?月)?\s?\d{1,2}\s?(號|号)|(這個|这个|今個|今个)?月(尾|底)|[一二三四五六七八九十]月尾|(剩(下|返)?|還有|还有|only).{0,4}(最後|最后)?\s?(幾|几|\d{1,2}|一|兩|两|last few)\s?(個|个)?(星期|禮拜|礼拜|天|日|days?|weeks?)|(最後|最后)(幾|几)(天|日)|(這個|这个)月(里面|裡面|之前|內|内)|before (the )?(end of|month end))/i,
    'A time-bound promotional deadline was mentioned.',
    'No promotional deadline was mentioned.',
    { context: lastLines },
  ),

  skincare_gift: simple(
    (c) => c.agent,
    /((free|complimentary)\s.{0,30}(skincare|skin ?care|gift|set|kit|product)|\bgifts?\b|送.{0,15}(保養品|保养品|禮品|礼品|護膚|护肤|產品|产品|面膜|一套|set|skin ?care)|(free|percuma|hadiah).{0,25}(skin ?care|set|gift)|免費.{0,6}(保養品|保养品|護膚|护肤)|赠送|贈送|贈品|赠品|skin ?care set|護膚系列|护肤系列|(保留|留).{0,10}(skin ?c|set|套))/i,
    'The free skincare gift was offered.',
    'No free skincare gift was mentioned.',
    { context: lastLines },
  ),

  limited_slots: simple(
    (c) => c.agent,
    /(limited (slots?|spots?|places?)|only (\d+|a few|two|few) (slots?|spots?|places?)|slots? (left|remaining)|fully booked|filling up|名額|名额|位子不多|限量|limited edition)/i,
    'A limited-slot cue was used.',
    'No limited-slot cue was used.',
  ),

  clear_offer: simple(
    (c) => c.agent,
    /(RM\s?\d+|\$\s?\d|\b(299|399|499|599|1998)\b|\d+\s?(塊|块|令吉|ringgit)|\bpackage\b|\bpromo(tion)?\b|\boffer\b|special price|trial (price|package|session)|(4|four)[- ]in[- ](1|one)|四合一|優惠|优惠|配套|套餐|體驗價|体验价|促銷|促销|\bnett\b|(沒有|没有)(任何)?(隱藏|隐藏)|hidden (fees?|costs?|charges?)|新人優惠|新人优惠)/i,
    'A specific offer was stated.',
    'No specific offer (package, price or promotion) was stated.',
  ),

  availability_probe: (c) => {
    const offered = DETECTORS.two_options(c);
    if (offered.present) return found(offered.matches, 'Consultant moved to scheduling by offering specific slots.');
    const hits = scan(c.agent, /(when (are|would) you (be )?(free|available)|what day|which day|day off|available|your schedule|weekdays?|weekend|有空|有時間|有时间|休息|放假|哪天|哪一天|平日|周末|週末)/i);
    return hits.length
      ? found(hits, "Consultant asked about the customer's availability.")
      : missing('No attempt to find a suitable slot. Keyword scan only.', lastLines(c));
  },

  two_options: (c) => {
    const or = /(\bor\b|還是|还是|或者|或)/i;
    const hits = c.agent.filter((l) => or.test(l.text) && (distinct(l.text, WEEKDAY) >= 2 || distinct(l.text, CLOCK) >= 2));
    if (hits.length) return found(hits, 'Consultant offered two specific appointment options.');
    const open = scan(c.agent, /(when (are|would) you (be )?(free|available)|what day|day off|有空|有時間|有时间|哪天|休息)/i);
    return missing(
      open.length
        ? 'Consultant asked an open availability question instead of offering two specific options.'
        : 'No two-option date/time question was found.',
      open.length ? open : lastLines(c),
    );
  },

  appointment_confirmed: (c) => {
    const confirm = /(confirm|booked|book (you|it)|lock|reserve|see you (on|this|then|later)|I'?ll (put|slot|book)|安排好|鎖住|锁住|鉛住|幫你留|帮你留|預約好|预约好|確認|确认|幫你安排|帮你安排|幫你約|帮你约|幫你放|帮你放|幫你排|帮你排|幫你book|帮你book|等下見|等下见|到時見|到时见|reserve untuk|appointment (is|at|on))/i;
    const yes = /(\b(ok|okay|yes|yeah|sure|can|alright|sounds good|see you)\b|OK|好|可以|行|對|对)/i;
    for (const line of lateAgent(c)) {
      if (!confirm.test(line.text) || distinct(line.text, TIME) < 1) continue;
      // The day may be agreed a few lines earlier ("today", "Saturday") and the time confirmed here.
      const window = c.lines.slice(Math.max(0, line.index - 10), line.index + 1);
      if (!window.some((l) => DAY_TEST.test(l.text))) continue;
      const reply = c.diarized
        ? c.lines.slice(line.index + 1, line.index + 3).find((l) => c.maybeCustomer(l))
        : [...c.lines.slice(line.index + 1, line.index + 3), line, c.lines[line.index - 1]].find((l) => l && yes.test(l.text) && !HESITATION.test(l.text));
      const hesitatedAfter = c.hesitations.some((h) => h.index > line.index);
      if (reply && yes.test(reply.text) && !HESITATION.test(reply.text) && !hesitatedAfter)
        return found([line, reply], 'A specific date and time was confirmed and agreed.', c.diarized ? 'high' : 'medium');
    }
    const lastHes = c.hesitations[c.hesitations.length - 1];
    return missing(
      lastHes
        ? "The call ended without a confirmed date and time — the customer's hesitation was not converted into a booking."
        : 'No confirmed appointment (specific day + time, agreed by the customer) was found.',
      lastHes ? [lastHes, ...lastLines(c, 1)] : lastLines(c),
      c.diarized ? 'high' : 'medium',
    );
  },

  recap_next_steps: simple(
    lateAgent,
    /(arrive|early|remind|reminder|message you|whatsapp|send you (the )?(location|address|details)|see you (on|this)|bring|提醒|提前|地址|發訊息|发讯息|到時|到时|walk[- ]?in|location|(三|3|兩個半|两个半)\s?(個|个)?\s?(小時|小时)|\d\s?hours?)/i,
    'Consultant recapped what happens next.',
    'No recap of next steps near the end of the call.',
    { context: lastLines },
  ),

  no_handoff_close: (c) => {
    const re =
      /(senior|colleague|someone (will|else)|another (consultant|person)|call you back|get back to you|follow up (with you )?later|高級同事|高级同事|同事(會|会)?(跟|联系|聯絡)|再聯絡你|再联系你)/i;
    const hits = scan(lateAgent(c), re);
    if (!hits.length) return found([], 'No hand-off of the close to a colleague.', 'medium');
    const confirmed = DETECTORS.appointment_confirmed(c).present;
    if (confirmed) return found([], 'A colleague was mentioned only after the booking was secured.', 'medium');
    return { ...missing('The close was handed to a colleague instead of securing the booking.', [], 'high'), matches: hits.slice(0, 2) };
  },

  natural_flow: (c) => {
    if (!c.diarized)
      return { ...missing('Conversation flow cannot be judged without speaker labels.', [], 'low'), present: false, applicable: false };
    if (c.lines.length < 6) return { ...notApplicable('Transcript too short to judge conversation flow.'), applicable: true, confidence: 'low' };
    // Merge consecutive lines from the same speaker into turns (transcripts often split long speech).
    const turns: { speaker: string; chars: number }[] = [];
    for (const l of c.lines) {
      const last = turns[turns.length - 1];
      if (last && last.speaker === l.speaker) last.chars += l.text.length;
      else turns.push({ speaker: l.speaker, chars: l.text.length });
    }
    const agentTurns = turns.filter((t) => t.speaker === 'agent');
    const custChars = turns.filter((t) => t.speaker === 'customer').reduce((s, t) => s + t.chars, 0);
    const allChars = turns.reduce((s, t) => s + t.chars, 0) || 1;
    const custShare = custChars / allChars;
    const longest = Math.max(0, ...agentTurns.map((t) => t.chars));
    const metric = `Customer share of words: ${Math.round(custShare * 100)}% · conversation turns: ${turns.length} · longest consultant monologue: ${longest} characters`;
    const ok = custShare >= 0.15 && longest <= 420 && turns.length >= 8;
    return {
      applicable: true,
      present: ok,
      matches: [],
      context: [],
      confidence: 'low',
      reason: ok
        ? 'The conversation was two-way: the customer spoke regularly and consultant monologues stayed short.'
        : 'Long consultant monologues or little customer talk suggest a one-sided flow.',
      metric,
    };
  },

  confidence: (c) => {
    const rec = /(I (would )?(recommend|suggest)|best (first step|option|for you)|you should|I('m| am) (sure|confident)|we can (definitely|help)|建議|建议|推薦|推荐|最適合|最适合|一定可以|可以幫你|可以帮你)/i;
    const filler = /(\b(um+|uh+|erm|er)\b|嗯+|呃)/gi;
    const recs = scan(c.agent, rec);
    const fillers = c.agent.reduce((s, l) => s + (l.text.match(filler)?.length ?? 0), 0);
    const ratio = fillers / Math.max(1, c.agent.length);
    const metric = `Filler words per consultant turn: ${ratio.toFixed(2)} · clear recommendation lines: ${recs.length}`;
    if (recs.length && ratio < 0.35)
      return { ...found(recs, 'Consultant made clear recommendations with few fillers.', 'low'), metric };
    return {
      ...missing(
        recs.length ? 'Recommendations were present but many filler words were used.' : 'No clear recommendation language was found.',
        [],
        'low',
      ),
      metric,
    };
  },
};

export function termsIn(text: string): string[] {
  return CONCERN_TERMS.filter(([, re]) => re.test(text)).map(([t]) => t);
}

export function buildContext(lines: TranscriptLine[], staffName?: string): DetectionContext {
  const labelledAgent = lines.filter((l) => l.speaker === 'agent');
  const labelledCustomer = lines.filter((l) => l.speaker === 'customer');
  const diarized = labelledAgent.length > 0 && labelledCustomer.length > 0;
  // Without speaker labels every line could be either person: search all of them, with lower confidence.
  const agent = diarized ? labelledAgent : labelledAgent.length ? lines.filter((l) => l.speaker !== 'customer') : lines;
  const customer = diarized ? labelledCustomer : lines;
  const maybeCustomer = (l: TranscriptLine) => (diarized ? l.speaker === 'customer' : true);
  const introCut = Math.max(6, Math.ceil(lines.length * 0.2));
  const introLines = lines.slice(0, introCut);
  const introAgent = introLines.filter((l) => agent.includes(l));
  const hesitations = customer.filter((l) => HESITATION.test(l.text));
  const customerConcernTerms = [...new Set(customer.flatMap((l) => termsIn(l.text)))];
  return { lines, agent, customer, introAgent, introLines, hesitations, customerConcernTerms, staffName, diarized, maybeCustomer };
}

// ─── EQ (unscored) ─────────────────────────────────────────────────────────
export const EQ_PATTERNS = {
  compliment:
    /(you('re| are) (so |really |very )?(diligent|careful|proactive|lovely|sweet|smart|brave)|good (that|on) you|great that you|well done|your skin (looks|sounds) (good|nice|healthy)|you take (good|great|such) care|very (hardworking|dedicated)|很用心|好棒|很棒|好厲害|好厉害|皮膚底子|皮肤底子)/i,
  humor: /(haha|hehe|\blol\b|\[laugh|\(laugh|joke|哈哈|呵呵|開玩笑|开玩笑)/i,
  declineRequest:
    /(discount|cheaper|\bfree (trial|session|treatment)\b|price (only|first)|send (me )?(the )?price|whatsapp (me )?(the )?price|just tell me the price|打折|便宜一點|便宜一点|先發價錢|先发价钱)/i,
  declineRedirect:
    /(what I can do|however|but (what|I can)|instead|the best way|let the doctor|come (in|down) (first|and)|不過|不过|但是|其實|其实)/i,
};
