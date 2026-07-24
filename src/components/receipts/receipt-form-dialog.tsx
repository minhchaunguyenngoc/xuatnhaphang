"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { ProductFormDialog } from "@/components/products/product-form-dialog";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxInputGroup,
  ComboboxItem,
  ComboboxList,
  ComboboxPopup,
  ComboboxTrigger,
} from "@/components/ui/combobox";
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
import type { ImportReceipt, Product } from "@/lib/types";
import { useInventoryStore } from "@/stores/inventory-store";

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
  /** Có giá trị = đang sửa phiếu nhập này (chỉ áp dụng type="import"). Số
   * phiếu giữ nguyên, không cho đổi. */
  editingReceipt?: ImportReceipt | null;
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
  editingReceipt,
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

  // Tạo nhanh sản phẩm mới ngay trong lúc lập phiếu nhập (không rời form) —
  // chỉ áp dụng cho phiếu nhập, bán hàng không tự tạo sản phẩm mới.
  const createProduct = useInventoryStore((state) => state.createProduct);
  const updateProduct = useInventoryStore((state) => state.updateProduct);
  const [quickAddIndex, setQuickAddIndex] = useState<number | null>(null);

  // Cho sửa "Giá bán" (export_price) ngay trong lúc nhập hàng, khỏi phải qua
  // trang Hàng hoá riêng. "Đơn giá" (giá nhập) đã sửa được sẵn ở field
  // items.N.unit_price — đây chỉ thêm phần giá bán, lưu vào product khi lưu
  // phiếu, không ảnh hưởng giá vốn bình quân (vẫn do backend tự tính).
  const [exportPrices, setExportPrices] = useState<Record<number, number>>({});

  useEffect(() => {
    if (!open) return;
    if (editingReceipt) {
      reset({
        receipt_number: editingReceipt.receipt_number,
        date: editingReceipt.date,
        partner: editingReceipt.supplier ?? "",
        partner_id: editingReceipt.supplier_id ?? undefined,
        note: editingReceipt.note ?? "",
        items: editingReceipt.items.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
        })),
      });
      setExportPrices(
        Object.fromEntries(
          editingReceipt.items.map((item, index) => [
            index,
            products.find((p) => p.id === item.product_id)?.export_price ?? 0,
          ]),
        ),
      );
      return;
    }
    const startItems =
      initialItems && initialItems.length > 0
        ? initialItems.map((item) => ({ ...item }))
        : [{ product_id: products[0]?.id ?? 0, quantity: 1, unit_price: products[0]?.import_price ?? 0 }];
    setExportPrices(
      Object.fromEntries(
        startItems.map((item, index) => [
          index,
          products.find((p) => p.id === item.product_id)?.export_price ?? 0,
        ]),
      ),
    );
    reset({
      receipt_number: generateReceiptNumber(prefix),
      date: todayISO(),
      partner: "",
      partner_id: undefined,
      note: "",
      items: startItems,
    });
  }, [open, prefix, products, initialItems, editingReceipt, reset]);

  const total = items.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0),
    0,
  );

  // Base UI Select cần map value->nhãn để trigger hiện tên thay vì ID.
  const partnerItems: Record<string, string> = {
    [PARTNER_NONE]: type === "import" ? "Không chọn NCC" : "Khách lẻ",
    ...Object.fromEntries((partners ?? []).map((p) => [String(p.id), p.name])),
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[95vw] overflow-y-auto sm:max-w-7xl">
        <DialogHeader>
          <DialogTitle>
            {editingReceipt
              ? "Sửa phiếu nhập hàng"
              : type === "import"
                ? "Tạo phiếu nhập hàng"
                : "Tạo phiếu xuất hàng"}
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

            // Sửa "Giá bán" ngay trong lúc nhập hàng — chỉ cập nhật những dòng
            // có giá bán khác giá hiện tại của sản phẩm, khỏi phải qua trang
            // Hàng hoá riêng.
            if (type === "import") {
              for (const [key, newExportPrice] of Object.entries(exportPrices)) {
                const item = values.items[Number(key)];
                const product = products.find((p) => p.id === Number(item?.product_id));
                if (product && newExportPrice !== product.export_price) {
                  await updateProduct({
                    id: product.id,
                    code: product.code,
                    name: product.name,
                    unit: product.unit,
                    import_price: product.import_price,
                    export_price: newExportPrice,
                    min_stock: product.min_stock,
                    category: product.category,
                    description: product.description,
                  });
                }
              }
            }

            onOpenChange(false);
          })}
        >
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Số phiếu</Label>
              <Input
                disabled={Boolean(editingReceipt)}
                {...register("receipt_number")}
              />
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
                onClick={() => {
                  setExportPrices({
                    ...exportPrices,
                    [fields.length]: products[0]?.export_price ?? 0,
                  });
                  append({
                    product_id: products[0]?.id ?? 0,
                    quantity: 1,
                    unit_price: products[0]?.import_price ?? 0,
                  });
                }}
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
                      <div className="flex gap-1">
                        <Combobox<Product | null>
                          items={products}
                          itemToStringLabel={(product) =>
                            product ? `${product.code} - ${product.name}` : ""
                          }
                          isItemEqualToValue={(a, b) => a?.id === b?.id}
                          value={
                            products.find(
                              (p) => p.id === items[index]?.product_id,
                            ) ?? null
                          }
                          onValueChange={(product) => {
                            if (!product) return;
                            setValue(`items.${index}.product_id`, product.id);
                            setValue(
                              `items.${index}.unit_price`,
                              type === "import"
                                ? product.import_price
                                : product.export_price,
                            );
                            if (type === "import") {
                              setExportPrices({
                                ...exportPrices,
                                [index]: product.export_price,
                              });
                            }
                          }}
                        >
                          <ComboboxInputGroup className="min-w-0 flex-1">
                            <ComboboxInput placeholder="Gõ mã hoặc tên để tìm..." />
                            <ComboboxTrigger />
                          </ComboboxInputGroup>
                          <ComboboxPopup>
                            <ComboboxEmpty>Không tìm thấy sản phẩm.</ComboboxEmpty>
                            <ComboboxList>
                              {(product: Product) => (
                                <ComboboxItem key={product.id} value={product}>
                                  {product.code} - {product.name} (tồn:{" "}
                                  {product.stock_quantity})
                                </ComboboxItem>
                              )}
                            </ComboboxList>
                          </ComboboxPopup>
                        </Combobox>
                        {type === "import" ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            title="Tạo sản phẩm mới"
                            onClick={() => setQuickAddIndex(index)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        ) : null}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={fields.length === 1}
                      onClick={() => {
                        const next: Record<number, number> = {};
                        Object.entries(exportPrices).forEach(([key, value]) => {
                          const i = Number(key);
                          if (i < index) next[i] = value;
                          else if (i > index) next[i - 1] = value;
                        });
                        setExportPrices(next);
                        remove(index);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div
                    className={
                      type === "import"
                        ? "grid grid-cols-4 gap-2"
                        : "grid grid-cols-3 gap-2"
                    }
                  >
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
                      <Label>Đơn giá (giá nhập)</Label>
                      <Input
                        type="number"
                        min={0}
                        {...register(`items.${index}.unit_price`, {
                          valueAsNumber: true,
                        })}
                      />
                      {type === "import"
                        ? (() => {
                            const current = products.find(
                              (p) => p.id === items[index]?.product_id,
                            );
                            return current && current.stock_quantity > 0 ? (
                              <p className="text-xs text-muted-foreground">
                                Giá vốn BQ hiện tại: {formatCurrency(current.import_price)}
                              </p>
                            ) : null;
                          })()
                        : null}
                    </div>
                    {type === "import" ? (
                      <div className="space-y-1">
                        <Label>Giá bán</Label>
                        <Input
                          type="number"
                          min={0}
                          value={exportPrices[index] ?? 0}
                          onChange={(e) =>
                            setExportPrices({
                              ...exportPrices,
                              [index]: Number(e.target.value) || 0,
                            })
                          }
                        />
                      </div>
                    ) : null}
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
              {isSubmitting ? "Đang lưu..." : editingReceipt ? "Cập nhật" : "Lưu phiếu"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      <ProductFormDialog
        open={quickAddIndex !== null}
        onOpenChange={(open) => {
          if (!open) setQuickAddIndex(null);
        }}
        onSubmit={async (values) => {
          try {
            const product = await createProduct(values);
            if (quickAddIndex !== null) {
              setValue(`items.${quickAddIndex}.product_id`, product.id);
              setValue(`items.${quickAddIndex}.unit_price`, product.import_price);
              setExportPrices({
                ...exportPrices,
                [quickAddIndex]: product.export_price,
              });
            }
            toast.success("Đã thêm sản phẩm mới");
          } catch {
            toast.error("Không thể tạo sản phẩm (mã có thể đã tồn tại)");
            throw new Error("save failed");
          }
        }}
      />
    </Dialog>
  );
}