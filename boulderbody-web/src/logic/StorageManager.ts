import type { Session } from '../models/Session';

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

const CURRENT_VERSION = 1;

/**
 * Deserialize session data from localStorage.
 * Converts ISO date strings back to Date objects.
 */
function deserializeSession(data: any): Session {
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

    const data: StorageSchema = JSON.parse(stored);

    // Handle data migration if needed
    if (!data.version || data.version < CURRENT_VERSION) {
      console.warn('Old data version detected, migrating...');
      // For v1, no migration needed yet
      // Future versions would add migration logic here
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
