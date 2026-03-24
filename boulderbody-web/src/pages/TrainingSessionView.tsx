/**
 * TrainingSessionView.tsx
 *
 * Training session tracker for max hangs, pull-ups, bench, and trap bar.
 * Supports two modes:
 *
 * NORMAL MODE: Fixed weight per exercise, 5 sets each.
 *   Hang flow: click → 5s prep → 7s hang → 3min rest (subsequent: no prep)
 *   Other exercises: click → complete → 3min rest
 *
 * RAMP-UP MODE (post-break): Progressive weight discovery per exercise.
 *   Each exercise starts at 80% of target and ramps +2.5kg per set.
 *   After each set, user answers "Hit target?" — Yes adds another set,
 *   No records discovered max and generates 3 working sets at max-2.5kg.
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { TrainingSession } from '../models/Session';
import { isTrainingSession } from '../models/Session';
import type { TrainingSet } from '../models/SessionType';
import { TRAINING_PROTOCOL } from '../models/SessionType';
import { getAllSessions, updateSession, deleteSession } from '../logic/StorageManager';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { RestTimer } from '../components/RestTimer';

const WEIGHT_INCREMENT = 2.5;
const WORKING_SETS_COUNT = 3;

type ExerciseKey = 'hang' | 'pullup' | 'bench' | 'trapbar';

function getSetsKey(exercise: ExerciseKey): 'hangSets' | 'pullupSets' | 'benchSets' | 'trapBarSets' {
  switch (exercise) {
    case 'hang': return 'hangSets';
    case 'pullup': return 'pullupSets';
    case 'bench': return 'benchSets';
    case 'trapbar': return 'trapBarSets';
  }
}

export function TrainingSessionView() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<TrainingSession | null>(null);

  // Timer visibility
  const [showPrepTimer, setShowPrepTimer] = useState(false);
  const [showHangTimer, setShowHangTimer] = useState(false);
  const [showRestTimer, setShowRestTimer] = useState(false);

  // Rest timer pause state
  const [restTimerPaused, setRestTimerPaused] = useState(false);
  const [pendingHangSetId, setPendingHangSetId] = useState<string | null>(null);
  const [isFirstHangSet, setIsFirstHangSet] = useState(true);

  // Track which exercise triggered the rest timer
  const [lastExercise, setLastExercise] = useState<ExerciseKey | null>(null);

  // Ramp-up: "Hit target?" prompt state
  const [rampUpPrompt, setRampUpPrompt] = useState<{
    exercise: ExerciseKey;
    weight: number;
  } | null>(null);

  // Dialog visibility
  const [showBreakConfirm, setShowBreakConfirm] = useState(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);

  const isRampUp = !!session?.trainingData.rampUp;

  useEffect(() => {
    if (!sessionId) {
      navigate('/');
      return;
    }

    const allSessions = getAllSessions();
    const found = allSessions.find((s) => s.id === sessionId);

    if (!found || !isTrainingSession(found)) {
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
    return null;
  }

  // ─── Helper: get sets for an exercise ─────────────────────────────────────

  function getExerciseSets(exercise: ExerciseKey): TrainingSet[] {
    const key = getSetsKey(exercise);
    return (session!.trainingData[key] ?? []) as TrainingSet[];
  }

  function isExerciseInRampPhase(exercise: ExerciseKey): boolean {
    if (!isRampUp) return false;
    return !session!.trainingData.rampUp!.discoveredMax?.[exercise];
  }

  // ─── Ramp-up: handle "Hit target?" response ──────────────────────────────

  const handleRampUpYes = () => {
    if (!rampUpPrompt || !session) return;
    const { exercise, weight } = rampUpPrompt;
    const setsKey = getSetsKey(exercise);
    const sets = [...(session.trainingData[setsKey] ?? [])] as TrainingSet[];
    const nextWeight = weight + WEIGHT_INCREMENT;

    // User hit the target — add another ramp-up set at higher weight.
    // The ramp continues until the user says "No" (can't complete reps/hold).
    const newSet: TrainingSet = {
      id: crypto.randomUUID(),
      order: sets.length + 1,
      exercise,
      completed: false,
      setType: 'rampup',
      weight: nextWeight,
    };
    sets.push(newSet);

    const updatedSession: TrainingSession = {
      ...session,
      trainingData: {
        ...session.trainingData,
        [setsKey]: sets,
      },
    };
    updateSession(updatedSession);
    setSession(updatedSession);
    setRampUpPrompt(null);
  };

  const handleRampUpNo = () => {
    if (!rampUpPrompt || !session) return;
    const { exercise, weight } = rampUpPrompt;
    // Discovered max = weight - 2.5kg (last successful), or 0 if this was the first set
    const discoveredMax = Math.max(0, weight - WEIGHT_INCREMENT);
    finishRampUp(exercise, discoveredMax);
    setRampUpPrompt(null);
  };

  function finishRampUp(exercise: ExerciseKey, maxWeight: number) {
    if (!session) return;
    const setsKey = getSetsKey(exercise);
    const sets = [...(session.trainingData[setsKey] ?? [])] as TrainingSet[];
    const workingWeight = Math.max(0, maxWeight);

    // Add working sets
    for (let i = 0; i < WORKING_SETS_COUNT; i++) {
      sets.push({
        id: crypto.randomUUID(),
        order: sets.length + 1,
        exercise,
        completed: false,
        setType: 'working',
        weight: workingWeight,
      });
    }

    const updatedRampUp = {
      ...session.trainingData.rampUp!,
      discoveredMax: {
        ...session.trainingData.rampUp!.discoveredMax,
        [exercise]: maxWeight,
      },
    };

    const updatedSession: TrainingSession = {
      ...session,
      trainingData: {
        ...session.trainingData,
        [setsKey]: sets,
        rampUp: updatedRampUp,
      },
    };
    updateSession(updatedSession);
    setSession(updatedSession);
  }

  // ─── Set toggle ──────────────────────────────────────────────────────────

  const handleSetToggle = (set: TrainingSet) => {
    if (set.exercise === 'hang' && !set.completed) {
      // Starting a hang — initiate timer flow
      setPendingHangSetId(set.id);
      if (isFirstHangSet) {
        setShowPrepTimer(true);
      } else {
        setShowHangTimer(true);
      }
      return;
    }

    const { trainingData } = session;
    const setsKey = getSetsKey(set.exercise);
    const sets = (trainingData[setsKey] ?? []) as TrainingSet[];

    if (set.exercise === 'hang') {
      // Un-complete hang
      const updatedSets = sets.map((s) =>
        s.id === set.id ? { ...s, completed: false, timestamp: undefined } : s
      );
      const updatedSession: TrainingSession = {
        ...session,
        trainingData: { ...trainingData, [setsKey]: updatedSets },
      };
      updateSession(updatedSession);
      setSession(updatedSession);
    } else {
      // Toggle non-hang exercises
      const updatedSets = sets.map((s) =>
        s.id === set.id
          ? { ...s, completed: !s.completed, timestamp: !s.completed ? new Date() : undefined }
          : s
      );
      const updatedSession: TrainingSession = {
        ...session,
        trainingData: { ...trainingData, [setsKey]: updatedSets },
      };
      updateSession(updatedSession);
      setSession(updatedSession);

      if (!set.completed) {
        // Just completed — check if ramp-up prompt needed
        if (isRampUp && set.setType === 'rampup') {
          setLastExercise(set.exercise);
          setShowRestTimer(true);
          // Show ramp-up prompt after rest timer completes (stored for later)
          setRampUpPrompt({ exercise: set.exercise, weight: set.weight! });
        } else {
          setLastExercise(set.exercise);
          setShowRestTimer(true);
        }
      }
    }
  };

  // ─── Hang timer handlers ─────────────────────────────────────────────────

  const handlePrepComplete = () => {
    setShowPrepTimer(false);
    setShowHangTimer(true);
  };

  const handleHangComplete = () => {
    if (!pendingHangSetId || !session) return;

    const sets = session.trainingData.hangSets;
    const completedSet = sets.find((s) => s.id === pendingHangSetId);

    const updatedHangSets = sets.map((s) =>
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

    // If this was a ramp-up set, queue the prompt for after rest
    if (isRampUp && completedSet?.setType === 'rampup') {
      setRampUpPrompt({ exercise: 'hang', weight: completedSet.weight! });
    }
  };

  const handleHangSkip = () => {
    handleHangComplete();
  };

  // ─── Rest timer handlers ─────────────────────────────────────────────────

  const handleRestComplete = () => {
    setShowRestTimer(false);
    setRestTimerPaused(false);

    // If there's a pending ramp-up prompt, show it now (after rest)
    if (rampUpPrompt) {
      // rampUpPrompt is already set, the dialog will show
      return;
    }

    if (lastExercise === 'hang') {
      // Auto-start next uncompleted hang set
      const nextHangSet = session.trainingData.hangSets.find((s) => !s.completed);
      if (nextHangSet) {
        setPendingHangSetId(nextHangSet.id);
        setShowHangTimer(true);
      }
    }
  };

  // ─── Session completion ───────────────────────────────────────────────────

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

  // ─── Derived values ───────────────────────────────────────────────────────

  const allSetsArrays: TrainingSet[][] = [
    session.trainingData.hangSets,
    session.trainingData.pullupSets,
    ...(session.trainingData.benchSets ? [session.trainingData.benchSets] : []),
    ...(session.trainingData.trapBarSets ? [session.trainingData.trapBarSets] : []),
  ];

  const totalCompleted = allSetsArrays.flat().filter((s) => s.completed).length;
  const totalSets = allSetsArrays.flat().length;

  // ─── Render helpers ───────────────────────────────────────────────────────

  const exerciseConfig: {
    key: ExerciseKey;
    label: string;
    detail: string;
    normalColor: string;
    workingColor: string;
  }[] = [
    {
      key: 'hang',
      label: 'Max Hangs',
      detail: `${TRAINING_PROTOCOL.hangDuration}s × ${TRAINING_PROTOCOL.hangReps} reps`,
      normalColor: 'bg-blue-600',
      workingColor: 'bg-blue-600',
    },
    {
      key: 'pullup',
      label: 'Max Pull-ups',
      detail: `${TRAINING_PROTOCOL.pullupReps} reps`,
      normalColor: 'bg-purple-600',
      workingColor: 'bg-purple-600',
    },
    {
      key: 'bench',
      label: 'Bench Press',
      detail: `${TRAINING_PROTOCOL.benchReps} reps`,
      normalColor: 'bg-green-600',
      workingColor: 'bg-green-600',
    },
    {
      key: 'trapbar',
      label: 'Trap Bar Deadlift',
      detail: `${TRAINING_PROTOCOL.trapBarReps} reps`,
      normalColor: 'bg-orange-500',
      workingColor: 'bg-orange-500',
    },
  ];

  function renderExerciseSection(config: typeof exerciseConfig[0]) {
    if (!session) return null;
    const sets = getExerciseSets(config.key);
    if (sets.length === 0) return null;

    const inRampPhase = isExerciseInRampPhase(config.key);
    const discoveredMax = session.trainingData.rampUp?.discoveredMax?.[config.key];
    const preBreakWeight = session.trainingData.rampUp?.preBreakWeights[config.key];

    // Determine header info
    let weightDisplay: string;
    let phaseLabel: string | null = null;
    if (isRampUp) {
      if (inRampPhase) {
        const lastSet = sets[sets.length - 1];
        weightDisplay = `${lastSet?.weight ?? 0}kg`;
        phaseLabel = 'Ramp-Up';
      } else {
        weightDisplay = `${discoveredMax}kg`;
        phaseLabel = 'Working';
      }
    } else {
      const weightKey = config.key === 'trapbar' ? 'trapBarWeight' : `${config.key}Weight` as keyof typeof session.trainingData;
      weightDisplay = `${session.trainingData[weightKey] ?? 0}kg`;
    }

    return (
      <div key={config.key} className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg mb-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {config.label} ({config.detail})
          </h2>
          {phaseLabel && (
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${
              phaseLabel === 'Ramp-Up'
                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
            }`}>
              {phaseLabel}: {weightDisplay}
            </span>
          )}
        </div>

        {/* Target info during ramp-up */}
        {isRampUp && preBreakWeight != null && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            {session!.trainingData.rampUp?.isManual ? 'Start weight' : 'Pre-break target'}: {preBreakWeight}kg
            {discoveredMax != null && (
              <span className={discoveredMax >= preBreakWeight ? ' text-green-600 dark:text-green-400' : ' text-amber-600 dark:text-amber-400'}>
                {' '}— Max found: {discoveredMax}kg {discoveredMax >= preBreakWeight ? '(recovered!)' : ''}
              </span>
            )}
          </p>
        )}

        <div className={`grid gap-3 ${sets.length <= 5 ? 'grid-cols-5' : 'grid-cols-4'}`}>
          {sets.map((set) => {
            const isRampSet = set.setType === 'rampup';
            const isWorkingSet = set.setType === 'working';

            let completedColor = config.normalColor;
            if (isRampSet) completedColor = 'bg-amber-500';
            else if (isWorkingSet) completedColor = config.workingColor;

            return (
              <button
                key={set.id}
                onClick={() => handleSetToggle(set)}
                className={`aspect-square rounded-lg font-bold text-lg transition-all relative ${
                  set.completed
                    ? `${completedColor} text-white shadow-lg scale-105`
                    : isRampSet
                      ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/50 border-2 border-amber-300 dark:border-amber-700'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {set.order}
                {set.weight != null && (
                  <span className="absolute bottom-0.5 left-0 right-0 text-[10px] font-normal opacity-80">
                    {set.weight}kg
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────

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
              {isRampUp
                ? (session.trainingData.rampUp?.isManual ? 'Manual Ramp-Up' : 'Post-Break Ramp-Up')
                : 'Training Session'}
            </h1>
            <button
              onClick={() => setShowBreakConfirm(true)}
              className="text-red-500 hover:text-red-400 font-medium"
            >
              Break Session
            </button>
          </div>

          {/* Weight info */}
          {!isRampUp && (
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-gray-600 dark:text-gray-400 text-center">
              <span>Hangs: {session.trainingData.hangWeight}kg</span>
              <span>Pull-ups: {session.trainingData.pullupWeight}kg</span>
              <span>Bench: {session.trainingData.benchWeight ?? 10}kg</span>
              <span>Trap Bar: {session.trainingData.trapBarWeight ?? 20}kg</span>
            </div>
          )}
          {isRampUp && (
            <div className="text-center text-sm text-amber-600 dark:text-amber-400 font-medium">
              {session.trainingData.rampUp?.isManual
                ? 'Manual Ramp-Up — finding your max per exercise'
                : 'Ramp-Up Mode — finding your current max per exercise'}
            </div>
          )}
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

        {/* Exercise Sections */}
        {exerciseConfig.map((config) => renderExerciseSection(config))}

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

      {/* Ramp-up "Hit target?" prompt */}
      <ConfirmDialog
        isOpen={!!rampUpPrompt && !showRestTimer}
        closeOnBackdrop={false}
        title="Hit Target?"
        message={
          rampUpPrompt
            ? `Did you hit the target at ${rampUpPrompt.weight}kg? (${
                rampUpPrompt.exercise === 'hang'
                  ? `${TRAINING_PROTOCOL.hangDuration}s hold`
                  : `${TRAINING_PROTOCOL[`${rampUpPrompt.exercise === 'trapbar' ? 'trapBar' : rampUpPrompt.exercise}Reps` as keyof typeof TRAINING_PROTOCOL]} reps`
              })`
            : ''
        }
        confirmText="Yes — go heavier"
        cancelText="No — that's my max"
        onConfirm={handleRampUpYes}
        onCancel={handleRampUpNo}
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
