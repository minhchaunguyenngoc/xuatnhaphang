"use client";

import { useEffect, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { SupplierFormDialog } from "@/components/suppliers/supplier-form-dialog";
import { Pagination } from "@/components/shared/pagination";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { formatCurrency } from "@/lib/format";
import type { Supplier } from "@/lib/types";
import { useInventoryStore } from "@/stores/inventory-store";

export default function SuppliersPage() {
  const {
    suppliers,
    suppliersTotal,
    suppliersPage,
    fetchSuppliers,
    createSupplier,
    updateSupplier,
    deleteSupplier,
  } = useInventoryStore(
    useShallow((s) => ({
      suppliers: s.suppliers,
      suppliersTotal: s.suppliersTotal,
      suppliersPage: s.suppliersPage,
      fetchSuppliers: s.fetchSuppliers,
      createSupplier: s.createSupplier,
      updateSupplier: s.updateSupplier,
      deleteSupplier: s.deleteSupplier,
    })),
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);

  useEffect(() => {
    void fetchSuppliers({ page: 1, search: debouncedSearch });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  return (
    <div>
      <PageHeader
        title="Nhà cung cấp"
        description="Quản lý nhà cung cấp và theo dõi tổng giá trị đã nhập"
        action={
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Thêm nhà cung cấp
          </Button>
        }
      />

      <Input
        placeholder="Tìm theo mã hoặc tên nhà cung cấp"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 max-w-sm"
      />

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã</TableHead>
              <TableHead>Tên nhà cung cấp</TableHead>
              <TableHead>Điện thoại</TableHead>
              <TableHead>Địa chỉ</TableHead>
              <TableHead className="text-right">Tổng nhập</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {suppliers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  Chưa có nhà cung cấp nào.
                </TableCell>
              </TableRow>
            ) : (
              suppliers.map((supplier) => (
                <TableRow key={supplier.id}>
                  <TableCell className="font-medium">{supplier.code}</TableCell>
                  <TableCell>{supplier.name}</TableCell>
                  <TableCell>{supplier.phone ?? "-"}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {supplier.address ?? "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(supplier.total_purchased)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setEditing(supplier);
                          setDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeleteTarget(supplier)}
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
      <Pagination
        page={suppliersPage}
        total={suppliersTotal}
        onPageChange={(page) => void fetchSuppliers({ page })}
      />

      <SupplierFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        supplier={editing}
        onSubmit={async (values) => {
          try {
            if (editing) {
              await updateSupplier({ id: editing.id, ...values });
              toast.success("Đã cập nhật nhà cung cấp");
            } else {
              await createSupplier(values);
              toast.success("Đã thêm nhà cung cấp");
            }
          } catch {
            toast.error("Không thể lưu nhà cung cấp (mã có thể đã tồn tại)");
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
            <DialogTitle>Xóa nhà cung cấp</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Xóa nhà cung cấp &quot;{deleteTarget?.name}&quot;? Hành động này không
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
                  await deleteSupplier(deleteTarget.id);
                  toast.success("Đã xóa nhà cung cấp");
                  setDeleteTarget(null);
                } catch {
                  toast.error("Không thể xóa nhà cung cấp");
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
