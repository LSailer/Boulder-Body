/**
 * TrainingSessionView.tsx
 *
 * Training session tracker for max hangs and max pull-ups.
 * Shows sets for both exercises with completion tracking.
 *
 * Hang set flow:
 *   First set:  click → 5s prep → 7s hang (skippable) → 3 min rest (pauseable, skippable)
 *   Subsequent: rest ends/skipped → 7s hang auto-starts → 3 min rest (pauseable, skippable)
 *
 * Pull-up set flow:
 *   click → marks complete → 3 min rest (skippable)
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { TrainingSession, TrainingSet } from '../models/Session';
import { isTrainingSession } from '../models/Session';
import { TRAINING_PROTOCOL } from '../models/SessionType';
import { getAllSessions, updateSession, deleteSession } from '../logic/StorageManager';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { RestTimer } from '../components/RestTimer';

export function TrainingSessionView() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<TrainingSession | null>(null);

  // Timer visibility
  const [showPrepTimer, setShowPrepTimer] = useState(false); // 5s get-ready (first hang only)
  const [showHangTimer, setShowHangTimer] = useState(false); // 7s hang countdown
  const [showRestTimer, setShowRestTimer] = useState(false); // 3 min rest

  // Rest timer pause state
  const [restTimerPaused, setRestTimerPaused] = useState(false);
  const [pendingHangSetId, setPendingHangSetId] = useState<string | null>(null);
  const [isFirstHangSet, setIsFirstHangSet] = useState(true); // prep shown only on first

  // Track which exercise triggered the rest timer (for auto-starting next hang)
  const [lastExercise, setLastExercise] = useState<'hang' | 'pullup' | 'bench' | 'trapbar' | null>(null);

  // Dialog visibility
  const [showBreakConfirm, setShowBreakConfirm] = useState(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);

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

    if (!isTrainingSession(found)) {
      navigate('/');
      return;
    }

    if (found.isFinished) {
      navigate(`/summary/${sessionId}`);
      return;
    }

    setSession(found);
  }, [sessionId, navigate]);

  if (!session) {
    return null; // Loading state
  }

  // ─── Set toggle ────────────────────────────────────────────────────────────

  const handleSetToggle = (set: TrainingSet) => {
    if (set.exercise === 'hang' && !set.completed) {
      // Starting a hang — initiate timer flow, don't mark complete yet
      setPendingHangSetId(set.id);
      if (isFirstHangSet) {
        setShowPrepTimer(true);
      } else {
        setShowHangTimer(true);
      }
      return;
    }

    const { trainingData } = session;

    if (set.exercise === 'hang') {
      // Un-complete hang
      const updatedHangSets = trainingData.hangSets.map((s) =>
        s.id === set.id ? { ...s, completed: false, timestamp: undefined } : s
      );
      const updatedSession: TrainingSession = {
        ...session,
        trainingData: { ...trainingData, hangSets: updatedHangSets },
      };
      updateSession(updatedSession);
      setSession(updatedSession);
    } else if (set.exercise === 'pullup') {
      const updatedPullupSets = trainingData.pullupSets.map((s) =>
        s.id === set.id
          ? { ...s, completed: !s.completed, timestamp: !s.completed ? new Date() : undefined }
          : s
      );
      const updatedSession: TrainingSession = {
        ...session,
        trainingData: { ...trainingData, pullupSets: updatedPullupSets },
      };
      updateSession(updatedSession);
      setSession(updatedSession);
      if (!set.completed) {
        setLastExercise('pullup');
        setShowRestTimer(true);
      }
    } else if (set.exercise === 'bench') {
      const updatedBenchSets = (trainingData.benchSets ?? []).map((s) =>
        s.id === set.id
          ? { ...s, completed: !s.completed, timestamp: !s.completed ? new Date() : undefined }
          : s
      );
      const updatedSession: TrainingSession = {
        ...session,
        trainingData: { ...trainingData, benchSets: updatedBenchSets },
      };
      updateSession(updatedSession);
      setSession(updatedSession);
      if (!set.completed) {
        setLastExercise('bench');
        setShowRestTimer(true);
      }
    } else if (set.exercise === 'trapbar') {
      const updatedTrapBarSets = (trainingData.trapBarSets ?? []).map((s) =>
        s.id === set.id
          ? { ...s, completed: !s.completed, timestamp: !s.completed ? new Date() : undefined }
          : s
      );
      const updatedSession: TrainingSession = {
        ...session,
        trainingData: { ...trainingData, trapBarSets: updatedTrapBarSets },
      };
      updateSession(updatedSession);
      setSession(updatedSession);
      if (!set.completed) {
        setLastExercise('trapbar');
        setShowRestTimer(true);
      }
    }
  };

  // ─── Hang timer handlers ────────────────────────────────────────────────────

  const handlePrepComplete = () => {
    setShowPrepTimer(false);
    setShowHangTimer(true);
  };

  const handleHangComplete = () => {
    if (!pendingHangSetId) return;

    const updatedHangSets = session.trainingData.hangSets.map((s) =>
      s.id === pendingHangSetId ? { ...s, completed: true, timestamp: new Date() } : s
    );
    const updatedSession: TrainingSession = {
      ...session,
      trainingData: { ...session.trainingData, hangSets: updatedHangSets },
    };

    updateSession(updatedSession);
    setSession(updatedSession);

    setIsFirstHangSet(false);
    setLastExercise('hang');
    setShowHangTimer(false);
    setShowRestTimer(true);
  };

  const handleHangSkip = () => {
    handleHangComplete(); // skip still marks complete
  };

  // ─── Rest timer handlers ────────────────────────────────────────────────────

  const handleRestComplete = () => {
    setShowRestTimer(false);
    setRestTimerPaused(false);

    if (lastExercise === 'hang') {
      // Auto-start next uncompleted hang set (no prep)
      const nextHangSet = session.trainingData.hangSets.find((s) => !s.completed);
      if (nextHangSet) {
        setPendingHangSetId(nextHangSet.id);
        setShowHangTimer(true);
      }
    }
  };

  // ─── Session completion ─────────────────────────────────────────────────────

  const handleFinishSession = () => {
    if (totalCompleted < totalSets) {
      setShowFinishConfirm(true);
    } else {
      completeSession();
    }
  };

  const completeSession = () => {
    const finishedSession: TrainingSession = {
      ...session,
      isFinished: true,
      endTime: new Date(),
    };

    updateSession(finishedSession);
    navigate(`/summary/${session.id}`);
  };

  const handleBreakSession = () => {
    deleteSession(session.id);
    navigate('/');
  };

  // ─── Derived values ─────────────────────────────────────────────────────────

  const totalCompleted =
    session.trainingData.hangSets.filter((s) => s.completed).length +
    session.trainingData.pullupSets.filter((s) => s.completed).length +
    (session.trainingData.benchSets ?? []).filter((s) => s.completed).length +
    (session.trainingData.trapBarSets ?? []).filter((s) => s.completed).length;

  const totalSets =
    session.trainingData.hangSets.length +
    session.trainingData.pullupSets.length +
    (session.trainingData.benchSets ?? []).length +
    (session.trainingData.trapBarSets ?? []).length;

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <button
              onClick={() => navigate('/')}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              ← Back
            </button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Training Session
            </h1>
            <button
              onClick={() => setShowBreakConfirm(true)}
              className="text-red-500 hover:text-red-400 font-medium"
            >
              Break Session
            </button>
          </div>

          {/* Weight info */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-gray-600 dark:text-gray-400 text-center">
            <span>Hangs: {session.trainingData.hangWeight}kg</span>
            <span>Pull-ups: {session.trainingData.pullupWeight}kg</span>
            <span>Bench: {session.trainingData.benchWeight ?? 10}kg</span>
            <span>Trap Bar: {session.trainingData.trapBarWeight ?? 20}kg</span>
          </div>
        </div>

        {/* Progress indicator */}
        <div className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-700 dark:text-gray-300 font-medium">
              Overall Progress
            </span>
            <span className="text-gray-900 dark:text-white font-bold">
              {totalCompleted}/{totalSets} sets
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${totalSets > 0 ? (totalCompleted / totalSets) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Max Hangs Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg mb-4">
          <h2 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">
            Max Hangs ({TRAINING_PROTOCOL.hangDuration}s × {TRAINING_PROTOCOL.hangReps} reps)
          </h2>
          <div className="grid grid-cols-5 gap-3">
            {session.trainingData.hangSets.map((set) => (
              <button
                key={set.id}
                onClick={() => handleSetToggle(set)}
                className={`aspect-square rounded-lg font-bold text-lg transition-all ${
                  set.completed
                    ? 'bg-blue-600 text-white shadow-lg scale-105'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {set.order}
              </button>
            ))}
          </div>
        </div>

        {/* Max Pull-ups Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg mb-4">
          <h2 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">
            Max Pull-ups ({TRAINING_PROTOCOL.pullupReps} reps)
          </h2>
          <div className="grid grid-cols-5 gap-3">
            {session.trainingData.pullupSets.map((set) => (
              <button
                key={set.id}
                onClick={() => handleSetToggle(set)}
                className={`aspect-square rounded-lg font-bold text-lg transition-all ${
                  set.completed
                    ? 'bg-purple-600 text-white shadow-lg scale-105'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {set.order}
              </button>
            ))}
          </div>
        </div>

        {/* Bench Press Section */}
        {(session.trainingData.benchSets ?? []).length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg mb-4">
            <h2 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">
              Bench Press ({TRAINING_PROTOCOL.benchReps} reps)
            </h2>
            <div className="grid grid-cols-5 gap-3">
              {(session.trainingData.benchSets ?? []).map((set) => (
                <button
                  key={set.id}
                  onClick={() => handleSetToggle(set)}
                  className={`aspect-square rounded-lg font-bold text-lg transition-all ${
                    set.completed
                      ? 'bg-green-600 text-white shadow-lg scale-105'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {set.order}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Trap Bar Deadlift Section */}
        {(session.trainingData.trapBarSets ?? []).length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg mb-6">
            <h2 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">
              Trap Bar Deadlift ({TRAINING_PROTOCOL.trapBarReps} reps)
            </h2>
            <div className="grid grid-cols-5 gap-3">
              {(session.trainingData.trapBarSets ?? []).map((set) => (
                <button
                  key={set.id}
                  onClick={() => handleSetToggle(set)}
                  className={`aspect-square rounded-lg font-bold text-lg transition-all ${
                    set.completed
                      ? 'bg-orange-500 text-white shadow-lg scale-105'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {set.order}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Finish button */}
        <button onClick={handleFinishSession} className="w-full btn btn-success text-lg py-3">
          Finish Session
        </button>
      </div>

      {/* 5s prep timer — first hang set only */}
      <RestTimer
        isOpen={showPrepTimer}
        duration={5}
        onComplete={handlePrepComplete}
        title="Get Ready"
      />

      {/* 7s hang timer — skippable only */}
      <RestTimer
        isOpen={showHangTimer}
        duration={TRAINING_PROTOCOL.hangDuration}
        onComplete={handleHangComplete}
        onSkip={handleHangSkip}
        title="Hang!"
      />

      {/* 3 min rest timer — pauseable and skippable */}
      <RestTimer
        isOpen={showRestTimer}
        duration={TRAINING_PROTOCOL.restBetweenSets}
        onComplete={handleRestComplete}
        onSkip={() => {
          setShowRestTimer(false);
          setRestTimerPaused(false);
          handleRestComplete();
        }}
        onPause={() => setRestTimerPaused((p) => !p)}
        isPaused={restTimerPaused}
        title="Rest"
      />

      {/* Break session confirmation */}
      <ConfirmDialog
        isOpen={showBreakConfirm}
        title="Break Session?"
        message="Are you sure you want to end this session? It will be deleted and won't appear in your history."
        confirmText="End Session"
        cancelText="Continue"
        variant="danger"
        onConfirm={handleBreakSession}
        onCancel={() => setShowBreakConfirm(false)}
      />

      {/* Early finish confirmation */}
      <ConfirmDialog
        isOpen={showFinishConfirm}
        title="Incomplete Sets"
        message={`You have ${totalSets - totalCompleted} incomplete sets. Finishing early will affect your next session's weight recommendation. Continue anyway?`}
        confirmText="Finish Anyway"
        cancelText="Keep Training"
        onConfirm={completeSession}
        onCancel={() => setShowFinishConfirm(false)}
      />
    </div>
  );
}
