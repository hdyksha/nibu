---
inclusion: always
---

# 作業環境ルール

## 環境検出

作業開始時に `executePwsh` で `uname -a` と `pwd` を実行し、実行環境（Linux / macOS / WSL 等）とワークスペースルートを把握すること。以降の操作はその結果に基づいて行う。

## ファイル操作の注意事項

- ファイルの読み書きには必ずワークスペースルートからの **相対パス** を使うこと
- Windows UNC パス（`\\wsl.localhost\...`）や絶対パスはツールに渡さないこと
- `readFile`, `readMultipleFiles`, `readCode` などのツールにはすべて相対パスを渡すこと
- ファイルやディレクトリの存在確認が必要な場合は `executePwsh` でシェルコマンド（`ls`, `test -f`, `find` 等）を使うこと（`listDirectory` は環境によってパス解決に失敗する場合がある）

## コマンド実行の注意事項

- `executePwsh` で実行するコマンドは、環境検出の結果に合ったシェルコマンドを使うこと
  - Linux / macOS / WSL → bash コマンド（`ls`, `cat`, `find` 等）
  - Windows ネイティブ → PowerShell コマンド（`Get-ChildItem` 等）
- `executePwsh` の `cwd` パラメータには相対パスを使うこと

## ファイル読み取りの優先順位

1. `readCode` / `readFile` / `readMultipleFiles` — まずこれらを相対パスで試す
2. 失敗した場合 → `executePwsh` で `cat <相対パス>`（または環境に応じた同等コマンド）を使う
3. ディレクトリ一覧 → `executePwsh` で `ls` や `find`（または環境に応じた同等コマンド）を使う
