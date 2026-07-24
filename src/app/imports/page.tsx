"use client";

import { useEffect, useRef, useState } from "react";
import { Download, FileUp, Pencil, Plus, Printer, Undo2 } from "lucide-react";
import { toast } from "sonner";

import { InvoicePrintDialog } from "@/components/receipts/invoice-print-dialog";
import { ReceiptFormDialog } from "@/components/receipts/receipt-form-dialog";
import { ReturnFormDialog } from "@/components/receipts/return-form-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import {
  downloadImportTemplate,
  parseImportItemsFromExcel,
} from "@/lib/import-excel";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/format";
import type { ImportReceipt } from "@/lib/types";
import { useAuthStore } from "@/stores/auth-store";
import { useInventoryStore } from "@/stores/inventory-store";
import { useReturnsStore } from "@/stores/returns-store";

export default function ImportsPage() {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canCreate = hasPermission("imports.create");
  const canEdit = hasPermission("imports.edit");
  const canReturn = hasPermission("returns.supplier");

  const {
    importReceipts,
    products,
    suppliers,
    fetchImportReceipts,
    fetchProducts,
    fetchSuppliers,
    fetchDashboard,
    fetchInventoryHistory,
    createImportReceipt,
    updateImportReceipt,
  } = useInventoryStore();
  const { returnReceipts, fetchReturnReceipts, createSupplierReturn } =
    useReturnsStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ImportReceipt | null>(null);
  const [printReceipt, setPrintReceipt] = useState<ImportReceipt | null>(null);
  const [returningReceipt, setReturningReceipt] = useState<ImportReceipt | null>(
    null,
  );
  const [importing, setImporting] = useState(false);
  const [excelItems, setExcelItems] = useState<
    { product_id: number; quantity: number; unit_price: number }[]
  >([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void fetchImportReceipts();
    void fetchProducts();
    void fetchSuppliers();
    void fetchReturnReceipts();
  }, [fetchImportReceipts, fetchProducts, fetchSuppliers, fetchReturnReceipts]);

  async function handleImportFile(file: File) {
    setImporting(true);
    try {
      const { items, skipped, unknownCodes } = await parseImportItemsFromExcel(
        file,
        products,
      );
      if (items.length === 0) {
        const reason =
          unknownCodes.length > 0
            ? `không khớp mã: ${unknownCodes.join(", ")}`
            : "cần cột Mã hàng và Số lượng";
        toast.error(`Không đọc được dòng hợp lệ nào (${reason})`);
        return;
      }
      const parts = [`Đã đọc ${items.length} dòng`];
      if (skipped > 0) parts.push(`${skipped} dòng thiếu mã/số lượng`);
      if (unknownCodes.length > 0)
        parts.push(`bỏ ${unknownCodes.length} mã lạ: ${unknownCodes.join(", ")}`);
      toast.success(parts.join(" · "));
      setExcelItems(items);
      setEditing(null);
      setDialogOpen(true);
    } catch {
      toast.error("Không thể đọc file Excel");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Nhập hàng"
        description="Tạo phiếu nhập để tăng tồn kho và cập nhật giá nhập"
        action={
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleImportFile(file);
                e.target.value = "";
              }}
            />
            <Button variant="outline" onClick={() => downloadImportTemplate()}>
              <Download className="mr-2 h-4 w-4" />
              Tải file mẫu
            </Button>
            <Button
              variant="outline"
              disabled={importing || products.length === 0}
              onClick={() => fileInputRef.current?.click()}
            >
              <FileUp className="mr-2 h-4 w-4" />
              {importing ? "Đang đọc..." : "Nhập Excel"}
            </Button>
            {canCreate ? (
              <Button
                onClick={() => {
                  setEditing(null);
                  setExcelItems([]);
                  setDialogOpen(true);
                }}
                disabled={products.length === 0}
              >
                <Plus className="mr-2 h-4 w-4" />
                Tạo phiếu nhập
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Số phiếu</TableHead>
              <TableHead>Ngày</TableHead>
              <TableHead>Nhà cung cấp</TableHead>
              <TableHead>Mặt hàng</TableHead>
              <TableHead className="text-right">Tổng tiền</TableHead>
              <TableHead>Ghi chú</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {importReceipts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  Chưa có phiếu nhập nào.
                </TableCell>
              </TableRow>
            ) : (
              importReceipts.map((receipt) => (
                <TableRow key={receipt.id}>
                  <TableCell className="font-medium">{receipt.receipt_number}</TableCell>
                  <TableCell>{formatDate(receipt.date)}</TableCell>
                  <TableCell>{receipt.supplier ?? "-"}</TableCell>
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
                    {canEdit ? (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setEditing(receipt);
                          setExcelItems([]);
                          setDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    ) : null}
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
        type="import"
        receipt={printReceipt}
        partner={(() => {
          const s = suppliers.find((s) => s.id === printReceipt?.supplier_id);
          return s ? { phone: s.phone, address: s.address } : null;
        })()}
      />

      <ReceiptFormDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setExcelItems([]);
            setEditing(null);
          }
        }}
        type="import"
        products={products}
        partners={suppliers}
        initialItems={excelItems}
        editingReceipt={editing}
        onSubmit={async (values) => {
          try {
            if (editing) {
              await updateImportReceipt({
                id: editing.id,
                date: values.date,
                supplier: values.supplier,
                supplier_id: values.partner_id ?? null,
                note: values.note,
                items: values.items,
              });
              toast.success("Đã cập nhật phiếu nhập");
            } else {
              await createImportReceipt({
                receipt_number: values.receipt_number,
                date: values.date,
                supplier: values.supplier,
                supplier_id: values.partner_id ?? null,
                note: values.note,
                items: values.items,
              });
              toast.success("Đã tạo phiếu nhập");
            }
          } catch (error) {
            toast.error(
              error instanceof Error
                ? error.message
                : editing
                  ? "Không thể cập nhật phiếu nhập"
                  : "Không thể tạo phiếu nhập",
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
        returnType="supplier"
        originalReceipt={returningReceipt}
        returnReceipts={returnReceipts}
        onSubmit={async (values) => {
          try {
            await createSupplierReturn(values);
            await Promise.all([fetchDashboard(), fetchInventoryHistory(), fetchSuppliers()]);
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
