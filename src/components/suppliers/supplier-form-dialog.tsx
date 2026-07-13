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
import { supplierSchema } from "@/lib/schemas";
import type { Supplier } from "@/lib/types";

type SupplierFormValues = z.infer<typeof supplierSchema>;

interface SupplierFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier?: Supplier | null;
  onSubmit: (values: SupplierFormValues) => Promise<void>;
}

const defaultValues: SupplierFormValues = {
  code: "",
  name: "",
  phone: "",
  address: "",
  note: "",
};

export function SupplierFormDialog({
  open,
  onOpenChange,
  supplier,
  onSubmit,
}: SupplierFormDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues,
  });

  useEffect(() => {
    if (supplier) {
      reset({
        code: supplier.code,
        name: supplier.name,
        phone: supplier.phone ?? "",
        address: supplier.address ?? "",
        note: supplier.note ?? "",
      });
    } else {
      reset(defaultValues);
    }
  }, [supplier, reset, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {supplier ? "Cập nhật nhà cung cấp" : "Thêm nhà cung cấp mới"}
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
              <Label htmlFor="code">Mã nhà cung cấp</Label>
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
            <Label htmlFor="name">Tên nhà cung cấp</Label>
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
