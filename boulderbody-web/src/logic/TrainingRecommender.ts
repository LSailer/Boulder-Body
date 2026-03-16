/**
 * TrainingRecommender.ts
 *
 * Calculates weight progression for training sessions.
 * Uses simple linear progression: +2.5kg when all sets completed, maintain when incomplete.
 * Hangs and pull-ups progress independently.
 *
 * Also handles post-break ramp-up detection: when >7 days since last session,
 * suggests a ramp-up session starting at 80% of target weight.
 */

import type { TrainingSession } from '../models/Session';
import { isExerciseComplete } from '../models/SessionType';

export interface TrainingRecommendation {
  hangWeight: number;
  pullupWeight: number;
  benchWeight: number;
  trapBarWeight: number;
  reason: string;
  suggestRampUp?: boolean;
  preBreakWeights?: {
    hang: number;
    pullup: number;
    bench: number;
    trapbar: number;
  };
}

const DEFAULT_WEIGHT = 0; // Bodyweight (0kg added)
const DEFAULT_BENCH_WEIGHT = 10; // kg
const DEFAULT_TRAPBAR_WEIGHT = 20; // kg
const WEIGHT_INCREMENT = 2.5; // kg
const BREAK_THRESHOLD_DAYS = 7;

/**
 * Calculate recommended weights for next training session.
 *
 * Algorithm:
 * 1. If no previous session: Return all defaults
 * 2. If previous session was a ramp-up: check if recovered, suggest another ramp-up if not
 * 3. If >7 days since last session: suggest ramp-up at 80% of target weights
 * 4. For each exercise independently:
 *    - All sets completed → Add 2.5kg
 *    - Incomplete or absent sets → Keep same weight
 *
 * @param lastTrainingSession Most recent finished training session, or null for first session
 * @param daysSinceLastSession Days since last training session, or null if unknown
 * @returns Recommended weights and explanation
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
      trapBarWeight: DEFAULT_TRAPBAR_WEIGHT,
      reason: 'First session — starting with defaults',
    };
  }

  const { trainingData } = lastTrainingSession;

  // Calculate normal progression weights first
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

  // Check if last session was a ramp-up with incomplete recovery
  if (trainingData.rampUp) {
    const { preBreakWeights, discoveredMax } = trainingData.rampUp;
    const allRecovered =
      (discoveredMax?.hang ?? 0) >= preBreakWeights.hang &&
      (discoveredMax?.pullup ?? 0) >= preBreakWeights.pullup &&
      (discoveredMax?.bench ?? 0) >= preBreakWeights.bench &&
      (discoveredMax?.trapbar ?? 0) >= preBreakWeights.trapbar;

    if (allRecovered) {
      // Fully recovered — resume normal progression from discovered max
      return {
        hangWeight: (discoveredMax?.hang ?? preBreakWeights.hang) + WEIGHT_INCREMENT,
        pullupWeight: (discoveredMax?.pullup ?? preBreakWeights.pullup) + WEIGHT_INCREMENT,
        benchWeight: (discoveredMax?.bench ?? preBreakWeights.bench) + WEIGHT_INCREMENT,
        trapBarWeight: (discoveredMax?.trapbar ?? preBreakWeights.trapbar) + WEIGHT_INCREMENT,
        reason: `Back to pre-break levels — resuming +${WEIGHT_INCREMENT}kg progression`,
      };
    } else {
      // Still recovering — suggest another ramp-up
      return {
        hangWeight: newHangWeight,
        pullupWeight: newPullupWeight,
        benchWeight: newBenchWeight,
        trapBarWeight: newTrapBarWeight,
        reason: 'Still recovering from break — ramp-up suggested',
        suggestRampUp: true,
        preBreakWeights,
      };
    }
  }

  // Check for break (>7 days since last session)
  if (daysSinceLastSession != null && daysSinceLastSession > BREAK_THRESHOLD_DAYS) {
    return {
      hangWeight: newHangWeight,
      pullupWeight: newPullupWeight,
      benchWeight: newBenchWeight,
      trapBarWeight: newTrapBarWeight,
      reason: `${daysSinceLastSession} days since last training — ramp-up recommended`,
      suggestRampUp: true,
      preBreakWeights: {
        hang: newHangWeight,
        pullup: newPullupWeight,
        bench: newBenchWeight,
        trapbar: newTrapBarWeight,
      },
    };
  }

  // Normal progression
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
