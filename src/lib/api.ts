import { invoke } from "@tauri-apps/api/core";

import type {
  CreateCustomer,
  CreateExportReceipt,
  CreateImportReceipt,
  CreateProduct,
  CreateSupplier,
  Customer,
  DashboardStats,
  ExportReceipt,
  ImportReceipt,
  InventoryHistory,
  Product,
  ProfitReport,
  Supplier,
  UpdateCustomer,
  UpdateProduct,
  UpdateSupplier,
} from "./types";

export const api = {
  getProducts: () => invoke<Product[]>("get_products"),
  createProduct: (input: CreateProduct) =>
    invoke<Product>("create_product", { input }),
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
  getExportReceipts: () => invoke<ExportReceipt[]>("get_export_receipts"),
  createExportReceipt: (input: CreateExportReceipt) =>
    invoke<ExportReceipt>("create_export_receipt", { input }),
  getDashboardStats: () => invoke<DashboardStats>("get_dashboard_stats"),
  getInventoryHistory: () =>
    invoke<InventoryHistory[]>("get_inventory_history"),
  getProfitReport: (from: string, to: string) =>
    invoke<ProfitReport>("get_profit_report", { from, to }),
};