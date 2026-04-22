/**
 * BadgeEngine.ts
 *
 * Pure function to evaluate which badges a just-finished session unlocks.
 * Called from ActiveSessionView / TrainingSessionView on Finish — new badges
 * are persisted via StorageManager.addBadges() and surfaced in Summary.
 */

import type { Session, TrainingSession, VolumeSession } from '../models/Session';
import { isTrainingSession, isVolumeSession } from '../models/Session';
import type { BadgeId, EarnedBadge } from '../models/Gamification';
import { computeStreak, sessionsInRollingWeek } from './XPCalculator';

function has(existing: EarnedBadge[], id: BadgeId): boolean {
  return existing.some((b) => b.id === id);
}

function hasAnySend(session: VolumeSession): boolean {
  return session.attempts.some((a) => a.result === 'flash');
}

function maxHangAcross(sessions: TrainingSession[]): number {
  let m = 0;
  for (const s of sessions) {
    const v = s.trainingData.discoveredMax?.hang;
    if (v != null && v > m) m = v;
  }
  return m;
}

function maxPullupAcross(sessions: TrainingSession[]): number {
  let m = 0;
  for (const s of sessions) {
    const v = s.trainingData.discoveredMax?.pullup;
    if (v != null && v > m) m = v;
  }
  return m;
}

/**
 * Returns net-new badges unlocked by the just-finished session.
 *
 * @param justFinished The session that was just marked finished.
 * @param allFinished All finished sessions (including justFinished).
 * @param alreadyEarned Badges already recorded.
 */
export function evaluateBadges(
  justFinished: Session,
  allFinished: Session[],
  alreadyEarned: EarnedBadge[]
): EarnedBadge[] {
  const unlocks: EarnedBadge[] = [];
  const now = justFinished.endTime ?? new Date();
  const volumes = allFinished.filter(isVolumeSession);
  const trainings = allFinished.filter(isTrainingSession);

  const push = (id: BadgeId) => {
    if (!has(alreadyEarned, id) && !has(unlocks, id)) {
      unlocks.push({ id, unlockedAt: now, sessionId: justFinished.id });
    }
  };

  // first_send — any finished volume session has a flash.
  if (!has(alreadyEarned, 'first_send') && volumes.some(hasAnySend)) {
    push('first_send');
  }

  // first_v6 — a finished volume session at level >= 6 with at least one send.
  if (
    !has(alreadyEarned, 'first_v6') &&
    volumes.some((v) => v.targetLevel >= 6 && hasAnySend(v))
  ) {
    push('first_v6');
  }

  // consistent_week — 5+ sessions in the rolling 7-day window ending today.
  if (
    !has(alreadyEarned, 'consistent_week') &&
    sessionsInRollingWeek(allFinished) >= 5
  ) {
    push('consistent_week');
  }

  // streak_7 / streak_14
  const streak = computeStreak(allFinished);
  if (!has(alreadyEarned, 'streak_7') && streak >= 7) push('streak_7');
  if (!has(alreadyEarned, 'streak_14') && streak >= 14) push('streak_14');

  // hang_pr / pullup_pr — training session that discovered a max strictly higher
  // than all prior discovered maxes.
  if (isTrainingSession(justFinished)) {
    const thisHang = justFinished.trainingData.discoveredMax?.hang;
    const thisPull = justFinished.trainingData.discoveredMax?.pullup;
    const others = trainings.filter((t) => t.id !== justFinished.id);
    const priorHang = maxHangAcross(others);
    const priorPull = maxPullupAcross(others);

    if (thisHang != null && thisHang > priorHang) push('hang_pr');
    if (thisPull != null && thisPull > priorPull) push('pullup_pr');
  }

  return unlocks;
}
