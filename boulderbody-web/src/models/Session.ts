import type { BoulderAttempt } from './BoulderAttempt';
import type { RouteEntry, RouteResult } from './RouteEntry';
import type { SessionType, TrainingData, TrainingSet } from './SessionType';

// Re-export TrainingSet for convenience
export type { TrainingSet };

/**
 * Base properties shared by all session types.
 * Using discriminated union pattern for type safety.
 */
interface BaseSession {
  /** Unique identifier */
  id: string;

  /** Date when session was created */
  date: Date;

  /** When the session started (for duration tracking) */
  startTime: Date;

  /** When the session finished (undefined if still active) */
  endTime?: Date;

  /** Whether this session has been completed */
  isFinished: boolean;

  /** Discriminator field for TypeScript type narrowing */
  sessionType: SessionType;
}

/**
 * Volume session - tracks boulder attempts at a target difficulty level.
 * This is the original BoulderBody session type.
 */
export interface VolumeSession extends BaseSession {
  sessionType: 'volume';

  /** Target difficulty level for this session */
  targetLevel: number;

  /** Total number of boulders to attempt */
  boulderCount: number;

  /** Array of boulder attempts */
  attempts: BoulderAttempt[];
}

/**
 * Training session - tracks max hangs and max pull-ups with structured sets.
 * Uses separate weight tracking for independent progression.
 */
export interface TrainingSession extends BaseSession {
  sessionType: 'training';

  /** Training-specific data (weights, sets, completion status) */
  trainingData: TrainingData;
}

/**
 * Route session - logs individual routes, each with its own difficulty level,
 * at a chosen gym. Every route is one of flash/send/fail. Unlike a volume
 * session there is no single targetLevel and no preset count — routes are added
 * open-endedly as they're climbed.
 */
export interface RouteSession extends BaseSession {
  sessionType: 'route';

  /** Gym this session was logged at (comparisons are scoped to it) */
  gymId: string;

  /** Gym name, denormalized so summaries render without a gym lookup */
  gymName: string;

  /** Gym's highest level at session time (its scale is 1…maxLevel) */
  maxLevel: number;

  /** Routes logged during the session, in log order */
  routes: RouteEntry[];
}

/**
 * Union type representing any valid session.
 * Use type guards (isVolumeSession, isTrainingSession, isRouteSession) to
 * safely narrow types.
 */
export type Session = VolumeSession | TrainingSession | RouteSession;

/**
 * Type guard to check if a session is a volume session.
 * Use this before accessing volume-specific properties like targetLevel.
 */
export function isVolumeSession(session: Session): session is VolumeSession {
  return session.sessionType === 'volume';
}

/**
 * Type guard to check if a session is a training session.
 * Use this before accessing training-specific properties like trainingData.
 */
export function isTrainingSession(session: Session): session is TrainingSession {
  return session.sessionType === 'training';
}

/**
 * Type guard to check if a session is a route session.
 * Use this before accessing route-specific properties like routes/gymId.
 */
export function isRouteSession(session: Session): session is RouteSession {
  return session.sessionType === 'route';
}

/**
 * Calculate the duration of a session as a human-readable string.
 * @param session The session to calculate duration for
 * @returns Formatted duration string (e.g., "1h 23m" or "45m")
 */
export function getSessionDuration(session: Session): string {
  if (!session.endTime) {
    return 'In progress';
  }

  const ms = session.endTime.getTime() - session.startTime.getTime();
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Calculate fail rate for a volume session.
 * Unlogged attempts count as fails (stricter approach).
 * @param session The volume session to calculate fail rate for
 * @returns Fail rate as a percentage (0-100)
 */
export function getFailRate(session: VolumeSession): number {
  if (session.boulderCount === 0) {
    return 0;
  }

  const failCount = session.attempts.filter(
    (a) => a.result === 'fail' || a.result === undefined
  ).length;

  return (failCount / session.boulderCount) * 100;
}

/**
 * Get count of attempts by result type for a volume session.
 * @param session The volume session to count attempts for
 * @returns Object with counts for flash, done, fail, and unlogged attempts
 */
export function getAttemptCounts(session: VolumeSession) {
  return {
    flash: session.attempts.filter((a) => a.result === 'flash').length,
    done: session.attempts.filter((a) => a.result === 'done').length,
    fail: session.attempts.filter((a) => a.result === 'fail').length,
    unlogged: session.attempts.filter((a) => a.result === undefined).length,
  };
}

/**
 * Count logged routes by outcome for a route session.
 * @param routes The routes to count (a session's `routes`, or a per-level subset)
 * @returns Object with counts for flash, send, fail and the total
 */
export function getRouteCounts(routes: RouteEntry[]) {
  const counts = { flash: 0, send: 0, fail: 0, total: routes.length };
  for (const r of routes) {
    counts[r.result] += 1;
  }
  return counts;
}

/**
 * Percentage split of routes across the three outcomes. Percentages are rounded
 * to whole numbers and may not sum to exactly 100.
 * @param routes The routes to summarize
 * @returns Percent (0-100) for each outcome; 0 for every outcome when empty
 */
export function getRoutePercentages(routes: RouteEntry[]): Record<RouteResult, number> {
  const { flash, send, fail, total } = getRouteCounts(routes);
  if (total === 0) return { flash: 0, send: 0, fail: 0 };
  return {
    flash: Math.round((flash / total) * 100),
    send: Math.round((send / total) * 100),
    fail: Math.round((fail / total) * 100),
  };
}
