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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, generateReceiptNumber, todayISO } from "@/lib/format";
import type {
  ExportReceipt,
  ImportReceipt,
  ReturnReceipt,
  ReturnType,
} from "@/lib/types";

interface ReturnFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnType: ReturnType;
  /** Phiếu gốc (phiếu bán cho trả hàng khách, phiếu nhập cho trả NCC). */
  originalReceipt: ExportReceipt | ImportReceipt | null;
  /** Toàn bộ phiếu trả đã có, để tính số lượng còn được trả cho mỗi dòng. */
  returnReceipts: ReturnReceipt[];
  onSubmit: (values: {
    receipt_number: string;
    original_receipt_id: number;
    date: string;
    note?: string | null;
    items: { original_item_id: number; product_id: number; quantity: number }[];
  }) => Promise<void>;
}

/** Cha truyền `key` theo id phiếu gốc (xem imports/exports page) để component
 * remount và tự có state khởi tạo đúng mỗi lần mở — tránh đồng bộ qua useEffect. */
export function ReturnFormDialog({
  open,
  onOpenChange,
  returnType,
  originalReceipt,
  returnReceipts,
  onSubmit,
}: ReturnFormDialogProps) {
  const prefix = returnType === "customer" ? "PTK" : "PTN";
  const [receiptNumber, setReceiptNumber] = useState(() => generateReceiptNumber(prefix));
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [submitting, setSubmitting] = useState(false);

  if (!originalReceipt) return null;

  const alreadyReturned = (originalItemId: number) =>
    returnReceipts
      .filter((r) => r.return_type === returnType)
      .flatMap((r) => r.items)
      .filter((item) => item.original_item_id === originalItemId)
      .reduce((sum, item) => sum + item.quantity, 0);

  const lines = originalReceipt.items.map((item) => {
    const returned = alreadyReturned(item.id);
    const maxReturnable = Math.max(item.quantity - returned, 0);
    return {
      original_item_id: item.id,
      product_id: item.product_id,
      product_code: item.product_code,
      product_name: item.product_name,
      original_quantity: item.quantity,
      already_returned: returned,
      max_returnable: maxReturnable,
      unit_price: item.unit_price,
    };
  });

  const selectedItems = lines
    .map((line) => ({
      original_item_id: line.original_item_id,
      product_id: line.product_id,
      quantity: quantities[line.original_item_id] ?? 0,
    }))
    .filter((item) => item.quantity > 0);

  const total = selectedItems.reduce((sum, item) => {
    const line = lines.find((l) => l.original_item_id === item.original_item_id);
    return sum + item.quantity * (line?.unit_price ?? 0);
  }, 0);

  const hasNothingToReturn = lines.every((line) => line.max_returnable === 0);

  async function handleSubmit() {
    if (!originalReceipt) return;
    setSubmitting(true);
    try {
      await onSubmit({
        receipt_number: receiptNumber,
        original_receipt_id: originalReceipt.id,
        date,
        note,
        items: selectedItems,
      });
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[95vw] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            {returnType === "customer"
              ? "Trả hàng khách"
              : "Trả hàng nhà cung cấp"}{" "}
            — phiếu gốc {originalReceipt.receipt_number}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Số phiếu trả</Label>
              <Input
                value={receiptNumber}
                onChange={(e) => setReceiptNumber(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Ngày trả</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã SP</TableHead>
                  <TableHead>Tên sản phẩm</TableHead>
                  <TableHead className="text-right">
                    Đã {returnType === "customer" ? "bán" : "nhập"}
                  </TableHead>
                  <TableHead className="text-right">Đã trả</TableHead>
                  <TableHead className="text-right">Số lượng trả</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line) => (
                  <TableRow key={line.original_item_id}>
                    <TableCell>{line.product_code}</TableCell>
                    <TableCell>{line.product_name}</TableCell>
                    <TableCell className="text-right">
                      {line.original_quantity}
                    </TableCell>
                    <TableCell className="text-right">
                      {line.already_returned}
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        min={0}
                        max={line.max_returnable}
                        disabled={line.max_returnable === 0}
                        className="ml-auto w-24 text-right"
                        value={quantities[line.original_item_id] ?? 0}
                        onChange={(e) => {
                          const raw = Number(e.target.value) || 0;
                          const clamped = Math.min(
                            Math.max(raw, 0),
                            line.max_returnable,
                          );
                          setQuantities({
                            ...quantities,
                            [line.original_item_id]: clamped,
                          });
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {hasNothingToReturn ? (
            <p className="text-sm text-muted-foreground">
              Phiếu này đã được trả hết, không còn gì để trả thêm.
            </p>
          ) : null}

          <div className="space-y-2">
            <Label>Ghi chú</Label>
            <Textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg bg-muted px-4 py-3">
            <span className="text-sm text-muted-foreground">
              Giá trị hàng trả
            </span>
            <span className="text-lg font-semibold">{formatCurrency(total)}</span>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button
            type="button"
            disabled={submitting || selectedItems.length === 0}
            onClick={handleSubmit}
          >
            {submitting ? "Đang lưu..." : "Lưu phiếu trả"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
