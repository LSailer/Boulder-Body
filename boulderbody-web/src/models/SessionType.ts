/**
 * SessionType.ts
 *
 * Defines training session data models and protocol constants.
 * Training sessions support two modes:
 *   - normal: 5 sets of 3 reps per exercise at fixed weight
 *   - maxtest: warm-up → find 1RM → 3-4 training sets at max-7.5kg
 */

export type SessionType = 'volume' | 'training';
export type TrainingMode = 'normal' | 'maxtest';
export type ExerciseKey = 'hang' | 'pullup' | 'bench';

/**
 * Represents a single set within a training session.
 */
export interface TrainingSet {
  id: string;
  order: number;
  exercise: ExerciseKey;
  completed: boolean;
  timestamp?: Date;
  notes?: string;
  setType?: 'warmup' | 'maxtest' | 'training';
  weight?: number; // per-set weight (max test sets vary in weight)
}

/**
 * Max test session data.
 * Tracks starting weights, discovered maxes, and previous maxes for comparison.
 */
export interface MaxTestData {
  startingWeights: {
    hang: number;
    pullup: number;
    bench: number;
  };
  discoveredMax?: {
    hang?: number;
    pullup?: number;
    bench?: number;
  };
  /** Previous max from last max test session, for delta display in summary */
  previousMax?: {
    hang?: number;
    pullup?: number;
    bench?: number;
  };
}

/**
 * Training session data structure.
 * Tracks separate weights for each exercise with independent progression.
 */
export interface TrainingData {
  trainingMode: TrainingMode;
  hangWeight: number; // kg added (0 = bodyweight)
  pullupWeight: number; // kg added (0 = bodyweight)
  benchWeight: number; // kg
  hangSets: TrainingSet[];
  pullupSets: TrainingSet[];
  benchSets: TrainingSet[];
  maxTestData?: MaxTestData; // only present in maxtest sessions
}

/**
 * Training protocol constants.
 */
export const TRAINING_PROTOCOL = {
  // Hang specifics
  hangDuration: 7, // seconds per hang

  // Warm-up protocol (per exercise)
  warmup: {
    hang: { set1Duration: 10, set2Duration: 15, restBetween: 30, restAfter: 180 },
    pullup: { set1Reps: 5, set2Reps: 3, restBetween: 30, restAfter: 180 },
    bench: { set1Reps: 5, set2Reps: 3, restBetween: 30, restAfter: 180 },
  },

  // Normal training session
  training: {
    sets: 5,
    reps: 3,
    restBetweenSets: 180,
  },

  // Max test session
  maxTest: {
    weightIncrement: 2.5,
    trainingOffset: 7.5, // training weight = max - 7.5kg
    trainingSets: 3, // base training sets after max found
    maxTrainingSets: 4, // can add 1 optional extra
    trainingReps: 3,
    restBetweenSets: 180,
  },

  // Rest between exercises
  restBetweenExercises: 180,
} as const;

/**
 * Returns true if all sets in the array are completed.
 * Returns false if array is undefined, empty, or has incomplete sets.
 */
export function isExerciseComplete(sets: TrainingSet[] | undefined): boolean {
  return !!sets && sets.length > 0 && sets.every((s) => s.completed);
}
