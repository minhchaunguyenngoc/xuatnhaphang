"use client";

import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserFormDialog } from "@/components/users/user-form-dialog";
import type { User } from "@/lib/types";
import { useAuthStore } from "@/stores/auth-store";
import { useUsersStore } from "@/stores/users-store";

export default function UsersPage() {
  const currentUser = useAuthStore((state) => state.user);
  const { users, permissions, fetchUsers, fetchPermissions, createUser, updateUser, deleteUser } =
    useUsersStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    void fetchUsers();
    void fetchPermissions();
  }, [fetchUsers, fetchPermissions]);

  if (!currentUser?.is_admin) {
    return (
      <div className="py-10 text-center text-muted-foreground">
        Chỉ quản trị viên mới có quyền truy cập trang này.
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Người dùng"
        description="Quản lý tài khoản đăng nhập và phân quyền theo từng chức năng"
        action={
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Thêm người dùng
          </Button>
        }
      />

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên đăng nhập</TableHead>
              <TableHead>Họ tên</TableHead>
              <TableHead>Vai trò</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  Chưa có người dùng nào.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.username}</TableCell>
                  <TableCell>{user.full_name}</TableCell>
                  <TableCell>
                    {user.is_admin ? (
                      <Badge>Quản trị viên</Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        {user.permissions.length} quyền
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.is_active ? (
                      <span className="text-sm">Đang hoạt động</span>
                    ) : (
                      <Badge variant="destructive">Đã khóa</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setEditing(user);
                          setDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        disabled={user.id === currentUser?.id}
                        onClick={() => setDeleteTarget(user)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <UserFormDialog
        key={dialogOpen ? (editing?.id ?? "new") : "closed"}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        user={editing}
        permissions={permissions}
        onSubmit={async (values) => {
          try {
            if (editing) {
              await updateUser({
                id: editing.id,
                username: values.username,
                password: values.password ? values.password : undefined,
                full_name: values.full_name,
                is_admin: values.is_admin,
                is_active: values.is_active,
                permissions: values.permissions,
              });
              toast.success("Đã cập nhật người dùng");
            } else {
              await createUser({
                username: values.username,
                password: values.password,
                full_name: values.full_name,
                is_admin: values.is_admin,
                permissions: values.permissions,
              });
              toast.success("Đã thêm người dùng");
            }
          } catch (error) {
            toast.error(
              error instanceof Error ? error.message : "Không thể lưu người dùng",
            );
            throw error;
          }
        }}
      />

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa người dùng</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Xóa tài khoản &quot;{deleteTarget?.username}&quot;? Hành động này
            không thể hoàn tác.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Hủy
            </Button>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={async () => {
                if (!deleteTarget) return;
                setDeleting(true);
                try {
                  await deleteUser(deleteTarget.id);
                  toast.success("Đã xóa người dùng");
                  setDeleteTarget(null);
                } catch (error) {
                  toast.error(
                    error instanceof Error ? error.message : "Không thể xóa người dùng",
                  );
                } finally {
                  setDeleting(false);
                }
              }}
            >
              {deleting ? "Đang xóa..." : "Xóa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
