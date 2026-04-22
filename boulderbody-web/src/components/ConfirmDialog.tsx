/**
 * Reusable confirmation dialog component.
 * Used for destructive actions like deleting sessions or finishing with unlogged boulders.
 */

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'default';
  closeOnBackdrop?: boolean;
  /** Hide the cancel button — use when the dialog has no valid "no" answer */
  hideCancel?: boolean;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'default',
  closeOnBackdrop = true,
  hideCancel = false,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const confirmClass =
    variant === 'danger'
      ? 'bg-rust hover:bg-rustdark text-paper'
      : 'bg-ink hover:bg-basalt text-paper dark:bg-paper dark:hover:bg-chalk dark:text-ink';

  return (
    <div
      className="fixed inset-0 bg-ink/60 flex items-center justify-center p-4 z-50"
      onClick={closeOnBackdrop ? onCancel : undefined}
    >
      <div
        className="paper-tex rounded-[24px] p-6 max-w-sm w-full shadow-pebble border border-line"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display text-xl mb-2">{title}</h3>
        <p className="text-sm text-graphite mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          {!hideCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-3 rounded-xl border border-line bg-paper text-ink font-semibold hover:bg-chalk dark:bg-basalt dark:text-paper dark:hover:bg-ink"
            >
              {cancelText}
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm}
            className={`px-5 py-3 rounded-xl font-semibold shadow-pebble ${confirmClass}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
