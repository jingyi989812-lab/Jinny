/**
 * Mock evaluation engine (offline, deterministic).
 *
 * Pipeline: parse transcript → run framework behaviours through keyword
 * detectors → score sections from framework weights → assemble the coaching
 * report (findings, key moments, role-model comparison, EQ, action plan) →
 * verify every quote against the transcript.
 *
 * It is NOT AI. It exists so the full product flow can be demonstrated and
 * tested before the Claude evaluator is connected. It produces the same
 * `Evaluation` shape that the Claude evaluator must return.
 */
import { getFramework } from '@/config/frameworks';
import type { Behaviour, DetectorId, FrameworkSection, JourneyStageId, QAFramework } from '@/types/framework';
import type { EvaluationInput } from '@/types/call';
import type {
  ActionPlanItem,
  CoachingTip,
  Confidence,
  CustomerProfileItem,
  EQObservation,
  Evaluation,
  EvaluationEngineInfo,
  Evidence,
  Finding,
  JourneyStageResult,
  KeyMoment,
  ParsedTranscript,
  RoleModelComparison,
  SectionResult,
  TranscriptLine,
} from '@/types/qa';
import { overallBand, pct, sectionBand } from '../scoring';
import { buildContext, DETECTORS, EQ_PATTERNS, type Detection, type DetectionContext } from './detectors';
import { INSUFFICIENT, verifyEvaluation } from './evidenceVerifier';
import { parseTranscript } from './transcriptParser';
import { SUGGESTED_PHRASING } from './suggestedPhrasing';
import { PLAYBOOK_LINES } from '@/content/iccPlaybook';

export const MOCK_ENGINE_VERSION = 'mock-heuristic-0.3';

const quote = (l: TranscriptLine): Evidence => ({
  type: 'quote',
  quote: l.text.length > 220 ? `${l.text.slice(0, 217)}…` : l.text,
  speaker: l.speaker,
  timestamp: l.timestamp,
  lineIndex: l.index,
  verified: false,
});
const absence = (note: string): Evidence => ({ type: 'absence', note, verified: true });
const metric = (note: string): Evidence => ({ type: 'metric', note, verified: true });

const STAGE_META: Record<JourneyStageId, { label: string; emoji: string }> = {
  opening: { label: 'Opening', emoji: '🎤' },
  discovery: { label: 'Discovery', emoji: '🔍' },
  solution: { label: 'Solution', emoji: '💡' },
  credibility: { label: 'Credibility', emoji: '🏥' },
  objection: { label: 'Objection Handling', emoji: '🧠' },
  urgency: { label: 'Urgency', emoji: '🎁' },
  closing: { label: 'Closing', emoji: '📅' },
  rapport: { label: 'Rapport & Tone', emoji: '💛' },
};
const STAGE_ORDER: JourneyStageId[] = ['opening', 'discovery', 'solution', 'credibility', 'objection', 'urgency', 'closing'];

/** Which journey stage a behaviour belongs to (independent of which section scores it). */
const BEHAVIOUR_STAGE: Partial<Record<string, JourneyStageId>> = {
  no_obligation: 'objection',
  trial_risk_reduction: 'objection',
  hesitation_incentive: 'objection',
  promo_deadline: 'urgency',
  skincare_gift: 'urgency',
  limited_slots: 'urgency',
  clear_offer: 'urgency',
  clinic_experience: 'credibility',
  clinic_branches: 'credibility',
  doctor_credibility: 'credibility',
  natural_flow: 'rapport',
  empathy: 'rapport',
  confidence: 'rapport',
};

interface BehaviourOutcome {
  section: FrameworkSection;
  behaviour: Behaviour;
  detection: Detection;
  points: number; // section points this behaviour is worth (after N/A redistribution)
}

let idCounter = 0;
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${(idCounter++).toString(36)}`;

export interface AssembleOptions {
  /** Judgement for a behaviour detector — from keyword heuristics or from Claude. */
  judge?: (detector: DetectorId, ctx: DetectionContext) => Detection;
  engine: EvaluationEngineInfo;
  /** Optional EQ observations supplied by the engine (otherwise heuristics are used). */
  eqObservation?: EQObservation[];
}

export function evaluateWithMock(input: EvaluationInput): Evaluation {
  return assembleEvaluation(input, {
    engine: {
      provider: 'mock-heuristic',
      engineVersion: MOCK_ENGINE_VERSION,
      disclaimer:
        'Demo evaluator using keyword detection — not AI. Evidence quotes are real transcript lines, but quality and paraphrases cannot be judged. Connect the Claude evaluator for production.',
    },
  });
}

/**
 * Shared report assembler used by every engine. Scores are ALWAYS computed
 * here from the framework config — engines only supply behaviour judgements.
 */
export function assembleEvaluation(input: EvaluationInput, options: AssembleOptions): Evaluation {
  const framework = getFramework(input.frameworkId);
  const transcript = parseTranscript(input.transcript, input.staffName);
  const ctx = buildContext(transcript.lines, input.staffName);
  const baseJudge = options.judge ?? ((id: DetectorId, c: DetectionContext) => DETECTORS[id](c));
  // Without speaker labels nothing can be "high" confidence: we can't be sure who said it.
  const judge = (id: DetectorId, c: DetectionContext): Detection => {
    const d = baseJudge(id, c);
    return !c.diarized && d.confidence === 'high' ? { ...d, confidence: 'medium' } : d;
  };
  const cache = new Map<DetectorId, Detection>();
  const detectId = (id: DetectorId) => {
    if (!cache.has(id)) cache.set(id, judge(id, ctx));
    return cache.get(id)!;
  };
  const detect = (b: Behaviour) => detectId(b.detector);

  const tooShort = transcript.lines.length < 3 || ctx.agent.length === 0;
  const outcomes: BehaviourOutcome[] = [];
  const callType = input.callType ?? 'new_lead';
  const profile = framework.callTypeProfiles.find((p) => p.callType === callType);
  const inScope = (section: FrameworkSection) =>
    !profile || profile.scoredStages === 'all' || profile.scoredStages.includes(section.journeyStage);

  const sections: SectionResult[] = framework.sections.map((section) => {
    if (!inScope(section)) {
      return {
        sectionId: section.id,
        code: section.code,
        name: section.name,
        emoji: section.emoji,
        score: 0,
        maxScore: section.maxScore,
        percentage: 0,
        status: 'missed' as const,
        strengths: [],
        gaps: [],
        evidence: [],
        whyItMatters: '',
        coaching: { id: uid('tip'), sectionId: section.id, text: '', isSuggestion: true as const },
        confidence: 'medium' as const,
        confidenceReason: '',
        notApplicable: [`Not scored for ${profile?.label.toLowerCase()} calls (placeholder rule — confirm with QA lead).`],
        journeyStage: section.journeyStage,
        applicable: false,
      };
    }
    const results = section.behaviours.map((behaviour) => ({ behaviour, detection: detect(behaviour) }));
    const applicable = results.filter((r) => r.detection.applicable);
    const totalWeight = applicable.reduce((s, r) => s + r.behaviour.weight, 0) || 1;

    const strengths: Finding[] = [];
    const gaps: Finding[] = [];
    let earned = 0;

    for (const { behaviour, detection } of results) {
      if (!detection.applicable) continue;
      const points = (behaviour.weight / totalWeight) * section.maxScore;
      outcomes.push({ section, behaviour, detection, points });
      if (detection.present && !tooShort) earned += points;
      const f = toFinding(section, behaviour, detection, points, tooShort);
      (f.kind === 'strength' ? strengths : gaps).push(f);
    }

    const score = tooShort ? 0 : Math.round(earned);
    const percentage = pct(score, section.maxScore);
    const band = sectionBand(framework, percentage);
    gaps.sort((a, b) => b.points - a.points || confRank(a) - confRank(b));
    const topGap = gaps[0];
    const topBehaviour = topGap ? section.behaviours.find((b) => b.id === topGap.behaviourId) : undefined;
    const confidence = sectionConfidence(results.map((r) => r.detection).filter((d) => d.applicable), tooShort);

    const coaching: CoachingTip = topBehaviour
      ? {
          id: uid('tip'),
          sectionId: section.id,
          text: topBehaviour.coachingTip,
          isSuggestion: true,
          suggestedPhrasing: SUGGESTED_PHRASING[topBehaviour.detector],
          playbookLine: PLAYBOOK_LINES[topBehaviour.detector],
          lessonId: topBehaviour.lessonId,
        }
      : {
          id: uid('tip'),
          sectionId: section.id,
          text: `Keep doing what you did here — every behaviour in ${section.name} was observed. Share this approach with the team!`,
          isSuggestion: true,
          lessonId: section.lessonId,
        };

    return {
      sectionId: section.id,
      code: section.code,
      name: section.name,
      emoji: section.emoji,
      score,
      maxScore: section.maxScore,
      percentage,
      status: band.status,
      strengths,
      gaps,
      evidence: [...strengths, ...gaps].flatMap((f) => f.evidence.filter((e) => e.type === 'quote')).slice(0, 4),
      whyItMatters: topBehaviour?.whyItMatters ?? section.behaviours[0].whyItMatters,
      coaching,
      confidence: confidence.level,
      confidenceReason: confidence.reason,
      notApplicable: results.filter((r) => !r.detection.applicable).map((r) => `${r.behaviour.label} — ${r.detection.reason}`),
      journeyStage: section.journeyStage,
      applicable: true,
    };
  });

  const scored = sections.filter((s) => s.applicable !== false);
  const overallScore = scored.reduce((s, x) => s + x.score, 0);
  const maxScore = scored.reduce((s, x) => s + x.maxScore, 0);
  const overallPercentage = pct(overallScore, maxScore);
  const status = overallBand(framework, overallPercentage).status;

  const allStrengths = sections.flatMap((s) => s.strengths).sort((a, b) => b.points - a.points);
  // Evidence-backed gaps first; low-confidence heuristic gaps (tone, flow) rank after them.
  const lowLast = (f: Finding) => (f.confidence === 'low' ? 1 : 0);
  const allGaps = sections
    .flatMap((s) => s.gaps)
    .sort((a, b) => lowLast(a) - lowLast(b) || b.points - a.points || confRank(a) - confRank(b) || sectionOrder(framework, a) - sectionOrder(framework, b));

  const mainStrengthSection = tooShort ? null : pickSection(scored, 'best');
  const mainGapSection = tooShort ? null : pickSection(scored, 'worst');

  const evaluation: Evaluation = {
    id: uid('eval'),
    callId: input.callId,
    frameworkId: framework.id,
    frameworkVersion: `${framework.frameworkName} ${framework.frameworkVersion}`,
    engine: options.engine,
    createdAt: new Date().toISOString(),
    overallScore,
    maxScore,
    overallPercentage,
    status,
    summary: {
      narrative: '',
      mainStrength: mainStrengthSection ? { sectionId: mainStrengthSection.sectionId, label: strengthLabel(mainStrengthSection) } : null,
      mainGap: mainGapSection && mainGapSection.gaps.length ? { sectionId: mainGapSection.sectionId, label: mainGapSection.gaps[0].title } : null,
    },
    sections,
    strengths: dedupeBy(allStrengths.filter((f) => f.evidence.some((e) => e.type === 'quote')), (f) => f.sectionId).slice(0, 5),
    gaps: dedupeBy(allGaps, (f) => f.issueCode ?? f.id),
    keyMoments: tooShort ? [] : buildKeyMoments(ctx, outcomes, detectId),
    coachingTips: scored.map((s) => s.coaching),
    eqObservation: tooShort ? [] : (options.eqObservation ?? buildEQ(framework, ctx, detectId)),
    roleModelComparison: tooShort ? [] : buildRoleModel(framework, sections, ctx, outcomes),
    actionPlan: buildActionPlan(framework, allGaps, scored),
    journey: buildJourney(framework, outcomes, transcript),
    customerProfile: buildCustomerProfile(ctx),
    verification: { checkedQuotes: 0, removedQuotes: 0 },
    diarized: transcript.diarized,
    callType,
    parseNotes: tooShort
      ? [...transcript.parseNotes, 'Transcript too short or no consultant lines detected — insufficient evidence to score.']
      : transcript.parseNotes,
  };
  evaluation.summary.narrative = buildNarrative(input.staffName, evaluation, allGaps, framework);

  return verifyEvaluation(evaluation, transcript);
}

// ─── findings ──────────────────────────────────────────────────────────────
function toFinding(section: FrameworkSection, b: Behaviour, d: Detection, points: number, tooShort: boolean): Finding {
  if (tooShort) {
    return {
      id: uid('f'),
      kind: 'gap',
      sectionId: section.id,
      behaviourId: b.id,
      issueCode: b.issueCode,
      title: b.label,
      detail: INSUFFICIENT,
      evidence: [{ type: 'insufficient', note: INSUFFICIENT, verified: false }],
      confidence: 'low',
      confidenceReason: 'Transcript too short to evaluate.',
      points,
      lessonId: b.lessonId,
    };
  }
  const evidence: Evidence[] = [];
  if (d.present) {
    evidence.push(...d.matches.map(quote));
    if (!d.matches.length) evidence.push(d.metric ? metric(d.metric) : absence(d.reason));
    else if (d.metric) evidence.push(metric(d.metric));
  } else {
    // Gap evidence: problem lines if any, else a documented absence + context.
    evidence.push(...d.matches.map(quote));
    if (!d.matches.length) evidence.push(d.metric ? metric(d.metric) : absence(`Not found in transcript. ${d.reason}`));
    evidence.push(...d.context.map(quote));
  }
  return {
    id: uid('f'),
    kind: d.present ? 'strength' : 'gap',
    sectionId: section.id,
    behaviourId: b.id,
    issueCode: b.issueCode,
    title: d.present ? b.strengthTitle : d.gapTitle ?? b.gapTitle,
    detail: d.detail ?? d.reason,
    evidence,
    confidence: d.confidence,
    confidenceReason: confidenceReasonFor(d),
    points: Math.round(points * 10) / 10,
    lessonId: b.lessonId,
  };
}

function confidenceReasonFor(d: Detection): string {
  if (d.confidence === 'high')
    return d.present ? 'Direct transcript quote supports this.' : 'Transcript clearly shows how this part of the call ended.';
  if (d.confidence === 'medium')
    return d.present ? 'Supported by a transcript line, but matched by keywords.' : 'Not found by keyword scan — a paraphrase may have been missed. QA should confirm.';
  return 'Heuristic signal only (tone and flow cannot be judged reliably from text keywords).';
}

function sectionConfidence(ds: Detection[], tooShort: boolean): { level: Confidence; reason: string } {
  if (tooShort) return { level: 'low', reason: 'Transcript too short to evaluate.' };
  if (ds.some((d) => d.confidence === 'low'))
    return { level: 'low', reason: 'Includes heuristic judgements (flow, tone or confidence) that keyword matching cannot assess reliably.' };
  if (ds.some((d) => !d.present && d.confidence === 'medium'))
    return { level: 'medium', reason: 'Some behaviours were not found by keyword scan; a paraphrase may have been missed.' };
  return { level: 'high', reason: 'Every finding is backed by a direct transcript line.' };
}

const confRank = (f: Finding) => ({ high: 0, medium: 1, low: 2 })[f.confidence];
const sectionOrder = (fw: QAFramework, f: Finding) => fw.sections.findIndex((s) => s.id === f.sectionId);

function pickSection(sections: SectionResult[], mode: 'best' | 'worst'): SectionResult | null {
  const sorted = [...sections].sort((a, b) =>
    mode === 'best' ? b.percentage - a.percentage || b.strengths.length - a.strengths.length || b.maxScore - a.maxScore : a.percentage - b.percentage || b.maxScore - a.maxScore,
  );
  const s = sorted[0];
  if (!s) return null;
  if (mode === 'worst' && s.percentage === 100) return null;
  return s;
}

function strengthLabel(s: SectionResult): string {
  const word = s.percentage >= 85 ? 'Excellent' : s.percentage >= 70 ? 'Strong' : 'Developing';
  return `${word} ${s.name.toLowerCase()}`;
}

function dedupeBy<T>(list: T[], key: (t: T) => string): T[] {
  const seen = new Set<string>();
  return list.filter((x) => (seen.has(key(x)) ? false : (seen.add(key(x)), true)));
}

// ─── key moments ───────────────────────────────────────────────────────────
function buildKeyMoments(ctx: DetectionContext, outcomes: BehaviourOutcome[], detectId: (id: DetectorId) => Detection): KeyMoment[] {
  const moments: KeyMoment[] = [];
  const bestPriority = ['concern_to_solution', 'mirror_concern', 'appointment_confirmed', 'previous_treatment', 'empathy', 'ai_skin_analysis', 'concern_probe'];
  const best = bestPriority
    .map((id) => outcomes.find((o) => o.behaviour.detector === id && o.detection.present && o.detection.matches.length))
    .find(Boolean);
  if (best) {
    moments.push({
      id: uid('km'),
      kind: 'best',
      title: best.behaviour.strengthTitle,
      detail: best.detection.reason,
      evidence: quote(best.detection.matches[0]),
    });
  }

  const booked = outcomes.find((o) => o.behaviour.detector === 'appointment_confirmed')?.detection.present;
  const lastHes = ctx.hesitations[ctx.hesitations.length - 1];
  if (lastHes && !booked) {
    moments.push({
      id: uid('km'),
      kind: 'missed',
      title: 'Hesitation without a specific closing attempt',
      detail: 'The customer showed hesitation here, but the call did not end with a confirmed date and time.',
      evidence: quote(lastHes),
    });
  } else {
    const handoff = outcomes.find((o) => o.behaviour.detector === 'no_handoff_close' && !o.detection.present);
    if (handoff?.detection.matches[0])
      moments.push({ id: uid('km'), kind: 'missed', title: handoff.behaviour.gapTitle, detail: handoff.detection.reason, evidence: quote(handoff.detection.matches[0]) });
  }

  const giftMissing = outcomes.some((o) => ['skincare_gift', 'promo_deadline'].includes(o.behaviour.detector) && !o.detection.present);
  const firstHes = ctx.hesitations[0];
  const history = ctx.customer.find((l) => /(tried|before|laser|facial|treatment|serum|做過|做过|試過|试过|雷射|激光)/i.test(l.text));
  const empathyMissing = !detectId('empathy').present || !EQ_PATTERNS.compliment.test(ctx.agent.map((l) => l.text).join(' '));
  if (firstHes && giftMissing && firstHes !== lastHes) {
    moments.push({
      id: uid('km'),
      kind: 'coaching',
      title: 'Good moment to introduce urgency',
      detail: 'The customer hesitated here — a natural point to bring in the 2-week deadline and free skincare gift.',
      evidence: quote(firstHes),
    });
  } else if (history && empathyMissing) {
    moments.push({
      id: uid('km'),
      kind: 'coaching',
      title: 'Good moment for empathy or a compliment',
      detail: 'The customer shared their treatment history — a chance to acknowledge their effort before explaining the solution.',
      evidence: quote(history),
    });
  } else if (firstHes && giftMissing) {
    moments.push({
      id: uid('km'),
      kind: 'coaching',
      title: 'Good moment to introduce urgency',
      detail: 'The customer hesitated — bring in the deadline and gift as a concrete reason to book.',
      evidence: quote(firstHes),
    });
  }
  return moments;
}

// ─── EQ observation (unscored) ─────────────────────────────────────────────
function buildEQ(framework: QAFramework, ctx: DetectionContext, detectId: (id: DetectorId) => Detection): EQObservation[] {
  return framework.eqDimensions.map((dim) => {
    const base = { dimensionId: dim.id, label: dim.label, emoji: dim.emoji, inReference: dim.inReference, coaching: dim.coachingTip };
    const lineHits = (re: RegExp) => ctx.agent.filter((l) => re.test(l.text));
    switch (dim.id) {
      case 'compliment': {
        const hits = lineHits(EQ_PATTERNS.compliment);
        return hits.length
          ? { ...base, status: 'present' as const, observation: 'A genuine compliment was given to the customer.', evidence: hits.slice(0, 1).map(quote) }
          : { ...base, status: 'absent' as const, observation: 'No compliment to the customer was found in the transcript.', evidence: [absence('Not found in transcript (keyword scan).')] };
      }
      case 'humor': {
        const hits = lineHits(EQ_PATTERNS.humor);
        return hits.length
          ? { ...base, status: 'present' as const, observation: 'Light humour or laughter appears in the consultant\'s lines.', evidence: hits.slice(0, 1).map(quote) }
          : {
              ...base,
              status: 'absent' as const,
              observation: 'No humour or laughter markers found. Note: transcripts may not capture tone, so treat this lightly.',
              evidence: [absence('Not found in transcript (keyword scan).')],
            };
      }
      case 'graceful_decline': {
        const req = ctx.customer.find((l) => EQ_PATTERNS.declineRequest.test(l.text));
        if (!req) {
          return {
            ...base,
            status: 'insufficient' as const,
            observation: `${INSUFFICIENT} The customer made no request that needed to be declined.`,
            evidence: [{ type: 'insufficient' as const, note: INSUFFICIENT, verified: false }],
          };
        }
        const reply = ctx.agent.find((l) => l.index > req.index);
        const redirect = reply && EQ_PATTERNS.declineRedirect.test(reply.text);
        const handoff = reply && /(senior|colleague|高級同事|高级同事)/i.test(reply.text);
        return {
          ...base,
          status: redirect ? ('present' as const) : handoff ? ('weak' as const) : ('absent' as const),
          observation: redirect
            ? 'The request was declined warmly with a confident redirect.'
            : handoff
              ? 'The request was handed off rather than addressed with a confident, warm redirect.'
              : 'The request was not clearly redirected.',
          evidence: [quote(req), ...(reply ? [quote(reply)] : [])],
        };
      }
      case 'empathy': {
        const d = detectId('empathy');
        return d.present
          ? { ...base, status: 'present' as const, observation: 'Empathy was expressed.', evidence: d.matches.slice(0, 1).map(quote) }
          : { ...base, status: 'absent' as const, observation: 'No empathy statement found.', evidence: [absence('Not found in transcript (keyword scan).')] };
      }
      case 'confidence': {
        const d = detectId('confidence');
        return {
          ...base,
          status: d.present ? ('present' as const) : ('weak' as const),
          observation: `${d.reason} (Heuristic — low confidence.)`,
          evidence: [...d.matches.slice(0, 1).map(quote), ...(d.metric ? [metric(d.metric)] : [])],
        };
      }
      case 'emotional_connection': {
        const pain = detectId('emotional_pain');
        const emp = detectId('empathy');
        const status = pain.present && emp.present ? 'present' : pain.present || emp.present ? 'weak' : 'absent';
        return {
          ...base,
          status: status as 'present' | 'weak' | 'absent',
          observation:
            status === 'present'
              ? 'The consultant explored how the concern feels and responded with empathy.'
              : status === 'weak'
                ? 'Some emotional connection — either the feeling was explored or empathy was shown, but not both.'
                : 'The conversation stayed on facts; no emotional connection was found.',
          evidence: [...pain.matches.slice(0, 1), ...emp.matches.slice(0, 1)].map(quote).concat(status === 'absent' ? [absence('Not found in transcript (keyword scan).')] : []),
        };
      }
    }
  });
}

// ─── role model moment ─────────────────────────────────────────────────────
function buildRoleModel(framework: QAFramework, sections: SectionResult[], ctx: DetectionContext, outcomes: BehaviourOutcome[]): RoleModelComparison[] {
  const out: RoleModelComparison[] = [];
  const weakest = [...sections].filter((s) => s.gaps.length).sort((a, b) => a.percentage - b.percentage);

  for (const s of weakest) {
    if (out.length >= 3) break;
    const section = framework.sections.find((x) => x.id === s.sectionId)!;
    const gap = s.gaps[0];
    const outcome = outcomes.find((o) => o.behaviour.id === gap.behaviourId);
    const current = currentMoment(section, ctx, outcome);

    const ref = section.roleModels?.find((r) => roleModelFits(r.line, gap.behaviourId ?? '')) ?? section.roleModels?.[0];
    if (ref) {
      out.push({
        sectionId: s.sectionId,
        sectionName: s.name,
        current: current.evidence,
        currentSummary: current.summary,
        ideal: ref.line,
        idealGlossEn: ref.glossEn,
        idealKind: 'reference',
        idealAttribution: `${ref.attributedTo} — ${ref.source.document}`,
        whyItWorks: ref.whyItWorks,
        source: ref.source,
      });
    } else if (outcome && SUGGESTED_PHRASING[outcome.behaviour.detector]) {
      out.push({
        sectionId: s.sectionId,
        sectionName: s.name,
        current: current.evidence,
        currentSummary: current.summary,
        ideal: SUGGESTED_PHRASING[outcome.behaviour.detector]!,
        idealKind: 'suggested',
        idealAttribution: 'Suggested phrasing — generated coaching example, not a real call',
        whyItWorks: outcome.behaviour.whyItMatters,
      });
    }
  }
  return out;
}

function roleModelFits(line: string, behaviourId: string): boolean {
  if (/gift|deadline|slots|offer/.test(behaviourId)) return /送|名額|星期內/.test(line);
  if (/appointment|options|recap|handoff|availability/.test(behaviourId)) return /鉛住|上午十點/.test(line);
  return true;
}

function currentMoment(section: FrameworkSection, ctx: DetectionContext, outcome?: BehaviourOutcome): { evidence: Evidence; summary: string } {
  const d = outcome?.detection;
  const problem = d?.matches[0] ?? d?.context[0];
  if (problem) return { evidence: quote(problem), summary: d!.reason };
  if (section.journeyStage === 'closing' && ctx.lines.length) {
    const last = ctx.hesitations[ctx.hesitations.length - 1] ?? ctx.lines[ctx.lines.length - 1];
    return { evidence: quote(last), summary: 'This is where the call ended.' };
  }
  return {
    evidence: absence(`Not found in transcript. ${d?.reason ?? ''}`.trim()),
    summary: d?.reason ?? 'Behaviour not observed.',
  };
}

// ─── action plan ───────────────────────────────────────────────────────────
function buildActionPlan(framework: QAFramework, gaps: Finding[], sections: SectionResult[]): ActionPlanItem[] {
  const behaviours = new Map(framework.sections.flatMap((s) => s.behaviours.map((b) => [b.id, b] as const)));
  const actions = dedupeBy(
    gaps.map((g) => ({ g, b: behaviours.get(g.behaviourId ?? '') })).filter((x) => x.b),
    (x) => x.b!.practiceAction,
  );
  const plan: ActionPlanItem[] = [];
  actions.slice(0, 2).forEach(({ g, b }) => plan.push({ id: uid('ap'), phase: 'immediate', action: b!.practiceAction, sectionId: g.sectionId, lessonId: b!.lessonId }));
  actions.slice(2, 4).forEach(({ g, b }) => plan.push({ id: uid('ap'), phase: 'week2', action: b!.practiceAction, sectionId: g.sectionId, lessonId: b!.lessonId }));
  actions.slice(4, 5).forEach(({ g, b }) => plan.push({ id: uid('ap'), phase: 'week3_4', action: b!.practiceAction, sectionId: g.sectionId, lessonId: b!.lessonId }));

  const weakest = [...sections].sort((a, b) => a.percentage - b.percentage).slice(0, 2).filter((s) => s.percentage < 100);
  if (weakest.length) {
    plan.push({
      id: uid('ap'),
      phase: 'week3_4',
      action: `Shadow a role-model call focusing on ${weakest.map((s) => `${s.code} (${s.name})`).join(' and ')} delivery.`,
      sectionId: weakest[0].sectionId,
    });
  }
  if (!plan.length) {
    plan.push({ id: uid('ap'), phase: 'immediate', action: 'Keep your current call flow — record one call this week as a team example.' });
  }
  return plan;
}

// ─── journey ───────────────────────────────────────────────────────────────
function buildJourney(framework: QAFramework, outcomes: BehaviourOutcome[], transcript: ParsedTranscript): JourneyStageResult[] {
  const byStage = new Map<JourneyStageId, BehaviourOutcome[]>();
  for (const o of outcomes) {
    const stage = BEHAVIOUR_STAGE[o.behaviour.detector] ?? o.section.journeyStage;
    byStage.set(stage, [...(byStage.get(stage) ?? []), o]);
  }
  const stages = [...STAGE_ORDER, 'rapport' as const].filter((s) => byStage.has(s));
  const firstLine = (os: BehaviourOutcome[]) =>
    os.flatMap((o) => (o.detection.present ? o.detection.matches : [])).sort((a, b) => a.index - b.index)[0];

  const lastTs = [...transcript.lines].reverse().find((l) => l.seconds !== null)?.seconds ?? null;
  const starts = stages.map((s) => (s === 'rapport' ? undefined : firstLine(byStage.get(s)!)));

  return stages.map((stage, i) => {
    const os = byStage.get(stage)!;
    const max = os.reduce((s, o) => s + o.points, 0);
    const earned = os.reduce((s, o) => s + (o.detection.present ? o.points : 0), 0);
    const percentage = pct(earned, max);
    const start = starts[i];
    let timeSpentSec: number | null = null;
    if (stage !== 'rapport' && start?.seconds != null) {
      const next = starts.slice(i + 1).find((l) => l?.seconds != null && l.seconds > start.seconds!);
      const end = next?.seconds ?? lastTs;
      if (end != null && end > start.seconds) timeSpentSec = end - start.seconds;
    }
    const gap = os.filter((o) => !o.detection.present).sort((a, b) => b.points - a.points)[0];
    const strength = os.filter((o) => o.detection.present).sort((a, b) => b.points - a.points)[0];
    return {
      stage,
      label: STAGE_META[stage].label,
      emoji: STAGE_META[stage].emoji,
      sectionIds: [...new Set(os.map((o) => o.section.id))],
      score: Math.round(earned * 10) / 10,
      maxScore: Math.round(max * 10) / 10,
      percentage,
      status: sectionBand(framework, percentage).status,
      timeSpentSec,
      startTimestamp: start?.timestamp ?? null,
      keyObservation: gap ? gap.behaviour.gapTitle : strength ? strength.behaviour.strengthTitle : '—',
    };
  });
}


// ─── customer profile ──────────────────────────────────────────────────────
function buildCustomerProfile(ctx: DetectionContext): CustomerProfileItem[] {
  const item = (label: string, re: RegExp, notDiscussedNote: string): CustomerProfileItem => {
    const hits = ctx.customer.filter((l) => re.test(l.text));
    if (!hits.length) return { label, value: notDiscussedNote, evidence: [absence('Not discussed in the transcript.')], notDiscussed: true };
    return { label, value: hits[0].text.length > 140 ? `${hits[0].text.slice(0, 137)}…` : hits[0].text, evidence: hits.slice(0, 2).map(quote), notDiscussed: false };
  };
  return [
    item(
      'Chief concern',
      /(pores?|acne|pimple|scar|marks|blemish|pigment|melasma|spots|sensitiv|redness|dull|wrinkle|fine lines|oily|dry|毛孔|痘|疤|斑|敏感|潮紅|暗沉|皺紋|出油)/i,
      'Not clearly stated',
    ),
    item('Trigger', /(saw|advert|\bads?\b|facebook|instagram|tiktok|online|friend|recommend|廣告|广告|網上|网上|朋友)/i, 'Not discussed'),
    item('Previous treatment', /(tried|laser|facial|peel|treatment|serum|product|clinic|做過|做过|試過|试过|雷射|激光|水漱|療程|疗程)/i, 'Not discussed'),
    item('Lifestyle', /(routine|sunscreen|sun|outdoor|sleep|diet|stress|make-?up|work (late|shift)|作息|防曬|防晒|睡|飲食|饮食|化妝|化妆)/i, 'Not explored during the call (gap)'),
    item('Location', /(live|stay|near|area|work (in|at|near)|住|附近|那邊|那边)/i, 'Not discussed'),
  ];
}

// ─── narrative ─────────────────────────────────────────────────────────────
function buildNarrative(staffName: string, ev: Evaluation, gaps: Finding[], framework: QAFramework): string {
  if (!ev.sections.some((s) => s.score > 0)) return `${INSUFFICIENT} The transcript did not contain enough consultant dialogue to evaluate against the ${framework.frameworkName}.`;
  const best = ev.sections.find((s) => s.sectionId === ev.summary.mainStrength?.sectionId);
  const worst = ev.sections.find((s) => s.sectionId === ev.summary.mainGap?.sectionId);
  const strengthsCount = ev.sections.reduce((s, x) => s + x.strengths.length, 0);
  const parts = [
    `${staffName || 'The consultant'} scored ${ev.overallScore}/${ev.maxScore} (${ev.overallPercentage}%) on the ${framework.frameworkName}${ev.callType && ev.callType !== 'new_lead' ? ` (${framework.callTypeProfiles.find((p) => p.callType === ev.callType)?.label.toLowerCase()} scope)` : ''}.`,
    best ? `The strongest area was ${best.name} (${best.percentage}%), with ${strengthsCount} ICC behaviours observed across the call.` : '',
    worst && gaps[0]
      ? `The biggest opportunity is ${worst.name} (${worst.percentage}%): ${gaps
          .filter((g) => g.sectionId === worst.sectionId)
          .slice(0, 2)
          .map((g) => g.title.charAt(0).toLowerCase() + g.title.slice(1))
          .join(', and ')}.`
      : 'No gaps were detected against the framework behaviours.',
  ];
  return parts.filter(Boolean).join(' ');
}
