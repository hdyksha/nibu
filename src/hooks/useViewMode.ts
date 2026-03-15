import { useState, useCallback, useRef } from "react";

export type ViewMode = "preview" | "raw";

interface SavedPosition {
  /** Character offset in the markdown source text */
  cursorOffset: number;
  /** Scroll ratio (0-1) relative to scrollable height */
  scrollRatio: number;
}

/**
 * Hook managing view mode state with cursor/scroll position preservation.
 *
 * Captures the logical cursor offset and scroll ratio before toggling,
 * then exposes them so the editor can restore after re-mounting.
 *
 * Requirements: 2.1, 2.3, 2.6
 */
export function useViewMode(initialMode: ViewMode = "preview") {
  const [viewMode, setViewMode] = useState<ViewMode>(initialMode);
  const savedPosition = useRef<SavedPosition | null>(null);

  /**
   * Save current cursor/scroll position before mode switch.
   * Call this from the editor component right before the toggle takes effect.
   */
  const savePosition = useCallback((cursorOffset: number, scrollRatio: number) => {
    savedPosition.current = { cursorOffset, scrollRatio };
  }, []);

  /** Consume the saved position (returns null after first read). */
  const consumeSavedPosition = useCallback((): SavedPosition | null => {
    const pos = savedPosition.current;
    savedPosition.current = null;
    return pos;
  }, []);

  const toggle = useCallback(() => {
    setViewMode((prev) => (prev === "preview" ? "raw" : "preview"));
  }, []);

  return {
    viewMode,
    toggle,
    savePosition,
    consumeSavedPosition,
  } as const;
}
