// src/types.ts
// フロントエンド型定義

export interface MarkdownFile {
  id: string;           // UUID
  title: string;        // ファイル名
  content: string;      // マークダウンテキスト
  filePath: string;     // ファイルシステム上のパス
  createdAt: string;    // ISO 8601
  updatedAt: string;    // ISO 8601
}

export interface Task {
  id: string;           // UUID
  title: string;        // タスクタイトル
  description: string;  // タスク説明
  completed: boolean;   // 完了状態
  linkedFiles: string[];// 紐づけファイルID配列
  createdAt: string;    // ISO 8601
  updatedAt: string;    // ISO 8601
}

export interface FileLink {
  taskId: string;       // タスクID
  fileId: string;       // ファイルID
  createdAt: string;    // ISO 8601
}

export interface CreateTaskInput {
  title: string;
  description: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  completed?: boolean;
}

export type TaskFilter = 'all' | 'incomplete' | 'completed';

// 2ペインレイアウト用型定義

export type TabType = 'editor' | 'task';

export interface Tab {
  id: string;           // 一意識別子（editor タブ: `editor-${fileId}`, task タブ: `task`）
  type: TabType;        // タブ種別
  fileId?: string;      // editor タブの場合のファイルID
  title: string;        // 表示タイトル
  isDirty: boolean;     // 未保存変更フラグ
}

export type ActivityView = 'files' | 'tasks';
