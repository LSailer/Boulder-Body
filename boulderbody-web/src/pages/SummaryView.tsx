import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type {
  Session,
  TrainingSession,
  VolumeSession,
  RouteSession,
} from '../models/Session';
import {
  isVolumeSession,
  isTrainingSession,
  isRouteSession,
  getAttemptCounts,
  getRouteCounts,
  getRoutePercentages,
  getSessionDuration,
} from '../models/Session';
import type { RouteEntry } from '../models/RouteEntry';
import {
  getAllSessions,
  deleteSession,
  getBadges,
  getLastRouteSessionForGym,
} from '../logic/StorageManager';
import { getTrainingRecommendation } from '../logic/TrainingRecommender';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { StampLabel } from '../components/ui/StampLabel';
import { LevelUpBanner } from '../components/ui/LevelUpBanner';
import { AchievementCard } from '../components/ui/AchievementCard';
import {
  computeSessionXP,
  computeTotalXP,
  computeLevel,
} from '../logic/XPCalculator';

/*
 * Summary view — redesigned. Shows either a volume donut summary or a training
 * max/working-set summary, plus any badges that were unlocked by this session,
 * and an XP-earned banner. Bench/trap-bar only render if the session actually
 * has sets for them (legacy sessions).
 */

export function SummaryView() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [prevTraining, setPrevTraining] = useState<TrainingSession | null>(null);
  const [prevRoute, setPrevRoute] = useState<RouteSession | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      navigate('/');
      return;
    }
    const allSessions = getAllSessions();
    const found = allSessions.find((s) => s.id === sessionId);
    if (!found) {
      navigate('/');
      return;
    }
    setSession(found);

    if (isTrainingSession(found)) {
      const priorTraining = allSessions
        .filter(
          (s): s is TrainingSession =>
            isTrainingSession(s) && s.isFinished && s.id !== found.id
        )
        .sort((a, b) => b.date.getTime() - a.date.getTime());
      setPrevTraining(priorTraining[0] ?? null);
    }

    if (isRouteSession(found)) {
      setPrevRoute(getLastRouteSessionForGym(found.gymId, found.id));
    }
  }, [sessionId, navigate]);

  const xpThisSession = useMemo(
    () => (session ? computeSessionXP(session) : 0),
    [session]
  );
  const levelInfo = useMemo(() => {
    if (!session) return null;
    const all = getAllSessions();
    return computeLevel(computeTotalXP(all));
    // `session` isn't strictly referenced inside, but we want to recompute
    // once the session has loaded so the banner shows correct XP-to-next.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);
  const unlockedThisSession = useMemo(() => {
    if (!session) return [];
    return getBadges().filter((b) => b.sessionId === session.id);
  }, [session]);

  if (!session) return null;

  const duration = getSessionDuration(session);
  const dateStamp = session.date
    .toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
    .replace(',', ' ·');

  const handleDelete = () => {
    deleteSession(session.id);
    navigate('/');
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-[420px] mx-auto px-5 pt-5 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-10 h-10 rounded-full border border-line bg-paper/60 flex items-center justify-center text-ink hover:bg-chalk dark:bg-basalt/60 dark:text-paper"
            aria-label="Home"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            </svg>
          </button>
          <StampLabel>Session report</StampLabel>
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="w-10 h-10 rounded-full border border-line bg-paper/60 flex items-center justify-center text-graphite hover:text-rust dark:bg-basalt/60"
            aria-label="Delete session"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            </svg>
          </button>
        </div>

        {/* XP banner */}
        {levelInfo && (
          <div className="mb-5">
            <LevelUpBanner
              xpEarned={xpThisSession}
              xpToNext={levelInfo.xpToNext}
              nextLevel={levelInfo.level + 1}
            />
          </div>
        )}

        {isVolumeSession(session) && (
          <VolumeSummary session={session} dateStamp={dateStamp} duration={duration} />
        )}

        {isRouteSession(session) && (
          <RouteSummary
            session={session}
            prevSession={prevRoute}
            dateStamp={dateStamp}
            duration={duration}
          />
        )}

        {isTrainingSession(session) && (
          <TrainingSummary
            session={session}
            prevSession={prevTraining}
            dateStamp={dateStamp}
            duration={duration}
          />
        )}

        {unlockedThisSession.length > 0 && (
          <div className="space-y-2 mb-5">
            {unlockedThisSession.map((b) => (
              <AchievementCard key={`${b.id}-${b.sessionId}`} badge={b} />
            ))}
          </div>
        )}

        {isVolumeSession(session) && <VolumeNotes session={session} />}
        {isTrainingSession(session) && <TrainingNotes session={session} />}

        {/* CTAs */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-full py-4 rounded-xl bg-rust hover:bg-rustdark text-paper font-semibold tracking-wide shadow-pebble transition-colors"
          >
            Start new session →
          </button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete session"
        message={`Delete session from ${dateStamp}? This cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}

/*
 * ────────────────────────────────────────────────────────────────────────────
 * Volume summary
 * ────────────────────────────────────────────────────────────────────────────
 */

function VolumeSummary({
  session,
  dateStamp,
  duration,
}: {
  session: VolumeSession;
  dateStamp: string;
  duration: string;
}) {
  const counts = getAttemptCounts(session);
  const total = session.boulderCount;
  const sends = counts.flash;
  const tops = counts.done;
  const projects = counts.fail + counts.unlogged;
  const successCount = sends + tops;
  const successPct = total > 0 ? Math.round((successCount / total) * 100) : 0;

  // Conic-gradient percentages — rounded to 0.1%, stacked.
  const pctSends = total > 0 ? (sends / total) * 100 : 0;
  const pctTops = total > 0 ? (tops / total) * 100 : 0;
  const donutStyle = {
    background: `conic-gradient(
      #e8a93c 0 ${pctSends}%,
      #4a5d3a ${pctSends}% ${pctSends + pctTops}%,
      #6b6b6b ${pctSends + pctTops}% 100%
    )`,
  } as const;

  const bestFlashStreak = longestFlashStreak(session);
  const avgMsPerLogged = avgMillisPerLogged(session);

  return (
    <>
      <div className="mb-4 p-5 rounded-2xl bg-paper border border-line paper-tex">
        <div className="flex items-center justify-between mb-1">
          <StampLabel>{dateStamp}</StampLabel>
          <span className="text-[11px] text-graphite">{duration}</span>
        </div>
        <div className="font-display text-[22px] leading-tight mb-4">
          V{session.targetLevel} · {session.boulderCount} boulders
        </div>

        <div className="flex items-center gap-5">
          <div className="relative w-36 h-36 shrink-0">
            <div className="w-full h-full rounded-full" style={donutStyle} />
            <div className="absolute inset-[14px] paper-tex rounded-full flex flex-col items-center justify-center border border-line">
              <div className="font-display text-3xl leading-none">{successPct}%</div>
              <div className="stamp mt-1">Success</div>
            </div>
          </div>
          <div className="flex-1 space-y-3">
            <LegendRow dotClass="bg-gold" label="Sends" value={sends} />
            <LegendRow dotClass="bg-moss" label="Tops" value={tops} />
            <LegendRow dotClass="bg-graphite" label="Projects" value={projects} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <MetaCard label="Best streak" value={`${bestFlashStreak} flashes`} />
        <MetaCard
          label="Avg per boulder"
          value={avgMsPerLogged != null ? formatMs(avgMsPerLogged) : '—'}
        />
      </div>
    </>
  );
}

function LegendRow({
  dotClass,
  label,
  value,
}: {
  dotClass: string;
  label: string;
  value: number;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-0.5">
        <span className={`w-2.5 h-2.5 rounded-full ${dotClass}`} />
        <StampLabel>{label}</StampLabel>
      </div>
      <div className="font-display text-2xl leading-none">{value}</div>
    </div>
  );
}

function MetaCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4 rounded-2xl border border-line paper-tex">
      <StampLabel className="mb-1 block">{label}</StampLabel>
      <div className="font-display text-xl">{value}</div>
    </div>
  );
}

function VolumeNotes({ session }: { session: VolumeSession }) {
  const withComments = session.attempts.filter((a) => a.comment && a.comment.trim());
  if (withComments.length === 0) return null;
  return (
    <>
      <hr className="zine-rule my-5" />
      <div className="mb-5">
        <StampLabel className="mb-2 block">Notes from the wall</StampLabel>
        <div className="space-y-2">
          {withComments.map((a) => (
            <div
              key={a.id}
              className="p-3 rounded-xl bg-chalk border border-line dark:bg-basalt/40"
            >
              <div className="text-xs text-graphite mb-0.5">
                Boulder {String(a.order).padStart(2, '0')} ·{' '}
                {a.result === 'flash' ? 'Send' : a.result === 'done' ? 'Top' : 'Project'}
              </div>
              <div className="text-sm">{a.comment}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function longestFlashStreak(session: VolumeSession): number {
  let best = 0;
  let run = 0;
  for (const a of session.attempts) {
    if (a.result === 'flash') {
      run += 1;
      if (run > best) best = run;
    } else {
      run = 0;
    }
  }
  return best;
}

function avgMillisPerLogged(session: VolumeSession): number | null {
  if (!session.endTime) return null;
  const logged = session.attempts.filter((a) => a.result !== undefined).length;
  if (logged === 0) return null;
  const span = session.endTime.getTime() - session.startTime.getTime();
  return span / logged;
}

function formatMs(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/*
 * ────────────────────────────────────────────────────────────────────────────
 * Route summary
 * ────────────────────────────────────────────────────────────────────────────
 */

function RouteSummary({
  session,
  prevSession,
  dateStamp,
  duration,
}: {
  session: RouteSession;
  prevSession: RouteSession | null;
  dateStamp: string;
  duration: string;
}) {
  const counts = getRouteCounts(session.routes);
  const total = counts.total;
  const pctThis = getRoutePercentages(session.routes);
  const pctPrev = prevSession ? getRoutePercentages(prevSession.routes) : null;

  // "Sent" = flash + send, mirroring how the volume donut treats success.
  const sentPct = total > 0 ? Math.round(((counts.flash + counts.send) / total) * 100) : 0;

  const donutStyle = {
    background: `conic-gradient(
      #e8a93c 0 ${pctThis.flash}%,
      #4a5d3a ${pctThis.flash}% ${pctThis.flash + pctThis.send}%,
      #6b6b6b ${pctThis.flash + pctThis.send}% 100%
    )`,
  } as const;

  // Per-level breakdown, ascending. Levels with no routes are omitted.
  const levels = Array.from(new Set(session.routes.map((r) => r.level))).sort(
    (a, b) => a - b
  );

  return (
    <>
      <div className="mb-4 p-5 rounded-2xl bg-paper border border-line paper-tex">
        <div className="flex items-center justify-between mb-1">
          <StampLabel>{dateStamp}</StampLabel>
          <span className="text-[11px] text-graphite">{duration}</span>
        </div>
        <div className="font-display text-[22px] leading-tight mb-4">
          {session.gymName} · {total} {total === 1 ? 'route' : 'routes'}
        </div>

        <div className="flex items-center gap-5">
          <div className="relative w-36 h-36 shrink-0">
            <div className="w-full h-full rounded-full" style={donutStyle} />
            <div className="absolute inset-[14px] paper-tex rounded-full flex flex-col items-center justify-center border border-line">
              <div className="font-display text-3xl leading-none">{sentPct}%</div>
              <div className="stamp mt-1">Sent</div>
            </div>
          </div>
          <div className="flex-1 space-y-3">
            <LegendRow dotClass="bg-gold" label="Flash" value={counts.flash} />
            <LegendRow dotClass="bg-moss" label="Send" value={counts.send} />
            <LegendRow dotClass="bg-graphite" label="Fail" value={counts.fail} />
          </div>
        </div>
      </div>

      {/* Comparison vs. previous session at the same gym */}
      <div className="mb-2 flex items-center justify-between">
        <StampLabel>vs. your last session here</StampLabel>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-2">
        <CompareCard tone="gold" label="Flash" pct={pctThis.flash} prevPct={pctPrev?.flash ?? null} />
        <CompareCard tone="moss" label="Send" pct={pctThis.send} prevPct={pctPrev?.send ?? null} />
        <CompareCard tone="graphite" label="Fail" pct={pctThis.fail} prevPct={pctPrev?.fail ?? null} />
      </div>
      <p className="text-[11px] text-graphite mb-5">
        {prevSession
          ? `Compared against your previous session at ${session.gymName}.`
          : `No previous session at ${session.gymName} yet — this is your baseline.`}
      </p>

      {/* Per-level breakdown */}
      <hr className="zine-rule my-5" />
      <StampLabel className="mb-3 block">Breakdown by level</StampLabel>
      {total === 0 ? (
        <p className="text-xs text-graphite mb-5">No routes were logged this session.</p>
      ) : (
        <div className="space-y-2 mb-5">
          {levels.map((lv) => (
            <LevelBreakdownRow
              key={lv}
              level={lv}
              routes={session.routes.filter((r) => r.level === lv)}
            />
          ))}
        </div>
      )}
    </>
  );
}

function CompareCard({
  tone,
  label,
  pct,
  prevPct,
}: {
  tone: 'gold' | 'moss' | 'graphite';
  label: string;
  pct: number;
  prevPct: number | null;
}) {
  const borderClass = {
    gold: 'border-gold/40',
    moss: 'border-moss/40',
    graphite: 'border-graphite/40',
  }[tone];
  const stampTone = tone;

  const deltaEl = () => {
    if (prevPct === null) {
      return <span className="text-[11px] text-graphite font-semibold">— first here</span>;
    }
    const d = pct - prevPct;
    if (d > 0) {
      return (
        <span className="text-[11px] text-moss font-semibold">↑ +{d}% vs {prevPct}%</span>
      );
    }
    if (d < 0) {
      return (
        <span className="text-[11px] text-rust font-semibold">↓ {d}% vs {prevPct}%</span>
      );
    }
    return <span className="text-[11px] text-graphite font-semibold">→ same</span>;
  };

  return (
    <div className={`p-3 rounded-2xl border-2 ${borderClass}`}>
      <StampLabel tone={stampTone}>{label}</StampLabel>
      <div className="font-display text-[30px] leading-none mt-1">{pct}%</div>
      <div className="mt-2">{deltaEl()}</div>
    </div>
  );
}

function LevelBreakdownRow({ level, routes }: { level: number; routes: RouteEntry[] }) {
  const c = getRouteCounts(routes);
  const sentPct = c.total > 0 ? Math.round(((c.flash + c.send) / c.total) * 100) : 0;
  const seg = (n: number, cls: string) =>
    n > 0 ? <span className={cls} style={{ width: `${(n / c.total) * 100}%` }} /> : null;
  return (
    <div className="flex items-center gap-3">
      <span className="w-8 h-8 rounded-lg bg-chalk border border-line flex items-center justify-center font-mono font-bold text-sm dark:bg-basalt">
        {level}
      </span>
      <div className="flex-1 h-2 rounded-full bg-line overflow-hidden flex">
        {seg(c.flash, 'bg-gold')}
        {seg(c.send, 'bg-moss')}
        {seg(c.fail, 'bg-graphite')}
      </div>
      <span className="font-mono text-xs text-graphite w-8 text-right">{c.total}</span>
      <span className="font-mono text-xs font-semibold w-10 text-right">{sentPct}%</span>
    </div>
  );
}

/*
 * ────────────────────────────────────────────────────────────────────────────
 * Training summary
 * ────────────────────────────────────────────────────────────────────────────
 */

function TrainingSummary({
  session,
  prevSession,
  dateStamp,
  duration,
}: {
  session: TrainingSession;
  prevSession: TrainingSession | null;
  dateStamp: string;
  duration: string;
}) {
  const { trainingData } = session;
  const currHang = trainingData.discoveredMax?.hang;
  const prevHang = prevSession?.trainingData.discoveredMax?.hang;
  const deltaHang = currHang != null && prevHang != null ? currHang - prevHang : null;

  const currPull = trainingData.discoveredMax?.pullup;
  const prevPull = prevSession?.trainingData.discoveredMax?.pullup;
  const deltaPull = currPull != null && prevPull != null ? currPull - prevPull : null;

  const hangWorking = trainingData.hangSets.filter((s) => s.setType === 'working');
  const hangWorkingCompleted = hangWorking.filter((s) => s.completed).length;
  const hangWorkingWeight = hangWorking[0]?.weight;

  const pullWorking = trainingData.pullupSets.filter((s) => s.setType === 'working');
  const pullWorkingCompleted = pullWorking.filter((s) => s.completed).length;
  const pullWorkingWeight = pullWorking[0]?.weight;

  const benchSets = trainingData.benchSets ?? [];
  const trapBarSets = trainingData.trapBarSets ?? [];
  const nextRec = getTrainingRecommendation(session);

  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <StampLabel>{dateStamp}</StampLabel>
        <span className="text-[11px] text-graphite">{duration}</span>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-3">
        <MaxCard
          tone="gold"
          label="Max hang"
          value={currHang}
          delta={deltaHang}
          prevValue={prevHang}
        />
        <MaxCard
          tone="rust"
          label="Max pull-up"
          value={currPull}
          delta={deltaPull}
          prevValue={prevPull}
        />
      </div>

      <div className="mb-3 p-4 rounded-2xl border border-line paper-tex">
        <StampLabel className="mb-3 block">Working sets</StampLabel>
        <div className="space-y-2 text-sm">
          {hangWorking.length > 0 && (
            <WorkingRow
              tone="gold"
              label="Hang"
              weight={hangWorkingWeight}
              completed={hangWorkingCompleted}
              total={hangWorking.length}
            />
          )}
          {pullWorking.length > 0 && (
            <WorkingRow
              tone="rust"
              label="Pull-up"
              weight={pullWorkingWeight}
              completed={pullWorkingCompleted}
              total={pullWorking.length}
            />
          )}
          {hangWorking.length === 0 && pullWorking.length === 0 && (
            <div className="text-xs text-graphite">No working sets recorded.</div>
          )}
        </div>
      </div>

      {(benchSets.length > 0 || trapBarSets.length > 0) && (
        <div className="mb-3 p-4 rounded-2xl border border-line paper-tex">
          <StampLabel className="mb-3 block">Accessories (legacy)</StampLabel>
          <div className="space-y-2 text-sm">
            {benchSets.length > 0 && (
              <WorkingRow
                tone="gold"
                label="Bench"
                weight={trainingData.benchWeight}
                completed={benchSets.filter((s) => s.completed).length}
                total={benchSets.length}
              />
            )}
            {trapBarSets.length > 0 && (
              <WorkingRow
                tone="rust"
                label="Trap bar"
                weight={trainingData.trapBarWeight}
                completed={trapBarSets.filter((s) => s.completed).length}
                total={trapBarSets.length}
              />
            )}
          </div>
        </div>
      )}

      <hr className="zine-rule my-4" />
      <div className="mb-5">
        <StampLabel className="mb-2 block">Next training — we suggest</StampLabel>
        <div className="p-4 rounded-2xl bg-chalk border border-line dark:bg-basalt/40">
          <div className="grid grid-cols-2 gap-y-2 text-sm">
            <div className="text-graphite">Hang start</div>
            <div className="font-mono font-semibold text-right">
              {formatKg(nextRec.hangStart)}
            </div>
            <div className="text-graphite">Pull-up start</div>
            <div className="font-mono font-semibold text-right">
              {formatKg(nextRec.pullupStart)}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function TrainingNotes({ session }: { session: TrainingSession }) {
  const allSets = [
    ...session.trainingData.hangSets,
    ...session.trainingData.pullupSets,
  ];
  const withNotes = allSets.filter((s) => s.notes && s.notes.trim());
  if (withNotes.length === 0) return null;
  return (
    <>
      <hr className="zine-rule my-4" />
      <div className="mb-5">
        <StampLabel className="mb-2 block">Notes from the rig</StampLabel>
        <div className="space-y-2">
          {withNotes.map((s) => (
            <div
              key={s.id}
              className="p-3 rounded-xl bg-chalk border border-line dark:bg-basalt/40"
            >
              <div className="text-xs text-graphite mb-0.5">
                {s.exercise === 'hang' ? 'Hang' : 'Pull-up'} · {formatKg(s.weight ?? 0)}
              </div>
              <div className="text-sm">{s.notes}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function MaxCard({
  tone,
  label,
  value,
  delta,
  prevValue,
}: {
  tone: 'gold' | 'rust';
  label: string;
  value?: number;
  delta: number | null;
  prevValue?: number;
}) {
  const styleClass =
    tone === 'gold' ? 'border-gold/40 bg-gold/10' : 'border-rust/40 bg-rust/10';
  const stampTone: 'gold' | 'rust' = tone;
  const deltaEl = () => {
    if (value == null) {
      return (
        <span className="text-[11px] text-graphite font-semibold">not tested</span>
      );
    }
    if (delta === null) {
      return (
        <span className="text-[11px] text-graphite font-semibold">— no prior</span>
      );
    }
    if (delta > 0) {
      return (
        <span className="text-[11px] text-moss font-semibold">
          ↑ +{formatNum(delta)} vs {formatNum(prevValue!)}
        </span>
      );
    }
    if (delta < 0) {
      return (
        <span className="text-[11px] text-rust font-semibold">
          ↓ {formatNum(delta)} vs {formatNum(prevValue!)}
        </span>
      );
    }
    return (
      <span className="text-[11px] text-graphite font-semibold">
        → same as last
      </span>
    );
  };
  return (
    <div className={`p-4 rounded-2xl border-2 ${styleClass}`}>
      <div className="mb-1">
        <StampLabel tone={stampTone}>{label}</StampLabel>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="font-display text-[36px] leading-none">
          {value != null ? formatNum(value) : '—'}
        </span>
        <span className="font-mono text-sm text-graphite">kg</span>
      </div>
      <div className="mt-2 inline-flex items-center gap-1">{deltaEl()}</div>
    </div>
  );
}

function WorkingRow({
  tone,
  label,
  weight,
  completed,
  total,
}: {
  tone: 'gold' | 'rust';
  label: string;
  weight?: number;
  completed: number;
  total: number;
}) {
  const done = completed >= total && total > 0;
  return (
    <div className="flex items-center gap-3">
      <span
        className={`w-2.5 h-2.5 rounded-full ${tone === 'gold' ? 'bg-gold' : 'bg-rust'}`}
      />
      <span className="flex-1">
        {label} @ <span className="font-mono font-semibold">{formatKg(weight ?? 0)}</span>
      </span>
      <span className="font-mono text-sm font-semibold">
        {completed} / {total}
      </span>
      <span className={done ? 'text-moss' : 'text-graphite'}>{done ? '✓' : '·'}</span>
    </div>
  );
}

function formatNum(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, '');
}

function formatKg(w: number): string {
  return `${formatNum(w)} kg`;
}
