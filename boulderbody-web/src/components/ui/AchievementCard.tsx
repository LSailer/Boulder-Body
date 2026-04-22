import type { EarnedBadge } from '../../models/Gamification';
import { BADGE_CATALOG } from '../../models/Gamification';
import { StampLabel } from './StampLabel';

export function AchievementCard({ badge }: { badge: EarnedBadge }) {
  const def = BADGE_CATALOG[badge.id];
  const tintBg =
    def.tint === 'gold'
      ? 'bg-gold/12 border-gold/40'
      : def.tint === 'rust'
      ? 'bg-rust/12 border-rust/40'
      : 'bg-moss/12 border-moss/40';
  const iconBg =
    def.tint === 'gold'
      ? 'bg-gold text-ink'
      : def.tint === 'rust'
      ? 'bg-rust text-paper'
      : 'bg-moss text-paper';
  const stampTone =
    def.tint === 'gold' ? 'gold' : def.tint === 'rust' ? 'rust' : 'moss';
  return (
    <div className={`p-4 rounded-2xl border flex items-center gap-3 ${tintBg}`}>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shadow-pebble ${iconBg}`}>
        {def.icon}
      </div>
      <div className="flex-1">
        <StampLabel tone={stampTone as 'gold' | 'rust' | 'moss'}>Badge unlocked</StampLabel>
        <div className="font-display text-lg leading-tight">{def.title}</div>
        <div className="text-xs text-graphite">{def.description}</div>
      </div>
    </div>
  );
}
