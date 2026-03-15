import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TaskPanel } from "./TaskPanel";
import type { Task, MarkdownFile } from "../types";

// Mock @tauri-apps/api/core
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

import { invoke } from "@tauri-apps/api/core";
const mockInvoke = vi.mocked(invoke);

const baseTasks: Task[] = [
  {
    id: "task-1",
    title: "タスク1",
    description: "説明1",
    completed: false,
    linkedFiles: ["file-1"],
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "task-2",
    title: "タスク2",
    description: "",
    completed: true,
    linkedFiles: [],
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
];

const linkedFile: MarkdownFile = {
  id: "file-1",
  title: "ファイル1.md",
  content: "# Hello",
  filePath: "/path/to/file1.md",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

const availableFile: MarkdownFile = {
  id: "file-2",
  title: "ファイル2.md",
  content: "# World",
  filePath: "/path/to/file2.md",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

function setupInvokeMock(overrides?: Partial<Record<string, unknown>>) {
  mockInvoke.mockImplementation(async (cmd: string, _args?: unknown) => {
    if (overrides && cmd in overrides) return overrides[cmd];
    switch (cmd) {
      case "list_tasks":
        return baseTasks;
      case "get_task_file_links":
        return [linkedFile];
      case "list_files":
        return [linkedFile, availableFile];
      case "add_file_link":
        return { taskId: "task-1", fileId: "file-2", createdAt: "2024-01-01T00:00:00Z" };
      case "remove_file_link":
        return undefined;
      default:
        return undefined;
    }
  });
}

describe("TaskPanel - ファイル紐づけUI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("タスクをクリックすると詳細が展開される (Req 5.3)", async () => {
    setupInvokeMock();
    render(<TaskPanel />);

    await waitFor(() => {
      expect(screen.getByText("タスク1")).toBeInTheDocument();
    });

    // Click on task title area to expand detail
    fireEvent.click(screen.getByLabelText('Show details for "タスク1"'));

    await waitFor(() => {
      expect(screen.getByText("紐づけファイル")).toBeInTheDocument();
    });
  });

  it("紐づけファイル一覧が表示される (Req 5.3)", async () => {
    setupInvokeMock();
    render(<TaskPanel />);

    await waitFor(() => {
      expect(screen.getByText("タスク1")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText('Show details for "タスク1"'));

    await waitFor(() => {
      expect(screen.getByLabelText('Open "ファイル1.md"')).toBeInTheDocument();
    });
  });

  it("紐づけファイルクリックでonFileOpenが呼ばれる (Req 5.4)", async () => {
    setupInvokeMock();
    const onFileOpen = vi.fn();
    render(<TaskPanel onFileOpen={onFileOpen} />);

    await waitFor(() => {
      expect(screen.getByText("タスク1")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText('Show details for "タスク1"'));

    await waitFor(() => {
      expect(screen.getByLabelText('Open "ファイル1.md"')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText('Open "ファイル1.md"'));
    expect(onFileOpen).toHaveBeenCalledWith("file-1");
  });

  it("追加ボタンでファイル選択UIが表示される (Req 5.1)", async () => {
    setupInvokeMock();
    render(<TaskPanel />);

    await waitFor(() => {
      expect(screen.getByText("タスク1")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText('Show details for "タスク1"'));

    await waitFor(() => {
      expect(screen.getByLabelText("Add file link")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText("Add file link"));

    await waitFor(() => {
      expect(screen.getByText("ファイルを選択")).toBeInTheDocument();
      // file-1 is already linked, so only file-2 should appear
      expect(screen.getByText("📄 ファイル2.md")).toBeInTheDocument();
    });
  });

  it("ファイル選択でadd_file_linkが呼ばれる (Req 5.1, 5.2)", async () => {
    setupInvokeMock();
    render(<TaskPanel />);

    await waitFor(() => {
      expect(screen.getByText("タスク1")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText('Show details for "タスク1"'));

    await waitFor(() => {
      expect(screen.getByLabelText("Add file link")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText("Add file link"));

    await waitFor(() => {
      expect(screen.getByText("📄 ファイル2.md")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("📄 ファイル2.md"));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("add_file_link", {
        taskId: "task-1",
        fileId: "file-2",
      });
    });
  });

  it("紐づけ解除ボタンでremove_file_linkが呼ばれる (Req 5.5)", async () => {
    setupInvokeMock();
    render(<TaskPanel />);

    await waitFor(() => {
      expect(screen.getByText("タスク1")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText('Show details for "タスク1"'));

    await waitFor(() => {
      expect(screen.getByLabelText('Remove link to "ファイル1.md"')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText('Remove link to "ファイル1.md"'));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("remove_file_link", {
        taskId: "task-1",
        fileId: "file-1",
      });
    });
  });

  it("linkedFilesカウントがタスク一覧に表示される", async () => {
    setupInvokeMock();
    render(<TaskPanel />);

    await waitFor(() => {
      expect(screen.getByText("📎 1")).toBeInTheDocument();
    });
  });
});
