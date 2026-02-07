/**
 * RestTimer.tsx
 *
 * Mandatory rest timer between training sets.
 * Shows circular progress with countdown display.
 * Cannot be skipped - user must wait full 4 minutes.
 */

import { useState, useEffect } from 'react';

interface RestTimerProps {
  /** Whether the timer modal is visible */
  isOpen: boolean;

  /** Total duration in seconds (from TRAINING_PROTOCOL.restBetweenSets) */
  duration: number;

  /** Called when timer completes */
  onComplete: () => void;
}

export function RestTimer({ isOpen, duration, onComplete }: RestTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(duration);

  useEffect(() => {
    if (!isOpen) {
      setTimeRemaining(duration); // Reset when closed
      return;
    }

    // Start countdown
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          // Small delay before calling onComplete for better UX
          setTimeout(onComplete, 500);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, duration, onComplete]);

  if (!isOpen) {
    return null;
  }

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  // Calculate progress percentage (inverted - starts at 100% and decreases)
  const progressPercent = ((duration - timeRemaining) / duration) * 100;

  // Calculate circle SVG properties for progress ring
  const radius = 100;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div
        className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-md w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()} // Prevent backdrop click from closing
      >
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-900 dark:text-white">
          Rest Period
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

        <p className="text-center text-gray-600 dark:text-gray-300">
          Mandatory rest between sets. Take a breather!
        </p>

        {timeRemaining === 0 && (
          <p className="text-center text-green-600 dark:text-green-400 font-medium mt-4">
            Rest complete! Ready for next set.
          </p>
        )}
      </div>
    </div>
  );
}
