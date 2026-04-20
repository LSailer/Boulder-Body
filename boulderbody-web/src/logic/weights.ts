/**
 * weights.ts
 *
 * Pure weight-math helpers for training sessions.
 */

import type { TrainingSet } from '../models/SessionType';

const PLATE_INCREMENT = 2.5;
const WORKING_SET_BUFFER = 0.8;
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
 * Compute today's working weight for an exercise from the discovered max.
 * Floor (not round) so the first working set is never heavier than 80% of max.
 *
 * @example workingWeightForMax(35) === 27.5 // 35 * 0.8 = 28 → floor to 27.5
 * @example workingWeightForMax(30) === 24   // 30 * 0.8 = 24 → already 2.5-aligned
 * @example workingWeightForMax(0)  === 0    // bodyweight stays bodyweight
 */
export function workingWeightForMax(max: number): number {
  return roundTo2_5(max * WORKING_SET_BUFFER);
}

/**
 * Generate 3 working sets for a given exercise at 80% of discovered max (floored).
 * Called after the user signals "No more" during max-test.
 *
 * @param max    Discovered max for the exercise (kg added, 0 = bodyweight).
 * @param exercise Which exercise these sets belong to. Affects `order` numbering
 *                 (working sets continue numbering after max-test sets, so `startOrder`
 *                 carries the running total).
 * @param startOrder The 1-based `order` for the first working set. The caller knows
 *                   how many max-test sets preceded these working sets.
 */
export function generateWorkingSets(
  max: number,
  exercise: TrainingSet['exercise'],
  startOrder: number
): TrainingSet[] {
  const weight = workingWeightForMax(max);
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
