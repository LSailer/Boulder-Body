import type { ReactNode } from 'react';

type Tone = 'default' | 'gold' | 'rust' | 'moss' | 'graphite' | 'paperMuted';

const toneClass: Record<Tone, string> = {
  default: '',
  gold: 'text-gold',
  rust: 'text-rust',
  moss: 'text-moss',
  graphite: 'text-graphite',
  paperMuted: 'text-paper/70',
};

export function StampLabel({
  children,
  tone = 'default',
  className = '',
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span className={`stamp ${toneClass[tone]} ${className}`.trim()}>{children}</span>
  );
}
