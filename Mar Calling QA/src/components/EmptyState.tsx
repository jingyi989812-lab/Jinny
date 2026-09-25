import { useNavigate } from 'react-router-dom';
import { EmptyIllustration } from './illustrations';

export function EmptyState({
  title = 'No calls here yet.',
  message = "Upload your first transcript and let's start coaching.",
  action = '✨ Analyse First Call',
  to = '/evaluate',
}: {
  title?: string;
  message?: string;
  action?: string | null;
  to?: string;
}) {
  const navigate = useNavigate();
  return (
    <div className="empty">
      <EmptyIllustration />
      <h3 style={{ fontSize: 22 }}>{title}</h3>
      <p className="muted">{message}</p>
      {action && (
        <button className="btn btn-primary" onClick={() => navigate(to)}>
          {action}
        </button>
      )}
    </div>
  );
}
