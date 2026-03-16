import type { Tab } from "../types";

export interface TabBarProps {
  tabs: Tab[];
  activeTabId: string | null;
  onTabClick: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
}

export function TabBar({ tabs, activeTabId, onTabClick, onTabClose }: TabBarProps) {
  if (tabs.length === 0) return null;

  return (
    <div
      className="flex items-end gap-0 bg-[var(--sidebar-bg)] border-b border-[var(--border-color)] overflow-x-auto"
      role="tablist"
      aria-label="Open tabs"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            className={`group relative flex items-center gap-1.5 px-3 py-1.5 text-sm cursor-pointer select-none border-r border-[var(--border-color)] transition-colors ${
              isActive
                ? "bg-white text-[var(--text-primary)]"
                : "text-[var(--text-secondary)] hover:bg-slate-50 hover:text-[var(--text-primary)]"
            }`}
            onClick={() => onTabClick(tab.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onTabClick(tab.id);
              }
            }}
          >
            {isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--accent)]" />
            )}
            <span className="truncate max-w-[140px]">
              {tab.isDirty && (
                <span className="text-[var(--text-muted)] mr-1" aria-label="未保存の変更があります">●</span>
              )}
              {tab.title}
            </span>
            <button
              type="button"
              className="flex items-center justify-center w-4 h-4 rounded-sm opacity-0 group-hover:opacity-100 hover:bg-slate-200 transition-opacity"
              style={isActive ? { opacity: 1 } : undefined}
              onClick={(e) => {
                e.stopPropagation();
                onTabClose(tab.id);
              }}
              aria-label={`${tab.title} を閉じる`}
              title="閉じる"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18" />
                <path d="M6 6l12 12" />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}
