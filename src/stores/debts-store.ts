import { create } from "zustand";

import { api } from "@/lib/api";
import type {
  CreateDebtPayment,
  Customer,
  CustomerDebtInvoice,
  DebtPayment,
  UpdateDebtPayment,
} from "@/lib/types";
import { getErrorMessage } from "@/lib/errors";

interface DebtsState {
  customersWithDebt: Customer[];
  loading: boolean;
  error: string | null;
  fetchCustomersWithDebt: () => Promise<void>;
  // Từng khách hàng tự tra hoá đơn còn nợ + lịch sử trả nợ khi mở ra xem,
  // không giữ trong state chung — tránh phải đồng bộ lại toàn bộ khi 1 khách
  // thay đổi.
  fetchCustomerDebtInvoices: (customerId: number) => Promise<CustomerDebtInvoice[]>;
  fetchDebtPayments: (exportReceiptId: number) => Promise<DebtPayment[]>;
  createDebtPayment: (input: CreateDebtPayment) => Promise<DebtPayment>;
  updateDebtPayment: (input: UpdateDebtPayment) => Promise<DebtPayment>;
  deleteDebtPayment: (id: number) => Promise<void>;
}

export const useDebtsStore = create<DebtsState>((set, get) => ({
  customersWithDebt: [],
  loading: false,
  error: null,

  fetchCustomersWithDebt: async () => {
    set({ loading: true, error: null });
    try {
      const customersWithDebt = await api.getCustomersWithDebt();
      set({ customersWithDebt, loading: false });
    } catch (error) {
      set({
        loading: false,
        error: getErrorMessage(error, "Không thể tải danh sách công nợ"),
      });
    }
  },

  fetchCustomerDebtInvoices: (customerId) => api.getCustomerDebtInvoices(customerId),

  fetchDebtPayments: (exportReceiptId) => api.getDebtPayments(exportReceiptId),

  createDebtPayment: async (input) => {
    set({ loading: true, error: null });
    try {
      const payment = await api.createDebtPayment(input);
      await get().fetchCustomersWithDebt();
      set({ loading: false });
      return payment;
    } catch (error) {
      set({
        loading: false,
        error: getErrorMessage(error, "Không thể ghi nhận trả nợ"),
      });
      throw error;
    }
  },

  updateDebtPayment: async (input) => {
    set({ loading: true, error: null });
    try {
      const payment = await api.updateDebtPayment(input);
      await get().fetchCustomersWithDebt();
      set({ loading: false });
      return payment;
    } catch (error) {
      set({
        loading: false,
        error: getErrorMessage(error, "Không thể sửa lần trả nợ"),
      });
      throw error;
    }
  },

  deleteDebtPayment: async (id) => {
    set({ loading: true, error: null });
    try {
      await api.deleteDebtPayment(id);
      await get().fetchCustomersWithDebt();
      set({ loading: false });
    } catch (error) {
      set({
        loading: false,
        error: getErrorMessage(error, "Không thể xoá lần trả nợ"),
      });
      throw error;
    }
  },
}));
