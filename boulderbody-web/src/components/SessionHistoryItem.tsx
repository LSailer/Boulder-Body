import type { Session } from '../models/Session';
import { isVolumeSession, isTrainingSession, getAttemptCounts, getSessionDuration } from '../models/Session';

/**
 * List item component for displaying a past session.
 * Shows key stats and provides click navigation to summary.
 * Handles both volume and training session types.
 */

interface SessionHistoryItemProps {
  /** The session to display */
  session: Session;

  /** Called when user clicks the card */
  onClick: () => void;

  /** Called when user clicks delete button */
  onDelete: (id: string) => void;
}

export function SessionHistoryItem({
  session,
  onClick,
  onDelete,
}: SessionHistoryItemProps) {
  const duration = getSessionDuration(session);

  // Format date as "Jan 31, 2026"
  const dateStr = session.date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div
      onClick={onClick}
      className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow hover:shadow-lg transition-shadow cursor-pointer border border-gray-200 dark:border-gray-700"
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <div className="text-lg font-bold text-gray-900 dark:text-white">
            {isVolumeSession(session) && `Level ${session.targetLevel}`}
            {isTrainingSession(session) && 'Training Session'}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {dateStr}
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation(); // Prevent card click
            onDelete(session.id);
          }}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          aria-label="Delete session"
          title="Delete this session"
        >
          <span className="text-xl">🗑️</span>
        </button>
      </div>

      {/* Volume Session Stats */}
      {isVolumeSession(session) && (
        <>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-gray-600 dark:text-gray-300">
              <span className="font-medium">{getAttemptCounts(session).flash}</span> flash,{' '}
              <span className="font-medium">{getAttemptCounts(session).done}</span> done,{' '}
              <span className="font-medium">{getAttemptCounts(session).fail}</span> fail
            </div>
            <div className="text-right text-gray-500 dark:text-gray-400">
              {duration}
            </div>
          </div>

          {/* Show unlogged count if any */}
          {getAttemptCounts(session).unlogged > 0 && (
            <div className="mt-2 text-xs text-amber-600 dark:text-amber-400">
              {getAttemptCounts(session).unlogged} unlogged
            </div>
          )}
        </>
      )}

      {/* Training Session Stats */}
      {isTrainingSession(session) && (
        <div className="text-sm">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-gray-600 dark:text-gray-300 mb-1">
            <div>
              Hangs: {session.trainingData.hangWeight}kg ({session.trainingData.hangSets.filter(s => s.completed).length}/{session.trainingData.hangSets.length})
            </div>
            <div>
              Pull-ups: {session.trainingData.pullupWeight}kg ({session.trainingData.pullupSets.filter(s => s.completed).length}/{session.trainingData.pullupSets.length})
            </div>
            {(session.trainingData.benchSets ?? []).length > 0 && (
              <div>
                Bench: {session.trainingData.benchWeight ?? 10}kg ({(session.trainingData.benchSets ?? []).filter(s => s.completed).length}/{(session.trainingData.benchSets ?? []).length})
              </div>
            )}
            {(session.trainingData.trapBarSets ?? []).length > 0 && (
              <div>
                Trap Bar: {session.trainingData.trapBarWeight ?? 20}kg ({(session.trainingData.trapBarSets ?? []).filter(s => s.completed).length}/{(session.trainingData.trapBarSets ?? []).length})
              </div>
            )}
          </div>
          <div className="text-right text-gray-500 dark:text-gray-400">
            {duration}
          </div>
        </div>
      )}
    </div>
  );
}
