import { invoke } from "@tauri-apps/api/core";

import type {
  CreateCustomer,
  CreateCustomerReturn,
  CreateExportReceipt,
  CreateImportReceipt,
  CreateProduct,
  CreateSupplier,
  CreateSupplierReturn,
  CreateDebtPayment,
  CreateUser,
  Customer,
  CustomerDebtInvoice,
  DashboardStats,
  DebtPayment,
  ExportReceipt,
  ImportReceipt,
  InventoryHistory,
  ListQuery,
  LoginInput,
  PagedResult,
  Permission,
  Product,
  ProfitReport,
  ReceiptProfitReport,
  ReturnReceipt,
  Supplier,
  UpdateCustomer,
  UpdateCustomerReturn,
  UpdateDebtPayment,
  UpdateExportReceipt,
  UpdateImportReceipt,
  UpdateProduct,
  UpdateSupplier,
  UpdateSupplierReturn,
  UpdateUser,
  User,
} from "./types";

export const api = {
  getProducts: (query: ListQuery) =>
    invoke<PagedResult<Product>>("get_products", { query }),
  getLowStockProducts: (limit: number) =>
    invoke<Product[]>("get_low_stock_products", { limit }),
  getProductById: (id: number) => invoke<Product>("get_product_by_id", { id }),
  createProduct: (input: CreateProduct) =>
    // Backend yêu cầu field `code` luôn có mặt (String, không phải Option) —
    // JSON.stringify tự bỏ key `undefined`, nên phải ép về "" để backend tự
    // sinh mã đúng logic thay vì lỗi thiếu field.
    invoke<Product>("create_product", { input: { ...input, code: input.code ?? "" } }),
  updateProduct: (input: UpdateProduct) =>
    invoke<Product>("update_product", { input }),
  deleteProduct: (id: number) => invoke<void>("delete_product", { id }),
  getCustomers: (query: ListQuery) =>
    invoke<PagedResult<Customer>>("get_customers", { query }),
  getCustomerById: (id: number) => invoke<Customer>("get_customer_by_id", { id }),
  createCustomer: (input: CreateCustomer) =>
    invoke<Customer>("create_customer", { input }),
  updateCustomer: (input: UpdateCustomer) =>
    invoke<Customer>("update_customer", { input }),
  deleteCustomer: (id: number) => invoke<void>("delete_customer", { id }),
  getSuppliers: (query: ListQuery) =>
    invoke<PagedResult<Supplier>>("get_suppliers", { query }),
  getSupplierById: (id: number) => invoke<Supplier>("get_supplier_by_id", { id }),
  createSupplier: (input: CreateSupplier) =>
    invoke<Supplier>("create_supplier", { input }),
  updateSupplier: (input: UpdateSupplier) =>
    invoke<Supplier>("update_supplier", { input }),
  deleteSupplier: (id: number) => invoke<void>("delete_supplier", { id }),
  getImportReceipts: (query: ListQuery) =>
    invoke<PagedResult<ImportReceipt>>("get_import_receipts", { query }),
  createImportReceipt: (input: CreateImportReceipt) =>
    invoke<ImportReceipt>("create_import_receipt", { input }),
  updateImportReceipt: (input: UpdateImportReceipt) =>
    invoke<ImportReceipt>("update_import_receipt", { input }),
  getExportReceipts: (query: ListQuery) =>
    invoke<PagedResult<ExportReceipt>>("get_export_receipts", { query }),
  createExportReceipt: (input: CreateExportReceipt) =>
    invoke<ExportReceipt>("create_export_receipt", { input }),
  updateExportReceipt: (input: UpdateExportReceipt) =>
    invoke<ExportReceipt>("update_export_receipt", { input }),
  deleteExportReceipt: (id: number) => invoke<void>("delete_export_receipt", { id }),
  getReturnReceipts: (query: ListQuery) =>
    invoke<PagedResult<ReturnReceipt>>("get_return_receipts", { query }),
  createCustomerReturn: (input: CreateCustomerReturn) =>
    invoke<ReturnReceipt>("create_customer_return", { input }),
  createSupplierReturn: (input: CreateSupplierReturn) =>
    invoke<ReturnReceipt>("create_supplier_return", { input }),
  updateCustomerReturn: (input: UpdateCustomerReturn) =>
    invoke<ReturnReceipt>("update_customer_return", { input }),
  updateSupplierReturn: (input: UpdateSupplierReturn) =>
    invoke<ReturnReceipt>("update_supplier_return", { input }),
  deleteReturnReceipt: (id: number) => invoke<void>("delete_return_receipt", { id }),
  getImportReceiptById: (id: number) =>
    invoke<ImportReceipt>("get_import_receipt_by_id", { id }),
  getExportReceiptById: (id: number) =>
    invoke<ExportReceipt>("get_export_receipt_by_id", { id }),
  createDebtPayment: (input: CreateDebtPayment) =>
    invoke<DebtPayment>("create_debt_payment", { input }),
  updateDebtPayment: (input: UpdateDebtPayment) =>
    invoke<DebtPayment>("update_debt_payment", { input }),
  deleteDebtPayment: (id: number) => invoke<void>("delete_debt_payment", { id }),
  getDebtPayments: (exportReceiptId: number) =>
    invoke<DebtPayment[]>("get_debt_payments", { exportReceiptId }),
  getCustomersWithDebt: () => invoke<Customer[]>("get_customers_with_debt"),
  getCustomerDebtInvoices: (customerId: number) =>
    invoke<CustomerDebtInvoice[]>("get_customer_debt_invoices", { customerId }),
  getPermissions: () => invoke<Permission[]>("get_permissions"),
  login: (input: LoginInput) => invoke<User>("login", { input }),
  logout: () => invoke<void>("logout"),
  getUsers: () => invoke<User[]>("get_users"),
  createUser: (input: CreateUser) => invoke<User>("create_user", { input }),
  updateUser: (input: UpdateUser) => invoke<User>("update_user", { input }),
  deleteUser: (id: number) => invoke<void>("delete_user", { id }),
  getDashboardStats: () => invoke<DashboardStats>("get_dashboard_stats"),
  getInventoryHistory: () =>
    invoke<InventoryHistory[]>("get_inventory_history"),
  getProfitReport: (from: string, to: string) =>
    invoke<ProfitReport>("get_profit_report", { from, to }),
  /** `customerId = null` → tất cả khách hàng. */
  getReceiptProfitReport: (from: string, to: string, customerId: number | null) =>
    invoke<ReceiptProfitReport>("get_receipt_profit_report", {
      from,
      to,
      customerId,
    }),
};
