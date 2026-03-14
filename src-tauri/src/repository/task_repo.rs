use rusqlite::{params, Connection};
use uuid::Uuid;

use crate::error::AppError;
use crate::models::Task;

/// タスクを作成し、生成されたTaskを返す (Req 4.1, 4.2)
pub fn create_task(conn: &Connection, title: &str, description: &str) -> Result<Task, AppError> {
    let id = Uuid::new_v4().to_string();
    let now = chrono_now();

    conn.execute(
        "INSERT INTO tasks (id, title, description, completed, created_at, updated_at) VALUES (?1, ?2, ?3, 0, ?4, ?5)",
        params![id, title, description, now, now],
    )
    .map_err(|e| AppError::DatabaseError(format!("タスク作成に失敗: {}", e)))?;

    get_task(conn, &id)
}

/// IDでタスクを取得する (Req 4.2)
pub fn get_task(conn: &Connection, task_id: &str) -> Result<Task, AppError> {
    let mut stmt = conn
        .prepare("SELECT id, title, description, completed, created_at, updated_at FROM tasks WHERE id = ?1")
        .map_err(|e| AppError::DatabaseError(format!("クエリ準備に失敗: {}", e)))?;

    let task = stmt
        .query_row(params![task_id], |row| {
            Ok(Task {
                id: row.get(0)?,
                title: row.get(1)?,
                description: row.get(2)?,
                completed: row.get::<_, i32>(3)? != 0,
                linked_files: Vec::new(),
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
            })
        })
        .map_err(|e| match e {
            rusqlite::Error::QueryReturnedNoRows => AppError::TaskNotFound(task_id.to_string()),
            _ => AppError::DatabaseError(format!("タスク取得に失敗: {}", e)),
        })?;

    // 紐づけファイルIDを取得
    let linked_files = get_linked_file_ids(conn, task_id)?;

    Ok(Task {
        linked_files,
        ..task
    })
}

/// タスクを更新する (Req 4.2, 4.4)
pub fn update_task(
    conn: &Connection,
    task_id: &str,
    title: Option<&str>,
    description: Option<&str>,
    completed: Option<bool>,
) -> Result<Task, AppError> {
    // 存在確認
    let _existing = get_task(conn, task_id)?;

    let now = chrono_now();

    if let Some(t) = title {
        conn.execute(
            "UPDATE tasks SET title = ?1, updated_at = ?2 WHERE id = ?3",
            params![t, now, task_id],
        )
        .map_err(|e| AppError::DatabaseError(format!("タスク更新に失敗: {}", e)))?;
    }

    if let Some(d) = description {
        conn.execute(
            "UPDATE tasks SET description = ?1, updated_at = ?2 WHERE id = ?3",
            params![d, now, task_id],
        )
        .map_err(|e| AppError::DatabaseError(format!("タスク更新に失敗: {}", e)))?;
    }

    if let Some(c) = completed {
        conn.execute(
            "UPDATE tasks SET completed = ?1, updated_at = ?2 WHERE id = ?3",
            params![c as i32, now, task_id],
        )
        .map_err(|e| AppError::DatabaseError(format!("タスク更新に失敗: {}", e)))?;
    }

    get_task(conn, task_id)
}

/// タスクを削除する (Req 4.1)
pub fn delete_task(conn: &Connection, task_id: &str) -> Result<(), AppError> {
    let affected = conn
        .execute("DELETE FROM tasks WHERE id = ?1", params![task_id])
        .map_err(|e| AppError::DatabaseError(format!("タスク削除に失敗: {}", e)))?;

    if affected == 0 {
        return Err(AppError::TaskNotFound(task_id.to_string()));
    }
    Ok(())
}

/// 全タスクを一覧取得する (Req 4.6)
pub fn list_tasks(conn: &Connection) -> Result<Vec<Task>, AppError> {
    let mut stmt = conn
        .prepare("SELECT id, title, description, completed, created_at, updated_at FROM tasks ORDER BY created_at DESC")
        .map_err(|e| AppError::DatabaseError(format!("クエリ準備に失敗: {}", e)))?;

    let tasks = stmt
        .query_map([], |row| {
            Ok(Task {
                id: row.get(0)?,
                title: row.get(1)?,
                description: row.get(2)?,
                completed: row.get::<_, i32>(3)? != 0,
                linked_files: Vec::new(),
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
            })
        })
        .map_err(|e| AppError::DatabaseError(format!("タスク一覧取得に失敗: {}", e)))?;

    let mut result = Vec::new();
    for task in tasks {
        let mut t = task.map_err(|e| AppError::DatabaseError(format!("行読み取りに失敗: {}", e)))?;
        t.linked_files = get_linked_file_ids(conn, &t.id)?;
        result.push(t);
    }
    Ok(result)
}

/// フィルタ付きタスク一覧取得 (Req 4.6)
/// filter: "all" | "incomplete" | "completed"
pub fn list_tasks_filtered(conn: &Connection, filter: &str) -> Result<Vec<Task>, AppError> {
    let sql = match filter {
        "completed" => "SELECT id, title, description, completed, created_at, updated_at FROM tasks WHERE completed = 1 ORDER BY created_at DESC",
        "incomplete" => "SELECT id, title, description, completed, created_at, updated_at FROM tasks WHERE completed = 0 ORDER BY created_at DESC",
        _ => "SELECT id, title, description, completed, created_at, updated_at FROM tasks ORDER BY created_at DESC",
    };

    let mut stmt = conn
        .prepare(sql)
        .map_err(|e| AppError::DatabaseError(format!("クエリ準備に失敗: {}", e)))?;

    let tasks = stmt
        .query_map([], |row| {
            Ok(Task {
                id: row.get(0)?,
                title: row.get(1)?,
                description: row.get(2)?,
                completed: row.get::<_, i32>(3)? != 0,
                linked_files: Vec::new(),
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
            })
        })
        .map_err(|e| AppError::DatabaseError(format!("タスク一覧取得に失敗: {}", e)))?;

    let mut result = Vec::new();
    for task in tasks {
        let mut t = task.map_err(|e| AppError::DatabaseError(format!("行読み取りに失敗: {}", e)))?;
        t.linked_files = get_linked_file_ids(conn, &t.id)?;
        result.push(t);
    }
    Ok(result)
}

/// タスクに紐づくファイルIDを取得するヘルパー
fn get_linked_file_ids(conn: &Connection, task_id: &str) -> Result<Vec<String>, AppError> {
    let mut stmt = conn
        .prepare("SELECT file_id FROM file_links WHERE task_id = ?1")
        .map_err(|e| AppError::DatabaseError(format!("クエリ準備に失敗: {}", e)))?;

    let ids = stmt
        .query_map(params![task_id], |row| row.get(0))
        .map_err(|e| AppError::DatabaseError(format!("紐づけ取得に失敗: {}", e)))?;

    let mut result = Vec::new();
    for id in ids {
        result.push(id.map_err(|e| AppError::DatabaseError(format!("行読み取りに失敗: {}", e)))?);
    }
    Ok(result)
}

/// 現在時刻をISO 8601形式で返すヘルパー
fn chrono_now() -> String {
    // SQLiteのdatetime('now')と互換性のある形式
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs();
    // UTC datetime format: YYYY-MM-DD HH:MM:SS
    let secs_per_day = 86400u64;
    let days_since_epoch = now / secs_per_day;
    let time_of_day = now % secs_per_day;
    let hours = time_of_day / 3600;
    let minutes = (time_of_day % 3600) / 60;
    let seconds = time_of_day % 60;

    // Simple date calculation from days since epoch
    let (year, month, day) = days_to_ymd(days_since_epoch);
    format!("{:04}-{:02}-{:02} {:02}:{:02}:{:02}", year, month, day, hours, minutes, seconds)
}

fn days_to_ymd(days: u64) -> (u64, u64, u64) {
    // Algorithm from http://howardhinnant.github.io/date_algorithms.html
    let z = days + 719468;
    let era = z / 146097;
    let doe = z - era * 146097;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let y = if m <= 2 { y + 1 } else { y };
    (y, m, d)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::Database;
    use tempfile::TempDir;

    fn setup() -> (Database, TempDir) {
        let tmp = TempDir::new().unwrap();
        let db = Database::new(tmp.path().to_path_buf()).unwrap();
        (db, tmp)
    }

    #[test]
    fn test_create_and_get_task() {
        let (db, _tmp) = setup();
        let conn = db.conn.lock().unwrap();

        let task = create_task(&conn, "テストタスク", "説明文").unwrap();
        assert_eq!(task.title, "テストタスク");
        assert_eq!(task.description, "説明文");
        assert!(!task.completed);
        assert!(!task.id.is_empty());

        let fetched = get_task(&conn, &task.id).unwrap();
        assert_eq!(fetched.id, task.id);
        assert_eq!(fetched.title, "テストタスク");
    }

    #[test]
    fn test_update_task_title() {
        let (db, _tmp) = setup();
        let conn = db.conn.lock().unwrap();

        let task = create_task(&conn, "元タイトル", "説明").unwrap();
        let updated = update_task(&conn, &task.id, Some("新タイトル"), None, None).unwrap();
        assert_eq!(updated.title, "新タイトル");
        assert_eq!(updated.description, "説明");
    }

    #[test]
    fn test_update_task_completed() {
        let (db, _tmp) = setup();
        let conn = db.conn.lock().unwrap();

        let task = create_task(&conn, "タスク", "").unwrap();
        assert!(!task.completed);

        let updated = update_task(&conn, &task.id, None, None, Some(true)).unwrap();
        assert!(updated.completed);

        let toggled = update_task(&conn, &task.id, None, None, Some(false)).unwrap();
        assert!(!toggled.completed);
    }

    #[test]
    fn test_delete_task() {
        let (db, _tmp) = setup();
        let conn = db.conn.lock().unwrap();

        let task = create_task(&conn, "削除対象", "").unwrap();
        delete_task(&conn, &task.id).unwrap();

        let result = get_task(&conn, &task.id);
        assert!(result.is_err());
    }

    #[test]
    fn test_delete_nonexistent_task() {
        let (db, _tmp) = setup();
        let conn = db.conn.lock().unwrap();

        let result = delete_task(&conn, "nonexistent-id");
        assert!(result.is_err());
    }

    #[test]
    fn test_list_tasks() {
        let (db, _tmp) = setup();
        let conn = db.conn.lock().unwrap();

        create_task(&conn, "タスク1", "").unwrap();
        create_task(&conn, "タスク2", "").unwrap();
        create_task(&conn, "タスク3", "").unwrap();

        let tasks = list_tasks(&conn).unwrap();
        assert_eq!(tasks.len(), 3);
    }

    #[test]
    fn test_list_tasks_filtered() {
        let (db, _tmp) = setup();
        let conn = db.conn.lock().unwrap();

        let _t1 = create_task(&conn, "未完了1", "").unwrap();
        let t2 = create_task(&conn, "完了1", "").unwrap();
        create_task(&conn, "未完了2", "").unwrap();

        update_task(&conn, &t2.id, None, None, Some(true)).unwrap();

        let all = list_tasks_filtered(&conn, "all").unwrap();
        assert_eq!(all.len(), 3);

        let incomplete = list_tasks_filtered(&conn, "incomplete").unwrap();
        assert_eq!(incomplete.len(), 2);
        assert!(incomplete.iter().all(|t| !t.completed));

        let completed = list_tasks_filtered(&conn, "completed").unwrap();
        assert_eq!(completed.len(), 1);
        assert!(completed.iter().all(|t| t.completed));
    }

    #[test]
    fn test_uuid_uniqueness() {
        let (db, _tmp) = setup();
        let conn = db.conn.lock().unwrap();

        let t1 = create_task(&conn, "A", "").unwrap();
        let t2 = create_task(&conn, "B", "").unwrap();
        assert_ne!(t1.id, t2.id);
    }

    #[test]
    fn test_timestamps_set() {
        let (db, _tmp) = setup();
        let conn = db.conn.lock().unwrap();

        let task = create_task(&conn, "タスク", "").unwrap();
        assert!(!task.created_at.is_empty());
        assert!(!task.updated_at.is_empty());
    }
}
