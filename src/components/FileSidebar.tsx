import { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { MarkdownFile } from "../types";

export interface FileSidebarProps {
  currentFileId: string | null;
  onFileSelect: (fileId: string) => void;
}

function nextUntitledTitle(files: MarkdownFile[]): string {
  const nums = files
    .map((f) => f.title.match(/^Untitled(\d+)$/))
    .filter(Boolean)
    .map((m) => Number(m![1]));
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `Untitled${next}`;
}

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

  const startRename = (file: MarkdownFile) => {
    setRenamingId(file.id);
    setRenameValue(file.title);
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
    <aside className="w-60 bg-[var(--sidebar-bg)] border-r border-[var(--border-color)] flex flex-col h-full" aria-label="File sidebar">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)]">
        <span className="text-sm font-semibold text-[var(--text-primary)] tracking-wide">Files</span>
        <button
          type="button"
          className="px-3 py-1 text-xs font-medium rounded-md bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors shadow-sm"
          onClick={handleCreate}
          aria-label="New file"
        >
          + New
        </button>
      </div>

      {error && (
        <div className="px-4 py-2 text-xs text-red-600 bg-red-50 border-b border-red-100" role="alert">{error}</div>
      )}

      <ul className="flex-1 overflow-y-auto py-1" role="listbox" aria-label="File list">
        {files.map((file) => (
          <li
            key={file.id}
            role="option"
            aria-selected={file.id === currentFileId}
            className={`group flex items-center justify-between mx-2 my-0.5 px-3 py-2 text-sm rounded-lg cursor-pointer transition-colors ${
              file.id === currentFileId
                ? "bg-[var(--accent-light)] text-[var(--accent)] font-medium"
                : "text-[var(--text-secondary)] hover:bg-slate-100"
            }`}
          >
            {renamingId === file.id ? (
              <input
                ref={renameRef}
                type="text"
                className="flex-1 text-sm border border-[var(--border-color)] rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
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
              className="ml-2 text-xs text-[var(--text-muted)] opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(file.id);
              }}
              aria-label={`Delete ${file.title}`}
            >
              ✕
            </button>
          </li>
        ))}
        {files.length === 0 && !error && (
          <li className="px-4 py-6 text-xs text-[var(--text-muted)] text-center">No files yet</li>
        )}
      </ul>
    </aside>
  );
}
