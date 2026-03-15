import { useCallback } from "react";
import { useFileManager } from "./hooks/useFileManager";
import { useUnsavedChangesGuard } from "./hooks/useUnsavedChangesGuard";
import { useWindowCloseGuard } from "./hooks/useWindowCloseGuard";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { FileSidebar } from "./components/FileSidebar";
import { TaskPanel } from "./components/TaskPanel";

function App() {
  const fileManager = useFileManager();
  const guard = useUnsavedChangesGuard();

  // アプリ終了時の未保存変更ガード (Req 3.7)
  useWindowCloseGuard(fileManager.isDirty, fileManager.saveFile);

  // ファイル切り替え時に未保存変更を確認してからロード (Req 3.7)
  const handleFileSelect = useCallback(
    async (fileId: string) => {
      const canProceed = await guard.guardBeforeAction(
        fileManager.isDirty,
        fileManager.saveFile,
      );
      if (canProceed) {
        await fileManager.loadFile(fileId);
      }
    },
    [guard, fileManager],
  );

  // タスクの紐づけファイルクリック時にEditorでファイルを開く (Req 5.4)
  const handleFileOpen = useCallback(
    async (fileId: string) => {
      const canProceed = await guard.guardBeforeAction(
        fileManager.isDirty,
        fileManager.saveFile,
      );
      if (canProceed) {
        await fileManager.loadFile(fileId);
      }
    },
    [guard, fileManager],
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <FileSidebar
        currentFileId={fileManager.currentFile?.id ?? null}
        onFileSelect={handleFileSelect}
      />
      <main className="flex-1 p-4">
        <h1 className="text-2xl font-bold">Nibu - Markdown Editor</h1>
      </main>
      <TaskPanel onFileOpen={handleFileOpen} />

      {/* 未保存変更の保存確認ダイアログ (Req 3.7) */}
      <ConfirmDialog
        open={guard.showDialog}
        title="未保存の変更"
        message="変更が保存されていません。保存しますか？"
        confirmLabel="保存する"
        cancelLabel="保存しない"
        dismissLabel="キャンセル"
        onConfirm={guard.handleSave}
        onCancel={guard.handleDiscard}
        onDismiss={guard.handleCancel}
      />
    </div>
  );
}

export default App;
