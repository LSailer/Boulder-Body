/**
 * RampBar.tsx
 *
 * Horizontal strip visualizing the hang/pull-up ramp-up: completed warmup sets
 * (gold/rust filled, weight labels), the current active set (larger, highlighted),
 * and upcoming dashed tiles. Used in the training session dashboard.
 */

type Tone = 'gold' | 'rust';

export function RampBar({
  completed,
  current,
  upcoming,
  tone = 'gold',
  rampLabel = '+5 kg ramp',
  nextLabel = '+2.5 kg max-test ↑',
}: {
  completed: number[];
  current: number | null;
  upcoming: number[];
  tone?: Tone;
  rampLabel?: string;
  nextLabel?: string;
}) {
  const completedClass = tone === 'gold' ? 'bg-gold/90 text-ink' : 'bg-rust/90 text-paper';
  const currentClass =
    tone === 'gold'
      ? 'bg-rust text-paper ring-2 ring-rust/30 ring-offset-2 ring-offset-paper'
      : 'bg-rustdark text-paper ring-2 ring-rust/30 ring-offset-2 ring-offset-paper';

  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className="text-graphite">Warm-up ramp</span>
        {current != null && (
          <span className="font-mono text-ink dark:text-paper font-semibold">
            now{' '}
            <span className={tone === 'gold' ? 'text-gold' : 'text-rust'}>
              {formatWeight(current)} kg
            </span>
          </span>
        )}
      </div>
      <div className="flex gap-1 items-end">
        {completed.map((w, i) => (
          <div
            key={`c-${i}-${w}`}
            className={`flex-1 h-10 rounded-md ${completedClass} flex flex-col items-center justify-center`}
          >
            <span className="font-mono text-[10px] font-semibold">{formatWeight(w)}</span>
            <span className="text-[8px] opacity-70">✓</span>
          </div>
        ))}
        {current != null && (
          <div
            className={`flex-1 h-12 rounded-md ${currentClass} flex flex-col items-center justify-center`}
          >
            <span className="font-mono text-[11px] font-bold">{formatWeight(current)}</span>
            <span className="text-[8px]">now</span>
          </div>
        )}
        {upcoming.map((w, i) => (
          <div
            key={`u-${i}-${w}`}
            className="flex-1 h-10 rounded-md bg-chalk border border-dashed border-line text-graphite flex items-center justify-center dark:bg-basalt/50"
          >
            <span className="font-mono text-[10px]">{formatWeight(w)}</span>
          </div>
        ))}
      </div>
      <div className="text-[10px] text-graphite mt-1 flex justify-between">
        <span>{rampLabel}</span>
        <span>{nextLabel}</span>
      </div>
    </div>
  );
}

function formatWeight(w: number): string {
  return Number.isInteger(w) ? String(w) : w.toFixed(1).replace(/\.0$/, '');
}
