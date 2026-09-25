import { generateDemoCalls } from '@/services/mockData';
const t0 = Date.now();
const calls = generateDemoCalls();
console.log('generated', calls.length, 'calls in', Date.now() - t0, 'ms');
const byMonth: Record<string, number[]> = {};
const byStaff: Record<string, number[]> = {};
const st: Record<string, number> = {};
const issues: Record<string, number> = {};
const secs: Record<string, number[]> = {};
let removed = 0;
for (const c of calls) {
  const p = c.evaluation.overallPercentage;
  (byMonth[c.callDate.slice(0, 7)] ??= []).push(p);
  (byStaff[c.staffName] ??= []).push(p);
  st[c.evaluation.status] = (st[c.evaluation.status] ?? 0) + 1;
  for (const g of c.evaluation.gaps) issues[g.title] = (issues[g.title] ?? 0) + 1;
  for (const s of c.evaluation.sections) (secs[s.name] ??= []).push(s.percentage);
  removed += c.evaluation.verification.removedQuotes;
}
const avg = (a: number[]) => (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1);
console.log('overall avg', avg(calls.map((c) => c.evaluation.overallPercentage)), st, 'removed quotes', removed);
console.log('month', Object.fromEntries(Object.entries(byMonth).map(([k, v]) => [k, `${avg(v)} (${v.length})`])));
console.log('staff', Object.fromEntries(Object.entries(byStaff).map(([k, v]) => [k, `${avg(v)} (${v.length})`])));
console.log('sections', Object.fromEntries(Object.entries(secs).map(([k, v]) => [k, avg(v)])));
console.log('top issues', Object.entries(issues).sort((a, b) => b[1] - a[1]).slice(0, 10));
console.log('\n--- sample generated transcript ---\n' + calls[3].transcript);
