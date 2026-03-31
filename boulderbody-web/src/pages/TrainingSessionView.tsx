/**
 * TrainingSessionView.tsx
 *
 * Training session tracker supporting two modes:
 *
 * NORMAL MODE: Per exercise: warm-up → 5 sets of 3 reps at fixed weight
 * MAX TEST MODE: Per exercise: warm-up → find 1RM (+2.5kg until fail) → 3-4 training sets at max-7.5kg
 *
 * Exercise order: Hang → Pull-up → Bench Press
 * Rest timer is non-blocking (bottom bar).
 * In max test: "Go higher?" prompt appears immediately after set, then rest starts.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { TrainingSession } from '../models/Session';
import { isTrainingSession } from '../models/Session';
import type { TrainingSet, ExerciseKey } from '../models/SessionType';
import { TRAINING_PROTOCOL } from '../models/SessionType';
import { getAllSessions, updateSession, deleteSession } from '../logic/StorageManager';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { RestTimer } from '../components/RestTimer';

const EXERCISES: ExerciseKey[] = ['hang', 'pullup', 'bench'];

const EXERCISE_CONFIG: Record<ExerciseKey, {
  label: string;
  color: string;
  bgLight: string;
  bgDark: string;
}> = {
  hang: { label: 'Max Hangs', color: 'bg-blue-600', bgLight: 'bg-blue-50', bgDark: 'dark:bg-blue-900/20' },
  pullup: { label: 'Max Pull-ups', color: 'bg-purple-600', bgLight: 'bg-purple-50', bgDark: 'dark:bg-purple-900/20' },
  bench: { label: 'Bench Press', color: 'bg-green-600', bgLight: 'bg-green-50', bgDark: 'dark:bg-green-900/20' },
};

function getSetsKey(exercise: ExerciseKey): 'hangSets' | 'pullupSets' | 'benchSets' {
  switch (exercise) {
    case 'hang': return 'hangSets';
    case 'pullup': return 'pullupSets';
    case 'bench': return 'benchSets';
  }
}

type WarmupPhase = 'not_started' | 'set1_done' | 'resting_between' | 'set2_done' | 'resting_after' | 'complete';

export function TrainingSessionView() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<TrainingSession | null>(null);

  // Current active exercise index (0=hang, 1=pullup, 2=bench)
  const [activeExerciseIdx, setActiveExerciseIdx] = useState(0);

  // Warm-up phase per exercise
  const [warmupPhases, setWarmupPhases] = useState<Record<ExerciseKey, WarmupPhase>>({
    hang: 'not_started',
    pullup: 'not_started',
    bench: 'not_started',
  });

  // Timer state
  const [timerOpen, setTimerOpen] = useState(false);
  const [timerDuration, setTimerDuration] = useState(180);
  const [timerTitle, setTimerTitle] = useState('Rest');
  const [timerPaused, setTimerPaused] = useState(false);

  // Hang timer (7s hold)
  const [showHangTimer, setShowHangTimer] = useState(false);
  const [pendingHangSetId, setPendingHangSetId] = useState<string | null>(null);

  // Prep timer (5s before first hang)
  const [showPrepTimer, setShowPrepTimer] = useState(false);
  const [isFirstHangOfSession, setIsFirstHangOfSession] = useState(true);

  // Max test "Go higher?" prompt
  const [goHigherPrompt, setGoHigherPrompt] = useState<{
    exercise: ExerciseKey;
    weight: number;
  } | null>(null);

  // Dialogs
  const [showBreakConfirm, setShowBreakConfirm] = useState(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);

  // Can add extra training set (4th set in max test)
  const [extraSetAdded, setExtraSetAdded] = useState<Record<ExerciseKey, boolean>>({
    hang: false,
    pullup: false,
    bench: false,
  });

  const isMaxTest = session?.trainingData.trainingMode === 'maxtest';

  // ─── Load session ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!sessionId) { navigate('/'); return; }

    const allSessions = getAllSessions();
    const found = allSessions.find((s) => s.id === sessionId);

    if (!found || !isTrainingSession(found)) { navigate('/'); return; }
    if (found.isFinished) { navigate(`/summary/${sessionId}`); return; }

    setSession(found);
  }, [sessionId, navigate]);

  // ─── Helpers ───────────────────────────────────────────────────────────────

  const activeExercise = EXERCISES[activeExerciseIdx];

  const getExerciseSets = useCallback((exercise: ExerciseKey): TrainingSet[] => {
    if (!session) return [];
    return session.trainingData[getSetsKey(exercise)] ?? [];
  }, [session]);

  const updateSessionState = useCallback((updatedSession: TrainingSession) => {
    updateSession(updatedSession);
    setSession(updatedSession);
  }, []);

  const isMaxFound = useCallback((exercise: ExerciseKey): boolean => {
    if (!isMaxTest || !session) return false;
    return session.trainingData.maxTestData?.discoveredMax?.[exercise] != null;
  }, [isMaxTest, session]);

  // Start a timer with given params
  const startTimer = useCallback((duration: number, title: string) => {
    setTimerDuration(duration);
    setTimerTitle(title);
    setTimerPaused(false);
    setTimerOpen(true);
  }, []);

  // ─── Warm-up handlers ─────────────────────────────────────────────────────

  const handleWarmupSet = (exercise: ExerciseKey, setNum: 1 | 2) => {
    if (!session) return;
    const phase = warmupPhases[exercise];

    if (setNum === 1 && phase === 'not_started') {
      if (exercise === 'hang') {
        // For hangs, show prep timer then hang timer
        setShowPrepTimer(true);
        setPendingHangSetId(`warmup1_${exercise}`);
        return;
      }
      // Non-hang: just mark done and start short rest
      setWarmupPhases(prev => ({ ...prev, [exercise]: 'set1_done' }));
      startTimer(TRAINING_PROTOCOL.warmup[exercise].restBetween, 'Warm-up Rest');
    } else if (setNum === 2 && phase === 'set1_done') {
      if (exercise === 'hang') {
        setPendingHangSetId(`warmup2_${exercise}`);
        setShowHangTimer(true);
        return;
      }
      setWarmupPhases(prev => ({ ...prev, [exercise]: 'set2_done' }));
      startTimer(TRAINING_PROTOCOL.warmup[exercise].restAfter, 'Rest');
    }
  };

  const handleWarmupHangComplete = () => {
    if (!pendingHangSetId) return;
    const exercise = pendingHangSetId.split('_')[1] as ExerciseKey;

    if (pendingHangSetId.startsWith('warmup1')) {
      setWarmupPhases(prev => ({ ...prev, [exercise]: 'set1_done' }));
      startTimer(TRAINING_PROTOCOL.warmup.hang.restBetween, 'Warm-up Rest');
    } else if (pendingHangSetId.startsWith('warmup2')) {
      setWarmupPhases(prev => ({ ...prev, [exercise]: 'set2_done' }));
      startTimer(TRAINING_PROTOCOL.warmup.hang.restAfter, 'Rest');
    }

    setShowHangTimer(false);
    setShowPrepTimer(false);
    setPendingHangSetId(null);
    setIsFirstHangOfSession(false);
  };

  // ─── Timer completion handler ─────────────────────────────────────────────

  const handleTimerComplete = () => {
    setTimerOpen(false);
    setTimerPaused(false);

    const exercise = activeExercise;
    const phase = warmupPhases[exercise];

    // Warm-up phase transitions
    if (phase === 'set1_done') {
      setWarmupPhases(prev => ({ ...prev, [exercise]: 'resting_between' }));
      // Timer just finished — now ready for set 2
      // Actually resting_between means we finished the 30s rest, ready for set2
      // Let me fix: after set1_done + timer complete → ready for set 2
      setWarmupPhases(prev => ({ ...prev, [exercise]: 'set1_done' }));
      // The 30s rest just finished, so let's not auto-advance. User taps set 2.
      return;
    }

    if (phase === 'set2_done') {
      // The long rest after warm-up is done → warm-up complete, ready for main sets
      setWarmupPhases(prev => ({ ...prev, [exercise]: 'complete' }));

      // For max test mode: generate the first max test set
      if (isMaxTest && session && !isMaxFound(exercise)) {
        const startWeight = session.trainingData.maxTestData!.startingWeights[exercise];
        const setsKey = getSetsKey(exercise);
        const newSet: TrainingSet = {
          id: crypto.randomUUID(),
          order: 1,
          exercise,
          completed: false,
          setType: 'maxtest',
          weight: startWeight,
        };
        const updated: TrainingSession = {
          ...session,
          trainingData: {
            ...session.trainingData,
            [setsKey]: [newSet],
          },
        };
        updateSessionState(updated);
      }
      return;
    }

    // If timer completes during training/max-test sets, just dismiss
    // (auto-start next hang if applicable)
    if (exercise === 'hang' && warmupPhases.hang === 'complete') {
      const nextHangSet = getExerciseSets('hang').find(s => !s.completed);
      if (nextHangSet && !goHigherPrompt) {
        setPendingHangSetId(nextHangSet.id);
        setShowHangTimer(true);
      }
    }
  };

  const handleTimerSkip = () => {
    setTimerOpen(false);
    setTimerPaused(false);
    handleTimerComplete();
  };

  // ─── Prep timer handlers ──────────────────────────────────────────────────

  const handlePrepComplete = () => {
    setShowPrepTimer(false);
    setShowHangTimer(true);
  };

  // ─── Hang timer complete (for main sets) ──────────────────────────────────

  const handleHangSetComplete = () => {
    if (!pendingHangSetId || !session) return;

    // Check if this is a warmup hang
    if (pendingHangSetId.startsWith('warmup')) {
      handleWarmupHangComplete();
      return;
    }

    const sets = [...session.trainingData.hangSets];
    const setIdx = sets.findIndex(s => s.id === pendingHangSetId);
    if (setIdx === -1) return;

    const completedSet = sets[setIdx];
    sets[setIdx] = { ...completedSet, completed: true, timestamp: new Date() };

    const updated: TrainingSession = {
      ...session,
      trainingData: { ...session.trainingData, hangSets: sets },
    };
    updateSessionState(updated);

    setShowHangTimer(false);
    setPendingHangSetId(null);
    setIsFirstHangOfSession(false);

    // Max test: show "Go higher?" immediately, then rest starts after answer
    if (isMaxTest && completedSet.setType === 'maxtest') {
      setGoHigherPrompt({ exercise: 'hang', weight: completedSet.weight! });
      return;
    }

    // Normal set: start rest timer
    startTimer(TRAINING_PROTOCOL.training.restBetweenSets, 'Rest');
  };

  // ─── Non-hang set toggle ──────────────────────────────────────────────────

  const handleSetToggle = (set: TrainingSet) => {
    if (!session) return;

    if (set.exercise === 'hang' && !set.completed) {
      // Start hang timer flow
      setPendingHangSetId(set.id);
      if (isFirstHangOfSession) {
        setShowPrepTimer(true);
      } else {
        setShowHangTimer(true);
      }
      return;
    }

    if (set.exercise === 'hang' && set.completed) {
      // Un-complete hang
      const setsKey = getSetsKey(set.exercise);
      const sets = (session.trainingData[setsKey] as TrainingSet[]).map(s =>
        s.id === set.id ? { ...s, completed: false, timestamp: undefined } : s
      );
      updateSessionState({
        ...session,
        trainingData: { ...session.trainingData, [setsKey]: sets },
      });
      return;
    }

    // Non-hang exercise toggle
    const setsKey = getSetsKey(set.exercise);
    const sets = (session.trainingData[setsKey] as TrainingSet[]).map(s =>
      s.id === set.id
        ? { ...s, completed: !s.completed, timestamp: !s.completed ? new Date() : undefined }
        : s
    );
    const updated: TrainingSession = {
      ...session,
      trainingData: { ...session.trainingData, [setsKey]: sets },
    };
    updateSessionState(updated);

    if (!set.completed) {
      // Just completed this set
      if (isMaxTest && set.setType === 'maxtest') {
        // Show "Go higher?" immediately
        setGoHigherPrompt({ exercise: set.exercise, weight: set.weight! });
        return;
      }
      // Normal training set: start rest
      startTimer(TRAINING_PROTOCOL.training.restBetweenSets, 'Rest');
    }
  };

  // ─── Max test: "Go higher?" handlers ──────────────────────────────────────

  const handleGoHigherYes = () => {
    if (!goHigherPrompt || !session) return;
    const { exercise, weight } = goHigherPrompt;
    const setsKey = getSetsKey(exercise);
    const sets = [...(session.trainingData[setsKey] as TrainingSet[])];
    const nextWeight = weight + TRAINING_PROTOCOL.maxTest.weightIncrement;

    sets.push({
      id: crypto.randomUUID(),
      order: sets.length + 1,
      exercise,
      completed: false,
      setType: 'maxtest',
      weight: nextWeight,
    });

    updateSessionState({
      ...session,
      trainingData: { ...session.trainingData, [setsKey]: sets },
    });
    setGoHigherPrompt(null);

    // Start rest timer after answering
    startTimer(TRAINING_PROTOCOL.maxTest.restBetweenSets, 'Rest');
  };

  const handleGoHigherNo = () => {
    if (!goHigherPrompt || !session) return;
    const { exercise, weight } = goHigherPrompt;

    // Discovered max = last successful weight (current weight failed if user says "no")
    // But actually: the set was completed (they did it), they're saying they can't go higher
    // So the max IS the current weight
    // Wait — re-reading the spec: user completes set, then asked "go higher?"
    // "No" means this weight is their max (they completed it but won't try more)
    const discoveredMax = weight;

    // Calculate training weight
    const trainingWeight = Math.max(0, discoveredMax - TRAINING_PROTOCOL.maxTest.trainingOffset);

    const setsKey = getSetsKey(exercise);
    const sets = [...(session.trainingData[setsKey] as TrainingSet[])];

    // Add training sets
    for (let i = 0; i < TRAINING_PROTOCOL.maxTest.trainingSets; i++) {
      sets.push({
        id: crypto.randomUUID(),
        order: sets.length + 1,
        exercise,
        completed: false,
        setType: 'training',
        weight: trainingWeight,
      });
    }

    const updatedMaxTestData = {
      ...session.trainingData.maxTestData!,
      discoveredMax: {
        ...session.trainingData.maxTestData!.discoveredMax,
        [exercise]: discoveredMax,
      },
    };

    updateSessionState({
      ...session,
      trainingData: {
        ...session.trainingData,
        [setsKey]: sets,
        maxTestData: updatedMaxTestData,
      },
    });
    setGoHigherPrompt(null);

    // Start rest timer
    startTimer(TRAINING_PROTOCOL.maxTest.restBetweenSets, 'Rest');
  };

  // ─── Add extra training set (4th) ─────────────────────────────────────────

  const handleAddExtraSet = (exercise: ExerciseKey) => {
    if (!session || extraSetAdded[exercise]) return;
    const setsKey = getSetsKey(exercise);
    const sets = [...(session.trainingData[setsKey] as TrainingSet[])];
    const trainingWeight = sets.find(s => s.setType === 'training')?.weight ?? 0;

    sets.push({
      id: crypto.randomUUID(),
      order: sets.length + 1,
      exercise,
      completed: false,
      setType: 'training',
      weight: trainingWeight,
    });

    updateSessionState({
      ...session,
      trainingData: { ...session.trainingData, [setsKey]: sets },
    });
    setExtraSetAdded(prev => ({ ...prev, [exercise]: true }));
  };

  // ─── Move to next exercise ─────────────────────────────────────────────────

  const handleNextExercise = () => {
    if (activeExerciseIdx < EXERCISES.length - 1) {
      setActiveExerciseIdx(prev => prev + 1);
      startTimer(TRAINING_PROTOCOL.restBetweenExercises, 'Rest Between Exercises');
    }
  };

  // ─── Session completion ───────────────────────────────────────────────────

  const getAllSetsFlat = (): TrainingSet[] => {
    if (!session) return [];
    return [
      ...session.trainingData.hangSets,
      ...session.trainingData.pullupSets,
      ...session.trainingData.benchSets,
    ].filter(s => s.setType !== 'warmup');
  };

  const totalSets = getAllSetsFlat().length;
  const totalCompleted = getAllSetsFlat().filter(s => s.completed).length;

  const handleFinishSession = () => {
    if (totalCompleted < totalSets) {
      setShowFinishConfirm(true);
    } else {
      completeSession();
    }
  };

  const completeSession = () => {
    if (!session) return;
    const finishedSession: TrainingSession = {
      ...session,
      isFinished: true,
      endTime: new Date(),
    };
    updateSession(finishedSession);
    navigate(`/summary/${session.id}`);
  };

  const handleBreakSession = () => {
    if (!session) return;
    deleteSession(session.id);
    navigate('/');
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (!session) return null;

  const exerciseSetsComplete = (exercise: ExerciseKey): boolean => {
    const sets = getExerciseSets(exercise).filter(s => s.setType !== 'warmup');
    return sets.length > 0 && sets.every(s => s.completed);
  };

  const canMoveToNext = (): boolean => {
    const exercise = activeExercise;
    if (warmupPhases[exercise] !== 'complete') return false;
    if (isMaxTest && !isMaxFound(exercise)) return false;
    return exerciseSetsComplete(exercise);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 pb-24">
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
              {isMaxTest ? 'Max Test' : 'Training Session'}
            </h1>
            <button
              onClick={() => setShowBreakConfirm(true)}
              className="text-red-500 hover:text-red-400 font-medium"
            >
              Break
            </button>
          </div>

          {/* Weight info for normal mode */}
          {!isMaxTest && (
            <div className="grid grid-cols-3 gap-x-4 text-sm text-gray-600 dark:text-gray-400 text-center">
              <span>Hangs: {session.trainingData.hangWeight}kg</span>
              <span>Pull-ups: {session.trainingData.pullupWeight}kg</span>
              <span>Bench: {session.trainingData.benchWeight}kg</span>
            </div>
          )}
        </div>

        {/* Progress indicator */}
        {totalSets > 0 && (
          <div className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-700 dark:text-gray-300 font-medium">Progress</span>
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
        )}

        {/* Exercise tabs */}
        <div className="flex gap-2 mb-6">
          {EXERCISES.map((ex, idx) => {
            const config = EXERCISE_CONFIG[ex];
            const isActive = idx === activeExerciseIdx;
            const isDone = warmupPhases[ex] === 'complete' && exerciseSetsComplete(ex);
            return (
              <button
                key={ex}
                onClick={() => idx <= activeExerciseIdx && setActiveExerciseIdx(idx)}
                disabled={idx > activeExerciseIdx}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? `${config.color} text-white`
                    : isDone
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                      : idx > activeExerciseIdx
                        ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                {config.label}
                {isDone && ' ✓'}
              </button>
            );
          })}
        </div>

        {/* Active Exercise Section */}
        {renderExerciseSection(activeExercise)}

        {/* Next exercise / Finish button */}
        <div className="mt-6 space-y-3">
          {canMoveToNext() && activeExerciseIdx < EXERCISES.length - 1 && (
            <button
              onClick={handleNextExercise}
              className="w-full py-3 px-4 rounded-lg font-medium text-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
            >
              Next: {EXERCISE_CONFIG[EXERCISES[activeExerciseIdx + 1]].label}
            </button>
          )}
          <button
            onClick={handleFinishSession}
            className="w-full btn btn-success text-lg py-3"
          >
            Finish Session
          </button>
        </div>
      </div>

      {/* Prep timer (5s, first hang only) */}
      {showPrepTimer && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-md w-full shadow-2xl text-center">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Get Ready</h2>
            <PrepCountdown onComplete={handlePrepComplete} />
          </div>
        </div>
      )}

      {/* Hang timer (7s) */}
      {showHangTimer && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-md w-full shadow-2xl text-center">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Hang!</h2>
            <HangCountdown
              duration={TRAINING_PROTOCOL.hangDuration}
              onComplete={handleHangSetComplete}
              onSkip={handleHangSetComplete}
            />
          </div>
        </div>
      )}

      {/* Non-blocking rest timer */}
      <RestTimer
        isOpen={timerOpen}
        duration={timerDuration}
        onComplete={handleTimerComplete}
        onSkip={handleTimerSkip}
        onPause={() => setTimerPaused(p => !p)}
        isPaused={timerPaused}
        title={timerTitle}
      />

      {/* Max test "Go higher?" prompt */}
      <ConfirmDialog
        isOpen={!!goHigherPrompt}
        closeOnBackdrop={false}
        title="Go Higher?"
        message={
          goHigherPrompt
            ? `Completed ${goHigherPrompt.weight}kg${
                goHigherPrompt.exercise === 'hang'
                  ? ` (${TRAINING_PROTOCOL.hangDuration}s hold)`
                  : ` (${TRAINING_PROTOCOL.maxTest.trainingReps} reps)`
              }. Try +${TRAINING_PROTOCOL.maxTest.weightIncrement}kg?`
            : ''
        }
        confirmText="Yes — go heavier"
        cancelText="No — that's my max"
        onConfirm={handleGoHigherYes}
        onCancel={handleGoHigherNo}
      />

      {/* Break session confirmation */}
      <ConfirmDialog
        isOpen={showBreakConfirm}
        title="Break Session?"
        message="Are you sure? The session will be deleted."
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
        message={`You have ${totalSets - totalCompleted} incomplete sets. Finish anyway?`}
        confirmText="Finish Anyway"
        cancelText="Keep Training"
        onConfirm={completeSession}
        onCancel={() => setShowFinishConfirm(false)}
      />
    </div>
  );

  // ─── Exercise section renderer ─────────────────────────────────────────────

  function renderExerciseSection(exercise: ExerciseKey) {
    const config = EXERCISE_CONFIG[exercise];
    const warmupPhase = warmupPhases[exercise];
    const sets = getExerciseSets(exercise);
    const maxTestSets = sets.filter(s => s.setType === 'maxtest');
    const trainingSets = sets.filter(s => s.setType === 'training');
    const discoveredMax = session?.trainingData.maxTestData?.discoveredMax?.[exercise];

    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg`}>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          {config.label}
          {exercise === 'hang' && (
            <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
              {TRAINING_PROTOCOL.hangDuration}s hold
            </span>
          )}
        </h2>

        {/* Warm-up section */}
        {warmupPhase !== 'complete' && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide">
              Warm-up (Bodyweight)
            </h3>
            <div className="flex gap-3">
              <button
                onClick={() => handleWarmupSet(exercise, 1)}
                disabled={warmupPhase !== 'not_started'}
                className={`flex-1 py-3 rounded-lg font-medium transition-all ${
                  warmupPhase === 'not_started'
                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 hover:bg-amber-200 border-2 border-amber-300 dark:border-amber-700'
                    : 'bg-green-500 text-white'
                }`}
              >
                {exercise === 'hang'
                  ? `${TRAINING_PROTOCOL.warmup.hang.set1Duration}s`
                  : `${TRAINING_PROTOCOL.warmup[exercise].set1Reps} reps`}
                {warmupPhase !== 'not_started' && ' ✓'}
              </button>
              <button
                onClick={() => handleWarmupSet(exercise, 2)}
                disabled={warmupPhase !== 'set1_done'}
                className={`flex-1 py-3 rounded-lg font-medium transition-all ${
                  warmupPhase === 'set1_done'
                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 hover:bg-amber-200 border-2 border-amber-300 dark:border-amber-700'
                    : warmupPhase === 'set2_done' || warmupPhase === 'complete'
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-600'
                }`}
              >
                {exercise === 'hang'
                  ? `${TRAINING_PROTOCOL.warmup.hang.set2Duration}s`
                  : `${TRAINING_PROTOCOL.warmup[exercise].set2Reps} reps`}
                {(warmupPhase === 'set2_done' || warmupPhase === 'complete') && ' ✓'}
              </button>
            </div>
          </div>
        )}

        {/* Main sets (only shown after warmup complete) */}
        {warmupPhase === 'complete' && (
          <>
            {/* Max test sets */}
            {isMaxTest && maxTestSets.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide">
                  Max Testing
                  {discoveredMax != null && (
                    <span className="ml-2 text-green-600 dark:text-green-400 normal-case">
                      Max found: {discoveredMax}kg
                    </span>
                  )}
                </h3>
                <div className={`grid gap-3 ${maxTestSets.length <= 5 ? 'grid-cols-5' : 'grid-cols-4'}`}>
                  {maxTestSets.map(set => (
                    <button
                      key={set.id}
                      onClick={() => handleSetToggle(set)}
                      disabled={set.completed || discoveredMax != null}
                      className={`aspect-square rounded-lg font-bold text-lg transition-all relative ${
                        set.completed
                          ? `${config.color} text-white shadow-lg scale-105`
                          : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 hover:bg-amber-200 border-2 border-amber-300 dark:border-amber-700'
                      }`}
                    >
                      {set.order}
                      <span className="absolute bottom-0.5 left-0 right-0 text-[10px] font-normal opacity-80">
                        {set.weight}kg
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Training sets */}
            {trainingSets.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide">
                  Training Sets
                  {isMaxTest && discoveredMax != null && (
                    <span className="ml-2 normal-case">
                      ({discoveredMax - TRAINING_PROTOCOL.maxTest.trainingOffset}kg)
                    </span>
                  )}
                </h3>
                <div className={`grid gap-3 grid-cols-${Math.min(trainingSets.length, 5)}`}>
                  {trainingSets.map(set => (
                    <button
                      key={set.id}
                      onClick={() => handleSetToggle(set)}
                      className={`aspect-square rounded-lg font-bold text-lg transition-all relative ${
                        set.completed
                          ? `${config.color} text-white shadow-lg scale-105`
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {set.order - maxTestSets.length}
                      {set.weight != null && (
                        <span className="absolute bottom-0.5 left-0 right-0 text-[10px] font-normal opacity-80">
                          {set.weight}kg
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Add extra set button (max test only, 4th set) */}
                {isMaxTest && discoveredMax != null && trainingSets.length < TRAINING_PROTOCOL.maxTest.maxTrainingSets && !extraSetAdded[exercise] && (
                  <button
                    onClick={() => handleAddExtraSet(exercise)}
                    className="mt-3 w-full py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    + Add 4th Set
                  </button>
                )}
              </div>
            )}

            {/* Normal training sets (non-maxtest) */}
            {!isMaxTest && sets.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide">
                  {TRAINING_PROTOCOL.training.reps} reps × {sets.length} sets
                </h3>
                <div className="grid gap-3 grid-cols-5">
                  {sets.map(set => (
                    <button
                      key={set.id}
                      onClick={() => handleSetToggle(set)}
                      className={`aspect-square rounded-lg font-bold text-lg transition-all ${
                        set.completed
                          ? `${config.color} text-white shadow-lg scale-105`
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {set.order}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  }
}

// ─── Small timer components ──────────────────────────────────────────────────

function PrepCountdown({ onComplete }: { onComplete: () => void }) {
  const [count, setCount] = useState(5);

  useEffect(() => {
    if (count <= 0) {
      onComplete();
      return;
    }
    const t = setTimeout(() => setCount(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [count, onComplete]);

  return (
    <span className="text-6xl font-bold text-gray-900 dark:text-white">{count}</span>
  );
}

function HangCountdown({
  duration,
  onComplete,
  onSkip,
}: {
  duration: number;
  onComplete: () => void;
  onSkip: () => void;
}) {
  const [count, setCount] = useState(duration);

  useEffect(() => {
    if (count <= 0) {
      setTimeout(onComplete, 300);
      return;
    }
    const t = setTimeout(() => setCount(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [count, onComplete]);

  return (
    <>
      <span className="text-6xl font-bold text-gray-900 dark:text-white block mb-4">{count}</span>
      {count > 0 && (
        <button
          onClick={onSkip}
          className="px-6 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium"
        >
          Skip
        </button>
      )}
    </>
  );
}
