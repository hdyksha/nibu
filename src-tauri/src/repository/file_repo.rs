use rusqlite::{params, Connection};
use uuid::Uuid;

use crate::error::AppError;
use crate::models::MarkdownFile;

/// ファイルメタデータを作成し、生成されたMarkdownFileを返す (Req 3.1)
pub fn create_file(conn: &Connection, title: &str, file_path: &str) -> Result<MarkdownFile, AppError> {
    let id = Uuid::new_v4().to_string();
    let now = chrono_now();

    conn.execute(
        "INSERT INTO files (id, title, file_path, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![id, title, file_path, now, now],
    )
    .map_err(|e| AppError::DatabaseError(format!("ファイルメタデータ作成に失敗: {}", e)))?;

    get_file(conn, &id)
}

/// IDでファイルメタデータを取得する (Req 3.1)
pub fn get_file(conn: &Connection, file_id: &str) -> Result<MarkdownFile, AppError> {
    conn.query_row(
        "SELECT id, title, file_path, created_at, updated_at FROM files WHERE id = ?1",
        params![file_id],
        |row| {
            Ok(MarkdownFile {
                id: row.get(0)?,
                title: row.get(1)?,
                content: String::new(),
                file_path: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
            })
        },
    )
    .map_err(|e| match e {
        rusqlite::Error::QueryReturnedNoRows => AppError::FileNotFound(file_id.to_string()),
        _ => AppError::DatabaseError(format!("ファイル取得に失敗: {}", e)),
    })
}

/// 全ファイルメタデータを一覧取得する (Req 3.4)
pub fn list_files(conn: &Connection) -> Result<Vec<MarkdownFile>, AppError> {
    let mut stmt = conn
        .prepare("SELECT id, title, file_path, created_at, updated_at FROM files ORDER BY created_at DESC")
        .map_err(|e| AppError::DatabaseError(format!("クエリ準備に失敗: {}", e)))?;

    let rows = stmt
        .query_map([], |row| {
            Ok(MarkdownFile {
                id: row.get(0)?,
                title: row.get(1)?,
                content: String::new(),
                file_path: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
            })
        })
        .map_err(|e| AppError::DatabaseError(format!("ファイル一覧取得に失敗: {}", e)))?;

    let mut result = Vec::new();
    for file in rows {
        result.push(file.map_err(|e| AppError::DatabaseError(format!("行読み取りに失敗: {}", e)))?);
    }
    Ok(result)
}

/// ファイルメタデータを削除する (Req 3.4)
pub fn delete_file(conn: &Connection, file_id: &str) -> Result<(), AppError> {
    let affected = conn
        .execute("DELETE FROM files WHERE id = ?1", params![file_id])
        .map_err(|e| AppError::DatabaseError(format!("ファイル削除に失敗: {}", e)))?;

    if affected == 0 {
        return Err(AppError::FileNotFound(file_id.to_string()));
    }
    Ok(())
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
    format!("{:04}-{:02}-{:02} {:02}:{:02}:{:02}", year, month, day, hours, minutes, seconds)
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
    use tempfile::TempDir;

    fn setup() -> (Database, TempDir) {
        let tmp = TempDir::new().unwrap();
        let db = Database::new(tmp.path().to_path_buf()).unwrap();
        (db, tmp)
    }

    #[test]
    fn test_create_and_get_file() {
        let (db, _tmp) = setup();
        let conn = db.conn.lock().unwrap();

        let file = create_file(&conn, "テストファイル", "/path/to/test.md").unwrap();
        assert_eq!(file.title, "テストファイル");
        assert_eq!(file.file_path, "/path/to/test.md");
        assert!(file.content.is_empty());
        assert!(!file.id.is_empty());

        let fetched = get_file(&conn, &file.id).unwrap();
        assert_eq!(fetched.id, file.id);
        assert_eq!(fetched.title, "テストファイル");
        assert_eq!(fetched.file_path, "/path/to/test.md");
    }

    #[test]
    fn test_get_nonexistent_file() {
        let (db, _tmp) = setup();
        let conn = db.conn.lock().unwrap();

        let result = get_file(&conn, "nonexistent-id");
        assert!(result.is_err());
    }

    #[test]
    fn test_list_files() {
        let (db, _tmp) = setup();
        let conn = db.conn.lock().unwrap();

        create_file(&conn, "ファイル1", "/path/1.md").unwrap();
        create_file(&conn, "ファイル2", "/path/2.md").unwrap();
        create_file(&conn, "ファイル3", "/path/3.md").unwrap();

        let files = list_files(&conn).unwrap();
        assert_eq!(files.len(), 3);
    }

    #[test]
    fn test_list_files_empty() {
        let (db, _tmp) = setup();
        let conn = db.conn.lock().unwrap();

        let files = list_files(&conn).unwrap();
        assert!(files.is_empty());
    }

    #[test]
    fn test_delete_file() {
        let (db, _tmp) = setup();
        let conn = db.conn.lock().unwrap();

        let file = create_file(&conn, "削除対象", "/path/del.md").unwrap();
        delete_file(&conn, &file.id).unwrap();

        let result = get_file(&conn, &file.id);
        assert!(result.is_err());
    }

    #[test]
    fn test_delete_nonexistent_file() {
        let (db, _tmp) = setup();
        let conn = db.conn.lock().unwrap();

        let result = delete_file(&conn, "nonexistent-id");
        assert!(result.is_err());
    }

    #[test]
    fn test_unique_file_path_constraint() {
        let (db, _tmp) = setup();
        let conn = db.conn.lock().unwrap();

        create_file(&conn, "ファイルA", "/path/same.md").unwrap();
        let result = create_file(&conn, "ファイルB", "/path/same.md");
        assert!(result.is_err());
    }

    #[test]
    fn test_uuid_uniqueness() {
        let (db, _tmp) = setup();
        let conn = db.conn.lock().unwrap();

        let f1 = create_file(&conn, "A", "/path/a.md").unwrap();
        let f2 = create_file(&conn, "B", "/path/b.md").unwrap();
        assert_ne!(f1.id, f2.id);
    }

    #[test]
    fn test_timestamps_set() {
        let (db, _tmp) = setup();
        let conn = db.conn.lock().unwrap();

        let file = create_file(&conn, "タイムスタンプ", "/path/ts.md").unwrap();
        assert!(!file.created_at.is_empty());
        assert!(!file.updated_at.is_empty());
    }
}
