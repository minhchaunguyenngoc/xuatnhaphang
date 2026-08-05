"use client";

import { useState } from "react";
import { Printer } from "lucide-react";

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
import { formatCurrency, formatDate } from "@/lib/format";
import { useCompanyStore } from "@/stores/company-store";
import type { ExportReceipt, ImportReceipt, ReturnReceipt } from "@/lib/types";

type InvoiceType = "import" | "export" | "customer_return" | "supplier_return";

interface PartnerDetail {
  phone?: string | null;
  address?: string | null;
}

interface InvoicePrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: InvoiceType;
  receipt: ImportReceipt | ExportReceipt | ReturnReceipt | null;
  /** Thông tin liên hệ đối tác (khách/NCC) để điền sẵn, có thể sửa trước khi in. */
  partner?: PartnerDetail | null;
  /** Tên đối tác hiển thị — bắt buộc cho phiếu trả hàng vì ReturnReceipt
   * không tự lưu tên khách/NCC (phải lấy từ phiếu gốc). */
  partnerName?: string | null;
}

export function InvoicePrintDialog({
  open,
  onOpenChange,
  type,
  receipt,
  partner,
  partnerName: partnerNameOverride,
}: InvoicePrintDialogProps) {
  const company = useCompanyStore();

  const partnerName =
    partnerNameOverride ??
    (type === "import"
      ? (receipt as ImportReceipt | null)?.supplier
      : type === "export"
        ? (receipt as ExportReceipt | null)?.customer
        : null);

  // Khối thông tin đối tác sửa được (chỉ cho lần in này, không lưu DB).
  const [buyer, setBuyer] = useState({ name: "", phone: "", address: "" });
  // Chỉ ẩn/hiện dòng chiết khấu KHI IN — số liệu chiết khấu vẫn được lưu và
  // dùng đúng cho báo cáo/công nợ ở phía sau, không phụ thuộc lựa chọn này.
  const [printDiscount, setPrintDiscount] = useState(true);
  const [prevId, setPrevId] = useState<number | null>(null);
  if (receipt && receipt.id !== prevId) {
    setPrevId(receipt.id);
    setBuyer({
      name: partnerName ?? "",
      phone: partner?.phone ?? "",
      address: partner?.address ?? "",
    });
    setPrintDiscount(true);
  }

  if (!receipt) return null;

  // Chi tiết thanh toán chỉ áp dụng cho phiếu xuất/hóa đơn bán (Issue 12).
  const exportReceipt =
    type === "export" ? (receipt as ExportReceipt) : null;
  const itemsSubtotal = receipt.items.reduce(
    (sum, item) => sum + item.total_price,
    0,
  );
  // Bỏ tích "in chiết khấu" → ẩn dòng chiết khấu, đồng thời phân bổ chiết
  // khấu vào thẳng đơn giá từng dòng (theo tỷ lệ, giống cách get_profit_report
  // phân bổ chiết khấu theo dòng) để tổng các dòng khớp đúng "Tổng cộng",
  // không có dòng nào lộ ra là đã giảm giá.
  const hideDiscountBreakdown =
    exportReceipt !== null && !printDiscount && exportReceipt.discount > 0;
  const priceRatio =
    hideDiscountBreakdown && itemsSubtotal > 0
      ? receipt.total_amount / itemsSubtotal
      : 1;
  // `amount_paid` là tiền khách đưa (tender); kẹp vào [0, total] để ra số đã áp
  // vào hóa đơn, phần dư là tiền thừa, phần thiếu là còn nợ.
  const paidApplied = exportReceipt
    ? Math.min(Math.max(exportReceipt.amount_paid, 0), exportReceipt.total_amount)
    : 0;
  const changeDue = exportReceipt
    ? Math.max(exportReceipt.amount_paid - exportReceipt.total_amount, 0)
    : 0;
  const remainingDebt = exportReceipt
    ? Math.max(exportReceipt.total_amount - exportReceipt.amount_paid, 0)
    : 0;
  const paymentMethodLabel =
    exportReceipt?.payment_method === "transfer"
      ? "Chuyển khoản"
      : exportReceipt?.payment_method === "debt"
        ? "Công nợ"
        : "Tiền mặt";

  const partnerLabel =
    type === "import" || type === "supplier_return" ? "Nhà cung cấp" : "Khách hàng";
  const title = {
    import: "PHIẾU NHẬP KHO",
    export: "PHIẾU XUẤT KHO",
    customer_return: "PHIẾU TRẢ HÀNG (KHÁCH)",
    supplier_return: "PHIẾU TRẢ HÀNG (NHÀ CUNG CẤP)",
  }[type];
  const hasCompany =
    company.name || company.address || company.phone || company.taxCode;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Việc đưa popup về luồng bình thường khi in do `@media print` trong
          globals.css lo trọn — không dùng utility `print:*` ở đây, vì
          `print:!translate-x-0` chỉ đặt translate về 0 (khác `none`) nên vẫn
          tạo containing block khiến hoá đơn không ghim được lên đầu trang. */}
      <DialogContent className="max-w-3xl sm:max-w-3xl">
        {/* Khu vực chỉnh sửa thông tin khách — không in ra */}
        <div className="no-print space-y-2 rounded-lg border bg-muted/40 p-3">
          <p className="text-xs font-medium text-muted-foreground">
            Chỉnh sửa thông tin {partnerLabel.toLowerCase()} (chỉ cho bản in này)
          </p>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Tên</Label>
              <Input
                className="h-8"
                value={buyer.name}
                onChange={(e) => setBuyer({ ...buyer, name: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Điện thoại</Label>
              <Input
                className="h-8"
                value={buyer.phone}
                onChange={(e) => setBuyer({ ...buyer, phone: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Địa chỉ</Label>
              <Input
                className="h-8"
                value={buyer.address}
                onChange={(e) => setBuyer({ ...buyer, address: e.target.value })}
              />
            </div>
          </div>
          {exportReceipt && exportReceipt.discount > 0 ? (
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={printDiscount}
                onChange={(e) => setPrintDiscount(e.target.checked)}
              />
              In dòng chiết khấu trên hóa đơn (bỏ tích vẫn tính đúng chiết khấu
              cho báo cáo, chỉ ẩn khi in)
            </label>
          ) : null}
        </div>

        <div className="invoice-print-area space-y-6 bg-white p-2 text-black">
          {/* Thông tin công ty (bên bán) */}
          {hasCompany ? (
            <div className="border-b pb-3 text-center">
              {company.name ? (
                <p className="text-base font-bold uppercase">{company.name}</p>
              ) : null}
              {company.address ? (
                <p className="text-sm">{company.address}</p>
              ) : null}
              <p className="text-sm">
                {company.phone ? <span>ĐT: {company.phone}</span> : null}
                {company.phone && company.taxCode ? " · " : null}
                {company.taxCode ? <span>MST: {company.taxCode}</span> : null}
              </p>
            </div>
          ) : null}

          <DialogHeader>
            <DialogTitle className="text-center text-lg font-bold tracking-wide">
              {title}
            </DialogTitle>
          </DialogHeader>

          <div className="flex items-start justify-between text-sm">
            <div className="space-y-0.5">
              <p>
                <span className="text-muted-foreground">Số phiếu: </span>
                <span className="font-medium">{receipt.receipt_number}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Ngày: </span>
                {formatDate(receipt.date)}
              </p>
            </div>
            <div className="max-w-[55%] space-y-0.5 text-right">
              <p>
                <span className="text-muted-foreground">{partnerLabel}: </span>
                <span className="font-medium">{buyer.name || "-"}</span>
              </p>
              {buyer.phone ? (
                <p>
                  <span className="text-muted-foreground">Điện thoại: </span>
                  {buyer.phone}
                </p>
              ) : null}
              {buyer.address ? (
                <p>
                  <span className="text-muted-foreground">Địa chỉ: </span>
                  {buyer.address}
                </p>
              ) : null}
            </div>
          </div>

          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-y">
                <th className="py-1.5 text-left font-medium">#</th>
                <th className="py-1.5 text-left font-medium">Mã SP</th>
                <th className="py-1.5 text-left font-medium">Tên sản phẩm</th>
                <th className="py-1.5 text-right font-medium">SL</th>
                <th className="py-1.5 text-right font-medium">Đơn giá</th>
                <th className="py-1.5 text-right font-medium">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              {receipt.items.map((item, index) => (
                <tr key={item.id} className="border-b">
                  <td className="py-1.5">{index + 1}</td>
                  <td className="py-1.5">{item.product_code}</td>
                  <td className="py-1.5">{item.product_name}</td>
                  <td className="py-1.5 text-right">{item.quantity}</td>
                  <td className="py-1.5 text-right">
                    {formatCurrency(item.unit_price * priceRatio)}
                  </td>
                  <td className="py-1.5 text-right">
                    {formatCurrency(item.total_price * priceRatio)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end">
            <div className="w-72 space-y-1 text-sm">
              {exportReceipt && printDiscount ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tổng tiền hàng</span>
                    <span>{formatCurrency(itemsSubtotal)}</span>
                  </div>
                  {exportReceipt.discount > 0 ? (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Chiết khấu</span>
                      <span>-{formatCurrency(exportReceipt.discount)}</span>
                    </div>
                  ) : null}
                </>
              ) : null}
              <div className="flex justify-between border-t pt-1 text-base font-semibold">
                <span>Tổng cộng</span>
                <span>{formatCurrency(receipt.total_amount)}</span>
              </div>
              {exportReceipt ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Đã thanh toán</span>
                    <span>{formatCurrency(paidApplied)}</span>
                  </div>
                  {changeDue > 0 ? (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tiền thừa</span>
                      <span>{formatCurrency(changeDue)}</span>
                    </div>
                  ) : null}
                  {remainingDebt > 0 ? (
                    <div className="flex justify-between font-medium">
                      <span className="text-muted-foreground">Còn nợ</span>
                      <span>{formatCurrency(remainingDebt)}</span>
                    </div>
                  ) : null}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Phương thức
                    </span>
                    <span>{paymentMethodLabel}</span>
                  </div>
                </>
              ) : null}
            </div>
          </div>

          {receipt.note ? (
            <p className="text-sm">
              <span className="text-muted-foreground">Ghi chú: </span>
              {receipt.note}
            </p>
          ) : null}

          <div className="mt-10 grid grid-cols-2 gap-4 text-center text-sm">
            <div>
              <p className="font-medium">Người lập phiếu</p>
              <p className="text-muted-foreground">(Ký, ghi rõ họ tên)</p>
            </div>
            <div>
              <p className="font-medium">
                {type === "import" || type === "supplier_return"
                  ? "Người giao hàng"
                  : "Người nhận hàng"}
              </p>
              <p className="text-muted-foreground">(Ký, ghi rõ họ tên)</p>
            </div>
          </div>
        </div>

        <DialogFooter className="no-print">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
          <Button onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            In phiếu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
