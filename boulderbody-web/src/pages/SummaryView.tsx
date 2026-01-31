import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';
import type { Session } from '../models/Session';
import {
  getAttemptCounts,
  getSessionDuration,
  getFailRate,
} from '../models/Session';
import { getAllSessions, deleteSession } from '../logic/StorageManager';
import { ConfirmDialog } from '../components/ConfirmDialog';

/**
 * Summary View - Post-session statistics and charts.
 * Shows donut chart breakdown and key metrics.
 */
export function SummaryView() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      navigate('/');
      return;
    }

    const allSessions = getAllSessions();
    const found = allSessions.find((s) => s.id === sessionId);

    if (!found) {
      navigate('/');
      return;
    }

    setSession(found);
  }, [sessionId, navigate]);

  if (!session) {
    return null; // Loading state
  }

  const counts = getAttemptCounts(session);
  const duration = getSessionDuration(session);
  const failRate = getFailRate(session);

  // Prepare chart data (only include logged attempts)
  const chartData = [
    { name: 'Flash', value: counts.flash, color: '#22c55e' },
    { name: 'Done', value: counts.done, color: '#3b82f6' },
    { name: 'Fail', value: counts.fail, color: '#ef4444' },
    { name: 'Unlogged', value: counts.unlogged, color: '#9ca3af' },
  ].filter((item) => item.value > 0); // Only show non-zero values

  const handleDelete = () => {
    deleteSession(session.id);
    navigate('/');
  };

  const dateStr = session.date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => navigate('/')}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            ← Home
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium"
          >
            Delete Session
          </button>
        </div>

        {/* Session info */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg mb-6">
          <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white text-center">
            Level {session.targetLevel}
          </h1>
          <p className="text-center text-gray-500 dark:text-gray-400 mb-6">
            {dateStr}
          </p>

          {/* Key metrics */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="text-center">
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Duration
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {duration}
              </p>
            </div>
            <div className="text-center">
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Fail Rate
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {failRate.toFixed(0)}%
              </p>
            </div>
          </div>

          {/* Chart */}
          {chartData.length > 0 ? (
            <div className="h-64 mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No attempts logged
            </div>
          )}

          {/* Detailed breakdown */}
          <div className="space-y-2">
            <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <span className="text-green-800 dark:text-green-200 font-medium">
                Flash
              </span>
              <span className="text-green-900 dark:text-green-100 font-bold">
                {counts.flash}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <span className="text-blue-800 dark:text-blue-200 font-medium">
                Done
              </span>
              <span className="text-blue-900 dark:text-blue-100 font-bold">
                {counts.done}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <span className="text-red-800 dark:text-red-200 font-medium">
                Fail
              </span>
              <span className="text-red-900 dark:text-red-100 font-bold">
                {counts.fail}
              </span>
            </div>
            {counts.unlogged > 0 && (
              <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <span className="text-gray-800 dark:text-gray-200 font-medium">
                  Unlogged (counted as fails)
                </span>
                <span className="text-gray-900 dark:text-gray-100 font-bold">
                  {counts.unlogged}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <button
          onClick={() => navigate('/')}
          className="w-full btn btn-primary text-lg py-3"
        >
          Start New Session
        </button>
      </div>

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete Session"
        message={`Delete session from ${dateStr}? This cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
