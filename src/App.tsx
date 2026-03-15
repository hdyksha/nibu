import { useCallback, useRef, useState } from "react";
import { useFileManager } from "./hooks/useFileManager";
import { useViewMode } from "./hooks/useViewMode";
import { useUnsavedChangesGuard } from "./hooks/useUnsavedChangesGuard";
import { useWindowCloseGuard } from "./hooks/useWindowCloseGuard";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { FileSidebar } from "./components/FileSidebar";
import { MarkdownEditor } from "./components/MarkdownEditor";
import type { MarkdownEditorHandle } from "./components/MarkdownEditor";
import { Toolbar } from "./components/Toolbar";
import { ViewToggle } from "./components/ViewToggle";
import { TaskPanel } from "./components/TaskPanel";

function App() {
  const fileManager = useFileManager();
  const { viewMode, toggle: toggleViewMode, savePosition, consumeSavedPosition } = useViewMode();
  const guard = useUnsavedChangesGuard();
  const editorRef = useRef<MarkdownEditorHandle>(null);

  // サイドバー・タスクパネルの表示状態 (Req 6.2)
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [taskPanelVisible, setTaskPanelVisible] = useState(true);

  // アプリ終了時の未保存変更ガード (Req 3.7)
  useWindowCloseGuard(fileManager.isDirty, fileManager.saveFile);

  // モード切り替え時にカーソル/スクロール位置を保存してからトグル (Req 2.6)
  const handleToggleViewMode = useCallback(() => {
    if (editorRef.current) {
      savePosition(editorRef.current.getCursorOffset(), editorRef.current.getScrollRatio());
    }
    toggleViewMode();
  }, [savePosition, toggleViewMode]);

  // ファイル切り替え時に未保存変更を確認してからロード (Req 3.7)
  const handleFileSelect = useCallback(
    async (fileId: string) => {
      const canProceed = await guard.guardBeforeAction(fileManager.isDirty, fileManager.saveFile);
      if (canProceed) {
        await fileManager.loadFile(fileId);
      }
    },
    [guard, fileManager],
  );

  // タスクの紐づけファイルクリック時にEditorでファイルを開く (Req 5.4)
  const handleFileOpen = useCallback(
    async (fileId: string) => {
      const canProceed = await guard.guardBeforeAction(fileManager.isDirty, fileManager.saveFile);
      if (canProceed) {
        await fileManager.loadFile(fileId);
      }
    },
    [guard, fileManager],
  );

  // Ctrl+S / Cmd+S でファイル保存 (Req 3.2)
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        fileManager.saveFile();
      }
    },
    [fileManager],
  );

  const savedPosition = consumeSavedPosition();

  return (
    <div className="h-screen flex flex-col" onKeyDown={handleKeyDown}>
      {/* メインレイアウト */}
      <div className="flex flex-1 min-h-0">
        {/* サイドバー (Req 3.4) */}
        {sidebarVisible && (
          <FileSidebar
            currentFileId={fileManager.currentFile?.id ?? null}
            onFileSelect={handleFileSelect}
          />
        )}

        {/* エディタ領域 */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* ツールバー行: Toolbar + ViewToggle + パネルトグル */}
          <div className="flex items-center border-b bg-white">
            <button
              type="button"
              className="px-2 py-2 text-sm hover:bg-gray-100"
              onClick={() => setSidebarVisible((v) => !v)}
              aria-label={sidebarVisible ? "Hide sidebar" : "Show sidebar"}
              title={sidebarVisible ? "サイドバーを隠す" : "サイドバーを表示"}
            >
              ☰
            </button>

            <Toolbar editorView={viewMode === "preview" ? editorRef.current?.editorView ?? null : null} />

            <div className="ml-auto flex items-center gap-2 px-2">
              {/* ダーティ表示 (Req 3.7) */}
              {fileManager.isDirty && (
                <span className="text-xs text-orange-500" aria-label="Unsaved changes">●</span>
              )}
              {fileManager.isSaving && (
                <span className="text-xs text-gray-400">保存中...</span>
              )}

              <ViewToggle currentMode={viewMode} onToggle={handleToggleViewMode} />

              <button
                type="button"
                className="px-2 py-1 text-sm hover:bg-gray-100 rounded"
                onClick={() => setTaskPanelVisible((v) => !v)}
                aria-label={taskPanelVisible ? "Hide task panel" : "Show task panel"}
                title={taskPanelVisible ? "タスクパネルを隠す" : "タスクパネルを表示"}
              >
                ✓
              </button>
            </div>
          </div>

          {/* エディタ本体 (Req 1.1, 2.1) */}
          <div className="flex-1 min-h-0 overflow-auto">
            {fileManager.currentFile ? (
              <MarkdownEditor
                ref={editorRef}
                content={fileManager.content}
                viewMode={viewMode}
                onChange={fileManager.updateContent}
                savedPosition={savedPosition}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                ファイルを選択または作成してください
              </div>
            )}
          </div>

          {/* エラー表示 (Req 3.6) */}
          {fileManager.error && (
            <div className="px-4 py-2 bg-red-50 text-red-600 text-sm flex items-center justify-between" role="alert">
              <span>{fileManager.error}</span>
              <button
                type="button"
                className="text-red-400 hover:text-red-600 text-xs"
                onClick={fileManager.clearError}
                aria-label="Dismiss error"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* タスクパネル (Req 4.5) */}
        {taskPanelVisible && <TaskPanel onFileOpen={handleFileOpen} />}
      </div>

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
