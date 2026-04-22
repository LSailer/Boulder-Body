import { StampLabel } from './StampLabel';

export function Counter({
  label,
  value,
  onChange,
  min = 1,
  max = 99,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  const clamp = (n: number) => Math.max(min, Math.min(max, n));
  return (
    <div className="p-3 rounded-xl border border-line bg-chalk/50 dark:bg-basalt/40">
      <StampLabel className="mb-1 block">{label}</StampLabel>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => onChange(clamp(value - step))}
          className="w-7 h-7 rounded-lg bg-paper border border-line text-ink font-bold hover:bg-chalk active:shadow-pressed"
          aria-label={`Decrease ${label}`}
        >
          −
        </button>
        <span className="font-display text-2xl">{value}</span>
        <button
          type="button"
          onClick={() => onChange(clamp(value + step))}
          className="w-7 h-7 rounded-lg bg-paper border border-line text-ink font-bold hover:bg-chalk active:shadow-pressed"
          aria-label={`Increase ${label}`}
        >
          +
        </button>
      </div>
    </div>
  );
}
