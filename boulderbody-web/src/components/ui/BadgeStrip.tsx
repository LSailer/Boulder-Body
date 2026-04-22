import type { EarnedBadge } from '../../models/Gamification';
import { BadgeChip } from './BadgeChip';
import { StampLabel } from './StampLabel';

export function BadgeStrip({
  badges,
  max = 5,
  title = 'Recent badges',
}: {
  badges: EarnedBadge[];
  max?: number;
  title?: string;
}) {
  if (badges.length === 0) return null;
  const sorted = [...badges].sort(
    (a, b) => b.unlockedAt.getTime() - a.unlockedAt.getTime()
  );
  const top = sorted.slice(0, max);
  return (
    <div>
      <StampLabel className="mb-2 block">{title}</StampLabel>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {top.map((b) => (
          <BadgeChip key={`${b.id}-${b.sessionId}`} id={b.id} />
        ))}
      </div>
    </div>
  );
}
