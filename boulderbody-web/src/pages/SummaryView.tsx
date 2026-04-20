import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';
import type { Session, TrainingSession } from '../models/Session';
import {
  isVolumeSession,
  isTrainingSession,
  getAttemptCounts,
  getSessionDuration,
  getFailRate,
} from '../models/Session';
import { getAllSessions, deleteSession } from '../logic/StorageManager';
import { getTrainingRecommendation } from '../logic/TrainingRecommender';
import { isExerciseComplete } from '../models/SessionType';
import { ConfirmDialog } from '../components/ConfirmDialog';

/**
 * Summary View - Post-session statistics and charts.
 * Shows different summaries for volume vs training sessions.
 */
export function SummaryView() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [prevTraining, setPrevTraining] = useState<TrainingSession | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      navigate('/');
      return;
    }

    const allSessions = getAllSessions();
    const found = allSessions.find((s) => s.id === sessionId);

    if (!found) {
      navigate('/');
      return;
    }

    setSession(found);

    // For training sessions, find the most recent finished training session
    // that is NOT the current session — used for delta-from-last computation.
    if (isTrainingSession(found)) {
      const priorTraining = allSessions
        .filter(
          (s): s is TrainingSession =>
            isTrainingSession(s) && s.isFinished && s.id !== found.id
        )
        .sort((a, b) => b.date.getTime() - a.date.getTime());
      setPrevTraining(priorTraining[0] ?? null);
    }
  }, [sessionId, navigate]);

  if (!session) {
    return null; // Loading state
  }

  const duration = getSessionDuration(session);

  const handleDelete = () => {
    deleteSession(session.id);
    navigate('/');
  };

  const dateStr = session.date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  // Prepare volume session data if applicable
  let volumeChartData: any[] = [];
  let volumeCounts: any = null;
  let volumeFailRate = 0;

  if (isVolumeSession(session)) {
    volumeCounts = getAttemptCounts(session);
    volumeFailRate = getFailRate(session);
    volumeChartData = [
      { name: 'Flash', value: volumeCounts.flash, color: '#22c55e' },
      { name: 'Done', value: volumeCounts.done, color: '#3b82f6' },
      { name: 'Fail', value: volumeCounts.fail, color: '#ef4444' },
      { name: 'Unlogged', value: volumeCounts.unlogged, color: '#9ca3af' },
    ].filter((item) => item.value > 0);
  }

  // Prepare training session "next recommendation" — based on the *current* session,
  // since it's the most recent finished training session at this point.
  let trainingRec = null;
  if (isTrainingSession(session)) {
    trainingRec = getTrainingRecommendation(session);
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => navigate('/')}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            ← Home
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium"
          >
            Delete Session
          </button>
        </div>

        {/* Volume Session Summary */}
        {isVolumeSession(session) && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg mb-6">
            <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white text-center">
              Level {session.targetLevel}
            </h1>
            <p className="text-center text-gray-500 dark:text-gray-400 mb-6">
              {dateStr}
            </p>

            {/* Key metrics */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="text-center">
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Duration
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {duration}
                </p>
              </div>
              <div className="text-center">
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Fail Rate
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {volumeFailRate.toFixed(0)}%
                </p>
              </div>
            </div>

            {/* Chart */}
            {volumeChartData.length > 0 ? (
              <div className="h-64 mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={volumeChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {volumeChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No attempts logged
              </div>
            )}

            {/* Detailed breakdown */}
            <div className="space-y-2">
              <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <span className="text-green-800 dark:text-green-200 font-medium">
                  Flash
                </span>
                <span className="text-green-900 dark:text-green-100 font-bold">
                  {volumeCounts!.flash}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <span className="text-blue-800 dark:text-blue-200 font-medium">
                  Done
                </span>
                <span className="text-blue-900 dark:text-blue-100 font-bold">
                  {volumeCounts!.done}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <span className="text-red-800 dark:text-red-200 font-medium">
                  Fail
                </span>
                <span className="text-red-900 dark:text-red-100 font-bold">
                  {volumeCounts!.fail}
                </span>
              </div>
              {volumeCounts!.unlogged > 0 && (
                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <span className="text-gray-800 dark:text-gray-200 font-medium">
                    Unlogged (counted as fails)
                  </span>
                  <span className="text-gray-900 dark:text-gray-100 font-bold">
                    {volumeCounts!.unlogged}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Training Session Summary */}
        {isTrainingSession(session) && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg mb-6">
            <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white text-center">
              Training Session
            </h1>
            <p className="text-center text-gray-500 dark:text-gray-400 mb-6">
              {dateStr}
            </p>

            {/* Duration */}
            <div className="text-center mb-6">
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Duration
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {duration}
              </p>
            </div>

            <TrainingSummary session={session} prevSession={prevTraining} />

            {/* All sets completion message */}
            {isExerciseComplete(session.trainingData.hangSets) &&
              isExerciseComplete(session.trainingData.pullupSets) &&
              isExerciseComplete(session.trainingData.benchSets) &&
              isExerciseComplete(session.trainingData.trapBarSets) && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg mb-6 text-center">
                <span className="text-green-800 dark:text-green-200 font-medium">
                  All sets completed!
                </span>
              </div>
            )}

            {/* Next recommendation */}
            {trainingRec && (
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                  Next Recommendation:
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                  {trainingRec.reason}
                </p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Hangs:</span>{' '}
                    <span className="font-medium text-gray-900 dark:text-white">
                      {trainingRec.hangStart}kg
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Pull-ups:</span>{' '}
                    <span className="font-medium text-gray-900 dark:text-white">
                      {trainingRec.pullupStart}kg
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Bench:</span>{' '}
                    <span className="font-medium text-gray-900 dark:text-white">
                      {trainingRec.benchWeight}kg
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Trap Bar:</span>{' '}
                    <span className="font-medium text-gray-900 dark:text-white">
                      {trainingRec.trapBarWeight}kg
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <button
          onClick={() => navigate('/')}
          className="w-full btn btn-primary text-lg py-3"
        >
          Start New Session
        </button>
      </div>

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete Session"
        message={`Delete session from ${dateStr}? This cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}

/**
 * Formatted delta tag next to a discovered max.
 * null delta → nothing rendered.
 */
function DeltaTag({ delta }: { delta: number | null }) {
  if (delta === null) return null;
  if (delta === 0) {
    return (
      <span className="ml-2 text-sm font-medium text-gray-500 dark:text-gray-400">
        (same as last)
      </span>
    );
  }
  if (delta > 0) {
    return (
      <span className="ml-2 text-sm font-medium text-green-600 dark:text-green-400">
        (+{delta}kg from last)
      </span>
    );
  }
  return (
    <span className="ml-2 text-sm font-medium text-red-600 dark:text-red-400">
      ({delta}kg from last)
    </span>
  );
}

/**
 * Training summary — max per exercise (+delta) and working-set completion.
 */
function TrainingSummary({
  session,
  prevSession,
}: {
  session: TrainingSession;
  prevSession: TrainingSession | null;
}) {
  const { trainingData } = session;

  const currMaxHang = trainingData.discoveredMax?.hang;
  const prevMaxHang = prevSession?.trainingData.discoveredMax?.hang;
  const deltaHang =
    prevMaxHang != null && currMaxHang != null ? currMaxHang - prevMaxHang : null;

  const currMaxPullup = trainingData.discoveredMax?.pullup;
  const prevMaxPullup = prevSession?.trainingData.discoveredMax?.pullup;
  const deltaPullup =
    prevMaxPullup != null && currMaxPullup != null
      ? currMaxPullup - prevMaxPullup
      : null;

  const hangWorkingSets = trainingData.hangSets.filter((s) => s.setType === 'working');
  const hangWorkingCompleted = hangWorkingSets.filter((s) => s.completed).length;
  const hangWorkingWeight = hangWorkingSets[0]?.weight;

  const pullupWorkingSets = trainingData.pullupSets.filter((s) => s.setType === 'working');
  const pullupWorkingCompleted = pullupWorkingSets.filter((s) => s.completed).length;
  const pullupWorkingWeight = pullupWorkingSets[0]?.weight;

  const benchSets = trainingData.benchSets ?? [];
  const benchCompleted = benchSets.filter((s) => s.completed).length;

  const trapBarSets = trainingData.trapBarSets ?? [];
  const trapBarCompleted = trapBarSets.filter((s) => s.completed).length;

  return (
    <div className="space-y-4 mb-6">
      {/* Hang */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <div className="flex flex-wrap items-baseline justify-between mb-2">
          <span className="text-blue-800 dark:text-blue-200 font-medium">Max Hang</span>
          <span className="text-blue-900 dark:text-blue-100 font-bold">
            {currMaxHang != null ? `${currMaxHang}kg` : '—'}
            <DeltaTag delta={deltaHang} />
          </span>
        </div>
        {hangWorkingSets.length > 0 && (
          <div className="text-sm text-blue-600 dark:text-blue-300">
            {hangWorkingCompleted}/{hangWorkingSets.length} working hangs
            {hangWorkingWeight != null ? ` at ${hangWorkingWeight}kg` : ''}
            {hangWorkingCompleted === hangWorkingSets.length ? ' ✓' : ''}
          </div>
        )}
      </div>

      {/* Pull-up */}
      <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
        <div className="flex flex-wrap items-baseline justify-between mb-2">
          <span className="text-purple-800 dark:text-purple-200 font-medium">
            Max Pull-up
          </span>
          <span className="text-purple-900 dark:text-purple-100 font-bold">
            {currMaxPullup != null ? `${currMaxPullup}kg` : '—'}
            <DeltaTag delta={deltaPullup} />
          </span>
        </div>
        {pullupWorkingSets.length > 0 && (
          <div className="text-sm text-purple-600 dark:text-purple-300">
            {pullupWorkingCompleted}/{pullupWorkingSets.length} working pull-ups
            {pullupWorkingWeight != null ? ` at ${pullupWorkingWeight}kg` : ''}
            {pullupWorkingCompleted === pullupWorkingSets.length ? ' ✓' : ''}
          </div>
        )}
      </div>

      {/* Bench */}
      {benchSets.length > 0 && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <span className="text-green-800 dark:text-green-200 font-medium">
              Bench Press
            </span>
            <span className="text-green-900 dark:text-green-100 font-bold">
              {trainingData.benchWeight ?? 10}kg
            </span>
          </div>
          <div className="text-sm text-green-600 dark:text-green-300">
            {benchCompleted}/{benchSets.length} sets completed
          </div>
        </div>
      )}

      {/* Trap bar */}
      {trapBarSets.length > 0 && (
        <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <span className="text-orange-800 dark:text-orange-200 font-medium">
              Trap Bar Deadlift
            </span>
            <span className="text-orange-900 dark:text-orange-100 font-bold">
              {trainingData.trapBarWeight ?? 20}kg
            </span>
          </div>
          <div className="text-sm text-orange-600 dark:text-orange-300">
            {trapBarCompleted}/{trapBarSets.length} sets completed
          </div>
        </div>
      )}
    </div>
  );
}
