import { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { Task, TaskFilter, MarkdownFile } from "../types";

const TOAST_DURATION_MS = 4000;
const FILTER_OPTIONS: { value: TaskFilter; label: string }[] = [
  { value: "all", label: "すべて" },
  { value: "incomplete", label: "未完了" },
  { value: "completed", label: "完了" },
];

export interface TaskPanelProps {
  onFileOpen?: (fileId: string) => void;
}

export function TaskPanel({ onFileOpen }: TaskPanelProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<TaskFilter>("all");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [linkedFiles, setLinkedFiles] = useState<MarkdownFile[]>([]);
  const [availableFiles, setAvailableFiles] = useState<MarkdownFile[]>([]);
  const [showFileSelector, setShowFileSelector] = useState(false);

  const showToast = useCallback((msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(null), TOAST_DURATION_MS);
  }, []);

  const loadTasks = useCallback(
    async (f: TaskFilter) => {
      try {
        const result = await invoke<Task[]>("list_tasks", {
          filter: f === "all" ? undefined : f,
        });
        setTasks(result);
      } catch (e) {
        showToast(String(e));
      }
    },
    [showToast],
  );

  useEffect(() => { loadTasks(filter); }, [filter, loadTasks]);

  const loadLinkedFiles = useCallback(
    async (taskId: string) => {
      try {
        const files = await invoke<MarkdownFile[]>("get_task_file_links", { taskId });
        setLinkedFiles(files);
      } catch (e) { showToast(String(e)); }
    },
    [showToast],
  );

  useEffect(() => {
    if (selectedTaskId) loadLinkedFiles(selectedTaskId);
    else setLinkedFiles([]);
  }, [selectedTaskId, loadLinkedFiles]);

  const loadAvailableFiles = useCallback(async () => {
    try {
      const files = await invoke<MarkdownFile[]>("list_files");
      setAvailableFiles(files);
    } catch (e) { showToast(String(e)); }
  }, [showToast]);

  const handleSelectTask = (taskId: string) => {
    setSelectedTaskId((prev) => (prev === taskId ? null : taskId));
    setShowFileSelector(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    try {
      await invoke<Task>("create_task", { title: trimmed, description: description.trim() || undefined });
      setTitle("");
      setDescription("");
      await loadTasks(filter);
    } catch (err) { showToast(String(err)); }
  };

  const handleToggle = async (task: Task) => {
    try {
      await invoke<Task>("update_task", { taskId: task.id, completed: !task.completed });
      await loadTasks(filter);
    } catch (err) { showToast(String(err)); }
  };

  const handleDelete = async (taskId: string) => {
    try {
      await invoke("delete_task", { taskId });
      if (selectedTaskId === taskId) setSelectedTaskId(null);
      await loadTasks(filter);
    } catch (err) { showToast(String(err)); }
  };

  const handleAddFileLink = async (fileId: string) => {
    if (!selectedTaskId) return;
    try {
      await invoke("add_file_link", { taskId: selectedTaskId, fileId });
      setShowFileSelector(false);
      await loadLinkedFiles(selectedTaskId);
      await loadTasks(filter);
    } catch (err) { showToast(String(err)); }
  };

  const handleRemoveFileLink = async (fileId: string) => {
    if (!selectedTaskId) return;
    try {
      await invoke("remove_file_link", { taskId: selectedTaskId, fileId });
      await loadLinkedFiles(selectedTaskId);
      await loadTasks(filter);
    } catch (err) { showToast(String(err)); }
  };

  const handleOpenFileSelector = async () => {
    await loadAvailableFiles();
    setShowFileSelector(true);
  };

  const selectedTask = tasks.find((t) => t.id === selectedTaskId) ?? null;
  const linkedFileIds = new Set(linkedFiles.map((f) => f.id));
  const unlinkableFiles = availableFiles.filter((f) => !linkedFileIds.has(f.id));

  return (
    <aside className="w-72 bg-[var(--panel-bg)] border-l border-[var(--border-color)] flex flex-col h-full" aria-label="Task panel">
      <div className="px-4 py-3 border-b border-[var(--border-color)]">
        <span className="text-sm font-semibold text-[var(--text-primary)] tracking-wide">Tasks</span>
      </div>

      {/* Filter */}
      <div className="flex gap-1 px-3 py-2 border-b border-[var(--border-color)]" role="radiogroup" aria-label="Task filter">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={filter === opt.value}
            className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-colors ${
              filter === opt.value
                ? "bg-[var(--accent)] text-white shadow-sm"
                : "text-[var(--text-secondary)] hover:bg-slate-100"
            }`}
            onClick={() => setFilter(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Create form */}
      <form onSubmit={handleCreate} className="px-3 py-3 border-b border-[var(--border-color)] space-y-2">
        <input
          type="text"
          placeholder="タスクタイトル"
          className="w-full text-sm border border-[var(--border-color)] rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent bg-white"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-label="Task title"
        />
        <input
          type="text"
          placeholder="説明（任意）"
          className="w-full text-sm border border-[var(--border-color)] rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent bg-white"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          aria-label="Task description"
        />
        <button
          type="submit"
          className="w-full px-3 py-1.5 text-xs font-medium rounded-md bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors shadow-sm disabled:opacity-40"
          disabled={!title.trim()}
        >
          追加
        </button>
      </form>

      {/* Task list */}
      <ul className="flex-1 overflow-y-auto py-1" role="list" aria-label="Task list">
        {tasks.map((task) => (
          <li key={task.id} className="mx-2 my-0.5">
            <div
              className={`group flex items-start gap-2 px-3 py-2 text-sm rounded-lg transition-colors cursor-pointer ${
                task.completed ? "opacity-50" : ""
              } ${selectedTaskId === task.id ? "bg-[var(--accent-light)]" : "hover:bg-slate-100"}`}
            >
              <input
                type="checkbox"
                checked={task.completed}
                onChange={() => handleToggle(task)}
                className="mt-0.5 shrink-0 accent-[var(--accent)]"
                aria-label={`Mark "${task.title}" as ${task.completed ? "incomplete" : "completed"}`}
              />
              <div
                className="flex-1 min-w-0"
                onClick={() => handleSelectTask(task.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleSelectTask(task.id); }
                }}
                aria-expanded={selectedTaskId === task.id}
                aria-label={`Show details for "${task.title}"`}
              >
                <span className={`block truncate ${task.completed ? "line-through text-[var(--text-muted)]" : "text-[var(--text-primary)]"}`}>
                  {task.title}
                </span>
                {task.description && (
                  <span className="block text-xs text-[var(--text-muted)] truncate mt-0.5">{task.description}</span>
                )}
                {task.linkedFiles.length > 0 && (
                  <span className="text-xs text-[var(--accent)] mt-0.5">📎 {task.linkedFiles.length}</span>
                )}
              </div>
              <button
                type="button"
                className="shrink-0 text-xs text-[var(--text-muted)] opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all"
                onClick={() => handleDelete(task.id)}
                aria-label={`Delete "${task.title}"`}
              >
                ✕
              </button>
            </div>

            {/* Task detail */}
            {selectedTaskId === task.id && selectedTask && (
              <div className="mx-3 my-1 px-3 py-2 bg-white rounded-lg border border-[var(--border-color)] text-xs space-y-2">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-[var(--text-secondary)]">紐づけファイル</span>
                    <button
                      type="button"
                      className="px-2 py-0.5 rounded-md bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors text-xs"
                      onClick={handleOpenFileSelector}
                      aria-label="Add file link"
                    >
                      + 追加
                    </button>
                  </div>
                  {linkedFiles.length > 0 ? (
                    <ul role="list" aria-label="Linked files">
                      {linkedFiles.map((file) => (
                        <li key={file.id} className="flex items-center justify-between py-1">
                          <button
                            type="button"
                            className="text-[var(--accent)] hover:underline truncate text-left flex-1"
                            onClick={() => onFileOpen?.(file.id)}
                            aria-label={`Open "${file.title}"`}
                          >
                            📄 {file.title}
                          </button>
                          <button
                            type="button"
                            className="ml-1 text-[var(--text-muted)] hover:text-red-500 shrink-0"
                            onClick={() => handleRemoveFileLink(file.id)}
                            aria-label={`Remove link to "${file.title}"`}
                          >
                            ✕
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[var(--text-muted)]">紐づけファイルなし</p>
                  )}
                </div>
                {showFileSelector && (
                  <div className="border border-[var(--border-color)] rounded-lg bg-white p-2 space-y-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[var(--text-secondary)] font-medium">ファイルを選択</span>
                      <button
                        type="button"
                        className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                        onClick={() => setShowFileSelector(false)}
                        aria-label="Close file selector"
                      >
                        ✕
                      </button>
                    </div>
                    {unlinkableFiles.length > 0 ? (
                      <ul role="listbox" aria-label="Available files">
                        {unlinkableFiles.map((file) => (
                          <li key={file.id}>
                            <button
                              type="button"
                              role="option"
                              aria-selected={false}
                              className="w-full text-left px-2 py-1 hover:bg-[var(--accent-light)] rounded-md truncate transition-colors"
                              onClick={() => handleAddFileLink(file.id)}
                            >
                              📄 {file.title}
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-[var(--text-muted)] px-1">追加可能なファイルがありません</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </li>
        ))}
        {tasks.length === 0 && (
          <li className="px-4 py-6 text-xs text-[var(--text-muted)] text-center">タスクがありません</li>
        )}
      </ul>

      {/* Toast */}
      {toast && (
        <div className="absolute bottom-4 right-4 max-w-xs px-4 py-2.5 text-sm bg-red-600 text-white rounded-lg shadow-lg" role="alert">
          {toast}
        </div>
      )}
    </aside>
  );
}
