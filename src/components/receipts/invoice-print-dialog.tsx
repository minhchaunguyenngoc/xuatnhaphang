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
import type { ExportReceipt, ImportReceipt } from "@/lib/types";

interface PartnerDetail {
  phone?: string | null;
  address?: string | null;
}

interface InvoicePrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "import" | "export";
  receipt: ImportReceipt | ExportReceipt | null;
  /** Thông tin liên hệ đối tác (khách/NCC) để điền sẵn, có thể sửa trước khi in. */
  partner?: PartnerDetail | null;
}

export function InvoicePrintDialog({
  open,
  onOpenChange,
  type,
  receipt,
  partner,
}: InvoicePrintDialogProps) {
  const company = useCompanyStore();

  const partnerName =
    type === "import"
      ? (receipt as ImportReceipt | null)?.supplier
      : (receipt as ExportReceipt | null)?.customer;

  // Khối thông tin đối tác sửa được (chỉ cho lần in này, không lưu DB).
  const [buyer, setBuyer] = useState({ name: "", phone: "", address: "" });
  const [prevId, setPrevId] = useState<number | null>(null);
  if (receipt && receipt.id !== prevId) {
    setPrevId(receipt.id);
    setBuyer({
      name: partnerName ?? "",
      phone: partner?.phone ?? "",
      address: partner?.address ?? "",
    });
  }

  if (!receipt) return null;

  const partnerLabel = type === "import" ? "Nhà cung cấp" : "Khách hàng";
  const title = type === "import" ? "PHIẾU NHẬP KHO" : "PHIẾU XUẤT KHO";
  const hasCompany =
    company.name || company.address || company.phone || company.taxCode;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl sm:max-w-3xl print:max-w-none print:rounded-none print:border-none print:p-0 print:shadow-none print:ring-0">
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
                    {formatCurrency(item.unit_price)}
                  </td>
                  <td className="py-1.5 text-right">
                    {formatCurrency(item.total_price)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end">
            <div className="w-64 space-y-1 text-sm">
              <div className="flex justify-between border-t pt-1 text-base font-semibold">
                <span>Tổng cộng</span>
                <span>{formatCurrency(receipt.total_amount)}</span>
              </div>
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
                {type === "import" ? "Người giao hàng" : "Người nhận hàng"}
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
            In hóa đơn
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
