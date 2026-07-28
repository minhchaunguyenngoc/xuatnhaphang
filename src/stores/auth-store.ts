import { create } from "zustand";

import { api } from "@/lib/api";
import type { LoginInput, User } from "@/lib/types";
import { getErrorMessage } from "@/lib/errors";

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (input: LoginInput) => Promise<void>;
  logout: () => void;
  hasPermission: (key: string) => boolean;
}

/** Không dùng persist middleware — bắt buộc đăng nhập lại mỗi lần mở app
 * (yêu cầu của khách), state chỉ sống trong bộ nhớ của phiên chạy hiện tại. */
export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: false,
  error: null,

  login: async (input) => {
    set({ loading: true, error: null });
    try {
      const user = await api.login(input);
      set({ user, loading: false });
    } catch (error) {
      set({
        loading: false,
        error: getErrorMessage(error, "Đăng nhập thất bại"),
      });
      throw error;
    }
  },

  logout: () => set({ user: null, error: null }),

  hasPermission: (key) => {
    const user = get().user;
    if (!user) return false;
    return user.is_admin || user.permissions.includes(key);
  },
}));
