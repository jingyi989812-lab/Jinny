/**
 * Evidence verifier — the guardrail against fabricated quotes and timestamps.
 *
 * Runs on EVERY evaluation regardless of provider (mock or Claude). Any quote
 * that does not appear verbatim in the transcript, or whose timestamp does not
 * match the transcript line, is replaced with an "insufficient evidence" marker.
 */
import type { Evaluation, Evidence, ParsedTranscript } from '@/types/qa';

const norm = (s: string) => s.replace(/\s+/g, ' ').replace(/[“”]/g, '"').replace(/[‘’]/g, "'").trim().toLowerCase();

export const INSUFFICIENT = 'Insufficient evidence to determine.';

export function verifyEvidenceItem(ev: Evidence, transcript: ParsedTranscript): { evidence: Evidence; removed: boolean } {
  if (ev.type !== 'quote') return { evidence: { ...ev, verified: ev.type !== 'insufficient' }, removed: false };
  const q = norm((ev.quote ?? '').replace(/…$|\.\.\.$/, ''));
  if (!q) return { evidence: { type: 'insufficient', note: INSUFFICIENT, verified: false }, removed: true };

  const candidates = typeof ev.lineIndex === 'number' ? [transcript.lines[ev.lineIndex], ...transcript.lines] : transcript.lines;
  const line = candidates.find((l) => l && norm(l.text).includes(q));
  if (!line) {
    return {
      evidence: { type: 'insufficient', note: `${INSUFFICIENT} (A quote could not be matched to the transcript and was removed.)`, verified: false },
      removed: true,
    };
  }
  // Timestamps must come from the transcript line itself.
  return {
    evidence: { ...ev, lineIndex: line.index, timestamp: line.timestamp, speaker: line.speaker, verified: true },
    removed: false,
  };
}

export function verifyEvaluation(evaluation: Evaluation, transcript: ParsedTranscript): Evaluation {
  let checked = 0;
  let removed = 0;
  const fix = (list: Evidence[]) =>
    list.map((e) => {
      if (e.type === 'quote') checked++;
      const r = verifyEvidenceItem(e, transcript);
      if (r.removed) removed++;
      return r.evidence;
    });
  const fixOne = (e: Evidence) => fix([e])[0];

  const fixFinding = <T extends { evidence: Evidence[] }>(f: T): T => ({ ...f, evidence: fix(f.evidence) });

  const out: Evaluation = {
    ...evaluation,
    sections: evaluation.sections.map((s) => ({
      ...s,
      evidence: fix(s.evidence),
      strengths: s.strengths.map(fixFinding),
      gaps: s.gaps.map(fixFinding),
    })),
    strengths: evaluation.strengths.map(fixFinding),
    gaps: evaluation.gaps.map(fixFinding),
    keyMoments: evaluation.keyMoments.map((k) => ({ ...k, evidence: fixOne(k.evidence) })),
    eqObservation: evaluation.eqObservation.map(fixFinding),
    roleModelComparison: evaluation.roleModelComparison.map((r) => ({ ...r, current: fixOne(r.current) })),
    customerProfile: evaluation.customerProfile.map(fixFinding),
  };
  // Key moments must have real evidence — drop those that lost it.
  out.keyMoments = out.keyMoments.filter((k) => k.evidence.type === 'quote');
  out.verification = { checkedQuotes: checked, removedQuotes: removed };
  return out;
}
