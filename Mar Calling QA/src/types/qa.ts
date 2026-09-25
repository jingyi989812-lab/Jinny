import type {
  CallType,
  EQDimensionId,
  JourneyStageId,
  LessonId,
  OverallStatus,
  SectionStatus,
  SourceRef,
} from './framework';

export type Speaker = 'agent' | 'customer' | 'unknown';
export type Confidence = 'high' | 'medium' | 'low';

/** One parsed line of a call transcript. */
export interface TranscriptLine {
  index: number;
  /** Timestamp exactly as it appears in the transcript, or null if none. */
  timestamp: string | null;
  seconds: number | null;
  speakerLabel: string;
  speaker: Speaker;
  text: string;
}

export interface ParsedTranscript {
  lines: TranscriptLine[];
  hasTimestamps: boolean;
  /** Notes about assumptions made while parsing (e.g. "Speaker 1 assumed to be the consultant"). */
  parseNotes: string[];
  wordCount: number;
  characterCount: number;
  /** false when consultant and customer lines could not be told apart. */
  diarized: boolean;
}

/**
 * Evidence is either a verbatim quote from the transcript, a documented absence,
 * or an explicit "insufficient evidence" marker. Never anything else.
 */
export interface Evidence {
  type: 'quote' | 'absence' | 'insufficient' | 'metric';
  /** Verbatim transcript text (type = quote only). */
  quote?: string;
  speaker?: Speaker;
  /** Timestamp copied from the transcript line; null when the transcript has none. */
  timestamp?: string | null;
  lineIndex?: number;
  /** Explanation for absence / insufficient evidence. */
  note?: string;
  /** Set by the evidence verifier: quote was found verbatim in the transcript. */
  verified: boolean;
}

export interface Finding {
  id: string;
  kind: 'strength' | 'gap' | 'observation';
  sectionId: string;
  behaviourId?: string;
  issueCode?: string;
  title: string;
  detail: string;
  evidence: Evidence[];
  confidence: Confidence;
  confidenceReason: string;
  /** Points this finding represents inside its section (gaps: points not earned). */
  points: number;
  lessonId?: LessonId;
}

export interface CoachingTip {
  id: string;
  sectionId?: string;
  text: string;
  /** Coaching is always an AI/app suggestion, never a factual finding. */
  isSuggestion: true;
  suggestedPhrasing?: string;
  /** Verbatim line from the ICC 秘籍 team playbook showing this behaviour. */
  playbookLine?: string;
  lessonId?: LessonId;
}

export interface SectionResult {
  sectionId: string;
  code: string;
  name: string;
  emoji: string;
  score: number;
  maxScore: number;
  percentage: number;
  status: SectionStatus;
  strengths: Finding[];
  gaps: Finding[];
  evidence: Evidence[];
  whyItMatters: string;
  coaching: CoachingTip;
  confidence: Confidence;
  confidenceReason: string;
  /** Behaviours that did not apply to this call (e.g. no hesitation occurred). */
  notApplicable: string[];
  journeyStage: JourneyStageId;
  /** false when this section is outside the scoring scope for the call type. */
  applicable?: boolean;
}

export type EQStatus = 'present' | 'weak' | 'absent' | 'insufficient';

export interface EQObservation {
  dimensionId: EQDimensionId;
  label: string;
  emoji: string;
  status: EQStatus;
  observation: string;
  coaching: string;
  evidence: Evidence[];
  inReference: boolean;
}

export interface RoleModelComparison {
  sectionId: string;
  sectionName: string;
  current: Evidence;
  currentSummary: string;
  ideal: string;
  idealGlossEn?: string;
  /** 'reference' = verbatim from a source document; 'suggested' = generated coaching example. */
  idealKind: 'reference' | 'suggested';
  idealAttribution: string;
  whyItWorks: string;
  source?: SourceRef;
}

export interface KeyMoment {
  id: string;
  kind: 'best' | 'missed' | 'coaching';
  title: string;
  detail: string;
  evidence: Evidence;
}

export interface ActionPlanItem {
  id: string;
  phase: 'immediate' | 'week2' | 'week3_4';
  action: string;
  sectionId?: string;
  lessonId?: LessonId;
}

export interface JourneyStageResult {
  stage: JourneyStageId;
  label: string;
  emoji: string;
  sectionIds: string[];
  score: number;
  maxScore: number;
  percentage: number;
  status: SectionStatus;
  /** Approximate time spent, derived from transcript timestamps; null if unavailable. */
  timeSpentSec: number | null;
  startTimestamp: string | null;
  keyObservation: string;
}

export interface CustomerProfileItem {
  label: string;
  value: string;
  evidence: Evidence[];
  /** true = the topic was not discussed in the call. */
  notDiscussed: boolean;
}

export interface EvaluationEngineInfo {
  provider: 'mock-heuristic' | 'claude';
  engineVersion: string;
  model?: string;
  disclaimer: string;
}

export interface Evaluation {
  id: string;
  callId: string;
  frameworkId: string;
  frameworkVersion: string;
  engine: EvaluationEngineInfo;
  createdAt: string;
  overallScore: number;
  maxScore: number;
  overallPercentage: number;
  status: OverallStatus;
  summary: {
    narrative: string;
    mainStrength: { sectionId: string; label: string } | null;
    mainGap: { sectionId: string; label: string } | null;
  };
  sections: SectionResult[];
  strengths: Finding[];
  gaps: Finding[];
  keyMoments: KeyMoment[];
  coachingTips: CoachingTip[];
  eqObservation: EQObservation[];
  roleModelComparison: RoleModelComparison[];
  actionPlan: ActionPlanItem[];
  journey: JourneyStageResult[];
  customerProfile: CustomerProfileItem[];
  /** Evidence-verifier output: quotes that failed verification were removed. */
  verification: { checkedQuotes: number; removedQuotes: number };
  parseNotes: string[];
  /** false when the transcript had no speaker labels (evidence speaker unknown, confidence capped). */
  diarized: boolean;
  callType?: CallType;
  /** Raw Claude judgements (compact) — lets the app rebuild this evaluation without calling Claude again. */
  claude?: {
    judgements: import('@/services/qaEvaluator/prompt').ClaudeJudgementResponse;
    callTypeSuggestion?: { type: CallType; reason: string };
  };
}

export interface QAReview {
  id: string;
  action: 'accepted' | 'edited' | 're-evaluated';
  aiScore: number;
  aiPercentage: number;
  finalScore: number;
  finalPercentage: number;
  finalStatus: OverallStatus;
  reviewer: string;
  comment: string;
  overrideReason: string;
  timestamp: string;
}
