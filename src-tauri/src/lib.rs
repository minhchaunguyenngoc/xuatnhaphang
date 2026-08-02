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
            app.manage(auth::Session::default());

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_products,
            commands::get_low_stock_products,
            commands::get_product_by_id,
            commands::create_product,
            commands::update_product,
            commands::delete_product,
            commands::get_customers,
            commands::get_customer_by_id,
            commands::create_customer,
            commands::update_customer,
            commands::delete_customer,
            commands::get_suppliers,
            commands::get_supplier_by_id,
            commands::create_supplier,
            commands::update_supplier,
            commands::delete_supplier,
            commands::get_import_receipts,
            commands::create_import_receipt,
            commands::update_import_receipt,
            commands::get_export_receipts,
            commands::create_export_receipt,
            commands::update_export_receipt,
            commands::delete_export_receipt,
            commands::get_return_receipts,
            commands::create_customer_return,
            commands::create_supplier_return,
            commands::update_customer_return,
            commands::update_supplier_return,
            commands::delete_return_receipt,
            commands::get_import_receipt_by_id,
            commands::get_export_receipt_by_id,
            commands::create_debt_payment,
            commands::update_debt_payment,
            commands::delete_debt_payment,
            commands::get_debt_payments,
            commands::get_customers_with_debt,
            commands::get_customer_debt_invoices,
            commands::get_permissions,
            commands::login,
            commands::logout,
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
