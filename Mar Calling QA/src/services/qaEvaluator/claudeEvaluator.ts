/**
 * CLAUDE EVALUATOR (client side).
 *
 * The browser never holds the API key. It posts the transcript to the local QA
 * API (server/qaApi.ts, mounted at /api by the Vite dev server), which calls
 * Claude. Claude returns behaviour judgements with line-numbered quotes; they are
 * turned into a full Evaluation by the same assembler as the demo engine, so
 * scores are always computed centrally from the ICC framework.
 */
import { getFramework } from '@/config/frameworks';
import type { EvaluationInput } from '@/types/call';
import type { DetectorId } from '@/types/framework';
import type { EQObservation, Evaluation, Evidence, TranscriptLine } from '@/types/qa';
import type { Detection } from './detectors';
import { assembleEvaluation } from './mockEvaluator';
import type { ClaudeJudgementResponse } from './prompt';

export const CLAUDE_MODEL = 'claude-opus-5';

/** Production: set VITE_QA_API_URL to a secured backend. Development: the local /api route. */
const API_BASE: string | undefined = import.meta.env?.VITE_QA_API_URL ?? (import.meta.env?.DEV ? '/api' : undefined);

export interface ClaudeHealth {
  reachable: boolean;
  keyConfigured: boolean;
  model?: string;
}

let lastHealth: ClaudeHealth = { reachable: false, keyConfigured: false };

export async function checkClaudeHealth(): Promise<ClaudeHealth> {
  if (!API_BASE) return (lastHealth = { reachable: false, keyConfigured: false });
  try {
    const res = await fetch(`${API_BASE}/health`, { cache: 'no-store' });
    if (!res.ok) return (lastHealth = { reachable: false, keyConfigured: false });
    const body = (await res.json()) as { keyConfigured: boolean; model: string };
    return (lastHealth = { reachable: true, keyConfigured: body.keyConfigured, model: body.model });
  } catch {
    return (lastHealth = { reachable: false, keyConfigured: false });
  }
}

export const isClaudeConfigured = () => lastHealth.reachable && lastHealth.keyConfigured;

export async function requestClaudeJudgements(input: EvaluationInput): Promise<ClaudeJudgementResponse> {
  if (!API_BASE) throw new Error('The Claude evaluator is not available in this build.');
  const res = await fetch(`${API_BASE}/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // Only what Claude needs — lead numbers and file names are never sent.
    body: JSON.stringify({
      callId: input.callId,
      staffName: input.staffName,
      callDate: input.callDate,
      language: input.language,
      transcript: input.transcript,
      frameworkId: input.frameworkId,
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `Evaluation service error (${res.status})`);
  return body as ClaudeJudgementResponse;
}

export async function evaluateWithClaude(input: EvaluationInput): Promise<Evaluation> {
  const data = await requestClaudeJudgements(input);
  return judgementsToEvaluation(input, data);
}

const norm = (s: string) => s.replace(/\s+/g, '').toLowerCase();

/** Map a cited quote to the transcript line that really contains it; drop it if none does. */
function resolveLine(lines: TranscriptLine[], cited: { line: number; quote: string }): TranscriptLine | undefined {
  const q = norm(cited.quote.replace(/…$|\.\.\.$/, ''));
  if (!q) return undefined;
  const hinted = lines[cited.line];
  if (hinted && norm(hinted.text).includes(q)) return hinted;
  return lines.find((l) => norm(l.text).includes(q));
}

export function judgementsToEvaluation(input: EvaluationInput, data: ClaudeJudgementResponse): Evaluation {
  const framework = getFramework(input.frameworkId);
  const byDetector = new Map(data.judgements.map((j) => [j.detector, j]));
  const callType = input.callTypeLocked ? input.callType : (data.callType?.type ?? input.callType);

  const evaluation = assembleEvaluation(
    { ...input, callType },
    {
      engine: {
        provider: 'claude',
        model: data.model ?? CLAUDE_MODEL,
        engineVersion: 'claude-judgements-v1',
        disclaimer: 'AI evaluation by Claude. Every quote is checked against the transcript; a QA reviewer confirms the final score.',
      },
      judge: (detector: DetectorId, ctx) => {
        const j = byDetector.get(detector);
        if (!j || j.status === 'insufficient')
          return { applicable: true, present: false, matches: [], context: [], confidence: 'low', reason: 'Insufficient evidence to determine.' } satisfies Detection;
        const lines = [...new Set(j.evidence.map((e) => resolveLine(ctx.lines, e)).filter((l): l is TranscriptLine => Boolean(l)))];
        return {
          applicable: j.status !== 'not_applicable',
          present: j.status === 'present',
          matches: lines.slice(0, 2),
          context: [],
          // A "present" judgement whose quotes could not be found is not trustworthy.
          confidence: j.status === 'present' && j.evidence.length > 0 && lines.length === 0 ? 'low' : j.confidence,
          reason: j.reason,
        } satisfies Detection;
      },
      eqObservation: framework.eqDimensions
        .filter((d) => d.inReference)
        .map((dim): EQObservation => {
          const e = data.eq.find((x) => x.dimension === dim.id);
          const evidence: Evidence[] = (e?.evidence ?? []).map((q) => ({ type: 'quote', quote: q.quote, lineIndex: q.line, verified: false }));
          return {
            dimensionId: dim.id,
            label: dim.label,
            emoji: dim.emoji,
            inReference: true,
            status: e?.status ?? 'insufficient',
            observation: e?.observation ?? 'Insufficient evidence to determine.',
            coaching: dim.coachingTip,
            evidence: evidence.length ? evidence : [{ type: 'insufficient', note: 'Insufficient evidence to determine.', verified: false }],
          };
        }),
    },
  );
  evaluation.claude = { judgements: data, callTypeSuggestion: data.callType };
  return evaluation;
}
