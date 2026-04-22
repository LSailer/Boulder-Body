import { StampLabel } from './StampLabel';

export function LevelUpBanner({
  xpEarned,
  xpToNext,
  nextLevel,
  subtitle,
}: {
  xpEarned: number;
  xpToNext?: number;
  nextLevel?: number;
  subtitle?: string;
}) {
  const almost = xpToNext != null && xpToNext < 200;
  return (
    <div className="p-4 rounded-2xl bg-gradient-to-br from-gold/25 via-rust/10 to-gold/5 border border-gold/40 relative overflow-hidden">
      <div className="absolute top-2 right-3 text-3xl select-none">🏆</div>
      <StampLabel tone="rust">Session complete</StampLabel>
      <div className="font-display text-2xl mt-0.5">+{xpEarned} XP earned.</div>
      {(subtitle || xpToNext != null) && (
        <div className="text-sm text-graphite mt-1">
          {subtitle ??
            (xpToNext != null && nextLevel != null ? (
              <>
                {xpToNext} XP to Level {nextLevel}
                {almost ? (
                  <>
                    {' · '}
                    <span className="font-semibold text-rust">almost there</span>
                  </>
                ) : null}
              </>
            ) : null)}
        </div>
      )}
    </div>
  );
}
