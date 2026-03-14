use rusqlite::{params, Connection};

use crate::error::AppError;
use crate::models::{FileLink, MarkdownFile};

/// タスクとファイルの紐づけを作成する (Req 5.1, 5.2)
pub fn create_link(conn: &Connection, task_id: &str, file_id: &str) -> Result<FileLink, AppError> {
    let now = chrono_now();

    conn.execute(
        "INSERT INTO file_links (task_id, file_id, created_at) VALUES (?1, ?2, ?3)",
        params![task_id, file_id, now],
    )
    .map_err(|e| AppError::DatabaseError(format!("紐づけ作成に失敗: {}", e)))?;

    Ok(FileLink {
        task_id: task_id.to_string(),
        file_id: file_id.to_string(),
        created_at: now,
    })
}

/// タスクとファイルの紐づけを削除する (Req 5.5)
pub fn delete_link(conn: &Connection, task_id: &str, file_id: &str) -> Result<(), AppError> {
    let affected = conn
        .execute(
            "DELETE FROM file_links WHERE task_id = ?1 AND file_id = ?2",
            params![task_id, file_id],
        )
        .map_err(|e| AppError::DatabaseError(format!("紐づけ削除に失敗: {}", e)))?;

    if affected == 0 {
        return Err(AppError::ValidationError(format!(
            "紐づけが見つかりません: task_id={}, file_id={}",
            task_id, file_id
        )));
    }
    Ok(())
}

/// タスクに紐づくファイル一覧を取得する (Req 5.1, 5.2)
pub fn get_files_for_task(conn: &Connection, task_id: &str) -> Result<Vec<MarkdownFile>, AppError> {
    let mut stmt = conn
        .prepare(
            "SELECT f.id, f.title, f.file_path, f.created_at, f.updated_at \
             FROM files f \
             INNER JOIN file_links fl ON f.id = fl.file_id \
             WHERE fl.task_id = ?1 \
             ORDER BY fl.created_at ASC",
        )
        .map_err(|e| AppError::DatabaseError(format!("クエリ準備に失敗: {}", e)))?;

    let rows = stmt
        .query_map(params![task_id], |row| {
            Ok(MarkdownFile {
                id: row.get(0)?,
                title: row.get(1)?,
                content: String::new(),
                file_path: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
            })
        })
        .map_err(|e| AppError::DatabaseError(format!("紐づけファイル取得に失敗: {}", e)))?;

    let mut result = Vec::new();
    for file in rows {
        result.push(
            file.map_err(|e| AppError::DatabaseError(format!("行読み取りに失敗: {}", e)))?,
        );
    }
    Ok(result)
}

/// 現在時刻をISO 8601形式で返すヘルパー
fn chrono_now() -> String {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs();
    let secs_per_day = 86400u64;
    let days_since_epoch = now / secs_per_day;
    let time_of_day = now % secs_per_day;
    let hours = time_of_day / 3600;
    let minutes = (time_of_day % 3600) / 60;
    let seconds = time_of_day % 60;

    let (year, month, day) = days_to_ymd(days_since_epoch);
    format!(
        "{:04}-{:02}-{:02} {:02}:{:02}:{:02}",
        year, month, day, hours, minutes, seconds
    )
}

fn days_to_ymd(days: u64) -> (u64, u64, u64) {
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
    use crate::repository::{file_repo, task_repo};
    use tempfile::TempDir;

    fn setup() -> (Database, TempDir) {
        let tmp = TempDir::new().unwrap();
        let db = Database::new(tmp.path().to_path_buf()).unwrap();
        (db, tmp)
    }

    #[test]
    fn test_create_and_get_link() {
        let (db, _tmp) = setup();
        let conn = db.conn.lock().unwrap();

        let task = task_repo::create_task(&conn, "タスク", "説明").unwrap();
        let file = file_repo::create_file(&conn, "ファイル", "/path/test.md").unwrap();

        let link = create_link(&conn, &task.id, &file.id).unwrap();
        assert_eq!(link.task_id, task.id);
        assert_eq!(link.file_id, file.id);
        assert!(!link.created_at.is_empty());

        let files = get_files_for_task(&conn, &task.id).unwrap();
        assert_eq!(files.len(), 1);
        assert_eq!(files[0].id, file.id);
        assert_eq!(files[0].title, "ファイル");
    }

    #[test]
    fn test_multiple_links_for_task() {
        let (db, _tmp) = setup();
        let conn = db.conn.lock().unwrap();

        let task = task_repo::create_task(&conn, "タスク", "").unwrap();
        let f1 = file_repo::create_file(&conn, "A", "/path/a.md").unwrap();
        let f2 = file_repo::create_file(&conn, "B", "/path/b.md").unwrap();
        let f3 = file_repo::create_file(&conn, "C", "/path/c.md").unwrap();

        create_link(&conn, &task.id, &f1.id).unwrap();
        create_link(&conn, &task.id, &f2.id).unwrap();
        create_link(&conn, &task.id, &f3.id).unwrap();

        let files = get_files_for_task(&conn, &task.id).unwrap();
        assert_eq!(files.len(), 3);
    }

    #[test]
    fn test_delete_link() {
        let (db, _tmp) = setup();
        let conn = db.conn.lock().unwrap();

        let task = task_repo::create_task(&conn, "タスク", "").unwrap();
        let file = file_repo::create_file(&conn, "ファイル", "/path/del.md").unwrap();

        create_link(&conn, &task.id, &file.id).unwrap();
        delete_link(&conn, &task.id, &file.id).unwrap();

        let files = get_files_for_task(&conn, &task.id).unwrap();
        assert!(files.is_empty());
    }

    #[test]
    fn test_delete_nonexistent_link() {
        let (db, _tmp) = setup();
        let conn = db.conn.lock().unwrap();

        let result = delete_link(&conn, "no-task", "no-file");
        assert!(result.is_err());
    }

    #[test]
    fn test_duplicate_link_rejected() {
        let (db, _tmp) = setup();
        let conn = db.conn.lock().unwrap();

        let task = task_repo::create_task(&conn, "タスク", "").unwrap();
        let file = file_repo::create_file(&conn, "ファイル", "/path/dup.md").unwrap();

        create_link(&conn, &task.id, &file.id).unwrap();
        let result = create_link(&conn, &task.id, &file.id);
        assert!(result.is_err());
    }

    #[test]
    fn test_get_files_for_task_empty() {
        let (db, _tmp) = setup();
        let conn = db.conn.lock().unwrap();

        let task = task_repo::create_task(&conn, "タスク", "").unwrap();
        let files = get_files_for_task(&conn, &task.id).unwrap();
        assert!(files.is_empty());
    }

    #[test]
    fn test_cascade_delete_on_file_removal() {
        let (db, _tmp) = setup();
        let conn = db.conn.lock().unwrap();

        let task = task_repo::create_task(&conn, "タスク", "").unwrap();
        let file = file_repo::create_file(&conn, "ファイル", "/path/cascade.md").unwrap();

        create_link(&conn, &task.id, &file.id).unwrap();

        // ファイル削除 → ON DELETE CASCADEで紐づけも削除される (Req 5.6)
        file_repo::delete_file(&conn, &file.id).unwrap();

        let files = get_files_for_task(&conn, &task.id).unwrap();
        assert!(files.is_empty());
    }

    #[test]
    fn test_cascade_delete_on_task_removal() {
        let (db, _tmp) = setup();
        let conn = db.conn.lock().unwrap();

        let task = task_repo::create_task(&conn, "タスク", "").unwrap();
        let file = file_repo::create_file(&conn, "ファイル", "/path/cascade2.md").unwrap();

        create_link(&conn, &task.id, &file.id).unwrap();

        // タスク削除 → ON DELETE CASCADEで紐づけも削除される
        task_repo::delete_task(&conn, &task.id).unwrap();

        // file_linksテーブルに残っていないことを直接確認
        let count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM file_links WHERE task_id = ?1",
                params![task.id],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(count, 0);
    }

    #[test]
    fn test_cascade_delete_file_multiple_tasks() {
        let (db, _tmp) = setup();
        let conn = db.conn.lock().unwrap();

        let t1 = task_repo::create_task(&conn, "タスク1", "").unwrap();
        let t2 = task_repo::create_task(&conn, "タスク2", "").unwrap();
        let file = file_repo::create_file(&conn, "共有ファイル", "/path/shared.md").unwrap();

        create_link(&conn, &t1.id, &file.id).unwrap();
        create_link(&conn, &t2.id, &file.id).unwrap();

        // ファイル削除 → 両タスクの紐づけが消える (Req 5.6)
        file_repo::delete_file(&conn, &file.id).unwrap();

        let files1 = get_files_for_task(&conn, &t1.id).unwrap();
        let files2 = get_files_for_task(&conn, &t2.id).unwrap();
        assert!(files1.is_empty());
        assert!(files2.is_empty());
    }

    #[test]
    fn test_fk_violation_invalid_task() {
        let (db, _tmp) = setup();
        let conn = db.conn.lock().unwrap();

        let file = file_repo::create_file(&conn, "ファイル", "/path/fk.md").unwrap();
        let result = create_link(&conn, "nonexistent-task", &file.id);
        assert!(result.is_err());
    }

    #[test]
    fn test_fk_violation_invalid_file() {
        let (db, _tmp) = setup();
        let conn = db.conn.lock().unwrap();

        let task = task_repo::create_task(&conn, "タスク", "").unwrap();
        let result = create_link(&conn, &task.id, "nonexistent-file");
        assert!(result.is_err());
    }
}
