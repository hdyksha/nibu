import { useState, useCallback, useRef } from "react";
import { useTabManager } from "./hooks/useTabManager";
import { useUnsavedChangesGuard } from "./hooks/useUnsavedChangesGuard";
import { useWindowCloseGuard } from "./hooks/useWindowCloseGuard";
import { TitleBar } from "./components/TitleBar";
import { ActivityBar } from "./components/ActivityBar";
import { SidePanel } from "./components/SidePanel";
import { TabBar } from "./components/TabBar";
import { EditorTabContent } from "./components/EditorTabContent";
import type { EditorTabContentHandle } from "./components/EditorTabContent";
import { TaskPanel } from "./components/TaskPanel";
import { ConfirmDialog } from "./components/ConfirmDialog";
import type { ActivityView } from "./types";

function App() {
  const [activeActivity, setActiveActivity] = useState<ActivityView | null>("files");
  const tabManager = useTabManager();
  const unsavedGuard = useUnsavedChangesGuard();

  // 各エディタタブの ref を保持（saveFile 呼び出し用）
  const editorRefs = useRef<Map<string, EditorTabContentHandle>>(new Map());

  const setEditorRef = useCallback((tabId: string) => (handle: EditorTabContentHandle | null) => {
    if (handle) {
      editorRefs.current.set(tabId, handle);
    } else {
      editorRefs.current.delete(tabId);
    }
  }, []);

  // いずれかのタブが未保存かチェック
  const hasDirtyTab = tabManager.tabs.some((t) => t.isDirty);

  // すべての未保存タブを保存する関数
  const saveAllDirtyTabs = useCallback(async () => {
    const dirtyEditorTabs = tabManager.tabs.filter((t) => t.isDirty && t.type === "editor");
    for (const tab of dirtyEditorTabs) {
      const handle = editorRefs.current.get(tab.id);
      if (handle) {
        await handle.saveFile();
      }
    }
    return true;
  }, [tabManager.tabs]);

  // ウィンドウ閉じ時の確認ダイアログ
  const windowGuard = useWindowCloseGuard(hasDirtyTab, saveAllDirtyTabs);

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

  // タブ閉じ時の未保存変更ガード (Requirements: 5.1, 5.2, 5.3, 5.4, 5.5)
  const handleTabClose = useCallback(
    async (tabId: string) => {
      const tab = tabManager.tabs.find((t) => t.id === tabId);
      if (!tab) return;

      if (!tab.isDirty || tab.type !== "editor") {
        tabManager.closeTab(tabId);
        return;
      }

      const editorHandle = editorRefs.current.get(tabId);
      const saveFile = editorHandle
        ? () => editorHandle.saveFile()
        : () => Promise.resolve(false);

      const canClose = await unsavedGuard.guardBeforeAction(true, saveFile);
      if (canClose) {
        tabManager.closeTab(tabId);
      }
    },
    [tabManager.tabs, tabManager.closeTab, unsavedGuard.guardBeforeAction],
  );

  // アクティブなエディタタブの fileId（SidePanel のハイライト用）
  const currentFileId = tabManager.activeTab?.type === "editor"
    ? tabManager.activeTab.fileId ?? null
    : null;

  // 未保存タブ数（ウィンドウ閉じダイアログのメッセージ用）
  const dirtyTabCount = tabManager.tabs.filter((t) => t.isDirty).length;

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
            onTabClose={handleTabClose}
          />

          <div className="flex-1 min-h-0 relative">
            {tabManager.tabs
              .filter((t) => t.type === "editor" && t.fileId)
              .map((tab) => (
                <EditorTabContent
                  key={tab.id}
                  ref={setEditorRef(tab.id)}
                  fileId={tab.fileId!}
                  isActive={tab.id === tabManager.activeTabId}
                  onDirtyChange={handleDirtyChange(tab.id)}
                  onTitleChange={handleTitleChange(tab.id)}
                />
              ))}

            {tabManager.activeTab?.type === "task" && (
              <div className="flex-1 min-h-0 overflow-auto">
                <TaskPanel onFileOpen={handleFileOpen} />
              </div>
            )}

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

      {/* タブ閉じ時の未保存ガード (Req 5.1-5.5) */}
      <ConfirmDialog
        open={unsavedGuard.showDialog}
        title="未保存の変更"
        message="変更が保存されていません。保存しますか？"
        confirmLabel="保存する"
        cancelLabel="保存しない"
        dismissLabel="キャンセル"
        onConfirm={unsavedGuard.handleSave}
        onCancel={unsavedGuard.handleDiscard}
        onDismiss={unsavedGuard.handleCancel}
      />

      {/* ウィンドウ閉じ時の未保存ガード */}
      <ConfirmDialog
        open={windowGuard.showDialog}
        title="未保存の変更"
        message={`${dirtyTabCount}個のファイルに未保存の変更があります。すべて保存しますか？`}
        confirmLabel="すべて保存"
        cancelLabel="保存しない"
        dismissLabel="キャンセル"
        onConfirm={windowGuard.handleSaveAll}
        onCancel={windowGuard.handleDiscardAll}
        onDismiss={windowGuard.handleCancel}
      />
    </div>
  );
}

export default App;
