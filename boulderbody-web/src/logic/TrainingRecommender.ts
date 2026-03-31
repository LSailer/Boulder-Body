/**
 * TrainingRecommender.ts
 *
 * Calculates weight progression for training sessions.
 * Supports two session modes:
 *   - normal: +2.5kg when all 5 sets completed, else maintain
 *   - maxtest: training weight = discoveredMax - 7.5kg
 *
 * Also calculates max test starting weights (last training weight - 5kg).
 * Suggests max test when >10 days since last session.
 */

import type { TrainingSession } from '../models/Session';
import { isExerciseComplete } from '../models/SessionType';
import type { ExerciseKey } from '../models/SessionType';

export interface TrainingRecommendation {
  hangWeight: number;
  pullupWeight: number;
  benchWeight: number;
  reason: string;
  suggestMaxTest?: boolean;
  daysSinceLastSession?: number;
}

export interface MaxTestStartingWeights {
  hang: number;
  pullup: number;
  bench: number;
}

const DEFAULT_WEIGHT = 0;
const DEFAULT_BENCH_WEIGHT = 10;
const WEIGHT_INCREMENT = 2.5;
const MAX_TEST_START_OFFSET = 5; // start max test at last training weight - 5kg
const BREAK_THRESHOLD_DAYS = 10;

/** Round down to nearest 2.5kg increment, minimum 0 */
function roundTo2_5(weight: number): number {
  return Math.max(0, Math.floor(weight / 2.5) * 2.5);
}

/**
 * Get the effective training weight from a session.
 * For max test sessions, uses discoveredMax - 7.5 (the training weight used).
 * For normal sessions, uses the stored weight.
 */
function getEffectiveWeight(session: TrainingSession, exercise: ExerciseKey): number {
  const { trainingData } = session;

  if (trainingData.trainingMode === 'maxtest' && trainingData.maxTestData?.discoveredMax?.[exercise] != null) {
    // After a max test, training continues from discoveredMax - 7.5
    return Math.max(0, trainingData.maxTestData.discoveredMax[exercise]! - 7.5);
  }

  switch (exercise) {
    case 'hang': return trainingData.hangWeight;
    case 'pullup': return trainingData.pullupWeight;
    case 'bench': return trainingData.benchWeight;
  }
}

/**
 * Calculate recommended weights for the next normal training session.
 */
export function getTrainingRecommendation(
  lastTrainingSession: TrainingSession | null,
  daysSinceLastSession?: number | null
): TrainingRecommendation {
  if (!lastTrainingSession) {
    return {
      hangWeight: DEFAULT_WEIGHT,
      pullupWeight: DEFAULT_WEIGHT,
      benchWeight: DEFAULT_BENCH_WEIGHT,
      reason: 'First session — starting with defaults',
    };
  }

  const { trainingData } = lastTrainingSession;

  // For max test sessions, base weights on discoveredMax - 7.5
  if (trainingData.trainingMode === 'maxtest') {
    const hangBase = getEffectiveWeight(lastTrainingSession, 'hang');
    const pullupBase = getEffectiveWeight(lastTrainingSession, 'pullup');
    const benchBase = getEffectiveWeight(lastTrainingSession, 'bench');

    // Check if training sets after max test were all completed
    const hangTrainingSets = trainingData.hangSets.filter(s => s.setType === 'training');
    const pullupTrainingSets = trainingData.pullupSets.filter(s => s.setType === 'training');
    const benchTrainingSets = trainingData.benchSets.filter(s => s.setType === 'training');

    const hangComplete = isExerciseComplete(hangTrainingSets);
    const pullupComplete = isExerciseComplete(pullupTrainingSets);
    const benchComplete = isExerciseComplete(benchTrainingSets);

    const newHang = hangComplete ? hangBase + WEIGHT_INCREMENT : hangBase;
    const newPullup = pullupComplete ? pullupBase + WEIGHT_INCREMENT : pullupBase;
    const newBench = benchComplete ? benchBase + WEIGHT_INCREMENT : benchBase;

    // Check for break suggestion
    if (daysSinceLastSession != null && daysSinceLastSession > BREAK_THRESHOLD_DAYS) {
      return {
        hangWeight: newHang,
        pullupWeight: newPullup,
        benchWeight: newBench,
        reason: `${daysSinceLastSession} days since last session — consider a Max Test`,
        suggestMaxTest: true,
        daysSinceLastSession,
      };
    }

    return {
      hangWeight: newHang,
      pullupWeight: newPullup,
      benchWeight: newBench,
      reason: 'Based on max test results',
    };
  }

  // Normal training session progression
  const hangComplete = isExerciseComplete(trainingData.hangSets);
  const pullupComplete = isExerciseComplete(trainingData.pullupSets);
  const benchComplete = isExerciseComplete(trainingData.benchSets);

  const newHang = hangComplete ? trainingData.hangWeight + WEIGHT_INCREMENT : trainingData.hangWeight;
  const newPullup = pullupComplete ? trainingData.pullupWeight + WEIGHT_INCREMENT : trainingData.pullupWeight;
  const newBench = benchComplete ? trainingData.benchWeight + WEIGHT_INCREMENT : trainingData.benchWeight;

  // Check for break suggestion
  if (daysSinceLastSession != null && daysSinceLastSession > BREAK_THRESHOLD_DAYS) {
    return {
      hangWeight: newHang,
      pullupWeight: newPullup,
      benchWeight: newBench,
      reason: `${daysSinceLastSession} days since last session — consider a Max Test`,
      suggestMaxTest: true,
      daysSinceLastSession,
    };
  }

  // Build reason string
  const completed = [hangComplete, pullupComplete, benchComplete];
  const completedCount = completed.filter(Boolean).length;

  let reason = '';
  if (completedCount === 3) {
    reason = `All exercises complete (+${WEIGHT_INCREMENT}kg each)`;
  } else if (completedCount === 0) {
    reason = 'No exercises completed — maintain weights';
  } else {
    const names = ['hangs', 'pull-ups', 'bench'];
    const progressed = names.filter((_, i) => completed[i]).join(', ');
    reason = `${progressed} +${WEIGHT_INCREMENT}kg, others same`;
  }

  return {
    hangWeight: newHang,
    pullupWeight: newPullup,
    benchWeight: newBench,
    reason,
  };
}

/**
 * Calculate starting weights for a max test session.
 * Default: last training weight - 5kg (editable by user).
 */
export function getMaxTestStartingWeights(
  lastTrainingSession: TrainingSession | null
): MaxTestStartingWeights {
  if (!lastTrainingSession) {
    return {
      hang: DEFAULT_WEIGHT,
      pullup: DEFAULT_WEIGHT,
      bench: DEFAULT_BENCH_WEIGHT,
    };
  }

  const hangBase = getEffectiveWeight(lastTrainingSession, 'hang');
  const pullupBase = getEffectiveWeight(lastTrainingSession, 'pullup');
  const benchBase = getEffectiveWeight(lastTrainingSession, 'bench');

  return {
    hang: roundTo2_5(hangBase - MAX_TEST_START_OFFSET),
    pullup: roundTo2_5(pullupBase - MAX_TEST_START_OFFSET),
    bench: roundTo2_5(benchBase - MAX_TEST_START_OFFSET),
  };
}

/**
 * Get the last discovered max from a max test session (for comparison in summary).
 */
export function getLastMaxTestResults(
  sessions: TrainingSession[]
): { hang?: number; pullup?: number; bench?: number } | null {
  const maxTestSessions = sessions.filter(
    s => s.isFinished && s.trainingData.trainingMode === 'maxtest' && s.trainingData.maxTestData?.discoveredMax
  );

  if (maxTestSessions.length === 0) return null;

  maxTestSessions.sort((a, b) => b.date.getTime() - a.date.getTime());
  return maxTestSessions[0].trainingData.maxTestData!.discoveredMax!;
}
