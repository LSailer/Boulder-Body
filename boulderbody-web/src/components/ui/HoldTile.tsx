/**
 * HoldTile.tsx
 *
 * A single boulder tile rendered in the climbing grid. Uses one of six
 * asymmetric border-radius utilities (.hold-1..6) based on `order` so the tiles
 * feel hand-placed, not gridded.
 */

export type HoldState = 'send' | 'top' | 'project' | 'current' | 'empty';

export function HoldTile({
  order,
  state,
  onClick,
}: {
  order: number;
  state: HoldState;
  onClick?: () => void;
}) {
  const holdClass = `hold-${((order - 1) % 6) + 1}`;

  const stateClasses: Record<HoldState, string> = {
    send: 'bg-gold/90 text-ink shadow-pebble ring-gold',
    top: 'bg-moss text-paper shadow-pebble',
    project: 'bg-graphite text-paper shadow-pebble',
    current:
      'bg-rust text-paper shadow-pebble ring-2 ring-rust/50 ring-offset-2 ring-offset-chalk animate-pulse',
    empty:
      'bg-paper border-2 border-dashed border-line text-graphite dark:bg-basalt/40',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative aspect-square ${holdClass} ${stateClasses[state]} flex items-center justify-center font-display text-2xl transition-transform active:scale-95`}
      aria-label={`Boulder ${order} · ${state}`}
    >
      {order}
    </button>
  );
}
