mod auth;
mod commands;
mod db;
mod models;

use db::init_database;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            let database = init_database(app.handle()).expect("failed to initialize database");
            app.manage(database);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_products,
            commands::create_product,
            commands::update_product,
            commands::delete_product,
            commands::get_customers,
            commands::create_customer,
            commands::update_customer,
            commands::delete_customer,
            commands::get_suppliers,
            commands::create_supplier,
            commands::update_supplier,
            commands::delete_supplier,
            commands::get_import_receipts,
            commands::create_import_receipt,
            commands::update_import_receipt,
            commands::get_export_receipts,
            commands::create_export_receipt,
            commands::get_return_receipts,
            commands::create_customer_return,
            commands::create_supplier_return,
            commands::get_permissions,
            commands::login,
            commands::get_users,
            commands::create_user,
            commands::update_user,
            commands::delete_user,
            commands::get_dashboard_stats,
            commands::get_inventory_history,
            commands::get_profit_report,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
