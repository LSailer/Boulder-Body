import type { ReactNode } from 'react';

export function PaperCard({
  children,
  className = '',
  bordered = true,
}: {
  children: ReactNode;
  className?: string;
  bordered?: boolean;
}) {
  return (
    <div
      className={`paper-tex rounded-2xl ${bordered ? 'border border-line' : ''} ${className}`.trim()}
    >
      {children}
    </div>
  );
}
