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

  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [taskPanelVisible, setTaskPanelVisible] = useState(true);

  useWindowCloseGuard(fileManager.isDirty, fileManager.saveFile);

  const handleToggleViewMode = useCallback(() => {
    if (editorRef.current) {
      savePosition(editorRef.current.getCursorOffset(), editorRef.current.getScrollRatio());
    }
    toggleViewMode();
  }, [savePosition, toggleViewMode]);

  const handleFileSelect = useCallback(
    async (fileId: string) => {
      const canProceed = await guard.guardBeforeAction(fileManager.isDirty, fileManager.saveFile);
      if (canProceed) await fileManager.loadFile(fileId);
    },
    [guard, fileManager],
  );

  const handleFileOpen = useCallback(
    async (fileId: string) => {
      const canProceed = await guard.guardBeforeAction(fileManager.isDirty, fileManager.saveFile);
      if (canProceed) await fileManager.loadFile(fileId);
    },
    [guard, fileManager],
  );

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
    <div className="h-screen flex flex-col bg-white" onKeyDown={handleKeyDown}>
      <div className="flex flex-1 min-h-0">
        {/* サイドバー */}
        {sidebarVisible && (
          <FileSidebar
            currentFileId={fileManager.currentFile?.id ?? null}
            onFileSelect={handleFileSelect}
          />
        )}

        {/* エディタ領域 */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* ツールバー */}
          <div className="flex items-center px-1 py-1 bg-[var(--toolbar-bg)] border-b border-[var(--border-color)]">
            <button
              type="button"
              className="p-2 rounded-lg text-[var(--text-secondary)] hover:bg-slate-100 hover:text-[var(--text-primary)] transition-colors"
              onClick={() => setSidebarVisible((v) => !v)}
              aria-label={sidebarVisible ? "Hide sidebar" : "Show sidebar"}
              title={sidebarVisible ? "サイドバーを隠す" : "サイドバーを表示"}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
            </button>

            <Toolbar editorView={viewMode === "preview" ? editorRef.current?.editorView ?? null : null} />

            <div className="ml-auto flex items-center gap-2 px-2">
              {fileManager.isDirty && (
                <span className="text-xs text-amber-500 font-medium" aria-label="Unsaved changes">●</span>
              )}
              {fileManager.isSaving && (
                <span className="text-xs text-[var(--text-muted)]">保存中...</span>
              )}

              <ViewToggle currentMode={viewMode} onToggle={handleToggleViewMode} />

              <button
                type="button"
                className="p-2 rounded-lg text-[var(--text-secondary)] hover:bg-slate-100 hover:text-[var(--text-primary)] transition-colors"
                onClick={() => setTaskPanelVisible((v) => !v)}
                aria-label={taskPanelVisible ? "Hide task panel" : "Show task panel"}
                title={taskPanelVisible ? "タスクパネルを隠す" : "タスクパネルを表示"}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
              </button>
            </div>
          </div>

          {/* エディタ本体 */}
          <div className="flex-1 min-h-0 overflow-auto bg-white">
            {fileManager.currentFile ? (
              <MarkdownEditor
                ref={editorRef}
                content={fileManager.content}
                viewMode={viewMode}
                onChange={fileManager.updateContent}
                savedPosition={savedPosition}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-[var(--text-muted)] gap-3">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-40"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                <span className="text-sm">ファイルを選択または作成してください</span>
              </div>
            )}
          </div>

          {/* エラー表示 */}
          {fileManager.error && (
            <div className="px-4 py-2.5 bg-red-50 border-t border-red-100 text-red-600 text-sm flex items-center justify-between" role="alert">
              <span>{fileManager.error}</span>
              <button
                type="button"
                className="text-red-400 hover:text-red-600 text-xs ml-4"
                onClick={fileManager.clearError}
                aria-label="Dismiss error"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* タスクパネル */}
        {taskPanelVisible && <TaskPanel onFileOpen={handleFileOpen} />}
      </div>

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
