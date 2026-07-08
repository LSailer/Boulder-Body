import type {
  Session,
  VolumeSession,
  TrainingSession,
  RouteSession,
} from '../models/Session';
import { isVolumeSession, isTrainingSession, isRouteSession } from '../models/Session';
import type { Gym } from '../models/Gym';
import type { EarnedBadge } from '../models/Gamification';

// localStorage keys
const SESSIONS_KEY = 'boulderbody_sessions';
const THEME_KEY = 'boulderbody_theme';
const BADGES_KEY = 'boulderbody_badges';
const GYMS_KEY = 'boulderbody_gyms';

/**
 * Storage schema for sessions data.
 * Includes version for future migrations.
 */
interface StorageSchema {
  version: number;
  sessions: Session[];
}

const CURRENT_VERSION = 4; // v4: drop legacy training sessions (ramp-up shape incompatible with 9c protocol)

/**
 * Migrate v1 schema (pre-sessionType) to v2.
 * All existing sessions are assumed to be volume sessions.
 */
function migrateV1toV2(data: any): StorageSchema {
  console.log('Migrating storage from v1 to v2...');
  return {
    version: 2,
    sessions: data.sessions.map((s: any) => ({
      ...s,
      sessionType: s.sessionType || 'volume',
    })),
  };
}

/**
 * Migrate v2 schema to v3.
 * Adds bench and trapbar fields to training sessions.
 */
function migrateV2toV3(data: any): StorageSchema {
  console.log('Migrating storage from v2 to v3...');
  return {
    version: 3,
    sessions: data.sessions.map((s: any) => {
      if (s.sessionType !== 'training') return s;
      return {
        ...s,
        trainingData: {
          ...s.trainingData,
          benchWeight: s.trainingData.benchWeight ?? 10,
          trapBarWeight: s.trainingData.trapBarWeight ?? 20,
          benchSets: s.trainingData.benchSets ?? [],
          trapBarSets: s.trainingData.trapBarSets ?? [],
        },
      };
    }),
  };
}

/**
 * Migrate v3 schema to v4.
 *
 * The 9c-style training protocol replaces the old fixed-weight + ramp-up shape
 * (hangWeight, pullupWeight, rampUp) with a max-test / working structure. Old
 * training sessions can't be rendered in the new shape without fabricating a
 * discoveredMax, so we drop them. Volume sessions are untouched.
 */
function migrateV3toV4(data: any): StorageSchema {
  console.log('Migrating storage from v3 to v4 — dropping legacy training sessions...');
  return {
    version: 4,
    sessions: data.sessions.filter((s: any) => s.sessionType !== 'training'),
  };
}

/**
 * Deserialize session data from localStorage.
 * Converts ISO date strings back to Date objects.
 * Handles both volume and training sessions.
 */
function deserializeSession(data: any): Session {
  // Handle training sessions with special deserialization for sets
  if (data.sessionType === 'training') {
    return {
      ...data,
      date: new Date(data.date),
      startTime: new Date(data.startTime),
      endTime: data.endTime ? new Date(data.endTime) : undefined,
      trainingData: {
        ...data.trainingData,
        hangSets: data.trainingData.hangSets.map((s: any) => ({
          ...s,
          timestamp: s.timestamp ? new Date(s.timestamp) : undefined,
        })),
        pullupSets: data.trainingData.pullupSets.map((s: any) => ({
          ...s,
          timestamp: s.timestamp ? new Date(s.timestamp) : undefined,
        })),
        benchSets: (data.trainingData.benchSets ?? []).map((s: any) => ({
          ...s,
          timestamp: s.timestamp ? new Date(s.timestamp) : undefined,
        })),
        trapBarSets: (data.trainingData.trapBarSets ?? []).map((s: any) => ({
          ...s,
          timestamp: s.timestamp ? new Date(s.timestamp) : undefined,
        })),
      },
    };
  }

  // Handle route sessions (per-route difficulty). Routes carry their own
  // timestamps, deserialized the same way as volume attempts.
  if (data.sessionType === 'route') {
    return {
      ...data,
      date: new Date(data.date),
      startTime: new Date(data.startTime),
      endTime: data.endTime ? new Date(data.endTime) : undefined,
      routes: data.routes.map((r: any) => ({
        ...r,
        timestamp: r.timestamp ? new Date(r.timestamp) : undefined,
      })),
    };
  }

  // Handle volume sessions (existing behavior)
  return {
    ...data,
    date: new Date(data.date),
    startTime: new Date(data.startTime),
    endTime: data.endTime ? new Date(data.endTime) : undefined,
    attempts: data.attempts.map((a: any) => ({
      ...a,
      timestamp: a.timestamp ? new Date(a.timestamp) : undefined,
    })),
  };
}

/**
 * Get all sessions from localStorage.
 * Handles missing data, corrupted data, and version migrations.
 */
export function getAllSessions(): Session[] {
  try {
    const stored = localStorage.getItem(SESSIONS_KEY);
    if (!stored) {
      return [];
    }

    let data: StorageSchema = JSON.parse(stored);

    // Handle data migration if needed
    if (!data.version || data.version < CURRENT_VERSION) {
      console.warn('Old data version detected, migrating...');

      // Apply migrations sequentially
      if (!data.version || data.version < 2) {
        data = migrateV1toV2(data);
      }
      if (data.version < 3) {
        data = migrateV2toV3(data);
      }
      if (data.version < 4) {
        data = migrateV3toV4(data);
      }
      // Save migrated data immediately
      try {
        localStorage.setItem(SESSIONS_KEY, JSON.stringify(data));
        console.log(`Migration to v${CURRENT_VERSION} complete`);
      } catch (saveError) {
        console.error('Failed to save migrated data:', saveError);
      }
    }

    return data.sessions.map(deserializeSession);
  } catch (error) {
    console.error('Error loading sessions from localStorage:', error);
    // Return empty array on error (corrupted data)
    return [];
  }
}

/**
 * Save all sessions to localStorage.
 * Throws error if quota exceeded or localStorage unavailable.
 */
function saveAllSessions(sessions: Session[]): void {
  try {
    const data: StorageSchema = {
      version: CURRENT_VERSION,
      sessions,
    };
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(data));
  } catch (error: any) {
    if (error.name === 'QuotaExceededError') {
      throw new Error(
        'Storage quota exceeded. Please delete old sessions to free up space.'
      );
    }
    throw new Error('Failed to save session data. Storage may be unavailable.');
  }
}

/**
 * Save a new session.
 * Adds it to the list and persists to localStorage.
 */
export function saveSession(session: Session): void {
  const sessions = getAllSessions();
  sessions.push(session);
  saveAllSessions(sessions);
}

/**
 * Update an existing session.
 * Replaces the session with matching ID.
 */
export function updateSession(updatedSession: Session): void {
  const sessions = getAllSessions();
  const index = sessions.findIndex((s) => s.id === updatedSession.id);

  if (index === -1) {
    throw new Error(`Session with ID ${updatedSession.id} not found`);
  }

  sessions[index] = updatedSession;
  saveAllSessions(sessions);
}

/**
 * Delete a session by ID.
 */
export function deleteSession(id: string): void {
  const sessions = getAllSessions();
  const filtered = sessions.filter((s) => s.id !== id);

  if (filtered.length === sessions.length) {
    throw new Error(`Session with ID ${id} not found`);
  }

  saveAllSessions(filtered);
}

/**
 * Get the current active session (if any).
 * Only one unfinished session should exist at a time.
 */
export function getCurrentSession(): Session | null {
  const sessions = getAllSessions();
  return sessions.find((s) => !s.isFinished) || null;
}

/**
 * Get the most recent finished session.
 * Used for calculating recommendations.
 * @deprecated Use getLastVolumeSession() or getLastTrainingSession() instead
 */
export function getLastFinishedSession(): Session | null {
  const sessions = getAllSessions();
  const finished = sessions.filter((s) => s.isFinished);

  if (finished.length === 0) {
    return null;
  }

  // Sort by date descending and return the first one
  finished.sort((a, b) => b.date.getTime() - a.date.getTime());
  return finished[0];
}

/**
 * Get the most recent finished volume session.
 * Used for calculating volume session recommendations.
 */
export function getLastVolumeSession(): VolumeSession | null {
  const sessions = getAllSessions();
  const volumeFinished = sessions.filter(
    (s): s is VolumeSession => isVolumeSession(s) && s.isFinished
  );

  if (volumeFinished.length === 0) {
    return null;
  }

  // Sort by date descending and return the first one
  volumeFinished.sort((a, b) => b.date.getTime() - a.date.getTime());
  return volumeFinished[0];
}

/**
 * Get the most recent finished training session.
 * Used for calculating training session recommendations.
 */
export function getLastTrainingSession(): TrainingSession | null {
  const sessions = getAllSessions();
  const trainingFinished = sessions.filter(
    (s): s is TrainingSession => isTrainingSession(s) && s.isFinished
  );

  if (trainingFinished.length === 0) {
    return null;
  }

  // Sort by date descending and return the first one
  trainingFinished.sort((a, b) => b.date.getTime() - a.date.getTime());
  return trainingFinished[0];
}

/**
 * Get the most recent finished route session at a specific gym.
 * Used by the summary view to compare against "your last session here".
 * @param gymId The gym to scope the lookup to
 * @param excludeId Optional session id to exclude (e.g. the one being summarized)
 */
export function getLastRouteSessionForGym(
  gymId: string,
  excludeId?: string
): RouteSession | null {
  const sessions = getAllSessions();
  const routeFinished = sessions.filter(
    (s): s is RouteSession =>
      isRouteSession(s) &&
      s.isFinished &&
      s.gymId === gymId &&
      s.id !== excludeId
  );

  if (routeFinished.length === 0) {
    return null;
  }

  routeFinished.sort((a, b) => b.date.getTime() - a.date.getTime());
  return routeFinished[0];
}

/**
 * Get all saved gyms.
 */
export function getAllGyms(): Gym[] {
  try {
    const raw = localStorage.getItem(GYMS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Gym[];
  } catch (error) {
    console.error('Error loading gyms:', error);
    return [];
  }
}

/**
 * Save (insert or update) a gym, keyed by id.
 */
export function saveGym(gym: Gym): void {
  try {
    const gyms = getAllGyms();
    const index = gyms.findIndex((g) => g.id === gym.id);
    if (index === -1) {
      gyms.push(gym);
    } else {
      gyms[index] = gym;
    }
    localStorage.setItem(GYMS_KEY, JSON.stringify(gyms));
  } catch (error) {
    console.error('Failed to persist gym:', error);
    throw new Error('Failed to save gym. Storage may be unavailable.');
  }
}

/**
 * Get current theme preference.
 * Defaults to 'light' — the redesigned palette is light-first.
 */
export function getTheme(): 'light' | 'dark' {
  const stored = localStorage.getItem(THEME_KEY);
  return (stored as 'light' | 'dark') || 'light';
}

/**
 * Save theme preference and apply it to the document.
 */
export function setTheme(theme: 'light' | 'dark'): void {
  localStorage.setItem(THEME_KEY, theme);
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

/**
 * Initialize theme on app load.
 * Should be called early in app initialization.
 */
export function initializeTheme(): void {
  const theme = getTheme();
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

/**
 * Load earned badges from localStorage.
 * Deserializes unlockedAt back to Date.
 */
export function getBadges(): EarnedBadge[] {
  try {
    const raw = localStorage.getItem(BADGES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Array<Omit<EarnedBadge, 'unlockedAt'> & { unlockedAt: string }>;
    return parsed.map((b) => ({ ...b, unlockedAt: new Date(b.unlockedAt) }));
  } catch (error) {
    console.error('Error loading badges:', error);
    return [];
  }
}

/**
 * Append newly-unlocked badges. No-op if empty.
 */
export function addBadges(newBadges: EarnedBadge[]): void {
  if (newBadges.length === 0) return;
  try {
    const existing = getBadges();
    const merged = [...existing, ...newBadges];
    localStorage.setItem(BADGES_KEY, JSON.stringify(merged));
  } catch (error) {
    console.error('Failed to persist badges:', error);
  }
}
