import type { SessionType } from '../../models/SessionType';

const OPTIONS: { value: SessionType; icon: string; label: string }[] = [
  { value: 'volume', icon: '🧗', label: 'Climbing' },
  { value: 'route', icon: '🎯', label: 'Routes' },
  { value: 'training', icon: '💪', label: 'Training' },
];

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
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-1.5 font-semibold text-sm transition-colors ${
            value === opt.value ? baseOn : baseOff
          }`}
        >
          <span className={value === opt.value ? '' : 'opacity-60'}>{opt.icon}</span>
          <span>{opt.label}</span>
        </button>
      ))}
    </div>
  );
}
