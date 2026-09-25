/**
 * Evaluate a recording compilation offline and print a summary.
 *   npx tsx scripts/importCheck.ts ~/Downloads/all_recording_transcripts.txt [recordingId]
 * Lead numbers are never printed.
 */
import { readFileSync } from 'node:fs';
import { parseCompilation, recordingToCall } from '@/services/transcriptImport';
import { parseTranscript } from '@/services/qaEvaluator/transcriptParser';

const [file, focus] = process.argv.slice(2);
const recs = parseCompilation(readFileSync(file, 'utf8'));
const calls = recs.map((r) => recordingToCall(r));
const avg = (a: number[]) => (a.reduce((x, y) => x + y, 0) / Math.max(1, a.length)).toFixed(1);

if (focus) {
  const c = calls.find((x) => x.id.endsWith(`-${focus}`))!;
  const p = parseTranscript(c.transcript, c.staffName);
  console.log(c.id, c.staffName, c.language, `${c.evaluation.overallPercentage}%`, 'lines', p.lines.length);
  p.lines.forEach((l) => console.log(`  L${l.index}: ${l.text}`));
  for (const s of c.evaluation.sections) {
    console.log(`\n${s.code} ${s.name} ${s.score}/${s.maxScore}`);
    s.strengths.forEach((f) => console.log(`  ✓ ${f.title} ← ${f.evidence.map((e) => e.quote ?? e.note).join(' | ').slice(0, 140)}`));
    s.gaps.forEach((f) => console.log(`  ✘ ${f.title}`));
  }
  process.exit(0);
}

console.log(`${calls.length} recordings`);
const st: Record<string, number> = {};
calls.forEach((c) => (st[c.evaluation.status] = (st[c.evaluation.status] ?? 0) + 1));
console.log('overall avg', avg(calls.map((c) => c.evaluation.overallPercentage)), st);
const by: Record<string, number[]> = {};
calls.forEach((c) => (by[c.staffName] ??= []).push(c.evaluation.overallPercentage));
console.log('by staff', Object.fromEntries(Object.entries(by).map(([k, v]) => [k, `${avg(v)} (${v.length})`])));
const secs: Record<string, number[]> = {};
calls.forEach((c) => c.evaluation.sections.forEach((s) => (secs[s.name] ??= []).push(s.percentage)));
console.log('sections', Object.fromEntries(Object.entries(secs).map(([k, v]) => [k, avg(v)])));
const beh: Record<string, number> = {};
calls.forEach((c) => c.evaluation.sections.forEach((s) => s.strengths.forEach((f) => (beh[f.title] = (beh[f.title] ?? 0) + 1))));
console.log('behaviours detected (count of calls):', Object.entries(beh).sort((a, b) => b[1] - a[1]));
console.log('lowest:', calls.sort((a, b) => a.evaluation.overallPercentage - b.evaluation.overallPercentage).slice(0, 5).map((c) => `${c.id} ${c.staffName} ${c.evaluation.overallPercentage}% lines=${parseTranscript(c.transcript).lines.length}`));
console.log('removed quotes', calls.reduce((s, c) => s + c.evaluation.verification.removedQuotes, 0));
