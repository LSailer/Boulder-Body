/**
 * RestTimer.tsx
 *
 * Timer modal used for prep countdown, hang timer, and rest periods.
 * Shows circular progress with countdown display.
 * Optional skip button (when onSkip provided) and pause/resume (when onPause provided).
 */

import { useState, useEffect } from 'react';

interface RestTimerProps {
  /** Whether the timer modal is visible */
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

  /** Modal heading — defaults to "Rest Time" */
  title?: string;
}

export function RestTimer({
  isOpen,
  duration,
  onComplete,
  onSkip,
  onPause,
  isPaused = false,
  title = 'Rest Time',
}: RestTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(duration);

  useEffect(() => {
    if (!isOpen) {
      setTimeRemaining(duration); // Reset when closed
      return;
    }

    if (isPaused) {
      return; // Interval suspended — timeRemaining preserved
    }

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setTimeout(onComplete, 500);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, duration, onComplete, isPaused]);

  if (!isOpen) {
    return null;
  }

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  const progressPercent = ((duration - timeRemaining) / duration) * 100;

  const radius = 100;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div
        className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-md w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-900 dark:text-white">
          {title}
        </h2>

        {/* Circular progress timer */}
        <div className="relative flex items-center justify-center mb-6">
          <svg width="240" height="240" className="transform -rotate-90">
            {/* Background circle */}
            <circle
              cx="120"
              cy="120"
              r={radius}
              stroke="currentColor"
              strokeWidth="12"
              fill="none"
              className="text-gray-200 dark:text-gray-700"
            />
            {/* Progress circle */}
            <circle
              cx="120"
              cy="120"
              r={radius}
              stroke="currentColor"
              strokeWidth="12"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="text-blue-600 dark:text-blue-400 transition-all duration-1000 ease-linear"
            />
          </svg>

          {/* Time display */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-6xl font-bold text-gray-900 dark:text-white">
              {timeString}
            </span>
          </div>
        </div>

        {timeRemaining === 0 && (
          <p className="text-center text-green-600 dark:text-green-400 font-medium mb-4">
            Done!
          </p>
        )}

        {(onPause || onSkip) && (
          <div className="flex gap-3 mt-2">
            {onPause && (
              <button
                onClick={onPause}
                className="flex-1 py-3 px-4 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                {isPaused ? 'Resume' : 'Pause'}
              </button>
            )}
            {onSkip && (
              <button
                onClick={onSkip}
                className="flex-1 py-3 px-4 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
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
