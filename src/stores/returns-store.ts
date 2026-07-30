import { create } from "zustand";

import { api } from "@/lib/api";
import { PAGE_SIZE } from "@/stores/inventory-store";
import type {
  CreateCustomerReturn,
  CreateSupplierReturn,
  ReturnReceipt,
  UpdateCustomerReturn,
  UpdateSupplierReturn,
} from "@/lib/types";
import { getErrorMessage } from "@/lib/errors";

interface ReturnsState {
  returnReceipts: ReturnReceipt[];
  returnReceiptsTotal: number;
  returnReceiptsPage: number;
  returnReceiptsSearch: string;
  loading: boolean;
  error: string | null;
  fetchReturnReceipts: (opts?: { page?: number; search?: string }) => Promise<void>;
  createCustomerReturn: (input: CreateCustomerReturn) => Promise<ReturnReceipt>;
  createSupplierReturn: (input: CreateSupplierReturn) => Promise<ReturnReceipt>;
  updateCustomerReturn: (input: UpdateCustomerReturn) => Promise<ReturnReceipt>;
  updateSupplierReturn: (input: UpdateSupplierReturn) => Promise<ReturnReceipt>;
  deleteReturnReceipt: (id: number) => Promise<void>;
}

export const useReturnsStore = create<ReturnsState>((set, get) => ({
  returnReceipts: [],
  returnReceiptsTotal: 0,
  returnReceiptsPage: 1,
  returnReceiptsSearch: "",
  loading: false,
  error: null,

  fetchReturnReceipts: async (opts) => {
    const page = opts?.page ?? get().returnReceiptsPage;
    const search = opts?.search ?? get().returnReceiptsSearch;
    set({
      loading: true,
      error: null,
      returnReceiptsPage: page,
      returnReceiptsSearch: search,
    });
    try {
      const { items, total } = await api.getReturnReceipts({
        search: search.trim() ? search.trim() : null,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      });
      set({ returnReceipts: items, returnReceiptsTotal: total, loading: false });
    } catch (error) {
      set({
        loading: false,
        error: getErrorMessage(error, "Không thể tải phiếu trả hàng"),
      });
    }
  },

  createCustomerReturn: async (input) => {
    set({ loading: true, error: null });
    try {
      const receipt = await api.createCustomerReturn(input);
      await get().fetchReturnReceipts();
      set({ loading: false });
      return receipt;
    } catch (error) {
      set({
        loading: false,
        error: getErrorMessage(error, "Không thể tạo phiếu trả hàng"),
      });
      throw error;
    }
  },

  createSupplierReturn: async (input) => {
    set({ loading: true, error: null });
    try {
      const receipt = await api.createSupplierReturn(input);
      await get().fetchReturnReceipts();
      set({ loading: false });
      return receipt;
    } catch (error) {
      set({
        loading: false,
        error: getErrorMessage(error, "Không thể tạo phiếu trả hàng"),
      });
      throw error;
    }
  },

  updateCustomerReturn: async (input) => {
    set({ loading: true, error: null });
    try {
      const receipt = await api.updateCustomerReturn(input);
      await get().fetchReturnReceipts();
      set({ loading: false });
      return receipt;
    } catch (error) {
      set({
        loading: false,
        error: getErrorMessage(error, "Không thể sửa phiếu trả hàng"),
      });
      throw error;
    }
  },

  updateSupplierReturn: async (input) => {
    set({ loading: true, error: null });
    try {
      const receipt = await api.updateSupplierReturn(input);
      await get().fetchReturnReceipts();
      set({ loading: false });
      return receipt;
    } catch (error) {
      set({
        loading: false,
        error: getErrorMessage(error, "Không thể sửa phiếu trả hàng"),
      });
      throw error;
    }
  },

  deleteReturnReceipt: async (id) => {
    set({ loading: true, error: null });
    try {
      await api.deleteReturnReceipt(id);
      await get().fetchReturnReceipts();
      set({ loading: false });
    } catch (error) {
      set({
        loading: false,
        error: getErrorMessage(error, "Không thể xoá phiếu trả hàng"),
      });
      throw error;
    }
  },
}));
