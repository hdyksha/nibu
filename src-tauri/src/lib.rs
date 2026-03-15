pub mod error;
pub mod models;
pub mod db;
pub mod repository;
pub mod commands;

use commands::file_commands;
use commands::task_commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            use tauri::Manager;
            let app_data_dir = app.path().app_data_dir()
                .expect("アプリデータディレクトリの取得に失敗");
            let database = db::Database::new(app_data_dir)
                .expect("データベース初期化に失敗");
            app.manage(database);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // ファイル操作コマンド (Req 3.1, 3.2, 3.3, 3.4, 3.6)
            file_commands::create_file,
            file_commands::save_file,
            file_commands::load_file,
            file_commands::list_files,
            file_commands::delete_file,
            file_commands::rename_file,
            // タスク操作コマンド (Req 4.1, 4.3, 4.4, 4.6, 4.7)
            task_commands::create_task,
            task_commands::update_task,
            task_commands::delete_task,
            task_commands::list_tasks,
            // ファイル紐づけコマンド (Req 5.1, 5.2, 5.3, 5.5)
            task_commands::add_file_link,
            task_commands::remove_file_link,
            task_commands::get_task_file_links,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
