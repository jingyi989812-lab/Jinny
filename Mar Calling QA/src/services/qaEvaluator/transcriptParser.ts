/**
 * Parses a pasted call transcript into speaker-attributed lines.
 *
 * Handles the common transcript shapes:
 *   [00:52] Consultant: text
 *   00:52 Customer: text
 *   (1:02:10) Speaker 1: text
 *   Consultant (00:52): text
 *   **Speaker 2:** text
 *   Consultant: text            ← no timestamps
 *   continuation lines without a label are appended to the previous line
 *
 * Never invents timestamps: a line without one keeps timestamp = null.
 */
import type { ParsedTranscript, Speaker, TranscriptLine } from '@/types/qa';

const TS = String.raw`(\d{1,2}:\d{2}(?::\d{2})?)`;
const LEADING_TS = new RegExp(String.raw`^[\[(]?${TS}[\])]?\s*[-–—]?\s*`);
const LABEL_WITH_TS = new RegExp(String.raw`^(.{1,40}?)\s*[\[(]${TS}[\])]\s*[:：]\s*(.*)$`);
const LABEL = /^([^:：]{1,40}?)\s*[:：]\s*(.*)$/;
const TRAILING_TS = new RegExp(String.raw`\s*[\[(]${TS}[\])]\s*$`);

const AGENT_HINTS = /(agent|consultant|csc|staff|advisor|adviser|marcom|klinik|clinic|caller|sales|顧問|顾问|客服|專員|专员)/i;
const CUSTOMER_HINTS = /(customer|client|lead|patient|prospect|recipient|顧客|顾客|客戶|客户)/i;


const CJK = '\\u3400-\\u9fff\\uf900-\\ufaff\\u3000-\\u303f\\uff00-\\uffef';
const SPACED_CJK = new RegExp(`[${CJK}] [${CJK}]`, 'g');

/** Speech-to-text exports often put a space between every Chinese character. */
export function looksLikeSpacedCjk(text: string): boolean {
  const pairs = text.match(SPACED_CJK)?.length ?? 0;
  const cjk = text.match(new RegExp(`[${CJK}]`, 'g'))?.length ?? 0;
  return cjk > 20 && pairs / cjk > 0.3;
}

/**
 * Normalise raw speech-to-text output: remove spaces between Chinese characters
 * and split into one utterance per line (double spaces / sentence ends).
 * Words are never changed — only whitespace.
 */
export function normalizeAsrText(raw: string): string {
  let t = raw.replace(/\r\n?/g, '\n');
  const joinRe = new RegExp(`(?<=[${CJK}]) (?=[${CJK}0-9])|(?<=[${CJK}0-9]) (?=[${CJK}])`, 'g');
  // Protect utterance breaks (2+ spaces) before collapsing single spaces.
  t = t.replace(/ {2,}/g, '\n');
  t = t
    .split('\n')
    .map((l) => l.replace(joinRe, '').trim())
    .filter(Boolean)
    .flatMap((l) => (l.length > 220 ? l.split(/(?<=[.?!。？！])\s*(?=\S)/) : [l]))
    .map((l) => l.trim())
    .filter(Boolean)
    .join('\n');
  return t;
}

export const UNIDENTIFIED_SPEAKER = 'Speaker not identified';

export function toSeconds(ts: string): number {
  const parts = ts.split(':').map(Number);
  return parts.length === 3 ? parts[0] * 3600 + parts[1] * 60 + parts[2] : parts[0] * 60 + parts[1];
}

function cleanLabel(raw: string): string {
  return raw.replace(/[*_#>]/g, '').trim();
}

function looksLikeLabel(label: string): boolean {
  // A speaker label is short and doesn't contain sentence punctuation.
  return label.length > 0 && label.length <= 40 && !/[.?!,，。？！]/.test(label) && label.split(/\s+/).length <= 4;
}

export function parseTranscript(raw: string, staffName?: string): ParsedTranscript {
  const notes: string[] = [];
  const lines: TranscriptLine[] = [];
  const asr = looksLikeSpacedCjk(raw) || (!/\n/.test(raw.trim()) && raw.length > 400);
  const source = asr ? normalizeAsrText(raw) : raw;
  if (asr) notes.push('Raw speech-to-text format detected — spacing between characters was removed and the text was split into utterances (no words were changed).');
  const rows = source.replace(/\r\n?/g, '\n').split('\n');

  // Does this transcript carry speaker labels at all?
  const nonEmpty = rows.map((r) => r.trim()).filter(Boolean);
  const labelled = nonEmpty.filter((r) => {
    const body = r.replace(LEADING_TS, '');
    const m = body.match(LABEL_WITH_TS) ?? body.match(LABEL);
    return m && looksLikeLabel(cleanLabel(m[1]));
  });
  const distinctLabels = new Set(labelled.map((r) => cleanLabel((r.replace(LEADING_TS, '').match(LABEL_WITH_TS) ?? r.replace(LEADING_TS, '').match(LABEL))![1]).toLowerCase()));
  const unlabelled = nonEmpty.length > 0 && (labelled.length / nonEmpty.length < 0.4 || distinctLabels.size > 8);

  if (unlabelled) {
    for (const row of nonEmpty) {
      let text = row;
      let timestamp: string | null = null;
      const lead = text.match(LEADING_TS);
      if (lead) {
        timestamp = lead[1];
        text = text.slice(lead[0].length).trim();
      }
      if (!text) continue;
      lines.push({ index: lines.length, timestamp, seconds: timestamp ? toSeconds(timestamp) : null, speakerLabel: UNIDENTIFIED_SPEAKER, speaker: 'unknown', text });
    }
    notes.push('No speaker labels found — consultant and customer lines cannot be separated, so evidence is shown as "Speaker not identified" and confidence is lowered. Transcripts with speaker labels score more reliably.');
    const hasTs = lines.some((l) => l.timestamp !== null);
    if (lines.length && !hasTs) notes.push('No timestamps found in the transcript — evidence will be shown without times.');
    return { lines, hasTimestamps: hasTs, parseNotes: notes, wordCount: countWords(source), characterCount: raw.length, diarized: false };
  }

  for (const row of rows) {
    let text = row.replace(/^\s*[*-]\s+/, '').trim();
    if (!text) continue;

    let timestamp: string | null = null;
    let label = '';

    const lead = text.match(LEADING_TS);
    if (lead) {
      timestamp = lead[1];
      text = text.slice(lead[0].length);
    }

    const withTs = !timestamp ? text.match(LABEL_WITH_TS) : null;
    if (withTs && looksLikeLabel(cleanLabel(withTs[1]))) {
      label = cleanLabel(withTs[1]);
      timestamp = withTs[2];
      text = withTs[3];
    } else {
      const m = text.match(LABEL);
      if (m && looksLikeLabel(cleanLabel(m[1]))) {
        label = cleanLabel(m[1]);
        text = m[2];
      }
    }

    if (!timestamp) {
      const trail = text.match(TRAILING_TS);
      if (trail) {
        timestamp = trail[1];
        text = text.slice(0, trail.index);
      }
    }

    text = text.replace(/^\*+|\*+$/g, '').trim();

    if (!label && lines.length > 0 && !timestamp) {
      // continuation of previous speaker
      const prev = lines[lines.length - 1];
      prev.text = `${prev.text} ${text}`.trim();
      continue;
    }
    if (!text) continue;

    lines.push({
      index: lines.length,
      timestamp,
      seconds: timestamp ? toSeconds(timestamp) : null,
      speakerLabel: label || (lines.length ? lines[lines.length - 1].speakerLabel : 'Unknown'),
      speaker: 'unknown',
      text,
    });
  }

  assignSpeakers(lines, notes, staffName);

  const hasTimestamps = lines.some((l) => l.timestamp !== null);
  if (lines.length && !hasTimestamps) notes.push('No timestamps found in the transcript — evidence will be shown without times.');
  else if (hasTimestamps && lines.some((l) => l.timestamp === null))
    notes.push('Some lines have no timestamp; those lines are shown without a time.');

  return {
    lines,
    hasTimestamps,
    parseNotes: notes,
    wordCount: countWords(source),
    characterCount: raw.length,
    diarized: lines.some((l) => l.speaker === 'agent') && lines.some((l) => l.speaker === 'customer'),
  };
}

/** Counts words; CJK characters count individually so Chinese transcripts get a sensible number. */
export function countWords(text: string): number {
  const cjk = text.match(/[㐀-鿿豈-﫿]/g)?.length ?? 0;
  const latin = text.replace(/[㐀-鿿豈-﫿]/g, ' ').trim().split(/\s+/).filter(Boolean).length;
  return cjk + latin;
}

function assignSpeakers(lines: TranscriptLine[], notes: string[], staffName?: string) {
  const labels = [...new Set(lines.map((l) => l.speakerLabel))];
  const map = new Map<string, Speaker>();
  const staff = staffName?.trim().toLowerCase();

  for (const label of labels) {
    const lower = label.toLowerCase();
    if (staff && lower.includes(staff)) map.set(label, 'agent');
    else if (AGENT_HINTS.test(label)) map.set(label, 'agent');
    else if (CUSTOMER_HINTS.test(label)) map.set(label, 'customer');
  }

  const unresolved = labels.filter((l) => !map.has(l) && l !== 'Unknown');
  if (unresolved.length) {
    const hasAgent = [...map.values()].includes('agent');
    const hasCustomer = [...map.values()].includes('customer');
    if (!hasAgent && unresolved.length >= 1) {
      // Outbound CSC calls: the first speaker is assumed to be the consultant.
      const first = lines.find((l) => unresolved.includes(l.speakerLabel))!.speakerLabel;
      map.set(first, 'agent');
      notes.push(`"${first}" was assumed to be the consultant (first speaker in an outbound call). Rename speakers in the transcript if this is wrong.`);
    }
    for (const l of unresolved) {
      if (!map.has(l)) {
        map.set(l, hasCustomer && unresolved.length > 1 ? 'unknown' : 'customer');
      }
    }
    const assumedCustomers = unresolved.filter((l) => map.get(l) === 'customer');
    if (assumedCustomers.length && !hasCustomer)
      notes.push(`${assumedCustomers.map((l) => `"${l}"`).join(', ')} assumed to be the customer.`);
  }
  if (labels.includes('Unknown')) notes.push('Some lines had no speaker label; they are marked as unknown speaker.');

  for (const line of lines) line.speaker = map.get(line.speakerLabel) ?? 'unknown';
}

export function formatDuration(sec: number | null | undefined): string {
  if (sec === null || sec === undefined || Number.isNaN(sec)) return '—';
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
