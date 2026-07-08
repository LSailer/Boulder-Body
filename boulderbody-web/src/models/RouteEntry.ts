/**
 * RouteEntry.ts
 *
 * A single logged route within a Routes session. Unlike a volume BoulderAttempt
 * — where the whole session shares one target level — every route carries its
 * own difficulty `level`, so a session can span several grades.
 */

/**
 * Outcome of a route attempt.
 * - flash: topped on the first try
 * - send:  topped after multiple tries
 * - fail:  did not top
 */
export type RouteResult = 'flash' | 'send' | 'fail';

/**
 * Represents a single route logged during a Routes session.
 */
export interface RouteEntry {
  /** Unique identifier for this route */
  id: string;

  /** Order in which it was logged within the session (1-indexed) */
  order: number;

  /** Difficulty level at the gym (1…gym.maxLevel) */
  level: number;

  /** Outcome of the attempt */
  result: RouteResult;

  /** Optional note about this route */
  comment?: string;

  /** When this route was logged */
  timestamp?: Date;
}
