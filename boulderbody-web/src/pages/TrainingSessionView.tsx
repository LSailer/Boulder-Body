/**
 * TrainingSessionView.tsx
 *
 * Training session tracker for max hangs and max pull-ups.
 * Shows sets for both exercises with completion tracking.
 * Enforces mandatory 4-minute rest timer between sets.
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
  const [showRestTimer, setShowRestTimer] = useState(false);
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

    // This view only handles training sessions
    if (!isTrainingSession(found)) {
      navigate('/');
      return;
    }

    // If already finished, go to summary
    if (found.isFinished) {
      navigate(`/summary/${sessionId}`);
      return;
    }

    setSession(found);
  }, [sessionId, navigate]);

  if (!session) {
    return null; // Loading state
  }

  const handleSetToggle = (set: TrainingSet) => {
    const { trainingData } = session;

    // Update the specific set
    let updatedHangSets = trainingData.hangSets;
    let updatedPullupSets = trainingData.pullupSets;

    if (set.exercise === 'hang') {
      updatedHangSets = trainingData.hangSets.map((s) =>
        s.id === set.id
          ? { ...s, completed: !s.completed, timestamp: !s.completed ? new Date() : undefined }
          : s
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
      trainingData: {
        ...trainingData,
        hangSets: updatedHangSets,
        pullupSets: updatedPullupSets,
      },
    };

    updateSession(updatedSession);
    setSession(updatedSession);

    // If completing a set (not uncompleting), show rest timer
    if (!set.completed) {
      setShowRestTimer(true);
    }
  };

  const handleFinishSession = () => {
    const { trainingData } = session;
    const allComplete =
      trainingData.hangSets.every((s) => s.completed) &&
      trainingData.pullupSets.every((s) => s.completed);

    // If not all complete, show confirmation
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
      trainingData: {
        ...trainingData,
        allSetsCompleted: allComplete,
      },
    };

    updateSession(finishedSession);
    navigate(`/summary/${session.id}`);
  };

  const handleBreakSession = () => {
    deleteSession(session.id);
    navigate('/');
  };

  const handleRestComplete = () => {
    setShowRestTimer(false);
  };

  const totalCompleted =
    session.trainingData.hangSets.filter((s) => s.completed).length +
    session.trainingData.pullupSets.filter((s) => s.completed).length;

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
        <button
          onClick={handleFinishSession}
          className="w-full btn btn-success text-lg py-3"
        >
          Finish Session
        </button>
      </div>

      {/* Rest Timer */}
      <RestTimer
        isOpen={showRestTimer}
        duration={TRAINING_PROTOCOL.restBetweenSets}
        onComplete={handleRestComplete}
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
