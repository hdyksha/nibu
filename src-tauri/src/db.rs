use rusqlite::Connection;
use std::path::PathBuf;
use std::sync::Mutex;

use crate::error::AppError;

pub struct Database {
    pub conn: Mutex<Connection>,
}

impl Database {
    /// アプリデータディレクトリにSQLiteデータベースを初期化する
    pub fn new(app_data_dir: PathBuf) -> Result<Self, AppError> {
        std::fs::create_dir_all(&app_data_dir).map_err(|e| {
            AppError::DatabaseError(format!("データディレクトリの作成に失敗: {}", e))
        })?;

        let db_path = app_data_dir.join("app.db");
        let conn = Connection::open(&db_path).map_err(|e| {
            AppError::DatabaseError(format!("データベース接続に失敗: {}", e))
        })?;

        // WALモードで並行読み取り性能を向上
        conn.execute_batch("PRAGMA journal_mode=WAL;")
            .map_err(|e| AppError::DatabaseError(format!("PRAGMA設定に失敗: {}", e)))?;

        // 外部キー制約を有効化
        conn.execute_batch("PRAGMA foreign_keys=ON;")
            .map_err(|e| AppError::DatabaseError(format!("PRAGMA設定に失敗: {}", e)))?;

        let db = Self {
            conn: Mutex::new(conn),
        };
        db.run_migrations()?;
        Ok(db)
    }

    /// テーブルとインデックスを作成するマイグレーション
    fn run_migrations(&self) -> Result<(), AppError> {
        let conn = self.conn.lock().map_err(|e| {
            AppError::DatabaseError(format!("ロック取得に失敗: {}", e))
        })?;

        conn.execute_batch(
            "
            CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT NOT NULL DEFAULT '',
                completed INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS files (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                file_path TEXT NOT NULL UNIQUE,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS file_links (
                task_id TEXT NOT NULL,
                file_id TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                PRIMARY KEY (task_id, file_id),
                FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
                FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_file_links_task_id ON file_links(task_id);
            CREATE INDEX IF NOT EXISTS idx_file_links_file_id ON file_links(file_id);
            CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed);
            "
        )
        .map_err(|e| AppError::DatabaseError(format!("マイグレーションに失敗: {}", e)))?;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn setup_db() -> (Database, TempDir) {
        let tmp = TempDir::new().unwrap();
        let db = Database::new(tmp.path().to_path_buf()).unwrap();
        (db, tmp)
    }

    #[test]
    fn test_database_creation() {
        let (db, tmp) = setup_db();
        assert!(tmp.path().join("app.db").exists());
        // テーブルが存在することを確認
        let conn = db.conn.lock().unwrap();
        let count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name IN ('tasks', 'files', 'file_links')",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(count, 3);
    }

    #[test]
    fn test_indexes_created() {
        let (db, _tmp) = setup_db();
        let conn = db.conn.lock().unwrap();
        let count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='index' AND name IN ('idx_file_links_task_id', 'idx_file_links_file_id', 'idx_tasks_completed')",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(count, 3);
    }

    #[test]
    fn test_foreign_keys_enabled() {
        let (db, _tmp) = setup_db();
        let conn = db.conn.lock().unwrap();
        let fk: i64 = conn
            .query_row("PRAGMA foreign_keys", [], |row| row.get(0))
            .unwrap();
        assert_eq!(fk, 1);
    }

    #[test]
    fn test_migrations_idempotent() {
        let (db, _tmp) = setup_db();
        // 2回目のマイグレーションもエラーにならないこと
        db.run_migrations().unwrap();
    }
}
