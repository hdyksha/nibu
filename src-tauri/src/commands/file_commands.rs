use tauri::Manager;
use std::fs;
use std::path::PathBuf;
use tauri::State;

use crate::db::Database;
use crate::error::AppError;
use crate::models::MarkdownFile;
use crate::repository::file_repo;

/// ファイル保存ディレクトリのパスを取得するヘルパー
fn files_dir(app_handle: &tauri::AppHandle) -> Result<PathBuf, AppError> {
    let base = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| AppError::FileWriteError(format!("アプリデータディレクトリ取得に失敗: {}", e)))?;
    let dir = base.join("files");
    fs::create_dir_all(&dir)
        .map_err(|e| AppError::FileWriteError(format!("ファイルディレクトリ作成に失敗: {}", e)))?;
    Ok(dir)
}

/// 新規マークダウンファイルを作成する (Req 3.1)
#[tauri::command]
pub fn create_file(
    title: String,
    app_handle: tauri::AppHandle,
    db: State<'_, Database>,
) -> Result<MarkdownFile, String> {
    if title.trim().is_empty() {
        return Err(AppError::ValidationError("タイトルは必須です".to_string()).to_string());
    }

    let dir = files_dir(&app_handle).map_err(|e| e.to_string())?;

    let conn = db.conn.lock().map_err(|e| {
        AppError::DatabaseError(format!("ロック取得に失敗: {}", e)).to_string()
    })?;

    // ファイル名にUUIDを含めて一意性を保証
    let sanitized = sanitize_filename(&title);
    let temp_id = uuid::Uuid::new_v4().to_string();
    let filename = format!("{}_{}.md", sanitized, &temp_id[..8]);
    let file_path = dir.join(&filename);

    // 空のファイルを作成
    fs::write(&file_path, "")
        .map_err(|e| AppError::FileWriteError(format!("ファイル作成に失敗: {}", e)).to_string())?;

    let path_str = file_path.to_string_lossy().to_string();
    let file = file_repo::create_file(&conn, &title, &path_str)
        .map_err(|e| e.to_string())?;

    Ok(file)
}

/// マークダウンファイルを保存する (Req 3.2)
#[tauri::command]
pub fn save_file(
    file_id: String,
    content: String,
    db: State<'_, Database>,
) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| {
        AppError::DatabaseError(format!("ロック取得に失敗: {}", e)).to_string()
    })?;

    let file = file_repo::get_file(&conn, &file_id)
        .map_err(|e| e.to_string())?;

    fs::write(&file.file_path, &content)
        .map_err(|e| AppError::FileWriteError(format!("{}: {}", file.file_path, e)).to_string())?;

    // updated_at を更新
    conn.execute(
        "UPDATE files SET updated_at = datetime('now') WHERE id = ?1",
        rusqlite::params![file_id],
    )
    .map_err(|e| AppError::DatabaseError(format!("メタデータ更新に失敗: {}", e)).to_string())?;

    Ok(())
}

/// マークダウンファイルを読み込む (Req 3.3)
#[tauri::command]
pub fn load_file(
    file_id: String,
    db: State<'_, Database>,
) -> Result<MarkdownFile, String> {
    let conn = db.conn.lock().map_err(|e| {
        AppError::DatabaseError(format!("ロック取得に失敗: {}", e)).to_string()
    })?;

    let mut file = file_repo::get_file(&conn, &file_id)
        .map_err(|e| e.to_string())?;

    let content = fs::read_to_string(&file.file_path)
        .map_err(|e| AppError::FileReadError(format!("{}: {}", file.file_path, e)).to_string())?;

    file.content = content;
    Ok(file)
}

/// 管理中のファイル一覧を取得する (Req 3.4)
#[tauri::command]
pub fn list_files(
    db: State<'_, Database>,
) -> Result<Vec<MarkdownFile>, String> {
    let conn = db.conn.lock().map_err(|e| {
        AppError::DatabaseError(format!("ロック取得に失敗: {}", e)).to_string()
    })?;

    file_repo::list_files(&conn).map_err(|e| e.to_string())
}

/// ファイルを削除する（ファイルシステム + DBメタデータ） (Req 3.4)
#[tauri::command]
pub fn delete_file(
    file_id: String,
    db: State<'_, Database>,
) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| {
        AppError::DatabaseError(format!("ロック取得に失敗: {}", e)).to_string()
    })?;

    // まずDBからファイル情報を取得
    let file = file_repo::get_file(&conn, &file_id)
        .map_err(|e| e.to_string())?;

    // ファイルシステムから削除（存在しない場合は無視）
    if std::path::Path::new(&file.file_path).exists() {
        fs::remove_file(&file.file_path)
            .map_err(|e| AppError::FileWriteError(format!("ファイル削除に失敗: {}", e)).to_string())?;
    }

    // DBメタデータを削除（CASCADE で file_links も削除される）
    file_repo::delete_file(&conn, &file_id)
        .map_err(|e| e.to_string())?;

    Ok(())
}

/// ファイル名をサニタイズするヘルパー
fn sanitize_filename(name: &str) -> String {
    name.chars()
        .map(|c| {
            if c.is_alphanumeric() || c == '-' || c == '_' {
                c
            } else {
                '_'
            }
        })
        .collect::<String>()
        .trim_matches('_')
        .to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sanitize_filename() {
        assert_eq!(sanitize_filename("hello world"), "hello_world");
        assert_eq!(sanitize_filename("テスト"), "テスト");
        assert_eq!(sanitize_filename("my-file_name"), "my-file_name");
        assert_eq!(sanitize_filename("a/b\\c:d"), "a_b_c_d");
    }
}

/// ファイルタイトルをリネームする
#[tauri::command]
pub fn rename_file(
    file_id: String,
    new_title: String,
    db: State<'_, Database>,
) -> Result<MarkdownFile, String> {
    if new_title.trim().is_empty() {
        return Err(AppError::ValidationError("タイトルは必須です".to_string()).to_string());
    }

    let conn = db.conn.lock().map_err(|e| {
        AppError::DatabaseError(format!("ロック取得に失敗: {}", e)).to_string()
    })?;

    file_repo::rename_file(&conn, &file_id, new_title.trim())
        .map_err(|e| e.to_string())
}
