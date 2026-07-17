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
import { productSchema } from "@/lib/schemas";
import type { Product } from "@/lib/types";

type ProductFormValues = z.infer<typeof productSchema>;

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
  onSubmit: (values: ProductFormValues) => Promise<void>;
}

const defaultValues: ProductFormValues = {
  code: "",
  name: "",
  unit: "cái",
  import_price: 0,
  export_price: 0,
  min_stock: 0,
  category: "",
  description: "",
};

export function ProductFormDialog({
  open,
  onOpenChange,
  product,
  onSubmit,
}: ProductFormDialogProps) {
  // Khi sửa sản phẩm còn tồn kho, giá nhập là giá vốn bình quân hệ thống quản lý
  // → khóa ô nhập để tránh sai định giá (Issue 15).
  const lockImportPrice = !!product && product.stock_quantity > 0;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues,
  });

  useEffect(() => {
    if (product) {
      reset({
        code: product.code,
        name: product.name,
        unit: product.unit,
        import_price: product.import_price,
        export_price: product.export_price,
        min_stock: product.min_stock,
        category: product.category ?? "",
        description: product.description ?? "",
      });
    } else {
      reset(defaultValues);
    }
  }, [product, reset, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {product ? "Cập nhật sản phẩm" : "Thêm sản phẩm mới"}
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
              <Label htmlFor="code">Mã sản phẩm</Label>
              <Input id="code" {...register("code")} />
              {errors.code ? (
                <p className="text-xs text-destructive">{errors.code.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Đơn vị</Label>
              <Input id="unit" {...register("unit")} />
              {errors.unit ? (
                <p className="text-xs text-destructive">{errors.unit.message}</p>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Tên sản phẩm</Label>
            <Input id="name" {...register("name")} />
            {errors.name ? (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            ) : null}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="import_price">Giá nhập</Label>
              <Input
                id="import_price"
                type="number"
                min={0}
                readOnly={lockImportPrice}
                className={lockImportPrice ? "bg-muted" : undefined}
                {...register("import_price", { valueAsNumber: true })}
              />
              {lockImportPrice ? (
                <p className="text-xs text-muted-foreground">
                  Giá vốn bình quân do hệ thống tự tính khi còn tồn kho.
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="export_price">Giá xuất</Label>
              <Input
                id="export_price"
                type="number"
                min={0}
                {...register("export_price", { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="min_stock">Tồn tối thiểu</Label>
              <Input
                id="min_stock"
                type="number"
                min={0}
                {...register("min_stock", { valueAsNumber: true })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Danh mục</Label>
            <Input id="category" {...register("category")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Mô tả</Label>
            <Textarea id="description" rows={3} {...register("description")} />
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