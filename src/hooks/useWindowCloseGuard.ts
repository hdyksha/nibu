import { useState, useCallback, useEffect, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";

export type WindowCloseAction = "saveAll" | "discardAll" | "cancel";

export interface UseWindowCloseGuardReturn {
  /** 確認ダイアログが表示中か */
  showDialog: boolean;
  /** すべて保存して閉じる */
  handleSaveAll: () => void;
  /** すべて破棄して閉じる */
  handleDiscardAll: () => void;
  /** ウィンドウ閉じをキャンセル */
  handleCancel: () => void;
}

/**
 * ウィンドウ閉じ時の未保存変更ガードフック。
 *
 * Rust 側の on_window_event(CloseRequested) → prevent_close → emit("window-close-requested")
 * を受け取り、未保存変更がある場合は確認ダイアログを表示する。
 *
 * @param isDirty いずれかのタブに未保存変更があるか
 * @param saveAll すべての未保存タブを保存する関数
 */
export function useWindowCloseGuard(
  isDirty: boolean,
  saveAll: () => Promise<boolean>,
): UseWindowCloseGuardReturn {
  const [showDialog, setShowDialog] = useState(false);
  const isDirtyRef = useRef(isDirty);
  const saveAllRef = useRef(saveAll);
  const resolveRef = useRef<((action: WindowCloseAction) => void) | null>(null);

  isDirtyRef.current = isDirty;
  saveAllRef.current = saveAll;

  useEffect(() => {
    const unlisten = listen("window-close-requested", async () => {
      if (!isDirtyRef.current) {
        // 未保存なし → そのまま閉じる
        await invoke("confirm_close");
        return;
      }

      // 未保存あり → ダイアログ表示してユーザーの選択を待つ
      const action = await new Promise<WindowCloseAction>((resolve) => {
        resolveRef.current = resolve;
        setShowDialog(true);
      });

      if (action === "saveAll") {
        await saveAllRef.current();
        await invoke("confirm_close");
      } else if (action === "discardAll") {
        await invoke("confirm_close");
      }
      // cancel → 何もしない（CLOSING フラグは Rust 側でリセットが必要）
      if (action === "cancel") {
        await invoke("cancel_close");
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  const settle = useCallback((action: WindowCloseAction) => {
    setShowDialog(false);
    resolveRef.current?.(action);
    resolveRef.current = null;
  }, []);

  const handleSaveAll = useCallback(() => settle("saveAll"), [settle]);
  const handleDiscardAll = useCallback(() => settle("discardAll"), [settle]);
  const handleCancel = useCallback(() => settle("cancel"), [settle]);

  return {
    showDialog,
    handleSaveAll,
    handleDiscardAll,
    handleCancel,
  };
}
