/**
 * WSL2 WebKitGTK の制約により、このフックは現在何もしない。
 *
 * - onCloseRequested → ウィンドウが閉じなくなる
 * - confirm() → UIスレッドがフリーズする
 * - beforeunload preventDefault → 確認ダイアログが表示されない
 *
 * 代わりに useFileManager のデバウンス自動保存で対応している。
 * 将来 WebKitGTK の問題が解消された場合に備えてフックのインターフェースは残す。
 */
export function useWindowCloseGuard(
  _isDirty: boolean,
  _saveFile: () => Promise<boolean>,
) {
  // no-op
}
