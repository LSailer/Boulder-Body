import type { SessionType } from '../../models/SessionType';

export function SessionTypeToggle({
  value,
  onChange,
}: {
  value: SessionType;
  onChange: (v: SessionType) => void;
}) {
  const baseOn = 'bg-paper shadow-pebble border border-line text-ink';
  const baseOff = 'text-graphite hover:text-ink';
  return (
    <div className="p-1 rounded-2xl bg-chalk border border-line flex gap-1">
      <button
        type="button"
        onClick={() => onChange('volume')}
        className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 font-semibold transition-colors ${
          value === 'volume' ? baseOn : baseOff
        }`}
      >
        <span className={value === 'volume' ? '' : 'opacity-60'}>🧗</span>
        <span>Climbing</span>
      </button>
      <button
        type="button"
        onClick={() => onChange('training')}
        className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 font-semibold transition-colors ${
          value === 'training' ? baseOn : baseOff
        }`}
      >
        <span className={value === 'training' ? '' : 'opacity-60'}>💪</span>
        <span>Training</span>
      </button>
    </div>
  );
}
