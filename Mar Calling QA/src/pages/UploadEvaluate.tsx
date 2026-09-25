import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FRAMEWORKS, getFramework, PRIMARY_FRAMEWORK } from '@/config/frameworks';
import { LANGUAGES, LEAD_SOURCES, OUTLETS, REVIEWERS } from '@/config/organisation';
import { SAMPLE_CALL_META, SAMPLE_TRANSCRIPT } from '@/content/sampleTranscript';
import { PROCESSING_STEPS, ProcessingState, STEP_MS } from '@/components/ProcessingState';
import { RecordingImport } from '@/components/RecordingImport';
import { ComingSoon, SectionTitle, SourceTag } from '@/components/ui';
import { maskLead } from '@/services/privacy';
import { evaluateCall, parseTranscript } from '@/services/qaEvaluator';
import { formatDuration } from '@/services/qaEvaluator/transcriptParser';
import { useT } from '@/services/i18n';
import { useStore } from '@/services/store';
import type { Call } from '@/types/call';
import type { CallType } from '@/types/framework';

const today = () => new Date().toISOString().slice(0, 10);

function parseDurationInput(v: string): number | null {
  const t = v.trim();
  if (!t) return null;
  if (/^\d{1,3}:\d{2}$/.test(t)) {
    const [m, s] = t.split(':').map(Number);
    return m * 60 + s;
  }
  if (/^\d+(\.\d+)?$/.test(t)) return Math.round(Number(t) * 60);
  return null;
}

export function UploadEvaluate() {
  const t = useT();
  const store = useStore();
  const navigate = useNavigate();
  const d = store.draft;

  const [staffId, setStaffId] = useState(d?.staffId ?? '');
  const [otherName, setOtherName] = useState(d?.staffId === 'other' ? d.staffName ?? '' : '');
  const [callDate, setCallDate] = useState(d?.callDate ?? today());
  const [duration, setDuration] = useState(d?.durationSec ? formatDuration(d.durationSec) : '');
  const [leadNumber, setLeadNumber] = useState(d?.leadNumber ?? '');
  const [outlet, setOutlet] = useState(d?.outlet ?? OUTLETS[0]);
  const [leadSource, setLeadSource] = useState(d?.leadSource ?? LEAD_SOURCES[0]);
  const [language, setLanguage] = useState(d?.language ?? LANGUAGES[0]);
  const [reviewer, setReviewer] = useState(d?.reviewer ?? REVIEWERS[0]);
  const [frameworkId, setFrameworkId] = useState(d?.frameworkId ?? PRIMARY_FRAMEWORK.id);
  const [callType, setCallType] = useState<CallType>('new_lead');
  const [transcript, setTranscript] = useState(d?.transcript ?? '');
  const [processing, setProcessing] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const staffName = staffId === 'other' ? otherName.trim() : store.staff.find((s) => s.id === staffId)?.name ?? '';
  const parsed = useMemo(() => parseTranscript(transcript, staffName), [transcript, staffName]);
  const speakers = useMemo(() => {
    const m = new Map<string, string>();
    parsed.lines.forEach((l) => m.set(l.speakerLabel, l.speaker));
    return [...m.entries()];
  }, [parsed]);
  const fw = getFramework(frameworkId);
  const claude = store.provider === 'claude';

  const paste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setTranscript(text);
      else store.toast('Clipboard is empty — copy the transcript first.');
    } catch {
      store.toast('Clipboard access was blocked — click in the box and press Ctrl/⌘ + V instead.');
    }
  };

  const loadSample = () => {
    setStaffId('demo-agent');
    setCallDate(SAMPLE_CALL_META.callDate);
    setDuration(formatDuration(SAMPLE_CALL_META.durationSec));
    setLeadNumber(SAMPLE_CALL_META.leadNumber);
    setOutlet(SAMPLE_CALL_META.outlet);
    setLeadSource(SAMPLE_CALL_META.leadSource);
    setLanguage(SAMPLE_CALL_META.language);
    setTranscript(SAMPLE_TRANSCRIPT);
    store.toast('Loaded the fictional demo transcript 🎭');
  };

  const saveDraft = () => {
    store.saveDraft({
      staffId,
      staffName,
      callDate,
      durationSec: parseDurationInput(duration),
      leadNumber,
      outlet,
      leadSource,
      language,
      reviewer,
      frameworkId,
      transcript,
      savedAt: new Date().toISOString(),
    });
    store.toast('💾 Draft saved on this device');
  };

  const analyse = async () => {
    const errs: string[] = [];
    if (!staffName) errs.push('Choose the staff member who made the call.');
    if (!callDate) errs.push('Add the call date.');
    if (parsed.lines.length < 3) errs.push('Paste a transcript with at least a few lines of conversation.');
    setErrors(errs);
    if (errs.length) return;

    setProcessing(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const id = `CALL-${callDate.replace(/-/g, '')}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const lastTs = [...parsed.lines].reverse().find((l) => l.seconds !== null)?.seconds;
    const durationSec = parseDurationInput(duration) ?? (lastTs != null ? lastTs + 5 : null);
    const started = Date.now();
    try {
      const evaluation = await evaluateCall(
        { callId: id, staffName, callDate, duration: durationSec, outlet, leadSource, language, transcript, frameworkId, callType: store.scoreByCallType ? callType : 'new_lead' },
        store.provider,
      );
      const minTime = PROCESSING_STEPS.length * STEP_MS + 400;
      await new Promise((r) => window.setTimeout(r, Math.max(0, minTime - (Date.now() - started))));
      const call: Call = {
        id,
        staffId: staffId === 'other' ? `other-${otherName.trim().toLowerCase().replace(/\s+/g, '-')}` : staffId,
        staffName,
        callDate,
        durationSec,
        leadNumber,
        outlet,
        leadSource,
        language,
        reviewer,
        frameworkId,
        transcript,
        transcriptSource: 'notebooklm-paste',
        callType,
        callTypeSource: 'qa',
        evaluation,
        qaReviews: [],
        createdAt: new Date().toISOString(),
        isDemo: false,
      };
      store.addCall(call);
      store.saveDraft(null);
      navigate(`/calls/${id}?new=1`);
    } catch (e) {
      setProcessing(false);
      setErrors([e instanceof Error ? e.message : 'Evaluation failed.']);
    }
  };

  if (processing) {
    return (
      <div className="page">
        <ProcessingState engineLabel={claude ? 'Claude is reading the call · every quote is checked against your transcript' : 'Demo evaluator (keyword checks, not AI) · evidence is verified against your transcript'} />
      </div>
    );
  }

  const canEdit = store.role === 'qa_manager';

  return (
    <div className="page">
      <div className="stack" style={{ gap: 6 }}>
        <h1 style={{ fontSize: 'clamp(30px, 4vw, 44px)' }}>🎧 {t({ en: 'Analyse a Call', zh: '分析一通电话' })}</h1>
        <p className="muted" style={{ fontSize: 17 }}>
          {t({ en: 'Turn every conversation into a coaching opportunity.', zh: '把每一次对话，变成一次辅导的机会。' })}
        </p>
      </div>

      <div className="card card-yellow card-tight">
        <div className="row-wrap" style={{ gap: 8, justifyContent: 'space-between' }}>
          {[
            ['🎙️', 'Recording'],
            ['📝', 'Transcription'],
            ['📋', 'Paste transcript here'],
            ['✨', 'Analyse'],
            ['💛', 'Coaching report'],
          ].map(([icon, label], i, arr) => (
            <div key={label} className="row" style={{ gap: 8 }}>
              <span className="nav-icon" style={{ background: i === 2 ? 'var(--yellow)' : '#fff' }}>
                {icon}
              </span>
              <span className="small" style={{ fontWeight: 700 }}>
                {label}
              </span>
              {i < arr.length - 1 && <span className="faint hide-mobile">→</span>}
            </div>
          ))}
        </div>
        <p className="tiny muted" style={{ marginTop: 10 }}>
          Paste one transcript below, or import a recording compilation for many calls at once.{' '}
          <ComingSoon label="Direct audio upload coming soon" />
        </p>
      </div>

      {!canEdit && (
        <div className="card card-pink card-tight small">
          👀 You're viewing as <strong>{store.role === 'staff' ? 'Staff' : 'Management'}</strong>. Evaluations are normally run by the QA / MARCOM Manager — you can still try the flow with demo data.
        </div>
      )}

      {d && (
        <div className="card card-green card-tight row-wrap small">
          💾 Draft restored from {new Date(d.savedAt).toLocaleString('en-GB')}.
          <span className="spacer" />
          <button className="link small" onClick={() => { store.saveDraft(null); window.location.reload(); }}>
            Discard draft
          </button>
        </div>
      )}

      <RecordingImport />

      <div className="card">
        <div className="card-head">
          <div>
            <h2>📇 Call Information</h2>
            <div className="sub">Basic details for the coaching report</div>
          </div>
          <span className="spacer" />
          <button className="btn btn-sm btn-yellow" onClick={loadSample}>
            🎭 Try the demo transcript
          </button>
        </div>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="staff">Staff Name *</label>
            <select id="staff" className="select" value={staffId} onChange={(e) => setStaffId(e.target.value)}>
              <option value="">Choose staff…</option>
              {store.staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
              <option value="other">Other…</option>
            </select>
            {staffId === 'other' && <input className="input" placeholder="Staff name" value={otherName} onChange={(e) => setOtherName(e.target.value)} aria-label="Other staff name" />}
          </div>
          <div className="field">
            <label htmlFor="date">Call Date *</label>
            <input id="date" className="input" type="date" value={callDate} onChange={(e) => setCallDate(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="dur">Call Duration (mm:ss)</label>
            <input id="dur" className="input" placeholder="e.g. 08:12" value={duration} onChange={(e) => setDuration(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="lead">Lead Number</label>
            <input id="lead" className="input" inputMode="tel" placeholder="e.g. 012 345 6789" value={leadNumber} onChange={(e) => setLeadNumber(e.target.value)} autoComplete="off" />
            {leadNumber.replace(/\D/g, '').length > 6 && <span className="tiny faint">Shown elsewhere as {maskLead(leadNumber)} 🔒</span>}
          </div>
          <div className="field">
            <label htmlFor="outlet">Outlet</label>
            <select id="outlet" className="select" value={outlet} onChange={(e) => setOutlet(e.target.value)}>
              {OUTLETS.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="src">Campaign / Lead Source</label>
            <select id="src" className="select" value={leadSource} onChange={(e) => setLeadSource(e.target.value)}>
              {LEAD_SOURCES.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="lang">Language</label>
            <select id="lang" className="select" value={language} onChange={(e) => setLanguage(e.target.value)}>
              {LANGUAGES.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="rev">Reviewer</label>
            <select id="rev" className="select" value={reviewer} onChange={(e) => setReviewer(e.target.value)}>
              {REVIEWERS.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </div>
        </div>
        <hr className="divider" style={{ margin: '18px 0' }} />
        <div className="row-wrap">
          <div className="field" style={{ flex: '1 1 280px' }}>
            <label htmlFor="fw">ICC framework version</label>
            <select id="fw" className="select" value={frameworkId} onChange={(e) => setFrameworkId(e.target.value)}>
              {FRAMEWORKS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.isPrimary ? '⭐ ' : ''}
                  {f.frameworkName} — {f.frameworkVersion} ({f.maxTotal} pts)
                </option>
              ))}
            </select>
          </div>
          <div className="field" style={{ flex: '1 1 200px' }}>
            <label htmlFor="ctype">Call type</label>
            <select id="ctype" className="select" value={callType} onChange={(e) => setCallType(e.target.value as CallType)}>
              {fw.callTypeProfiles.map((p) => (
                <option key={p.callType} value={p.callType}>
                  {p.emoji} {p.label}
                </option>
              ))}
            </select>
          </div>
          <div className="small muted" style={{ flex: '2 1 320px' }}>
            {fw.description} <SourceTag source={fw.source} />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div>
            <h2>📝 Transcript</h2>
            <div className="sub">Speaker labels (Consultant / Customer) and timestamps give the most reliable results.</div>
          </div>
          <span className="spacer" />
          <div className="row-wrap">
            <button className="btn btn-sm" onClick={paste}>
              📋 Paste Transcript
            </button>
            <button className="btn btn-sm btn-ghost" onClick={() => setTranscript('')} disabled={!transcript}>
              🧹 Clear
            </button>
          </div>
        </div>
        <textarea
          className="textarea"
          rows={14}
          placeholder={'Paste your transcript here...\n\nExample:\n[00:00] Consultant: Hello, good afternoon! This is Mia from U.R. Klinik…\n[00:05] Customer: Hi, yes…'}
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          aria-label="Transcript"
        />
        <div className="row-wrap small" style={{ marginTop: 10, gap: 14 }}>
          <span className="tabular">
            <strong>{parsed.wordCount.toLocaleString()}</strong> words
          </span>
          <span className="tabular">
            <strong>{parsed.characterCount.toLocaleString()}</strong> characters
          </span>
          <span className="tabular">
            <strong>{parsed.lines.length}</strong> lines detected
          </span>
          <span>{parsed.lines.length ? (parsed.hasTimestamps ? '⏱️ Timestamps found' : '⏱️ No timestamps') : ''}</span>
          {speakers.length > 0 && (
            <span className="row-wrap" style={{ gap: 6 }}>
              {speakers.slice(0, 4).map(([label, role]) => (
                <span key={label} className={`tag ${role === 'agent' ? 'tag-reference' : ''}`}>
                  {label} → {role === 'agent' ? 'Consultant' : role === 'customer' ? 'Customer' : 'Unknown'}
                </span>
              ))}
            </span>
          )}
        </div>
        {parsed.parseNotes.length > 0 && (
          <ul className="small muted" style={{ margin: '10px 0 0', paddingLeft: 18 }}>
            {parsed.parseNotes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        )}
      </div>

      {errors.length > 0 && (
        <div className="card card-pink card-tight" role="alert">
          {errors.map((e) => (
            <div key={e}>⚠️ {e}</div>
          ))}
        </div>
      )}

      <div className="card center" style={{ background: 'radial-gradient(80% 120% at 50% 0%, #FFF1C2 0%, var(--paper) 70%)' }}>
        <SectionTitle title="" />
        <div className="stack" style={{ alignItems: 'center', gap: 14 }}>
          <button className="btn btn-primary btn-xl" onClick={analyse}>
            ✨ ANALYSE THIS CALL
          </button>
          <button className="btn btn-sm" onClick={saveDraft}>
            💾 Save Draft
          </button>
          <p className="tiny faint" style={{ maxWidth: 560 }}>
            {claude
              ? 'Evaluated by Claude. Every quote is checked against your transcript, and a QA reviewer confirms the final score.'
              : 'Using the free demo evaluator (keyword checks — not AI). Connect Claude in Settings for real AI evaluation. Every quote is checked against your transcript.'}
          </p>
        </div>
      </div>
    </div>
  );
}
