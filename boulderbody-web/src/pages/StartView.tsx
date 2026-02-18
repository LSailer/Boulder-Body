import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Session, VolumeSession, TrainingSession } from '../models/Session';
import { isVolumeSession } from '../models/Session';
import type { SessionType } from '../models/SessionType';
import { TRAINING_PROTOCOL } from '../models/SessionType';
import {
  getAllSessions,
  getCurrentSession,
  getLastVolumeSession,
  getLastTrainingSession,
  saveSession,
  deleteSession,
} from '../logic/StorageManager';
import { getRecommendation } from '../logic/SessionRecommender';
import { getTrainingRecommendation } from '../logic/TrainingRecommender';
import { ThemeToggle } from '../components/ThemeToggle';
import { SessionHistoryItem } from '../components/SessionHistoryItem';
import { ConfirmDialog } from '../components/ConfirmDialog';

/**
 * Start View - Home screen with session form and history.
 * Displays recommended settings based on past performance for both session types.
 */
export function StartView() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionType, setSessionType] = useState<SessionType>('volume');

  // Volume session state
  const [level, setLevel] = useState(5);
  const [boulderCount, setBoulderCount] = useState(20);
  const [volumeReason, setVolumeReason] = useState('');

  // Training session state
  const [hangWeight, setHangWeight] = useState(0);
  const [pullupWeight, setPullupWeight] = useState(0);
  const [benchWeight, setBenchWeight] = useState(10);
  const [trapBarWeight, setTrapBarWeight] = useState(20);
  const [trainingReason, setTrainingReason] = useState('');

  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: string;
    date: string;
  } | null>(null);

  // Load sessions and calculate recommendations on mount
  useEffect(() => {
    const allSessions = getAllSessions();
    setSessions(allSessions.filter((s) => s.isFinished));

    // Check if there's an active session
    const activeSession = getCurrentSession();
    if (activeSession) {
      // Resume active session - route based on type
      if (isVolumeSession(activeSession)) {
        navigate(`/session/${activeSession.id}`);
      } else {
        navigate(`/training/${activeSession.id}`);
      }
      return;
    }

    // Get volume recommendation
    const lastVolumeSession = getLastVolumeSession();
    const volumeRec = getRecommendation(lastVolumeSession);
    setLevel(volumeRec.level);
    setBoulderCount(volumeRec.boulderCount);
    setVolumeReason(volumeRec.reason);

    // Get training recommendation
    const lastTrainingSession = getLastTrainingSession();
    const trainingRec = getTrainingRecommendation(lastTrainingSession);
    setHangWeight(trainingRec.hangWeight);
    setPullupWeight(trainingRec.pullupWeight);
    setBenchWeight(trainingRec.benchWeight);
    setTrapBarWeight(trainingRec.trapBarWeight);
    setTrainingReason(trainingRec.reason);
  }, [navigate]);

  const handleStartSession = () => {
    let newSession: Session;

    if (sessionType === 'volume') {
      // Create volume session
      const volumeSession: VolumeSession = {
        id: crypto.randomUUID(),
        sessionType: 'volume',
        date: new Date(),
        startTime: new Date(),
        isFinished: false,
        targetLevel: level,
        boulderCount,
        attempts: Array.from({ length: boulderCount }, (_, i) => ({
          id: crypto.randomUUID(),
          order: i + 1,
        })),
      };
      newSession = volumeSession;
      saveSession(newSession);
      navigate(`/session/${newSession.id}`);
    } else {
      // Create training session
      const trainingSession: TrainingSession = {
        id: crypto.randomUUID(),
        sessionType: 'training',
        date: new Date(),
        startTime: new Date(),
        isFinished: false,
        trainingData: {
          hangWeight,
          pullupWeight,
          benchWeight,
          trapBarWeight,
          hangSets: Array.from({ length: TRAINING_PROTOCOL.hangSets }, (_, i) => ({
            id: crypto.randomUUID(),
            order: i + 1,
            exercise: 'hang' as const,
            completed: false,
          })),
          pullupSets: Array.from({ length: TRAINING_PROTOCOL.pullupSets }, (_, i) => ({
            id: crypto.randomUUID(),
            order: i + 1,
            exercise: 'pullup' as const,
            completed: false,
          })),
          benchSets: Array.from({ length: TRAINING_PROTOCOL.benchSets }, (_, i) => ({
            id: crypto.randomUUID(),
            order: i + 1,
            exercise: 'bench' as const,
            completed: false,
          })),
          trapBarSets: Array.from({ length: TRAINING_PROTOCOL.trapBarSets }, (_, i) => ({
            id: crypto.randomUUID(),
            order: i + 1,
            exercise: 'trapbar' as const,
            completed: false,
          })),
        },
      };
      newSession = trainingSession;
      saveSession(newSession);
      navigate(`/training/${newSession.id}`);
    }
  };

  const handleDeleteSession = (id: string) => {
    const session = sessions.find((s) => s.id === id);
    if (!session) return;

    setDeleteConfirm({
      id,
      date: session.date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
    });
  };

  const confirmDelete = () => {
    if (!deleteConfirm) return;

    deleteSession(deleteConfirm.id);
    setSessions(sessions.filter((s) => s.id !== deleteConfirm.id));
    setDeleteConfirm(null);

    // Recalculate both recommendations after deletion
    const lastVolumeSession = getLastVolumeSession();
    const volumeRec = getRecommendation(lastVolumeSession);
    setLevel(volumeRec.level);
    setBoulderCount(volumeRec.boulderCount);
    setVolumeReason(volumeRec.reason);

    const lastTrainingSession = getLastTrainingSession();
    const trainingRec = getTrainingRecommendation(lastTrainingSession);
    setHangWeight(trainingRec.hangWeight);
    setPullupWeight(trainingRec.pullupWeight);
    setBenchWeight(trainingRec.benchWeight);
    setTrapBarWeight(trainingRec.trapBarWeight);
    setTrainingReason(trainingRec.reason);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            BoulderBody
          </h1>
          <ThemeToggle />
        </div>

        {/* New Session Form */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg mb-8">
          <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
            Start New Session
          </h2>

          {/* Session Type Selector */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              Session Type
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setSessionType('volume')}
                className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                  sessionType === 'volume'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Volume
              </button>
              <button
                onClick={() => setSessionType('training')}
                className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                  sessionType === 'training'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Training
              </button>
            </div>
          </div>

          {/* Recommendation reason */}
          {sessionType === 'volume' && volumeReason && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm text-blue-800 dark:text-blue-200">
              <span className="font-medium">Recommendation:</span> {volumeReason}
            </div>
          )}
          {sessionType === 'training' && trainingReason && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm text-blue-800 dark:text-blue-200">
              <span className="font-medium">Recommendation:</span> {trainingReason}
            </div>
          )}

          {/* Volume Session Inputs */}
          {sessionType === 'volume' && (
            <>
              {/* Level input */}
              <div className="mb-4">
                <label
                  htmlFor="level"
                  className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300"
                >
                  Target Level
                </label>
                <input
                  id="level"
                  type="number"
                  min="1"
                  value={level}
                  onChange={(e) => setLevel(parseInt(e.target.value) || 1)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Boulder count input */}
              <div className="mb-6">
                <label
                  htmlFor="boulderCount"
                  className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300"
                >
                  Number of Boulders
                </label>
                <input
                  id="boulderCount"
                  type="number"
                  min="1"
                  max="100"
                  value={boulderCount}
                  onChange={(e) => setBoulderCount(parseInt(e.target.value) || 1)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          )}

          {/* Training Session Inputs */}
          {sessionType === 'training' && (
            <>
              <div className="mb-4">
                <label
                  htmlFor="hangWeight"
                  className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300"
                >
                  Max Hang Weight (kg) - {TRAINING_PROTOCOL.hangSets} sets of {TRAINING_PROTOCOL.hangDuration}s × {TRAINING_PROTOCOL.hangReps}
                </label>
                <input
                  id="hangWeight"
                  type="number"
                  min="0"
                  step="2.5"
                  value={hangWeight}
                  onChange={(e) => setHangWeight(parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="mb-4">
                <label
                  htmlFor="pullupWeight"
                  className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300"
                >
                  Max Pull-up Weight (kg) - {TRAINING_PROTOCOL.pullupSets} sets of {TRAINING_PROTOCOL.pullupReps} reps
                </label>
                <input
                  id="pullupWeight"
                  type="number"
                  min="0"
                  step="2.5"
                  value={pullupWeight}
                  onChange={(e) => setPullupWeight(parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="mb-4">
                <label
                  htmlFor="benchWeight"
                  className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300"
                >
                  Bench Press Weight (kg) - {TRAINING_PROTOCOL.benchSets} sets of {TRAINING_PROTOCOL.benchReps} reps
                </label>
                <input
                  id="benchWeight"
                  type="number"
                  min="0"
                  step="2.5"
                  value={benchWeight}
                  onChange={(e) => setBenchWeight(parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="mb-6">
                <label
                  htmlFor="trapBarWeight"
                  className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300"
                >
                  Trap Bar Deadlift Weight (kg) - {TRAINING_PROTOCOL.trapBarSets} sets of {TRAINING_PROTOCOL.trapBarReps} reps
                </label>
                <input
                  id="trapBarWeight"
                  type="number"
                  min="0"
                  step="2.5"
                  value={trapBarWeight}
                  onChange={(e) => setTrapBarWeight(parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          )}

          {/* Start button */}
          <button
            onClick={handleStartSession}
            className="w-full btn btn-primary text-lg py-3"
          >
            Start {sessionType === 'volume' ? 'Volume' : 'Training'} Session
          </button>
        </div>

        {/* Session History */}
        {sessions.length > 0 && (
          <div>
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
              Session History
            </h2>
            <div className="space-y-3">
              {sessions
                .sort((a, b) => b.date.getTime() - a.date.getTime())
                .map((session) => (
                  <SessionHistoryItem
                    key={session.id}
                    session={session}
                    onClick={() => navigate(`/summary/${session.id}`)}
                    onDelete={handleDeleteSession}
                  />
                ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {sessions.length === 0 && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <p className="text-lg">No sessions yet. Start your first one!</p>
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        title="Delete Session"
        message={`Delete session from ${deleteConfirm?.date}? This cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}
