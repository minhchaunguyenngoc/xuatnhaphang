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
  code: string;
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