/**
 * MaxTestPrompt.tsx
 *
 * Modal prompt shown after a hang or pull-up max-test set completes its rest
 * period. Asks whether the user held the attempt. When `allowMiss` is false
 * (i.e. still in the warmup ramp phase), the Missed button is hidden so missing
 * a warmup can't be mistaken for a discovered max.
 */

interface Props {
  isOpen: boolean;
  weightKg: number;
  exerciseLabel: string;
  holdDurationSec: number;
  /** Weight the ramp will jump to on Held. Shown as hint below the button. */
  nextWeightOnHeld?: number;
  /** Weight to lock the discovered max at on Missed. Shown as hint. */
  lockedMaxOnMiss?: number;
  allowMiss: boolean;
  onHeld: () => void;
  onMissed: () => void;
}

export function MaxTestPrompt({
  isOpen,
  weightKg,
  exerciseLabel,
  holdDurationSec,
  nextWeightOnHeld,
  lockedMaxOnMiss,
  allowMiss,
  onHeld,
  onMissed,
}: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-ink/60 flex items-center justify-center p-6 z-50">
      <div className="paper-tex rounded-[28px] shadow-pebble border border-line p-6 max-w-sm w-full">
        <div className="stamp mb-1">
          Max-test · <span className="font-mono">{formatWeight(weightKg)} kg</span>
        </div>
        <h3 className="font-display text-[26px] leading-tight mb-5">
          Did you hold it
          <br />
          for {holdDurationSec} seconds?
        </h3>

        <div className={`grid gap-3 ${allowMiss ? 'grid-cols-2' : 'grid-cols-1'}`}>
          <button
            type="button"
            onClick={onHeld}
            className="py-5 rounded-2xl bg-gold text-ink font-semibold shadow-pebble flex flex-col items-center gap-1"
          >
            <span className="text-2xl">✓</span>
            <span>Held</span>
            {nextWeightOnHeld != null && (
              <span className="text-[10px] text-graphite font-normal">
                ramp to {formatWeight(nextWeightOnHeld)} kg
              </span>
            )}
          </button>
          {allowMiss && (
            <button
              type="button"
              onClick={onMissed}
              className="py-5 rounded-2xl bg-chalk border-2 border-graphite/30 text-ink font-semibold flex flex-col items-center gap-1"
            >
              <span className="text-2xl">✕</span>
              <span>Missed</span>
              {lockedMaxOnMiss != null && (
                <span className="text-[10px] text-graphite font-normal">
                  lock max at {formatWeight(lockedMaxOnMiss)} kg
                </span>
              )}
            </button>
          )}
        </div>

        <div className="mt-4 p-3 rounded-xl bg-chalk/60 border border-line text-[11px] text-graphite">
          {allowMiss ? (
            <>
              <span className="font-semibold text-ink dark:text-paper">What happens next?</span>{' '}
              Missing sets today's max · generate 3 working sets below that weight.
            </>
          ) : (
            <>
              <span className="font-semibold text-ink dark:text-paper">Warm-up.</span>{' '}
              Tap Held to continue the {exerciseLabel.toLowerCase()} ramp.
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function formatWeight(w: number): string {
  return Number.isInteger(w) ? String(w) : w.toFixed(1).replace(/\.0$/, '');
}
