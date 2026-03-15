import { useEffect, useRef } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

/**
 * アプリ終了時に未保存変更がある場合、window.confirm で確認する。
 * Tauri の onCloseRequested は同期的な confirm のみ安全に使えるため、
 * ファイル切り替え時のカスタムダイアログとは別に処理する。
 * Requirements: 3.7
 */
export function useWindowCloseGuard(
  isDirty: boolean,
  saveFile: () => Promise<boolean>,
) {
  const isDirtyRef = useRef(isDirty);
  const saveFileRef = useRef(saveFile);

  // ref を最新に保つ
  isDirtyRef.current = isDirty;
  saveFileRef.current = saveFile;

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    getCurrentWindow()
      .onCloseRequested(async (event) => {
        if (!isDirtyRef.current) return;

        event.preventDefault();

        // eslint-disable-next-line no-restricted-globals
        const shouldSave = confirm(
          "未保存の変更があります。保存しますか？\n\n「OK」→ 保存して終了\n「キャンセル」→ 保存せず終了",
        );

        if (shouldSave) {
          await saveFileRef.current();
        }

        // どちらを選んでもウィンドウを閉じる
        await getCurrentWindow().destroy();
      })
      .then((fn) => {
        unlisten = fn;
      });

    return () => unlisten?.();
  }, []);
}
