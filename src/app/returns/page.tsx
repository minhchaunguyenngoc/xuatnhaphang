"use client";

import { useEffect, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { Printer } from "lucide-react";

import { InvoicePrintDialog } from "@/components/receipts/invoice-print-dialog";
import { Pagination } from "@/components/shared/pagination";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
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
import { formatCurrency, formatDate } from "@/lib/format";
import type { ReturnReceipt } from "@/lib/types";
import { useReturnsStore } from "@/stores/returns-store";

export default function ReturnsPage() {
  const {
    returnReceipts,
    returnReceiptsTotal,
    returnReceiptsPage,
    fetchReturnReceipts,
  } = useReturnsStore(
    useShallow((s) => ({
      returnReceipts: s.returnReceipts,
      returnReceiptsTotal: s.returnReceiptsTotal,
      returnReceiptsPage: s.returnReceiptsPage,
      fetchReturnReceipts: s.fetchReturnReceipts,
    })),
  );
  const [printReceipt, setPrintReceipt] = useState<ReturnReceipt | null>(null);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);

  useEffect(() => {
    void fetchReturnReceipts({ page: 1, search: debouncedSearch });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

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
      <Pagination
        page={returnReceiptsPage}
        total={returnReceiptsTotal}
        onPageChange={(page) => void fetchReturnReceipts({ page })}
      />

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
    </div>
  );
}
