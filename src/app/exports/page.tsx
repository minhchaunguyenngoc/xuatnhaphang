"use client";

import { useEffect, useState } from "react";
import { Plus, Printer, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";

import { InvoicePrintDialog } from "@/components/receipts/invoice-print-dialog";
import { ReceiptFormDialog } from "@/components/receipts/receipt-form-dialog";
import { ReturnFormDialog } from "@/components/receipts/return-form-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
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
import type { ExportReceipt } from "@/lib/types";
import { useAuthStore } from "@/stores/auth-store";
import { useInventoryStore } from "@/stores/inventory-store";
import { useReturnsStore } from "@/stores/returns-store";
import { getErrorMessage } from "@/lib/errors";

export default function ExportsPage() {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canCreate = hasPermission("exports.create");
  const canReturn = hasPermission("returns.customer");
  // useShallow: không có nó thì mọi `set()` trong store (kể cả set loading của
  // trang khác) đều re-render lại toàn bộ cây trang này.
  const {
    exportReceipts,
    exportReceiptsTotal,
    exportReceiptsPage,
    fetchExportReceipts,
    searchCustomers,
    createExportReceipt,
  } = useInventoryStore(
    useShallow((s) => ({
      exportReceipts: s.exportReceipts,
      exportReceiptsTotal: s.exportReceiptsTotal,
      exportReceiptsPage: s.exportReceiptsPage,
      fetchExportReceipts: s.fetchExportReceipts,
      searchCustomers: s.searchCustomers,
      createExportReceipt: s.createExportReceipt,
    })),
  );
  const { returnReceipts, fetchReturnReceipts, createCustomerReturn } =
    useReturnsStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [printReceipt, setPrintReceipt] = useState<ExportReceipt | null>(null);
  const [printPartner, setPrintPartner] = useState<{
    phone: string | null;
    address: string | null;
  } | null>(null);
  const [returningReceipt, setReturningReceipt] = useState<ExportReceipt | null>(
    null,
  );
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);

  useEffect(() => {
    void fetchReturnReceipts();
  }, [fetchReturnReceipts]);

  useEffect(() => {
    void fetchExportReceipts({ page: 1, search: debouncedSearch });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  return (
    <div>
      <PageHeader
        title="Hóa đơn bán hàng"
        description="Danh sách hóa đơn bán/xuất kho. Bán nhanh tại màn hình Bán hàng (POS)."
        action={
          canCreate ? (
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Tạo hóa đơn
            </Button>
          ) : null
        }
      />

      <Input
        placeholder="Tìm theo số phiếu (gõ từ đầu số phiếu)"
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
              <TableHead>Khách hàng</TableHead>
              <TableHead>Mặt hàng</TableHead>
              <TableHead className="text-right">Tổng tiền</TableHead>
              <TableHead>Ghi chú</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {exportReceipts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  Chưa có phiếu xuất nào.
                </TableCell>
              </TableRow>
            ) : (
              exportReceipts.map((receipt) => (
                <TableRow key={receipt.id}>
                  <TableCell className="font-medium">{receipt.receipt_number}</TableCell>
                  <TableCell>{formatDate(receipt.date)}</TableCell>
                  <TableCell>{receipt.customer ?? "-"}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {receipt.items.length === 0
                      ? "-"
                      : receipt.items
                          .map(
                            (item) =>
                              `${item.product_name} (${item.quantity})`,
                          )
                          .join(", ")}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(receipt.total_amount)}
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {receipt.note ?? "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    {canReturn ? (
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Trả hàng"
                        onClick={() => setReturningReceipt(receipt)}
                      >
                        <Undo2 className="h-4 w-4" />
                      </Button>
                    ) : null}
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={async () => {
                        if (receipt.customer_id) {
                          try {
                            const c = await api.getCustomerById(receipt.customer_id);
                            setPrintPartner({ phone: c.phone, address: c.address });
                          } catch {
                            setPrintPartner(null);
                          }
                        } else {
                          setPrintPartner(null);
                        }
                        setPrintReceipt(receipt);
                      }}
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
        page={exportReceiptsPage}
        total={exportReceiptsTotal}
        onPageChange={(page) => void fetchExportReceipts({ page })}
      />

      <InvoicePrintDialog
        open={!!printReceipt}
        onOpenChange={(open) => {
          if (!open) setPrintReceipt(null);
        }}
        type="export"
        receipt={printReceipt}
        partner={printPartner}
      />

      <ReceiptFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        type="export"
        partnerSearch={searchCustomers}
        onSubmit={async (values) => {
          try {
            const total = values.items.reduce(
              (sum, item) => sum + item.quantity * item.unit_price,
              0,
            );
            await createExportReceipt(
              {
                receipt_number: values.receipt_number,
                date: values.date,
                customer: values.customer,
                customer_id: values.partner_id ?? null,
                discount: 0,
                amount_paid: total,
                payment_method: "cash",
                note: values.note,
                items: values.items,
              },
              { refetch: true },
            );
            toast.success("Đã tạo phiếu xuất");
          } catch (error) {
            toast.error(
              getErrorMessage(error, "Không thể tạo phiếu xuất"),
            );
            throw error;
          }
        }}
      />

      <ReturnFormDialog
        key={returningReceipt ? returningReceipt.id : "closed"}
        open={!!returningReceipt}
        onOpenChange={(open) => {
          if (!open) setReturningReceipt(null);
        }}
        returnType="customer"
        originalReceipt={returningReceipt}
        returnReceipts={returnReceipts}
        onSubmit={async (values) => {
          try {
            // `createCustomerReturn` đã tự nạp lại danh sách phiếu trả. Trang
            // này không hiển thị dashboard / lịch sử kho / khách hàng nên
            // không nạp lại chúng ở đây — mỗi lượt là 1 lần gọi backend chặn.
            await createCustomerReturn(values);
            toast.success("Đã tạo phiếu trả hàng");
          } catch (error) {
            toast.error(
              getErrorMessage(error, "Không thể tạo phiếu trả hàng"),
            );
            throw error;
          }
        }}
      />
    </div>
  );
}