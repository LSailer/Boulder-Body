/**
 * TrainingRecommender.ts
 *
 * Calculates starting weights for the next training session.
 *
 * Hang and pull-up use a ramped max-test protocol: today starts 10kg below
 * last session's working weight and steps +5kg until it reaches that working
 * weight, then +2.5kg per step (normal max-test). The ramp-up doubles as
 * warmup, so there's no separate warmup phase.
 *
 * Bench and trap-bar remain fixed-weight with simple linear progression:
 * +2.5kg when all sets completed, maintain when incomplete.
 */

import type { TrainingSession } from '../models/Session';
import type { TrainingSet } from '../models/SessionType';
import { isExerciseComplete } from '../models/SessionType';

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
  /**
   * Last session's working weight per exercise — the cap at which today's
   * ramp-up (+5kg) flips to normal max-test stepping (+2.5kg). Persisted
   * into the session's `trainingData.rampUpCap` when the session starts.
   */
  lastWorking?: { hang?: number; pullup?: number };
  /** Human-readable explanation of the recommendation */
  reason: string;
}

const DEFAULT_WEIGHT = 0; // Bodyweight (0kg added)
const DEFAULT_BENCH_WEIGHT = 10; // kg
const DEFAULT_TRAPBAR_WEIGHT = 20; // kg
const PLATE_INCREMENT = 2.5; // kg
const RAMP_UP_OFFSET = 10; // kg below last working weight for today's start

function firstWorkingWeight(sets: TrainingSet[] | undefined): number | undefined {
  return sets?.find((s) => s.setType === 'working')?.weight;
}

/**
 * Calculate recommended starting weights for next training session.
 *
 * @param lastTrainingSession Most recent finished training session, or null for first session.
 * @returns Starting weights + last-session context for display and ramp-up.
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

  const lastWorkingHang = firstWorkingWeight(trainingData.hangSets);
  const lastWorkingPull = firstWorkingWeight(trainingData.pullupSets);

  // Starting weight = last working weight - 10kg, bounded at bodyweight.
  // If no working sets were recorded last session, fall back to bodyweight.
  const hangStart =
    lastWorkingHang != null ? Math.max(0, lastWorkingHang - RAMP_UP_OFFSET) : DEFAULT_WEIGHT;
  const pullupStart =
    lastWorkingPull != null ? Math.max(0, lastWorkingPull - RAMP_UP_OFFSET) : DEFAULT_WEIGHT;

  // Bench / trap-bar: +2.5kg when all sets completed, else maintain.
  const benchComplete = isExerciseComplete(trainingData.benchSets);
  const trapBarComplete = isExerciseComplete(trainingData.trapBarSets);

  const prevBench = trainingData.benchWeight ?? DEFAULT_BENCH_WEIGHT;
  const prevTrapBar = trainingData.trapBarWeight ?? DEFAULT_TRAPBAR_WEIGHT;

  const benchWeight = benchComplete ? prevBench + PLATE_INCREMENT : prevBench;
  const trapBarWeight = trapBarComplete ? prevTrapBar + PLATE_INCREMENT : prevTrapBar;

  const reason =
    lastWorkingHang != null || lastWorkingPull != null
      ? `Starting 10kg below last working weight (hang ${hangStart}kg, pullup ${pullupStart}kg)`
      : 'No working sets recorded last session — starting with bodyweight';

  return {
    hangStart,
    pullupStart,
    benchWeight,
    trapBarWeight,
    lastMax: { hang: lastHangMax, pullup: lastPullupMax },
    lastWorking: { hang: lastWorkingHang, pullup: lastWorkingPull },
    reason,
  };
}
