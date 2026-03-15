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

/**
 * タスク管理パネル。
 * タスクの一覧表示・作成・完了トグル・削除・フィルタリングを提供する。
 * タスク詳細表示でファイル紐づけの追加・解除・ファイルオープンを提供する。
 * エラー時はトースト通知で表示。
 * (Req 4.1, 4.3, 4.4, 4.5, 4.6, 4.7, 5.1, 5.2, 5.3, 5.4, 5.5)
 */
export function TaskPanel({ onFileOpen }: TaskPanelProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<TaskFilter>("all");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Task detail state (Req 5.3) ---
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [linkedFiles, setLinkedFiles] = useState<MarkdownFile[]>([]);
  const [availableFiles, setAvailableFiles] = useState<MarkdownFile[]>([]);
  const [showFileSelector, setShowFileSelector] = useState(false);

  // --- Toast ---
  const showToast = useCallback((msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(null), TOAST_DURATION_MS);
  }, []);

  // --- Load tasks ---
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

  useEffect(() => {
    loadTasks(filter);
  }, [filter, loadTasks]);

  // --- Load linked files for selected task (Req 5.3) ---
  const loadLinkedFiles = useCallback(
    async (taskId: string) => {
      try {
        const files = await invoke<MarkdownFile[]>("get_task_file_links", {
          taskId,
        });
        setLinkedFiles(files);
      } catch (e) {
        showToast(String(e));
      }
    },
    [showToast],
  );

  useEffect(() => {
    if (selectedTaskId) {
      loadLinkedFiles(selectedTaskId);
    } else {
      setLinkedFiles([]);
    }
  }, [selectedTaskId, loadLinkedFiles]);

  // --- Load available files for file link selector ---
  const loadAvailableFiles = useCallback(async () => {
    try {
      const files = await invoke<MarkdownFile[]>("list_files");
      setAvailableFiles(files);
    } catch (e) {
      showToast(String(e));
    }
  }, [showToast]);

  // --- Select task ---
  const handleSelectTask = (taskId: string) => {
    setSelectedTaskId((prev) => (prev === taskId ? null : taskId));
    setShowFileSelector(false);
  };

  // --- Create ---
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    try {
      await invoke<Task>("create_task", {
        title: trimmed,
        description: description.trim() || undefined,
      });
      setTitle("");
      setDescription("");
      await loadTasks(filter);
    } catch (err) {
      showToast(String(err));
    }
  };

  // --- Toggle completed ---
  const handleToggle = async (task: Task) => {
    try {
      await invoke<Task>("update_task", {
        taskId: task.id,
        completed: !task.completed,
      });
      await loadTasks(filter);
    } catch (err) {
      showToast(String(err));
    }
  };

  // --- Delete ---
  const handleDelete = async (taskId: string) => {
    try {
      await invoke("delete_task", { taskId });
      if (selectedTaskId === taskId) {
        setSelectedTaskId(null);
      }
      await loadTasks(filter);
    } catch (err) {
      showToast(String(err));
    }
  };

  // --- Add file link (Req 5.1, 5.2) ---
  const handleAddFileLink = async (fileId: string) => {
    if (!selectedTaskId) return;
    try {
      await invoke("add_file_link", {
        taskId: selectedTaskId,
        fileId,
      });
      setShowFileSelector(false);
      await loadLinkedFiles(selectedTaskId);
      await loadTasks(filter);
    } catch (err) {
      showToast(String(err));
    }
  };

  // --- Remove file link (Req 5.5) ---
  const handleRemoveFileLink = async (fileId: string) => {
    if (!selectedTaskId) return;
    try {
      await invoke("remove_file_link", {
        taskId: selectedTaskId,
        fileId,
      });
      await loadLinkedFiles(selectedTaskId);
      await loadTasks(filter);
    } catch (err) {
      showToast(String(err));
    }
  };

  // --- Open file selector ---
  const handleOpenFileSelector = async () => {
    await loadAvailableFiles();
    setShowFileSelector(true);
  };

  const selectedTask = tasks.find((t) => t.id === selectedTaskId) ?? null;

  // Filter out already-linked files from available files
  const linkedFileIds = new Set(linkedFiles.map((f) => f.id));
  const unlinkableFiles = availableFiles.filter(
    (f) => !linkedFileIds.has(f.id),
  );

  return (
    <aside
      className="w-72 border-l bg-white flex flex-col h-full"
      aria-label="Task panel"
    >
      {/* Header */}
      <div className="p-2 border-b">
        <span className="text-sm font-semibold">Tasks</span>
      </div>

      {/* Filter (Req 4.6) */}
      <div
        className="flex gap-1 p-2 border-b"
        role="radiogroup"
        aria-label="Task filter"
      >
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={filter === opt.value}
            className={`flex-1 px-2 py-1 text-xs rounded ${
              filter === opt.value
                ? "bg-blue-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
            onClick={() => setFilter(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Create form (Req 4.3) */}
      <form onSubmit={handleCreate} className="p-2 border-b space-y-1">
        <input
          type="text"
          placeholder="タスクタイトル"
          className="w-full text-sm border rounded px-2 py-1"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-label="Task title"
        />
        <input
          type="text"
          placeholder="説明（任意）"
          className="w-full text-sm border rounded px-2 py-1"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          aria-label="Task description"
        />
        <button
          type="submit"
          className="w-full px-2 py-1 text-xs rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
          disabled={!title.trim()}
        >
          追加
        </button>
      </form>

      {/* Task list (Req 4.5) */}
      <ul
        className="flex-1 overflow-y-auto"
        role="list"
        aria-label="Task list"
      >
        {tasks.map((task) => (
          <li key={task.id} className="border-b">
            <div
              className={`flex items-start gap-2 px-2 py-1.5 text-sm hover:bg-gray-50 cursor-pointer ${
                task.completed ? "opacity-60" : ""
              } ${selectedTaskId === task.id ? "bg-blue-50" : ""}`}
            >
              {/* Toggle (Req 4.4) */}
              <input
                type="checkbox"
                checked={task.completed}
                onChange={() => handleToggle(task)}
                className="mt-0.5 shrink-0"
                aria-label={`Mark "${task.title}" as ${task.completed ? "incomplete" : "completed"}`}
              />
              <div
                className="flex-1 min-w-0"
                onClick={() => handleSelectTask(task.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleSelectTask(task.id);
                  }
                }}
                aria-expanded={selectedTaskId === task.id}
                aria-label={`Show details for "${task.title}"`}
              >
                <span
                  className={`block truncate ${task.completed ? "line-through text-gray-400" : ""}`}
                >
                  {task.title}
                </span>
                {task.description && (
                  <span className="block text-xs text-gray-400 truncate">
                    {task.description}
                  </span>
                )}
                {task.linkedFiles.length > 0 && (
                  <span className="text-xs text-blue-400">
                    📎 {task.linkedFiles.length}
                  </span>
                )}
              </div>
              {/* Delete (Req 4.1) */}
              <button
                type="button"
                className="shrink-0 text-xs text-gray-400 hover:text-red-500"
                onClick={() => handleDelete(task.id)}
                aria-label={`Delete "${task.title}"`}
              >
                🗑
              </button>
            </div>

            {/* Task detail / file links (Req 5.1, 5.3, 5.4, 5.5) */}
            {selectedTaskId === task.id && selectedTask && (
              <div className="px-3 py-2 bg-gray-50 text-xs space-y-2">
                {/* Linked files list (Req 5.3) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-gray-600">
                      紐づけファイル
                    </span>
                    <button
                      type="button"
                      className="px-1.5 py-0.5 rounded bg-blue-500 text-white hover:bg-blue-600"
                      onClick={handleOpenFileSelector}
                      aria-label="Add file link"
                    >
                      + 追加
                    </button>
                  </div>

                  {linkedFiles.length > 0 ? (
                    <ul role="list" aria-label="Linked files">
                      {linkedFiles.map((file) => (
                        <li
                          key={file.id}
                          className="flex items-center justify-between py-0.5"
                        >
                          <button
                            type="button"
                            className="text-blue-600 hover:underline truncate text-left flex-1"
                            onClick={() => onFileOpen?.(file.id)}
                            aria-label={`Open "${file.title}"`}
                          >
                            📄 {file.title}
                          </button>
                          <button
                            type="button"
                            className="ml-1 text-gray-400 hover:text-red-500 shrink-0"
                            onClick={() => handleRemoveFileLink(file.id)}
                            aria-label={`Remove link to "${file.title}"`}
                          >
                            ✕
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-400">紐づけファイルなし</p>
                  )}
                </div>

                {/* File selector dropdown (Req 5.1) */}
                {showFileSelector && (
                  <div className="border rounded bg-white p-1 space-y-0.5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-gray-500">ファイルを選択</span>
                      <button
                        type="button"
                        className="text-gray-400 hover:text-gray-600"
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
                              className="w-full text-left px-1 py-0.5 hover:bg-blue-50 rounded truncate"
                              onClick={() => handleAddFileLink(file.id)}
                            >
                              📄 {file.title}
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-400 px-1">
                        追加可能なファイルがありません
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </li>
        ))}
        {tasks.length === 0 && (
          <li className="p-2 text-xs text-gray-400">タスクがありません</li>
        )}
      </ul>

      {/* Toast notification (Req 4.7) */}
      {toast && (
        <div
          className="absolute bottom-4 right-4 max-w-xs px-3 py-2 text-sm bg-red-600 text-white rounded shadow-lg"
          role="alert"
        >
          {toast}
        </div>
      )}
    </aside>
  );
}
