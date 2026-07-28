"use client";

import { useEffect, useState } from "react";

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
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import type { Product } from "@/lib/types";
import { useInventoryStore } from "@/stores/inventory-store";

interface ProductPickerProps {
  value: Product | null;
  onSelect: (product: Product) => void;
  placeholder?: string;
}

/** Ô tìm-chọn sản phẩm tìm kiếm phía server (gõ tới đâu, hỏi backend tới đó)
 * — không tải sẵn cả danh mục vào trình duyệt, vẫn dùng tốt khi có hàng
 * triệu sản phẩm. Mỗi dòng trong phiếu nhập/xuất dùng 1 instance riêng, tự
 * quản lý từ khoá tìm kiếm của chính nó. */
export function ProductPicker({ value, onSelect, placeholder }: ProductPickerProps) {
  const searchProducts = useInventoryStore((state) => state.searchProducts);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 250);
  const [results, setResults] = useState<Product[]>([]);

  useEffect(() => {
    let active = true;
    void searchProducts(debouncedQuery).then((items) => {
      if (active) setResults(items);
    });
    return () => {
      active = false;
    };
  }, [debouncedQuery, searchProducts]);

  // Sản phẩm đang chọn phải luôn hiện được nhãn đúng, kể cả khi chưa khớp
  // với từ khoá tìm hiện tại (vd. vừa mở lại phiếu để sửa).
  const items =
    value && !results.some((p) => p.id === value.id) ? [value, ...results] : results;

  return (
    <Combobox<Product | null>
      items={items}
      itemToStringLabel={(product) => (product ? `${product.code} - ${product.name}` : "")}
      isItemEqualToValue={(a, b) => a?.id === b?.id}
      value={value}
      onValueChange={(product) => {
        if (product) onSelect(product);
      }}
      // KHÔNG truyền `inputValue`: Base UI chỉ tự đổ nhãn của mục đang chọn
      // vào ô nhập khi phía dùng không kiểm soát phần chữ (xem
      // AriaCombobox.js: `hasInputValue` chặn 2 nhánh đồng bộ nhãn). Truyền
      // `inputValue` vào làm ô luôn trống khi `value` được gán bằng code —
      // tức mở lại phiếu để sửa thì mất sạch tên sản phẩm.
      // Chỉ lắng nghe `onInputValueChange` để lấy từ khoá tìm là đủ.
      onInputValueChange={setQuery}
    >
      <ComboboxInputGroup className="min-w-0 flex-1">
        <ComboboxInput placeholder={placeholder ?? "Gõ mã hoặc tên để tìm..."} />
        <ComboboxTrigger />
      </ComboboxInputGroup>
      <ComboboxPopup>
        <ComboboxEmpty>Không tìm thấy sản phẩm.</ComboboxEmpty>
        <ComboboxList>
          {(product: Product) => (
            <ComboboxItem key={product.id} value={product}>
              {product.code} - {product.name} (tồn: {product.stock_quantity})
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxPopup>
    </Combobox>
  );
}
