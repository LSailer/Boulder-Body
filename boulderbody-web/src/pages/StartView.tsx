import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Session, VolumeSession, TrainingSession } from '../models/Session';
import { isVolumeSession } from '../models/Session';
import type { SessionType, TrainingMode } from '../models/SessionType';
import { TRAINING_PROTOCOL } from '../models/SessionType';
import type { TrainingRecommendation } from '../logic/TrainingRecommender';
import { getTrainingRecommendation, getMaxTestStartingWeights, getLastMaxTestResults } from '../logic/TrainingRecommender';
import {
  getAllSessions,
  getCurrentSession,
  getLastVolumeSession,
  getLastTrainingSession,
  getAllTrainingSessions,
  saveSession,
  deleteSession,
} from '../logic/StorageManager';
import { getRecommendation } from '../logic/SessionRecommender';
import { ThemeToggle } from '../components/ThemeToggle';
import { SessionHistoryItem } from '../components/SessionHistoryItem';
import { ConfirmDialog } from '../components/ConfirmDialog';

/**
 * Start View - Home screen with session form and history.
 * Supports volume sessions, normal training, and max test sessions.
 */
export function StartView() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionType, setSessionType] = useState<SessionType>('volume');

  // Volume session state
  const [level, setLevel] = useState(5);
  const [boulderCount, setBoulderCount] = useState(20);
  const [volumeReason, setVolumeReason] = useState('');

  // Training mode (normal vs maxtest)
  const [trainingMode, setTrainingMode] = useState<TrainingMode>('normal');

  // Training session state
  const [hangWeight, setHangWeight] = useState(0);
  const [pullupWeight, setPullupWeight] = useState(0);
  const [benchWeight, setBenchWeight] = useState(10);
  const [trainingReason, setTrainingReason] = useState('');
  const [trainingRec, setTrainingRec] = useState<TrainingRecommendation | null>(null);

  // Max test starting weights
  const [maxTestHang, setMaxTestHang] = useState(0);
  const [maxTestPullup, setMaxTestPullup] = useState(0);
  const [maxTestBench, setMaxTestBench] = useState(10);

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
    let daysSinceLastSession: number | null = null;
    if (lastTrainingSession) {
      daysSinceLastSession = Math.floor(
        (Date.now() - lastTrainingSession.date.getTime()) / (1000 * 60 * 60 * 24)
      );
    }
    const rec = getTrainingRecommendation(lastTrainingSession, daysSinceLastSession);
    setHangWeight(rec.hangWeight);
    setPullupWeight(rec.pullupWeight);
    setBenchWeight(rec.benchWeight);
    setTrainingReason(rec.reason);
    setTrainingRec(rec);

    // Auto-select training mode based on break detection
    if (rec.suggestMaxTest) {
      setTrainingMode('maxtest');
    } else {
      setTrainingMode('normal');
    }

    // Get max test starting weights
    const maxTestStart = getMaxTestStartingWeights(lastTrainingSession);
    setMaxTestHang(maxTestStart.hang);
    setMaxTestPullup(maxTestStart.pullup);
    setMaxTestBench(maxTestStart.bench);
  }, [navigate]);

  const handleStartSession = () => {
    if (sessionType === 'volume') {
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
      saveSession(volumeSession);
      navigate(`/session/${volumeSession.id}`);
      return;
    }

    if (trainingMode === 'maxtest') {
      // Get previous max for comparison in summary
      const allTraining = getAllTrainingSessions();
      const previousMax = getLastMaxTestResults(allTraining) ?? undefined;

      const trainingSession: TrainingSession = {
        id: crypto.randomUUID(),
        sessionType: 'training',
        date: new Date(),
        startTime: new Date(),
        isFinished: false,
        trainingData: {
          trainingMode: 'maxtest',
          hangWeight: maxTestHang,
          pullupWeight: maxTestPullup,
          benchWeight: maxTestBench,
          hangSets: [],   // Sets generated dynamically during session
          pullupSets: [],
          benchSets: [],
          maxTestData: {
            startingWeights: {
              hang: maxTestHang,
              pullup: maxTestPullup,
              bench: maxTestBench,
            },
            previousMax: previousMax ?? undefined,
          },
        },
      };
      saveSession(trainingSession);
      navigate(`/training/${trainingSession.id}`);
    } else {
      // Normal training session with warmup + 5 sets
      const trainingSession: TrainingSession = {
        id: crypto.randomUUID(),
        sessionType: 'training',
        date: new Date(),
        startTime: new Date(),
        isFinished: false,
        trainingData: {
          trainingMode: 'normal',
          hangWeight,
          pullupWeight,
          benchWeight,
          hangSets: Array.from({ length: TRAINING_PROTOCOL.training.sets }, (_, i) => ({
            id: crypto.randomUUID(),
            order: i + 1,
            exercise: 'hang' as const,
            completed: false,
          })),
          pullupSets: Array.from({ length: TRAINING_PROTOCOL.training.sets }, (_, i) => ({
            id: crypto.randomUUID(),
            order: i + 1,
            exercise: 'pullup' as const,
            completed: false,
          })),
          benchSets: Array.from({ length: TRAINING_PROTOCOL.training.sets }, (_, i) => ({
            id: crypto.randomUUID(),
            order: i + 1,
            exercise: 'bench' as const,
            completed: false,
          })),
        },
      };
      saveSession(trainingSession);
      navigate(`/training/${trainingSession.id}`);
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

    // Recalculate recommendations
    const lastVolumeSession = getLastVolumeSession();
    const volumeRec = getRecommendation(lastVolumeSession);
    setLevel(volumeRec.level);
    setBoulderCount(volumeRec.boulderCount);
    setVolumeReason(volumeRec.reason);

    const lastTrainingSession = getLastTrainingSession();
    let daysSinceLastSession: number | null = null;
    if (lastTrainingSession) {
      daysSinceLastSession = Math.floor(
        (Date.now() - lastTrainingSession.date.getTime()) / (1000 * 60 * 60 * 24)
      );
    }
    const rec = getTrainingRecommendation(lastTrainingSession, daysSinceLastSession);
    setHangWeight(rec.hangWeight);
    setPullupWeight(rec.pullupWeight);
    setBenchWeight(rec.benchWeight);
    setTrainingReason(rec.reason);
    setTrainingRec(rec);

    const maxTestStart = getMaxTestStartingWeights(lastTrainingSession);
    setMaxTestHang(maxTestStart.hang);
    setMaxTestPullup(maxTestStart.pullup);
    setMaxTestBench(maxTestStart.bench);
  };

  const showBreakBanner = sessionType === 'training' && trainingRec?.suggestMaxTest;

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

          {/* Training mode auto-selected, with switch link */}
          {sessionType === 'training' && (
            <div className="mb-4 text-center">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Mode: <span className="font-medium text-gray-900 dark:text-white">{trainingMode === 'maxtest' ? 'Max Test' : 'Training'}</span>
                {' · '}
                <button
                  onClick={() => setTrainingMode(trainingMode === 'maxtest' ? 'normal' : 'maxtest')}
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Switch to {trainingMode === 'maxtest' ? 'Training' : 'Max Test'}
                </button>
              </span>
            </div>
          )}

          {/* Recommendation / break banner */}
          {sessionType === 'volume' && volumeReason && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm text-blue-800 dark:text-blue-200">
              <span className="font-medium">Recommendation:</span> {volumeReason}
            </div>
          )}
          {sessionType === 'training' && trainingMode === 'normal' && trainingReason && !showBreakBanner && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm text-blue-800 dark:text-blue-200">
              <span className="font-medium">Recommendation:</span> {trainingReason}
            </div>
          )}
          {showBreakBanner && trainingMode === 'normal' && (
            <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-lg">
              <p className="text-sm text-amber-800 dark:text-amber-200 font-medium mb-1">
                Break Detected
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                {trainingReason}. Consider switching to Max Test mode.
              </p>
            </div>
          )}
          {sessionType === 'training' && trainingMode === 'maxtest' && (
            <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-800 dark:text-amber-200">
              Find your 1RM for each exercise, then train at max - {TRAINING_PROTOCOL.maxTest.trainingOffset}kg
            </div>
          )}

          {/* Volume Session Inputs */}
          {sessionType === 'volume' && (
            <>
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

          {/* Training Session Inputs (Normal Mode) */}
          {sessionType === 'training' && trainingMode === 'normal' && (
            <>
              <div className="mb-4">
                <label htmlFor="hangWeight" className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Hang Weight (kg) — {TRAINING_PROTOCOL.training.sets} sets of {TRAINING_PROTOCOL.hangDuration}s × {TRAINING_PROTOCOL.training.reps}
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
                <label htmlFor="pullupWeight" className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Pull-up Weight (kg) — {TRAINING_PROTOCOL.training.sets} sets of {TRAINING_PROTOCOL.training.reps} reps
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

              <div className="mb-6">
                <label htmlFor="benchWeight" className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Bench Press Weight (kg) — {TRAINING_PROTOCOL.training.sets} sets of {TRAINING_PROTOCOL.training.reps} reps
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
            </>
          )}

          {/* Max Test Starting Weights */}
          {sessionType === 'training' && trainingMode === 'maxtest' && (
            <>
              <div className="mb-4">
                <label htmlFor="maxTestHang" className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Hang Starting Weight (kg)
                </label>
                <input
                  id="maxTestHang"
                  type="number"
                  min="0"
                  step="2.5"
                  value={maxTestHang}
                  onChange={(e) => setMaxTestHang(parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="mb-4">
                <label htmlFor="maxTestPullup" className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Pull-up Starting Weight (kg)
                </label>
                <input
                  id="maxTestPullup"
                  type="number"
                  min="0"
                  step="2.5"
                  value={maxTestPullup}
                  onChange={(e) => setMaxTestPullup(parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="mb-6">
                <label htmlFor="maxTestBench" className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Bench Press Starting Weight (kg)
                </label>
                <input
                  id="maxTestBench"
                  type="number"
                  min="0"
                  step="2.5"
                  value={maxTestBench}
                  onChange={(e) => setMaxTestBench(parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          )}

          {/* Start button */}
          <button
            onClick={handleStartSession}
            className={`w-full py-3 px-4 rounded-lg font-medium text-lg text-white transition-colors ${
              sessionType === 'training' && trainingMode === 'maxtest'
                ? 'bg-amber-500 hover:bg-amber-600'
                : 'btn btn-primary'
            }`}
          >
            {sessionType === 'volume'
              ? 'Start Volume Session'
              : trainingMode === 'maxtest'
                ? 'Start Max Test'
                : 'Start Training Session'}
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
