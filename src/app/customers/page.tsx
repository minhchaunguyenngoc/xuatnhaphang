"use client";

import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { CustomerFormDialog } from "@/components/customers/customer-form-dialog";
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
import { formatCurrency } from "@/lib/format";
import type { Customer } from "@/lib/types";
import { useInventoryStore } from "@/stores/inventory-store";

export default function CustomersPage() {
  const {
    customers,
    fetchCustomers,
    createCustomer,
    updateCustomer,
    deleteCustomer,
  } = useInventoryStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    void fetchCustomers();
  }, [fetchCustomers]);

  return (
    <div>
      <PageHeader
        title="Khách hàng"
        description="Quản lý khách hàng, theo dõi công nợ và tổng mua"
        action={
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Thêm khách hàng
          </Button>
        }
      />

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã</TableHead>
              <TableHead>Tên khách hàng</TableHead>
              <TableHead>Điện thoại</TableHead>
              <TableHead>Địa chỉ</TableHead>
              <TableHead className="text-right">Tổng mua</TableHead>
              <TableHead className="text-right">Công nợ</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  Chưa có khách hàng nào.
                </TableCell>
              </TableRow>
            ) : (
              customers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">{customer.code}</TableCell>
                  <TableCell>{customer.name}</TableCell>
                  <TableCell>{customer.phone ?? "-"}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {customer.address ?? "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(customer.total_spent)}
                  </TableCell>
                  <TableCell className="text-right">
                    {customer.debt > 0 ? (
                      <Badge variant="destructive">
                        {formatCurrency(customer.debt)}
                      </Badge>
                    ) : (
                      formatCurrency(customer.debt)
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setEditing(customer);
                          setDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeleteTarget(customer)}
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

      <CustomerFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        customer={editing}
        onSubmit={async (values) => {
          try {
            if (editing) {
              await updateCustomer({ id: editing.id, ...values });
              toast.success("Đã cập nhật khách hàng");
            } else {
              await createCustomer(values);
              toast.success("Đã thêm khách hàng");
            }
          } catch {
            toast.error("Không thể lưu khách hàng (mã có thể đã tồn tại)");
            throw new Error("save failed");
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
            <DialogTitle>Xóa khách hàng</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Xóa khách hàng &quot;{deleteTarget?.name}&quot;? Hành động này không
            thể hoàn tác.
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
                  await deleteCustomer(deleteTarget.id);
                  toast.success("Đã xóa khách hàng");
                  setDeleteTarget(null);
                } catch {
                  toast.error("Không thể xóa khách hàng");
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
