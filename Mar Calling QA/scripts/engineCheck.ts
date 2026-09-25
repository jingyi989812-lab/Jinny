/**
 * Quick engine check: runs the mock evaluator on the demo transcript for both
 * frameworks and prints the scorecard. `npm run engine:check`
 */
import { FRAMEWORKS } from '@/config/frameworks';
import { SAMPLE_CALL_META, SAMPLE_TRANSCRIPT } from '@/content/sampleTranscript';
import { evaluateWithMock } from '@/services/qaEvaluator/mockEvaluator';

const file = process.argv[2];
const transcript = file ? (await import('node:fs')).readFileSync(file, 'utf8') : SAMPLE_TRANSCRIPT;

for (const fw of FRAMEWORKS) {
  const ev = evaluateWithMock({
    callId: 'CHECK',
    staffName: SAMPLE_CALL_META.staffName,
    callDate: SAMPLE_CALL_META.callDate,
    duration: SAMPLE_CALL_META.durationSec,
    outlet: SAMPLE_CALL_META.outlet,
    leadSource: SAMPLE_CALL_META.leadSource,
    language: SAMPLE_CALL_META.language,
    transcript,
    frameworkId: fw.id,
  });
  console.log(`\n=== ${fw.frameworkName} ${fw.frameworkVersion} → ${ev.overallScore}/${ev.maxScore} (${ev.overallPercentage}%) ${ev.status}`);
  for (const s of ev.sections) {
    console.log(`  ${s.code.padEnd(6)} ${s.name.padEnd(34)} ${String(s.score).padStart(2)}/${s.maxScore}  ${s.status}  [${s.confidence}]`);
    for (const g of s.gaps) console.log(`         ✘ ${g.title}`);
  }
  console.log('  main strength:', ev.summary.mainStrength?.label, '| main gap:', ev.summary.mainGap?.label);
  console.log('  narrative:', ev.summary.narrative);
  console.log('  key moments:', ev.keyMoments.map((k) => `${k.kind}: ${k.title} @${k.evidence.timestamp}`).join(' | '));
  console.log('  EQ:', ev.eqObservation.map((e) => `${e.label}=${e.status}`).join(', '));
  console.log('  role model:', ev.roleModelComparison.map((r) => `${r.sectionName}(${r.idealKind})`).join(', '));
  console.log('  journey:', ev.journey.map((j) => `${j.label} ${j.percentage}% ${j.timeSpentSec ?? '-'}s`).join(' → '));
  console.log('  action plan:', ev.actionPlan.map((a) => `[${a.phase}] ${a.action}`).join(' | '));
  console.log('  verification:', ev.verification, 'parse notes:', ev.parseNotes);
}
