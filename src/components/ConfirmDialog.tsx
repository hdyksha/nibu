import { useEffect, useRef } from "react";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  dismissLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  onDismiss?: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "OK",
  cancelLabel = "キャンセル",
  dismissLabel,
  onConfirm,
  onCancel,
  onDismiss,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  if (!open) return null;

  return (
    <dialog
      ref={ref}
      className="rounded-xl shadow-xl p-0 backdrop:bg-black/40 border border-[var(--border-color)]"
      onCancel={(e) => {
        e.preventDefault();
        (onDismiss ?? onCancel)();
      }}
      aria-labelledby="confirm-dialog-title"
    >
      <div className="p-6 min-w-[320px]">
        <h2 id="confirm-dialog-title" className="text-base font-semibold text-[var(--text-primary)] mb-2">
          {title}
        </h2>
        <p className="text-sm text-[var(--text-secondary)] mb-6">{message}</p>
        <div className="flex justify-end gap-2">
          {dismissLabel && (
            <button
              type="button"
              className="px-4 py-1.5 text-sm rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-slate-100 transition-colors mr-auto"
              onClick={onDismiss ?? onCancel}
            >
              {dismissLabel}
            </button>
          )}
          <button
            type="button"
            className="px-4 py-1.5 text-sm rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-slate-100 transition-colors"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className="px-4 py-1.5 text-sm rounded-lg bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors shadow-sm"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
