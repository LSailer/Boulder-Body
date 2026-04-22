import type { LevelInfo } from '../../models/Gamification';
import { vGradeLabelForLevel } from '../../models/Gamification';

export function XPCard({
  levelInfo,
  streak,
}: {
  levelInfo: LevelInfo;
  streak: number;
}) {
  const { level, currentXP, xpToNext, progress01 } = levelInfo;
  const percent = Math.round(progress01 * 100);
  const totalForLevel = currentXP + xpToNext;
  return (
    <div className="p-5 rounded-2xl bg-basalt text-paper relative overflow-hidden">
      <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-rust/10 pointer-events-none" />
      <div className="absolute -right-14 -bottom-14 w-40 h-40 rounded-full bg-gold/10 pointer-events-none" />
      <div className="relative">
        <div className="flex items-center justify-between mb-1">
          <span className="stamp text-paper/70">Climber level</span>
          <span className="text-xs text-paper/70 font-medium font-mono">
            {currentXP} / {totalForLevel} XP
          </span>
        </div>
        <div className="flex items-end gap-3 mb-3">
          <div className="font-display text-[56px] leading-none text-paper">{level}</div>
          <div className="pb-2 text-sm text-paper/70">
            {vGradeLabelForLevel(level)} · {levelTier(level)}
          </div>
        </div>
        <div className="h-2 rounded-full bg-paper/10 overflow-hidden">
          <div
            className="h-full xp-fill rounded-full transition-[width] duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="mt-3 flex items-center justify-between text-xs">
          <span className="text-paper/70">{xpToNext} XP to Level {level + 1}</span>
          {streak > 0 && (
            <span className="inline-flex items-center gap-1.5 text-gold font-semibold">
              <span className="flame">🔥</span> {streak}-day streak
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function levelTier(level: number): string {
  if (level <= 2) return 'Beginner';
  if (level <= 4) return 'Improver';
  if (level <= 6) return 'Intermediate';
  if (level <= 8) return 'Advanced';
  return 'Expert';
}
