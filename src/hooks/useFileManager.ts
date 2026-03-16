import { useState, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { MarkdownFile } from "../types";

export interface UseFileManagerReturn {
  currentFile: MarkdownFile | null;
  content: string;
  isDirty: boolean;
  error: string | null;
  isSaving: boolean;
  loadFile: (fileId: string) => Promise<void>;
  saveFile: () => Promise<boolean>;
  updateContent: (newContent: string) => void;
  clearError: () => void;
  closeFile: () => void;
}

/**
 * ファイルの保存・読み込み・ダーティフラグ管理を行うカスタムフック。
 * 保存は手動（Ctrl+S）で行う。ウィンドウ閉じ・タブ閉じ時のガードは
 * useWindowCloseGuard / useUnsavedChangesGuard で対応する。
 * Requirements: 3.2, 3.3, 3.6, 3.7
 */
export function useFileManager(): UseFileManagerReturn {
  const [currentFile, setCurrentFile] = useState<MarkdownFile | null>(null);
  const [content, setContent] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const savedContentRef = useRef("");
  const currentFileRef = useRef<MarkdownFile | null>(null);
  const contentRef = useRef("");

  currentFileRef.current = currentFile;
  contentRef.current = content;

  /** 内部保存処理 */
  const doSave = useCallback(async (): Promise<boolean> => {
    const file = currentFileRef.current;
    const c = contentRef.current;
    if (!file || c === savedContentRef.current) return false;
    setIsSaving(true);
    try {
      await invoke("save_file", { fileId: file.id, content: c });
      savedContentRef.current = c;
      setIsDirty(false);
      setError(null);
      return true;
    } catch (e) {
      setError(String(e));
      return false;
    } finally {
      setIsSaving(false);
    }
  }, []);

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

  /** 手動保存 (Req 3.2, 3.6) */
  const saveFile = useCallback(async (): Promise<boolean> => {
    return doSave();
  }, [doSave]);

  /** エディタからのコンテンツ変更 (Req 3.7) */
  const updateContent = useCallback((newContent: string) => {
    setContent(newContent);
    const dirty = newContent !== savedContentRef.current;
    setIsDirty(dirty);
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
