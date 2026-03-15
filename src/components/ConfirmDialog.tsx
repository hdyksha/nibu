import { useEffect, useRef } from "react";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** 第3のボタン（操作自体をキャンセル）。指定しなければ表示しない */
  dismissLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** 操作自体のキャンセル。未指定なら onCancel と同じ */
  onDismiss?: () => void;
}

/**
 * 汎用確認ダイアログ。
 * open=true のとき <dialog> をモーダル表示する。
 */
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
      className="rounded-lg shadow-xl p-0 backdrop:bg-black/40"
      onCancel={(e) => {
        e.preventDefault();
        (onDismiss ?? onCancel)();
      }}
      aria-labelledby="confirm-dialog-title"
    >
      <div className="p-6 min-w-[320px]">
        <h2 id="confirm-dialog-title" className="text-base font-semibold mb-2">
          {title}
        </h2>
        <p className="text-sm text-gray-600 mb-6">{message}</p>
        <div className="flex justify-end gap-2">
          {dismissLabel && (
            <button
              type="button"
              className="px-4 py-1.5 text-sm rounded border border-gray-300 hover:bg-gray-100 mr-auto"
              onClick={onDismiss ?? onCancel}
            >
              {dismissLabel}
            </button>
          )}
          <button
            type="button"
            className="px-4 py-1.5 text-sm rounded border border-gray-300 hover:bg-gray-100"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className="px-4 py-1.5 text-sm rounded bg-blue-500 text-white hover:bg-blue-600"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
