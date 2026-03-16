# 実装計画: 2ペインレイアウト

## 概要

現在の3ペイン構成を VS Code 風の2ペイン構成（ActivityBar + SidePanel + MainArea）に移行し、タブベースのマルチファイル編集を実現する。既存コンポーネントは変更せず再利用し、新規コンポーネント（ActivityBar, SidePanel, TabBar）と新規フック（useTabManager）を追加して App.tsx のレイアウトを書き換える。

## タスク

- [ ] 1. 型定義と useTabManager フックの実装
  - [x] 1.1 タブ関連の型定義を追加する
    - `Tab`, `TabType`, `ActivityView` 型を `src/types.ts` に追加
    - _Requirements: 3.1, 4.1_
  - [x] 1.2 useTabManager フックを実装する
    - `src/hooks/useTabManager.ts` を作成
    - `openEditorTab`: fileId で重複チェック → 既存ならアクティブ化、なければ新規追加
    - `openTaskTab`: task タブの重複チェック → 既存ならアクティブ化、なければ新規追加
    - `closeTab`: タブ削除 → アクティブタブが閉じられた場合は隣接タブをアクティブ化
    - `activateTab`: activeTabId を更新
    - `updateTabDirty`, `updateTabTitle`: タブ状態の更新
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 4.1, 4.2_
  - [ ]* 1.3 useTabManager のプロパティベーステストを実装する
    - **Property 1: エディタタブの開き冪等性**
    - **Validates: Requirements 3.2, 3.3**
  - [ ]* 1.4 useTabManager のプロパティベーステストを実装する（タスクタブ）
    - **Property 2: タスクタブのシングルトン性**
    - **Validates: Requirements 4.2**
  - [ ]* 1.5 useTabManager のプロパティベーステストを実装する（タブ閉じ）
    - **Property 3: タブ閉じによる除去**
    - **Validates: Requirements 3.4**
  - [ ]* 1.6 useTabManager のプロパティベーステストを実装する（アクティブ化）
    - **Property 4: タブアクティブ化**
    - **Validates: Requirements 3.5**

- [x] 2. チェックポイント - useTabManager の動作確認
  - すべてのテストが通ることを確認し、不明点があればユーザーに質問する。

- [ ] 3. ActivityBar コンポーネントの実装
  - [x] 3.1 ActivityBar コンポーネントを作成する
    - `src/components/ActivityBar.tsx` を作成
    - ファイルブラウザとタスク一覧に対応するアイコンボタンを縦に配置
    - アクティブなアイコンの視覚的ハイライト（背景色変更 + 左ボーダー）
    - アイコンクリックで `onActivityChange` を呼び出し、再クリックで `null` を渡してトグル
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  - [ ]* 3.2 ActivityBar のユニットテストを実装する
    - アイコンクリックでビュー切り替え、再クリックでトグルを検証
    - _Requirements: 1.3, 1.4_

- [ ] 4. SidePanel コンポーネントの実装
  - [x] 4.1 SidePanel コンポーネントを作成する
    - `src/components/SidePanel.tsx` を作成
    - `activeView` に応じて既存の FileSidebar または TaskPanel を切り替え表示
    - CSS `resize: horizontal` または drag ハンドルでリサイズ可能にする
    - _Requirements: 2.1, 2.2, 2.4, 2.5_
  - [ ]* 4.2 SidePanel のユニットテストを実装する
    - activeView に応じた FileSidebar/TaskPanel の切り替え表示を検証
    - _Requirements: 2.1_

- [ ] 5. TabBar コンポーネントの実装
  - [x] 5.1 TabBar コンポーネントを作成する
    - `src/components/TabBar.tsx` を作成
    - タブ一覧の表示、アクティブタブの視覚的区別（下ボーダー + 背景色）
    - 未保存インジケーター（● マーク）を isDirty なタブに表示
    - タブクリックで `onTabClick`、閉じるボタンで `onTabClose` を呼び出し
    - _Requirements: 3.1, 3.5, 3.6, 3.7_
  - [ ]* 5.2 TabBar のプロパティベーステストを実装する
    - **Property 5: タブ表示の完全性**
    - **Validates: Requirements 3.1, 3.7**
  - [ ]* 5.3 TabBar のユニットテストを実装する
    - アクティブタブの視覚的区別、空タブ時の表示を検証
    - _Requirements: 3.6_

- [x] 6. チェックポイント - 個別コンポーネントの動作確認
  - すべてのテストが通ることを確認し、不明点があればユーザーに質問する。

- [ ] 7. EditorTabContent コンポーネントと App.tsx の統合
  - [x] 7.1 EditorTabContent コンポーネントを作成する
    - `src/components/EditorTabContent.tsx` を作成
    - 内部で `useFileManager` を呼び出し、タブごとに独立したファイル管理を実現
    - `isActive` に応じて CSS `display: none` で非表示にし、状態を保持
    - `onDirtyChange`, `onTitleChange` コールバックで親にタブ状態を通知
    - 既存の Toolbar, ViewToggle, MarkdownEditor をそのまま使用
    - _Requirements: 3.2, 6.1_
  - [ ] 7.2 App.tsx を2ペインレイアウトに書き換える
    - 3ペイン構成を廃止し、TitleBar + ActivityBar + SidePanel + MainArea の構成に変更
    - `useTabManager` フックを導入
    - ActivityBar の状態管理（activeActivity）を追加
    - SidePanel のファイル選択 → `openEditorTab` の接続
    - SidePanel のタスクタブ表示要求 → `openTaskTab` の接続
    - TabBar とタブ内容の表示切り替え
    - タブなし時の空状態プレースホルダー表示
    - SidePanel 非表示時に MainArea が横幅全体を使用するレイアウト
    - _Requirements: 6.1, 6.2, 6.3, 6.5, 2.3, 3.2, 4.1_
  - [ ] 7.3 タブ閉じ時の未保存変更ガードを実装する
    - 既存の `useUnsavedChangesGuard` フックと `ConfirmDialog` を再利用
    - isDirty なタブの閉じ操作時に保存確認ダイアログを表示
    - 「保存する」→ ファイル保存後にタブを閉じる
    - 「保存しない」→ 変更を破棄してタブを閉じる
    - 「キャンセル」→ タブを閉じずに編集状態を維持
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  - [ ] 7.4 タスクタブ内のファイルリンク連携を実装する
    - Task_Tab 内でファイルリンクがクリックされた場合、対応する Editor_Tab を開くかアクティブにする
    - _Requirements: 4.3, 4.4_
  - [ ] 7.5 既存キーボードショートカット（Ctrl+S）の維持を確認する
    - アクティブなエディタタブに対して Ctrl+S で保存が動作することを確認
    - _Requirements: 6.4_
  - [ ]* 7.6 未保存タブ閉じガードのプロパティベーステストを実装する
    - **Property 6: 未保存タブ閉じガード**
    - **Validates: Requirements 5.1**
  - [ ]* 7.7 App 統合のユニットテストを実装する
    - Ctrl+S ショートカット、タブなし時のプレースホルダー表示を検証
    - _Requirements: 6.4, 6.5_

- [ ] 8. 最終チェックポイント - 全体の動作確認
  - すべてのテストが通ることを確認し、不明点があればユーザーに質問する。

## 備考

- `*` マーク付きのタスクはオプションであり、MVP を早く進めるためにスキップ可能
- 各タスクは特定の要件を参照しており、トレーサビリティを確保
- チェックポイントでインクリメンタルな検証を実施
- プロパティテストは普遍的な正当性プロパティを検証し、ユニットテストは具体的な例とエッジケースを検証
- 既存コンポーネント（FileSidebar, TaskPanel, MarkdownEditor, Toolbar, ViewToggle, TitleBar, ConfirmDialog）は変更せず再利用する
