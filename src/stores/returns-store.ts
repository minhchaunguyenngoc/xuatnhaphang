import { create } from "zustand";

import { api } from "@/lib/api";
import type { CreateCustomerReturn, CreateSupplierReturn, ReturnReceipt } from "@/lib/types";

interface ReturnsState {
  returnReceipts: ReturnReceipt[];
  loading: boolean;
  error: string | null;
  fetchReturnReceipts: () => Promise<void>;
  createCustomerReturn: (input: CreateCustomerReturn) => Promise<ReturnReceipt>;
  createSupplierReturn: (input: CreateSupplierReturn) => Promise<ReturnReceipt>;
}

export const useReturnsStore = create<ReturnsState>((set) => ({
  returnReceipts: [],
  loading: false,
  error: null,

  fetchReturnReceipts: async () => {
    set({ loading: true, error: null });
    try {
      const returnReceipts = await api.getReturnReceipts();
      set({ returnReceipts, loading: false });
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : "Không thể tải phiếu trả hàng",
      });
    }
  },

  createCustomerReturn: async (input) => {
    set({ loading: true, error: null });
    try {
      const receipt = await api.createCustomerReturn(input);
      const returnReceipts = await api.getReturnReceipts();
      set({ returnReceipts, loading: false });
      return receipt;
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : "Không thể tạo phiếu trả hàng",
      });
      throw error;
    }
  },

  createSupplierReturn: async (input) => {
    set({ loading: true, error: null });
    try {
      const receipt = await api.createSupplierReturn(input);
      const returnReceipts = await api.getReturnReceipts();
      set({ returnReceipts, loading: false });
      return receipt;
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : "Không thể tạo phiếu trả hàng",
      });
      throw error;
    }
  },
}));
