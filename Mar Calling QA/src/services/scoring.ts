/**
 * Central scoring rules. Every score → status conversion in the app goes
 * through here, using the bands stored on the framework config.
 */
import { getFramework } from '@/config/frameworks';
import type { Band, OverallStatus, QAFramework, SectionStatus } from '@/types/framework';
import type { Call } from '@/types/call';

export const pct = (score: number, max: number) => (max > 0 ? Math.round((score / max) * 100) : 0);

function bandFor<T extends string>(bands: Band<T>[], percentage: number): Band<T> {
  const sorted = [...bands].sort((a, b) => b.minPercentage - a.minPercentage);
  return sorted.find((b) => percentage >= b.minPercentage) ?? sorted[sorted.length - 1];
}

export function sectionBand(framework: QAFramework, percentage: number): Band<SectionStatus> {
  return bandFor(framework.sectionBands, percentage);
}

export function overallBand(framework: QAFramework, percentage: number): Band<OverallStatus> {
  return bandFor(framework.overallBands, percentage);
}

export const SECTION_STATUS_META: Record<SectionStatus, { label: string; emoji: string; tone: string }> = {
  excellent: { label: 'Excellent', emoji: '🌟', tone: 'excellent' },
  strong: { label: 'Strong', emoji: '✅', tone: 'good' },
  developing: { label: 'Developing', emoji: '🌱', tone: 'warn' },
  needs_improvement: { label: 'Needs Improvement', emoji: '⚠️', tone: 'serious' },
  missed: { label: 'Missed', emoji: '❌', tone: 'critical' },
};

export const OVERALL_STATUS_META: Record<OverallStatus, { label: string; formal: string; emoji: string; tone: string; friendly: string }> = {
  pass: { label: 'Pass', formal: 'PASS', emoji: '😊', tone: 'good', friendly: 'Lovely work — keep this energy!' },
  needs_improvement: {
    label: 'Needs Improvement',
    formal: 'NEEDS IMPROVEMENT',
    emoji: '😐',
    tone: 'warn',
    friendly: 'Solid foundation — a few tweaks will lift this call.',
  },
  fail: { label: 'Needs Practice', formal: 'FAIL', emoji: '😟', tone: 'serious', friendly: "Let's practise together — every call is a fresh start." },
};

/** The score that counts: the latest human QA decision, otherwise the AI score. */
export function effectiveResult(call: Call): { score: number; max: number; percentage: number; status: OverallStatus; reviewed: boolean } {
  const review = call.qaReviews[call.qaReviews.length - 1];
  const ev = call.evaluation;
  if (review) {
    return {
      score: review.finalScore,
      max: ev.maxScore,
      percentage: review.finalPercentage,
      status: review.finalStatus,
      reviewed: true,
    };
  }
  return { score: ev.overallScore, max: ev.maxScore, percentage: ev.overallPercentage, status: ev.status, reviewed: false };
}

export function statusForScore(frameworkId: string, score: number, maxScore?: number): { percentage: number; status: OverallStatus } {
  const fw = getFramework(frameworkId);
  const percentage = pct(score, maxScore ?? fw.maxTotal);
  return { percentage, status: overallBand(fw, percentage).status };
}
