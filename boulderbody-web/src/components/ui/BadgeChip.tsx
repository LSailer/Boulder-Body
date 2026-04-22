import type { BadgeId, BadgeTint } from '../../models/Gamification';
import { BADGE_CATALOG } from '../../models/Gamification';

const tintClass: Record<BadgeTint, string> = {
  gold: 'bg-gold/15 border-gold/40',
  moss: 'bg-moss/15 border-moss/40',
  rust: 'bg-rust/15 border-rust/40',
};

export function BadgeChip({ id }: { id: BadgeId }) {
  const def = BADGE_CATALOG[id];
  return (
    <div
      className={`shrink-0 px-3 py-2 rounded-full border text-xs font-semibold flex items-center gap-1.5 text-ink dark:text-paper ${tintClass[def.tint]}`}
      title={def.description}
    >
      <span>{def.icon}</span>
      <span>{def.title}</span>
    </div>
  );
}
