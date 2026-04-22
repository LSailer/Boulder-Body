import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { VolumeSession } from '../models/Session';
import { isVolumeSession, getAttemptCounts } from '../models/Session';
import type { BoulderAttempt, AttemptResult } from '../models/BoulderAttempt';
import {
  getAllSessions,
  updateSession,
  deleteSession,
  addBadges,
  getBadges,
} from '../logic/StorageManager';
import { BoulderLogModal } from '../components/BoulderLogModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { HoldTile, type HoldState } from '../components/ui/HoldTile';
import { StampLabel } from '../components/ui/StampLabel';
import {
  XP_PER_SEND,
  XP_PER_TOP,
  XP_PER_PROJECT,
} from '../models/Gamification';
import { evaluateBadges } from '../logic/BadgeEngine';

function attemptToState(
  attempt: BoulderAttempt,
  currentOrder: number | null
): HoldState {
  if (attempt.result === 'flash') return 'send';
  if (attempt.result === 'done') return 'top';
  if (attempt.result === 'fail') return 'project';
  if (currentOrder === attempt.order) return 'current';
  return 'empty';
}

function formatElapsed(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function ActiveSessionView() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<VolumeSession | null>(null);
  const [selectedAttempt, setSelectedAttempt] = useState<BoulderAttempt | null>(
    null
  );
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [showBreakConfirm, setShowBreakConfirm] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!sessionId) {
      navigate('/');
      return;
    }
    const allSessions = getAllSessions();
    const found = allSessions.find((s) => s.id === sessionId);
    if (!found || !isVolumeSession(found)) {
      navigate('/');
      return;
    }
    if (found.isFinished) {
      navigate(`/summary/${sessionId}`);
      return;
    }
    setSession(found);
  }, [sessionId, navigate]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const counts = useMemo(
    () => (session ? getAttemptCounts(session) : null),
    [session]
  );

  if (!session || !counts) return null;

  const firstUnlogged = session.attempts.find((a) => a.result === undefined);
  const currentOrder = firstUnlogged?.order ?? null;
  const elapsed = now - session.startTime.getTime();
  const logged = session.attempts.filter((a) => a.result !== undefined).length;
  const xpSoFar =
    counts.flash * XP_PER_SEND + counts.done * XP_PER_TOP + counts.fail * XP_PER_PROJECT;

  const handleLogAttempt = (result: AttemptResult, comment?: string) => {
    if (!selectedAttempt) return;
    const updatedAttempts = session.attempts.map((a) =>
      a.id === selectedAttempt.id
        ? { ...a, result, comment, timestamp: new Date() }
        : a
    );
    const updatedSession: VolumeSession = { ...session, attempts: updatedAttempts };
    updateSession(updatedSession);
    setSession(updatedSession);
    setSelectedAttempt(null);
  };

  const handleFinishSession = () => {
    if (counts.unlogged > 5) {
      setShowFinishConfirm(true);
    } else {
      finishSession();
    }
  };

  const finishSession = () => {
    const finishedSession: VolumeSession = {
      ...session,
      isFinished: true,
      endTime: new Date(),
    };
    updateSession(finishedSession);

    // Evaluate badges
    const all = getAllSessions().filter((s) => s.isFinished);
    const existing = getBadges();
    const newBadges = evaluateBadges(finishedSession, all, existing);
    addBadges(newBadges);

    navigate(`/summary/${session.id}`);
  };

  const handleBreakSession = () => {
    deleteSession(session.id);
    navigate('/');
  };

  const total = session.boulderCount;
  const loggedProgress = total > 0 ? logged / total : 0;
  const leftCount = total - logged;

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
            <div className="font-display text-xl leading-tight">
              Level {session.targetLevel} · V{session.targetLevel}
            </div>
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
            <StampLabel tone="paperMuted">This session</StampLabel>
            <div className="text-sm text-gold font-semibold">+{xpSoFar} XP</div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            <StatCell value={counts.flash} label="Sends" tone="gold" />
            <StatCell value={counts.done} label="Tops" tone="moss" />
            <StatCell value={counts.fail} label="Projects" tone="graphite" />
            <StatCell value={leftCount} label="Left" tone="muted" />
          </div>
          <div className="mt-4 h-1.5 rounded-full bg-paper/10 overflow-hidden">
            <div
              className="h-full xp-fill rounded-full transition-[width] duration-500"
              style={{ width: `${Math.round(loggedProgress * 100)}%` }}
            />
          </div>
        </div>

        {/* Grid */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <StampLabel>Boulders</StampLabel>
            <span className="text-[11px] text-graphite">Tap to log</span>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {session.attempts.map((attempt) => (
              <HoldTile
                key={attempt.id}
                order={attempt.order}
                state={attemptToState(attempt, currentOrder)}
                onClick={() => setSelectedAttempt(attempt)}
              />
            ))}
          </div>
          <div className="mt-4 flex items-center justify-center gap-4 text-[11px] text-graphite">
            <LegendDot colorClass="bg-gold" label="Send" />
            <LegendDot colorClass="bg-moss" label="Top" />
            <LegendDot colorClass="bg-graphite" label="Project" />
          </div>
        </div>

        {/* Finish CTA */}
        <button
          type="button"
          onClick={handleFinishSession}
          disabled={logged === 0}
          className="w-full py-4 rounded-xl bg-moss hover:bg-moss/90 disabled:bg-graphite/40 disabled:cursor-not-allowed text-paper font-semibold tracking-wide shadow-pebble transition-colors"
        >
          Finish session & collect XP →
        </button>
      </div>

      {selectedAttempt && (
        <BoulderLogModal
          isOpen={true}
          attempt={selectedAttempt}
          onSubmit={handleLogAttempt}
          onCancel={() => setSelectedAttempt(null)}
        />
      )}

      <ConfirmDialog
        isOpen={showFinishConfirm}
        title="Unlogged boulders"
        message={`You have ${counts.unlogged} unlogged boulders. They'll count as projects. Finish session anyway?`}
        confirmText="Finish anyway"
        cancelText="Keep logging"
        onConfirm={() => {
          setShowFinishConfirm(false);
          finishSession();
        }}
        onCancel={() => setShowFinishConfirm(false)}
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
    </div>
  );
}

function StatCell({
  value,
  label,
  tone,
}: {
  value: number;
  label: string;
  tone: 'gold' | 'moss' | 'graphite' | 'muted';
}) {
  const toneClass = {
    gold: 'text-gold',
    moss: 'text-moss',
    graphite: 'text-graphite',
    muted: 'text-paper/40',
  }[tone];
  return (
    <div className="text-center">
      <div className={`font-display text-2xl ${toneClass}`}>{value}</div>
      <div className="text-[10px] text-paper/70 uppercase tracking-wider">{label}</div>
    </div>
  );
}

function LegendDot({ colorClass, label }: { colorClass: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`w-3 h-3 rounded-full inline-block ${colorClass}`} />
      {label}
    </span>
  );
}
