use serde::{Deserialize, Serialize};

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