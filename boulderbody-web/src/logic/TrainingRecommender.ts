/**
 * TrainingRecommender.ts
 *
 * Calculates weight progression for training sessions.
 * Uses simple linear progression: +2.5kg when all sets completed, maintain when incomplete.
 * Hangs and pull-ups progress independently.
 */

import type { TrainingSession } from '../models/Session';
import { isExerciseComplete } from '../models/SessionType';

export interface TrainingRecommendation {
  hangWeight: number;
  pullupWeight: number;
  benchWeight: number;
  trapBarWeight: number;
  reason: string;
}

const DEFAULT_WEIGHT = 0; // Bodyweight (0kg added)
const DEFAULT_BENCH_WEIGHT = 10; // kg
const DEFAULT_TRAPBAR_WEIGHT = 20; // kg
const WEIGHT_INCREMENT = 2.5; // kg

/**
 * Calculate recommended weights for next training session.
 *
 * Algorithm:
 * 1. If no previous session: Return all defaults
 * 2. For each exercise independently:
 *    - All 5 sets completed → Add 2.5kg
 *    - Incomplete or absent sets → Keep same weight
 *
 * @param lastTrainingSession Most recent finished training session, or null for first session
 * @returns Recommended weights and explanation
 */
export function getTrainingRecommendation(
  lastTrainingSession: TrainingSession | null
): TrainingRecommendation {
  if (!lastTrainingSession) {
    return {
      hangWeight: DEFAULT_WEIGHT,
      pullupWeight: DEFAULT_WEIGHT,
      benchWeight: DEFAULT_BENCH_WEIGHT,
      trapBarWeight: DEFAULT_TRAPBAR_WEIGHT,
      reason: 'First session — starting with defaults',
    };
  }

  const { trainingData } = lastTrainingSession;

  const hangComplete = isExerciseComplete(trainingData.hangSets);
  const pullupComplete = isExerciseComplete(trainingData.pullupSets);
  const benchComplete = isExerciseComplete(trainingData.benchSets);
  const trapBarComplete = isExerciseComplete(trainingData.trapBarSets);

  const newHangWeight = hangComplete
    ? trainingData.hangWeight + WEIGHT_INCREMENT
    : trainingData.hangWeight;

  const newPullupWeight = pullupComplete
    ? trainingData.pullupWeight + WEIGHT_INCREMENT
    : trainingData.pullupWeight;

  const newBenchWeight = benchComplete
    ? (trainingData.benchWeight ?? DEFAULT_BENCH_WEIGHT) + WEIGHT_INCREMENT
    : (trainingData.benchWeight ?? DEFAULT_BENCH_WEIGHT);

  const newTrapBarWeight = trapBarComplete
    ? (trainingData.trapBarWeight ?? DEFAULT_TRAPBAR_WEIGHT) + WEIGHT_INCREMENT
    : (trainingData.trapBarWeight ?? DEFAULT_TRAPBAR_WEIGHT);

  const completed = [hangComplete, pullupComplete, benchComplete, trapBarComplete];
  const completedCount = completed.filter(Boolean).length;

  let reason = '';
  if (completedCount === 4) {
    reason = `All exercises complete (+${WEIGHT_INCREMENT}kg each)`;
  } else if (completedCount === 0) {
    reason = 'No exercises completed — maintain weights';
  } else {
    const names = ['hangs', 'pull-ups', 'bench', 'trap bar'];
    const progressed = names.filter((_, i) => completed[i]).join(', ');
    reason = `${progressed} +${WEIGHT_INCREMENT}kg, others same`;
  }

  return {
    hangWeight: newHangWeight,
    pullupWeight: newPullupWeight,
    benchWeight: newBenchWeight,
    trapBarWeight: newTrapBarWeight,
    reason,
  };
}
