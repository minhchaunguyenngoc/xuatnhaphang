"use client";

import { useEffect, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { Minus, Plus, Search, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { CustomerFormDialog } from "@/components/customers/customer-form-dialog";
import { PaymentDialog } from "@/components/pos/payment-dialog";
import { InvoicePrintDialog } from "@/components/receipts/invoice-print-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { api } from "@/lib/api";
import { formatCurrency, generateReceiptNumber, todayISO } from "@/lib/format";
import type { Customer, ExportReceipt, PaymentMethod, Product } from "@/lib/types";
import { useInventoryStore } from "@/stores/inventory-store";
import { getErrorMessage } from "@/lib/errors";

interface CartItem {
  product_id: number;
  code: string;
  name: string;
  unit: string;
  unit_price: number;
  quantity: number;
  stock: number;
}

const CUSTOMER_WALKIN = "0"; // khách lẻ (không lưu công nợ)

export default function PosPage() {
  const {
    searchProducts,
    searchCustomers,
    createExportReceipt,
    createCustomer,
  } = useInventoryStore(
    useShallow((s) => ({
      searchProducts: s.searchProducts,
      searchCustomers: s.searchCustomers,
      createExportReceipt: s.createExportReceipt,
      createCustomer: s.createCustomer,
    })),
  );

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 250);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerId, setCustomerId] = useState<string>(CUSTOMER_WALKIN);
  // Danh bạ khách hàng để hiện trong Select — nạp 1 lô gợi ý ban đầu qua tìm
  // kiếm phía server (rỗng = 50 khách gần nhất), không tải cả bảng khách.
  const [customerOptions, setCustomerOptions] = useState<Customer[]>([]);
  const [discount, setDiscount] = useState(0);
  const [note, setNote] = useState("");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [printReceipt, setPrintReceipt] = useState<ExportReceipt | null>(null);
  const [printPartner, setPrintPartner] = useState<{
    phone: string | null;
    address: string | null;
  } | null>(null);

  useEffect(() => {
    void searchCustomers("").then(setCustomerOptions);
  }, [searchCustomers]);

  useEffect(() => {
    let active = true;
    void searchProducts(debouncedSearch).then((items) => {
      if (active) setSearchResults(items);
    });
    return () => {
      active = false;
    };
  }, [debouncedSearch, searchProducts]);

  const itemsTotal = cart.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0,
  );
  // Chiết khấu không được vượt tổng tiền hàng. Trước đây ô nhập cho gõ số lớn
  // hơn, màn hình vẫn hiện "Khách cần trả 0đ" nên trông như bình thường, nhưng
  // giá trị vượt vẫn được lưu xuống DB và làm báo cáo lợi nhuận ra số âm ảo.
  // Kẹp lại ở đây (giỏ hàng có thể đổi sau khi đã gõ chiết khấu).
  const effectiveDiscount = Math.min(Math.max(discount, 0), itemsTotal);
  const total = itemsTotal - effectiveDiscount;

  function addToCart(product: Product) {
    if (product.stock_quantity <= 0) {
      toast.error(`"${product.name}" đã hết hàng`);
      return;
    }
    setCart((prev) => {
      const existing = prev.find((i) => i.product_id === product.id);
      if (existing) {
        if (existing.quantity >= existing.stock) {
          toast.error(`Không đủ tồn kho cho "${product.name}"`);
          return prev;
        }
        return prev.map((i) =>
          i.product_id === product.id
            ? { ...i, quantity: i.quantity + 1 }
            : i,
        );
      }
      return [
        ...prev,
        {
          product_id: product.id,
          code: product.code,
          name: product.name,
          unit: product.unit,
          unit_price: product.export_price,
          quantity: 1,
          stock: product.stock_quantity,
        },
      ];
    });
  }

  function updateQuantity(productId: number, quantity: number) {
    setCart((prev) =>
      prev.flatMap((i) => {
        if (i.product_id !== productId) return [i];
        if (quantity <= 0) return [];
        return [{ ...i, quantity: Math.min(quantity, i.stock) }];
      }),
    );
  }

  function removeItem(productId: number) {
    setCart((prev) => prev.filter((i) => i.product_id !== productId));
  }

  function resetSale() {
    setCart([]);
    setDiscount(0);
    setNote("");
    setCustomerId(CUSTOMER_WALKIN);
  }

  async function handleConfirm(values: {
    amount_paid: number;
    payment_method: PaymentMethod;
  }) {
    setSubmitting(true);
    try {
      const receipt = await createExportReceipt({
        receipt_number: generateReceiptNumber("HD"),
        date: todayISO(),
        customer_id:
          customerId === CUSTOMER_WALKIN ? null : Number(customerId),
        discount: effectiveDiscount,
        amount_paid: values.amount_paid,
        payment_method: values.payment_method,
        note: note || null,
        items: cart.map((i) => ({
          product_id: i.product_id,
          quantity: i.quantity,
          unit_price: i.unit_price,
        })),
      });
      toast.success("Đã tạo hóa đơn bán hàng");
      setPaymentOpen(false);
      resetSale();
      setPrintReceipt(receipt);
      // Chỉ nạp lại đúng lưới sản phẩm đang hiển thị (1 lượt, tối đa 50 dòng)
      // để số tồn hiện đúng sau khi bán — thay cho việc nạp lại products +
      // customers + danh sách phiếu + lịch sử kho + dashboard như trước.
      void searchProducts(debouncedSearch).then(setSearchResults);
      if (receipt.customer_id) {
        try {
          const c = await api.getCustomerById(receipt.customer_id);
          setPrintPartner({ phone: c.phone, address: c.address });
        } catch {
          setPrintPartner(null);
        }
      } else {
        setPrintPartner(null);
      }
    } catch (error) {
      toast.error(
        getErrorMessage(error, "Không thể tạo hóa đơn"),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid h-[calc(100vh-3rem)] grid-cols-1 gap-4 lg:grid-cols-[1fr_1.1fr]">
      {/* Cột trái: giỏ hàng */}
      <div className="flex min-h-0 flex-col rounded-lg border bg-card">
        <div className="border-b p-3">
          <h2 className="text-sm font-semibold">Hóa đơn bán hàng</h2>
        </div>

        <div className="flex-1 overflow-y-auto">
          {cart.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              Chọn sản phẩm bên phải để thêm vào hóa đơn.
            </p>
          ) : (
            <ul className="divide-y">
              {cart.map((item) => (
                <li key={item.product_id} className="space-y-2 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.code} · tồn {item.stock}
                      </p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 shrink-0"
                      onClick={() => removeItem(item.product_id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-7 w-7"
                        onClick={() =>
                          updateQuantity(item.product_id, item.quantity - 1)
                        }
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) =>
                          updateQuantity(
                            item.product_id,
                            Number(e.target.value) || 0,
                          )
                        }
                        className="h-7 w-14 text-center"
                      />
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-7 w-7"
                        onClick={() =>
                          updateQuantity(item.product_id, item.quantity + 1)
                        }
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <span className="w-28 shrink-0 text-right text-sm text-muted-foreground">
                      {formatCurrency(item.unit_price)}
                    </span>
                    <span className="w-28 shrink-0 text-right text-sm font-medium">
                      {formatCurrency(item.quantity * item.unit_price)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-3 border-t p-3">
          <div className="flex items-center gap-2">
            <Select
              items={{
                [CUSTOMER_WALKIN]: "Khách lẻ",
                ...Object.fromEntries(customerOptions.map((c) => [String(c.id), c.name])),
              }}
              value={customerId}
              onValueChange={(v) => setCustomerId(v ?? CUSTOMER_WALKIN)}
            >
              <SelectTrigger className="min-w-0 flex-1">
                <SelectValue placeholder="Khách lẻ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={CUSTOMER_WALKIN}>Khách lẻ</SelectItem>
                {customerOptions.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}
                    {c.phone ? ` · ${c.phone}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="icon"
              variant="outline"
              onClick={() => setCustomerDialogOpen(true)}
              title="Thêm khách hàng"
            >
              <UserPlus className="h-4 w-4" />
            </Button>
          </div>

          <Input
            placeholder="Ghi chú đơn hàng"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Tổng tiền hàng</span>
            <span>{formatCurrency(itemsTotal)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Chiết khấu</span>
            <Input
              type="number"
              min={0}
              max={itemsTotal}
              value={discount}
              onChange={(e) =>
                setDiscount(
                  Math.min(Math.max(Number(e.target.value) || 0, 0), itemsTotal),
                )
              }
              className="h-7 w-32 text-right"
            />
          </div>
          <div className="flex items-center justify-between border-t pt-2 text-base font-semibold">
            <span>Khách cần trả</span>
            <span>{formatCurrency(total)}</span>
          </div>

          <Button
            className="h-12 w-full text-base"
            disabled={cart.length === 0}
            onClick={() => setPaymentOpen(true)}
          >
            THANH TOÁN
          </Button>
        </div>
      </div>

      {/* Cột phải: chọn sản phẩm */}
      <div className="flex min-h-0 flex-col rounded-lg border bg-card">
        <div className="border-b p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Tìm hàng hóa theo tên hoặc mã"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {searchResults.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              Không tìm thấy sản phẩm.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
              {searchResults.map((product) => {
                const out = product.stock_quantity <= 0;
                return (
                  <button
                    key={product.id}
                    type="button"
                    disabled={out}
                    onClick={() => addToCart(product)}
                    className="flex flex-col items-start rounded-lg border p-2 text-left transition-colors hover:border-primary hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="line-clamp-2 text-sm font-medium">
                      {product.name}
                    </span>
                    <span className="mt-1 text-xs text-muted-foreground">
                      {product.code}
                    </span>
                    <span className="mt-1 text-sm font-semibold text-primary">
                      {formatCurrency(product.export_price)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Tồn: {product.stock_quantity}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <PaymentDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        total={total}
        hasCustomer={customerId !== CUSTOMER_WALKIN}
        submitting={submitting}
        onConfirm={handleConfirm}
      />

      <CustomerFormDialog
        open={customerDialogOpen}
        onOpenChange={setCustomerDialogOpen}
        customer={null}
        onSubmit={async (values) => {
          try {
            const created = await createCustomer(values);
            setCustomerOptions((prev) => [created, ...prev]);
            setCustomerId(String(created.id));
            toast.success("Đã thêm khách hàng");
          } catch {
            toast.error("Không thể lưu khách hàng (mã có thể đã tồn tại)");
            throw new Error("save failed");
          }
        }}
      />

      <InvoicePrintDialog
        open={!!printReceipt}
        onOpenChange={(open) => {
          if (!open) setPrintReceipt(null);
        }}
        type="export"
        receipt={printReceipt}
        partner={printPartner}
      />
    </div>
  );
}
