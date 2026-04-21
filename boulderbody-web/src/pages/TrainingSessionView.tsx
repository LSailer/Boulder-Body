/**
 * TrainingSessionView.tsx
 *
 * 9c-style training session tracker.
 *
 * Hang and pull-up flow:
 *   1. Max-test phase: start at recommender weight, "Hold it?" / "Hit 1 rep?"
 *      after each set. Yes → +2.5kg. No → record discoveredMax, generate 3
 *      working sets at 80% of max (floored to 2.5kg).
 *   2. Working phase: 3 sets at discovered working weight.
 *
 * Hangs: 5s prep before every hang. Max-test holds for 5s, working holds for 7s.
 * Pull-ups: no prep. 1 rep for max-test, 3 reps for working.
 * Bench + trap-bar: unchanged fixed-weight 5×3.
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { TrainingSession } from '../models/Session';
import { isTrainingSession } from '../models/Session';
import type { TrainingSet } from '../models/SessionType';
import { TRAINING_PROTOCOL } from '../models/SessionType';
import {
  getAllSessions,
  updateSession,
  deleteSession,
  getLastTrainingSession,
} from '../logic/StorageManager';
import { getTrainingRecommendation } from '../logic/TrainingRecommender';
import { generateWorkingSets, workingWeightFromFailed } from '../logic/weights';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { RestTimer } from '../components/RestTimer';

const PLATE_INCREMENT = 2.5;
const RAMP_UP_INCREMENT = 5;

type ExerciseKey = 'hang' | 'pullup' | 'bench' | 'trapbar';
type MaxTestExercise = 'hang' | 'pullup';

function getSetsKey(
  exercise: ExerciseKey
): 'hangSets' | 'pullupSets' | 'benchSets' | 'trapBarSets' {
  switch (exercise) {
    case 'hang':
      return 'hangSets';
    case 'pullup':
      return 'pullupSets';
    case 'bench':
      return 'benchSets';
    case 'trapbar':
      return 'trapBarSets';
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
  const [restTimerPaused, setRestTimerPaused] = useState(false);
  const [pendingHangSetId, setPendingHangSetId] = useState<string | null>(null);

  // Drives rest-timer auto-advance
  const [lastExercise, setLastExercise] = useState<ExerciseKey | null>(null);

  // Queued while rest timer runs; shown when rest completes.
  const [maxTestPrompt, setMaxTestPrompt] = useState<{
    exercise: MaxTestExercise;
    weight: number;
  } | null>(null);

  const [showBreakConfirm, setShowBreakConfirm] = useState(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);

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

    // StartView creates hangSets/pullupSets empty; TrainingSessionView owns
    // the starting max-test weight via the recommender.
    const needsSeed =
      found.trainingData.hangSets.length === 0 ||
      found.trainingData.pullupSets.length === 0;

    if (needsSeed) {
      const rec = getTrainingRecommendation(getLastTrainingSession());
      const seeded: TrainingSession = {
        ...found,
        trainingData: {
          ...found.trainingData,
          hangSets:
            found.trainingData.hangSets.length === 0
              ? [
                  {
                    id: crypto.randomUUID(),
                    order: 1,
                    exercise: 'hang',
                    completed: false,
                    setType: 'maxtest',
                    weight: rec.hangStart,
                  },
                ]
              : found.trainingData.hangSets,
          pullupSets:
            found.trainingData.pullupSets.length === 0
              ? [
                  {
                    id: crypto.randomUUID(),
                    order: 1,
                    exercise: 'pullup',
                    completed: false,
                    setType: 'maxtest',
                    weight: rec.pullupStart,
                  },
                ]
              : found.trainingData.pullupSets,
          rampUpCap: {
            hang: rec.lastWorking?.hang,
            pullup: rec.lastWorking?.pullup,
          },
        },
      };
      updateSession(seeded);
      setSession(seeded);
      return;
    }

    setSession(found);
  }, [sessionId, navigate]);

  if (!session) return null;

  // ─── Helpers ───────────────────────────────────────────────────────────

  function getSets(exercise: ExerciseKey): TrainingSet[] {
    return (session!.trainingData[getSetsKey(exercise)] ?? []) as TrainingSet[];
  }

  function commitSets(exercise: ExerciseKey, sets: TrainingSet[]) {
    if (!session) return;
    const key = getSetsKey(exercise);
    const updated: TrainingSession = {
      ...session,
      trainingData: { ...session.trainingData, [key]: sets },
    };
    updateSession(updated);
    setSession(updated);
  }

  // ─── Set toggle ────────────────────────────────────────────────────────

  const handleSetToggle = (set: TrainingSet) => {
    if (!session) return;

    if (set.exercise === 'hang') {
      if (!set.completed) {
        setPendingHangSetId(set.id);
        setShowPrepTimer(true);
        return;
      }
      const updated = getSets('hang').map((s) =>
        s.id === set.id ? { ...s, completed: false, timestamp: undefined } : s
      );
      commitSets('hang', updated);
      return;
    }

    const wasCompleted = set.completed;
    const updated = getSets(set.exercise).map((s) =>
      s.id === set.id
        ? {
            ...s,
            completed: !wasCompleted,
            timestamp: !wasCompleted ? new Date() : undefined,
          }
        : s
    );
    commitSets(set.exercise, updated);

    if (!wasCompleted) {
      setLastExercise(set.exercise);
      setShowRestTimer(true);
      if (set.exercise === 'pullup' && set.setType === 'maxtest') {
        setMaxTestPrompt({ exercise: 'pullup', weight: set.weight ?? 0 });
      }
    }
  };

  // ─── Hang timer flow ───────────────────────────────────────────────────

  const handlePrepComplete = () => {
    setShowPrepTimer(false);
    setShowHangTimer(true);
  };

  const handleHangComplete = () => {
    if (!pendingHangSetId || !session) return;
    const hangs = session.trainingData.hangSets;
    const completedSet = hangs.find((s) => s.id === pendingHangSetId);
    if (!completedSet) return;

    const updated = hangs.map((s) =>
      s.id === pendingHangSetId ? { ...s, completed: true, timestamp: new Date() } : s
    );
    commitSets('hang', updated);

    setPendingHangSetId(null);
    setShowHangTimer(false);
    setLastExercise('hang');
    setShowRestTimer(true);

    if (completedSet.setType === 'maxtest') {
      setMaxTestPrompt({ exercise: 'hang', weight: completedSet.weight ?? 0 });
    }
  };

  const handleHangSkip = () => {
    handleHangComplete();
  };

  // ─── Rest timer ────────────────────────────────────────────────────────

  const handleRestComplete = () => {
    setShowRestTimer(false);
    setRestTimerPaused(false);

    // Max-test prompt takes priority — dialog renders below.
    if (maxTestPrompt) return;

    // Auto-advance for hangs so the user gets prep → hang without tapping.
    if (lastExercise === 'hang') {
      const next = session?.trainingData.hangSets.find((s) => !s.completed);
      if (next) {
        setPendingHangSetId(next.id);
        setShowPrepTimer(true);
      }
    }
  };

  // ─── Max-test prompt handlers ──────────────────────────────────────────

  const handleMaxTestYes = () => {
    if (!maxTestPrompt || !session) return;
    const { exercise, weight } = maxTestPrompt;
    // Ramp up in 5kg steps until we reach last session's working weight,
    // then switch to the normal 2.5kg max-test step.
    const cap = session.trainingData.rampUpCap?.[exercise];
    const increment = cap != null && weight < cap ? RAMP_UP_INCREMENT : PLATE_INCREMENT;
    const nextWeight = weight + increment;
    const sets = getSets(exercise);
    const newSet: TrainingSet = {
      id: crypto.randomUUID(),
      order: sets.length + 1,
      exercise,
      completed: false,
      setType: 'maxtest',
      weight: nextWeight,
    };
    commitSets(exercise, [...sets, newSet]);
    setMaxTestPrompt(null);

    // Auto-start prep for the next hang set so the flow is hands-free.
    if (exercise === 'hang') {
      setPendingHangSetId(newSet.id);
      setShowPrepTimer(true);
    }
  };

  const handleMaxTestNo = () => {
    if (!maxTestPrompt || !session) return;
    const { exercise, weight } = maxTestPrompt;
    // Record the last successfully held weight (approx: failed − 2.5) as the
    // session's discovered max, but today's working weight = failed − 5.
    const max = Math.max(0, weight - PLATE_INCREMENT);
    const workingWeight = workingWeightFromFailed(weight);

    const sets = getSets(exercise);
    const workingSets = generateWorkingSets(workingWeight, exercise, sets.length + 1);
    const updatedSets = [...sets, ...workingSets];
    const key = getSetsKey(exercise);

    const updated: TrainingSession = {
      ...session,
      trainingData: {
        ...session.trainingData,
        [key]: updatedSets,
        discoveredMax: {
          ...session.trainingData.discoveredMax,
          [exercise]: max,
        },
      },
    };
    updateSession(updated);
    setSession(updated);
    setMaxTestPrompt(null);
  };

  // ─── Session completion ───────────────────────────────────────────────

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

  // ─── Derived values ───────────────────────────────────────────────────

  const allSetsArrays: TrainingSet[][] = [
    session.trainingData.hangSets,
    session.trainingData.pullupSets,
    ...(session.trainingData.benchSets ? [session.trainingData.benchSets] : []),
    ...(session.trainingData.trapBarSets ? [session.trainingData.trapBarSets] : []),
  ];
  const totalCompleted = allSetsArrays.flat().filter((s) => s.completed).length;
  const totalSets = allSetsArrays.flat().length;

  const pendingSet = pendingHangSetId
    ? session.trainingData.hangSets.find((s) => s.id === pendingHangSetId)
    : null;
  // Max-test hangs hold for 5s; working hangs hold for 7s.
  const hangDuration =
    pendingSet?.setType === 'working'
      ? TRAINING_PROTOCOL.hangDuration
      : TRAINING_PROTOCOL.maxTestHangDuration;

  // ─── Render helpers ───────────────────────────────────────────────────

  const exerciseConfig: {
    key: ExerciseKey;
    label: string;
    detail: string;
    color: string;
  }[] = [
    {
      key: 'hang',
      label: 'Max Hangs',
      detail: `max-test (5s) → 3 × ${TRAINING_PROTOCOL.hangReps} × ${TRAINING_PROTOCOL.hangDuration}s working`,
      color: 'bg-blue-600',
    },
    {
      key: 'pullup',
      label: 'Pull-ups',
      detail: `max-test (1 rep) → 3 × ${TRAINING_PROTOCOL.pullupReps} working`,
      color: 'bg-purple-600',
    },
    {
      key: 'bench',
      label: 'Bench Press',
      detail: `${TRAINING_PROTOCOL.benchSets} × ${TRAINING_PROTOCOL.benchReps}`,
      color: 'bg-green-600',
    },
    {
      key: 'trapbar',
      label: 'Trap Bar Deadlift',
      detail: `${TRAINING_PROTOCOL.trapBarSets} × ${TRAINING_PROTOCOL.trapBarReps}`,
      color: 'bg-orange-500',
    },
  ];

  function renderExerciseSection(config: (typeof exerciseConfig)[0]) {
    if (!session) return null;
    const sets = getSets(config.key);
    if (sets.length === 0) return null;

    const isMaxTest = config.key === 'hang' || config.key === 'pullup';
    const discoveredMax = isMaxTest
      ? session.trainingData.discoveredMax?.[config.key as MaxTestExercise]
      : undefined;
    const fixedWeight = !isMaxTest
      ? config.key === 'trapbar'
        ? session.trainingData.trapBarWeight
        : session.trainingData.benchWeight
      : undefined;

    const lastMaxTestSet = isMaxTest
      ? [...sets].reverse().find((s) => s.setType === 'maxtest')
      : undefined;

    let headerRight: string | null = null;
    if (discoveredMax != null) {
      headerRight = `Max ${discoveredMax}kg`;
    } else if (lastMaxTestSet) {
      headerRight = `Testing ${lastMaxTestSet.weight}kg`;
    } else if (fixedWeight != null) {
      headerRight = `${fixedWeight}kg`;
    }

    return (
      <div
        key={config.key}
        className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg mb-4"
      >
        <div className="flex justify-between items-start mb-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {config.label}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {config.detail}
            </p>
          </div>
          {headerRight && (
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-full px-3 py-1">
              {headerRight}
            </span>
          )}
        </div>
        <div
          className={`grid gap-3 ${
            sets.length <= 5 ? 'grid-cols-5' : 'grid-cols-4'
          }`}
        >
          {sets.map((set) => {
            const isWorking = set.setType === 'working';
            return (
              <button
                key={set.id}
                onClick={() => handleSetToggle(set)}
                className={`aspect-square rounded-lg font-bold text-lg transition-all relative ${
                  set.completed
                    ? `${config.color} text-white shadow-lg scale-105`
                    : isWorking
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-2 border-blue-300 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/40'
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

  const maxTestMessage = maxTestPrompt
    ? maxTestPrompt.exercise === 'hang'
      ? `Did you hold ${maxTestPrompt.weight}kg for ${TRAINING_PROTOCOL.maxTestHangDuration}s?`
      : `Did you hit 1 rep at ${maxTestPrompt.weight}kg?`
    : '';

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
        </div>

        {/* Progress */}
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
              style={{
                width: `${totalSets > 0 ? (totalCompleted / totalSets) * 100 : 0}%`,
              }}
            />
          </div>
        </div>

        {exerciseConfig.map((config) => renderExerciseSection(config))}

        <button
          onClick={handleFinishSession}
          className="w-full btn btn-success text-lg py-3"
        >
          Finish Session
        </button>
      </div>

      {/* 5s prep timer — every hang */}
      <RestTimer
        isOpen={showPrepTimer}
        duration={TRAINING_PROTOCOL.prepBeforeHang}
        onComplete={handlePrepComplete}
        onSkip={handlePrepComplete}
        title="Get Ready"
      />

      {/* Hang timer — 5s for max-test, 7s for working */}
      <RestTimer
        isOpen={showHangTimer}
        duration={hangDuration}
        onComplete={handleHangComplete}
        onSkip={handleHangSkip}
        title="Hang!"
      />

      {/* 3 min rest timer */}
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

      {/* Max-test prompt — shown once rest completes */}
      <ConfirmDialog
        isOpen={!!maxTestPrompt && !showRestTimer}
        title={maxTestPrompt?.exercise === 'hang' ? 'Hold it?' : 'Hit 1 rep?'}
        message={maxTestMessage}
        confirmText="Yes — go heavier"
        cancelText="No — that's my max"
        onConfirm={handleMaxTestYes}
        onCancel={handleMaxTestNo}
      />

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
