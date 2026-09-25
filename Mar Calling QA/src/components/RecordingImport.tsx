import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '@/services/analytics';
import { useStore } from '@/services/store';
import { isCompilation, parseCompilation, recordingToCall, staffFromRecording, type ImportedRecording } from '@/services/transcriptImport';
import type { Call } from '@/types/call';

/** Bulk import of a recording transcript compilation (one file, many calls). */
export function RecordingImport() {
  const store = useStore();
  const navigate = useNavigate();
  const input = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [recordings, setRecordings] = useState<ImportedRecording[]>([]);
  const [error, setError] = useState('');
  const [hideDemo, setHideDemo] = useState(true);
  const [includeOffRoster, setIncludeOffRoster] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);

  const read = async (file: File) => {
    setError('');
    setRecordings([]);
    setFileName(file.name);
    const text = await file.text();
    if (!isCompilation(text)) {
      setError('This file is not a recording compilation (no "SOURCE:" sections found). For a single transcript, paste it in the Transcript box below.');
      return;
    }
    const recs = parseCompilation(text);
    if (!recs.length) setError('No recordings with transcript text were found in this file.');
    setRecordings(recs);
  };

  const summary = useMemo(() => {
    const byStaff = new Map<string, { name: string; count: number; onRoster: boolean }>();
    recordings.forEach((r) => {
      const cur = byStaff.get(r.staffId) ?? { name: r.staffName, count: 0, onRoster: r.onRoster };
      cur.count++;
      byStaff.set(r.staffId, cur);
    });
    const dates = recordings.map((r) => r.callDate).filter(Boolean).sort();
    const langs = new Map<string, number>();
    recordings.forEach((r) => langs.set(r.language, (langs.get(r.language) ?? 0) + 1));
    return { staff: [...byStaff.values()].sort((a, b) => b.count - a.count), from: dates[0], to: dates[dates.length - 1], langs: [...langs.entries()] };
  }, [recordings]);

  const selected = includeOffRoster ? recordings : recordings.filter((r) => r.onRoster);
  const skipped = recordings.length - selected.length;

  const runImport = async () => {
    setProgress(0);
    const calls: Call[] = [];
    for (let i = 0; i < selected.length; i++) {
      calls.push(recordingToCall(selected[i]));
      if (i % 5 === 4) {
        setProgress(i + 1);
        await new Promise((r) => window.setTimeout(r, 0));
      }
    }
    const staff = [...new Map(selected.map((r) => [r.staffId, staffFromRecording(r)])).values()];
    store.importCalls(calls, staff);
    if (hideDemo) store.setShowDemoData(false);
    const firstRoster = staff.find((s) => s.showInTeam);
    if (firstRoster) store.setViewAsStaffId(firstRoster.id);
    setProgress(selected.length);
    store.toast(`🎉 ${calls.length} recordings imported and evaluated`);
    window.setTimeout(() => navigate('/calls'), 400);
  };

  return (
    <div className="card" style={{ border: '2px dashed var(--line-2)' }}>
      <div className="card-head">
        <div>
          <h2>📥 Import a recording compilation</h2>
          <div className="sub">One text file with many calls. Headers read: “SOURCE: [STAFF]_…wav”, “Consultant: … | Date: …” + “Source File: …”, or “=== Call 1: [STAFF]_…wav ===”. Speaker labels and timestamps give the most reliable scores.</div>
        </div>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const f = e.dataTransfer.files[0];
          if (f) read(f);
        }}
        onClick={() => input.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && input.current?.click()}
        className="center"
        style={{
          padding: '26px 16px',
          borderRadius: 18,
          cursor: 'pointer',
          background: dragging ? 'var(--yellow-100)' : 'var(--yellow-50)',
          border: '1.5px solid #F3DCA0',
          transition: 'background .2s',
        }}
      >
        <div style={{ fontSize: 34 }} aria-hidden>
          🗂️
        </div>
        <strong>{fileName || 'Drop the .txt file here, or click to choose'}</strong>
        <div className="tiny muted" style={{ marginTop: 4 }}>
          Read in your browser only — nothing is uploaded anywhere.
        </div>
        <input
          ref={input}
          type="file"
          accept=".txt,text/plain"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) read(f);
            e.target.value = '';
          }}
        />
      </div>

      {error && (
        <div className="card card-pink card-tight small" style={{ marginTop: 12 }} role="alert">
          ⚠️ {error}
        </div>
      )}

      {recordings.length > 0 && (
        <div className="stack" style={{ marginTop: 16 }}>
          <div className="row-wrap">
            <span className="pill pill-ink">{recordings.length} recordings</span>
            {summary.from && (
              <span className="pill pill-neutral">
                📅 {formatDate(summary.from)} – {formatDate(summary.to!)}
              </span>
            )}
            {summary.langs.map(([l, n]) => (
              <span key={l} className="tag">
                {l} · {n}
              </span>
            ))}
          </div>
          <div className="row-wrap" style={{ gap: 6 }}>
            {summary.staff.map((s) => (
              <span key={s.name} className={`tag ${s.onRoster ? 'tag-reference' : 'tag-placeholder'}`} title={s.onRoster ? 'On the CSC roster' : 'Not on the CSC roster — skipped unless you tick the option below'}>
                {s.onRoster ? '👩‍💼' : '❔'} {s.name} · {s.count}
              </span>
            ))}
          </div>
          <div className="card card-flat card-tight small" style={{ background: 'var(--sky-50)', borderColor: '#D5E3EE' }}>
            <strong>Before you import</strong>
            <ul style={{ margin: '6px 0 0', paddingLeft: 18, lineHeight: 1.7 }}>
              <li>These transcripts have <strong>no speaker labels or timestamps</strong>, so consultant and customer lines can't be separated. Evidence is shown as “Speaker not identified” and confidence is lowered.</li>
              <li>Scores come from the demo keyword evaluator. Treat them as a first pass for QA review, not final results.</li>
              <li>Staff, date and lead number are read from each file name. Lead numbers stay masked; everything is stored only in this browser.</li>
            </ul>
          </div>
          {skipped > 0 && (
            <label className="row small" style={{ cursor: 'pointer' }}>
              <input type="checkbox" checked={includeOffRoster} onChange={(e) => setIncludeOffRoster(e.target.checked)} />
              Also import {skipped} recording{skipped > 1 ? 's' : ''} from staff not on the CSC roster (skipped by default)
            </label>
          )}
          <label className="row small" style={{ cursor: 'pointer' }}>
            <input type="checkbox" checked={hideDemo} onChange={(e) => setHideDemo(e.target.checked)} />
            Hide the fictional demo data after importing (you can turn it back on in Settings)
          </label>
          {progress !== null ? (
            <div className="stack" style={{ gap: 6 }}>
              <div className="bar-track" style={{ height: 14 }}>
                <div className="bar-fill bar-good" style={{ width: `${(progress / Math.max(1, selected.length)) * 100}%` }} />
              </div>
              <span className="small muted tabular">
                Evaluating {progress} / {selected.length}…
              </span>
            </div>
          ) : (
            <div>
              <button className="btn btn-primary" onClick={runImport}>
                ✨ Import &amp; evaluate {selected.length} recordings
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
