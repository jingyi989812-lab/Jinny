# 🎧 MARCOM Calling QA

**"Every Call Creates a Brighter Tomorrow"** · Listen • Learn • Improve • Grow

An internal coaching platform for the UR Klinik MARCOM / CSC team. It turns a pasted NotebookLM transcript into an evidence-based ICC coaching report, then rolls every evaluation up into team insights, personal growth and a learning academy.

> 🔒 Internal use only. All demo staff calls, customers and lead numbers are fictional.

---

## Run it

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # production build in dist/
npm run engine:check # run the evaluator on the demo transcript (or: npx tsx scripts/engineCheck.ts path/to/transcript.txt)
```

## Workflow

```
Recording → NotebookLM transcription → paste into "Upload & Evaluate" → ✨ Analyse
→ ICC score + strengths/gaps + verified evidence + coaching → QA human review → Team insights & My Growth
```

NotebookLM is **not** integrated automatically. The transcript enters the system in
`src/pages/UploadEvaluate.tsx` → `evaluateCall()` in `src/services/qaEvaluator/index.ts`.

Supported transcript shapes: `[00:52] Consultant: …`, `00:52 Customer: …`, `Speaker 1: …` (no timestamps), `顧問: …`, `Name (00:52): …`. Speaker roles are inferred; any assumption is shown to the reviewer.

---

## Where things live

| What | Where |
|---|---|
| **ICC frameworks (source of truth)** | `src/config/frameworks/` — `iccBenchmark.ts` (primary, /100), `iccCscV1.ts` (A–G, /90), `behaviourLibrary.ts`, `shared.ts` (bands, EQ, action-plan phases) |
| Scoring rules (score → status) | `src/services/scoring.ts` |
| Evaluation service entry point | `src/services/qaEvaluator/index.ts` |
| Mock evaluator | `mockEvaluator.ts` (report assembler) + `detectors.ts` (bilingual keyword checks) |
| Evidence guard | `evidenceVerifier.ts` — every quote must match the transcript verbatim, timestamps copied from the line |
| Claude integration | `claudeEvaluator.ts` (client), `prompt.ts` (rules, prompts, JSON schema), `server/evaluate.example.ts` (backend) |
| Analytics / badges / privacy | `src/services/analytics.ts`, `achievements.ts`, `privacy.ts` |
| Demo data | `src/services/mockData.ts` (synthetic transcripts scored by the real engine), `src/content/sampleTranscript.ts` |
| Learning content | `src/content/learningHub.ts` |
| Types | `src/types/framework.ts`, `qa.ts`, `call.ts`, `staff.ts` |

## ICC framework — what came from the documents

- **ICC Benchmark** (`CSC_Call_Template_Jun15.pdf`): I Introduction 10 · C1 Discovery 20 · C2 Product Knowledge 20 · Close 25 · Rapport & Tone 25. Criteria text, script steps, durations and universal gaps are copied from the document. **This is the primary rubric.**
- **ICC CSC Framework v1** (`XinNi_ICC_Report_v2.pdf`): A–G sections totalling 90, role-model lines, unscored EQ (Compliment / Humor / Graceful Decline), 30-day action-plan phases. Kept as a **separate version** — weights are never merged.
- Recording compilations are imported from `local-data/` in dev (git-ignored). Two header shapes are read: `SOURCE: [STAFF]_…wav` blocks, and diarized exports with `Consultant: … | Date: … | Duration: … | Language: …` + `Source File:` headers and `[mm:ss] Consultant:` lines. Diarized transcripts score far more reliably (≈30% vs ≈18% team average on the same team).
- **CSC standard** (`src/config/cscStandard.ts`, `src/config/coachingLens.ts`): the MARCOM whiteboard framework — 有效劳动 = 创造需求, via 懂得问问题 + 体现专家 (医生操作 · 祛斑诊所 · 专做祛斑) — plus 思维/方法 mindset checks and the customer-objection list adapted from the MARCOM manager's CSC Case Study tool. Checked per call and per month, **unscored**.
- **EN / 中文**: `src/services/i18n.tsx`, toggle in the header. Main navigation, Home, page titles and report headings are translated; detailed analysis text is still English only.
- **Campaign focus** (`src/config/strategyFocus.ts`): the positioning MARCOM wants in the current period (now: 世界级祛斑诊所 — 医生 · 医生操作 · 诊所 · 祛斑). Checked per call and per month as an **unscored observation** — it never changes the ICC score. Shown on each report, in the printable report, on QA Insights, and in Settings; clicking a keyword bar lists the calls missing it.
- **ICC 秘籍** (`ICC 秘籍 - Google Sheets.pdf`, `src/content/iccPlaybook.ts`): the team's new-customer playbook — Day 1 Ice Breaker / Content / Closing script, fact sheet (RM399 NETT package, Gold Light / Spectra White / Ruvy Touch, refund policy, Penang · JB · KL, Mon–Sat 11am–7pm) and the Day 1–21 follow-up cadence. Used for Learning Hub content, coaching-card script lines, extra evaluator vocabulary and the Claude prompt. It does **not** change section weights.

**Placeholders (not defined in either document — confirm with the QA lead):**
pass / needs-improvement / fail thresholds (75 / 60), section status cut-offs, how points split between behaviours inside a section (equal split), outlet & lead-source lists. Each is tagged `PLACEHOLDER` in config and shown with a 🚧 tag in Settings.

**Inconsistencies found:** Xin Ni's scorecard sums to 71 while the summary says 72%; the two reports carry different years (2026 vs 2025); offer details differ (RM399 vs RM39.90). See Settings → framework notes.

## How the mock evaluator works

1. Parse the transcript into speaker-attributed lines (timestamps only if present).
2. For each framework behaviour, run a detector (English + Chinese patterns) that returns the **exact lines** it relied on — or a documented absence.
3. Scores are computed from framework weights (`assembleEvaluation`), statuses from framework bands.
4. The report is assembled: strengths, ranked gaps, key moments, call journey, role-model comparison (reference lines labelled with source; generated ones labelled "Suggested phrasing"), EQ (unscored), 30-day plan, customer profile.
5. `verifyEvaluation` strips any quote not found verbatim → "Insufficient evidence to determine."

It is keyword matching, **not AI** — it cannot judge quality or paraphrase, which the UI states and reflects in per-finding confidence.

## Connecting Claude

1. Deploy `server/evaluate.example.ts` (or equivalent) behind company auth with `ANTHROPIC_API_KEY`. Model: `claude-opus-5`, structured JSON output.
2. Set `VITE_QA_API_URL` for the front end and select the Claude engine in Settings.
3. Claude returns behaviour judgements + line-numbered quotes; the app computes scores centrally and re-verifies every quote.

## Next for production

1. **Confirm the rubric**: pass mark, section bands, behaviour weights with the QA lead (replace placeholders).
2. **Backend + database** (calls, evaluations, QA review audit trail) and **authentication with real role-based access** — lead-number masking must be enforced server-side.
3. **Claude evaluator** behind the backend; build a small eval set from QA-reviewed calls to measure AI-vs-human agreement before relying on scores.
4. PDF generation service, recording storage and (optionally) a transcription provider.
5. Calibrate against real calls: compare AI scores with QA final scores and tune prompts/framework.
