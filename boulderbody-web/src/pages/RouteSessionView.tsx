import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { RouteSession } from '../models/Session';
import { isRouteSession, getRouteCounts } from '../models/Session';
import type { RouteEntry, RouteResult } from '../models/RouteEntry';
import {
  getAllSessions,
  updateSession,
  deleteSession,
  addBadges,
  getBadges,
} from '../logic/StorageManager';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { StampLabel } from '../components/ui/StampLabel';
import {
  XP_PER_SEND,
  XP_PER_TOP,
  XP_PER_PROJECT,
} from '../models/Gamification';
import { evaluateBadges } from '../logic/BadgeEngine';

function formatElapsed(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

const OUTCOMES: {
  result: RouteResult;
  label: string;
  sub: string;
  icon: string;
  btn: string;
}[] = [
  { result: 'flash', label: 'Flash', sub: '1st try', icon: '⚡', btn: 'bg-gold text-[#3a2c07] hover:bg-gold/90' },
  { result: 'send', label: 'Send', sub: 'after tries', icon: '✓', btn: 'bg-moss text-paper hover:bg-moss/90' },
  { result: 'fail', label: 'Fail', sub: "didn't top", icon: '✗', btn: 'bg-graphite text-paper hover:bg-graphite/90' },
];

export function RouteSessionView() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<RouteSession | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [levelHint, setLevelHint] = useState(false);
  const [showBreakConfirm, setShowBreakConfirm] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!sessionId) {
      navigate('/');
      return;
    }
    const found = getAllSessions().find((s) => s.id === sessionId);
    if (!found || !isRouteSession(found)) {
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
    () => (session ? getRouteCounts(session.routes) : null),
    [session]
  );

  if (!session || !counts) return null;

  const elapsed = now - session.startTime.getTime();
  const total = counts.total;
  const xpSoFar =
    counts.flash * XP_PER_SEND + counts.send * XP_PER_TOP + counts.fail * XP_PER_PROJECT;
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

  const logRoute = (result: RouteResult) => {
    if (selectedLevel == null) {
      setLevelHint(true);
      return;
    }
    const entry: RouteEntry = {
      id: crypto.randomUUID(),
      order: session.routes.length + 1,
      level: selectedLevel,
      result,
      timestamp: new Date(),
    };
    const updated: RouteSession = { ...session, routes: [...session.routes, entry] };
    updateSession(updated);
    setSession(updated);
  };

  const removeRoute = (id: string) => {
    const updated: RouteSession = {
      ...session,
      routes: session.routes
        .filter((r) => r.id !== id)
        .map((r, i) => ({ ...r, order: i + 1 })),
    };
    updateSession(updated);
    setSession(updated);
  };

  const finishSession = () => {
    const finished: RouteSession = {
      ...session,
      isFinished: true,
      endTime: new Date(),
    };
    updateSession(finished);

    const all = getAllSessions().filter((s) => s.isFinished);
    const existing = getBadges();
    addBadges(evaluateBadges(finished, all, existing));

    navigate(`/summary/${session.id}`);
  };

  const handleBreakSession = () => {
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
            aria-label="Back"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <div className="text-center">
            <div className="stamp flex items-center justify-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-rust dot-live" />
              Live · <span className="font-mono">{formatElapsed(elapsed)}</span>
            </div>
            <div className="font-display text-xl leading-tight">{session.gymName}</div>
          </div>
          <button
            type="button"
            onClick={() => setShowBreakConfirm(true)}
            className="px-3 h-10 rounded-full border border-line text-xs font-semibold text-graphite hover:bg-chalk dark:hover:bg-basalt/60"
          >
            End
          </button>
        </div>

        {/* Live totals card */}
        <div className="mb-5 p-4 rounded-2xl bg-basalt text-paper">
          <div className="flex items-center justify-between mb-3">
            <StampLabel tone="paperMuted">This session</StampLabel>
            <div className="text-sm text-gold font-semibold">+{xpSoFar} XP</div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            <StatCell value={counts.flash} label="Flash" tone="gold" />
            <StatCell value={counts.send} label="Send" tone="moss" />
            <StatCell value={counts.fail} label="Fail" tone="graphite" />
            <StatCell value={total} label="Routes" tone="paper" />
          </div>
          <div className="mt-3 text-[11px] text-paper/60 text-center">
            Flash {pct(counts.flash)}% · Send {pct(counts.send)}% · Fail {pct(counts.fail)}%
          </div>
        </div>

        {/* Level picker */}
        <div className="mb-2 flex items-center justify-between">
          <StampLabel>Difficulty of the route you tried</StampLabel>
          {selectedLevel != null && (
            <span className="text-[11px] text-rust font-semibold">Level {selectedLevel}</span>
          )}
        </div>
        <div
          className={`flex flex-wrap gap-2 mb-1 rounded-xl transition-shadow ${
            levelHint ? 'ring-2 ring-rust ring-offset-2 ring-offset-transparent' : ''
          }`}
        >
          {Array.from({ length: session.maxLevel }, (_, i) => i + 1).map((lv) => (
            <button
              key={lv}
              type="button"
              onClick={() => {
                setSelectedLevel(lv);
                setLevelHint(false);
              }}
              className={`w-11 h-11 rounded-xl border font-mono font-bold transition-colors ${
                selectedLevel === lv
                  ? 'bg-basalt text-paper border-basalt'
                  : 'bg-paper border-line text-ink hover:bg-chalk dark:bg-basalt/40 dark:text-paper'
              }`}
              aria-pressed={selectedLevel === lv}
            >
              {lv}
            </button>
          ))}
        </div>

        {/* Outcome buttons */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          {OUTCOMES.map((o) => (
            <button
              key={o.result}
              type="button"
              onClick={() => logRoute(o.result)}
              className={`py-4 rounded-2xl font-bold flex flex-col items-center gap-1 shadow-pebble transition-colors ${o.btn}`}
            >
              <span className="text-xl leading-none">{o.icon}</span>
              <span>{o.label}</span>
              <span className="text-[10px] font-semibold opacity-90 uppercase tracking-wide">{o.sub}</span>
            </button>
          ))}
        </div>
        <div className="mt-3 text-center text-[11px] text-graphite">
          Pick a level, then tap an outcome — each tap logs one route.
        </div>

        {/* Logged routes */}
        <div className="mt-5">
          <StampLabel className="mb-2 block">
            Logged routes {total > 0 && `· ${total}`}
          </StampLabel>
          {total === 0 ? (
            <div className="p-4 rounded-xl border border-dashed border-line text-center text-graphite text-sm">
              No routes yet — your logged routes stack up here, newest first.
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-auto pr-1">
              {[...session.routes].reverse().map((r) => (
                <RouteRow key={r.id} route={r} onRemove={() => removeRoute(r.id)} />
              ))}
            </div>
          )}
        </div>

        {/* Finish CTA */}
        <button
          type="button"
          onClick={finishSession}
          disabled={total === 0}
          className="mt-6 w-full py-4 rounded-xl bg-moss hover:bg-moss/90 disabled:bg-graphite/40 disabled:cursor-not-allowed text-paper font-semibold tracking-wide shadow-pebble transition-colors"
        >
          Finish session &amp; collect XP →
        </button>
      </div>

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
  tone: 'gold' | 'moss' | 'graphite' | 'paper';
}) {
  const toneClass = {
    gold: 'text-gold',
    moss: 'text-moss',
    graphite: 'text-paper/50',
    paper: 'text-paper',
  }[tone];
  return (
    <div className="text-center">
      <div className={`font-display text-2xl ${toneClass}`}>{value}</div>
      <div className="text-[10px] text-paper/70 uppercase tracking-wider">{label}</div>
    </div>
  );
}

function RouteRow({ route, onRemove }: { route: RouteEntry; onRemove: () => void }) {
  const meta = {
    flash: { bg: 'bg-gold', text: 'text-[#b7841f]', label: 'Flash' },
    send: { bg: 'bg-moss', text: 'text-moss', label: 'Send' },
    fail: { bg: 'bg-graphite', text: 'text-graphite', label: 'Fail' },
  }[route.result];
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-xl border border-line bg-paper dark:bg-basalt/40">
      <span className={`w-7 h-7 rounded-lg ${meta.bg} text-paper font-mono font-bold text-xs flex items-center justify-center`}>
        {route.level}
      </span>
      <span className="text-sm">Level {route.level}</span>
      <span className={`ml-auto text-xs font-bold uppercase tracking-wide ${meta.text}`}>
        {meta.label}
      </span>
      <button
        type="button"
        onClick={onRemove}
        className="text-xs text-graphite underline hover:text-rust"
        aria-label={`Remove level ${route.level} ${meta.label}`}
      >
        remove
      </button>
    </div>
  );
}
