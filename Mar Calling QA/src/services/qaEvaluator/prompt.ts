/**
 * Prompt + output contract for the Claude evaluation engine.
 *
 * Claude judges each ICC behaviour and returns verbatim evidence with line
 * numbers. It does NOT compute scores — the app computes them centrally from
 * the framework config (assembleEvaluation), so scoring stays consistent.
 */
import type { CallType, QAFramework } from '@/types/framework';
import type { ParsedTranscript } from '@/types/qa';
import { PLAYBOOK_PROMPT } from '@/content/iccPlaybook';

export const EVALUATION_RULES = [
  'Evaluate only what is supported by the transcript.',
  'Do not reward something simply because the consultant probably intended to do it.',
  'If something was not said, identify it as missing.',
  'Do not confuse "not mentioned" with "poorly explained" — say which one it is.',
  'Do not invent customer statements.',
  'Do not invent consultant statements.',
  'Do not invent timestamps. Only reference line numbers that exist in the numbered transcript.',
  'If evidence is insufficient, return status "insufficient" with the note "Insufficient evidence to determine."',
  'Separate factual evaluation (status + evidence) from coaching suggestions.',
  'Coaching suggestions may be generated, but they are always labelled as suggestions.',
  'Do not shame or insult staff.',
  'Always identify strengths as well as gaps.',
  'You are a coach, not a punishment mechanism.',
];

export function detectorIds(framework: QAFramework): string[] {
  return [...new Set(framework.sections.flatMap((s) => s.behaviours.map((b) => b.detector)))];
}

export function buildSystemPrompt(framework: QAFramework): string {
  const seen = new Set<string>();
  const behaviours: string[] = [];
  for (const s of framework.sections) {
    behaviours.push(`\nSection ${s.code} — ${s.name} (criteria: ${s.criteria})`);
    for (const b of s.behaviours) {
      if (seen.has(b.detector)) {
        behaviours.push(`- ${b.detector}: (same judgement as above)`);
        continue;
      }
      seen.add(b.detector);
      behaviours.push(
        `- ${b.detector}: ${b.label}. Present = ${b.strengthTitle.toLowerCase()}. Missing = ${b.gapTitle.toLowerCase()}.${b.conditional ? ' Only applies if the customer hesitated — otherwise status "not_applicable".' : ''}`,
      );
    }
  }
  const ids = detectorIds(framework);
  return [
    'You are the MARCOM Calling QA coach for the U.R. Klinik (also said "UR Clinic") customer service team in Malaysia.',
    `You evaluate outbound sales call transcripts against the ${framework.frameworkName} (${framework.frameworkVersion}).`,
    'Consultants call leads who enquired about skin treatments (pigmentation, acne marks, pores, sensitivity). The clinic offers an AI Skin Analysis, a 3-light therapy system, and trial packages; the team is coached to mention a 2-week promotional deadline and a free skincare gift, and to confirm a specific appointment date and time.',
    '',
    PLAYBOOK_PROMPT,
    '',
    'RULES',
    ...EVALUATION_RULES.map((r, i) => `${i + 1}. ${r}`),
    '',
    'ABOUT THE TRANSCRIPTS',
    '- Calls mix English, Mandarin, Cantonese and Malay.',
    '- Transcripts are often raw speech-to-text: words can be misheard (e.g. "URIN" for "UR Clinic", "去班" for "去斑"), and one line may contain words from both people.',
    '- Some transcripts label speakers; others say "Speaker not identified". When unlabelled, infer who is speaking from context. Only mark a consultant behaviour "present" when the consultant clearly said it, and lower confidence when attribution is uncertain.',
    '- Read obvious mis-transcriptions sensibly, but copy quotes exactly as written in the transcript.',
    '',
    'BEHAVIOURS TO JUDGE (use the id as the key)',
    ...behaviours,
    '',
    `Return exactly one judgement for each of these ${ids.length} ids: ${ids.join(', ')}.`,
    'For each: status = "present" | "missing" | "not_applicable" | "insufficient"; evidence = the supporting line numbers with quotes copied character-for-character from those lines (for "missing", cite the lines that show the gap, e.g. where the customer hesitated or where the call ended, or leave evidence empty); confidence = "high" | "medium" | "low"; reason = one short sentence in English.',
    'The application discards any quote it cannot find verbatim in the transcript.',
    '',
    'Also return EQ observations (unscored coaching only) for: compliment, humor, graceful_decline — status "present" | "weak" | "absent" | "insufficient" ("insufficient" for graceful_decline when the customer never asked for something that needed declining).',
    '',
    'Finally classify the call type:',
    '- new_lead: first sales conversation about the lead\'s enquiry (this includes following up an enquiry or advert for the first time).',
    '- follow_up: a later call after an earlier conversation with this consultant (e.g. "last time you said…").',
    '- existing_customer: someone already doing treatments (e.g. booking their next session).',
  ].join('\n');
}

export function buildUserPrompt(transcript: ParsedTranscript, meta: Record<string, string | number | null>): string {
  const numbered = transcript.lines
    .map((l) => `L${l.index} ${l.timestamp ? `[${l.timestamp}] ` : ''}${l.speaker === 'unknown' ? l.speakerLabel : `${l.speaker.toUpperCase()} (${l.speakerLabel})`}: ${l.text}`)
    .join('\n');
  return ['CALL DETAILS', ...Object.entries(meta).map(([k, v]) => `${k}: ${v ?? '—'}`), '', 'NUMBERED TRANSCRIPT', numbered].join('\n');
}

const EVIDENCE = {
  type: 'array',
  items: {
    type: 'object',
    additionalProperties: false,
    required: ['line', 'quote'],
    properties: { line: { type: 'integer' }, quote: { type: 'string' } },
  },
} as const;

/** JSON schema Claude's response must satisfy (structured outputs). */
export function buildOutputSchema(framework: QAFramework) {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['judgements', 'eq', 'callType'],
    properties: {
      judgements: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['detector', 'status', 'evidence', 'confidence', 'reason'],
          properties: {
            detector: { type: 'string', enum: detectorIds(framework) },
            status: { type: 'string', enum: ['present', 'missing', 'not_applicable', 'insufficient'] },
            evidence: EVIDENCE,
            confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
            reason: { type: 'string' },
          },
        },
      },
      eq: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['dimension', 'status', 'observation', 'evidence'],
          properties: {
            dimension: { type: 'string', enum: ['compliment', 'humor', 'graceful_decline'] },
            status: { type: 'string', enum: ['present', 'weak', 'absent', 'insufficient'] },
            observation: { type: 'string' },
            evidence: EVIDENCE,
          },
        },
      },
      callType: {
        type: 'object',
        additionalProperties: false,
        required: ['type', 'reason'],
        properties: {
          type: { type: 'string', enum: ['new_lead', 'follow_up', 'existing_customer'] },
          reason: { type: 'string' },
        },
      },
    },
  };
}

export interface ClaudeJudgementResponse {
  judgements: Array<{
    detector: string;
    status: 'present' | 'missing' | 'not_applicable' | 'insufficient';
    evidence: Array<{ line: number; quote: string }>;
    confidence: 'high' | 'medium' | 'low';
    reason: string;
  }>;
  eq: Array<{
    dimension: 'compliment' | 'humor' | 'graceful_decline';
    status: 'present' | 'weak' | 'absent' | 'insufficient';
    observation: string;
    evidence: Array<{ line: number; quote: string }>;
  }>;
  callType?: { type: CallType; reason: string };
  model?: string;
  usage?: { inputTokens: number; outputTokens: number; cacheReadTokens: number; cacheWriteTokens: number };
}
