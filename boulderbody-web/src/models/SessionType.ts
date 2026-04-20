/**
 * SessionType.ts
 *
 * Defines training session data models and protocol constants.
 * Training sessions discover today's max per exercise (max-test) and run working
 * sets at 80% of that max. Bench and trap-bar are fixed-weight (unchanged).
 */

export type SessionType = 'volume' | 'training';

/**
 * Represents a single set within a training session.
 *
 * `setType` distinguishes max-test sets (variable weight, +2.5kg per step) from
 * working sets (fixed at 80% of discovered max) for hang and pull-up. Undefined
 * for bench and trap-bar, which use a single fixed weight per session.
 */
export interface TrainingSet {
  id: string;
  order: number;
  exercise: 'hang' | 'pullup' | 'bench' | 'trapbar';
  completed: boolean;
  timestamp?: Date;
  notes?: string;
  setType?: 'maxtest' | 'working';
  weight?: number;
}

/**
 * Training session data structure.
 *
 * For hang and pull-up, sets are split into max-test (N sets at +2.5kg steps)
 * and working (3 sets at 80% of discovered max, floored). Bench and trap-bar
 * remain fixed-weight (5 × 3).
 */
export interface TrainingData {
  benchWeight?: number;
  trapBarWeight?: number;
  hangSets: TrainingSet[];
  pullupSets: TrainingSet[];
  benchSets?: TrainingSet[];
  trapBarSets?: TrainingSet[];
  /**
   * Discovered max per exercise for this session.
   * Populated as the user completes each max-test phase.
   */
  discoveredMax?: {
    hang?: number;
    pullup?: number;
  };
}

/**
 * Training protocol constants.
 * Hang and pull-up: 3 working sets × 3 reps after max-test.
 * Bench and trap-bar: 5 sets × 3 reps (unchanged).
 */
export const TRAINING_PROTOCOL = {
  hangDuration: 7,
  maxTestHangDuration: 5,
  hangReps: 3,
  pullupReps: 3,
  benchSets: 5,
  benchReps: 3,
  trapBarSets: 5,
  trapBarReps: 3,
  restBetweenSets: 180,
  prepBeforeHang: 5,
} as const;

/**
 * Returns true if all sets in the array are completed.
 * Returns false if array is undefined, empty, or has incomplete sets.
 */
export function isExerciseComplete(sets: TrainingSet[] | undefined): boolean {
  return !!sets && sets.length > 0 && sets.every((s) => s.completed);
}
