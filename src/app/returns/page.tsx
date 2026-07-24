"use client";

import { useEffect, useState } from "react";
import { Printer } from "lucide-react";

import { InvoicePrintDialog } from "@/components/receipts/invoice-print-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/format";
import type { ReturnReceipt } from "@/lib/types";
import { useInventoryStore } from "@/stores/inventory-store";
import { useReturnsStore } from "@/stores/returns-store";

export default function ReturnsPage() {
  const { importReceipts, exportReceipts, fetchImportReceipts, fetchExportReceipts } =
    useInventoryStore();
  const { returnReceipts, fetchReturnReceipts } = useReturnsStore();
  const [printReceipt, setPrintReceipt] = useState<ReturnReceipt | null>(null);

  useEffect(() => {
    void fetchReturnReceipts();
    void fetchImportReceipts();
    void fetchExportReceipts();
  }, [fetchReturnReceipts, fetchImportReceipts, fetchExportReceipts]);

  function partnerNameFor(receipt: ReturnReceipt): string {
    if (receipt.return_type === "customer") {
      return (
        exportReceipts.find((r) => r.id === receipt.original_receipt_id)?.customer ??
        "Khách lẻ"
      );
    }
    return (
      importReceipts.find((r) => r.id === receipt.original_receipt_id)?.supplier ?? "-"
    );
  }

  function originalReceiptNumberFor(receipt: ReturnReceipt): string {
    if (receipt.return_type === "customer") {
      return (
        exportReceipts.find((r) => r.id === receipt.original_receipt_id)
          ?.receipt_number ?? "-"
      );
    }
    return (
      importReceipts.find((r) => r.id === receipt.original_receipt_id)
        ?.receipt_number ?? "-"
    );
  }

  return (
    <div>
      <PageHeader
        title="Trả hàng"
        description="Lịch sử khách trả hàng đã mua và trả hàng cho nhà cung cấp — tạo phiếu trả từ nút Trả hàng trên trang Nhập hàng / Hóa đơn."
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
                  <TableCell>{partnerNameFor(receipt)}</TableCell>
                  <TableCell>{originalReceiptNumberFor(receipt)}</TableCell>
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
                    <Button
                      size="icon"
                      variant="ghost"
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

      <InvoicePrintDialog
        open={!!printReceipt}
        onOpenChange={(open) => {
          if (!open) setPrintReceipt(null);
        }}
        type={printReceipt?.return_type === "supplier" ? "supplier_return" : "customer_return"}
        receipt={printReceipt}
        partnerName={printReceipt ? partnerNameFor(printReceipt) : null}
      />
    </div>
  );
}
