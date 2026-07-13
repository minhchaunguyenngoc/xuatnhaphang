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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/format";
import type { PaymentMethod } from "@/lib/types";

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  total: number;
  hasCustomer: boolean;
  submitting: boolean;
  onConfirm: (values: {
    amount_paid: number;
    payment_method: PaymentMethod;
  }) => Promise<void>;
}

export function PaymentDialog({
  open,
  onOpenChange,
  total,
  hasCustomer,
  submitting,
  onConfirm,
}: PaymentDialogProps) {
  const [amountPaid, setAmountPaid] = useState(total);
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [prevOpen, setPrevOpen] = useState(open);

  // Reset mặc định (tiền khách đưa = tổng phải thu) mỗi khi dialog mở lại.
  // Điều chỉnh state khi render thay vì trong useEffect (React khuyến nghị).
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setAmountPaid(total);
      setMethod("cash");
    }
  }

  const change = amountPaid - total;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Thanh toán</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg bg-muted px-4 py-3">
            <span className="text-sm text-muted-foreground">Tổng phải thu</span>
            <span className="text-lg font-semibold">{formatCurrency(total)}</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount_paid">Tiền khách đưa</Label>
              <Input
                id="amount_paid"
                type="number"
                min={0}
                value={amountPaid}
                onChange={(e) => setAmountPaid(Number(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label>Phương thức</Label>
              <Select
                items={{ cash: "Tiền mặt", transfer: "Chuyển khoản" }}
                value={method}
                onValueChange={(v) => setMethod(v as PaymentMethod)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Tiền mặt</SelectItem>
                  <SelectItem value="transfer">Chuyển khoản</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {change >= 0 ? (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Tiền thối lại</span>
              <span className="font-medium">{formatCurrency(change)}</span>
            </div>
          ) : (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Còn nợ</span>
              <span className="font-medium text-destructive">
                {formatCurrency(-change)}
              </span>
            </div>
          )}

          {change < 0 && !hasCustomer ? (
            <p className="text-xs text-destructive">
              Cần chọn khách hàng để ghi công nợ khi thu thiếu tiền.
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button
            disabled={submitting || (change < 0 && !hasCustomer)}
            onClick={() =>
              onConfirm({ amount_paid: amountPaid, payment_method: method })
            }
          >
            {submitting ? "Đang lưu..." : "Hoàn tất"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
