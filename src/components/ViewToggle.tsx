import { useCallback } from "react";

export interface ViewToggleProps {
  currentMode: "preview" | "raw";
  onToggle: () => void;
}

/**
 * Toggle button for switching between preview (WYSIWYG) and raw markdown modes.
 * Visually indicates the current active mode.
 *
 * Requirements: 2.1, 2.2, 2.3
 */
export function ViewToggle({ currentMode, onToggle }: ViewToggleProps) {
  const handleClick = useCallback(() => {
    onToggle();
  }, [onToggle]);

  return (
    <div
      className="inline-flex rounded-md border border-gray-300 bg-white"
      role="radiogroup"
      aria-label="Editor view mode"
    >
      <button
        type="button"
        role="radio"
        aria-checked={currentMode === "preview"}
        className={`px-3 py-1 text-sm rounded-l-md transition-colors ${
          currentMode === "preview"
            ? "bg-blue-600 text-white"
            : "text-gray-600 hover:bg-gray-100"
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
        className={`px-3 py-1 text-sm rounded-r-md transition-colors ${
          currentMode === "raw"
            ? "bg-blue-600 text-white"
            : "text-gray-600 hover:bg-gray-100"
        }`}
        onClick={currentMode === "raw" ? undefined : handleClick}
        aria-label="Raw markdown mode"
      >
        Raw
      </button>
    </div>
  );
}
