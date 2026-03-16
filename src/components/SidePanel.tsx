import { useCallback, useRef, useState, useEffect } from "react";
import type { ActivityView } from "../types";
import { FileSidebar } from "./FileSidebar";
import { TaskPanel } from "./TaskPanel";

export interface SidePanelProps {
  activeView: ActivityView;
  currentFileId: string | null;
  onFileSelect: (fileId: string) => void;
  onFileOpen: (fileId: string) => void;
  onOpenTaskTab: () => void;
}

const MIN_WIDTH = 160;
const MAX_WIDTH = 600;
const DEFAULT_WIDTH = 240;

export function SidePanel({
  activeView,
  currentFileId,
  onFileSelect,
  onFileOpen,
  onOpenTaskTab: _onOpenTaskTab,
}: SidePanelProps) {
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragging.current = true;
      startX.current = e.clientX;
      startWidth.current = width;
    },
    [width],
  );

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const delta = e.clientX - startX.current;
      setWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth.current + delta)));
    };
    const onMouseUp = () => {
      dragging.current = false;
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  return (
    <div className="relative flex h-full shrink-0" style={{ width }}>
      <div className="flex-1 overflow-hidden">
        {activeView === "files" ? (
          <FileSidebar
            currentFileId={currentFileId}
            onFileSelect={onFileSelect}
          />
        ) : (
          <TaskPanel onFileOpen={onFileOpen} />
        )}
      </div>
      {/* Drag handle */}
      <div
        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[var(--accent)] transition-colors z-10"
        onMouseDown={onMouseDown}
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize side panel"
        aria-valuenow={width}
        aria-valuemin={MIN_WIDTH}
        aria-valuemax={MAX_WIDTH}
      />
    </div>
  );
}
