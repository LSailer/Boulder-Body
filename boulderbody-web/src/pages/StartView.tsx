import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Session } from '../models/Session';
import {
  getAllSessions,
  getCurrentSession,
  getLastFinishedSession,
  saveSession,
} from '../logic/StorageManager';
import { getRecommendation } from '../logic/SessionRecommender';
import { ThemeToggle } from '../components/ThemeToggle';
import { SessionHistoryItem } from '../components/SessionHistoryItem';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { deleteSession } from '../logic/StorageManager';

/**
 * Start View - Home screen with session form and history.
 * Displays recommended level based on past performance.
 */
export function StartView() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [level, setLevel] = useState(5);
  const [boulderCount, setBoulderCount] = useState(20);
  const [recommendationReason, setRecommendationReason] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: string;
    date: string;
  } | null>(null);

  // Load sessions and calculate recommendation on mount
  useEffect(() => {
    const allSessions = getAllSessions();
    setSessions(allSessions.filter((s) => s.isFinished));

    // Check if there's an active session
    const activeSession = getCurrentSession();
    if (activeSession) {
      // Resume active session
      navigate(`/session/${activeSession.id}`);
      return;
    }

    // Get recommendation
    const lastSession = getLastFinishedSession();
    const recommendation = getRecommendation(lastSession);
    setLevel(recommendation.level);
    setBoulderCount(recommendation.boulderCount);
    setRecommendationReason(recommendation.reason);
  }, [navigate]);

  const handleStartSession = () => {
    // Create new session with startTime
    const newSession: Session = {
      id: crypto.randomUUID(),
      date: new Date(),
      startTime: new Date(),
      targetLevel: level,
      boulderCount,
      isFinished: false,
      attempts: Array.from({ length: boulderCount }, (_, i) => ({
        id: crypto.randomUUID(),
        order: i + 1,
      })),
    };

    saveSession(newSession);
    navigate(`/session/${newSession.id}`);
  };

  const handleDeleteSession = (id: string) => {
    const session = sessions.find((s) => s.id === id);
    if (!session) return;

    setDeleteConfirm({
      id,
      date: session.date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
    });
  };

  const confirmDelete = () => {
    if (!deleteConfirm) return;

    deleteSession(deleteConfirm.id);
    setSessions(sessions.filter((s) => s.id !== deleteConfirm.id));
    setDeleteConfirm(null);

    // Recalculate recommendation after deletion
    const lastSession = getLastFinishedSession();
    const recommendation = getRecommendation(lastSession);
    setLevel(recommendation.level);
    setBoulderCount(recommendation.boulderCount);
    setRecommendationReason(recommendation.reason);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            BoulderBody
          </h1>
          <ThemeToggle />
        </div>

        {/* New Session Form */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg mb-8">
          <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
            Start New Session
          </h2>

          {/* Recommendation reason */}
          {recommendationReason && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm text-blue-800 dark:text-blue-200">
              <span className="font-medium">Recommendation:</span>{' '}
              {recommendationReason}
            </div>
          )}

          {/* Level input */}
          <div className="mb-4">
            <label
              htmlFor="level"
              className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300"
            >
              Target Level
            </label>
            <input
              id="level"
              type="number"
              min="1"
              value={level}
              onChange={(e) => setLevel(parseInt(e.target.value) || 1)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Boulder count input */}
          <div className="mb-6">
            <label
              htmlFor="boulderCount"
              className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300"
            >
              Number of Boulders
            </label>
            <input
              id="boulderCount"
              type="number"
              min="1"
              max="100"
              value={boulderCount}
              onChange={(e) => setBoulderCount(parseInt(e.target.value) || 1)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Start button */}
          <button
            onClick={handleStartSession}
            className="w-full btn btn-primary text-lg py-3"
          >
            Start Session
          </button>
        </div>

        {/* Session History */}
        {sessions.length > 0 && (
          <div>
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
              Session History
            </h2>
            <div className="space-y-3">
              {sessions
                .sort((a, b) => b.date.getTime() - a.date.getTime())
                .map((session) => (
                  <SessionHistoryItem
                    key={session.id}
                    session={session}
                    onClick={() => navigate(`/summary/${session.id}`)}
                    onDelete={handleDeleteSession}
                  />
                ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {sessions.length === 0 && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <p className="text-lg">No sessions yet. Start your first one!</p>
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        title="Delete Session"
        message={`Delete session from ${deleteConfirm?.date}? This cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}
