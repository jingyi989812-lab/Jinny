/**
 * Framework registry — the ONLY place the app looks up ICC rubrics.
 * To add a new version: create a config file, append it here. Nothing else changes.
 */
import type { QAFramework } from '@/types/framework';
import { ICC_BENCHMARK } from './iccBenchmark';
import { ICC_CSC_V1 } from './iccCscV1';

export const FRAMEWORKS: QAFramework[] = [ICC_BENCHMARK, ICC_CSC_V1];

export const PRIMARY_FRAMEWORK: QAFramework = FRAMEWORKS.find((f) => f.isPrimary) ?? ICC_BENCHMARK;

export function getFramework(id: string): QAFramework {
  return FRAMEWORKS.find((f) => f.id === id) ?? PRIMARY_FRAMEWORK;
}

/** Sanity check: max scores must add up to the declared total. */
for (const f of FRAMEWORKS) {
  const sum = f.sections.reduce((s, sec) => s + sec.maxScore, 0);
  if (sum !== f.maxTotal) {
    console.warn(`[framework] ${f.id}: section max scores sum to ${sum}, declared ${f.maxTotal}`);
  }
}
