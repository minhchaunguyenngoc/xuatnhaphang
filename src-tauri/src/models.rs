use serde::{Deserialize, Serialize};

/// Tham số chung cho danh sách có tìm kiếm + phân trang — dùng cho mọi bảng
/// có thể phình to (sản phẩm, khách hàng, NCC, phiếu nhập/xuất/trả hàng).
/// Không phân trang thì các bảng này phải load hết mỗi lần gọi, chấp nhận
/// được ở quy mô nhỏ nhưng treo hẳn khi dữ liệu lên tới hàng triệu dòng.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ListQuery {
    /// Không có/rỗng = không lọc.
    pub search: Option<String>,
    pub limit: i64,
    pub offset: i64,
}

#[derive(Debug, Clone, Serialize)]
pub struct PagedResult<T> {
    pub items: Vec<T>,
    /// Tổng số dòng khớp điều kiện lọc (không tính limit/offset) — để tính
    /// tổng số trang ở giao diện.
    pub total: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Product {
    pub id: i64,
    pub code: String,
    pub name: String,
    pub unit: String,
    pub import_price: f64,
    pub export_price: f64,
    pub stock_quantity: i64,
    pub min_stock: i64,
    pub category: Option<String>,
    pub description: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateProduct {
    pub code: String,
    pub name: String,
    pub unit: String,
    pub import_price: f64,
    pub export_price: f64,
    pub min_stock: i64,
    pub category: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateProduct {
    pub id: i64,
    pub code: String,
    pub name: String,
    pub unit: String,
    pub import_price: f64,
    pub export_price: f64,
    pub min_stock: i64,
    pub category: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Customer {
    pub id: i64,
    pub code: String,
    pub name: String,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub note: Option<String>,
    pub debt: f64,
    pub total_spent: f64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateCustomer {
    pub code: String,
    pub name: String,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub note: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateCustomer {
    pub id: i64,
    pub code: String,
    pub name: String,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub note: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Supplier {
    pub id: i64,
    pub code: String,
    pub name: String,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub note: Option<String>,
    pub debt: f64,
    pub total_purchased: f64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateSupplier {
    pub code: String,
    pub name: String,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub note: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateSupplier {
    pub id: i64,
    pub code: String,
    pub name: String,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub note: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportItemInput {
    pub product_id: i64,
    pub quantity: i64,
    pub unit_price: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateImportReceipt {
    pub receipt_number: String,
    pub date: String,
    pub supplier: Option<String>,
    pub supplier_id: Option<i64>,
    pub note: Option<String>,
    pub items: Vec<ImportItemInput>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateImportReceipt {
    pub id: i64,
    pub date: String,
    pub supplier: Option<String>,
    pub supplier_id: Option<i64>,
    pub note: Option<String>,
    pub items: Vec<ImportItemInput>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportItem {
    pub id: i64,
    pub receipt_id: i64,
    pub product_id: i64,
    pub product_name: String,
    pub product_code: String,
    pub quantity: i64,
    pub unit_price: f64,
    pub total_price: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportReceipt {
    pub id: i64,
    pub receipt_number: String,
    pub date: String,
    pub supplier: Option<String>,
    pub supplier_id: Option<i64>,
    pub note: Option<String>,
    pub total_amount: f64,
    pub created_at: String,
    pub items: Vec<ImportItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportItemInput {
    pub product_id: i64,
    pub quantity: i64,
    pub unit_price: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateExportReceipt {
    pub receipt_number: String,
    pub date: String,
    pub customer: Option<String>,
    pub customer_id: Option<i64>,
    pub discount: f64,
    pub amount_paid: f64,
    pub payment_method: String,
    pub note: Option<String>,
    pub items: Vec<ExportItemInput>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportItem {
    pub id: i64,
    pub receipt_id: i64,
    pub product_id: i64,
    pub product_name: String,
    pub product_code: String,
    pub quantity: i64,
    pub unit_price: f64,
    pub total_price: f64,
    pub cost_price: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProductProfitRow {
    pub product_id: i64,
    pub product_code: String,
    pub product_name: String,
    pub quantity_sold: i64,
    pub revenue: f64,
    pub cost: f64,
    pub profit: f64,
    pub margin_percent: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProfitReport {
    pub from_date: String,
    pub to_date: String,
    pub total_revenue: f64,
    pub total_cost: f64,
    pub total_profit: f64,
    pub margin_percent: f64,
    pub by_product: Vec<ProductProfitRow>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportReceipt {
    pub id: i64,
    pub receipt_number: String,
    pub date: String,
    pub customer: Option<String>,
    pub customer_id: Option<i64>,
    pub discount: f64,
    pub amount_paid: f64,
    pub payment_method: String,
    pub note: Option<String>,
    pub total_amount: f64,
    pub created_at: String,
    pub items: Vec<ExportItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DashboardStats {
    pub total_products: i64,
    pub low_stock_count: i64,
    pub total_stock_value: f64,
    pub import_total_month: f64,
    pub export_total_month: f64,
    pub profit_month: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InventoryHistory {
    pub id: i64,
    pub product_id: i64,
    pub product_name: String,
    pub movement_type: String,
    pub quantity_change: i64,
    pub reference_id: i64,
    pub receipt_number: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReturnItemInput {
    pub original_item_id: i64,
    pub product_id: i64,
    pub quantity: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateCustomerReturn {
    pub receipt_number: String,
    pub original_receipt_id: i64,
    pub date: String,
    pub note: Option<String>,
    pub items: Vec<ReturnItemInput>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateSupplierReturn {
    pub receipt_number: String,
    pub original_receipt_id: i64,
    pub date: String,
    pub note: Option<String>,
    pub items: Vec<ReturnItemInput>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReturnItem {
    pub id: i64,
    pub return_id: i64,
    pub original_item_id: i64,
    pub product_id: i64,
    pub product_name: String,
    pub product_code: String,
    pub quantity: i64,
    pub unit_price: f64,
    pub cost_price: f64,
    pub total_price: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReturnReceipt {
    pub id: i64,
    pub receipt_number: String,
    pub return_type: String,
    pub original_receipt_id: i64,
    pub date: String,
    pub note: Option<String>,
    pub total_amount: f64,
    pub created_at: String,
    pub items: Vec<ReturnItem>,
    /// Số phiếu gốc (phiếu bán/phiếu nhập) — lấy sẵn từ backend để trang
    /// Trả hàng không phải tải toàn bộ danh sách phiếu nhập/xuất chỉ để tra
    /// cứu, tốn kém khi 2 bảng đó có hàng triệu dòng.
    pub original_receipt_number: Option<String>,
    /// Tên đối tác (khách hàng cho trả khách, nhà cung cấp cho trả NCC) —
    /// cùng lý do như trên.
    pub partner_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub id: i64,
    pub username: String,
    pub full_name: String,
    pub is_admin: bool,
    pub is_active: bool,
    pub permissions: Vec<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateUser {
    pub username: String,
    pub password: String,
    pub full_name: String,
    pub is_admin: bool,
    pub permissions: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateUser {
    pub id: i64,
    pub username: String,
    /// Bỏ trống (`None`) nghĩa là giữ nguyên mật khẩu hiện tại.
    pub password: Option<String>,
    pub full_name: String,
    pub is_admin: bool,
    pub is_active: bool,
    pub permissions: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoginInput {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Permission {
    pub key: String,
    pub label: String,
}
