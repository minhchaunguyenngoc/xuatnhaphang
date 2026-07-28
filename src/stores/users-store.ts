import { create } from "zustand";

import { api } from "@/lib/api";
import type { CreateUser, Permission, UpdateUser, User } from "@/lib/types";
import { getErrorMessage } from "@/lib/errors";

interface UsersState {
  users: User[];
  permissions: Permission[];
  loading: boolean;
  error: string | null;
  fetchUsers: () => Promise<void>;
  fetchPermissions: () => Promise<void>;
  createUser: (input: CreateUser) => Promise<User>;
  updateUser: (input: UpdateUser) => Promise<User>;
  deleteUser: (id: number) => Promise<void>;
}

export const useUsersStore = create<UsersState>((set) => ({
  users: [],
  permissions: [],
  loading: false,
  error: null,

  fetchUsers: async () => {
    set({ loading: true, error: null });
    try {
      const users = await api.getUsers();
      set({ users, loading: false });
    } catch (error) {
      set({
        loading: false,
        error: getErrorMessage(error, "Không thể tải người dùng"),
      });
    }
  },

  fetchPermissions: async () => {
    try {
      const permissions = await api.getPermissions();
      set({ permissions });
    } catch {
      set({ permissions: [] });
    }
  },

  createUser: async (input) => {
    try {
      const user = await api.createUser(input);
      set({ users: await api.getUsers() });
      return user;
    } catch (error) {
      set({
        error: getErrorMessage(error, "Không thể tạo người dùng"),
      });
      throw error;
    }
  },

  updateUser: async (input) => {
    try {
      const user = await api.updateUser(input);
      set({ users: await api.getUsers() });
      return user;
    } catch (error) {
      set({
        error: getErrorMessage(error, "Không thể cập nhật người dùng"),
      });
      throw error;
    }
  },

  deleteUser: async (id) => {
    try {
      await api.deleteUser(id);
      set({ users: await api.getUsers() });
    } catch (error) {
      set({
        error: getErrorMessage(error, "Không thể xóa người dùng"),
      });
      throw error;
    }
  },
}));
