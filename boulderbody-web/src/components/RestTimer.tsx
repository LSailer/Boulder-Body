/**
 * RestTimer.tsx
 *
 * Non-blocking timer bar fixed at the bottom of the screen.
 * Used for rest periods, warm-up rests, and prep countdowns.
 * Does not block interaction with the page — user can scroll and view their session.
 * Shows "Ready!" with green background when complete.
 */

import { useState, useEffect } from 'react';

interface RestTimerProps {
  /** Whether the timer bar is visible */
  isOpen: boolean;

  /** Total duration in seconds */
  duration: number;

  /** Called when timer completes */
  onComplete: () => void;

  /** When provided, renders a Skip button */
  onSkip?: () => void;

  /** When provided, renders a Pause/Resume button */
  onPause?: () => void;

  /** Controlled pause state (pair with onPause) */
  isPaused?: boolean;

  /** Label — defaults to "Rest" */
  title?: string;
}

export function RestTimer({
  isOpen,
  duration,
  onComplete,
  onSkip,
  onPause,
  isPaused = false,
  title = 'Rest',
}: RestTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(duration);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setTimeRemaining(duration);
      setIsDone(false);
      return;
    }

    if (isPaused || isDone) {
      return;
    }

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsDone(true);
          setTimeout(onComplete, 1500); // Show "Ready!" briefly
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, duration, onComplete, isPaused, isDone]);

  if (!isOpen) {
    return null;
  }

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  const progressPercent = ((duration - timeRemaining) / duration) * 100;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom">
      {/* Progress bar */}
      <div className="w-full h-1 bg-gray-300 dark:bg-gray-700">
        <div
          className={`h-1 transition-all duration-1000 ease-linear ${
            isDone ? 'bg-green-500' : 'bg-blue-500'
          }`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Timer bar */}
      <div
        className={`px-4 py-3 flex items-center justify-between ${
          isDone
            ? 'bg-green-600 text-white'
            : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-t border-gray-200 dark:border-gray-700'
        }`}
      >
        {/* Left: title + time */}
        <div className="flex items-center gap-3">
          <span className="font-medium text-sm">{title}</span>
          <span className={`font-bold text-lg tabular-nums ${isDone ? 'text-white' : ''}`}>
            {isDone ? 'Ready!' : timeString}
          </span>
          {isPaused && !isDone && (
            <span className="text-xs font-medium text-amber-500">PAUSED</span>
          )}
        </div>

        {/* Right: buttons */}
        {!isDone && (
          <div className="flex items-center gap-2">
            {onPause && (
              <button
                onClick={onPause}
                className="px-3 py-1.5 text-sm font-medium rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                {isPaused ? 'Resume' : 'Pause'}
              </button>
            )}
            {onSkip && (
              <button
                onClick={onSkip}
                className="px-3 py-1.5 text-sm font-medium rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Skip
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
