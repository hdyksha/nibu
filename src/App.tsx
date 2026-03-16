import { useState, useCallback } from "react";
import { useTabManager } from "./hooks/useTabManager";
import { useWindowCloseGuard } from "./hooks/useWindowCloseGuard";
import { TitleBar } from "./components/TitleBar";
import { ActivityBar } from "./components/ActivityBar";
import { SidePanel } from "./components/SidePanel";
import { TabBar } from "./components/TabBar";
import { EditorTabContent } from "./components/EditorTabContent";
import { TaskPanel } from "./components/TaskPanel";
import { ConfirmDialog } from "./components/ConfirmDialog";
import type { ActivityView } from "./types";

function App() {
  const [activeActivity, setActiveActivity] = useState<ActivityView | null>("files");
  const tabManager = useTabManager();

  // いずれかのタブが未保存かチェック
  const hasDirtyTab = tabManager.tabs.some((t) => t.isDirty);
  useWindowCloseGuard(hasDirtyTab, async () => false);

  const handleFileSelect = useCallback(
    (fileId: string) => {
      tabManager.openEditorTab(fileId, "読み込み中…");
    },
    [tabManager.openEditorTab],
  );

  const handleFileOpen = useCallback(
    (fileId: string) => {
      tabManager.openEditorTab(fileId, "読み込み中…");
    },
    [tabManager.openEditorTab],
  );

  const handleOpenTaskTab = useCallback(() => {
    tabManager.openTaskTab();
  }, [tabManager.openTaskTab]);

  const handleDirtyChange = useCallback(
    (tabId: string) => (isDirty: boolean) => {
      tabManager.updateTabDirty(tabId, isDirty);
    },
    [tabManager.updateTabDirty],
  );

  const handleTitleChange = useCallback(
    (tabId: string) => (title: string) => {
      tabManager.updateTabTitle(tabId, title);
    },
    [tabManager.updateTabTitle],
  );

  // アクティブなエディタタブの fileId（SidePanel のハイライト用）
  const currentFileId = tabManager.activeTab?.type === "editor"
    ? tabManager.activeTab.fileId ?? null
    : null;

  return (
    <div className="h-screen flex flex-col bg-white">
      <TitleBar />
      <div className="flex flex-1 min-h-0">
        <ActivityBar
          activeView={activeActivity}
          onActivityChange={setActiveActivity}
        />

        {activeActivity && (
          <SidePanel
            activeView={activeActivity}
            currentFileId={currentFileId}
            onFileSelect={handleFileSelect}
            onFileOpen={handleFileOpen}
            onOpenTaskTab={handleOpenTaskTab}
          />
        )}

        {/* MainArea */}
        <div className="flex-1 flex flex-col min-w-0">
          <TabBar
            tabs={tabManager.tabs}
            activeTabId={tabManager.activeTabId}
            onTabClick={tabManager.activateTab}
            onTabClose={tabManager.closeTab}
          />

          <div className="flex-1 min-h-0 relative">
            {/* Editor tabs (display:none で非表示、状態保持) */}
            {tabManager.tabs
              .filter((t) => t.type === "editor" && t.fileId)
              .map((tab) => (
                <EditorTabContent
                  key={tab.id}
                  fileId={tab.fileId!}
                  isActive={tab.id === tabManager.activeTabId}
                  onDirtyChange={handleDirtyChange(tab.id)}
                  onTitleChange={handleTitleChange(tab.id)}
                />
              ))}

            {/* Task tab */}
            {tabManager.activeTab?.type === "task" && (
              <div className="flex-1 min-h-0 overflow-auto">
                <TaskPanel onFileOpen={handleFileOpen} />
              </div>
            )}

            {/* 空状態プレースホルダー */}
            {tabManager.tabs.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-[var(--text-muted)] gap-3">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-40">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
                <span className="text-sm">ファイルを選択または作成してください</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ConfirmDialog: タブ閉じ時の未保存ガード用（task 7.3 で接続） */}
      <ConfirmDialog
        open={false}
        title="未保存の変更"
        message="変更が保存されていません。保存しますか？"
        confirmLabel="保存する"
        cancelLabel="保存しない"
        dismissLabel="キャンセル"
        onConfirm={() => {}}
        onCancel={() => {}}
        onDismiss={() => {}}
      />
    </div>
  );
}

export default App;
