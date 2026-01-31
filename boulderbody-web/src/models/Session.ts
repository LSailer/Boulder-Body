import type { BoulderAttempt } from './BoulderAttempt';

/**
 * Represents a complete bouldering session.
 */
export interface Session {
  /** Unique identifier */
  id: string;

  /** Date when session was created */
  date: Date;

  /** When the session started (for duration tracking) */
  startTime: Date;

  /** When the session finished (undefined if still active) */
  endTime?: Date;

  /** Target difficulty level for this session */
  targetLevel: number;

  /** Total number of boulders to attempt */
  boulderCount: number;

  /** Whether this session has been completed */
  isFinished: boolean;

  /** Array of boulder attempts */
  attempts: BoulderAttempt[];
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
 * Calculate fail rate for a session.
 * Unlogged attempts count as fails (stricter approach).
 * @param session The session to calculate fail rate for
 * @returns Fail rate as a percentage (0-100)
 */
export function getFailRate(session: Session): number {
  if (session.boulderCount === 0) {
    return 0;
  }

  const failCount = session.attempts.filter(
    (a) => a.result === 'fail' || a.result === undefined
  ).length;

  return (failCount / session.boulderCount) * 100;
}

/**
 * Get count of attempts by result type.
 * @param session The session to count attempts for
 * @returns Object with counts for flash, done, fail, and unlogged attempts
 */
export function getAttemptCounts(session: Session) {
  return {
    flash: session.attempts.filter((a) => a.result === 'flash').length,
    done: session.attempts.filter((a) => a.result === 'done').length,
    fail: session.attempts.filter((a) => a.result === 'fail').length,
    unlogged: session.attempts.filter((a) => a.result === undefined).length,
  };
}
