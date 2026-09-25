import type { CallType } from './framework';
import type { Evaluation, QAReview } from './qa';

export interface CallInfo {
  staffId: string;
  staffName: string;
  callDate: string; // ISO date (yyyy-mm-dd)
  durationSec: number | null;
  leadNumber: string;
  outlet: string;
  leadSource: string;
  language: string;
  reviewer: string;
}

export interface Call extends CallInfo {
  id: string;
  frameworkId: string;
  transcript: string;
  transcriptSource: 'notebooklm-paste' | 'demo-synthetic' | 'recording-import';
  /** Original recording file name, for imported recordings. */
  sourceName?: string;
  /** Call type used for scoring scope. */
  callType?: CallType;
  /** 'estimated' from transcript cues, or set by a QA reviewer. */
  callTypeSource?: 'estimated' | 'qa' | 'default';
  callTypeReason?: string;
  evaluation: Evaluation;
  /** Compact Claude result kept in storage instead of the full evaluation. */
  claudeJudgements?: import('@/services/qaEvaluator/prompt').ClaudeJudgementResponse;
  claudeEvaluatedAt?: string;
  /** Human QA review history, newest last. The latest entry is authoritative. */
  qaReviews: QAReview[];
  createdAt: string;
  isDemo: boolean;
}

export interface CallDraft extends Partial<CallInfo> {
  frameworkId: string;
  transcript: string;
  savedAt: string;
}

/** Input contract of the evaluation service (PART 31). */
export interface EvaluationInput {
  callId: string;
  staffName: string;
  callDate: string;
  duration: number | null;
  outlet: string;
  leadSource: string;
  language: string;
  transcript: string;
  frameworkId: string;
  callType?: CallType;
  /** true when a QA reviewer set the call type — engines must not change it. */
  callTypeLocked?: boolean;
}
