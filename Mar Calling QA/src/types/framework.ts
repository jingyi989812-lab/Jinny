/**
 * ICC framework definitions.
 *
 * A framework is pure configuration: sections, max scores, required behaviours,
 * status bands and pass bands. No UI component should hard-code any of these —
 * always read them from the framework registry (src/config/frameworks).
 */

/** Where a rule came from. Every rule must be traceable, or marked PLACEHOLDER. */
export type SourceDocument =
  | 'CSC_Call_Template_Jun15.pdf'
  | 'XinNi_ICC_Report_v2.pdf'
  | 'ICC 秘籍 - Google Sheets.pdf'
  | 'PLACEHOLDER';

export interface SourceRef {
  document: SourceDocument;
  /** Short quote / paraphrase of what the source says, or why this is a placeholder. */
  note: string;
}

/** The call-journey stages used for the visual timeline (shared across frameworks). */
export type JourneyStageId =
  | 'opening'
  | 'discovery'
  | 'solution'
  | 'credibility'
  | 'objection'
  | 'urgency'
  | 'closing'
  | 'rapport';

/**
 * Identifiers for transcript detectors. The mock evaluator implements these
 * with keyword heuristics; a real Claude evaluator judges them semantically.
 */
export type DetectorId =
  | 'warm_greeting'
  | 'agent_name'
  | 'brand_name'
  | 'call_purpose'
  | 'customer_name'
  | 'icebreaker_compliment'
  | 'connection_recovery'
  | 'concern_probe'
  | 'clarify_vague'
  | 'mirror_concern'
  | 'duration_probe'
  | 'previous_treatment'
  | 'lifestyle'
  | 'emotional_pain'
  | 'ai_skin_analysis'
  | 'light_system'
  | 'light_purpose'
  | 'concern_to_solution'
  | 'root_cause'
  | 'differentiation_testimonial'
  | 'clinic_experience'
  | 'clinic_branches'
  | 'doctor_credibility'
  | 'no_obligation'
  | 'trial_risk_reduction'
  | 'empathy'
  | 'hesitation_incentive'
  | 'promo_deadline'
  | 'skincare_gift'
  | 'limited_slots'
  | 'clear_offer'
  | 'availability_probe'
  | 'two_options'
  | 'appointment_confirmed'
  | 'recap_next_steps'
  | 'no_handoff_close'
  | 'natural_flow'
  | 'confidence';

export interface Behaviour {
  id: string;
  label: string;
  detector: DetectorId;
  /**
   * Relative weight inside the section. Reference documents only give section
   * totals, so equal weights are used unless marked otherwise (see section.pointAllocation).
   */
  weight: number;
  /** Behaviour only applies when a condition occurs in the call (e.g. customer hesitated). */
  conditional?: 'customer_hesitation';
  /** Friendly title when the behaviour is present. */
  strengthTitle: string;
  /** Friendly title when it is missing. */
  gapTitle: string;
  /** Why this behaviour matters (source-backed where possible). */
  whyItMatters: string;
  /** Coaching suggestion shown when missing. Always rendered as a suggestion. */
  coachingTip: string;
  /** Short practice action used in the 30-day action plan. */
  practiceAction: string;
  /** Code used to aggregate recurring issues across calls. */
  issueCode: string;
  /** Learning Hub lesson this behaviour links to. */
  lessonId: LessonId;
  source: SourceRef;
}

export type LessonId =
  | 'introduction'
  | 'discovery'
  | 'product'
  | 'rapport'
  | 'objection'
  | 'urgency'
  | 'closing';

export interface RoleModelLine {
  /** The reference line, verbatim from the source document. */
  line: string;
  /** Unofficial English gloss added by this app (clearly labelled). */
  glossEn?: string;
  /** Who the reference document attributes this to. */
  attributedTo: string;
  whyItWorks: string;
  source: SourceRef;
}

export interface FrameworkSection {
  id: string;
  /** Code as printed in the source (I, C1, C2, Close, A–G …). */
  code: string;
  name: string;
  shortName: string;
  emoji: string;
  maxScore: number;
  /** Criteria text, as written in the source document. */
  criteria: string;
  journeyStage: JourneyStageId;
  lessonId: LessonId;
  behaviours: Behaviour[];
  /** Reference role-model line(s) for this section, if the source contains any. */
  roleModels?: RoleModelLine[];
  /** Recommended duration for this stage, if the source gives one. */
  recommendedDuration?: string;
  source: SourceRef;
  pointAllocation: SourceRef;
}

export type SectionStatus = 'excellent' | 'strong' | 'developing' | 'needs_improvement' | 'missed';
export type OverallStatus = 'pass' | 'needs_improvement' | 'fail';

export interface Band<T extends string> {
  status: T;
  /** Inclusive lower bound, percentage 0–100. */
  minPercentage: number;
  label: string;
  emoji: string;
  source: SourceRef;
}

export type EQDimensionId =
  | 'compliment'
  | 'humor'
  | 'graceful_decline'
  | 'empathy'
  | 'confidence'
  | 'emotional_connection';

export interface EQDimension {
  id: EQDimensionId;
  label: string;
  labelZh?: string;
  emoji: string;
  /** true = listed in the reference EQ observation; false = app extension. */
  inReference: boolean;
  coachingTip: string;
  source: SourceRef;
}

export interface ActionPlanPhase {
  id: 'immediate' | 'week2' | 'week3_4';
  label: string;
  source: SourceRef;
}

export type CallType = 'new_lead' | 'follow_up' | 'existing_customer';

/** Which journey stages are scored for a type of call. */
export interface CallTypeProfile {
  callType: CallType;
  label: string;
  emoji: string;
  description: string;
  scoredStages: JourneyStageId[] | 'all';
  source: SourceRef;
}

export interface QAFramework {
  id: string;
  frameworkName: string;
  frameworkVersion: string;
  shortLabel: string;
  description: string;
  /** Total available points (sum of section max scores). */
  maxTotal: number;
  sections: FrameworkSection[];
  sectionBands: Band<SectionStatus>[];
  overallBands: Band<OverallStatus>[];
  eqDimensions: EQDimension[];
  actionPlanPhases: ActionPlanPhase[];
  callTypeProfiles: CallTypeProfile[];
  /** Is this the production default? */
  isPrimary: boolean;
  source: SourceRef;
  /** Known inconsistencies or open questions found in the source documents. */
  sourceNotes: string[];
}
