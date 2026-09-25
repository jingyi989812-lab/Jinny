/**
 * Privacy helpers. Lead numbers are masked in every general view.
 * Role-based visibility is simulated client-side in this prototype — real
 * enforcement must happen on the server once authentication exists.
 */
import type { UserRole } from '@/types/staff';

export function maskLead(lead: string): string {
  const digits = lead.replace(/\D/g, '');
  if (digits.length <= 6) return '•'.repeat(digits.length);
  return `${digits.slice(0, 3)}${'*'.repeat(digits.length - 6)}${digits.slice(-3)}`;
}

export interface RoleCapabilities {
  label: string;
  emoji: string;
  description: string;
  /** See full lead numbers (QA only). */
  canRevealLeads: boolean;
  /** Confirm or override an AI evaluation. */
  canReview: boolean;
  /** Open calls belonging to other people. */
  canSeeOtherCalls: boolean;
  /** Team Performance and QA Insights. */
  canSeeTeam: boolean;
  /** Read the raw transcript and the evidence behind each finding. */
  canSeeTranscripts: boolean;
  /** Export / print a QA report. */
  canExport: boolean;
  /** Engine, framework and data settings — the machine room. */
  canSeeInternals: boolean;
}

/**
 * Who sees what.
 *
 * A consultant opens this app between calls: their own calls, their own
 * progress, their own coaching. Everything comparative is deliberately absent —
 * not hidden to be secretive, but because a scoreboard is not what helps you on
 * the next call.
 *
 * QA / MARCOM is the console behind it: every call, every transcript, the
 * evidence, the overrides and the machine room.
 *
 * PROTOTYPE: this is enforced in the browser only. It shapes the product, it is
 * not security — that needs sign-in and server-side filtering (see Settings).
 */
export const ROLE_META: Record<UserRole, RoleCapabilities> = {
  qa_manager: {
    label: 'QA / MARCOM Manager',
    emoji: '🎧',
    description: 'Evaluate calls, confirm AI results, coach the team.',
    canRevealLeads: true,
    canReview: true,
    canSeeOtherCalls: true,
    canSeeTeam: true,
    canSeeTranscripts: true,
    canExport: true,
    canSeeInternals: true,
  },
  staff: {
    label: 'CSC / MARCOM Staff',
    emoji: '👩‍💼',
    description: 'Your own calls, your own evidence, your own growth.',
    canRevealLeads: false,
    canReview: false,
    canSeeOtherCalls: false,
    canSeeTeam: false,
    canSeeTranscripts: true,
    canExport: false,
    canSeeInternals: false,
  },
  management: {
    label: 'Management',
    emoji: '📊',
    description: 'Team performance and trends — no transcripts, no personal data.',
    canRevealLeads: false,
    canReview: false,
    canSeeOtherCalls: true,
    canSeeTeam: true,
    canSeeTranscripts: false,
    canExport: true,
    canSeeInternals: false,
  },
};
