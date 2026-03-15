import { getCurrentWindow } from "@tauri-apps/api/window";

const appWindow = getCurrentWindow();

export function TitleBar() {
  return (
    <div
      className="flex items-center h-9 bg-[var(--toolbar-bg)] border-b border-[var(--border-color)] select-none"
      onMouseDown={(e) => {
        // ボタン上でなければドラッグ開始
        if ((e.target as HTMLElement).closest("button")) return;
        appWindow.startDragging();
      }}
    >
      <span className="pl-3 text-xs font-semibold text-[var(--text-secondary)] tracking-wide pointer-events-none">
        nibu
      </span>
      <div className="ml-auto flex items-center h-full">
        <button
          type="button"
          className="h-full px-3 text-[var(--text-secondary)] hover:bg-slate-100 transition-colors"
          onClick={() => appWindow.minimize()}
          aria-label="Minimize"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
            <line x1="2" y1="6" x2="10" y2="6" />
          </svg>
        </button>
        <button
          type="button"
          className="h-full px-3 text-[var(--text-secondary)] hover:bg-slate-100 transition-colors"
          onClick={() => appWindow.toggleMaximize()}
          aria-label="Maximize"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="2" y="2" width="8" height="8" rx="1" />
          </svg>
        </button>
        <button
          type="button"
          className="h-full px-3 text-[var(--text-secondary)] hover:bg-red-50 hover:text-red-500 transition-colors"
          onClick={() => appWindow.close()}
          aria-label="Close"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
            <line x1="2" y1="2" x2="10" y2="10" />
            <line x1="10" y1="2" x2="2" y2="10" />
          </svg>
        </button>
      </div>
    </div>
  );
}
