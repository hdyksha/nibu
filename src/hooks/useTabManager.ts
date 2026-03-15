import { useState, useCallback, useMemo } from "react";
import type { Tab } from "../types";

export interface UseTabManagerReturn {
  tabs: Tab[];
  activeTabId: string | null;
  activeTab: Tab | null;
  openEditorTab: (fileId: string, title: string) => void;
  openTaskTab: () => void;
  closeTab: (tabId: string) => void;
  activateTab: (tabId: string) => void;
  updateTabDirty: (tabId: string, isDirty: boolean) => void;
  updateTabTitle: (tabId: string, title: string) => void;
}

/**
 * タブの開閉・アクティブ化・重複防止を管理するカスタムフック。
 * Requirements: 3.2, 3.3, 3.4, 3.5, 4.1, 4.2
 */
export function useTabManager(): UseTabManagerReturn {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  const activeTab = useMemo(
    () => tabs.find((t) => t.id === activeTabId) ?? null,
    [tabs, activeTabId],
  );

  /** エディタタブを開く。既存ならアクティブ化、なければ新規追加 (Req 3.2, 3.3) */
  const openEditorTab = useCallback((fileId: string, title: string) => {
    const tabId = `editor-${fileId}`;
    setTabs((prev) => {
      if (prev.some((t) => t.id === tabId)) return prev;
      return [...prev, { id: tabId, type: "editor", fileId, title, isDirty: false }];
    });
    setActiveTabId(tabId);
  }, []);

  /** タスクタブを開く。既存ならアクティブ化、なければ新規追加 (Req 4.1, 4.2) */
  const openTaskTab = useCallback(() => {
    const tabId = "task";
    setTabs((prev) => {
      if (prev.some((t) => t.id === tabId)) return prev;
      return [...prev, { id: tabId, type: "task", title: "タスク一覧", isDirty: false }];
    });
    setActiveTabId(tabId);
  }, []);

  /** タブを閉じる。アクティブタブが閉じられた場合は隣接タブをアクティブ化 (Req 3.4) */
  const closeTab = useCallback((tabId: string) => {
    setTabs((prev) => {
      const idx = prev.findIndex((t) => t.id === tabId);
      if (idx === -1) return prev;
      const next = prev.filter((t) => t.id !== tabId);
      // アクティブタブが閉じられた場合、隣接タブをアクティブ化
      setActiveTabId((currentActive) => {
        if (currentActive !== tabId) return currentActive;
        if (next.length === 0) return null;
        // 同じインデックスか、末尾なら1つ前
        const newIdx = Math.min(idx, next.length - 1);
        return next[newIdx].id;
      });
      return next;
    });
  }, []);

  /** タブをアクティブ化 (Req 3.5) */
  const activateTab = useCallback((tabId: string) => {
    setActiveTabId(tabId);
  }, []);

  /** タブの isDirty フラグを更新 */
  const updateTabDirty = useCallback((tabId: string, isDirty: boolean) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === tabId ? { ...t, isDirty } : t)),
    );
  }, []);

  /** タブのタイトルを更新 */
  const updateTabTitle = useCallback((tabId: string, title: string) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === tabId ? { ...t, title } : t)),
    );
  }, []);

  return {
    tabs,
    activeTabId,
    activeTab,
    openEditorTab,
    openTaskTab,
    closeTab,
    activateTab,
    updateTabDirty,
    updateTabTitle,
  };
}
