use tauri::State;

use crate::db::Database;
use crate::models::*;

#[tauri::command]
pub fn get_products(db: State<'_, Database>) -> Result<Vec<Product>, String> {
    db.get_products().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_product(db: State<'_, Database>, input: CreateProduct) -> Result<Product, String> {
    db.create_product(input).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_product(db: State<'_, Database>, input: UpdateProduct) -> Result<Product, String> {
    db.update_product(input).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_product(db: State<'_, Database>, id: i64) -> Result<(), String> {
    db.delete_product(id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_customers(db: State<'_, Database>) -> Result<Vec<Customer>, String> {
    db.get_customers().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_customer(db: State<'_, Database>, input: CreateCustomer) -> Result<Customer, String> {
    db.create_customer(input).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_customer(db: State<'_, Database>, input: UpdateCustomer) -> Result<Customer, String> {
    db.update_customer(input).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_customer(db: State<'_, Database>, id: i64) -> Result<(), String> {
    db.delete_customer(id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_suppliers(db: State<'_, Database>) -> Result<Vec<Supplier>, String> {
    db.get_suppliers().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_supplier(db: State<'_, Database>, input: CreateSupplier) -> Result<Supplier, String> {
    db.create_supplier(input).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_supplier(db: State<'_, Database>, input: UpdateSupplier) -> Result<Supplier, String> {
    db.update_supplier(input).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_supplier(db: State<'_, Database>, id: i64) -> Result<(), String> {
    db.delete_supplier(id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_import_receipts(db: State<'_, Database>) -> Result<Vec<ImportReceipt>, String> {
    db.get_import_receipts().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_import_receipt(
    db: State<'_, Database>,
    input: CreateImportReceipt,
) -> Result<ImportReceipt, String> {
    db.create_import_receipt(input).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_export_receipts(db: State<'_, Database>) -> Result<Vec<ExportReceipt>, String> {
    db.get_export_receipts().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_export_receipt(
    db: State<'_, Database>,
    input: CreateExportReceipt,
) -> Result<ExportReceipt, String> {
    db.create_export_receipt(input).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_dashboard_stats(db: State<'_, Database>) -> Result<DashboardStats, String> {
    db.get_dashboard_stats().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_inventory_history(db: State<'_, Database>) -> Result<Vec<InventoryHistory>, String> {
    db.get_inventory_history().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_profit_report(
    db: State<'_, Database>,
    from: String,
    to: String,
) -> Result<ProfitReport, String> {
    db.get_profit_report(&from, &to).map_err(|e| e.to_string())
}