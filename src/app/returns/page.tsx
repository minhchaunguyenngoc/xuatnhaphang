"use client";

import { useEffect, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { Pencil, Printer, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { InvoicePrintDialog } from "@/components/receipts/invoice-print-dialog";
import { ReturnFormDialog } from "@/components/receipts/return-form-dialog";
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
import { getErrorMessage } from "@/lib/errors";
import { api } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/format";
import type { ExportReceipt, ImportReceipt, ReturnReceipt } from "@/lib/types";
import { useAuthStore } from "@/stores/auth-store";
import { useReturnsStore } from "@/stores/returns-store";

export default function ReturnsPage() {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canEdit = hasPermission("returns.edit");
  const canDelete = hasPermission("returns.delete");

  const {
    returnReceipts,
    returnReceiptsTotal,
    returnReceiptsPage,
    fetchReturnReceipts,
    updateCustomerReturn,
    updateSupplierReturn,
    deleteReturnReceipt,
  } = useReturnsStore(
    useShallow((s) => ({
      returnReceipts: s.returnReceipts,
      returnReceiptsTotal: s.returnReceiptsTotal,
      returnReceiptsPage: s.returnReceiptsPage,
      fetchReturnReceipts: s.fetchReturnReceipts,
      updateCustomerReturn: s.updateCustomerReturn,
      updateSupplierReturn: s.updateSupplierReturn,
      deleteReturnReceipt: s.deleteReturnReceipt,
    })),
  );
  const [printReceipt, setPrintReceipt] = useState<ReturnReceipt | null>(null);
  const [editingReceipt, setEditingReceipt] = useState<ReturnReceipt | null>(null);
  // Phiếu gốc (bán/nhập) của phiếu đang sửa — ReturnFormDialog cần đủ dòng
  // hàng + đơn giá gốc, dữ liệu này không có sẵn trong ReturnReceipt.
  const [editingOriginal, setEditingOriginal] = useState<
    ExportReceipt | ImportReceipt | null
  >(null);
  const [loadingOriginal, setLoadingOriginal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ReturnReceipt | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);

  useEffect(() => {
    void fetchReturnReceipts({ page: 1, search: debouncedSearch });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  async function openEdit(receipt: ReturnReceipt) {
    setLoadingOriginal(true);
    try {
      const original =
        receipt.return_type === "customer"
          ? await api.getExportReceiptById(receipt.original_receipt_id)
          : await api.getImportReceiptById(receipt.original_receipt_id);
      setEditingOriginal(original);
      setEditingReceipt(receipt);
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể mở phiếu gốc để sửa"));
    } finally {
      setLoadingOriginal(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteReturnReceipt(deleteTarget.id);
      toast.success("Đã xoá phiếu trả hàng");
      setDeleteTarget(null);
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể xoá phiếu trả hàng"));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Trả hàng"
        description="Lịch sử khách trả hàng đã mua và trả hàng cho nhà cung cấp — tạo phiếu trả từ nút Trả hàng trên trang Nhập hàng / Hóa đơn."
      />

      <Input
        placeholder="Tìm theo số phiếu trả (gõ từ đầu số phiếu)"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 max-w-sm"
      />

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Số phiếu</TableHead>
              <TableHead>Ngày</TableHead>
              <TableHead>Loại</TableHead>
              <TableHead>Đối tác</TableHead>
              <TableHead>Phiếu gốc</TableHead>
              <TableHead>Mặt hàng</TableHead>
              <TableHead className="text-right">Giá trị</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {returnReceipts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                  Chưa có phiếu trả hàng nào.
                </TableCell>
              </TableRow>
            ) : (
              returnReceipts.map((receipt) => (
                <TableRow key={receipt.id}>
                  <TableCell className="font-medium">{receipt.receipt_number}</TableCell>
                  <TableCell>{formatDate(receipt.date)}</TableCell>
                  <TableCell>
                    {receipt.return_type === "customer" ? "Khách trả" : "Trả NCC"}
                  </TableCell>
                  <TableCell>
                    {receipt.partner_name ??
                      (receipt.return_type === "customer" ? "Khách lẻ" : "-")}
                  </TableCell>
                  <TableCell>{receipt.original_receipt_number ?? "-"}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {receipt.items.length === 0
                      ? "-"
                      : receipt.items
                          .map((item) => `${item.product_name} (${item.quantity})`)
                          .join(", ")}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(receipt.total_amount)}
                  </TableCell>
                  <TableCell className="text-right">
                    {canEdit ? (
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Sửa"
                        disabled={loadingOriginal}
                        onClick={() => void openEdit(receipt)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    ) : null}
                    {canDelete ? (
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Xoá"
                        onClick={() => setDeleteTarget(receipt)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : null}
                    <Button
                      size="icon"
                      variant="ghost"
                      title="In"
                      onClick={() => setPrintReceipt(receipt)}
                    >
                      <Printer className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <Pagination
        page={returnReceiptsPage}
        total={returnReceiptsTotal}
        onPageChange={(page) => void fetchReturnReceipts({ page })}
      />

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xoá phiếu trả hàng</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Xoá phiếu trả &quot;{deleteTarget?.receipt_number}&quot;? Tồn kho và
            công nợ liên quan sẽ được khôi phục lại như trước khi trả. Hành
            động này không thể hoàn tác.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Hủy
            </Button>
            <Button variant="destructive" disabled={deleting} onClick={() => void confirmDelete()}>
              {deleting ? "Đang xoá..." : "Xoá"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <InvoicePrintDialog
        open={!!printReceipt}
        onOpenChange={(open) => {
          if (!open) setPrintReceipt(null);
        }}
        type={printReceipt?.return_type === "supplier" ? "supplier_return" : "customer_return"}
        receipt={printReceipt}
        partnerName={
          printReceipt?.partner_name ??
          (printReceipt?.return_type === "customer" ? "Khách lẻ" : null)
        }
      />

      <ReturnFormDialog
        key={editingReceipt ? editingReceipt.id : "closed"}
        open={!!editingReceipt && !!editingOriginal}
        onOpenChange={(open) => {
          if (!open) {
            setEditingReceipt(null);
            setEditingOriginal(null);
          }
        }}
        returnType={editingReceipt?.return_type ?? "customer"}
        originalReceipt={editingOriginal}
        returnReceipts={returnReceipts}
        editingReceipt={editingReceipt}
        onSubmit={async (values) => {
          if (!editingReceipt) return;
          try {
            if (editingReceipt.return_type === "customer") {
              await updateCustomerReturn({
                id: editingReceipt.id,
                receipt_number: values.receipt_number,
                date: values.date,
                note: values.note,
                items: values.items,
              });
            } else {
              await updateSupplierReturn({
                id: editingReceipt.id,
                receipt_number: values.receipt_number,
                date: values.date,
                note: values.note,
                items: values.items,
              });
            }
            toast.success("Đã lưu thay đổi phiếu trả hàng");
          } catch (error) {
            toast.error(getErrorMessage(error, "Không thể sửa phiếu trả hàng"));
            throw error;
          }
        }}
      />
    </div>
  );
}
