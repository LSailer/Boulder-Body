/**
 * XPCalculator.ts
 *
 * Pure functions for derived gamification metrics: XP per session, total XP,
 * level, and streak. None of these are persisted — they're recomputed from the
 * stored session array each time.
 */

import type { Session, TrainingSession, VolumeSession } from '../models/Session';
import { isVolumeSession, isTrainingSession } from '../models/Session';
import {
  XP_PER_SEND,
  XP_PER_TOP,
  XP_PER_PROJECT,
  XP_PER_HELD_SET,
  XP_PER_MAX_PR,
  XP_PER_LEVEL,
  type LevelInfo,
} from '../models/Gamification';

function computeVolumeXP(session: VolumeSession): number {
  let xp = 0;
  for (const a of session.attempts) {
    if (a.result === 'flash') xp += XP_PER_SEND;
    else if (a.result === 'done') xp += XP_PER_TOP;
    else if (a.result === 'fail') xp += XP_PER_PROJECT;
  }
  return xp;
}

function computeTrainingXP(session: TrainingSession): number {
  const { trainingData } = session;
  let xp = 0;

  const countHeld = (sets: { completed: boolean }[] | undefined) =>
    sets ? sets.filter((s) => s.completed).length : 0;

  xp += countHeld(trainingData.hangSets) * XP_PER_HELD_SET;
  xp += countHeld(trainingData.pullupSets) * XP_PER_HELD_SET;
  xp += countHeld(trainingData.benchSets) * XP_PER_HELD_SET;
  xp += countHeld(trainingData.trapBarSets) * XP_PER_HELD_SET;

  if (trainingData.discoveredMax?.hang != null) xp += XP_PER_MAX_PR;
  if (trainingData.discoveredMax?.pullup != null) xp += XP_PER_MAX_PR;

  return xp;
}

export function computeSessionXP(session: Session): number {
  if (isVolumeSession(session)) return computeVolumeXP(session);
  if (isTrainingSession(session)) return computeTrainingXP(session);
  return 0;
}

export function computeTotalXP(sessions: Session[]): number {
  return sessions
    .filter((s) => s.isFinished)
    .reduce((sum, s) => sum + computeSessionXP(s), 0);
}

export function computeLevel(totalXP: number): LevelInfo {
  const safeTotal = Math.max(0, Math.floor(totalXP));
  const level = Math.floor(safeTotal / XP_PER_LEVEL) + 1;
  const currentXP = safeTotal % XP_PER_LEVEL;
  const xpToNext = XP_PER_LEVEL - currentXP;
  return {
    level,
    currentXP,
    xpToNext,
    progress01: currentXP / XP_PER_LEVEL,
    totalXP: safeTotal,
  };
}

function localDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Count consecutive days (ending today, or yesterday if no session yet today)
 * that have at least one finished session. Local time.
 */
export function computeStreak(sessions: Session[]): number {
  const finished = sessions.filter((s) => s.isFinished);
  if (finished.length === 0) return 0;

  const dayKeys = new Set(finished.map((s) => localDayKey(s.date)));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // If today has no session, streak counting starts at yesterday.
  const startAtYesterday = !dayKeys.has(localDayKey(today));
  const cursor = new Date(today);
  if (startAtYesterday) cursor.setDate(cursor.getDate() - 1);

  let streak = 0;
  while (dayKeys.has(localDayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/**
 * Count finished sessions whose date falls in the rolling 7-day window ending
 * at `anchor` (inclusive). Used for consistent_week badge.
 */
export function sessionsInRollingWeek(sessions: Session[], anchor: Date = new Date()): number {
  const end = new Date(anchor);
  end.setHours(23, 59, 59, 999);
  const start = new Date(anchor);
  start.setDate(start.getDate() - 6);
  start.setHours(0, 0, 0, 0);
  return sessions.filter((s) => {
    if (!s.isFinished) return false;
    const t = s.date.getTime();
    return t >= start.getTime() && t <= end.getTime();
  }).length;
}
