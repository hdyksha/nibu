use tauri::State;

use crate::db::Database;
use crate::error::AppError;
use crate::models::Task;
use crate::repository::task_repo;

/// 新規タスクを作成する (Req 4.1, 4.3)
#[tauri::command]
pub fn create_task(
    title: String,
    description: Option<String>,
    db: State<'_, Database>,
) -> Result<Task, String> {
    if title.trim().is_empty() {
        return Err(AppError::ValidationError("タイトルは必須です".to_string()).to_string());
    }

    let conn = db.conn.lock().map_err(|e| {
        AppError::DatabaseError(format!("ロック取得に失敗: {}", e)).to_string()
    })?;

    let desc = description.unwrap_or_default();
    task_repo::create_task(&conn, &title, &desc).map_err(|e| e.to_string())
}

/// タスクを更新する (Req 4.4, 4.7)
#[tauri::command]
pub fn update_task(
    task_id: String,
    title: Option<String>,
    description: Option<String>,
    completed: Option<bool>,
    db: State<'_, Database>,
) -> Result<Task, String> {
    if let Some(ref t) = title {
        if t.trim().is_empty() {
            return Err(
                AppError::ValidationError("タイトルは空にできません".to_string()).to_string(),
            );
        }
    }

    let conn = db.conn.lock().map_err(|e| {
        AppError::DatabaseError(format!("ロック取得に失敗: {}", e)).to_string()
    })?;

    task_repo::update_task(
        &conn,
        &task_id,
        title.as_deref(),
        description.as_deref(),
        completed,
    )
    .map_err(|e| e.to_string())
}

/// タスクを削除する (Req 4.1)
#[tauri::command]
pub fn delete_task(
    task_id: String,
    db: State<'_, Database>,
) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| {
        AppError::DatabaseError(format!("ロック取得に失敗: {}", e)).to_string()
    })?;

    task_repo::delete_task(&conn, &task_id).map_err(|e| e.to_string())
}

/// タスク一覧を取得する（フィルタリング対応） (Req 4.6)
#[tauri::command]
pub fn list_tasks(
    filter: Option<String>,
    db: State<'_, Database>,
) -> Result<Vec<Task>, String> {
    let conn = db.conn.lock().map_err(|e| {
        AppError::DatabaseError(format!("ロック取得に失敗: {}", e)).to_string()
    })?;

    let filter_str = filter.as_deref().unwrap_or("all");
    task_repo::list_tasks_filtered(&conn, filter_str).map_err(|e| e.to_string())
}
