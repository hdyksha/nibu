# 実装計画: Markdown Editor with TODO

## 概要

Tauri v2（Rust + React/TypeScript）ベースのマークダウンエディタアプリケーションを段階的に実装する。バックエンド（Rust）のデータ層・コマンド層から構築し、フロントエンド（React + ProseMirror）のUI層を積み上げ、最後に統合する。

## タスク

- [ ] 1. プロジェクト構造のセットアップとコア型定義
  - [x] 1.1 Tauri v2プロジェクトの初期化とディレクトリ構造の作成
    - `npm create tauri-app` でプロジェクトを生成（React + TypeScript テンプレート）
    - Tailwind CSS、ProseMirror関連パッケージ、fast-checkをフロントエンドに追加
    - rusqlite、uuid、serde、proptest をRust側のCargo.tomlに追加
    - _Requirements: 6.1_

  - [x] 1.2 フロントエンド型定義の作成
    - `src/types.ts` に `MarkdownFile`, `Task`, `FileLink`, `CreateTaskInput`, `UpdateTaskInput`, `TaskFilter` 型を定義
    - _Requirements: 4.2, 5.1_

  - [x] 1.3 Rustデータモデルとエラー型の作成
    - `src-tauri/src/models.rs` に `Task`, `MarkdownFile`, `FileLink` 構造体を定義（Serialize/Deserialize derive付き）
    - `src-tauri/src/error.rs` に `AppError` enum を定義し、`Display` traitを実装
    - _Requirements: 4.2, 3.6, 4.7_

- [ ] 2. SQLiteデータベース層の実装
  - [ ] 2.1 データベース初期化とマイグレーション
    - `src-tauri/src/db.rs` にSQLite接続管理とテーブル作成（tasks, files, file_links）を実装
    - TauriのアプリデータディレクトリにDBファイルを配置
    - インデックス（idx_file_links_task_id, idx_file_links_file_id, idx_tasks_completed）を作成
    - _Requirements: 6.1_

  - [ ] 2.2 タスクCRUDリポジトリの実装
    - `src-tauri/src/repository/task_repo.rs` にタスクの作成・取得・更新・削除・一覧・フィルタリング関数を実装
    - UUID生成、タイムスタンプ管理を含む
    - _Requirements: 4.1, 4.2, 4.4, 4.6_

  - [ ]* 2.3 タスクCRUDのプロパティベーステスト（proptest）
    - **Property 8: タスクCRUDラウンドトリップ**
    - 任意のタスクデータに対して、作成→読み取り→更新→読み取り→削除→読み取りのラウンドトリップを検証
    - **Validates: Requirements 4.1, 4.2**

  - [ ]* 2.4 タスク完了状態のプロパティベーステスト（proptest）
    - **Property 9: タスク完了状態の更新**
    - 任意のタスクに対して、完了状態のトグルが正しく反転することを検証
    - **Validates: Requirements 4.4**

  - [ ]* 2.5 タスクフィルタリングのプロパティベーステスト（proptest）
    - **Property 10: タスクフィルタリング**
    - 任意のタスクリストに対して、フィルタ適用結果が正しいことを検証
    - **Validates: Requirements 4.6**

  - [ ] 2.6 ファイルメタデータリポジトリの実装
    - `src-tauri/src/repository/file_repo.rs` にファイルメタデータの作成・取得・一覧・削除関数を実装
    - _Requirements: 3.1, 3.4_

  - [ ] 2.7 ファイル紐づけリポジトリの実装
    - `src-tauri/src/repository/link_repo.rs` に紐づけの作成・削除・タスク別一覧取得関数を実装
    - ON DELETE CASCADEによるカスケード削除の動作を確認
    - _Requirements: 5.1, 5.2, 5.5, 5.6_

  - [ ]* 2.8 ファイル紐づけのプロパティベーステスト（proptest）
    - **Property 11: ファイル紐づけラウンドトリップ**
    - 任意のタスクとファイルに対して、紐づけ作成後に一覧に含まれることを検証
    - **Validates: Requirements 5.1, 5.2**

  - [ ]* 2.9 ファイル紐づけ解除のプロパティベーステスト（proptest）
    - **Property 12: ファイル紐づけ解除**
    - 紐づけ解除後に一覧から除外されることを検証
    - **Validates: Requirements 5.5**

  - [ ]* 2.10 カスケード削除のプロパティベーステスト（proptest）
    - **Property 13: カスケード紐づけ削除**
    - ファイル削除後にすべてのタスクの紐づけから除外されることを検証
    - **Validates: Requirements 5.6**

- [ ] 3. チェックポイント - バックエンドデータ層の検証
  - すべてのテストがパスすることを確認し、不明点があればユーザーに質問する。

- [ ] 4. Tauri Commandsの実装
  - [ ] 4.1 ファイル操作コマンドの実装
    - `src-tauri/src/commands/file_commands.rs` に `create_file`, `save_file`, `load_file`, `list_files`, `delete_file` コマンドを実装
    - ファイルシステムへの読み書きとDBメタデータの同期を行う
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.6_

  - [ ]* 4.2 ファイル保存・読み込みのプロパティベーステスト（proptest）
    - **Property 6: ファイル保存・読み込みのラウンドトリップ**
    - 任意のマークダウンテキストに対して、保存→読み込みの結果が元テキストと一致することを検証
    - **Validates: Requirements 3.2, 3.3**

  - [ ] 4.3 タスク操作コマンドの実装
    - `src-tauri/src/commands/task_commands.rs` に `create_task`, `update_task`, `delete_task`, `list_tasks` コマンドを実装
    - リポジトリ層を呼び出し、エラーをフロントエンド向けに変換
    - _Requirements: 4.1, 4.3, 4.4, 4.6, 4.7_

  - [ ] 4.4 ファイル紐づけコマンドの実装
    - `src-tauri/src/commands/task_commands.rs` に `add_file_link`, `remove_file_link`, `get_task_file_links` コマンドを実装
    - _Requirements: 5.1, 5.2, 5.3, 5.5_

  - [ ] 4.5 Tauriアプリケーションへのコマンド登録
    - `src-tauri/src/main.rs` (または `lib.rs`) にすべてのコマンドを `invoke_handler` に登録
    - DB初期化をTauriのsetupフックで実行
    - _Requirements: 6.1_

- [ ] 5. チェックポイント - バックエンド全体の検証
  - すべてのテストがパスすることを確認し、不明点があればユーザーに質問する。

- [ ] 6. ProseMirrorエディタの実装
  - [ ] 6.1 ProseMirrorスキーマとパーサーの作成
    - `src/editor/schema.ts` にマークダウン用ProseMirrorスキーマを定義
    - ノード: heading(h1-h6), paragraph, blockquote, code_block, horizontal_rule, ordered_list, bullet_list, list_item, image, hard_break
    - マーク: bold, italic, strikethrough, code, link
    - `src/editor/parser.ts` にマークダウン→ProseMirrorドキュメント変換パーサーを実装
    - `src/editor/serializer.ts` にProseMirrorドキュメント→マークダウン変換シリアライザーを実装
    - _Requirements: 1.1, 1.2, 1.4_

  - [ ]* 6.2 マークダウンラウンドトリップのプロパティベーステスト（fast-check）
    - **Property 1: マークダウンパース・レンダリングのラウンドトリップ**
    - 任意のマークダウンテキストに対して、パース→シリアライズの結果が意味的に等価であることを検証
    - **Validates: Requirements 1.1, 1.2, 1.4**

  - [ ] 6.3 MarkdownEditorコンポーネントの実装
    - `src/components/MarkdownEditor.tsx` にProseMirrorをラップしたReactコンポーネントを作成
    - プレビューモード（WYSIWYGレンダリング）とrawモード（プレーンテキスト）の切り替えロジックを実装
    - `onChange` コールバックでマークダウンテキストの変更を親コンポーネントに通知
    - _Requirements: 1.1, 1.2, 1.3, 2.4, 2.5_

  - [ ]* 6.4 rawモードテキスト保持のプロパティベーステスト（fast-check）
    - **Property 4: rawモードでのテキスト保持**
    - 任意のマークダウンテキストに対して、rawモード表示がソーステキストと一致することを検証
    - **Validates: Requirements 2.4**

- [ ] 7. ツールバーと表示モード切り替えの実装
  - [ ] 7.1 Toolbarコンポーネントの実装
    - `src/components/Toolbar.tsx` に書式設定ボタン（bold, italic, strikethrough, heading1-3, bulletList, orderedList, codeBlock, link, image）を実装
    - 各ボタンクリック時にProseMirrorのEditorViewに対応するコマンドを実行
    - _Requirements: 1.5, 1.6_

  - [ ]* 7.2 ツールバーアクションのプロパティベーステスト（fast-check）
    - **Property 2: ツールバーアクションによるマークダウン構文挿入**
    - 任意のツールバーアクションとカーソル位置に対して、対応する構文が挿入されることを検証
    - **Validates: Requirements 1.6**

  - [ ] 7.3 ViewToggleコンポーネントの実装
    - `src/components/ViewToggle.tsx` にトグルボタンを実装
    - 現在のモードを視覚的に表示し、クリックでモード切り替え
    - モード切り替え時のカーソル位置・スクロール位置の保持ロジックを実装
    - _Requirements: 2.1, 2.2, 2.3, 2.6_

  - [ ]* 7.4 モードトグルのプロパティベーステスト（fast-check）
    - **Property 3: 表示モードトグルのラウンドトリップ**
    - トグル2回実行後のモードが元のモードと一致することを検証
    - **Validates: Requirements 2.3**

  - [ ]* 7.5 カーソル位置保持のプロパティベーステスト（fast-check）
    - **Property 5: モード切り替え時のカーソル位置保持**
    - 任意のドキュメントとカーソル位置に対して、モード切り替え後にカーソル位置が保持されることを検証
    - **Validates: Requirements 2.6**

- [ ] 8. チェックポイント - エディタコア機能の検証
  - すべてのテストがパスすることを確認し、不明点があればユーザーに質問する。

- [ ] 9. ファイル管理UIの実装
  - [ ] 9.1 FileSidebarコンポーネントの実装
    - `src/components/FileSidebar.tsx` にファイル一覧サイドバーを実装
    - ファイル選択、新規作成ボタン、削除ボタンを含む
    - Tauri Commands（`list_files`, `create_file`, `delete_file`）を `invoke` で呼び出し
    - _Requirements: 3.1, 3.4, 3.5_

  - [ ] 9.2 ファイル保存・読み込みロジックの実装
    - `src/hooks/useFileManager.ts` カスタムフックを作成
    - ファイル保存（`save_file`）、読み込み（`load_file`）のTauri Command呼び出しを実装
    - ダーティフラグ（未保存変更検出）の管理ロジックを実装
    - 保存失敗時のエラーメッセージ表示を実装
    - _Requirements: 3.2, 3.3, 3.6, 3.7_

  - [ ]* 9.3 ダーティフラグのプロパティベーステスト（fast-check）
    - **Property 7: 未保存変更のダーティフラグ検出**
    - 任意のファイルに対して、変更後にダーティフラグがtrue、保存後にfalseになることを検証
    - **Validates: Requirements 3.7**

  - [ ] 9.4 未保存変更の保存確認ダイアログの実装
    - ファイル切り替え・アプリ終了時に未保存変更がある場合、確認ダイアログを表示
    - _Requirements: 3.7_

- [ ] 10. タスク管理UIの実装
  - [ ] 10.1 TaskPanelコンポーネントの実装
    - `src/components/TaskPanel.tsx` にタスク一覧パネルを実装
    - タスク作成フォーム、タスク一覧表示、完了状態トグル、削除ボタンを含む
    - フィルタリング（all / incomplete / completed）UIを実装
    - Tauri Commands（`create_task`, `update_task`, `delete_task`, `list_tasks`）を呼び出し
    - エラー時のトースト通知を実装
    - _Requirements: 4.1, 4.3, 4.4, 4.5, 4.6, 4.7_

  - [ ] 10.2 タスク詳細とファイル紐づけUIの実装
    - タスク詳細表示にファイル紐づけ一覧を表示
    - ファイル紐づけ追加（管理中ファイルから選択）・解除UIを実装
    - 紐づけファイルクリックでEditorにファイルを表示
    - Tauri Commands（`add_file_link`, `remove_file_link`, `get_task_file_links`）を呼び出し
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 11. Appルートコンポーネントの統合
  - [ ] 11.1 レイアウトと状態管理の実装
    - `src/App.tsx` にサイドバー、エディタ、ツールバー、タスクパネルのレイアウトを構築
    - `AppState`（currentFile, viewMode, sidebarVisible, taskPanelVisible）の管理を実装
    - 各コンポーネント間のデータフローを接続
    - Tailwind CSSでレスポンシブなレイアウトを適用
    - _Requirements: 1.1, 2.1, 3.4, 4.5, 6.1, 6.2_

  - [ ]* 11.2 統合テストの作成
    - ファイル作成→編集→保存→再読み込みのフロー検証
    - タスク作成→ファイル紐づけ→紐づけファイルオープンのフロー検証
    - _Requirements: 3.1, 3.2, 3.3, 5.1, 5.4_

- [ ] 12. 最終チェックポイント - 全体の検証
  - すべてのテストがパスすることを確認し、不明点があればユーザーに質問する。

## 備考

- `*` マーク付きのタスクはオプションであり、MVP優先の場合はスキップ可能
- 各タスクは具体的な要件番号を参照しており、トレーサビリティを確保
- チェックポイントで段階的に品質を検証
- プロパティベーステストは普遍的な正当性プロパティを検証し、ユニットテストは具体例・エッジケースを検証
