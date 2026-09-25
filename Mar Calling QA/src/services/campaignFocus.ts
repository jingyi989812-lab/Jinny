/**
 * Checks whether a call carried the current campaign message (src/config/strategyFocus.ts).
 * Unscored: results never touch the ICC score. Consultant lines only — a keyword
 * the customer says does not count for the consultant.
 */
import { CAMPAIGN_FOCUS, type FocusKeyword } from '@/config/strategyFocus';
import type { Call } from '@/types/call';
import { buildContext } from './qaEvaluator/detectors';
import { parseTranscript } from './qaEvaluator/transcriptParser';

export interface FocusHit {
  keyword: FocusKeyword;
  present: boolean;
  /** The consultant line that showed it (verbatim), if any. */
  quote?: string;
  lineIndex?: number;
}

export interface FocusResult {
  hits: FocusHit[];
  covered: number;
  total: number;
  /** All keywords present. */
  onMessage: boolean;
  /** Speaker labels present, so attribution is reliable. */
  diarized: boolean;
}

export function focusForTranscript(transcript: string, staffName?: string): FocusResult {
  const parsed = parseTranscript(transcript, staffName);
  const ctx = buildContext(parsed.lines, staffName);
  const hits = CAMPAIGN_FOCUS.keywords.map((keyword): FocusHit => {
    const line = ctx.agent.find((l) => keyword.pattern.test(keyword.strip ? l.text.replace(keyword.strip, ' ') : l.text));
    return line ? { keyword, present: true, quote: snippet(line.text, keyword), lineIndex: line.index } : { keyword, present: false };
  });
  const covered = hits.filter((h) => h.present).length;
  return { hits, covered, total: hits.length, onMessage: covered === hits.length, diarized: parsed.diarized };
}

/** The part of the line around the keyword, so evidence stays readable. Words are never changed. */
function snippet(text: string, keyword: FocusKeyword, radius = 55): string {
  const searched = keyword.strip ? text.replace(keyword.strip, ' ') : text;
  const at = searched.search(keyword.pattern);
  if (at < 0 || text.length <= radius * 2) return text;
  const start = Math.max(0, at - radius);
  const end = Math.min(text.length, at + radius);
  return `${start > 0 ? '…' : ''}${text.slice(start, end).trim()}${end < text.length ? '…' : ''}`;
}

export const focusForCall = (call: Call): FocusResult => focusForTranscript(call.transcript, call.staffName);

export interface FocusSummary {
  calls: number;
  /** Per keyword: how many calls used it. */
  byKeyword: Array<{ keyword: FocusKeyword; count: number; share: number }>;
  onMessage: number;
  onMessageShare: number;
}

export function focusSummary(calls: Call[]): FocusSummary {
  const results = calls.map(focusForCall);
  const pct = (n: number) => (results.length ? Math.round((n / results.length) * 100) : 0);
  return {
    calls: results.length,
    byKeyword: CAMPAIGN_FOCUS.keywords.map((keyword, i) => {
      const count = results.filter((r) => r.hits[i].present).length;
      return { keyword, count, share: pct(count) };
    }),
    onMessage: results.filter((r) => r.onMessage).length,
    onMessageShare: pct(results.filter((r) => r.onMessage).length),
  };
}
