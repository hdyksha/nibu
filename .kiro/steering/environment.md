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

### `cwd` パラメータの使用禁止（WSL環境）

WSL環境では `executePwsh` の `cwd` パラメータに相対パスを渡しても、内部でWindows UNCパス（`\\wsl.localhost\...`）に変換されるため、bashが認識できず `No such file or directory` になる。

**ルール: WSL環境では `cwd` パラメータを使用しないこと。**

サブディレクトリでコマンドを実行したい場合は、以下のいずれかで対処する:

- コマンドの引数でパスを指定する（例: `cargo test --manifest-path sub/dir/Cargo.toml`）
- ワークスペースルートから相対パスでファイルを直接参照する（例: `cat sub/dir/file.txt`）
- どうしてもディレクトリ移動が必要な場合は、コマンド内でサブシェルを使う（例: `(cd sub/dir && make)`）

## ファイル読み取りの優先順位

1. `readCode` / `readFile` / `readMultipleFiles` — まずこれらを相対パスで試す
2. 失敗した場合 → `executePwsh` で `cat <相対パス>`（または環境に応じた同等コマンド）を使う
3. ディレクトリ一覧 → `executePwsh` で `ls` や `find`（または環境に応じた同等コマンド）を使う

## WSL環境でのファイル書き込み（重要）

WSL環境では `fsWrite`, `fsAppend`, `strReplace`, `editCode` などのファイル書き込みツールが、内部のUNCパス解決の問題により、ファイルを誤った場所（`wsl.localhost/` ディレクトリ配下）に作成してしまうことがある。

**WSL環境でファイルを作成・編集する場合は、以下のルールに従うこと:**

1. **新規ファイル作成** → `executePwsh` で heredoc を使う:
   ```bash
   mkdir -p path/to/dir && cat > path/to/file.ext << 'EOF'
   ファイル内容
   EOF
   ```

2. **既存ファイルへの追記** → `executePwsh` で `cat >>` やリダイレクトを使う

3. **既存ファイルの部分編集** → `executePwsh` で `sed -i` を使う

4. **`fsWrite`, `fsAppend`, `strReplace`, `editCode` は使用禁止** — これらのツールはWSL環境でパス解決に失敗する可能性がある

この制約はサブエージェント（`invokeSubAgent` で呼ばれるエージェント）にも適用される。
