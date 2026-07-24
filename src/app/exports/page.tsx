"use client";

import { useEffect, useState } from "react";
import { Plus, Printer, Undo2 } from "lucide-react";
import { toast } from "sonner";

import { InvoicePrintDialog } from "@/components/receipts/invoice-print-dialog";
import { ReceiptFormDialog } from "@/components/receipts/receipt-form-dialog";
import { ReturnFormDialog } from "@/components/receipts/return-form-dialog";
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
import type { ExportReceipt } from "@/lib/types";
import { useAuthStore } from "@/stores/auth-store";
import { useInventoryStore } from "@/stores/inventory-store";
import { useReturnsStore } from "@/stores/returns-store";

export default function ExportsPage() {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canCreate = hasPermission("exports.create");
  const canReturn = hasPermission("returns.customer");
  const {
    exportReceipts,
    products,
    customers,
    fetchExportReceipts,
    fetchProducts,
    fetchCustomers,
    fetchDashboard,
    fetchInventoryHistory,
    createExportReceipt,
  } = useInventoryStore();
  const { returnReceipts, fetchReturnReceipts, createCustomerReturn } =
    useReturnsStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [printReceipt, setPrintReceipt] = useState<ExportReceipt | null>(null);
  const [returningReceipt, setReturningReceipt] = useState<ExportReceipt | null>(
    null,
  );

  useEffect(() => {
    void fetchExportReceipts();
    void fetchProducts();
    void fetchCustomers();
    void fetchReturnReceipts();
  }, [fetchExportReceipts, fetchProducts, fetchCustomers, fetchReturnReceipts]);

  return (
    <div>
      <PageHeader
        title="Hóa đơn bán hàng"
        description="Danh sách hóa đơn bán/xuất kho. Bán nhanh tại màn hình Bán hàng (POS)."
        action={
          canCreate ? (
            <Button onClick={() => setDialogOpen(true)} disabled={products.length === 0}>
              <Plus className="mr-2 h-4 w-4" />
              Tạo hóa đơn
            </Button>
          ) : null
        }
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
        type="export"
        receipt={printReceipt}
        partner={(() => {
          const c = customers.find((c) => c.id === printReceipt?.customer_id);
          return c ? { phone: c.phone, address: c.address } : null;
        })()}
      />

      <ReceiptFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        type="export"
        products={products}
        partners={customers}
        onSubmit={async (values) => {
          try {
            const total = values.items.reduce(
              (sum, item) => sum + item.quantity * item.unit_price,
              0,
            );
            await createExportReceipt({
              receipt_number: values.receipt_number,
              date: values.date,
              customer: values.customer,
              customer_id: values.partner_id ?? null,
              discount: 0,
              amount_paid: total,
              payment_method: "cash",
              note: values.note,
              items: values.items,
            });
            toast.success("Đã tạo phiếu xuất");
          } catch (error) {
            toast.error(
              error instanceof Error ? error.message : "Không thể tạo phiếu xuất",
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
            await createCustomerReturn(values);
            await Promise.all([fetchDashboard(), fetchInventoryHistory(), fetchCustomers()]);
            toast.success("Đã tạo phiếu trả hàng");
          } catch (error) {
            toast.error(
              error instanceof Error ? error.message : "Không thể tạo phiếu trả hàng",
            );
            throw error;
          }
        }}
      />
    </div>
  );
}