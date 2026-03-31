import type { Session } from '../models/Session';
import { isVolumeSession, isTrainingSession, getAttemptCounts, getSessionDuration } from '../models/Session';

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
  const duration = getSessionDuration(session);

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
            {isTrainingSession(session) && (
              session.trainingData.trainingMode === 'maxtest' ? 'Max Test' : 'Training Session'
            )}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {dateStr}
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(session.id);
          }}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          aria-label="Delete session"
          title="Delete this session"
        >
          <span className="text-xl text-gray-400">×</span>
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
            <div className="text-right text-gray-500 dark:text-gray-400">{duration}</div>
          </div>
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
          {session.trainingData.trainingMode === 'maxtest' && session.trainingData.maxTestData?.discoveredMax ? (
            <div className="grid grid-cols-3 gap-x-4 text-gray-600 dark:text-gray-300 mb-1">
              {session.trainingData.maxTestData.discoveredMax.hang != null && (
                <div>Hang: {session.trainingData.maxTestData.discoveredMax.hang}kg</div>
              )}
              {session.trainingData.maxTestData.discoveredMax.pullup != null && (
                <div>Pull-up: {session.trainingData.maxTestData.discoveredMax.pullup}kg</div>
              )}
              {session.trainingData.maxTestData.discoveredMax.bench != null && (
                <div>Bench: {session.trainingData.maxTestData.discoveredMax.bench}kg</div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-x-4 text-gray-600 dark:text-gray-300 mb-1">
              <div>
                Hang: {session.trainingData.hangWeight}kg ({session.trainingData.hangSets.filter(s => s.completed).length}/{session.trainingData.hangSets.length})
              </div>
              <div>
                Pull-up: {session.trainingData.pullupWeight}kg ({session.trainingData.pullupSets.filter(s => s.completed).length}/{session.trainingData.pullupSets.length})
              </div>
              <div>
                Bench: {session.trainingData.benchWeight}kg ({session.trainingData.benchSets.filter(s => s.completed).length}/{session.trainingData.benchSets.length})
              </div>
            </div>
          )}
          <div className="text-right text-gray-500 dark:text-gray-400">{duration}</div>
        </div>
      )}
    </div>
  );
}
