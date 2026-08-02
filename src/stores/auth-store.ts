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

  // Backend giữ 1 "session" riêng để tự chặn quyền (không chỉ ẩn nút ở giao
  // diện) — phải báo cho nó biết đã đăng xuất, không thì lệnh Tauri vẫn chạy
  // được dưới quyền của người vừa đăng xuất cho tới khi ai đó đăng nhập lại.
  logout: () => {
    void api.logout();
    set({ user: null, error: null });
  },

  hasPermission: (key) => {
    const user = get().user;
    if (!user) return false;
    return user.is_admin || user.permissions.includes(key);
  },
}));
