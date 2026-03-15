import { useState, useCallback, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { MarkdownFile } from "../types";

const AUTO_SAVE_DELAY_MS = 1000;

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
 * 変更後に自動保存（デバウンス付き）を行う。
 * Requirements: 3.2, 3.3, 3.6, 3.7
 */
export function useFileManager(): UseFileManagerReturn {
  const [currentFile, setCurrentFile] = useState<MarkdownFile | null>(null);
  const [content, setContent] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const savedContentRef = useRef("");
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentFileRef = useRef<MarkdownFile | null>(null);
  const contentRef = useRef("");

  currentFileRef.current = currentFile;
  contentRef.current = content;

  /** 内部保存処理（自動保存とsaveFileで共用） */
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
    // 切り替え前に自動保存タイマーをキャンセルし、即座に保存
    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = null;
    }
    if (currentFileRef.current && contentRef.current !== savedContentRef.current) {
      await doSave();
    }
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
  }, [doSave]);

  /** 手動保存 (Req 3.2, 3.6) */
  const saveFile = useCallback(async (): Promise<boolean> => {
    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = null;
    }
    return doSave();
  }, [doSave]);

  /** エディタからのコンテンツ変更 + デバウンス自動保存 (Req 3.7) */
  const updateContent = useCallback((newContent: string) => {
    setContent(newContent);
    const dirty = newContent !== savedContentRef.current;
    setIsDirty(dirty);

    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
    }
    if (dirty) {
      autoSaveTimer.current = setTimeout(() => {
        doSave();
      }, AUTO_SAVE_DELAY_MS);
    }
  }, [doSave]);

  const clearError = useCallback(() => setError(null), []);

  const closeFile = useCallback(() => {
    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = null;
    }
    setCurrentFile(null);
    setContent("");
    savedContentRef.current = "";
    setIsDirty(false);
    setError(null);
  }, []);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
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
