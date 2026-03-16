import { useCallback, useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import { useFileManager } from "../hooks/useFileManager";
import { useViewMode } from "../hooks/useViewMode";
import { MarkdownEditor } from "./MarkdownEditor";
import type { MarkdownEditorHandle } from "./MarkdownEditor";
import { Toolbar } from "./Toolbar";
import { ViewToggle } from "./ViewToggle";

export interface EditorTabContentProps {
  fileId: string;
  isActive: boolean;
  onDirtyChange: (isDirty: boolean) => void;
  onTitleChange: (title: string) => void;
}

export interface EditorTabContentHandle {
  saveFile: () => Promise<boolean>;
}

/**
 * 各エディタタブの内容を管理するラッパーコンポーネント。
 * 内部で useFileManager を呼び出し、タブごとに独立したファイル管理を実現する。
 * isActive に応じて CSS display: none で非表示にし、状態を保持する。
 * Requirements: 3.2, 6.1
 */
export const EditorTabContent = forwardRef<EditorTabContentHandle, EditorTabContentProps>(
  function EditorTabContent({ fileId, isActive, onDirtyChange, onTitleChange }, ref) {
    const fileManager = useFileManager();
    const { viewMode, toggle: toggleViewMode, savePosition, consumeSavedPosition } = useViewMode();
    const editorRef = useRef<MarkdownEditorHandle>(null);
    const prevDirtyRef = useRef(false);

    // 親から saveFile を呼べるようにする（未保存ガード用）
    useImperativeHandle(ref, () => ({
      saveFile: () => fileManager.saveFile(),
    }), [fileManager.saveFile]);

    // ファイル読み込み（初回マウント時）
    useEffect(() => {
      fileManager.loadFile(fileId);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fileId]);

    // isDirty 変更を親に通知
    useEffect(() => {
      if (prevDirtyRef.current !== fileManager.isDirty) {
        prevDirtyRef.current = fileManager.isDirty;
        onDirtyChange(fileManager.isDirty);
      }
    }, [fileManager.isDirty, onDirtyChange]);

    // ファイルタイトル変更を親に通知
    useEffect(() => {
      if (fileManager.currentFile?.title) {
        onTitleChange(fileManager.currentFile.title);
      }
    }, [fileManager.currentFile?.title, onTitleChange]);

    const handleToggleViewMode = useCallback(() => {
      if (editorRef.current) {
        savePosition(editorRef.current.getCursorOffset(), editorRef.current.getScrollRatio());
      }
      toggleViewMode();
    }, [savePosition, toggleViewMode]);

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
      <div
        className="flex-1 flex flex-col min-h-0"
        style={{ display: isActive ? undefined : "none" }}
        onKeyDown={handleKeyDown}
      >
        {/* ツールバー */}
        <div className="flex items-center px-1 py-1 bg-[var(--toolbar-bg)] border-b border-[var(--border-color)]">
          <Toolbar editorView={viewMode === "preview" ? editorRef.current?.editorView ?? null : null} />
          <div className="ml-auto flex items-center gap-2 px-2">
            {fileManager.isDirty && (
              <span className="text-xs text-amber-500 font-medium" aria-label="Unsaved changes">●</span>
            )}
            {fileManager.isSaving && (
              <span className="text-xs text-[var(--text-muted)]">保存中...</span>
            )}
            <ViewToggle currentMode={viewMode} onToggle={handleToggleViewMode} />
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
          ) : fileManager.error ? (
            <div className="flex flex-col items-center justify-center h-full text-red-500 gap-3" role="alert">
              <span className="text-sm">{fileManager.error}</span>
              <button
                type="button"
                className="text-xs text-red-400 hover:text-red-600"
                onClick={fileManager.clearError}
              >
                閉じる
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-[var(--text-muted)]">
              <span className="text-sm">読み込み中...</span>
            </div>
          )}
        </div>

        {/* エラーバー（ファイル読み込み済みだがエラーがある場合） */}
        {fileManager.currentFile && fileManager.error && (
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
    );
  },
);
