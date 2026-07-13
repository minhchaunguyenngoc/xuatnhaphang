"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, generateReceiptNumber, todayISO } from "@/lib/format";
import { receiptItemSchema } from "@/lib/schemas";
import type { Product } from "@/lib/types";

const receiptFormSchema = z.object({
  receipt_number: z.string().min(1),
  date: z.string().min(1),
  partner: z.string().optional(),
  partner_id: z.number().optional(),
  note: z.string().optional(),
  items: z.array(receiptItemSchema).min(1),
});

const PARTNER_NONE = "0";

type ReceiptFormValues = z.infer<typeof receiptFormSchema>;

interface PartnerOption {
  id: number;
  name: string;
}

interface ReceiptFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "import" | "export";
  products: Product[];
  /** Danh bạ đối tác (NCC cho nhập, khách cho xuất) để chọn thay vì gõ tay. */
  partners?: PartnerOption[];
  /** Danh sách dòng điền sẵn (vd. đọc từ file Excel) khi mở dialog. */
  initialItems?: { product_id: number; quantity: number; unit_price: number }[];
  onSubmit: (values: {
    receipt_number: string;
    date: string;
    supplier?: string | null;
    customer?: string | null;
    partner_id?: number | null;
    note?: string | null;
    items: { product_id: number; quantity: number; unit_price: number }[];
  }) => Promise<void>;
}

export function ReceiptFormDialog({
  open,
  onOpenChange,
  type,
  products,
  partners,
  initialItems,
  onSubmit,
}: ReceiptFormDialogProps) {
  const prefix = type === "import" ? "PN" : "PX";
  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ReceiptFormValues>({
    resolver: zodResolver(receiptFormSchema),
    defaultValues: {
      receipt_number: generateReceiptNumber(prefix),
      date: todayISO(),
      partner: "",
      partner_id: undefined,
      note: "",
      items: [{ product_id: 0, quantity: 1, unit_price: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const items = watch("items");

  useEffect(() => {
    if (open) {
      reset({
        receipt_number: generateReceiptNumber(prefix),
        date: todayISO(),
        partner: "",
        partner_id: undefined,
        note: "",
        items:
          initialItems && initialItems.length > 0
            ? initialItems.map((item) => ({ ...item }))
            : [{ product_id: products[0]?.id ?? 0, quantity: 1, unit_price: products[0]?.import_price ?? 0 }],
      });
    }
  }, [open, prefix, products, initialItems, reset]);

  const total = items.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0),
    0,
  );

  // Base UI Select cần map value->nhãn để trigger hiện tên thay vì ID.
  const productItems: Record<string, string> = Object.fromEntries(
    products.map((p) => [String(p.id), `${p.code} - ${p.name}`]),
  );
  const partnerItems: Record<string, string> = {
    [PARTNER_NONE]: type === "import" ? "Không chọn NCC" : "Khách lẻ",
    ...Object.fromEntries((partners ?? []).map((p) => [String(p.id), p.name])),
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[95vw] overflow-y-auto sm:max-w-7xl">
        <DialogHeader>
          <DialogTitle>
            {type === "import" ? "Tạo phiếu nhập hàng" : "Tạo phiếu xuất hàng"}
          </DialogTitle>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={handleSubmit(async (values) => {
            await onSubmit({
              receipt_number: values.receipt_number,
              date: values.date,
              supplier: type === "import" ? values.partner : undefined,
              customer: type === "export" ? values.partner : undefined,
              partner_id: values.partner_id ?? null,
              note: values.note,
              items: values.items.map((item) => ({
                product_id: Number(item.product_id),
                quantity: Number(item.quantity),
                unit_price: Number(item.unit_price),
              })),
            });
            onOpenChange(false);
          })}
        >
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Số phiếu</Label>
              <Input {...register("receipt_number")} />
            </div>
            <div className="space-y-2">
              <Label>Ngày</Label>
              <Input type="date" {...register("date")} />
            </div>
            <div className="space-y-2">
              <Label>{type === "import" ? "Nhà cung cấp" : "Khách hàng"}</Label>
              {partners && partners.length > 0 ? (
                <Select
                  items={partnerItems}
                  value={
                    watch("partner_id")
                      ? String(watch("partner_id"))
                      : PARTNER_NONE
                  }
                  onValueChange={(value) => {
                    if (value === PARTNER_NONE) {
                      setValue("partner_id", undefined);
                      setValue("partner", "");
                      return;
                    }
                    const id = Number(value);
                    const partner = partners.find((p) => p.id === id);
                    setValue("partner_id", id);
                    setValue("partner", partner?.name ?? "");
                  }}
                >
                  <SelectTrigger className="w-full min-w-0">
                    <SelectValue
                      placeholder={type === "import" ? "Chọn NCC" : "Chọn khách"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={PARTNER_NONE}>
                      {type === "import" ? "Không chọn NCC" : "Khách lẻ"}
                    </SelectItem>
                    {partners.map((partner) => (
                      <SelectItem key={partner.id} value={String(partner.id)}>
                        {partner.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input {...register("partner")} />
              )}
            </div>
          </div>

          <div className="space-y-3 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Danh sách sản phẩm</p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  append({
                    product_id: products[0]?.id ?? 0,
                    quantity: 1,
                    unit_price: products[0]?.import_price ?? 0,
                  })
                }
              >
                <Plus className="mr-1 h-4 w-4" />
                Thêm dòng
              </Button>
            </div>

            {fields.map((field, index) => {
              const lineTotal =
                (Number(items[index]?.quantity) || 0) *
                (Number(items[index]?.unit_price) || 0);
              return (
                <div
                  key={field.id}
                  className="space-y-2 rounded-md border bg-muted/30 p-2"
                >
                  <div className="flex items-end gap-2">
                    <div className="min-w-0 flex-1 space-y-1">
                      <Label>Sản phẩm</Label>
                      <Select
                        items={productItems}
                        value={String(items[index]?.product_id ?? 0)}
                        onValueChange={(value) => {
                          const productId = Number(value);
                          const product = products.find((p) => p.id === productId);
                          setValue(`items.${index}.product_id`, productId);
                          if (product) {
                            setValue(
                              `items.${index}.unit_price`,
                              type === "import"
                                ? product.import_price
                                : product.export_price,
                            );
                          }
                        }}
                      >
                        <SelectTrigger className="w-full min-w-0">
                          <SelectValue placeholder="Chọn sản phẩm" />
                        </SelectTrigger>
                        <SelectContent className="max-w-[min(90vw,40rem)]">
                          {products.map((product) => (
                            <SelectItem
                              key={product.id}
                              value={String(product.id)}
                            >
                              {product.code} - {product.name} (tồn:{" "}
                              {product.stock_quantity})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={fields.length === 1}
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label>Số lượng</Label>
                      <Input
                        type="number"
                        min={1}
                        {...register(`items.${index}.quantity`, {
                          valueAsNumber: true,
                        })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Đơn giá</Label>
                      <Input
                        type="number"
                        min={0}
                        {...register(`items.${index}.unit_price`, {
                          valueAsNumber: true,
                        })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Thành tiền</Label>
                      <div className="flex h-8 items-center justify-end rounded-md bg-background px-2 text-sm font-medium">
                        {formatCurrency(lineTotal)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {errors.items ? (
              <p className="text-xs text-destructive">{errors.items.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label>Ghi chú</Label>
            <Textarea rows={2} {...register("note")} />
          </div>

          <div className="flex items-center justify-between rounded-lg bg-muted px-4 py-3">
            <span className="text-sm text-muted-foreground">Tổng tiền</span>
            <span className="text-lg font-semibold">{formatCurrency(total)}</span>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={isSubmitting || products.length === 0}>
              {isSubmitting ? "Đang lưu..." : "Lưu phiếu"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}