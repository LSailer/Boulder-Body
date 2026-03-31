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

const CURRENT_VERSION = 4; // v4: remove trapbar, rampUp; add trainingMode

/**
 * Migrate v1 schema (pre-sessionType) to v2.
 * All existing sessions are assumed to be volume sessions.
 */
function migrateV1toV2(data: any): any {
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
function migrateV2toV3(data: any): any {
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
 * Removes trapbar, rampUp data. Adds trainingMode field.
 * Cleans up old setType values ('rampup'/'working' → undefined).
 */
function migrateV3toV4(data: any): StorageSchema {
  console.log('Migrating storage from v3 to v4...');
  return {
    version: 4,
    sessions: data.sessions.map((s: any) => {
      if (s.sessionType !== 'training') return s;

      const td = s.trainingData;

      // Clean up sets: remove trapbar exercise refs, normalize setTypes
      const cleanSets = (sets: any[]) =>
        (sets ?? [])
          .filter((set: any) => set.exercise !== 'trapbar')
          .map((set: any) => {
            const { setType, ...rest } = set;
            // Convert old rampup/working to undefined for normal sessions
            return rest;
          });

      return {
        ...s,
        trainingData: {
          trainingMode: 'normal' as const,
          hangWeight: td.hangWeight ?? 0,
          pullupWeight: td.pullupWeight ?? 0,
          benchWeight: td.benchWeight ?? 10,
          hangSets: cleanSets(td.hangSets),
          pullupSets: cleanSets(td.pullupSets),
          benchSets: cleanSets(td.benchSets),
          // Deliberately omit: trapBarWeight, trapBarSets, rampUp
        },
      };
    }),
  };
}

/**
 * Deserialize session data from localStorage.
 * Converts ISO date strings back to Date objects.
 */
function deserializeSession(data: any): Session {
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
      },
    };
  }

  // Handle volume sessions
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

    let data: any = JSON.parse(stored);

    // Handle data migration if needed
    if (!data.version || data.version < CURRENT_VERSION) {
      console.warn('Old data version detected, migrating...');

      if (!data.version || data.version < 2) {
        data = migrateV1toV2(data);
      }
      if (data.version < 3) {
        data = migrateV2toV3(data);
      }
      if (data.version < 4) {
        data = migrateV3toV4(data);
      }

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
    return [];
  }
}

/**
 * Save all sessions to localStorage.
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
 */
export function saveSession(session: Session): void {
  const sessions = getAllSessions();
  sessions.push(session);
  saveAllSessions(sessions);
}

/**
 * Update an existing session.
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
 */
export function getCurrentSession(): Session | null {
  const sessions = getAllSessions();
  return sessions.find((s) => !s.isFinished) || null;
}

/**
 * Get the most recent finished volume session.
 */
export function getLastVolumeSession(): VolumeSession | null {
  const sessions = getAllSessions();
  const volumeFinished = sessions.filter(
    (s): s is VolumeSession => isVolumeSession(s) && s.isFinished
  );

  if (volumeFinished.length === 0) return null;

  volumeFinished.sort((a, b) => b.date.getTime() - a.date.getTime());
  return volumeFinished[0];
}

/**
 * Get the most recent finished training session (any mode).
 */
export function getLastTrainingSession(): TrainingSession | null {
  const sessions = getAllSessions();
  const trainingFinished = sessions.filter(
    (s): s is TrainingSession => isTrainingSession(s) && s.isFinished
  );

  if (trainingFinished.length === 0) return null;

  trainingFinished.sort((a, b) => b.date.getTime() - a.date.getTime());
  return trainingFinished[0];
}

/**
 * Get all finished training sessions (for max test history).
 */
export function getAllTrainingSessions(): TrainingSession[] {
  const sessions = getAllSessions();
  return sessions.filter(
    (s): s is TrainingSession => isTrainingSession(s) && s.isFinished
  );
}

/**
 * Get current theme preference.
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
 */
export function initializeTheme(): void {
  const theme = getTheme();
  document.documentElement.classList.toggle('dark', theme === 'dark');
}
