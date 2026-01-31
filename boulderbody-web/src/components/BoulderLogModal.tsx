import { useState } from 'react';
import type { BoulderAttempt, AttemptResult } from '../models/BoulderAttempt';

/**
 * Modal for logging a boulder attempt result.
 * Shows Flash/Done/Fail buttons with color coding.
 */

interface BoulderLogModalProps {
  /** Whether the modal is visible */
  isOpen: boolean;

  /** The boulder attempt being logged */
  attempt: BoulderAttempt;

  /** Called when user selects a result */
  onSubmit: (result: AttemptResult, comment?: string) => void;

  /** Called when user cancels */
  onCancel: () => void;
}

export function BoulderLogModal({
  isOpen,
  attempt,
  onSubmit,
  onCancel,
}: BoulderLogModalProps) {
  const [comment, setComment] = useState(attempt.comment || '');

  if (!isOpen) {
    return null;
  }

  const handleSubmit = (result: AttemptResult) => {
    onSubmit(result, comment.trim() || undefined);
    setComment(''); // Reset for next time
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onCancel}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full shadow-xl sm:max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
          Log Boulder #{attempt.order}
        </h2>

        {/* Optional comment field */}
        <div className="mb-6">
          <label
            htmlFor="comment"
            className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300"
          >
            Notes (optional)
          </label>
          <textarea
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={2}
            placeholder="E.g., tough crimp start, struggled with balance"
          />
        </div>

        {/* Result buttons */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <button
            onClick={() => handleSubmit('flash')}
            className="btn bg-green-600 hover:bg-green-700 text-white py-4"
            title="Completed on first try"
          >
            <div className="text-2xl mb-1">⚡</div>
            <div className="font-bold">Flash</div>
          </button>

          <button
            onClick={() => handleSubmit('done')}
            className="btn bg-blue-600 hover:bg-blue-700 text-white py-4"
            title="Completed after multiple tries"
          >
            <div className="text-2xl mb-1">✓</div>
            <div className="font-bold">Done</div>
          </button>

          <button
            onClick={() => handleSubmit('fail')}
            className="btn bg-red-600 hover:bg-red-700 text-white py-4"
            title="Could not complete"
          >
            <div className="text-2xl mb-1">✗</div>
            <div className="font-bold">Fail</div>
          </button>
        </div>

        {/* Cancel button */}
        <button onClick={onCancel} className="w-full btn btn-secondary">
          Cancel
        </button>
      </div>
    </div>
  );
}
