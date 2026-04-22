/**
 * TrainingSessionView.tsx
 *
 * 9c-style training session tracker (redesigned).
 *
 * Hang and pull-up flow:
 *   1. Max-test phase: start at recommender weight; after each set, "Held?" →
 *      +5kg in ramp phase, +2.5kg once past last session's working weight.
 *      "Missed" → record discoveredMax, generate 3 working sets at max−5kg.
 *   2. Working phase: 3 sets at the discovered working weight.
 *
 * Hangs: 5s prep, hold 5s (max-test) or 7s (working). Pull-ups: no prep.
 * Bench + trap-bar are hidden from this screen; their arrays may still exist
 * on legacy sessions but are not rendered or interacted with here.
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { TrainingSession } from '../models/Session';
import { isTrainingSession } from '../models/Session';
import type { TrainingSet } from '../models/SessionType';
import { TRAINING_PROTOCOL } from '../models/SessionType';
import {
  getAllSessions,
  updateSession,
  deleteSession,
  getLastTrainingSession,
  addBadges,
  getBadges,
} from '../logic/StorageManager';
import { getTrainingRecommendation } from '../logic/TrainingRecommender';
import { generateWorkingSets, workingWeightFromFailed } from '../logic/weights';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { MaxTestPrompt } from '../components/MaxTestPrompt';
import { RingTimer } from '../components/ui/RingTimer';
import { StampLabel } from '../components/ui/StampLabel';
import { RampBar } from '../components/ui/RampBar';
import { evaluateBadges } from '../logic/BadgeEngine';
import { XP_PER_HELD_SET, XP_PER_MAX_PR } from '../models/Gamification';

const PLATE_INCREMENT = 2.5;
const RAMP_UP_INCREMENT = 5;

type MaxTestExercise = 'hang' | 'pullup';

function getSetsKey(
  exercise: MaxTestExercise
): 'hangSets' | 'pullupSets' {
  return exercise === 'hang' ? 'hangSets' : 'pullupSets';
}

function formatElapsed(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function formatWeight(w: number): string {
  return Number.isInteger(w) ? String(w) : w.toFixed(1).replace(/\.0$/, '');
}

export function TrainingSessionView() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<TrainingSession | null>(null);

  const [showPrepTimer, setShowPrepTimer] = useState(false);
  const [showHangTimer, setShowHangTimer] = useState(false);
  const [showRestTimer, setShowRestTimer] = useState(false);
  const [restTimerPaused, setRestTimerPaused] = useState(false);
  const [pendingHangSetId, setPendingHangSetId] = useState<string | null>(null);
  const [lastExercise, setLastExercise] = useState<MaxTestExercise | null>(null);

  const [maxTestPrompt, setMaxTestPrompt] = useState<{
    exercise: MaxTestExercise;
    weight: number;
  } | null>(null);

  const [showBreakConfirm, setShowBreakConfirm] = useState(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!sessionId) {
      navigate('/');
      return;
    }
    const allSessions = getAllSessions();
    const found = allSessions.find((s) => s.id === sessionId);
    if (!found || !isTrainingSession(found)) {
      navigate('/');
      return;
    }
    if (found.isFinished) {
      navigate(`/summary/${sessionId}`);
      return;
    }

    const needsSeed =
      found.trainingData.hangSets.length === 0 ||
      found.trainingData.pullupSets.length === 0;

    if (needsSeed) {
      const rec = getTrainingRecommendation(getLastTrainingSession());
      const seeded: TrainingSession = {
        ...found,
        trainingData: {
          ...found.trainingData,
          hangSets:
            found.trainingData.hangSets.length === 0
              ? [
                  {
                    id: crypto.randomUUID(),
                    order: 1,
                    exercise: 'hang',
                    completed: false,
                    setType: 'maxtest',
                    weight: rec.hangStart,
                  },
                ]
              : found.trainingData.hangSets,
          pullupSets:
            found.trainingData.pullupSets.length === 0
              ? [
                  {
                    id: crypto.randomUUID(),
                    order: 1,
                    exercise: 'pullup',
                    completed: false,
                    setType: 'maxtest',
                    weight: rec.pullupStart,
                  },
                ]
              : found.trainingData.pullupSets,
          rampUpCap: {
            hang: rec.lastWorking?.hang,
            pullup: rec.lastWorking?.pullup,
          },
        },
      };
      updateSession(seeded);
      setSession(seeded);
      return;
    }

    setSession(found);
  }, [sessionId, navigate]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const hangSets = useMemo(
    () => session?.trainingData.hangSets ?? [],
    [session]
  );
  const pullSets = useMemo(
    () => session?.trainingData.pullupSets ?? [],
    [session]
  );
  const discoveredHang = session?.trainingData.discoveredMax?.hang;
  const discoveredPull = session?.trainingData.discoveredMax?.pullup;

  const hangDone = hangSets.length > 0 && hangSets.every((s) => s.completed) && discoveredHang != null;
  const pullDone = pullSets.length > 0 && pullSets.every((s) => s.completed) && discoveredPull != null;

  // "Active" means first exercise that still has incomplete sets.
  const activeExercise: MaxTestExercise | null = !hangDone
    ? 'hang'
    : !pullDone
    ? 'pullup'
    : null;

  const completedHang = hangSets.filter((s) => s.completed).length;
  const completedPull = pullSets.filter((s) => s.completed).length;
  const xpSoFar = (completedHang + completedPull) * XP_PER_HELD_SET +
    (discoveredHang != null ? XP_PER_MAX_PR : 0) +
    (discoveredPull != null ? XP_PER_MAX_PR : 0);

  const pendingHangSet = useMemo(
    () => (pendingHangSetId ? hangSets.find((s) => s.id === pendingHangSetId) : null),
    [pendingHangSetId, hangSets]
  );
  const hangDuration =
    pendingHangSet?.setType === 'working'
      ? TRAINING_PROTOCOL.hangDuration
      : TRAINING_PROTOCOL.maxTestHangDuration;

  if (!session) return null;

  // ─── Handlers ──────────────────────────────────────────────────────────

  function getSets(exercise: MaxTestExercise): TrainingSet[] {
    return session!.trainingData[getSetsKey(exercise)];
  }

  function commitSets(exercise: MaxTestExercise, sets: TrainingSet[]) {
    if (!session) return;
    const key = getSetsKey(exercise);
    const updated: TrainingSession = {
      ...session,
      trainingData: { ...session.trainingData, [key]: sets },
    };
    updateSession(updated);
    setSession(updated);
  }

  const startHangSet = (set: TrainingSet) => {
    setPendingHangSetId(set.id);
    setShowPrepTimer(true);
  };

  const completePullupSet = (set: TrainingSet) => {
    const updated = getSets('pullup').map((s) =>
      s.id === set.id
        ? { ...s, completed: true, timestamp: new Date() }
        : s
    );
    commitSets('pullup', updated);
    setLastExercise('pullup');
    setShowRestTimer(true);
    if (set.setType === 'maxtest') {
      setMaxTestPrompt({ exercise: 'pullup', weight: set.weight ?? 0 });
    }
  };

  const handlePrepComplete = () => {
    setShowPrepTimer(false);
    setShowHangTimer(true);
  };

  const handleHangComplete = () => {
    if (!pendingHangSetId || !session) return;
    const hangs = session.trainingData.hangSets;
    const completedSet = hangs.find((s) => s.id === pendingHangSetId);
    if (!completedSet) return;

    const updated = hangs.map((s) =>
      s.id === pendingHangSetId ? { ...s, completed: true, timestamp: new Date() } : s
    );
    commitSets('hang', updated);

    setPendingHangSetId(null);
    setShowHangTimer(false);
    setLastExercise('hang');
    setShowRestTimer(true);

    if (completedSet.setType === 'maxtest') {
      setMaxTestPrompt({ exercise: 'hang', weight: completedSet.weight ?? 0 });
    }
  };

  const handleRestComplete = () => {
    setShowRestTimer(false);
    setRestTimerPaused(false);
    if (maxTestPrompt) return;
    if (lastExercise === 'hang') {
      const next = session?.trainingData.hangSets.find((s) => !s.completed);
      if (next) {
        setPendingHangSetId(next.id);
        setShowPrepTimer(true);
      }
    }
  };

  const handleMaxTestHeld = () => {
    if (!maxTestPrompt || !session) return;
    const { exercise, weight } = maxTestPrompt;
    const cap = session.trainingData.rampUpCap?.[exercise];
    const increment = cap != null && weight < cap ? RAMP_UP_INCREMENT : PLATE_INCREMENT;
    const nextWeight = weight + increment;
    const sets = getSets(exercise);
    const newSet: TrainingSet = {
      id: crypto.randomUUID(),
      order: sets.length + 1,
      exercise,
      completed: false,
      setType: 'maxtest',
      weight: nextWeight,
    };
    commitSets(exercise, [...sets, newSet]);
    setMaxTestPrompt(null);

    if (exercise === 'hang') {
      setPendingHangSetId(newSet.id);
      setShowPrepTimer(true);
    }
  };

  const handleMaxTestMissed = () => {
    if (!maxTestPrompt || !session) return;
    const { exercise, weight } = maxTestPrompt;
    const max = Math.max(0, weight - PLATE_INCREMENT);
    const workingWeight = workingWeightFromFailed(weight);

    const sets = getSets(exercise);
    const workingSets = generateWorkingSets(workingWeight, exercise, sets.length + 1);
    const updatedSets = [...sets, ...workingSets];
    const key = getSetsKey(exercise);

    const updated: TrainingSession = {
      ...session,
      trainingData: {
        ...session.trainingData,
        [key]: updatedSets,
        discoveredMax: {
          ...session.trainingData.discoveredMax,
          [exercise]: max,
        },
      },
    };
    updateSession(updated);
    setSession(updated);
    setMaxTestPrompt(null);
  };

  const handleFinishSession = () => {
    if (!hangDone || !pullDone) {
      setShowFinishConfirm(true);
    } else {
      completeSession();
    }
  };

  const completeSession = () => {
    if (!session) return;
    const finishedSession: TrainingSession = {
      ...session,
      isFinished: true,
      endTime: new Date(),
    };
    updateSession(finishedSession);

    const all = getAllSessions().filter((s) => s.isFinished);
    const existing = getBadges();
    const newBadges = evaluateBadges(finishedSession, all, existing);
    addBadges(newBadges);

    navigate(`/summary/${session.id}`);
  };

  const handleBreakSession = () => {
    if (!session) return;
    deleteSession(session.id);
    navigate('/');
  };

  const elapsed = now - session.startTime.getTime();

  const rampCap =
    maxTestPrompt && session
      ? session.trainingData.rampUpCap?.[maxTestPrompt.exercise]
      : undefined;
  const isInRampPhase =
    !!maxTestPrompt && rampCap != null && maxTestPrompt.weight < rampCap;

  const nextRampWeight = maxTestPrompt
    ? maxTestPrompt.weight +
      (rampCap != null && maxTestPrompt.weight < rampCap
        ? RAMP_UP_INCREMENT
        : PLATE_INCREMENT)
    : undefined;
  const lockedMaxOnMiss = maxTestPrompt
    ? Math.max(0, maxTestPrompt.weight - PLATE_INCREMENT)
    : undefined;

  return (
    <div className="min-h-screen">
      <div className="max-w-[420px] mx-auto px-5 pt-5 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-10 h-10 rounded-full border border-line bg-paper/60 flex items-center justify-center text-ink hover:bg-chalk dark:bg-basalt/60 dark:text-paper"
            aria-label="Back"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <div className="text-center">
            <div className="stamp flex items-center justify-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-rust dot-live" />
              Live · <span className="font-mono">{formatElapsed(elapsed)}</span>
            </div>
            <div className="font-display text-xl leading-tight">Training</div>
          </div>
          <button
            type="button"
            onClick={() => setShowBreakConfirm(true)}
            className="px-3 h-10 rounded-full border border-line text-xs font-semibold text-graphite hover:bg-chalk dark:hover:bg-basalt/60"
          >
            End
          </button>
        </div>

        {/* Stats card */}
        <div className="mb-5 p-4 rounded-2xl bg-basalt text-paper">
          <div className="flex items-center justify-between mb-3">
            <StampLabel tone="paperMuted">Session total</StampLabel>
            <div className="text-sm text-gold font-semibold">+{xpSoFar} XP</div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <ExerciseStat
              tone="gold"
              iconKind="hang"
              value={`${completedHang}/${hangSets.length}`}
              label="Hang sets"
            />
            <ExerciseStat
              tone="rust"
              iconKind="pullup"
              value={`${completedPull}/${pullSets.length}`}
              label="Pull-up sets"
            />
          </div>
        </div>

        {/* Hang exercise card */}
        <ExerciseCard
          tone="gold"
          name="Weighted hang"
          active={activeExercise === 'hang'}
          sets={hangSets}
          discoveredMax={discoveredHang}
          onStartSet={startHangSet}
          rampUpCap={session.trainingData.rampUpCap?.hang}
        />

        {/* Pull-up exercise card */}
        <ExerciseCard
          tone="rust"
          name="Weighted pull-up"
          active={activeExercise === 'pullup'}
          sets={pullSets}
          discoveredMax={discoveredPull}
          onStartSet={completePullupSet}
          rampUpCap={session.trainingData.rampUpCap?.pullup}
        />

        <div className="mt-2 mb-6">
          <button
            type="button"
            onClick={handleFinishSession}
            className="w-full py-4 rounded-xl bg-moss hover:bg-moss/90 text-paper font-semibold tracking-wide shadow-pebble transition-colors"
          >
            Finish training & collect XP →
          </button>
        </div>
      </div>

      {/* 5s prep timer */}
      <RingTimer
        isOpen={showPrepTimer}
        duration={TRAINING_PROTOCOL.prepBeforeHang}
        state="prep"
        onComplete={handlePrepComplete}
        onSkip={handlePrepComplete}
        title="Prep"
        subtitle={
          pendingHangSet
            ? `${formatWeight(pendingHangSet.weight ?? 0)} kg · chalk up`
            : 'Chalk up…'
        }
      />

      {/* Hang timer */}
      <RingTimer
        isOpen={showHangTimer}
        duration={hangDuration}
        state="hold"
        onComplete={handleHangComplete}
        onSkip={handleHangComplete}
        title="Holding"
        subtitle={
          pendingHangSet
            ? `${formatWeight(pendingHangSet.weight ?? 0)} kg · ${hangDuration}s hang`
            : 'Hang!'
        }
      />

      {/* 3 min rest */}
      <RingTimer
        isOpen={showRestTimer}
        duration={TRAINING_PROTOCOL.restBetweenSets}
        state="rest"
        onComplete={handleRestComplete}
        onSkip={() => {
          setShowRestTimer(false);
          setRestTimerPaused(false);
          handleRestComplete();
        }}
        onPause={() => setRestTimerPaused((p) => !p)}
        isPaused={restTimerPaused}
        title="Rest"
        subtitle="Breathe. Next set soon."
      />

      {/* Max-test prompt */}
      <MaxTestPrompt
        isOpen={!!maxTestPrompt && !showRestTimer}
        weightKg={maxTestPrompt?.weight ?? 0}
        exerciseLabel={maxTestPrompt?.exercise === 'hang' ? 'hang' : 'pull-up'}
        holdDurationSec={
          maxTestPrompt?.exercise === 'hang'
            ? TRAINING_PROTOCOL.maxTestHangDuration
            : 1
        }
        nextWeightOnHeld={nextRampWeight}
        lockedMaxOnMiss={lockedMaxOnMiss}
        allowMiss={!isInRampPhase}
        onHeld={handleMaxTestHeld}
        onMissed={handleMaxTestMissed}
      />

      <ConfirmDialog
        isOpen={showBreakConfirm}
        title="End this session?"
        message="The session will be deleted and won't appear in your history."
        confirmText="End session"
        cancelText="Keep going"
        variant="danger"
        onConfirm={handleBreakSession}
        onCancel={() => setShowBreakConfirm(false)}
      />

      <ConfirmDialog
        isOpen={showFinishConfirm}
        title="Finish without a max?"
        message="You haven't completed both exercises. Finishing now means no working sets will be counted for the unfinished exercise."
        confirmText="Finish anyway"
        cancelText="Keep training"
        onConfirm={() => {
          setShowFinishConfirm(false);
          completeSession();
        }}
        onCancel={() => setShowFinishConfirm(false)}
      />
    </div>
  );
}

/*
 * ────────────────────────────────────────────────────────────────────────────
 * Subcomponents
 * ────────────────────────────────────────────────────────────────────────────
 */

function ExerciseStat({
  tone,
  iconKind,
  value,
  label,
}: {
  tone: 'gold' | 'rust';
  iconKind: 'hang' | 'pullup';
  value: string;
  label: string;
}) {
  const chip =
    tone === 'gold'
      ? 'bg-gold/15 border-gold/40 text-gold'
      : 'bg-rust/15 border-rust/40 text-rust';
  const numClass = tone === 'gold' ? 'text-gold' : 'text-rust';
  return (
    <div className="flex items-center gap-3">
      <span className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${chip}`}>
        <ExerciseIcon kind={iconKind} />
      </span>
      <div>
        <div className={`font-display text-2xl leading-none ${numClass} font-mono`}>{value}</div>
        <div className="text-[10px] text-paper/70 uppercase tracking-wider mt-0.5">{label}</div>
      </div>
    </div>
  );
}

function ExerciseIcon({ kind }: { kind: 'hang' | 'pullup' }) {
  if (kind === 'hang') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="4.5" rx="1" />
        <path d="M8 8.5 v1.5 M12 8.5 v1.5 M16 8.5 v1.5" />
        <path d="M10 10 v3.5 M14 10 v3.5" />
        <rect x="7.5" y="13.5" width="9" height="5" rx="1" />
        <line x1="10" y1="16" x2="14" y2="16" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="4" x2="21" y2="4" />
      <path d="M5 4 V2 M19 4 V2" />
      <path d="M10 4 C10 6 11 7 12 7 C13 7 14 6 14 4" />
      <circle cx="12" cy="9.3" r="1.8" />
      <line x1="12" y1="11" x2="12" y2="14.5" />
      <rect x="8.5" y="14.5" width="7" height="4" rx="1" />
      <line x1="10" y1="16.5" x2="14" y2="16.5" />
    </svg>
  );
}

function ExerciseCard({
  tone,
  name,
  active,
  sets,
  discoveredMax,
  onStartSet,
  rampUpCap,
}: {
  tone: 'gold' | 'rust';
  name: string;
  active: boolean;
  sets: TrainingSet[];
  discoveredMax?: number;
  onStartSet: (set: TrainingSet) => void;
  rampUpCap?: number;
}) {
  const maxTestSets = sets.filter((s) => s.setType === 'maxtest');
  const workingSets = sets.filter((s) => s.setType === 'working');
  const inWorkingPhase = discoveredMax != null;
  const nextSet = sets.find((s) => !s.completed);

  const borderClass = active
    ? tone === 'gold'
      ? 'border-2 border-gold'
      : 'border-2 border-rust'
    : 'border border-line';

  const stampTone: 'gold' | 'rust' = tone;
  const iconChip =
    tone === 'gold' ? 'bg-gold/15 border-gold/40 text-gold' : 'bg-rust/12 border-rust/40 text-rust';

  const ctaClass = !nextSet
    ? 'bg-chalk/50 text-graphite border border-line cursor-default'
    : active
    ? tone === 'gold'
      ? 'bg-gold text-ink'
      : 'bg-rust text-paper'
    : tone === 'gold'
    ? 'border-2 border-gold/70 text-gold dark:text-gold hover:bg-gold/5'
    : 'border-2 border-rust/70 text-rust hover:bg-rust/5';

  const phaseLabel = inWorkingPhase ? 'working sets' : 'max-test';

  return (
    <div className={`mb-3 paper-tex rounded-2xl ${borderClass} p-5 relative`}>
      {active && (
        <div className={`absolute top-5 right-5 text-[10px] font-semibold uppercase tracking-widest flex items-center gap-1.5 ${tone === 'gold' ? 'text-gold' : 'text-rust'}`}>
          <span className={`w-1.5 h-1.5 rounded-full dot-live ${tone === 'gold' ? 'bg-gold' : 'bg-rust'}`} />
          Active
        </div>
      )}

      <div className="flex items-center gap-3 mb-3">
        <div className={`w-11 h-11 rounded-xl border flex items-center justify-center ${iconChip}`}>
          <ExerciseIcon kind={tone === 'gold' ? 'hang' : 'pullup'} />
        </div>
        <div className="flex-1">
          <StampLabel tone={stampTone}>
            {tone === 'gold' ? 'Exercise 1' : 'Exercise 2'} · {phaseLabel}
          </StampLabel>
          <div className="font-display text-xl leading-tight">{name}</div>
        </div>
        {discoveredMax != null && (
          <div className="text-right">
            <StampLabel>Max</StampLabel>
            <div className={`font-mono font-bold ${tone === 'gold' ? 'text-gold' : 'text-rust'}`}>
              {formatWeight(discoveredMax)} kg
            </div>
          </div>
        )}
      </div>

      {/* Body */}
      {inWorkingPhase ? (
        <div className="grid grid-cols-3 gap-2 mb-3">
          {workingSets.map((s) => {
            const isNext = !s.completed && nextSet?.id === s.id;
            const base =
              tone === 'gold'
                ? 'bg-gold/15 border-gold/40'
                : 'bg-rust/15 border-rust/40';
            const dashed =
              tone === 'gold'
                ? 'bg-paper border-2 border-dashed border-gold/60'
                : 'bg-paper border-2 border-dashed border-rust/60';
            return (
              <div
                key={s.id}
                className={`p-3 rounded-xl text-center ${isNext ? dashed : base} ${s.completed ? '' : 'dark:bg-basalt/40'}`}
              >
                <div className="font-mono text-xs text-graphite">Set {s.order - maxTestSets.length}</div>
                <div className="font-mono font-bold text-ink dark:text-paper">
                  {formatWeight(s.weight ?? 0)}
                </div>
                <div
                  className={`text-[10px] font-semibold mt-0.5 ${
                    s.completed
                      ? 'text-moss'
                      : isNext
                      ? tone === 'gold'
                        ? 'text-gold'
                        : 'text-rust'
                      : 'text-graphite'
                  }`}
                >
                  {s.completed ? '✓ done' : isNext ? 'next' : 'pending'}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mb-3">
          <RampVisualization
            sets={maxTestSets}
            rampUpCap={rampUpCap}
            tone={tone}
          />
        </div>
      )}

      {/* CTA */}
      {nextSet ? (
        <button
          type="button"
          onClick={() => onStartSet(nextSet)}
          className={`w-full py-3.5 rounded-xl font-semibold shadow-pebble flex items-center justify-center gap-2 transition-colors ${ctaClass}`}
        >
          Start set · {formatWeight(nextSet.weight ?? 0)} kg {tone === 'gold' ? 'hang' : 'pull-up'}
        </button>
      ) : (
        <div className="w-full py-3.5 rounded-xl text-center text-sm font-semibold text-moss bg-moss/10 border border-moss/40">
          ✓ {tone === 'gold' ? 'Hang' : 'Pull-up'} complete
        </div>
      )}
    </div>
  );
}

function RampVisualization({
  sets,
  rampUpCap,
  tone,
}: {
  sets: TrainingSet[];
  rampUpCap?: number;
  tone: 'gold' | 'rust';
}) {
  const completed = sets.filter((s) => s.completed).map((s) => s.weight ?? 0);
  const pending = sets.find((s) => !s.completed);
  const currentWeight = pending?.weight;

  const upcoming: number[] = [];
  if (currentWeight != null) {
    const inRamp = rampUpCap != null && currentWeight < rampUpCap;
    const inc1 = inRamp ? RAMP_UP_INCREMENT : PLATE_INCREMENT;
    const step1 = currentWeight + inc1;
    const inRampAfter1 = rampUpCap != null && step1 < rampUpCap;
    const inc2 = inRampAfter1 ? RAMP_UP_INCREMENT : PLATE_INCREMENT;
    upcoming.push(step1, step1 + inc2);
  }

  return (
    <RampBar
      completed={completed}
      current={currentWeight ?? null}
      upcoming={upcoming}
      tone={tone}
    />
  );
}
