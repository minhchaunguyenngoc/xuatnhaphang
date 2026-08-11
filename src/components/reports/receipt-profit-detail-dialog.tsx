"use client";

import { useEffect, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { formatCurrency, formatDate } from "@/lib/format";
import type { ExportReceipt, ReceiptProfitRow } from "@/lib/types";

interface ReceiptProfitDetailDialogProps {
  /** Dòng đang xem; `null` = đóng dialog. */
  row: ReceiptProfitRow | null;
  onClose: () => void;
}

/** Chi tiết lợi nhuận từng dòng hàng của một hoá đơn.
 *
 * Chỉ tải các dòng hàng khi người dùng thực sự mở một hoá đơn — bảng báo cáo có
 * thể dài hàng nghìn dòng, tải sẵn chi tiết cho tất cả là lãng phí. */
export function ReceiptProfitDetailDialog({
  row,
  onClose,
}: ReceiptProfitDetailDialogProps) {
  // Kết quả được gắn kèm id hoá đơn thay vì xoá trắng state ở đầu effect: mở
  // sang hoá đơn khác là phần dưới tự coi như chưa có dữ liệu, không phải gọi
  // setState đồng bộ trong effect (React sẽ render thừa một lượt).
  const [loaded, setLoaded] = useState<{ id: number; receipt: ExportReceipt } | null>(
    null,
  );
  const [failed, setFailed] = useState<{ id: number; message: string } | null>(null);

  useEffect(() => {
    if (!row) return;
    let active = true;
    const id = row.receipt_id;
    api
      .getExportReceiptById(id)
      .then((data) => {
        if (active) setLoaded({ id, receipt: data });
      })
      .catch((e) => {
        if (active) {
          setFailed({ id, message: getErrorMessage(e, "Không tải được chi tiết hoá đơn") });
        }
      });
    return () => {
      active = false;
    };
  }, [row]);

  const receipt = row && loaded?.id === row.receipt_id ? loaded.receipt : null;
  const error = row && failed?.id === row.receipt_id ? failed.message : null;

  return (
    <Dialog open={row !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Hoá đơn {row?.receipt_number}</DialogTitle>
          <DialogDescription>
            {row ? formatDate(row.date) : ""}
            {row?.customer ? ` · ${row.customer}` : " · Khách lẻ"}
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : !receipt ? (
          <p className="text-sm text-muted-foreground">Đang tải...</p>
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã SP</TableHead>
                    <TableHead>Tên SP</TableHead>
                    <TableHead className="text-right">SL</TableHead>
                    <TableHead className="text-right">Đơn giá</TableHead>
                    <TableHead className="text-right">Giá vốn</TableHead>
                    <TableHead className="text-right">Lợi nhuận</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receipt.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.product_code}</TableCell>
                      <TableCell>{item.product_name}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.unit_price)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.cost_price)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(
                          (item.unit_price - item.cost_price) * item.quantity,
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Lợi nhuận từng dòng ở trên tính theo giá niêm yết. Chiết khấu và
                hàng trả là mức PHIẾU nên chỉ trừ được ở đây — cộng dồn cột
                "Lợi nhuận" phía trên sẽ lớn hơn số cuối cùng đúng bằng 2 khoản
                này. */}
            {row ? (
              <dl className="grid gap-2 rounded-lg border p-4 text-sm sm:grid-cols-2">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Tổng tiền hàng</dt>
                  <dd>{formatCurrency(row.items_total)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Chiết khấu phiếu</dt>
                  <dd>−{formatCurrency(row.discount)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Khách trả lại</dt>
                  <dd>−{formatCurrency(row.returned_revenue)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Doanh thu thực</dt>
                  <dd>{formatCurrency(row.revenue)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Giá vốn</dt>
                  <dd>{formatCurrency(row.cost)}</dd>
                </div>
                <div className="flex justify-between gap-4 font-medium">
                  <dt>Lợi nhuận</dt>
                  <dd>
                    {formatCurrency(row.profit)}{" "}
                    <span className="text-muted-foreground">
                      ({row.margin_percent.toFixed(1)}%)
                    </span>
                  </dd>
                </div>
              </dl>
            ) : null}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
