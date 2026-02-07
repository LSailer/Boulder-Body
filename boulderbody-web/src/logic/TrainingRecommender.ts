/**
 * TrainingRecommender.ts
 *
 * Calculates weight progression for training sessions.
 * Uses simple linear progression: +2.5kg when all sets completed, maintain when incomplete.
 * Hangs and pull-ups progress independently.
 */

import type { TrainingSession } from '../models/Session';

export interface TrainingRecommendation {
  hangWeight: number;
  pullupWeight: number;
  reason: string;
}

const DEFAULT_WEIGHT = 0; // Bodyweight (0kg added)
const WEIGHT_INCREMENT = 2.5; // kg

/**
 * Calculate recommended weights for next training session.
 *
 * Algorithm:
 * 1. If no previous session: Start with bodyweight (0kg)
 * 2. For each exercise independently:
 *    - All 5 sets completed → Add 2.5kg
 *    - Incomplete sets → Keep same weight
 *
 * This encourages full completion before increasing difficulty.
 *
 * @param lastTrainingSession Most recent finished training session, or null for first session
 * @returns Recommended weights and explanation
 */
export function getTrainingRecommendation(
  lastTrainingSession: TrainingSession | null
): TrainingRecommendation {
  // First training session - start with bodyweight
  if (!lastTrainingSession) {
    return {
      hangWeight: DEFAULT_WEIGHT,
      pullupWeight: DEFAULT_WEIGHT,
      reason: 'Starting with bodyweight',
    };
  }

  const { trainingData } = lastTrainingSession;

  // Check completion independently for each exercise
  const hangComplete = trainingData.hangSets.every((s) => s.completed);
  const pullupComplete = trainingData.pullupSets.every((s) => s.completed);

  // Calculate new weights
  const newHangWeight = hangComplete
    ? trainingData.hangWeight + WEIGHT_INCREMENT
    : trainingData.hangWeight;

  const newPullupWeight = pullupComplete
    ? trainingData.pullupWeight + WEIGHT_INCREMENT
    : trainingData.pullupWeight;

  // Generate reason message
  let reason = '';
  if (hangComplete && pullupComplete) {
    reason = `All sets completed (+${WEIGHT_INCREMENT}kg both)`;
  } else if (hangComplete) {
    reason = `Hangs +${WEIGHT_INCREMENT}kg, pull-ups same (incomplete)`;
  } else if (pullupComplete) {
    reason = `Pull-ups +${WEIGHT_INCREMENT}kg, hangs same (incomplete)`;
  } else {
    reason = 'Both incomplete (maintain weights)';
  }

  return {
    hangWeight: newHangWeight,
    pullupWeight: newPullupWeight,
    reason,
  };
}
