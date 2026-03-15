import { useState, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { MarkdownFile } from "../types";

export interface UseFileManagerReturn {
  /** 現在開いているファイル */
  currentFile: MarkdownFile | null;
  /** エディタ上の現在のコンテンツ */
  content: string;
  /** 未保存の変更があるか */
  isDirty: boolean;
  /** エラーメッセージ（なければ null） */
  error: string | null;
  /** 保存中フラグ */
  isSaving: boolean;
  /** ファイルを読み込む */
  loadFile: (fileId: string) => Promise<void>;
  /** 現在のファイルを保存する */
  saveFile: () => Promise<boolean>;
  /** エディタからのコンテンツ変更を反映する */
  updateContent: (newContent: string) => void;
  /** エラーをクリアする */
  clearError: () => void;
  /** 現在のファイルをクローズする */
  closeFile: () => void;
}

/**
 * ファイルの保存・読み込み・ダーティフラグ管理を行うカスタムフック。
 * Requirements: 3.2, 3.3, 3.6, 3.7
 */
export function useFileManager(): UseFileManagerReturn {
  const [currentFile, setCurrentFile] = useState<MarkdownFile | null>(null);
  const [content, setContent] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // 保存済みコンテンツを保持し、ダーティ判定の基準にする
  const savedContentRef = useRef("");

  /** ファイルを読み込む (Req 3.3) */
  const loadFile = useCallback(async (fileId: string) => {
    try {
      const file = await invoke<MarkdownFile>("load_file", { fileId });
      setCurrentFile(file);
      setContent(file.content);
      savedContentRef.current = file.content;
      setIsDirty(false);
      setError(null);
    } catch (e) {
      setError(String(e));
    }
  }, []);

  /** 現在のファイルを保存する (Req 3.2, 3.6) */
  const saveFile = useCallback(async (): Promise<boolean> => {
    if (!currentFile) return false;
    setIsSaving(true);
    try {
      await invoke("save_file", { fileId: currentFile.id, content });
      savedContentRef.current = content;
      setIsDirty(false);
      setError(null);
      return true;
    } catch (e) {
      // Req 3.6: 保存失敗時のエラーメッセージ表示
      setError(String(e));
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [currentFile, content]);

  /** エディタからのコンテンツ変更 (Req 3.7) */
  const updateContent = useCallback((newContent: string) => {
    setContent(newContent);
    setIsDirty(newContent !== savedContentRef.current);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const closeFile = useCallback(() => {
    setCurrentFile(null);
    setContent("");
    savedContentRef.current = "";
    setIsDirty(false);
    setError(null);
  }, []);

  return {
    currentFile,
    content,
    isDirty,
    error,
    isSaving,
    loadFile,
    saveFile,
    updateContent,
    clearError,
    closeFile,
  };
}
