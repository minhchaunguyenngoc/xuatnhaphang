import { create } from "zustand";

import { api } from "@/lib/api";
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
} from "@/lib/types";

interface InventoryState {
  products: Product[];
  customers: Customer[];
  suppliers: Supplier[];
  importReceipts: ImportReceipt[];
  exportReceipts: ExportReceipt[];
  dashboardStats: DashboardStats | null;
  inventoryHistory: InventoryHistory[];
  profitReport: ProfitReport | null;
  loading: boolean;
  error: string | null;
  fetchProducts: () => Promise<void>;
  createProduct: (input: CreateProduct) => Promise<void>;
  updateProduct: (input: UpdateProduct) => Promise<void>;
  deleteProduct: (id: number) => Promise<void>;
  importProducts: (
    inputs: CreateProduct[],
  ) => Promise<{ ok: number; failed: number }>;
  fetchCustomers: () => Promise<void>;
  createCustomer: (input: CreateCustomer) => Promise<Customer>;
  updateCustomer: (input: UpdateCustomer) => Promise<void>;
  deleteCustomer: (id: number) => Promise<void>;
  fetchSuppliers: () => Promise<void>;
  createSupplier: (input: CreateSupplier) => Promise<Supplier>;
  updateSupplier: (input: UpdateSupplier) => Promise<void>;
  deleteSupplier: (id: number) => Promise<void>;
  fetchImportReceipts: () => Promise<void>;
  createImportReceipt: (input: CreateImportReceipt) => Promise<void>;
  fetchExportReceipts: () => Promise<void>;
  createExportReceipt: (input: CreateExportReceipt) => Promise<ExportReceipt>;
  fetchDashboard: () => Promise<void>;
  fetchInventoryHistory: () => Promise<void>;
  fetchProfitReport: (from: string, to: string) => Promise<void>;
}

const emptyStats: DashboardStats = {
  total_products: 0,
  low_stock_count: 0,
  total_stock_value: 0,
  import_total_month: 0,
  export_total_month: 0,
  profit_month: 0,
};

export const useInventoryStore = create<InventoryState>((set) => ({
  products: [],
  customers: [],
  suppliers: [],
  importReceipts: [],
  exportReceipts: [],
  dashboardStats: null,
  inventoryHistory: [],
  profitReport: null,
  loading: false,
  error: null,

  fetchProducts: async () => {
    set({ loading: true, error: null });
    try {
      const products = await api.getProducts();
      set({ products, loading: false });
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : "Không thể tải sản phẩm",
      });
    }
  },

  createProduct: async (input) => {
    set({ loading: true, error: null });
    try {
      await api.createProduct(input);
      const products = await api.getProducts();
      const dashboardStats = await api.getDashboardStats();
      set({ products, dashboardStats, loading: false });
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : "Không thể tạo sản phẩm",
      });
      throw error;
    }
  },

  updateProduct: async (input) => {
    set({ loading: true, error: null });
    try {
      await api.updateProduct(input);
      const products = await api.getProducts();
      set({ products, loading: false });
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : "Không thể cập nhật sản phẩm",
      });
      throw error;
    }
  },

  deleteProduct: async (id) => {
    set({ loading: true, error: null });
    try {
      await api.deleteProduct(id);
      const products = await api.getProducts();
      const dashboardStats = await api.getDashboardStats();
      set({ products, dashboardStats, loading: false });
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : "Không thể xóa sản phẩm",
      });
      throw error;
    }
  },

  importProducts: async (inputs) => {
    set({ loading: true, error: null });
    let ok = 0;
    let failed = 0;
    // Tạo tuần tự, dòng lỗi (vd trùng mã) được bỏ qua thay vì dừng cả lô.
    for (const input of inputs) {
      try {
        await api.createProduct(input);
        ok += 1;
      } catch {
        failed += 1;
      }
    }
    const [products, dashboardStats] = await Promise.all([
      api.getProducts(),
      api.getDashboardStats(),
    ]);
    set({ products, dashboardStats, loading: false });
    return { ok, failed };
  },

  fetchCustomers: async () => {
    try {
      const customers = await api.getCustomers();
      set({ customers });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Không thể tải khách hàng",
      });
    }
  },

  createCustomer: async (input) => {
    try {
      const customer = await api.createCustomer(input);
      set({ customers: await api.getCustomers() });
      return customer;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Không thể tạo khách hàng",
      });
      throw error;
    }
  },

  updateCustomer: async (input) => {
    try {
      await api.updateCustomer(input);
      set({ customers: await api.getCustomers() });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Không thể cập nhật khách hàng",
      });
      throw error;
    }
  },

  deleteCustomer: async (id) => {
    try {
      await api.deleteCustomer(id);
      set({ customers: await api.getCustomers() });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Không thể xóa khách hàng",
      });
      throw error;
    }
  },

  fetchSuppliers: async () => {
    try {
      const suppliers = await api.getSuppliers();
      set({ suppliers });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Không thể tải nhà cung cấp",
      });
    }
  },

  createSupplier: async (input) => {
    try {
      const supplier = await api.createSupplier(input);
      set({ suppliers: await api.getSuppliers() });
      return supplier;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Không thể tạo nhà cung cấp",
      });
      throw error;
    }
  },

  updateSupplier: async (input) => {
    try {
      await api.updateSupplier(input);
      set({ suppliers: await api.getSuppliers() });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Không thể cập nhật nhà cung cấp",
      });
      throw error;
    }
  },

  deleteSupplier: async (id) => {
    try {
      await api.deleteSupplier(id);
      set({ suppliers: await api.getSuppliers() });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Không thể xóa nhà cung cấp",
      });
      throw error;
    }
  },

  fetchImportReceipts: async () => {
    set({ loading: true, error: null });
    try {
      const importReceipts = await api.getImportReceipts();
      set({ importReceipts, loading: false });
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : "Không thể tải phiếu nhập",
      });
    }
  },

  createImportReceipt: async (input) => {
    set({ loading: true, error: null });
    try {
      await api.createImportReceipt(input);
      const [products, suppliers, importReceipts, dashboardStats, inventoryHistory] =
        await Promise.all([
          api.getProducts(),
          api.getSuppliers(),
          api.getImportReceipts(),
          api.getDashboardStats(),
          api.getInventoryHistory(),
        ]);
      set({
        products,
        suppliers,
        importReceipts,
        dashboardStats,
        inventoryHistory,
        loading: false,
      });
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : "Không thể tạo phiếu nhập",
      });
      throw error;
    }
  },

  fetchExportReceipts: async () => {
    set({ loading: true, error: null });
    try {
      const exportReceipts = await api.getExportReceipts();
      set({ exportReceipts, loading: false });
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : "Không thể tải phiếu xuất",
      });
    }
  },

  createExportReceipt: async (input) => {
    set({ loading: true, error: null });
    try {
      const receipt = await api.createExportReceipt(input);
      const [products, customers, exportReceipts, dashboardStats, inventoryHistory] =
        await Promise.all([
          api.getProducts(),
          api.getCustomers(),
          api.getExportReceipts(),
          api.getDashboardStats(),
          api.getInventoryHistory(),
        ]);
      set({
        products,
        customers,
        exportReceipts,
        dashboardStats,
        inventoryHistory,
        loading: false,
      });
      return receipt;
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : "Không thể tạo phiếu xuất",
      });
      throw error;
    }
  },

  fetchDashboard: async () => {
    set({ loading: true, error: null });
    try {
      const dashboardStats = await api.getDashboardStats();
      set({ dashboardStats, loading: false });
    } catch (error) {
      set({
        dashboardStats: emptyStats,
        loading: false,
        error: error instanceof Error ? error.message : "Không thể tải dashboard",
      });
    }
  },

  fetchInventoryHistory: async () => {
    try {
      const inventoryHistory = await api.getInventoryHistory();
      set({ inventoryHistory });
    } catch {
      set({ inventoryHistory: [] });
    }
  },

  fetchProfitReport: async (from, to) => {
    set({ loading: true, error: null });
    try {
      const profitReport = await api.getProfitReport(from, to);
      set({ profitReport, loading: false });
    } catch (error) {
      set({
        loading: false,
        error:
          error instanceof Error ? error.message : "Không thể tải báo cáo lợi nhuận",
      });
    }
  },
}));