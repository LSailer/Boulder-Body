import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { VolumeSession } from '../models/Session';
import { isVolumeSession } from '../models/Session';
import type { BoulderAttempt, AttemptResult } from '../models/BoulderAttempt';
import { getAllSessions, updateSession, deleteSession } from '../logic/StorageManager';
import { BoulderLogModal } from '../components/BoulderLogModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { getAttemptCounts } from '../models/Session';

/**
 * Active Session View - Live session logging interface.
 * Shows grid of boulders and allows logging attempts.
 * Only handles volume sessions - training sessions use TrainingSessionView.
 */
export function ActiveSessionView() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<VolumeSession | null>(null);
  const [selectedAttempt, setSelectedAttempt] = useState<BoulderAttempt | null>(
    null
  );
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [showBreakConfirm, setShowBreakConfirm] = useState(false);

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

    // This view only handles volume sessions
    if (!isVolumeSession(found)) {
      navigate('/');
      return;
    }

    // If already finished, go to summary
    if (found.isFinished) {
      navigate(`/summary/${sessionId}`);
      return;
    }

    setSession(found);
  }, [sessionId, navigate]);

  if (!session) {
    return null; // Loading state
  }

  const handleLogAttempt = (result: AttemptResult, comment?: string) => {
    if (!selectedAttempt) return;

    // Update the attempt
    const updatedAttempts = session.attempts.map((a) =>
      a.id === selectedAttempt.id
        ? { ...a, result, comment, timestamp: new Date() }
        : a
    );

    const updatedSession = {
      ...session,
      attempts: updatedAttempts,
    };

    updateSession(updatedSession);
    setSession(updatedSession);
    setSelectedAttempt(null);
  };

  const handleFinishSession = () => {
    const counts = getAttemptCounts(session);

    // If more than 5 unlogged, show confirmation
    if (counts.unlogged > 5) {
      setShowFinishConfirm(true);
    } else {
      finishSession();
    }
  };

  const finishSession = () => {
    const finishedSession = {
      ...session,
      isFinished: true,
      endTime: new Date(),
    };

    updateSession(finishedSession);
    navigate(`/summary/${session.id}`);
  };

  const handleBreakSession = () => {
    deleteSession(session.id);
    navigate('/');
  };

  const counts = getAttemptCounts(session);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <button
              onClick={() => navigate('/')}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              ← Back
            </button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Level {session.targetLevel} Session
            </h1>
            <button
              onClick={() => setShowBreakConfirm(true)}
              className="text-red-500 hover:text-red-400 font-medium"
            >
              Break Session
            </button>
          </div>

          {/* Progress stats */}
          <div className="grid grid-cols-4 gap-2 text-center text-sm">
            <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded">
              <div className="font-bold text-green-800 dark:text-green-200">
                {counts.flash}
              </div>
              <div className="text-green-600 dark:text-green-400">Flash</div>
            </div>
            <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded">
              <div className="font-bold text-blue-800 dark:text-blue-200">
                {counts.done}
              </div>
              <div className="text-blue-600 dark:text-blue-400">Done</div>
            </div>
            <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded">
              <div className="font-bold text-red-800 dark:text-red-200">
                {counts.fail}
              </div>
              <div className="text-red-600 dark:text-red-400">Fail</div>
            </div>
            <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded">
              <div className="font-bold text-gray-800 dark:text-gray-200">
                {counts.unlogged}
              </div>
              <div className="text-gray-600 dark:text-gray-400">Unlogged</div>
            </div>
          </div>
        </div>

        {/* Boulder grid */}
        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3 mb-6">
          {session.attempts.map((attempt) => {
            const bgColor = attempt.result
              ? attempt.result === 'flash'
                ? 'bg-green-600 text-white'
                : attempt.result === 'done'
                  ? 'bg-blue-600 text-white'
                  : 'bg-red-600 text-white'
              : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-2 border-gray-300 dark:border-gray-600';

            return (
              <button
                key={attempt.id}
                onClick={() => setSelectedAttempt(attempt)}
                className={`${bgColor} rounded-lg p-4 min-h-[80px] font-bold text-lg hover:opacity-80 transition-opacity shadow`}
                title={
                  attempt.result
                    ? `#${attempt.order}: ${attempt.result}${attempt.comment ? ` - ${attempt.comment}` : ''}`
                    : `Log boulder #${attempt.order}`
                }
              >
                {attempt.order}
              </button>
            );
          })}
        </div>

        {/* Finish button */}
        <button
          onClick={handleFinishSession}
          className="w-full btn btn-success text-lg py-3"
        >
          Finish Session
        </button>
      </div>

      {/* Boulder log modal */}
      {selectedAttempt && (
        <BoulderLogModal
          isOpen={true}
          attempt={selectedAttempt}
          onSubmit={handleLogAttempt}
          onCancel={() => setSelectedAttempt(null)}
        />
      )}

      {/* Finish confirmation */}
      <ConfirmDialog
        isOpen={showFinishConfirm}
        title="Unlogged Boulders"
        message={`You have ${counts.unlogged} unlogged boulders. They will count as fails. Finish session anyway?`}
        confirmText="Finish Anyway"
        cancelText="Keep Logging"
        onConfirm={finishSession}
        onCancel={() => setShowFinishConfirm(false)}
      />

      {/* Break session confirmation */}
      <ConfirmDialog
        isOpen={showBreakConfirm}
        title="Break Session?"
        message="Are you sure you want to end this session? It will be deleted and won't appear in your history."
        confirmText="End Session"
        cancelText="Continue"
        variant="danger"
        onConfirm={handleBreakSession}
        onCancel={() => setShowBreakConfirm(false)}
      />
    </div>
  );
}
