import type { Session } from '../models/Session';
import {
  isVolumeSession,
  isTrainingSession,
  getAttemptCounts,
} from '../models/Session';

interface SessionHistoryItemProps {
  session: Session;
  onClick: () => void;
  onDelete: (id: string) => void;
}

export function SessionHistoryItem({
  session,
  onClick,
  onDelete,
}: SessionHistoryItemProps) {
  const weekday = session.date.toLocaleDateString('en-US', { weekday: 'short' });
  const md = session.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 p-3 rounded-xl border border-line bg-paper hover:bg-chalk/60 cursor-pointer transition-colors dark:bg-basalt/40 dark:hover:bg-basalt/70"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {isVolumeSession(session) ? (
        <div className="w-11 h-11 rounded-xl bg-chalk border border-line flex items-center justify-center font-display text-lg text-rust dark:bg-basalt">
          V{session.targetLevel}
        </div>
      ) : (
        <div className="w-11 h-11 rounded-xl bg-chalk border border-line flex items-center justify-center text-xl dark:bg-basalt">
          💪
        </div>
      )}

      <div className="flex-1 min-w-0">
        {isVolumeSession(session) && (
          <>
            <div className="font-semibold text-sm">
              {weekday} · {md}
            </div>
            <div className="text-xs text-graphite">
              {session.boulderCount} attempts
            </div>
          </>
        )}
        {isTrainingSession(session) && (
          <>
            <div className="font-semibold text-sm">
              Training · {weekday}
            </div>
            <div className="text-xs text-graphite font-mono">
              {session.trainingData.discoveredMax?.hang != null
                ? `hang ${session.trainingData.discoveredMax.hang}`
                : 'hang —'}
              {' · '}
              {session.trainingData.discoveredMax?.pullup != null
                ? `pull ${session.trainingData.discoveredMax.pullup}`
                : 'pull —'}
            </div>
          </>
        )}
      </div>

      {isVolumeSession(session) && (
        <div className="flex items-center gap-1.5 text-xs">
          <span className="font-semibold text-gold">
            {getAttemptCounts(session).flash}
          </span>
          <span className="text-graphite">·</span>
          <span className="font-semibold text-moss">
            {getAttemptCounts(session).done}
          </span>
          <span className="text-graphite">·</span>
          <span className="font-semibold text-graphite">
            {getAttemptCounts(session).fail}
          </span>
        </div>
      )}

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(session.id);
        }}
        className="p-2 rounded-lg text-graphite hover:text-rust hover:bg-chalk transition-colors"
        aria-label="Delete session"
        title="Delete this session"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          <path d="M10 11v6M14 11v6" />
        </svg>
      </button>
    </div>
  );
}
