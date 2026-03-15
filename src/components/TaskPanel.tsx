import { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { Task, TaskFilter } from "../types";

const TOAST_DURATION_MS = 4000;
const FILTER_OPTIONS: { value: TaskFilter; label: string }[] = [
  { value: "all", label: "すべて" },
  { value: "incomplete", label: "未完了" },
  { value: "completed", label: "完了" },
];

/**
 * タスク管理パネル。
 * タスクの一覧表示・作成・完了トグル・削除・フィルタリングを提供する。
 * エラー時はトースト通知で表示。
 * (Req 4.1, 4.3, 4.4, 4.5, 4.6, 4.7)
 */
export function TaskPanel() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<TaskFilter>("all");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Toast ---
  const showToast = useCallback((msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(null), TOAST_DURATION_MS);
  }, []);

  // --- Load tasks ---
  const loadTasks = useCallback(async (f: TaskFilter) => {
    try {
      const result = await invoke<Task[]>("list_tasks", {
        filter: f === "all" ? undefined : f,
      });
      setTasks(result);
    } catch (e) {
      showToast(String(e));
    }
  }, [showToast]);

  useEffect(() => {
    loadTasks(filter);
  }, [filter, loadTasks]);

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
      // フォーム入力は保持 (Req 4.7)
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
      await loadTasks(filter);
    } catch (err) {
      showToast(String(err));
    }
  };

  return (
    <aside className="w-72 border-l bg-white flex flex-col h-full" aria-label="Task panel">
      {/* Header */}
      <div className="p-2 border-b">
        <span className="text-sm font-semibold">Tasks</span>
      </div>

      {/* Filter (Req 4.6) */}
      <div className="flex gap-1 p-2 border-b" role="radiogroup" aria-label="Task filter">
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
      <ul className="flex-1 overflow-y-auto" role="list" aria-label="Task list">
        {tasks.map((task) => (
          <li
            key={task.id}
            className={`flex items-start gap-2 px-2 py-1.5 text-sm border-b hover:bg-gray-50 ${
              task.completed ? "opacity-60" : ""
            }`}
          >
            {/* Toggle (Req 4.4) */}
            <input
              type="checkbox"
              checked={task.completed}
              onChange={() => handleToggle(task)}
              className="mt-0.5 shrink-0"
              aria-label={`Mark "${task.title}" as ${task.completed ? "incomplete" : "completed"}`}
            />
            <div className="flex-1 min-w-0">
              <span className={`block truncate ${task.completed ? "line-through text-gray-400" : ""}`}>
                {task.title}
              </span>
              {task.description && (
                <span className="block text-xs text-gray-400 truncate">{task.description}</span>
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
