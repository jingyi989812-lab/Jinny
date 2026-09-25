import { useNavigate } from 'react-router-dom';
import { useT } from '@/services/i18n';
import { useStore } from '@/services/store';

/** Shown on dashboards while real recordings are scored by the demo keyword evaluator. */
export function ProvisionalBanner() {
  const { visibleCalls: calls } = useStore();
  const navigate = useNavigate();
  const t = useT();
  const imported = calls.filter((c) => c.transcriptSource === 'recording-import' && c.evaluation.engine.provider === 'mock-heuristic');
  const provisional = imported.length;
  const unlabelled = imported.filter((c) => c.evaluation.diarized === false).length;
  if (!provisional) return null;
  return (
    <div className="card card-tight card-yellow row-wrap small" style={{ border: '2px dashed var(--yellow-600)' }} role="note">
      <span style={{ fontSize: 22 }} aria-hidden>
        🚧
      </span>
      <div style={{ flex: '1 1 320px' }}>
        <strong>{t({ en: 'Provisional scores — not for performance decisions.', zh: '临时分数 — 不作为考核依据。' })}</strong>{' '}
        <span className="muted">
          {provisional} real recordings are scored by the demo keyword evaluator, which matches keywords and cannot judge quality or paraphrase.{' '}
          {unlabelled > 0 && `${unlabelled} of them ${unlabelled === 1 ? 'has' : 'have'} no speaker labels, so ${unlabelled === 1 ? 'that score undercounts' : 'those scores undercount'} the most. `}
          Pass marks are placeholders. Use for exploring calls until the Claude evaluator is connected and QA has reviewed results.
        </span>
      </div>
      <button className="btn btn-sm" onClick={() => navigate('/settings')}>
        {t({ en: 'Details', zh: '详情' })}
      </button>
    </div>
  );
}
