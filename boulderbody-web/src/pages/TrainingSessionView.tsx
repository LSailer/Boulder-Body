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
  const [lastExercise, setLastExercise] = useState<'hang' | 'pullup' | null>(null);

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

    // Hang un-completion OR pull-up toggle
    const { trainingData } = session;
    let updatedHangSets = trainingData.hangSets;
    let updatedPullupSets = trainingData.pullupSets;

    if (set.exercise === 'hang') {
      updatedHangSets = trainingData.hangSets.map((s) =>
        s.id === set.id ? { ...s, completed: false, timestamp: undefined } : s
      );
    } else {
      updatedPullupSets = trainingData.pullupSets.map((s) =>
        s.id === set.id
          ? { ...s, completed: !s.completed, timestamp: !s.completed ? new Date() : undefined }
          : s
      );
    }

    const updatedSession: TrainingSession = {
      ...session,
      trainingData: { ...trainingData, hangSets: updatedHangSets, pullupSets: updatedPullupSets },
    };

    updateSession(updatedSession);
    setSession(updatedSession);

    if (set.exercise === 'pullup' && !set.completed) {
      setLastExercise('pullup');
      setShowRestTimer(true);
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
    const { trainingData } = session;
    const allComplete =
      trainingData.hangSets.every((s) => s.completed) &&
      trainingData.pullupSets.every((s) => s.completed);

    if (!allComplete) {
      setShowFinishConfirm(true);
    } else {
      completeSession();
    }
  };

  const completeSession = () => {
    const { trainingData } = session;
    const allComplete =
      trainingData.hangSets.every((s) => s.completed) &&
      trainingData.pullupSets.every((s) => s.completed);

    const finishedSession: TrainingSession = {
      ...session,
      isFinished: true,
      endTime: new Date(),
      trainingData: { ...trainingData, allSetsCompleted: allComplete },
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
    session.trainingData.pullupSets.filter((s) => s.completed).length;

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
          <div className="flex justify-center gap-4 text-sm text-gray-600 dark:text-gray-400">
            <span>Hangs: {session.trainingData.hangWeight}kg</span>
            <span>|</span>
            <span>Pull-ups: {session.trainingData.pullupWeight}kg</span>
          </div>
        </div>

        {/* Progress indicator */}
        <div className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-700 dark:text-gray-300 font-medium">
              Overall Progress
            </span>
            <span className="text-gray-900 dark:text-white font-bold">
              {totalCompleted}/10 sets
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${(totalCompleted / 10) * 100}%` }}
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
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg mb-6">
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
        message={`You have ${10 - totalCompleted} incomplete sets. Finishing early will affect your next session's weight recommendation. Continue anyway?`}
        confirmText="Finish Anyway"
        cancelText="Keep Training"
        onConfirm={completeSession}
        onCancel={() => setShowFinishConfirm(false)}
      />
    </div>
  );
}
