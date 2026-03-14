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
