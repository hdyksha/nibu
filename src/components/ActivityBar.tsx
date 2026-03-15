import type { ReactNode } from "react";
import type { ActivityView } from "../types";

export interface ActivityBarProps {
  activeView: ActivityView | null;
  onActivityChange: (view: ActivityView | null) => void;
}

const activities: { view: ActivityView; label: string; icon: ReactNode }[] = [
  {
    view: "files",
    label: "ファイルブラウザ",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
      </svg>
    ),
  },
  {
    view: "tasks",
    label: "タスク一覧",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
      </svg>
    ),
  },
];

export function ActivityBar({ activeView, onActivityChange }: ActivityBarProps) {
  return (
    <div
      className="flex flex-col items-center w-12 bg-[var(--sidebar-bg)] border-r border-[var(--border-color)] py-2 gap-1"
      role="toolbar"
      aria-label="Activity Bar"
      aria-orientation="vertical"
    >
      {activities.map(({ view, label, icon }) => {
        const isActive = activeView === view;
        return (
          <button
            key={view}
            type="button"
            className={`relative flex items-center justify-center w-10 h-10 rounded-md transition-colors ${
              isActive
                ? "bg-[var(--accent-light)] text-[var(--accent)]"
                : "text-[var(--text-secondary)] hover:bg-slate-100 hover:text-[var(--text-primary)]"
            }`}
            onClick={() => onActivityChange(isActive ? null : view)}
            aria-label={label}
            aria-pressed={isActive}
            title={label}
          >
            {isActive && (
              <span className="absolute left-0 top-1 bottom-1 w-0.5 rounded-r bg-[var(--accent)]" />
            )}
            {icon}
          </button>
        );
      })}
    </div>
  );
}
