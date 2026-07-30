//! Các lệnh Tauri mà frontend gọi qua `invoke`.
//!
//! **Mọi lệnh phải là `#[tauri::command(async)]`, đừng đổi lại `#[tauri::command]`.**
//! Lệnh khai báo không có `async` sẽ chạy ngay trên MAIN THREAD của Tauri, nên
//! mỗi truy vấn nặng làm đơ toàn bộ giao diện (không kéo được cửa sổ, không bấm
//! được gì) cho tới khi truy vấn xong — rất rõ khi dữ liệu lớn.
//!
//! Thuộc tính `(async)` khiến macro sinh ra loại `sync_threadpool`: thân hàm
//! vẫn viết đồng bộ như thường nhưng được chạy trong worker của tokio, main
//! thread rảnh để vẽ giao diện. Cố tình KHÔNG đổi sang `pub async fn` vì
//! `db.conn.lock()` trả về `MutexGuard` không `Send` — sẽ không biên dịch được
//! ngay khi có ai thêm `.await` vào thân hàm.

use tauri::State;

use crate::db::Database;
use crate::models::*;

/// Map lỗi từ tầng DB sang thông điệp tiếng Việt ổn định cho UI (Issue 16).
/// - `InvalidParameterName`: hộp chứa lỗi nghiệp vụ tự tạo (xem `db::app_err`),
///   đã là tiếng Việt → giữ nguyên.
/// - Ràng buộc SQLite (UNIQUE/FOREIGN KEY/NOT NULL) → câu tiếng Việt dễ hiểu.
fn map_err_vi(e: rusqlite::Error) -> String {
    match &e {
        rusqlite::Error::InvalidParameterName(msg) => msg.clone(),
        rusqlite::Error::SqliteFailure(err, _) => match err.extended_code {
            2067 | 1555 => "Dữ liệu bị trùng (mã đã tồn tại).".to_string(),
            787 => {
                "Không thể thực hiện vì dữ liệu đang được liên kết với bản ghi khác.".to_string()
            }
            1299 => "Thiếu thông tin bắt buộc.".to_string(),
            _ => "Thao tác cơ sở dữ liệu thất bại.".to_string(),
        },
        _ => e.to_string(),
    }
}

#[tauri::command(async)]
pub fn get_products(
    db: State<'_, Database>,
    query: ListQuery,
) -> Result<PagedResult<Product>, String> {
    db.get_products(&query).map_err(map_err_vi)
}

#[tauri::command(async)]
pub fn get_low_stock_products(db: State<'_, Database>, limit: i64) -> Result<Vec<Product>, String> {
    db.get_low_stock_products(limit).map_err(map_err_vi)
}

#[tauri::command(async)]
pub fn get_product_by_id(db: State<'_, Database>, id: i64) -> Result<Product, String> {
    db.get_product_by_id(id).map_err(map_err_vi)
}

#[tauri::command(async)]
pub fn create_product(db: State<'_, Database>, input: CreateProduct) -> Result<Product, String> {
    db.create_product(input).map_err(map_err_vi)
}

#[tauri::command(async)]
pub fn update_product(db: State<'_, Database>, input: UpdateProduct) -> Result<Product, String> {
    db.update_product(input).map_err(map_err_vi)
}

#[tauri::command(async)]
pub fn delete_product(db: State<'_, Database>, id: i64) -> Result<(), String> {
    db.delete_product(id).map_err(map_err_vi)
}

#[tauri::command(async)]
pub fn get_customers(
    db: State<'_, Database>,
    query: ListQuery,
) -> Result<PagedResult<Customer>, String> {
    db.get_customers(&query).map_err(map_err_vi)
}

#[tauri::command(async)]
pub fn get_customer_by_id(db: State<'_, Database>, id: i64) -> Result<Customer, String> {
    db.get_customer_by_id(id).map_err(map_err_vi)
}

#[tauri::command(async)]
pub fn create_customer(db: State<'_, Database>, input: CreateCustomer) -> Result<Customer, String> {
    db.create_customer(input).map_err(map_err_vi)
}

#[tauri::command(async)]
pub fn update_customer(db: State<'_, Database>, input: UpdateCustomer) -> Result<Customer, String> {
    db.update_customer(input).map_err(map_err_vi)
}

#[tauri::command(async)]
pub fn delete_customer(db: State<'_, Database>, id: i64) -> Result<(), String> {
    db.delete_customer(id).map_err(map_err_vi)
}

#[tauri::command(async)]
pub fn get_suppliers(
    db: State<'_, Database>,
    query: ListQuery,
) -> Result<PagedResult<Supplier>, String> {
    db.get_suppliers(&query).map_err(map_err_vi)
}

#[tauri::command(async)]
pub fn get_supplier_by_id(db: State<'_, Database>, id: i64) -> Result<Supplier, String> {
    db.get_supplier_by_id(id).map_err(map_err_vi)
}

#[tauri::command(async)]
pub fn create_supplier(db: State<'_, Database>, input: CreateSupplier) -> Result<Supplier, String> {
    db.create_supplier(input).map_err(map_err_vi)
}

#[tauri::command(async)]
pub fn update_supplier(db: State<'_, Database>, input: UpdateSupplier) -> Result<Supplier, String> {
    db.update_supplier(input).map_err(map_err_vi)
}

#[tauri::command(async)]
pub fn delete_supplier(db: State<'_, Database>, id: i64) -> Result<(), String> {
    db.delete_supplier(id).map_err(map_err_vi)
}

#[tauri::command(async)]
pub fn get_import_receipts(
    db: State<'_, Database>,
    query: ListQuery,
) -> Result<PagedResult<ImportReceipt>, String> {
    db.get_import_receipts(&query).map_err(map_err_vi)
}

#[tauri::command(async)]
pub fn create_import_receipt(
    db: State<'_, Database>,
    input: CreateImportReceipt,
) -> Result<ImportReceipt, String> {
    db.create_import_receipt(input).map_err(map_err_vi)
}

#[tauri::command(async)]
pub fn update_import_receipt(
    db: State<'_, Database>,
    input: UpdateImportReceipt,
) -> Result<ImportReceipt, String> {
    db.update_import_receipt(input).map_err(map_err_vi)
}

#[tauri::command(async)]
pub fn get_export_receipts(
    db: State<'_, Database>,
    query: ListQuery,
) -> Result<PagedResult<ExportReceipt>, String> {
    db.get_export_receipts(&query).map_err(map_err_vi)
}

#[tauri::command(async)]
pub fn create_export_receipt(
    db: State<'_, Database>,
    input: CreateExportReceipt,
) -> Result<ExportReceipt, String> {
    db.create_export_receipt(input).map_err(map_err_vi)
}

#[tauri::command(async)]
pub fn get_return_receipts(
    db: State<'_, Database>,
    query: ListQuery,
) -> Result<PagedResult<ReturnReceipt>, String> {
    db.get_return_receipts(&query).map_err(map_err_vi)
}

#[tauri::command(async)]
pub fn create_customer_return(
    db: State<'_, Database>,
    input: CreateCustomerReturn,
) -> Result<ReturnReceipt, String> {
    db.create_customer_return(input).map_err(map_err_vi)
}

#[tauri::command(async)]
pub fn create_supplier_return(
    db: State<'_, Database>,
    input: CreateSupplierReturn,
) -> Result<ReturnReceipt, String> {
    db.create_supplier_return(input).map_err(map_err_vi)
}

#[tauri::command(async)]
pub fn update_customer_return(
    db: State<'_, Database>,
    input: UpdateCustomerReturn,
) -> Result<ReturnReceipt, String> {
    db.update_customer_return(input).map_err(map_err_vi)
}

#[tauri::command(async)]
pub fn update_supplier_return(
    db: State<'_, Database>,
    input: UpdateSupplierReturn,
) -> Result<ReturnReceipt, String> {
    db.update_supplier_return(input).map_err(map_err_vi)
}

#[tauri::command(async)]
pub fn delete_return_receipt(db: State<'_, Database>, id: i64) -> Result<(), String> {
    db.delete_return_receipt(id).map_err(map_err_vi)
}

/// Trang Trả hàng dùng khi mở lại phiếu gốc để sửa/xoá phiếu trả, không cần
/// tải cả danh sách phiếu nhập/xuất — cùng mẫu với `get_product_by_id`.
#[tauri::command(async)]
pub fn get_import_receipt_by_id(db: State<'_, Database>, id: i64) -> Result<ImportReceipt, String> {
    db.get_import_receipt(id).map_err(map_err_vi)
}

#[tauri::command(async)]
pub fn get_export_receipt_by_id(db: State<'_, Database>, id: i64) -> Result<ExportReceipt, String> {
    db.get_export_receipt(id).map_err(map_err_vi)
}

#[tauri::command(async)]
pub fn get_permissions() -> Vec<Permission> {
    crate::auth::PERMISSION_KEYS
        .iter()
        .map(|(key, label)| Permission {
            key: key.to_string(),
            label: label.to_string(),
        })
        .collect()
}

#[tauri::command(async)]
pub fn login(db: State<'_, Database>, input: LoginInput) -> Result<User, String> {
    db.login(input).map_err(map_err_vi)
}

#[tauri::command(async)]
pub fn get_users(db: State<'_, Database>) -> Result<Vec<User>, String> {
    db.get_users().map_err(map_err_vi)
}

#[tauri::command(async)]
pub fn create_user(db: State<'_, Database>, input: CreateUser) -> Result<User, String> {
    db.create_user(input).map_err(map_err_vi)
}

#[tauri::command(async)]
pub fn update_user(db: State<'_, Database>, input: UpdateUser) -> Result<User, String> {
    db.update_user(input).map_err(map_err_vi)
}

#[tauri::command(async)]
pub fn delete_user(db: State<'_, Database>, id: i64) -> Result<(), String> {
    db.delete_user(id).map_err(map_err_vi)
}

#[tauri::command(async)]
pub fn get_dashboard_stats(db: State<'_, Database>) -> Result<DashboardStats, String> {
    db.get_dashboard_stats().map_err(map_err_vi)
}

#[tauri::command(async)]
pub fn get_inventory_history(db: State<'_, Database>) -> Result<Vec<InventoryHistory>, String> {
    db.get_inventory_history().map_err(map_err_vi)
}

#[tauri::command(async)]
pub fn get_profit_report(
    db: State<'_, Database>,
    from: String,
    to: String,
) -> Result<ProfitReport, String> {
    db.get_profit_report(&from, &to).map_err(map_err_vi)
}
