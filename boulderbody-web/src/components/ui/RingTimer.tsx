/**
 * RingTimer.tsx
 *
 * Conic-gradient countdown timer with three visual states (prep/hold/rest).
 * Used by the training session for prep → hang → rest cycles.
 *
 * Supports optional pause and skip. Replaces the older RestTimer.
 */

import { useEffect, useRef, useState, type CSSProperties } from 'react';

export type RingState = 'prep' | 'hold' | 'rest';

interface Props {
  isOpen: boolean;
  duration: number;
  state: RingState;
  onComplete: () => void;
  onSkip?: () => void;
  onPause?: () => void;
  isPaused?: boolean;
  title?: string;
  subtitle?: string;
}

const stateClass: Record<RingState, string> = {
  prep: 'ring-prep',
  hold: 'ring-timer',
  rest: 'ring-rest',
};

const stateTone: Record<RingState, string> = {
  prep: 'text-rust',
  hold: 'text-gold',
  rest: 'text-moss',
};

export function RingTimer({
  isOpen,
  duration,
  state,
  onComplete,
  onSkip,
  onPause,
  isPaused = false,
  title,
  subtitle,
}: Props) {
  // Reset key — when isOpen or duration changes, we want a fresh countdown.
  // Derived from a useRef so we avoid a setState inside the effect.
  const resetKey = `${isOpen}-${duration}`;
  const lastKeyRef = useRef(resetKey);
  const [timeRemaining, setTimeRemaining] = useState(duration);
  const completedRef = useRef(false);

  if (lastKeyRef.current !== resetKey) {
    lastKeyRef.current = resetKey;
    completedRef.current = false;
    // Safe during render: this matches useState lazy-init semantics by
    // snapping the next value synchronously before the subsequent effect.
    setTimeRemaining(duration);
  }

  useEffect(() => {
    if (!isOpen) return;
    if (isPaused) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (!completedRef.current) {
            completedRef.current = true;
            setTimeout(onComplete, 400);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, onComplete, isPaused]);

  if (!isOpen) return null;

  const progress = Math.max(0, Math.min(1, (duration - timeRemaining) / duration));
  const percent = `${(progress * 100).toFixed(1)}%`;

  const m = Math.floor(timeRemaining / 60);
  const s = timeRemaining % 60;
  const display =
    duration >= 60 ? `${m}:${s.toString().padStart(2, '0')}` : String(timeRemaining);

  const ringStyle: CSSProperties = { ['--ring-progress' as never]: percent };

  return (
    <div className="fixed inset-0 bg-ink/60 flex items-center justify-center p-6 z-50">
      <div className="paper-tex rounded-[28px] shadow-pebble border border-line p-6 max-w-sm w-full">
        <div className="text-center">
          <span className={`stamp ${stateTone[state]}`}>
            {title ?? defaultTitle(state)}
          </span>
        </div>
        <div className="relative w-48 h-48 mx-auto my-5">
          <div
            className={`absolute inset-0 rounded-full ${stateClass[state]} transition-[background] duration-700 ease-linear`}
            style={ringStyle}
          />
          <div className="absolute inset-[10px] rounded-full paper-tex border border-line flex items-center justify-center">
            <div className="font-mono font-bold text-5xl text-ink dark:text-paper">
              {display}
            </div>
          </div>
        </div>
        {subtitle && (
          <div className="text-center text-xs text-graphite mb-2">{subtitle}</div>
        )}
        {(onPause || onSkip) && (
          <div className="flex gap-2 mt-3">
            {onPause && (
              <button
                type="button"
                onClick={onPause}
                className="flex-1 py-3 rounded-xl border border-line bg-paper text-ink font-semibold hover:bg-chalk"
              >
                {isPaused ? 'Resume' : 'Pause'}
              </button>
            )}
            {onSkip && (
              <button
                type="button"
                onClick={onSkip}
                className="flex-1 py-3 rounded-xl border border-line bg-paper text-ink font-semibold hover:bg-chalk"
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

function defaultTitle(state: RingState): string {
  if (state === 'prep') return 'Prep';
  if (state === 'hold') return 'Holding';
  return 'Rest';
}
