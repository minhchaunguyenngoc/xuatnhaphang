/** Tham số tìm kiếm + phân trang dùng chung cho mọi danh sách có thể phình
 * to (sản phẩm, khách hàng, NCC, phiếu nhập/xuất/trả hàng). */
export interface ListQuery {
  search?: string | null;
  limit: number;
  offset: number;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
}

export interface Product {
  id: number;
  code: string;
  name: string;
  unit: string;
  import_price: number;
  export_price: number;
  stock_quantity: number;
  min_stock: number;
  category: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateProduct {
  /** Để trống → backend tự sinh mã, hoặc dùng lại mã sản phẩm trùng tên +
   * giá nhập + giá xuất nếu đã có. */
  code?: string;
  name: string;
  unit: string;
  import_price: number;
  export_price: number;
  min_stock: number;
  category?: string | null;
  description?: string | null;
}

export interface UpdateProduct extends CreateProduct {
  id: number;
  /** Sửa sản phẩm đã có luôn có mã sẵn — không áp dụng tự sinh mã. */
  code: string;
}

export interface Customer {
  id: number;
  code: string;
  name: string;
  phone: string | null;
  address: string | null;
  note: string | null;
  debt: number;
  total_spent: number;
  created_at: string;
  updated_at: string;
}

export interface CreateCustomer {
  code: string;
  name: string;
  phone?: string | null;
  address?: string | null;
  note?: string | null;
}

export interface UpdateCustomer extends CreateCustomer {
  id: number;
}

export interface Supplier {
  id: number;
  code: string;
  name: string;
  phone: string | null;
  address: string | null;
  note: string | null;
  debt: number;
  total_purchased: number;
  created_at: string;
  updated_at: string;
}

export interface CreateSupplier {
  code: string;
  name: string;
  phone?: string | null;
  address?: string | null;
  note?: string | null;
}

export interface UpdateSupplier extends CreateSupplier {
  id: number;
}

export interface ImportItemInput {
  product_id: number;
  quantity: number;
  unit_price: number;
}

export interface CreateImportReceipt {
  receipt_number: string;
  date: string;
  supplier?: string | null;
  supplier_id?: number | null;
  note?: string | null;
  items: ImportItemInput[];
}

export interface ImportItem {
  id: number;
  receipt_id: number;
  product_id: number;
  product_name: string;
  product_code: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface ImportReceipt {
  id: number;
  receipt_number: string;
  date: string;
  supplier: string | null;
  supplier_id: number | null;
  note: string | null;
  total_amount: number;
  created_at: string;
  items: ImportItem[];
}

/** Sửa phiếu nhập — chỉ cho phép khi lô hàng của phiếu chưa bị phiếu xuất
 * nào tiêu thụ (an toàn cho giá vốn FIFO). `receipt_number` không đổi được. */
export interface UpdateImportReceipt {
  id: number;
  date: string;
  supplier?: string | null;
  supplier_id?: number | null;
  note?: string | null;
  items: ImportItemInput[];
}

export interface ExportItemInput {
  product_id: number;
  quantity: number;
  unit_price: number;
}

export type PaymentMethod = "cash" | "transfer";

export interface CreateExportReceipt {
  receipt_number: string;
  date: string;
  customer?: string | null;
  customer_id?: number | null;
  discount: number;
  amount_paid: number;
  payment_method: PaymentMethod;
  note?: string | null;
  items: ExportItemInput[];
}

export interface ExportItem {
  id: number;
  receipt_id: number;
  product_id: number;
  product_name: string;
  product_code: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  cost_price: number;
}

export interface ExportReceipt {
  id: number;
  receipt_number: string;
  date: string;
  customer: string | null;
  customer_id: number | null;
  discount: number;
  amount_paid: number;
  payment_method: string;
  note: string | null;
  total_amount: number;
  created_at: string;
  items: ExportItem[];
}

export interface DashboardStats {
  total_products: number;
  low_stock_count: number;
  total_stock_value: number;
  import_total_month: number;
  export_total_month: number;
  profit_month: number;
}

export interface InventoryHistory {
  id: number;
  product_id: number;
  product_name: string;
  movement_type: string;
  quantity_change: number;
  reference_id: number;
  receipt_number: string | null;
  created_at: string;
}

export interface ProductProfitRow {
  product_id: number;
  product_code: string;
  product_name: string;
  quantity_sold: number;
  revenue: number;
  cost: number;
  profit: number;
  margin_percent: number;
}

export interface ProfitReport {
  from_date: string;
  to_date: string;
  total_revenue: number;
  total_cost: number;
  total_profit: number;
  margin_percent: number;
  by_product: ProductProfitRow[];
}

export type ReturnType = "customer" | "supplier";

export interface ReturnItemInput {
  original_item_id: number;
  product_id: number;
  quantity: number;
}

export interface CreateCustomerReturn {
  receipt_number: string;
  original_receipt_id: number;
  date: string;
  note?: string | null;
  items: ReturnItemInput[];
}

export interface CreateSupplierReturn {
  receipt_number: string;
  original_receipt_id: number;
  date: string;
  note?: string | null;
  items: ReturnItemInput[];
}

// Sửa phiếu trả hàng — không cho đổi phiếu bán/nhập gốc, chỉ sửa số phiếu/
// ngày/ghi chú/số lượng từng dòng (khớp `UpdateCustomerReturn`/
// `UpdateSupplierReturn` phía Rust).
export interface UpdateCustomerReturn {
  id: number;
  receipt_number: string;
  date: string;
  note?: string | null;
  items: ReturnItemInput[];
}

export interface UpdateSupplierReturn {
  id: number;
  receipt_number: string;
  date: string;
  note?: string | null;
  items: ReturnItemInput[];
}

export interface ReturnItem {
  id: number;
  return_id: number;
  original_item_id: number;
  product_id: number;
  product_name: string;
  product_code: string;
  quantity: number;
  unit_price: number;
  cost_price: number;
  total_price: number;
}

export interface ReturnReceipt {
  id: number;
  receipt_number: string;
  return_type: ReturnType;
  original_receipt_id: number;
  date: string;
  note: string | null;
  total_amount: number;
  created_at: string;
  items: ReturnItem[];
  /** Số phiếu gốc + tên đối tác — backend đã JOIN sẵn, khỏi phải tự tra cứu
   * từ toàn bộ danh sách phiếu nhập/xuất. */
  original_receipt_number: string | null;
  partner_name: string | null;
}

export interface Permission {
  key: string;
  label: string;
}

export interface User {
  id: number;
  username: string;
  full_name: string;
  is_admin: boolean;
  is_active: boolean;
  permissions: string[];
  created_at: string;
  updated_at: string;
}

export interface CreateUser {
  username: string;
  password: string;
  full_name: string;
  is_admin: boolean;
  permissions: string[];
}

export interface UpdateUser {
  id: number;
  username: string;
  /** Bỏ trống (không set) nghĩa là giữ nguyên mật khẩu hiện tại. */
  password?: string | null;
  full_name: string;
  is_admin: boolean;
  is_active: boolean;
  permissions: string[];
}

export interface LoginInput {
  username: string;
  password: string;
}