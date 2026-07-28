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
  ListQuery,
  Product,
  ProfitReport,
  Supplier,
  UpdateCustomer,
  UpdateImportReceipt,
  UpdateProduct,
  UpdateSupplier,
} from "@/lib/types";
import { getErrorMessage } from "@/lib/errors";

/** Số dòng mỗi trang cho mọi danh sách có phân trang trong app. */
export const PAGE_SIZE = 20;
/** Số kết quả tối đa cho ô tìm-chọn (POS, Combobox trong phiếu nhập) — không
 * cần `total`, chỉ cần đủ gợi ý để người dùng gõ tiếp thu hẹp kết quả. */
const SEARCH_LIMIT = 50;

function pageQuery(page: number, search: string): ListQuery {
  return {
    search: search.trim() ? search.trim() : null,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  };
}

/**
 * Tuỳ chọn cho các hàm ghi (tạo/sửa phiếu).
 *
 * Trước đây mỗi lần lưu phiếu đều tự động nạp lại products + customers/suppliers
 * + danh sách phiếu + lịch sử kho + dashboard = 5-6 lượt gọi backend chặn trước
 * khi màn hình phản hồi, kể cả khi trang đang mở chẳng hiển thị mấy thứ đó
 * (POS là ví dụ rõ nhất). Giờ mặc định KHÔNG nạp lại; trang nào thực sự hiển thị
 * danh sách phiếu thì truyền `{ refetch: true }` để nạp lại đúng danh sách đó.
 */
export interface MutationOpts {
  refetch?: boolean;
}

interface InventoryState {
  products: Product[];
  productsTotal: number;
  productsPage: number;
  productsSearch: string;
  /** Top sản phẩm sắp hết hàng — cho widget Tổng quan, riêng biệt với danh
   * sách đã phân trang ở trang Hàng hoá. */
  lowStockProducts: Product[];

  customers: Customer[];
  customersTotal: number;
  customersPage: number;
  customersSearch: string;

  suppliers: Supplier[];
  suppliersTotal: number;
  suppliersPage: number;
  suppliersSearch: string;

  importReceipts: ImportReceipt[];
  importReceiptsTotal: number;
  importReceiptsPage: number;
  importReceiptsSearch: string;

  exportReceipts: ExportReceipt[];
  exportReceiptsTotal: number;
  exportReceiptsPage: number;
  exportReceiptsSearch: string;

  dashboardStats: DashboardStats | null;
  inventoryHistory: InventoryHistory[];
  profitReport: ProfitReport | null;
  loading: boolean;
  error: string | null;

  fetchProducts: (opts?: { page?: number; search?: string }) => Promise<void>;
  /** Tìm sản phẩm cho ô tìm-chọn (POS, phiếu nhập) — không đụng tới danh
   * sách phân trang ở trang Hàng hoá. */
  searchProducts: (search: string) => Promise<Product[]>;
  fetchLowStockProducts: () => Promise<void>;
  createProduct: (input: CreateProduct) => Promise<Product>;
  updateProduct: (input: UpdateProduct) => Promise<void>;
  deleteProduct: (id: number) => Promise<void>;
  importProducts: (
    inputs: CreateProduct[],
  ) => Promise<{ ok: number; failed: number }>;

  fetchCustomers: (opts?: { page?: number; search?: string }) => Promise<void>;
  searchCustomers: (search: string) => Promise<Customer[]>;
  createCustomer: (input: CreateCustomer) => Promise<Customer>;
  updateCustomer: (input: UpdateCustomer) => Promise<void>;
  deleteCustomer: (id: number) => Promise<void>;

  fetchSuppliers: (opts?: { page?: number; search?: string }) => Promise<void>;
  searchSuppliers: (search: string) => Promise<Supplier[]>;
  createSupplier: (input: CreateSupplier) => Promise<Supplier>;
  updateSupplier: (input: UpdateSupplier) => Promise<void>;
  deleteSupplier: (id: number) => Promise<void>;

  fetchImportReceipts: (opts?: { page?: number; search?: string }) => Promise<void>;
  createImportReceipt: (input: CreateImportReceipt, opts?: MutationOpts) => Promise<void>;
  updateImportReceipt: (input: UpdateImportReceipt, opts?: MutationOpts) => Promise<void>;

  fetchExportReceipts: (opts?: { page?: number; search?: string }) => Promise<void>;
  createExportReceipt: (
    input: CreateExportReceipt,
    opts?: MutationOpts,
  ) => Promise<ExportReceipt>;

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

export const useInventoryStore = create<InventoryState>((set, get) => ({
  products: [],
  productsTotal: 0,
  productsPage: 1,
  productsSearch: "",
  lowStockProducts: [],

  customers: [],
  customersTotal: 0,
  customersPage: 1,
  customersSearch: "",

  suppliers: [],
  suppliersTotal: 0,
  suppliersPage: 1,
  suppliersSearch: "",

  importReceipts: [],
  importReceiptsTotal: 0,
  importReceiptsPage: 1,
  importReceiptsSearch: "",

  exportReceipts: [],
  exportReceiptsTotal: 0,
  exportReceiptsPage: 1,
  exportReceiptsSearch: "",

  dashboardStats: null,
  inventoryHistory: [],
  profitReport: null,
  loading: false,
  error: null,

  fetchProducts: async (opts) => {
    const page = opts?.page ?? get().productsPage;
    const search = opts?.search ?? get().productsSearch;
    set({ loading: true, error: null, productsPage: page, productsSearch: search });
    try {
      const { items, total } = await api.getProducts(pageQuery(page, search));
      set({ products: items, productsTotal: total, loading: false });
    } catch (error) {
      set({
        loading: false,
        error: getErrorMessage(error, "Không thể tải sản phẩm"),
      });
    }
  },

  searchProducts: async (search) => {
    try {
      const { items } = await api.getProducts({
        search: search.trim() ? search.trim() : null,
        limit: SEARCH_LIMIT,
        offset: 0,
      });
      return items;
    } catch {
      return [];
    }
  },

  fetchLowStockProducts: async () => {
    try {
      const lowStockProducts = await api.getLowStockProducts(5);
      set({ lowStockProducts });
    } catch {
      set({ lowStockProducts: [] });
    }
  },

  createProduct: async (input) => {
    set({ loading: true, error: null });
    try {
      const product = await api.createProduct(input);
      await get().fetchProducts();
      const dashboardStats = await api.getDashboardStats();
      set({ dashboardStats, loading: false });
      return product;
    } catch (error) {
      set({
        loading: false,
        error: getErrorMessage(error, "Không thể tạo sản phẩm"),
      });
      throw error;
    }
  },

  updateProduct: async (input) => {
    set({ loading: true, error: null });
    try {
      await api.updateProduct(input);
      await get().fetchProducts();
    } catch (error) {
      set({
        loading: false,
        error: getErrorMessage(error, "Không thể cập nhật sản phẩm"),
      });
      throw error;
    }
  },

  deleteProduct: async (id) => {
    set({ loading: true, error: null });
    try {
      await api.deleteProduct(id);
      await get().fetchProducts();
      const dashboardStats = await api.getDashboardStats();
      set({ dashboardStats, loading: false });
    } catch (error) {
      set({
        loading: false,
        error: getErrorMessage(error, "Không thể xóa sản phẩm"),
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
    await get().fetchProducts();
    const dashboardStats = await api.getDashboardStats();
    set({ dashboardStats, loading: false });
    return { ok, failed };
  },

  fetchCustomers: async (opts) => {
    const page = opts?.page ?? get().customersPage;
    const search = opts?.search ?? get().customersSearch;
    set({ customersPage: page, customersSearch: search });
    try {
      const { items, total } = await api.getCustomers(pageQuery(page, search));
      set({ customers: items, customersTotal: total });
    } catch (error) {
      set({
        error: getErrorMessage(error, "Không thể tải khách hàng"),
      });
    }
  },

  searchCustomers: async (search) => {
    try {
      const { items } = await api.getCustomers({
        search: search.trim() ? search.trim() : null,
        limit: SEARCH_LIMIT,
        offset: 0,
      });
      return items;
    } catch {
      return [];
    }
  },

  createCustomer: async (input) => {
    try {
      const customer = await api.createCustomer(input);
      await get().fetchCustomers();
      return customer;
    } catch (error) {
      set({
        error: getErrorMessage(error, "Không thể tạo khách hàng"),
      });
      throw error;
    }
  },

  updateCustomer: async (input) => {
    try {
      await api.updateCustomer(input);
      await get().fetchCustomers();
    } catch (error) {
      set({
        error: getErrorMessage(error, "Không thể cập nhật khách hàng"),
      });
      throw error;
    }
  },

  deleteCustomer: async (id) => {
    try {
      await api.deleteCustomer(id);
      await get().fetchCustomers();
    } catch (error) {
      set({
        error: getErrorMessage(error, "Không thể xóa khách hàng"),
      });
      throw error;
    }
  },

  fetchSuppliers: async (opts) => {
    const page = opts?.page ?? get().suppliersPage;
    const search = opts?.search ?? get().suppliersSearch;
    set({ suppliersPage: page, suppliersSearch: search });
    try {
      const { items, total } = await api.getSuppliers(pageQuery(page, search));
      set({ suppliers: items, suppliersTotal: total });
    } catch (error) {
      set({
        error: getErrorMessage(error, "Không thể tải nhà cung cấp"),
      });
    }
  },

  searchSuppliers: async (search) => {
    try {
      const { items } = await api.getSuppliers({
        search: search.trim() ? search.trim() : null,
        limit: SEARCH_LIMIT,
        offset: 0,
      });
      return items;
    } catch {
      return [];
    }
  },

  createSupplier: async (input) => {
    try {
      const supplier = await api.createSupplier(input);
      await get().fetchSuppliers();
      return supplier;
    } catch (error) {
      set({
        error: getErrorMessage(error, "Không thể tạo nhà cung cấp"),
      });
      throw error;
    }
  },

  updateSupplier: async (input) => {
    try {
      await api.updateSupplier(input);
      await get().fetchSuppliers();
    } catch (error) {
      set({
        error: getErrorMessage(error, "Không thể cập nhật nhà cung cấp"),
      });
      throw error;
    }
  },

  deleteSupplier: async (id) => {
    try {
      await api.deleteSupplier(id);
      await get().fetchSuppliers();
    } catch (error) {
      set({
        error: getErrorMessage(error, "Không thể xóa nhà cung cấp"),
      });
      throw error;
    }
  },

  fetchImportReceipts: async (opts) => {
    const page = opts?.page ?? get().importReceiptsPage;
    const search = opts?.search ?? get().importReceiptsSearch;
    set({ loading: true, error: null, importReceiptsPage: page, importReceiptsSearch: search });
    try {
      const { items, total } = await api.getImportReceipts(pageQuery(page, search));
      set({ importReceipts: items, importReceiptsTotal: total, loading: false });
    } catch (error) {
      set({
        loading: false,
        error: getErrorMessage(error, "Không thể tải phiếu nhập"),
      });
    }
  },

  createImportReceipt: async (input, opts) => {
    set({ loading: true, error: null });
    try {
      await api.createImportReceipt(input);
      if (opts?.refetch) await get().fetchImportReceipts();
      set({ loading: false });
    } catch (error) {
      set({
        loading: false,
        error: getErrorMessage(error, "Không thể tạo phiếu nhập"),
      });
      throw error;
    }
  },

  updateImportReceipt: async (input, opts) => {
    set({ loading: true, error: null });
    try {
      await api.updateImportReceipt(input);
      if (opts?.refetch) await get().fetchImportReceipts();
      set({ loading: false });
    } catch (error) {
      set({
        loading: false,
        error: getErrorMessage(error, "Không thể sửa phiếu nhập"),
      });
      throw error;
    }
  },

  fetchExportReceipts: async (opts) => {
    const page = opts?.page ?? get().exportReceiptsPage;
    const search = opts?.search ?? get().exportReceiptsSearch;
    set({ loading: true, error: null, exportReceiptsPage: page, exportReceiptsSearch: search });
    try {
      const { items, total } = await api.getExportReceipts(pageQuery(page, search));
      set({ exportReceipts: items, exportReceiptsTotal: total, loading: false });
    } catch (error) {
      set({
        loading: false,
        error: getErrorMessage(error, "Không thể tải phiếu xuất"),
      });
    }
  },

  createExportReceipt: async (input, opts) => {
    set({ loading: true, error: null });
    try {
      const receipt = await api.createExportReceipt(input);
      if (opts?.refetch) await get().fetchExportReceipts();
      set({ loading: false });
      return receipt;
    } catch (error) {
      set({
        loading: false,
        error: getErrorMessage(error, "Không thể tạo phiếu xuất"),
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
        error: getErrorMessage(error, "Không thể tải dashboard"),
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
          getErrorMessage(error, "Không thể tải báo cáo lợi nhuận"),
      });
    }
  },
}));
