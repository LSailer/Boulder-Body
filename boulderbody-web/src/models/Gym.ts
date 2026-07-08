/**
 * Gym.ts
 *
 * A climbing gym with its own numbered difficulty scale. Route sessions are
 * logged against a gym, and summary comparisons are scoped to the same gym so
 * "harder" and "easier" mean the same thing across the sessions being compared.
 *
 * Gyms are persisted separately from sessions (localStorage key
 * `boulderbody_gyms`) so they can be reused across sessions.
 */
export interface Gym {
  /** Unique identifier */
  id: string;

  /** Display name, e.g. "Boulderhalle Ost" */
  name: string;

  /**
   * Highest difficulty level offered by this gym. The gym's scale is the
   * integers 1…maxLevel — most gyms number their grades this way.
   */
  maxLevel: number;
}
