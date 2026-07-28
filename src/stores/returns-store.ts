import { create } from "zustand";

import { api } from "@/lib/api";
import { PAGE_SIZE } from "@/stores/inventory-store";
import type { CreateCustomerReturn, CreateSupplierReturn, ReturnReceipt } from "@/lib/types";
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
}));
