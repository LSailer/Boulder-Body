/**
 * Result of a boulder attempt.
 * - flash: Climbed on first try
 * - done: Completed after multiple tries
 * - fail: Could not complete
 * - undefined: Not yet logged
 */
export type AttemptResult = 'flash' | 'done' | 'fail';

/**
 * Represents a single boulder attempt within a session.
 */
export interface BoulderAttempt {
  /** Unique identifier for this attempt */
  id: string;

  /** Order within the session (1-indexed) */
  order: number;

  /** Result of the attempt (undefined if not yet logged) */
  result?: AttemptResult;

  /** Optional comment/note about this boulder */
  comment?: string;

  /** When this attempt was logged (undefined if not yet logged) */
  timestamp?: Date;
}
