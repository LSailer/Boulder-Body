import type { VolumeSession } from '../models/Session';
import { getFailRate } from '../models/Session';

/**
 * Recommendation for the next volume bouldering session.
 */
export interface SessionRecommendation {
  /** Recommended difficulty level */
  level: number;

  /** Recommended number of boulders */
  boulderCount: number;

  /** Explanation of how this was calculated */
  reason: string;
}

/**
 * Default recommendation for new users with no session history.
 */
const DEFAULT_RECOMMENDATION: SessionRecommendation = {
  level: 5,
  boulderCount: 20,
  reason: 'Starting with default recommendation',
};

/**
 * Calculate recommended level and boulder count for next volume session.
 *
 * Algorithm:
 * 1. Start with the target level from last session
 * 2. Apply performance adjustment:
 *    - Fail rate < 25% → increase level by 1
 *    - Fail rate > 75% → decrease level by 1
 * 3. Apply time decay adjustment:
 *    - 8-14 days since last session → decrease level by 1
 *    - >14 days since last session → decrease level by 2
 * 4. Clamp level to minimum of 1
 *
 * @param lastSession The most recent finished volume session (or null if none)
 * @returns Recommendation for next volume session
 */
export function getRecommendation(
  lastSession: VolumeSession | null
): SessionRecommendation {
  // If no previous session, return default
  if (!lastSession) {
    return DEFAULT_RECOMMENDATION;
  }

  let level = lastSession.targetLevel;
  const reasons: string[] = [];

  // Step 1: Performance adjustment
  const failRate = getFailRate(lastSession);
  if (failRate < 25) {
    level += 1;
    reasons.push('Strong performance (+1 level)');
  } else if (failRate > 75) {
    level -= 1;
    reasons.push('High fail rate (-1 level)');
  } else {
    reasons.push('Consistent performance (same level)');
  }

  // Step 2: Time decay adjustment
  const daysSinceLastSession = Math.floor(
    (Date.now() - lastSession.date.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSinceLastSession > 14) {
    level -= 2;
    reasons.push(`${daysSinceLastSession} days since last session (-2 levels)`);
  } else if (daysSinceLastSession >= 8) {
    level -= 1;
    reasons.push(`${daysSinceLastSession} days since last session (-1 level)`);
  }

  // Step 3: Clamp to minimum level 1
  if (level < 1) {
    level = 1;
    reasons.push('(clamped to minimum level 1)');
  }

  return {
    level,
    boulderCount: lastSession.boulderCount, // Keep same boulder count
    reason: reasons.join(', '),
  };
}
