/**
 * Reusable confirmation dialog component.
 * Used for destructive actions like deleting sessions or finishing with unlogged boulders.
 */

interface ConfirmDialogProps {
  /** Whether the dialog is visible */
  isOpen: boolean;

  /** Dialog title */
  title: string;

  /** Dialog message/description */
  message: string;

  /** Text for confirm button (default: "Confirm") */
  confirmText?: string;

  /** Text for cancel button (default: "Cancel") */
  cancelText?: string;

  /** Called when user confirms */
  onConfirm: () => void;

  /** Called when user cancels */
  onCancel: () => void;

  /** Visual style variant (default: "default", danger for destructive actions) */
  variant?: 'danger' | 'default';
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
}: ConfirmDialogProps) {
  if (!isOpen) {
    return null;
  }

  const confirmButtonClass =
    variant === 'danger'
      ? 'btn btn-danger'
      : 'btn btn-primary';

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onCancel} // Close on backdrop click
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full shadow-xl"
        onClick={(e) => e.stopPropagation()} // Prevent close on content click
      >
        <h3 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">
          {title}
        </h3>
        <p className="text-gray-600 dark:text-gray-300 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="btn btn-secondary">
            {cancelText}
          </button>
          <button onClick={onConfirm} className={confirmButtonClass}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
