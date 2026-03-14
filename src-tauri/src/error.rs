use serde::Serialize;

#[derive(Debug, Serialize)]
pub enum AppError {
    FileNotFound(String),
    FileWriteError(String),
    FileReadError(String),
    DatabaseError(String),
    ValidationError(String),
    TaskNotFound(String),
}

impl std::fmt::Display for AppError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AppError::FileNotFound(path) => write!(f, "ファイルが見つかりません: {}", path),
            AppError::FileWriteError(msg) => write!(f, "ファイル保存エラー: {}", msg),
            AppError::FileReadError(msg) => write!(f, "ファイル読み込みエラー: {}", msg),
            AppError::DatabaseError(msg) => write!(f, "データベースエラー: {}", msg),
            AppError::ValidationError(msg) => write!(f, "バリデーションエラー: {}", msg),
            AppError::TaskNotFound(id) => write!(f, "タスクが見つかりません: {}", id),
        }
    }
}
