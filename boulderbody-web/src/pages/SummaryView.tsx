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
import type { TrainingSet } from '../models/SessionType';
import { getAllSessions, deleteSession, getLastTrainingSession } from '../logic/StorageManager';
import { getTrainingRecommendation } from '../logic/TrainingRecommender';
import { isExerciseComplete } from '../models/SessionType';
import { ConfirmDialog } from '../components/ConfirmDialog';

/**
 * Summary View - Post-session statistics and charts.
 * Shows different summaries for volume vs training sessions.
 * For ramp-up sessions, shows discovery progression per exercise.
 */
export function SummaryView() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
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

  // Prepare training session data if applicable
  let trainingRec = null;
  if (isTrainingSession(session)) {
    const lastTraining = getLastTrainingSession();
    trainingRec = getTrainingRecommendation(lastTraining);
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
              {session.trainingData.rampUp ? 'Ramp-Up Session' : 'Training Session'}
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

            {/* Ramp-up results */}
            {session.trainingData.rampUp && (
              <RampUpSummary session={session} />
            )}

            {/* Normal training set completion (non-ramp-up) */}
            {!session.trainingData.rampUp && (
              <NormalTrainingSummary session={session} />
            )}

            {/* All sets completion message */}
            {isExerciseComplete(session.trainingData.hangSets) &&
              isExerciseComplete(session.trainingData.pullupSets) &&
              isExerciseComplete(session.trainingData.benchSets) &&
              isExerciseComplete(session.trainingData.trapBarSets) && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg mb-6 text-center">
                <span className="text-green-800 dark:text-green-200 font-medium">
                  All sets completed! 🎉
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
                      {trainingRec.hangWeight}kg
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Pull-ups:</span>{' '}
                    <span className="font-medium text-gray-900 dark:text-white">
                      {trainingRec.pullupWeight}kg
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

/** Normal training summary — same as before */
function NormalTrainingSummary({ session }: { session: TrainingSession }) {
  return (
    <div className="space-y-4 mb-6">
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <div className="flex justify-between items-center mb-2">
          <span className="text-blue-800 dark:text-blue-200 font-medium">Max Hangs</span>
          <span className="text-blue-900 dark:text-blue-100 font-bold">{session.trainingData.hangWeight}kg</span>
        </div>
        <div className="text-sm text-blue-600 dark:text-blue-300">
          {session.trainingData.hangSets.filter(s => s.completed).length}/{session.trainingData.hangSets.length} sets completed
        </div>
      </div>

      <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
        <div className="flex justify-between items-center mb-2">
          <span className="text-purple-800 dark:text-purple-200 font-medium">Max Pull-ups</span>
          <span className="text-purple-900 dark:text-purple-100 font-bold">{session.trainingData.pullupWeight}kg</span>
        </div>
        <div className="text-sm text-purple-600 dark:text-purple-300">
          {session.trainingData.pullupSets.filter(s => s.completed).length}/{session.trainingData.pullupSets.length} sets completed
        </div>
      </div>

      {(session.trainingData.benchSets ?? []).length > 0 && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <span className="text-green-800 dark:text-green-200 font-medium">Bench Press</span>
            <span className="text-green-900 dark:text-green-100 font-bold">{session.trainingData.benchWeight ?? 10}kg</span>
          </div>
          <div className="text-sm text-green-600 dark:text-green-300">
            {(session.trainingData.benchSets ?? []).filter(s => s.completed).length}/{(session.trainingData.benchSets ?? []).length} sets completed
          </div>
        </div>
      )}

      {(session.trainingData.trapBarSets ?? []).length > 0 && (
        <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <span className="text-orange-800 dark:text-orange-200 font-medium">Trap Bar Deadlift</span>
            <span className="text-orange-900 dark:text-orange-100 font-bold">{session.trainingData.trapBarWeight ?? 20}kg</span>
          </div>
          <div className="text-sm text-orange-600 dark:text-orange-300">
            {(session.trainingData.trapBarSets ?? []).filter(s => s.completed).length}/{(session.trainingData.trapBarSets ?? []).length} sets completed
          </div>
        </div>
      )}
    </div>
  );
}

/** Ramp-up summary — shows discovery progression per exercise */
function RampUpSummary({ session }: { session: TrainingSession }) {
  const rampUp = session.trainingData.rampUp!;
  const exercises: {
    key: 'hang' | 'pullup' | 'bench' | 'trapbar';
    label: string;
    setsKey: 'hangSets' | 'pullupSets' | 'benchSets' | 'trapBarSets';
    bgColor: string;
    textColor: string;
    subTextColor: string;
  }[] = [
    { key: 'hang', label: 'Max Hangs', setsKey: 'hangSets', bgColor: 'bg-blue-50 dark:bg-blue-900/20', textColor: 'text-blue-800 dark:text-blue-200', subTextColor: 'text-blue-600 dark:text-blue-300' },
    { key: 'pullup', label: 'Max Pull-ups', setsKey: 'pullupSets', bgColor: 'bg-purple-50 dark:bg-purple-900/20', textColor: 'text-purple-800 dark:text-purple-200', subTextColor: 'text-purple-600 dark:text-purple-300' },
    { key: 'bench', label: 'Bench Press', setsKey: 'benchSets', bgColor: 'bg-green-50 dark:bg-green-900/20', textColor: 'text-green-800 dark:text-green-200', subTextColor: 'text-green-600 dark:text-green-300' },
    { key: 'trapbar', label: 'Trap Bar Deadlift', setsKey: 'trapBarSets', bgColor: 'bg-orange-50 dark:bg-orange-900/20', textColor: 'text-orange-800 dark:text-orange-200', subTextColor: 'text-orange-600 dark:text-orange-300' },
  ];

  return (
    <div className="space-y-4 mb-6">
      {exercises.map(({ key, label, setsKey, bgColor, textColor, subTextColor }) => {
        const sets = (session.trainingData[setsKey] ?? []) as TrainingSet[];
        if (sets.length === 0) return null;

        const rampSets = sets.filter(s => s.setType === 'rampup');
        const workingSets = sets.filter(s => s.setType === 'working');
        const discoveredMax = rampUp.discoveredMax?.[key];
        const preBreakWeight = rampUp.preBreakWeights[key];
        const recovered = discoveredMax != null && discoveredMax >= preBreakWeight;

        const startWeight = rampSets.length > 0 ? rampSets[0].weight : null;
        const workingWeight = workingSets.length > 0 ? workingSets[0].weight : null;
        const workingCompleted = workingSets.filter(s => s.completed).length;

        return (
          <div key={key} className={`p-4 ${bgColor} rounded-lg`}>
            <div className="flex justify-between items-center mb-2">
              <span className={`${textColor} font-medium`}>{label}</span>
              {recovered ? (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300">
                  Recovered
                </span>
              ) : discoveredMax != null ? (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                  Recovering
                </span>
              ) : (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                  Incomplete
                </span>
              )}
            </div>
            <div className={`text-sm ${subTextColor} space-y-1`}>
              {startWeight != null && (
                <p>
                  Started at {startWeight}kg, ramped through {rampSets.length} set{rampSets.length !== 1 ? 's' : ''}
                </p>
              )}
              {discoveredMax != null && (
                <p>
                  Max found: {discoveredMax}kg (target: {preBreakWeight}kg)
                </p>
              )}
              {workingWeight != null && (
                <p>
                  Worked at {workingWeight}kg — {workingCompleted}/{workingSets.length} sets completed
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
