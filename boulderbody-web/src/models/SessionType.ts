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
  exercise: 'hang' | 'pullup';
  completed: boolean;
  timestamp?: Date;
  notes?: string;
}

/**
 * Training session data structure.
 * Tracks separate weights for hangs and pull-ups, allowing independent progression.
 */
export interface TrainingData {
  hangWeight: number; // kg added (0 = bodyweight)
  pullupWeight: number; // kg added (0 = bodyweight)
  hangSets: TrainingSet[]; // Always 5 sets
  pullupSets: TrainingSet[]; // Always 5 sets
  allSetsCompleted: boolean; // true only if all 10 sets done
}

/**
 * Training protocol constants.
 * Based on standard max strength training principles:
 * - Max hangs: 7 seconds × 3 reps with 4 min rest
 * - Max pull-ups: 3 reps with 4 min rest
 */
export const TRAINING_PROTOCOL = {
  hangSets: 5,
  hangDuration: 7, // seconds per hang
  hangReps: 3, // hangs per set
  pullupSets: 5,
  pullupReps: 3, // pull-ups per set
  restBetweenSets: 240, // 4 minutes in seconds (mandatory)
} as const;
