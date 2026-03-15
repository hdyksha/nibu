import { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { MarkdownFile } from "../types";

export interface FileSidebarProps {
  currentFileId: string | null;
  onFileSelect: (fileId: string) => void;
}

/** 既存ファイル名から次の "UntitledN" 連番を算出する */
function nextUntitledTitle(files: MarkdownFile[]): string {
  const nums = files
    .map((f) => f.title.match(/^Untitled(\d+)$/))
    .filter(Boolean)
    .map((m) => Number(m![1]));
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `Untitled${next}`;
}

/**
 * ファイル一覧サイドバー。
 * ファイルの一覧表示・選択・新規作成（自動命名）・インラインリネーム・削除を提供する。
 * (Req 3.1, 3.4, 3.5)
 */
export function FileSidebar({ currentFileId, onFileSelect }: FileSidebarProps) {
  const [files, setFiles] = useState<MarkdownFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameRef = useRef<HTMLInputElement>(null);

  const loadFiles = useCallback(async () => {
    try {
      const result = await invoke<MarkdownFile[]>("list_files");
      setFiles(result);
      setError(null);
    } catch (e) {
      setError(String(e));
    }
  }, []);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  // 新規作成: UntitledN で即座に作成
  const handleCreate = async () => {
    try {
      const title = nextUntitledTitle(files);
      const file = await invoke<MarkdownFile>("create_file", { title });
      await loadFiles();
      onFileSelect(file.id);
    } catch (e) {
      setError(String(e));
    }
  };

  const handleDelete = async (fileId: string) => {
    try {
      await invoke("delete_file", { fileId });
      await loadFiles();
    } catch (e) {
      setError(String(e));
    }
  };

  // ダブルクリックでリネーム開始
  const startRename = (file: MarkdownFile) => {
    setRenamingId(file.id);
    setRenameValue(file.title);
    // 次のレンダーで input にフォーカス
    setTimeout(() => renameRef.current?.select(), 0);
  };

  const commitRename = async () => {
    if (!renamingId) return;
    const trimmed = renameValue.trim();
    if (trimmed) {
      try {
        await invoke("rename_file", { fileId: renamingId, newTitle: trimmed });
        await loadFiles();
      } catch (e) {
        setError(String(e));
      }
    }
    setRenamingId(null);
  };

  return (
    <aside className="w-60 border-r bg-white flex flex-col h-full" aria-label="File sidebar">
      {/* Header */}
      <div className="flex items-center justify-between p-2 border-b">
        <span className="text-sm font-semibold">Files</span>
        <button
          type="button"
          className="px-2 py-0.5 text-xs rounded bg-blue-500 text-white hover:bg-blue-600"
          onClick={handleCreate}
          aria-label="New file"
        >
          + New
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-2 text-xs text-red-600" role="alert">{error}</div>
      )}

      {/* File list */}
      <ul className="flex-1 overflow-y-auto" role="listbox" aria-label="File list">
        {files.map((file) => (
          <li
            key={file.id}
            role="option"
            aria-selected={file.id === currentFileId}
            className={`flex items-center justify-between px-2 py-1.5 text-sm cursor-pointer hover:bg-gray-100 ${
              file.id === currentFileId ? "bg-blue-50 font-medium" : ""
            }`}
          >
            {renamingId === file.id ? (
              <input
                ref={renameRef}
                type="text"
                className="flex-1 text-sm border rounded px-1 py-0.5"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitRename();
                  if (e.key === "Escape") setRenamingId(null);
                }}
                onBlur={commitRename}
                aria-label="Rename file"
              />
            ) : (
              <button
                type="button"
                className="flex-1 text-left truncate"
                onClick={() => onFileSelect(file.id)}
                onDoubleClick={() => startRename(file)}
              >
                {file.title}
              </button>
            )}
            <button
              type="button"
              className="ml-1 text-xs text-gray-400 hover:text-red-500"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(file.id);
              }}
              aria-label={`Delete ${file.title}`}
            >
              🗑
            </button>
          </li>
        ))}
        {files.length === 0 && !error && (
          <li className="p-2 text-xs text-gray-400">No files yet</li>
        )}
      </ul>
    </aside>
  );
}
