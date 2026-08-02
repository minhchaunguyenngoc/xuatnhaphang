"use client";

import { useEffect, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getErrorMessage } from "@/lib/errors";
import { formatCurrency, formatDate, todayISO } from "@/lib/format";
import type { CustomerDebtInvoice, DebtPayment } from "@/lib/types";
import { useDebtsStore } from "@/stores/debts-store";

interface DebtPaymentDialogProps {
  open: boolean;
  invoice: CustomerDebtInvoice | null;
  onOpenChange: (open: boolean) => void;
  /** Cha tự tải lại danh sách hoá đơn còn nợ (và cập nhật lại `invoice` nếu
   * còn nợ) sau mỗi lần ghi nhận/sửa/xoá trả nợ. */
  onChanged: () => Promise<void>;
}

/** Cha truyền `key` theo id hoá đơn (xem trang Công nợ) để component remount
 * và tự có state khởi tạo đúng mỗi lần mở — tránh đồng bộ qua useEffect. */
export function DebtPaymentDialog({
  open,
  invoice,
  onOpenChange,
  onChanged,
}: DebtPaymentDialogProps) {
  const { fetchDebtPayments, createDebtPayment, updateDebtPayment, deleteDebtPayment } =
    useDebtsStore();

  const [payments, setPayments] = useState<DebtPayment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(true);

  const [amount, setAmount] = useState(invoice?.remaining ?? 0);
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editAmount, setEditAmount] = useState(0);
  const [editDate, setEditDate] = useState("");
  const [editNote, setEditNote] = useState("");
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<DebtPayment | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!open || !invoice) return;
    let active = true;
    void fetchDebtPayments(invoice.export_receipt_id)
      .then((list) => {
        if (active) setPayments(list);
      })
      .finally(() => {
        if (active) setLoadingPayments(false);
      });
    return () => {
      active = false;
    };
  }, [open, invoice, fetchDebtPayments]);

  if (!invoice) return null;

  async function reload() {
    const list = await fetchDebtPayments(invoice!.export_receipt_id);
    setPayments(list);
    await onChanged();
  }

  async function handleCreate() {
    if (amount <= 0) {
      toast.error("Số tiền trả phải lớn hơn 0");
      return;
    }
    setSubmitting(true);
    try {
      await createDebtPayment({
        export_receipt_id: invoice!.export_receipt_id,
        amount,
        date,
        note: note.trim() ? note : null,
      });
      toast.success("Đã ghi nhận trả nợ");
      setAmount(0);
      setNote("");
      await reload();
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể ghi nhận trả nợ"));
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(p: DebtPayment) {
    setEditingId(p.id);
    setEditAmount(p.amount);
    setEditDate(p.date);
    setEditNote(p.note ?? "");
  }

  async function saveEdit() {
    if (editingId === null) return;
    if (editAmount <= 0) {
      toast.error("Số tiền trả phải lớn hơn 0");
      return;
    }
    setSaving(true);
    try {
      await updateDebtPayment({
        id: editingId,
        amount: editAmount,
        date: editDate,
        note: editNote.trim() ? editNote : null,
      });
      toast.success("Đã lưu thay đổi");
      setEditingId(null);
      await reload();
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể sửa lần trả nợ"));
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteDebtPayment(deleteTarget.id);
      toast.success("Đã xoá lần trả nợ");
      setDeleteTarget(null);
      await reload();
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể xoá lần trả nợ"));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[95vw] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Trả nợ — hoá đơn {invoice.receipt_number}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3 rounded-lg bg-muted px-4 py-3 text-sm">
            <div>
              <p className="text-muted-foreground">Tổng tiền</p>
              <p className="font-medium">{formatCurrency(invoice.total_amount)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Đã trả</p>
              <p className="font-medium">{formatCurrency(invoice.amount_paid)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Còn nợ</p>
              <p className="font-semibold text-destructive">
                {formatCurrency(invoice.remaining)}
              </p>
            </div>
          </div>

          <div className="space-y-3 rounded-lg border p-4">
            <p className="text-sm font-medium">Ghi nhận trả nợ mới</p>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label>Số tiền trả</Label>
                <Input
                  type="number"
                  min={0}
                  max={invoice.remaining}
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-1">
                <Label>Ngày trả</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Ghi chú</Label>
                <Input value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
            </div>
            <Button
              type="button"
              disabled={submitting || amount <= 0}
              onClick={() => void handleCreate()}
            >
              {submitting ? "Đang lưu..." : "Ghi nhận"}
            </Button>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Lịch sử trả nợ</p>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ngày</TableHead>
                    <TableHead className="text-right">Số tiền</TableHead>
                    <TableHead>Ghi chú</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingPayments ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                        Đang tải...
                      </TableCell>
                    </TableRow>
                  ) : payments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                        Chưa có lần trả nợ nào.
                      </TableCell>
                    </TableRow>
                  ) : (
                    payments.map((p) =>
                      editingId === p.id ? (
                        <TableRow key={p.id}>
                          <TableCell>
                            <Input
                              type="date"
                              className="h-8"
                              value={editDate}
                              onChange={(e) => setEditDate(e.target.value)}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={0}
                              className="h-8 text-right"
                              value={editAmount}
                              onChange={(e) => setEditAmount(Number(e.target.value) || 0)}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              className="h-8"
                              value={editNote}
                              onChange={(e) => setEditNote(e.target.value)}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={saving}
                              onClick={() => setEditingId(null)}
                            >
                              Hủy
                            </Button>
                            <Button size="sm" disabled={saving} onClick={() => void saveEdit()}>
                              {saving ? "Đang lưu..." : "Lưu"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ) : (
                        <TableRow key={p.id}>
                          <TableCell>{formatDate(p.date)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(p.amount)}</TableCell>
                          <TableCell className="max-w-40 truncate">{p.note ?? "-"}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="icon"
                              variant="ghost"
                              title="Sửa"
                              onClick={() => startEdit(p)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              title="Xoá"
                              onClick={() => setDeleteTarget(p)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ),
                    )
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xoá lần trả nợ</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Xoá lần trả {deleteTarget ? formatCurrency(deleteTarget.amount) : ""} ngày{" "}
            {deleteTarget ? formatDate(deleteTarget.date) : ""}? Số nợ tương ứng sẽ được cộng
            lại. Hành động này không thể hoàn tác.
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
    </Dialog>
  );
}
