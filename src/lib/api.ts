import { invoke } from "@tauri-apps/api/core";

import type {
  CreateCustomer,
  CreateCustomerReturn,
  CreateExportReceipt,
  CreateImportReceipt,
  CreateProduct,
  CreateSupplier,
  CreateSupplierReturn,
  CreateUser,
  Customer,
  DashboardStats,
  ExportReceipt,
  ImportReceipt,
  InventoryHistory,
  LoginInput,
  Permission,
  Product,
  ProfitReport,
  ReturnReceipt,
  Supplier,
  UpdateCustomer,
  UpdateImportReceipt,
  UpdateProduct,
  UpdateSupplier,
  UpdateUser,
  User,
} from "./types";

export const api = {
  getProducts: () => invoke<Product[]>("get_products"),
  createProduct: (input: CreateProduct) =>
    // Backend yêu cầu field `code` luôn có mặt (String, không phải Option) —
    // JSON.stringify tự bỏ key `undefined`, nên phải ép về "" để backend tự
    // sinh mã đúng logic thay vì lỗi thiếu field.
    invoke<Product>("create_product", { input: { ...input, code: input.code ?? "" } }),
  updateProduct: (input: UpdateProduct) =>
    invoke<Product>("update_product", { input }),
  deleteProduct: (id: number) => invoke<void>("delete_product", { id }),
  getCustomers: () => invoke<Customer[]>("get_customers"),
  createCustomer: (input: CreateCustomer) =>
    invoke<Customer>("create_customer", { input }),
  updateCustomer: (input: UpdateCustomer) =>
    invoke<Customer>("update_customer", { input }),
  deleteCustomer: (id: number) => invoke<void>("delete_customer", { id }),
  getSuppliers: () => invoke<Supplier[]>("get_suppliers"),
  createSupplier: (input: CreateSupplier) =>
    invoke<Supplier>("create_supplier", { input }),
  updateSupplier: (input: UpdateSupplier) =>
    invoke<Supplier>("update_supplier", { input }),
  deleteSupplier: (id: number) => invoke<void>("delete_supplier", { id }),
  getImportReceipts: () => invoke<ImportReceipt[]>("get_import_receipts"),
  createImportReceipt: (input: CreateImportReceipt) =>
    invoke<ImportReceipt>("create_import_receipt", { input }),
  updateImportReceipt: (input: UpdateImportReceipt) =>
    invoke<ImportReceipt>("update_import_receipt", { input }),
  getExportReceipts: () => invoke<ExportReceipt[]>("get_export_receipts"),
  createExportReceipt: (input: CreateExportReceipt) =>
    invoke<ExportReceipt>("create_export_receipt", { input }),
  getReturnReceipts: () => invoke<ReturnReceipt[]>("get_return_receipts"),
  createCustomerReturn: (input: CreateCustomerReturn) =>
    invoke<ReturnReceipt>("create_customer_return", { input }),
  createSupplierReturn: (input: CreateSupplierReturn) =>
    invoke<ReturnReceipt>("create_supplier_return", { input }),
  getPermissions: () => invoke<Permission[]>("get_permissions"),
  login: (input: LoginInput) => invoke<User>("login", { input }),
  getUsers: () => invoke<User[]>("get_users"),
  createUser: (input: CreateUser) => invoke<User>("create_user", { input }),
  updateUser: (input: UpdateUser) => invoke<User>("update_user", { input }),
  deleteUser: (id: number) => invoke<void>("delete_user", { id }),
  getDashboardStats: () => invoke<DashboardStats>("get_dashboard_stats"),
  getInventoryHistory: () =>
    invoke<InventoryHistory[]>("get_inventory_history"),
  getProfitReport: (from: string, to: string) =>
    invoke<ProfitReport>("get_profit_report", { from, to }),
};
