import { useCallback } from "react";

export interface ViewToggleProps {
  currentMode: "preview" | "raw";
  onToggle: () => void;
}

export function ViewToggle({ currentMode, onToggle }: ViewToggleProps) {
  const handleClick = useCallback(() => {
    onToggle();
  }, [onToggle]);

  return (
    <div
      className="inline-flex rounded-lg border border-[var(--border-color)] bg-white"
      role="radiogroup"
      aria-label="Editor view mode"
    >
      <button
        type="button"
        role="radio"
        aria-checked={currentMode === "preview"}
        className={`px-3 py-1 text-xs font-medium rounded-l-lg transition-colors ${
          currentMode === "preview"
            ? "bg-[var(--accent)] text-white shadow-sm"
            : "text-[var(--text-secondary)] hover:bg-slate-100"
        }`}
        onClick={currentMode === "preview" ? undefined : handleClick}
        aria-label="Preview mode"
      >
        Preview
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={currentMode === "raw"}
        className={`px-3 py-1 text-xs font-medium rounded-r-lg transition-colors ${
          currentMode === "raw"
            ? "bg-[var(--accent)] text-white shadow-sm"
            : "text-[var(--text-secondary)] hover:bg-slate-100"
        }`}
        onClick={currentMode === "raw" ? undefined : handleClick}
        aria-label="Raw markdown mode"
      >
        Raw
      </button>
    </div>
  );
}
