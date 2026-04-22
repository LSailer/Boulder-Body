/**
 * Gamification types and constants.
 *
 * XP, level, and streak are derived from sessions on the fly.
 * Earned badges persist in localStorage as a separate key.
 */

export type BadgeId =
  | 'first_send'
  | 'first_v6'
  | 'consistent_week'
  | 'streak_7'
  | 'streak_14'
  | 'hang_pr'
  | 'pullup_pr';

export type BadgeTint = 'gold' | 'moss' | 'rust';

export interface EarnedBadge {
  id: BadgeId;
  unlockedAt: Date;
  sessionId: string;
}

export interface BadgeDefinition {
  icon: string;
  title: string;
  description: string;
  tint: BadgeTint;
}

export const BADGE_CATALOG: Record<BadgeId, BadgeDefinition> = {
  first_send: {
    icon: '⚡',
    title: 'First send',
    description: 'Your first flash attempt',
    tint: 'gold',
  },
  first_v6: {
    icon: '🏅',
    title: 'First V6 send',
    description: 'Sent at level 6 or higher',
    tint: 'gold',
  },
  consistent_week: {
    icon: '🌿',
    title: 'Consistent crusher',
    description: '5 sessions in a week',
    tint: 'moss',
  },
  streak_7: {
    icon: '🔥',
    title: '7-day streak',
    description: 'A full week of sessions',
    tint: 'rust',
  },
  streak_14: {
    icon: '🔥',
    title: '14-day streak',
    description: 'Two weeks of sessions',
    tint: 'rust',
  },
  hang_pr: {
    icon: '📈',
    title: 'Hang progression',
    description: 'New max hang weight',
    tint: 'moss',
  },
  pullup_pr: {
    icon: '📈',
    title: 'Pull-up progression',
    description: 'New max pull-up weight',
    tint: 'moss',
  },
};

export const XP_PER_SEND = 15;
export const XP_PER_TOP = 10;
export const XP_PER_PROJECT = 2;
export const XP_PER_HELD_SET = 5;
export const XP_PER_MAX_PR = 20;
export const XP_PER_LEVEL = 500;

export interface LevelInfo {
  /** Integer level, starting at 1 */
  level: number;
  /** XP earned within the current level (0..XP_PER_LEVEL-1) */
  currentXP: number;
  /** XP remaining to the next level */
  xpToNext: number;
  /** Progress through current level, 0..1 */
  progress01: number;
  /** Total XP across all finished sessions */
  totalXP: number;
}

/**
 * V-grade label shown next to the level number.
 */
export function vGradeLabelForLevel(level: number): string {
  return `V${level}`;
}
