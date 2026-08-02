"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { ProductFormDialog } from "@/components/products/product-form-dialog";
import { ProductPicker } from "@/components/products/product-picker";
import { PartnerPicker } from "@/components/shared/partner-picker";
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
import { api } from "@/lib/api";
import { formatCurrency, generateReceiptNumber, todayISO } from "@/lib/format";
import { receiptItemSchema } from "@/lib/schemas";
import type { ExportReceipt, ImportReceipt, Product } from "@/lib/types";
import { useInventoryStore } from "@/stores/inventory-store";

const receiptFormSchema = z.object({
  receipt_number: z.string().min(1),
  date: z.string().min(1),
  partner: z.string().optional(),
  partner_id: z.number().optional(),
  note: z.string().optional(),
  items: z.array(receiptItemSchema).min(1),
});

type ReceiptFormValues = z.infer<typeof receiptFormSchema>;

interface PartnerOption {
  id: number;
  name: string;
}

interface ReceiptFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "import" | "export";
  /** Tìm NCC (nhập) hoặc khách hàng (xuất) phía server — không tải sẵn cả
   * danh bạ, vẫn dùng tốt khi có rất nhiều khách/NCC. */
  partnerSearch: (query: string) => Promise<PartnerOption[]>;
  /** Danh sách dòng điền sẵn (vd. đọc từ file Excel) khi mở dialog. */
  initialItems?: { product_id: number; quantity: number; unit_price: number }[];
  /** Có giá trị = đang sửa phiếu này. Số phiếu giữ nguyên, không cho đổi. Với
   * hoá đơn bán hàng, chỉ sửa được ngày/khách/mặt hàng/ghi chú ở đây — chiết
   * khấu/số tiền đã thu/hình thức thanh toán giữ nguyên như lúc tạo, không
   * đổi qua form này (đổi trạng thái thanh toán thuộc trang Công nợ riêng). */
  editingReceipt?: ImportReceipt | ExportReceipt | null;
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
  partnerSearch,
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

  // Sản phẩm đầy đủ đang chọn cho từng dòng (để ProductPicker hiện đúng
  // nhãn) — ô chọn giờ tự tìm kiếm phía server, không còn nhận cả danh mục
  // qua props, nên phải tự nhớ đối tượng Product đã chọn theo từng dòng.
  const [selectedProducts, setSelectedProducts] = useState<Record<number, Product>>({});
  const [selectedPartner, setSelectedPartner] = useState<PartnerOption | null>(null);

  // Cho sửa "Giá bán" (export_price) ngay trong lúc nhập hàng, khỏi phải qua
  // trang Hàng hoá riêng. "Đơn giá" (giá nhập) đã sửa được sẵn ở field
  // items.N.unit_price — đây chỉ thêm phần giá bán, lưu vào product khi lưu
  // phiếu, không ảnh hưởng giá vốn bình quân (vẫn do backend tự tính).
  const [exportPrices, setExportPrices] = useState<Record<number, number>>({});

  useEffect(() => {
    if (!open) return;
    let active = true;

    async function load() {
      if (editingReceipt) {
        // Đọc đúng cột theo loại phiếu — phiếu nhập gắn NCC (supplier), phiếu
        // xuất gắn khách hàng (customer). Cùng 1 dialog dùng chung cho cả 2.
        const partnerName =
          type === "import"
            ? (editingReceipt as ImportReceipt).supplier
            : (editingReceipt as ExportReceipt).customer;
        const partnerId =
          type === "import"
            ? (editingReceipt as ImportReceipt).supplier_id
            : (editingReceipt as ExportReceipt).customer_id;
        reset({
          receipt_number: editingReceipt.receipt_number,
          date: editingReceipt.date,
          partner: partnerName ?? "",
          partner_id: partnerId ?? undefined,
          note: editingReceipt.note ?? "",
          items: editingReceipt.items.map((item) => ({
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
          })),
        });
        setSelectedPartner(partnerId ? { id: partnerId, name: partnerName ?? "" } : null);
        const products = await Promise.all(
          editingReceipt.items.map((item) => api.getProductById(item.product_id)),
        );
        if (!active) return;
        setSelectedProducts(Object.fromEntries(products.map((p, i) => [i, p])));
        setExportPrices(Object.fromEntries(products.map((p, i) => [i, p.export_price])));
        return;
      }

      const startItems =
        initialItems && initialItems.length > 0
          ? initialItems.map((item) => ({ ...item }))
          : [{ product_id: 0, quantity: 1, unit_price: 0 }];
      reset({
        receipt_number: generateReceiptNumber(prefix),
        date: todayISO(),
        partner: "",
        partner_id: undefined,
        note: "",
        items: startItems,
      });
      setSelectedPartner(null);
      const products = await Promise.all(
        startItems.map((item) =>
          item.product_id > 0 ? api.getProductById(item.product_id) : null,
        ),
      );
      if (!active) return;
      setSelectedProducts(
        Object.fromEntries(
          products.map((p, i) => [i, p]).filter((entry): entry is [number, Product] => entry[1] !== null),
        ),
      );
      setExportPrices(
        Object.fromEntries(
          products
            .map((p, i) => [i, p] as const)
            .filter((entry): entry is [number, Product] => entry[1] !== null)
            .map(([i, p]) => [i, p.export_price]),
        ),
      );
    }

    void load();
    return () => {
      active = false;
    };
  }, [open, type, prefix, initialItems, editingReceipt, reset]);

  const total = items.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0),
    0,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[95vw] overflow-y-auto sm:max-w-7xl">
        <DialogHeader>
          <DialogTitle>
            {editingReceipt
              ? type === "import"
                ? "Sửa phiếu nhập hàng"
                : "Sửa hoá đơn bán hàng"
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
                const product = selectedProducts[Number(key)];
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
              <PartnerPicker
                value={selectedPartner}
                onSelect={(partner) => {
                  setSelectedPartner(partner);
                  setValue("partner_id", partner?.id ?? undefined);
                  setValue("partner", partner?.name ?? "");
                }}
                search={partnerSearch}
                placeholder={type === "import" ? "Gõ tên NCC để tìm..." : "Gõ tên khách để tìm..."}
              />
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
                  append({ product_id: 0, quantity: 1, unit_price: 0 });
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
                        <ProductPicker
                          value={selectedProducts[index] ?? null}
                          onSelect={(product) => {
                            setValue(`items.${index}.product_id`, product.id);
                            setValue(
                              `items.${index}.unit_price`,
                              type === "import" ? product.import_price : product.export_price,
                            );
                            setSelectedProducts({ ...selectedProducts, [index]: product });
                            if (type === "import") {
                              setExportPrices({
                                ...exportPrices,
                                [index]: product.export_price,
                              });
                            }
                          }}
                        />
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
                        const shift = (record: Record<number, number | Product>) => {
                          const next: typeof record = {};
                          Object.entries(record).forEach(([key, value]) => {
                            const i = Number(key);
                            if (i < index) next[i] = value;
                            else if (i > index) next[i - 1] = value;
                          });
                          return next;
                        };
                        setExportPrices(shift(exportPrices) as Record<number, number>);
                        setSelectedProducts(shift(selectedProducts) as Record<number, Product>);
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
                      {type === "import" && (selectedProducts[index]?.stock_quantity ?? 0) > 0 ? (
                        <p className="text-xs text-muted-foreground">
                          Giá vốn BQ hiện tại: {formatCurrency(selectedProducts[index].import_price)}
                        </p>
                      ) : null}
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
            <Button type="submit" disabled={isSubmitting}>
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
              setSelectedProducts({ ...selectedProducts, [quickAddIndex]: product });
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
