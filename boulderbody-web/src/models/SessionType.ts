/**
 * SessionType.ts
 *
 * Defines training session data models and protocol constants.
 * Training sessions track max hangs and max pull-ups with structured sets.
 */

export type SessionType = 'volume' | 'training';

/**
 * Represents a single set within a training session.
 * Each training session has 10 sets total (5 hangs + 5 pull-ups).
 */
export interface TrainingSet {
  id: string;
  order: number; // 1-5 (per exercise)
  exercise: 'hang' | 'pullup' | 'bench' | 'trapbar';
  completed: boolean;
  timestamp?: Date;
  notes?: string;
}

/**
 * Training session data structure.
 * Tracks separate weights for all exercises, allowing independent progression.
 */
export interface TrainingData {
  hangWeight: number; // kg added (0 = bodyweight)
  pullupWeight: number; // kg added (0 = bodyweight)
  benchWeight?: number; // default 10kg
  trapBarWeight?: number; // default 20kg
  hangSets: TrainingSet[]; // Always 5 sets
  pullupSets: TrainingSet[]; // Always 5 sets
  benchSets?: TrainingSet[]; // absent in old sessions
  trapBarSets?: TrainingSet[];
}

/**
 * Training protocol constants.
 * Based on standard max strength training principles:
 * - Max hangs: 7 seconds × 3 reps with 3 min rest
 * - Max pull-ups: 3 reps with 3 min rest
 * - Bench press: 3 reps with 3 min rest
 * - Trap bar deadlift: 3 reps with 3 min rest
 */
export const TRAINING_PROTOCOL = {
  hangSets: 5,
  hangDuration: 7, // seconds per hang
  hangReps: 3, // hangs per set
  pullupSets: 5,
  pullupReps: 3, // pull-ups per set
  benchSets: 5,
  benchReps: 3,
  trapBarSets: 5,
  trapBarReps: 3,
  restBetweenSets: 180, // 3 minutes in seconds
} as const;

/**
 * Returns true if all sets in the array are completed.
 * Returns false if array is undefined, empty, or has incomplete sets.
 */
export function isExerciseComplete(sets: TrainingSet[] | undefined): boolean {
  return !!sets && sets.length > 0 && sets.every((s) => s.completed);
}
