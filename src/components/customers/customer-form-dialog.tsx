"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

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
import { Textarea } from "@/components/ui/textarea";
import { customerSchema } from "@/lib/schemas";
import type { Customer } from "@/lib/types";

type CustomerFormValues = z.infer<typeof customerSchema>;

interface CustomerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer | null;
  onSubmit: (values: CustomerFormValues) => Promise<void>;
}

const defaultValues: CustomerFormValues = {
  code: "",
  name: "",
  phone: "",
  address: "",
  note: "",
};

export function CustomerFormDialog({
  open,
  onOpenChange,
  customer,
  onSubmit,
}: CustomerFormDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues,
  });

  useEffect(() => {
    if (customer) {
      reset({
        code: customer.code,
        name: customer.name,
        phone: customer.phone ?? "",
        address: customer.address ?? "",
        note: customer.note ?? "",
      });
    } else {
      reset(defaultValues);
    }
  }, [customer, reset, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {customer ? "Cập nhật khách hàng" : "Thêm khách hàng mới"}
          </DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={handleSubmit(async (values) => {
            await onSubmit(values);
            onOpenChange(false);
          })}
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">Mã khách hàng</Label>
              <Input id="code" {...register("code")} />
              {errors.code ? (
                <p className="text-xs text-destructive">{errors.code.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Số điện thoại</Label>
              <Input id="phone" {...register("phone")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Tên khách hàng</Label>
            <Input id="name" {...register("name")} />
            {errors.name ? (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Địa chỉ</Label>
            <Input id="address" {...register("address")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Ghi chú</Label>
            <Textarea id="note" rows={3} {...register("note")} />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Đang lưu..." : "Lưu"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
