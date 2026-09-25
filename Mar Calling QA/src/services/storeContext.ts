/**
 * Store context + hook, kept in their own module so hot reloads of store logic
 * don't create a second context during development.
 */
import { createContext, useContext } from 'react';
import type { Call, CallDraft } from '@/types/call';
import type { CallType } from '@/types/framework';
import type { RoleCapabilities } from './privacy';
import type { QAReview } from '@/types/qa';
import type { Staff, UserRole } from '@/types/staff';
import type { EvaluatorProvider } from './qaEvaluator';
import type { ClaudeHealth } from './qaEvaluator';
import type { Persisted } from './store';

export interface Store extends Persisted {
  calls: Call[];
  staff: Staff[];
  teamStaff: Staff[];
  frameworkId: string;
  revealLeads: boolean;
  canRevealLeads: boolean;
  canReview: boolean;
  /** What this role may see and do (src/services/privacy.ts). */
  can: RoleCapabilities;
  /** The staff member whose calls a consultant sees as "mine". */
  myStaffId: string;
  /** Calls this role may open — already filtered. */
  visibleCalls: Call[];
  getCall: (id: string) => Call | undefined;
  addCall: (call: Call) => void;
  importCalls: (calls: Call[], staff: Staff[]) => void;
  setCallType: (callId: string, callType: CallType) => void;
  setScoreByCallType: (v: boolean) => void;
  reloadLocalRecordings: () => void;
  claudeHealth: ClaudeHealth;
  refreshClaudeHealth: () => Promise<ClaudeHealth>;
  resetClaudeUsage: () => void;
  recordClaudeUsage: (usage: { inputTokens: number; outputTokens: number; cacheReadTokens: number; cacheWriteTokens: number }) => void;
  addReview: (callId: string, review: QAReview) => void;
  replaceEvaluation: (callId: string, evaluation: Call['evaluation']) => void;
  saveDraft: (draft: CallDraft | null) => void;
  setRole: (role: UserRole) => void;
  setViewAsStaffId: (id: string) => void;
  setRevealLeads: (v: boolean) => void;
  setShowDemoData: (v: boolean) => void;
  setProvider: (p: EvaluatorProvider) => void;
  resetLocalData: () => void;
  toast: (message: string) => void;
  toastMessage: string | null;
}

export const StoreContext = createContext<Store | null>(null);

export function useStore(): Store {
  const s = useContext(StoreContext);
  if (!s) throw new Error('useStore must be used inside StoreProvider');
  return s;
}
