/**
 * TrainingRecommender.ts
 *
 * Calculates starting weights for the next training session.
 *
 * Hang and pull-up now use a max-test protocol: today's starting weight is
 * 80% of last session's discovered max (floored to 2.5kg). The max-test
 * itself serves as the warmup, so there's no ramp-up branching here.
 *
 * Bench and trap-bar remain fixed-weight with simple linear progression:
 * +2.5kg when all sets completed, maintain when incomplete.
 */

import type { TrainingSession } from '../models/Session';
import { isExerciseComplete } from '../models/SessionType';
import { workingWeightForMax } from './weights';

export interface TrainingRecommendation {
  /** Starting weight for today's hang max-test (kg added, 0 = bodyweight) */
  hangStart: number;
  /** Starting weight for today's pull-up max-test (kg added, 0 = bodyweight) */
  pullupStart: number;
  /** Fixed bench weight for today's session */
  benchWeight: number;
  /** Fixed trap-bar weight for today's session */
  trapBarWeight: number;
  /** Last session's discovered maxes — surfaced for display in StartView */
  lastMax?: { hang?: number; pullup?: number };
  /** Human-readable explanation of the recommendation */
  reason: string;
}

const DEFAULT_WEIGHT = 0; // Bodyweight (0kg added)
const DEFAULT_BENCH_WEIGHT = 10; // kg
const DEFAULT_TRAPBAR_WEIGHT = 20; // kg
const WEIGHT_INCREMENT = 2.5; // kg

/**
 * Calculate recommended starting weights for next training session.
 *
 * @param lastTrainingSession Most recent finished training session, or null for first session.
 * @returns Starting weights + last-max context for display.
 */
export function getTrainingRecommendation(
  lastTrainingSession: TrainingSession | null
): TrainingRecommendation {
  if (!lastTrainingSession) {
    return {
      hangStart: DEFAULT_WEIGHT,
      pullupStart: DEFAULT_WEIGHT,
      benchWeight: DEFAULT_BENCH_WEIGHT,
      trapBarWeight: DEFAULT_TRAPBAR_WEIGHT,
      reason: 'First session — starting with bodyweight',
    };
  }

  const { trainingData } = lastTrainingSession;
  const lastHangMax = trainingData.discoveredMax?.hang;
  const lastPullupMax = trainingData.discoveredMax?.pullup;

  // Starting weight = 80% of last discovered max, floored. No max → start at bodyweight.
  const hangStart = lastHangMax != null ? workingWeightForMax(lastHangMax) : DEFAULT_WEIGHT;
  const pullupStart = lastPullupMax != null ? workingWeightForMax(lastPullupMax) : DEFAULT_WEIGHT;

  // Bench / trap-bar: +2.5kg when all sets completed, else maintain.
  const benchComplete = isExerciseComplete(trainingData.benchSets);
  const trapBarComplete = isExerciseComplete(trainingData.trapBarSets);

  const prevBench = trainingData.benchWeight ?? DEFAULT_BENCH_WEIGHT;
  const prevTrapBar = trainingData.trapBarWeight ?? DEFAULT_TRAPBAR_WEIGHT;

  const benchWeight = benchComplete ? prevBench + WEIGHT_INCREMENT : prevBench;
  const trapBarWeight = trapBarComplete ? prevTrapBar + WEIGHT_INCREMENT : prevTrapBar;

  return {
    hangStart,
    pullupStart,
    benchWeight,
    trapBarWeight,
    lastMax: { hang: lastHangMax, pullup: lastPullupMax },
    reason: `Starting from last working weight (hang ${hangStart}kg, pullup ${pullupStart}kg)`,
  };
}
