import type { Session, VolumeSession, TrainingSession } from '../models/Session';
import { isVolumeSession, isTrainingSession } from '../models/Session';

// localStorage keys
const SESSIONS_KEY = 'boulderbody_sessions';
const THEME_KEY = 'boulderbody_theme';

/**
 * Storage schema for sessions data.
 * Includes version for future migrations.
 */
interface StorageSchema {
  version: number;
  sessions: Session[];
}

const CURRENT_VERSION = 2; // Incremented for sessionType discriminator

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
      sessionType: s.sessionType || 'volume', // Default old sessions to volume
    })),
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
      },
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
        // Save migrated data immediately
        try {
          localStorage.setItem(SESSIONS_KEY, JSON.stringify(data));
          console.log('Migration to v2 complete');
        } catch (saveError) {
          console.error('Failed to save migrated data:', saveError);
        }
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
 * Get current theme preference.
 * Defaults to 'dark' if not set.
 */
export function getTheme(): 'light' | 'dark' {
  const stored = localStorage.getItem(THEME_KEY);
  return (stored as 'light' | 'dark') || 'dark';
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
