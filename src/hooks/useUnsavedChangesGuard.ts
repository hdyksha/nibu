import { useState, useCallback, useRef } from "react";

export type UnsavedAction = "save" | "discard" | "cancel";

export interface UseUnsavedChangesGuardReturn {
  /** 確認ダイアログが表示中か */
  showDialog: boolean;
  /** 保存して続行 */
  handleSave: () => void;
  /** 保存せず続行 */
  handleDiscard: () => void;
  /** 操作をキャンセル */
  handleCancel: () => void;
  /**
   * 未保存変更がある場合に確認ダイアログを表示し、ユーザーの選択を待つ。
   * isDirty=false なら即座に true を返す（続行OK）。
   * true = 続行OK, false = キャンセル
   */
  guardBeforeAction: (
    isDirty: boolean,
    saveFile: () => Promise<boolean>,
  ) => Promise<boolean>;
}

/**
 * 未保存変更の保存確認ガードフック。
 * ファイル切り替え時に確認ダイアログを表示する。
 * Requirements: 3.7
 */
export function useUnsavedChangesGuard(): UseUnsavedChangesGuardReturn {
  const [showDialog, setShowDialog] = useState(false);
  const resolveRef = useRef<((action: UnsavedAction) => void) | null>(null);
  const saveFileFnRef = useRef<(() => Promise<boolean>) | null>(null);

  const settle = useCallback((action: UnsavedAction) => {
    setShowDialog(false);
    resolveRef.current?.(action);
    resolveRef.current = null;
  }, []);

  const handleSave = useCallback(() => settle("save"), [settle]);
  const handleDiscard = useCallback(() => settle("discard"), [settle]);
  const handleCancel = useCallback(() => settle("cancel"), [settle]);

  const guardBeforeAction = useCallback(
    async (isDirty: boolean, saveFile: () => Promise<boolean>): Promise<boolean> => {
      if (!isDirty) return true;

      saveFileFnRef.current = saveFile;

      const action = await new Promise<UnsavedAction>((resolve) => {
        resolveRef.current = resolve;
        setShowDialog(true);
      });

      if (action === "save") {
        return saveFile();
      }
      return action === "discard";
    },
    [],
  );

  return {
    showDialog,
    handleSave,
    handleDiscard,
    handleCancel,
    guardBeforeAction,
  };
}
