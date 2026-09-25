/**
 * App state. Demo calls are regenerated on load; anything the user creates
 * (evaluations, QA reviews, drafts, role) is kept in localStorage.
 * Swap this for API calls + a database in production.
 */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { StoreContext as Ctx, type Store } from './storeContext';
import { PRIMARY_FRAMEWORK } from '@/config/frameworks';
import type { Call, CallDraft } from '@/types/call';
import type { CallType } from '@/types/framework';
import { isCompilation, parseCompilation, recordingToCall, staffFromRecording } from './transcriptImport';
import type { QAReview } from '@/types/qa';
import type { Staff, UserRole } from '@/types/staff';
import { DEMO_STAFF, generateDemoCalls } from './mockData';
import { ROLE_META } from './privacy';
import { checkClaudeHealth, evaluateWithMock, judgementsToEvaluation, type ClaudeHealth, type EvaluatorProvider } from './qaEvaluator';

const KEY = 'marcom-calling-qa:v1';

/** Transcript files read from local-data/ in dev, newest first. */
const LOCAL_RECORDING_FILES = [
  'all_sales_call_transcripts.txt',
  'formatted_call_transcripts.txt',
  // Same 83 recordings as formatted_call_transcripts.txt but without speaker labels — kept last so the labelled copy wins.
  'all_recording_transcripts.txt',
];

type StoredCall = Omit<Call, 'evaluation'> & { evaluation?: Call['evaluation'] };

export interface Persisted {
  userCalls: Call[];
  importedStaff: Staff[];
  callTypeOverrides: Record<string, CallType>;
  scoreByCallType: boolean;
  /** Dev only: the local recordings file has been auto-imported once. */
  localRecordingsLoaded: boolean;
  reviews: Record<string, QAReview[]>;
  evaluationOverrides: Record<string, Call['evaluation']>;
  draft: CallDraft | null;
  role: UserRole;
  viewAsStaffId: string;
  showDemoData: boolean;
  provider: EvaluatorProvider;
  claudeUsage: ClaudeUsage;
}

export interface ClaudeUsage {
  calls: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

const DEFAULTS: Persisted = {
  userCalls: [],
  importedStaff: [],
  callTypeOverrides: {},
  scoreByCallType: true,
  localRecordingsLoaded: false,
  reviews: {},
  evaluationOverrides: {},
  draft: null,
  role: 'qa_manager',
  viewAsStaffId: 'yiling',
  showDemoData: true,
  provider: 'mock',
  claudeUsage: { calls: 0, inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
};

/**
 * Build a call's evaluation from what is stored: Claude judgements if we have them
 * (no new API call), otherwise the deterministic demo evaluator.
 */
function buildEvaluation(c: StoredCall, scoreByCallType: boolean, callType = c.callType): Call['evaluation'] {
  const input = {
    callId: c.id,
    staffName: c.staffName,
    callDate: c.callDate,
    duration: c.durationSec,
    outlet: c.outlet,
    leadSource: c.leadSource,
    language: c.language,
    transcript: c.transcript,
    frameworkId: c.frameworkId,
    callType: scoreByCallType ? callType : ('new_lead' as const),
    callTypeLocked: true,
  };
  if (c.claudeJudgements) {
    const ev = judgementsToEvaluation(input, c.claudeJudgements);
    ev.createdAt = c.claudeEvaluatedAt ?? c.createdAt;
    return ev;
  }
  const ev = evaluateWithMock(input);
  ev.createdAt = c.createdAt;
  return ev;
}

/** Evaluations are NOT stored (keeps localStorage small); they are rebuilt on load. */
function rehydrate(c: StoredCall, scoreByCallType = true): Call {
  if (c.evaluation && !c.claudeJudgements) return c as Call;
  return { ...c, evaluation: buildEvaluation(c, scoreByCallType) };
}

function dehydrate(c: Call): StoredCall {
  const { evaluation, ...rest } = c;
  if (evaluation.claude) return { ...rest, claudeJudgements: evaluation.claude.judgements, claudeEvaluatedAt: evaluation.createdAt };
  if (evaluation.engine.provider === 'mock-heuristic') return rest;
  return c;
}

const addUsage = (u: ClaudeUsage, ev: Call['evaluation']): ClaudeUsage => {
  const x = ev.claude?.judgements.usage;
  if (!x) return u;
  return {
    calls: u.calls + 1,
    inputTokens: u.inputTokens + x.inputTokens,
    outputTokens: u.outputTokens + x.outputTokens,
    cacheReadTokens: u.cacheReadTokens + x.cacheReadTokens,
    cacheWriteTokens: u.cacheWriteTokens + x.cacheWriteTokens,
  };
};

function load(): Persisted {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw);
    const scoreByCallType = parsed.scoreByCallType ?? true;
    return { ...DEFAULTS, ...parsed, userCalls: (parsed.userCalls ?? []).map((c: StoredCall) => rehydrate(c, scoreByCallType)) };
  } catch {
    return DEFAULTS;
  }
}


export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Persisted>(load);
  const [revealLeads, setRevealLeadsState] = useState(false);
  const [toastMessage, setToast] = useState<string | null>(null);
  const [claudeHealth, setClaudeHealth] = useState<ClaudeHealth>({ reachable: false, keyConfigured: false });
  const refreshClaudeHealth = useCallback(async () => {
    const h = await checkClaudeHealth();
    setClaudeHealth(h);
    return h;
  }, []);
  useEffect(() => {
    refreshClaudeHealth();
  }, [refreshClaudeHealth]);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ ...state, userCalls: state.userCalls.map(dehydrate) }));
    } catch {
      /* storage unavailable or full — keep in memory */
    }
  }, [state]);

  const demo = useMemo(() => generateDemoCalls(), []);

  /**
   * DEV ONLY — on this computer, recordings placed in local-data/ (git-ignored, never
   * part of the production build) are imported automatically the first time.
   * Newest file first: if the same recording appears twice, the first copy wins.
   */
  const loadLocalRecordings = useCallback(async (force = false) => {
    if (!import.meta.env.DEV) return;
    try {
      const texts = await Promise.all(
        LOCAL_RECORDING_FILES.map(async (file) => {
          const res = await fetch(`/local-data/${file}`, { cache: 'no-store' });
          return res.ok ? res.text() : '';
        }),
      );
      const recs = texts
        .filter(isCompilation)
        .flatMap((text) => parseCompilation(text))
        .filter((r) => r.onRoster);
      if (!recs.length) return;
      // Keep the FIRST copy of a recording: files are listed newest/best first.
      const byId = new Map<string, Call>();
      for (const r of recs) {
        const call = recordingToCall(r);
        if (!byId.has(call.id)) byId.set(call.id, call);
      }
      const calls = [...byId.values()];
      const staff = [...new Map(recs.map((r) => [r.staffId, staffFromRecording(r)])).values()];
      setState((s) => {
        if (s.localRecordingsLoaded && !force) return s;
        const existing = new Set(s.userCalls.map((c) => c.id));
        const fresh = calls.filter((c) => !existing.has(c.id));
        return {
          ...s,
          userCalls: [...fresh, ...s.userCalls],
          importedStaff: [...staff, ...s.importedStaff.filter((x) => !staff.some((n) => n.id === x.id))],
          showDemoData: false,
          viewAsStaffId: staff[0]?.id ?? s.viewAsStaffId,
          localRecordingsLoaded: true,
        };
      });
      setToast(`📥 ${calls.length} real recordings loaded from this computer`);
      window.setTimeout(() => setToast(null), 3500);
    } catch {
      /* no local recordings — nothing to do */
    }
  }, []);

  useEffect(() => {
    if (!state.localRecordingsLoaded) loadLocalRecordings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const calls = useMemo(() => {
    const base = [...state.userCalls, ...(state.showDemoData ? demo : [])];
    return base
      .map((c) => ({
        ...c,
        ...(state.callTypeOverrides[c.id] ? { callType: state.callTypeOverrides[c.id], callTypeSource: 'qa' as const } : {}),
        evaluation: state.evaluationOverrides[c.id] ?? c.evaluation,
        qaReviews: [...c.qaReviews, ...(state.reviews[c.id] ?? [])],
      }))
      .sort((a, b) => b.callDate.localeCompare(a.callDate) || b.createdAt.localeCompare(a.createdAt));
  }, [state.userCalls, state.reviews, state.evaluationOverrides, state.callTypeOverrides, state.showDemoData, demo]);

  const roleMeta = ROLE_META[state.role];
  const allStaff = useMemo(() => {
    const imported = state.importedStaff;
    const names = new Set(imported.map((x) => x.name.toLowerCase()));
    // Hide a demo profile when a real person with the same name has been imported.
    const demo = state.showDemoData ? DEMO_STAFF.filter((d) => !names.has(d.name.toLowerCase())) : [];
    return [...imported, ...demo];
  }, [state.importedStaff, state.showDemoData]);

  const toast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast((m) => (m === message ? null : m)), 3200);
  }, []);

  const value: Store = {
    ...state,
    calls,
    staff: allStaff,
    teamStaff: allStaff.filter((s) => s.showInTeam),
    frameworkId: PRIMARY_FRAMEWORK.id,
    revealLeads: revealLeads && roleMeta.canRevealLeads,
    canRevealLeads: roleMeta.canRevealLeads,
    canReview: roleMeta.canReview,
    can: roleMeta,
    myStaffId: state.viewAsStaffId,
    /* A consultant's app only ever holds their own calls. */
    visibleCalls: roleMeta.canSeeOtherCalls ? calls : calls.filter((c) => c.staffId === state.viewAsStaffId),
    getCall: (id) => calls.find((c) => c.id === id),
    addCall: (call) =>
      setState((s) => ({ ...s, userCalls: [call, ...s.userCalls.filter((c) => c.id !== call.id)], claudeUsage: addUsage(s.claudeUsage, call.evaluation) })),
    importCalls: (incoming, newStaff) =>
      setState((s) => {
        const ids = new Set(incoming.map((c) => c.id));
        const staffIds = new Set(newStaff.map((x) => x.id));
        return {
          ...s,
          userCalls: [...incoming, ...s.userCalls.filter((c) => !ids.has(c.id))],
          importedStaff: [...newStaff, ...s.importedStaff.filter((x) => !staffIds.has(x.id))],
        };
      }),
    addReview: (callId, review) => setState((s) => ({ ...s, reviews: { ...s.reviews, [callId]: [...(s.reviews[callId] ?? []), review] } })),
    setCallType: (callId, callType) => {
      const call = calls.find((c) => c.id === callId);
      if (!call) return;
      // Re-scores from stored judgements — no new Claude call needed.
      const stored: StoredCall = call.evaluation.claude
        ? { ...call, claudeJudgements: call.evaluation.claude.judgements, claudeEvaluatedAt: call.evaluation.createdAt }
        : { ...call, claudeJudgements: undefined };
      const evaluation = buildEvaluation(stored, state.scoreByCallType, callType);
      setState((s) => {
        const { [callId]: _drop, ...overrides } = s.evaluationOverrides;
        if (s.userCalls.some((c) => c.id === callId)) {
          return {
            ...s,
            evaluationOverrides: overrides,
            userCalls: s.userCalls.map((c) => (c.id === callId ? { ...c, callType, callTypeSource: 'qa', callTypeReason: 'Set by QA reviewer', evaluation } : c)),
          };
        }
        return { ...s, callTypeOverrides: { ...s.callTypeOverrides, [callId]: callType }, evaluationOverrides: { ...s.evaluationOverrides, [callId]: evaluation } };
      });
    },
    setScoreByCallType: (v) =>
      setState((s) => ({
        ...s,
        scoreByCallType: v,
        evaluationOverrides: {},
        userCalls: s.userCalls.map((c) => rehydrate({ ...c, callType: s.callTypeOverrides[c.id] ?? c.callType, evaluation: undefined }, v)),
      })),
    reloadLocalRecordings: () => loadLocalRecordings(true),
    replaceEvaluation: (callId, evaluation) =>
      setState((s) => {
        const claudeUsage = addUsage(s.claudeUsage, evaluation);
        if (s.userCalls.some((c) => c.id === callId)) {
          const { [callId]: _drop, ...overrides } = s.evaluationOverrides;
          return {
            ...s,
            claudeUsage,
            evaluationOverrides: overrides,
            userCalls: s.userCalls.map((c) => {
              if (c.id !== callId) return c;
              const suggestion = evaluation.claude?.callTypeSuggestion;
              const adopt = suggestion && c.callTypeSource !== 'qa';
              return {
                ...c,
                evaluation,
                ...(adopt ? { callType: suggestion.type, callTypeSource: 'estimated' as const, callTypeReason: `Claude: ${suggestion.reason}` } : {}),
              };
            }),
          };
        }
        return { ...s, claudeUsage, evaluationOverrides: { ...s.evaluationOverrides, [callId]: evaluation } };
      }),
    claudeHealth,
    refreshClaudeHealth,
    resetClaudeUsage: () => setState((s) => ({ ...s, claudeUsage: DEFAULTS.claudeUsage })),
    recordClaudeUsage: (x) =>
      setState((s) => ({
        ...s,
        claudeUsage: {
          calls: s.claudeUsage.calls + 1,
          inputTokens: s.claudeUsage.inputTokens + x.inputTokens,
          outputTokens: s.claudeUsage.outputTokens + x.outputTokens,
          cacheReadTokens: s.claudeUsage.cacheReadTokens + x.cacheReadTokens,
          cacheWriteTokens: s.claudeUsage.cacheWriteTokens + x.cacheWriteTokens,
        },
      })),
    saveDraft: (draft) => setState((s) => ({ ...s, draft })),
    setRole: (role) => {
      setRevealLeadsState(false);
      setState((s) => ({ ...s, role }));
    },
    setViewAsStaffId: (viewAsStaffId) => setState((s) => ({ ...s, viewAsStaffId })),
    setRevealLeads: setRevealLeadsState,
    setShowDemoData: (showDemoData) => setState((s) => ({ ...s, showDemoData })),
    setProvider: (provider) => setState((s) => ({ ...s, provider })),
    resetLocalData: () => setState({ ...DEFAULTS, role: state.role }),
    toast,
    toastMessage,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export { useStore } from './storeContext';
