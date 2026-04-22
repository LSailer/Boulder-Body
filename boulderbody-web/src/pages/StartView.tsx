import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Session, VolumeSession, TrainingSession } from '../models/Session';
import { isVolumeSession } from '../models/Session';
import type { SessionType } from '../models/SessionType';
import type { TrainingRecommendation } from '../logic/TrainingRecommender';
import {
  getAllSessions,
  getCurrentSession,
  getLastVolumeSession,
  getLastTrainingSession,
  saveSession,
  deleteSession,
  getBadges,
} from '../logic/StorageManager';
import { getRecommendation } from '../logic/SessionRecommender';
import { getTrainingRecommendation } from '../logic/TrainingRecommender';
import { computeTotalXP, computeLevel, computeStreak } from '../logic/XPCalculator';
import { ThemeToggle } from '../components/ThemeToggle';
import { SessionHistoryItem } from '../components/SessionHistoryItem';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { XPCard } from '../components/ui/XPCard';
import { SessionTypeToggle } from '../components/ui/SessionTypeToggle';
import { StampLabel } from '../components/ui/StampLabel';
import { PaperCard } from '../components/ui/PaperCard';
import { Counter } from '../components/ui/Counter';
import { BadgeStrip } from '../components/ui/BadgeStrip';

export function StartView() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionType, setSessionType] = useState<SessionType>('volume');

  const [level, setLevel] = useState(5);
  const [boulderCount, setBoulderCount] = useState(20);

  const [trainingRec, setTrainingRec] = useState<TrainingRecommendation | null>(null);

  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: string;
    date: string;
  } | null>(null);

  // Badges are loaded once on mount and when the sessions list changes
  // (a delete might remove their referenced session — refreshing here is
  // cheap and keeps the strip in sync).
  const [badges, setBadges] = useState(() => getBadges());
  useEffect(() => {
    setBadges(getBadges());
  }, [sessions]);

  useEffect(() => {
    const allSessions = getAllSessions();
    setSessions(allSessions.filter((s) => s.isFinished));

    const activeSession = getCurrentSession();
    if (activeSession) {
      if (isVolumeSession(activeSession)) {
        navigate(`/session/${activeSession.id}`);
      } else {
        navigate(`/training/${activeSession.id}`);
      }
      return;
    }

    const lastVolumeSession = getLastVolumeSession();
    const volumeRec = getRecommendation(lastVolumeSession);
    setLevel(volumeRec.level);
    setBoulderCount(volumeRec.boulderCount);

    const lastTrainingSession = getLastTrainingSession();
    setTrainingRec(getTrainingRecommendation(lastTrainingSession));
  }, [navigate]);

  const totalXP = useMemo(() => computeTotalXP(sessions), [sessions]);
  const levelInfo = useMemo(() => computeLevel(totalXP), [totalXP]);
  const streak = useMemo(() => computeStreak(sessions), [sessions]);

  const handleStartSession = () => {
    let newSession: Session;

    if (sessionType === 'volume') {
      const volumeSession: VolumeSession = {
        id: crypto.randomUUID(),
        sessionType: 'volume',
        date: new Date(),
        startTime: new Date(),
        isFinished: false,
        targetLevel: level,
        boulderCount,
        attempts: Array.from({ length: boulderCount }, (_, i) => ({
          id: crypto.randomUUID(),
          order: i + 1,
        })),
      };
      newSession = volumeSession;
      saveSession(newSession);
      navigate(`/session/${newSession.id}`);
    } else {
      // New training sessions: hang/pullup empty (TrainingSessionView seeds the
      // first max-test from the recommender). Bench/trap-bar dropped from the UI —
      // we create empty arrays so the Training dashboard has nothing to render
      // for those exercises. Legacy sessions keep their existing sets for Summary.
      const trainingSession: TrainingSession = {
        id: crypto.randomUUID(),
        sessionType: 'training',
        date: new Date(),
        startTime: new Date(),
        isFinished: false,
        trainingData: {
          hangSets: [],
          pullupSets: [],
          benchSets: [],
          trapBarSets: [],
          rampUpCap: {
            hang: trainingRec?.lastWorking?.hang,
            pullup: trainingRec?.lastWorking?.pullup,
          },
        },
      };
      newSession = trainingSession;
      saveSession(newSession);
      navigate(`/training/${newSession.id}`);
    }
  };

  const handleDeleteSession = (id: string) => {
    const session = sessions.find((s) => s.id === id);
    if (!session) return;
    setDeleteConfirm({
      id,
      date: session.date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
    });
  };

  const confirmDelete = () => {
    if (!deleteConfirm) return;
    deleteSession(deleteConfirm.id);
    setSessions(sessions.filter((s) => s.id !== deleteConfirm.id));
    setDeleteConfirm(null);

    const lastVolumeSession = getLastVolumeSession();
    const volumeRec = getRecommendation(lastVolumeSession);
    setLevel(volumeRec.level);
    setBoulderCount(volumeRec.boulderCount);

    const lastTrainingSession = getLastTrainingSession();
    setTrainingRec(getTrainingRecommendation(lastTrainingSession));
  };

  const today = new Date();
  const dateStamp = today
    .toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
    .replace(',', ' ·');

  const lastHangMax = trainingRec?.lastMax?.hang;
  const lastPullupMax = trainingRec?.lastMax?.pullup;

  return (
    <div className="min-h-screen">
      <div className="max-w-[420px] mx-auto px-5 pt-5 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <StampLabel>{dateStamp}</StampLabel>
            <h1 className="font-display text-[34px] leading-none tracking-tight text-ink dark:text-paper">
              BoulderBody
            </h1>
          </div>
          <ThemeToggle />
        </div>

        {/* XP / Level card */}
        <div className="mb-5">
          <XPCard levelInfo={levelInfo} streak={streak} />
        </div>

        {/* Session type toggle */}
        <div className="mb-4">
          <StampLabel className="mb-2 block">Today's session</StampLabel>
          <SessionTypeToggle value={sessionType} onChange={setSessionType} />
        </div>

        {/* Climbing form */}
        {sessionType === 'volume' && (
          <PaperCard className="p-5 mb-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="font-display text-[22px] leading-tight">
                  Send level {level}.
                </div>
                <div className="font-display text-[22px] leading-tight italic text-rust">
                  Stick {boulderCount} problems.
                </div>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-chalk border border-line flex items-center justify-center font-display text-2xl text-rust engraved dark:bg-basalt">
                V{level}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <Counter
                label="Level"
                value={level}
                onChange={setLevel}
                min={1}
                max={17}
              />
              <Counter
                label="Boulders"
                value={boulderCount}
                onChange={setBoulderCount}
                min={1}
                max={99}
              />
            </div>

            <button
              type="button"
              onClick={handleStartSession}
              className="w-full py-4 rounded-xl bg-rust hover:bg-rustdark text-paper font-semibold text-base tracking-wide shadow-pebble transition-colors"
            >
              Begin climbing →
            </button>
          </PaperCard>
        )}

        {/* Training form */}
        {sessionType === 'training' && trainingRec && (
          <PaperCard className="p-5 mb-5">
            <div className="mb-4">
              <div className="font-display text-[22px] leading-tight">Strength day.</div>
              <div className="font-display text-[22px] leading-tight italic text-rust">
                Ramp to your max.
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <ExercisePreviewRow
                tone="gold"
                name="Weighted hang"
                startKg={trainingRec.hangStart}
              />
              <ExercisePreviewRow
                tone="rust"
                name="Weighted pull-up"
                startKg={trainingRec.pullupStart}
              />
            </div>

            <div className="p-3 rounded-xl bg-gold/12 border border-gold/40 text-[12px] text-ink dark:text-paper mb-4 flex gap-2 items-start">
              <span className="mt-0.5">🌱</span>
              <div>
                Hang & pull-up will <span className="font-semibold">ramp in +5 kg</span>{' '}
                until last working weight, then{' '}
                <span className="font-semibold">+2.5 kg</span> to find today's max.
              </div>
            </div>

            {(lastHangMax != null || lastPullupMax != null) && (
              <div className="mb-4 text-xs text-graphite">
                <span className="font-semibold text-ink dark:text-paper">Last max:</span>{' '}
                hang {lastHangMax ?? 0} kg · pull-up {lastPullupMax ?? 0} kg
              </div>
            )}

            <button
              type="button"
              onClick={handleStartSession}
              className="w-full py-4 rounded-xl bg-rust hover:bg-rustdark text-paper font-semibold text-base tracking-wide shadow-pebble transition-colors"
            >
              Begin training →
            </button>
          </PaperCard>
        )}

        {/* Recent badges */}
        {badges.length > 0 && (
          <div className="mb-5">
            <BadgeStrip badges={badges} />
          </div>
        )}

        <hr className="zine-rule my-5" />

        {/* History */}
        {sessions.length > 0 ? (
          <div>
            <StampLabel className="mb-3 block">Recent sessions</StampLabel>
            <div className="space-y-2">
              {sessions
                .sort((a, b) => b.date.getTime() - a.date.getTime())
                .map((session) => (
                  <SessionHistoryItem
                    key={session.id}
                    session={session}
                    onClick={() => navigate(`/summary/${session.id}`)}
                    onDelete={handleDeleteSession}
                  />
                ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-graphite text-sm">
            No sessions yet. Start your first one above.
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        title="Delete session"
        message={`Delete session from ${deleteConfirm?.date}? This cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}

function ExercisePreviewRow({
  tone,
  name,
  startKg,
}: {
  tone: 'gold' | 'rust';
  name: string;
  startKg: number;
}) {
  const chip =
    tone === 'gold'
      ? 'bg-gold/15 border-gold/40 text-gold'
      : 'bg-rust/12 border-rust/40 text-rust';
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-chalk/50 border border-line dark:bg-basalt/40">
      <div className="flex items-center gap-2.5">
        <span
          className={`w-8 h-8 rounded-lg border flex items-center justify-center ${chip}`}
        >
          <ExerciseIcon name={name} />
        </span>
        <span className="font-semibold text-sm">{name}</span>
      </div>
      <div className="text-xs text-graphite">
        start <span className="font-mono font-semibold text-ink dark:text-paper">{startKg} kg</span>
      </div>
    </div>
  );
}

function ExerciseIcon({ name }: { name: string }) {
  if (name.toLowerCase().includes('hang')) {
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
