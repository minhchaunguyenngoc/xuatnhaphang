"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Permission, User } from "@/lib/types";

export interface UserFormValues {
  username: string;
  /** Rỗng khi sửa nghĩa là giữ nguyên mật khẩu hiện tại. */
  password: string;
  full_name: string;
  is_admin: boolean;
  is_active: boolean;
  permissions: string[];
}

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: User | null;
  permissions: Permission[];
  onSubmit: (values: UserFormValues) => Promise<void>;
}

const defaultValues: UserFormValues = {
  username: "",
  password: "",
  full_name: "",
  is_admin: false,
  is_active: true,
  permissions: [],
};

/** Cha truyền `key` theo id user (xem UsersPage) để component remount và tự
 * có state khởi tạo đúng mỗi lần mở — tránh phải đồng bộ qua useEffect. */
export function UserFormDialog({
  open,
  onOpenChange,
  user,
  permissions,
  onSubmit,
}: UserFormDialogProps) {
  const [values, setValues] = useState<UserFormValues>(() =>
    user
      ? {
          username: user.username,
          password: "",
          full_name: user.full_name,
          is_admin: user.is_admin,
          is_active: user.is_active,
          permissions: [...user.permissions],
        }
      : defaultValues,
  );
  const [submitting, setSubmitting] = useState(false);

  function togglePermission(key: string) {
    setValues((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(key)
        ? prev.permissions.filter((p) => p !== key)
        : [...prev.permissions, key],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(values);
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{user ? "Cập nhật người dùng" : "Thêm người dùng"}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tên đăng nhập</Label>
              <Input
                value={values.username}
                onChange={(e) => setValues({ ...values, username: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{user ? "Mật khẩu mới (để trống nếu giữ nguyên)" : "Mật khẩu"}</Label>
              <Input
                type="password"
                value={values.password}
                onChange={(e) => setValues({ ...values, password: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Họ tên</Label>
            <Input
              value={values.full_name}
              onChange={(e) => setValues({ ...values, full_name: e.target.value })}
            />
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={values.is_admin}
                onChange={(e) => setValues({ ...values, is_admin: e.target.checked })}
              />
              Quản trị viên (toàn quyền)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={values.is_active}
                onChange={(e) => setValues({ ...values, is_active: e.target.checked })}
              />
              Đang hoạt động
            </label>
          </div>

          {!values.is_admin ? (
            <div className="space-y-2 rounded-lg border p-3">
              <p className="text-sm font-medium">Quyền được phép</p>
              <div className="grid grid-cols-2 gap-2">
                {permissions.map((permission) => (
                  <label
                    key={permission.key}
                    className="flex items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={values.permissions.includes(permission.key)}
                      onChange={() => togglePermission(permission.key)}
                    />
                    {permission.label}
                  </label>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Tài khoản quản trị viên tự động có toàn bộ quyền.
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Đang lưu..." : "Lưu"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
