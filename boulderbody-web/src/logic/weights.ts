/**
 * weights.ts
 *
 * Pure weight-math helpers for training sessions.
 */

import type { TrainingSet } from '../models/SessionType';

const PLATE_INCREMENT = 2.5;
const WORKING_SET_DROP = 5;
const WORKING_SETS_PER_EXERCISE = 3;

/**
 * Floor a weight down to the nearest 2.5kg plate increment.
 *
 * @example roundTo2_5(22.5) === 22.5
 * @example roundTo2_5(22.8) === 22.5
 * @example roundTo2_5(28)   === 27.5
 * @example roundTo2_5(0)    === 0
 */
export function roundTo2_5(weight: number): number {
  return Math.floor(weight / PLATE_INCREMENT) * PLATE_INCREMENT;
}

/**
 * Today's working weight = the weight the user just failed, minus 5kg.
 * Bounded at 0 (bodyweight) and floored to a plate increment.
 */
export function workingWeightFromFailed(failed: number): number {
  return Math.max(0, roundTo2_5(failed - WORKING_SET_DROP));
}

/**
 * Generate 3 working sets for a given exercise at the supplied weight.
 * Called after the user signals "No more" during max-test; the caller is
 * responsible for computing the target weight (see `workingWeightFromFailed`).
 *
 * @param weight     Working weight for every set (kg added, 0 = bodyweight).
 * @param exercise   Which exercise these sets belong to.
 * @param startOrder The 1-based `order` for the first working set. The caller
 *                   knows how many max-test sets preceded these working sets.
 */
export function generateWorkingSets(
  weight: number,
  exercise: TrainingSet['exercise'],
  startOrder: number
): TrainingSet[] {
  const sets: TrainingSet[] = [];
  for (let i = 0; i < WORKING_SETS_PER_EXERCISE; i++) {
    sets.push({
      id: crypto.randomUUID(),
      order: startOrder + i,
      exercise,
      completed: false,
      setType: 'working',
      weight,
    });
  }
  return sets;
}
