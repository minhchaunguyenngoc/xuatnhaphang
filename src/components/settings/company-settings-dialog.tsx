"use client";

import { useState } from "react";
import { toast } from "sonner";

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
import { useCompanyStore } from "@/stores/company-store";

interface CompanySettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CompanySettingsDialog({
  open,
  onOpenChange,
}: CompanySettingsDialogProps) {
  const { name, address, phone, taxCode, setCompany } = useCompanyStore();
  const [form, setForm] = useState({ name, address, phone, taxCode });
  const [prevOpen, setPrevOpen] = useState(open);

  // Nạp lại giá trị đã lưu mỗi khi mở dialog (điều chỉnh state khi render).
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setForm({ name, address, phone, taxCode });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Thông tin cửa hàng / công ty</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="c-name">Tên cửa hàng / công ty</Label>
            <Input
              id="c-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="VD: Cửa hàng ABC"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="c-address">Địa chỉ</Label>
            <Input
              id="c-address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="c-phone">Điện thoại</Label>
              <Input
                id="c-phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-tax">Mã số thuế</Label>
              <Input
                id="c-tax"
                value={form.taxCode}
                onChange={(e) => setForm({ ...form, taxCode: e.target.value })}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button
            onClick={() => {
              setCompany(form);
              toast.success("Đã lưu thông tin công ty");
              onOpenChange(false);
            }}
          >
            Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
