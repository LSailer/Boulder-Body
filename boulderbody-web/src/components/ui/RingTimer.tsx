/**
 * RingTimer.tsx
 *
 * Conic-gradient countdown timer with three visual states (prep/hold/rest).
 * Used by the training session for prep → hang → rest cycles.
 *
 * Timing is deadline-based: we record an absolute end time when the timer
 * opens (or resumes after pause) and derive the displayed remaining seconds
 * from Date.now() on each tick. setInterval drift and React render lag
 * therefore can't make a 5-second hang feel like 6 — the worst case is a
 * slightly stale frame, never an accumulated stretch.
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

const TICK_MS = 100;

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
  const [remainingMs, setRemainingMs] = useState(duration * 1000);
  const deadlineRef = useRef<number | null>(null);
  const pausedRemainingRef = useRef<number | null>(null);
  const completedRef = useRef(false);

  // Reset when the timer is (re)opened or duration changes.
  const openKey = `${isOpen}-${duration}`;
  const lastKeyRef = useRef(openKey);
  if (lastKeyRef.current !== openKey) {
    lastKeyRef.current = openKey;
    completedRef.current = false;
    deadlineRef.current = null;
    pausedRemainingRef.current = null;
    setRemainingMs(duration * 1000);
  }

  useEffect(() => {
    if (!isOpen) return;

    if (isPaused) {
      // Freeze: capture remaining from deadline, drop the interval.
      if (deadlineRef.current != null) {
        pausedRemainingRef.current = Math.max(
          0,
          deadlineRef.current - Date.now()
        );
        deadlineRef.current = null;
      }
      return;
    }

    // (Re)start: seed deadline from paused snapshot if resuming, else from duration.
    if (deadlineRef.current == null) {
      const baseRemaining =
        pausedRemainingRef.current != null
          ? pausedRemainingRef.current
          : duration * 1000;
      deadlineRef.current = Date.now() + baseRemaining;
      pausedRemainingRef.current = null;
      setRemainingMs(baseRemaining);
    }

    const tick = () => {
      const deadline = deadlineRef.current;
      if (deadline == null) return;
      const left = Math.max(0, deadline - Date.now());
      setRemainingMs(left);
      if (left <= 0 && !completedRef.current) {
        completedRef.current = true;
        onComplete();
      }
    };

    tick(); // immediate render so the first second isn't "frozen"
    const id = setInterval(tick, TICK_MS);
    return () => clearInterval(id);
  }, [isOpen, duration, onComplete, isPaused]);

  if (!isOpen) return null;

  const totalMs = duration * 1000;
  const progress = Math.max(0, Math.min(1, (totalMs - remainingMs) / totalMs));
  const percent = `${(progress * 100).toFixed(1)}%`;

  // Ceil so a 5s timer opens displaying "5", not "4".
  const remainingSec = Math.ceil(remainingMs / 1000);
  const m = Math.floor(remainingSec / 60);
  const s = remainingSec % 60;
  const display =
    duration >= 60 ? `${m}:${s.toString().padStart(2, '0')}` : String(remainingSec);

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
            className={`absolute inset-0 rounded-full ${stateClass[state]}`}
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
