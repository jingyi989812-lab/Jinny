/**
 * qaEvaluator — the single entry point the UI uses to evaluate a call.
 *
 *   Transcript (pasted or imported) ──► evaluateCall(input) ──► Evaluation
 *
 * Provider selection:
 *   'mock'   → offline keyword heuristics (default in this prototype)
 *   'claude' → backend → Claude API (Coming Soon; requires VITE_QA_API_URL)
 */
import type { EvaluationInput } from '@/types/call';
import type { Evaluation } from '@/types/qa';
import { evaluateWithClaude, isClaudeConfigured } from './claudeEvaluator';
import { evaluateWithMock } from './mockEvaluator';

export type EvaluatorProvider = 'mock' | 'claude';

export async function evaluateCall(input: EvaluationInput, provider: EvaluatorProvider = 'mock'): Promise<Evaluation> {
  if (provider === 'claude') return evaluateWithClaude(input);
  return evaluateWithMock(input);
}

export { evaluateWithMock, isClaudeConfigured };
export { checkClaudeHealth, judgementsToEvaluation, type ClaudeHealth } from './claudeEvaluator';
export { parseTranscript, countWords, formatDuration } from './transcriptParser';
