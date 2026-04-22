import { useState } from 'react';
import type { BoulderAttempt, AttemptResult } from '../models/BoulderAttempt';
import {
  XP_PER_SEND,
  XP_PER_TOP,
  XP_PER_PROJECT,
} from '../models/Gamification';

/**
 * Modal for logging a boulder attempt result.
 * Three outcome buttons (Send / Top / Project) with XP hint.
 */

interface BoulderLogModalProps {
  isOpen: boolean;
  attempt: BoulderAttempt;
  onSubmit: (result: AttemptResult, comment?: string) => void;
  onCancel: () => void;
}

type OutcomeKey = AttemptResult;

interface OutcomeCfg {
  result: OutcomeKey;
  label: string;
  icon: string;
  xp: number;
  selectedClass: string;
  idleClass: string;
}

const OUTCOMES: OutcomeCfg[] = [
  {
    result: 'flash',
    label: 'Send',
    icon: '⚡',
    xp: XP_PER_SEND,
    selectedClass: 'bg-gold/15 border-gold shadow-glow',
    idleClass: 'bg-gold/5 border-gold/40 hover:bg-gold/10',
  },
  {
    result: 'done',
    label: 'Top',
    icon: '✓',
    xp: XP_PER_TOP,
    selectedClass: 'bg-moss/20 border-moss shadow-pebble',
    idleClass: 'bg-moss/5 border-moss/40 hover:bg-moss/15',
  },
  {
    result: 'fail',
    label: 'Project',
    icon: '·',
    xp: XP_PER_PROJECT,
    selectedClass: 'bg-graphite/20 border-graphite shadow-pebble',
    idleClass: 'bg-graphite/5 border-graphite/40 hover:bg-graphite/15',
  },
];

export function BoulderLogModal({
  isOpen,
  attempt,
  onSubmit,
  onCancel,
}: BoulderLogModalProps) {
  const [comment, setComment] = useState(attempt.comment || '');
  const [selected, setSelected] = useState<OutcomeKey | null>(
    attempt.result ?? null
  );

  if (!isOpen) return null;

  const submit = () => {
    if (!selected) return;
    onSubmit(selected, comment.trim() || undefined);
    setComment('');
    setSelected(null);
  };

  return (
    <div
      className="fixed inset-0 bg-ink/60 flex items-center justify-center p-4 z-50"
      onClick={onCancel}
    >
      <div
        className="paper-tex rounded-[28px] shadow-pebble border border-line p-6 max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-1">
          <span className="stamp">Boulder {attempt.order}</span>
          <button
            type="button"
            onClick={onCancel}
            className="text-graphite text-2xl leading-none hover:text-ink dark:hover:text-paper"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <h3 className="font-display text-2xl mb-4">How did it go?</h3>

        <div className="grid grid-cols-3 gap-3 mb-4">
          {OUTCOMES.map((o) => {
            const isSel = selected === o.result;
            return (
              <button
                key={o.result}
                type="button"
                onClick={() => setSelected(o.result)}
                className={`flex flex-col items-center gap-1 py-4 rounded-2xl border-2 text-ink dark:text-paper font-semibold transition-colors ${
                  isSel ? o.selectedClass : o.idleClass
                }`}
              >
                <span className="text-2xl">{o.icon}</span>
                <span className="text-sm">{o.label}</span>
                <span className="text-[10px] text-graphite">+{o.xp} XP</span>
              </button>
            );
          })}
        </div>

        <label className="block mb-4">
          <span className="stamp mb-1.5 block">Beta · note (optional)</span>
          <textarea
            rows={2}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-line bg-paper text-sm text-ink focus:outline-none focus:border-rust dark:bg-basalt/60 dark:text-paper"
            placeholder="Heel-hook on the arête, knee-drop…"
          />
        </label>

        <button
          type="button"
          onClick={submit}
          disabled={!selected}
          className="w-full py-3 rounded-xl bg-rust hover:bg-rustdark disabled:bg-graphite/40 disabled:cursor-not-allowed text-paper font-semibold shadow-pebble transition-colors"
        >
          Log attempt
        </button>
      </div>
    </div>
  );
}
