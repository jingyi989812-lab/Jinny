/**
 * Bulk import of recording transcript compilations. Two header shapes are read:
 *
 *   ================                    ================
 *   SOURCE: [EVELYN]_1056-…(24781).wav  Consultant: EVELYN | Date: 2026-09-19 | Duration: 2:05 | Language: Mandarin, English
 *   ================                    Source File: [EVELYN]_1056-…(36192).wav
 *   <transcript text>                   ================
 *                                       [00:00] Consultant: …
 *
 * Metadata is read from the recording file name ([staff]_extension-leadNumber_yyyymmddhhmmss(recordingId))
 * and, when present, from the header fields. Anything that cannot be read is left empty — never guessed.
 */
import { PRIMARY_FRAMEWORK } from '@/config/frameworks';
import type { Call } from '@/types/call';
import type { AvatarStyle, Staff } from '@/types/staff';
import { matchRoster } from '@/config/team';
import { evaluateWithMock } from './qaEvaluator/mockEvaluator';
import { countWords } from './qaEvaluator/transcriptParser';
import { estimateCallType } from './callType';

export interface ImportedRecording {
  sourceName: string;
  staffName: string;
  staffId: string;
  /** Listed in the CSC roster (src/config/team.ts). */
  onRoster: boolean;
  leadNumber: string;
  callDate: string; // yyyy-mm-dd, '' if unknown
  recordedAt: string | null;
  recordingId: string;
  transcript: string;
  language: string;
  words: number;
  durationSec: number | null;
  /** The transcript labels who is speaking (Consultant / Customer). */
  diarized: boolean;
}

/** A header block: one or more lines between two rules of "=". */
const HEADER_BLOCK = /={10,}[ \t]*\n([\s\S]*?)\n[ \t]*={10,}[ \t]*\n/g;
/** "=== Call 1: [EVELYN]_…wav ===" followed by the meta line(s) above the first timestamp. */
const CALL_HEADING = /^={2,}[ \t]*Call[ \t]*\d+[ \t]*[:：][ \t]*(.+?)[ \t]*={2,}[ \t]*$\n((?:(?!\[\d{1,2}:\d{2})[^\n]*\n)*)/gm;
const SOURCE_FIELD = /^\s*(?:SOURCE|Source File)\s*[:：]\s*(.+?)\s*$/im;
const FIELD = (name: string) => new RegExp(`(?:^|\\|)\\s*${name}\\s*[:：]\\s*([^|\\n]+)`, 'i');
const DURATION = /^(?:(\d{1,2}):)?(\d{1,3}):(\d{2})$/;
const NAME = /^\[(.+?)\]_(?:(\d+)-)?(\d+)_(\d{14})(?:\((\d+)\))?\.\w+$/;

export const staffIdFor = (name: string) => `staff-${name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

export function titleCase(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

function detectLanguage(text: string): string {
  const cjk = text.match(/[㐀-鿿]/g)?.length ?? 0;
  const latin = text.match(/[A-Za-z]{2,}/g)?.length ?? 0;
  if (cjk > latin * 3) return latin > 5 ? 'Mixed (EN / 中文)' : 'Mandarin';
  if (latin > cjk * 3) return cjk > 10 ? 'Mixed (EN / 中文)' : 'English';
  return 'Mixed (EN / 中文)';
}

export function isCompilation(text: string): boolean {
  return /={10,}[ \t]*\n[\s\S]{0,400}?(?:SOURCE|Source File)\s*[:：]/i.test(text) || /^={2,}[ \t]*Call[ \t]*\d+[ \t]*[:：]/m.test(text);
}

/** "2:05" or "1:02:10" → seconds. */
export function parseDuration(raw?: string | null): number | null {
  const m = raw?.trim().match(DURATION);
  if (!m) return null;
  return (Number(m[1] ?? 0) * 60 + Number(m[2])) * 60 + Number(m[3]);
}

const KNOWN_LANGUAGES: Array<[RegExp, string]> = [
  [/mandarin|chinese|中文|华语/i, 'Mandarin'],
  [/cantonese|粤语|廣東話|广东话/i, 'Cantonese'],
  [/malay|bahasa|\bBM\b/i, 'Malay'],
  [/english|\bEN\b/i, 'English'],
];

/** Header language ("Mandarin, English") → one of the app's language options. */
export function normalizeLanguage(raw: string | undefined, body: string): string {
  const found = raw ? KNOWN_LANGUAGES.filter(([re]) => re.test(raw)).map(([, name]) => name) : [];
  if (found.length === 1) return found[0];
  if (found.length > 1) return found.includes('Malay') ? 'Mixed (EN / BM)' : 'Mixed (EN / 中文)';
  return detectLanguage(body);
}

export function parseCompilation(text: string): ImportedRecording[] {
  const src = text.replace(/\r\n?/g, '\n');
  const blocks = [
    ...[...src.matchAll(HEADER_BLOCK)]
      .filter((m) => SOURCE_FIELD.test(m[1]))
      .map((m) => ({ at: m.index!, after: m.index! + m[0].length, header: m[1] })),
    // "=== Call N: file ===" heading: the file name is on the heading line itself.
    ...[...src.matchAll(CALL_HEADING)].map((m) => ({ at: m.index!, after: m.index! + m[0].length, header: `Source File: ${m[1]}\n${m[2]}` })),
  ].sort((a, b) => a.at - b.at);
  return blocks
    .map((b, i) => {
      const end = i + 1 < blocks.length ? blocks[i + 1].at : src.length;
      const body = src.slice(b.after, end).trim();
      const header = b.header;
      const sourceName = header.match(SOURCE_FIELD)![1].trim();
      const meta = sourceName.match(NAME);
      const headerName = header.match(FIELD('Consultant'))?.[1]?.trim();
      const roster = matchRoster(meta?.[1] ?? headerName ?? '');
      const staffName = roster?.name ?? titleCase(meta?.[1] ?? headerName ?? 'Unknown staff');
      const stamp = meta?.[4];
      const headerDate = header.match(FIELD('Date'))?.[1]?.trim().match(/\d{4}-\d{2}-\d{2}/)?.[0];
      const callDate = stamp ? `${stamp.slice(0, 4)}-${stamp.slice(4, 6)}-${stamp.slice(6, 8)}` : (headerDate ?? '');
      return {
        sourceName,
        staffName,
        staffId: roster?.id ?? staffIdFor(staffName),
        onRoster: Boolean(roster),
        leadNumber: meta?.[3] ?? '',
        callDate,
        recordedAt: stamp ? `${callDate}T${stamp.slice(8, 10)}:${stamp.slice(10, 12)}:${stamp.slice(12, 14)}` : null,
        recordingId: meta?.[5] ?? String(i + 1),
        transcript: body,
        language: normalizeLanguage(header.match(FIELD('Language'))?.[1], body),
        words: countWords(body.replace(/(?<=[㐀-鿿]) (?=[㐀-鿿])/g, '')),
        durationSec: parseDuration(header.match(FIELD('Duration'))?.[1]),
        diarized: /^\s*(?:\[[\d:]+\]\s*)?(consultant|customer|agent|顧問|顾问|客戶|客户)\s*[:：]/im.test(body),
      };
    })
    .filter((r) => r.transcript.length > 0);
}

const SKINS = ['#F3D2B3', '#E9BF9A', '#F6DCC3', '#D9A882', '#EFC7A5', '#C99571'];
const HAIRS = ['#2D2323', '#5A3A2A', '#1F1A1E', '#3B2A22', '#4A3B35', '#6B4A3A'];
const STYLES: AvatarStyle['hairStyle'][] = ['long', 'bob', 'bun', 'ponytail', 'short'];
const SHIRTS = ['#F6C9CF', '#BFD8B8', '#FFE39B', '#CFE0F0', '#E7E2F5', '#FAD8C0'];
const ACCESSORIES: AvatarStyle['accessory'][] = [undefined, 'glasses', 'earrings', 'clip'];

function hash(s: string) {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

export function staffFromRecording(r: Pick<ImportedRecording, 'staffId' | 'staffName' | 'onRoster'>): Staff {
  const h = hash(r.staffName);
  return {
    id: r.staffId,
    name: r.staffName,
    role: r.onRoster ? 'CSC Consultant' : 'Not on CSC roster',
    outlet: 'Not specified',
    joinedMonth: '',
    avatar: {
      skin: SKINS[h % SKINS.length],
      hair: HAIRS[(h >> 3) % HAIRS.length],
      hairStyle: STYLES[(h >> 6) % STYLES.length],
      shirt: SHIRTS[(h >> 9) % SHIRTS.length],
      accessory: ACCESSORIES[(h >> 12) % ACCESSORIES.length],
    },
    isDemo: false,
    showInTeam: r.onRoster,
  };
}

export function recordingToCall(r: ImportedRecording, frameworkId = PRIMARY_FRAMEWORK.id): Call {
  const id = `REC-${r.callDate.replace(/-/g, '') || 'UNDATED'}-${r.recordingId}`;
  const estimate = estimateCallType(r.transcript);
  const evaluation = evaluateWithMock({
    callType: estimate.callType,
    callId: id,
    staffName: r.staffName,
    callDate: r.callDate,
    duration: r.durationSec,
    outlet: 'Not specified',
    leadSource: 'Not specified',
    language: r.language,
    transcript: r.transcript,
    frameworkId,
  });
  if (r.recordedAt) evaluation.createdAt = `${r.recordedAt}.000Z`;
  return {
    id,
    staffId: r.staffId,
    staffName: r.staffName,
    callDate: r.callDate,
    durationSec: r.durationSec,
    leadNumber: r.leadNumber,
    outlet: 'Not specified',
    leadSource: 'Not specified',
    language: r.language,
    reviewer: 'Not assigned',
    frameworkId,
    transcript: r.transcript,
    transcriptSource: 'recording-import',
    sourceName: r.sourceName,
    callType: estimate.callType,
    callTypeSource: 'estimated',
    callTypeReason: estimate.reason,
    evaluation,
    qaReviews: [],
    createdAt: r.recordedAt ? `${r.recordedAt}.000Z` : new Date().toISOString(),
    isDemo: false,
  };
}
