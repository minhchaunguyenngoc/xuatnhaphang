"use client";

import { useEffect, useState } from "react";

import {
  Combobox,
  ComboboxClear,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxInputGroup,
  ComboboxItem,
  ComboboxList,
  ComboboxPopup,
  ComboboxTrigger,
} from "@/components/ui/combobox";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

interface PartnerOption {
  id: number;
  name: string;
}

interface PartnerPickerProps<T extends PartnerOption> {
  value: T | null;
  onSelect: (partner: T | null) => void;
  /** Hàm tìm kiếm phía server (searchCustomers/searchSuppliers) — không tải
   * sẵn cả danh bạ, vẫn dùng tốt khi có rất nhiều khách/NCC. */
  search: (query: string) => Promise<T[]>;
  placeholder?: string;
}

/** Ô tìm-chọn khách hàng/nhà cung cấp tìm kiếm phía server — dùng chung cho
 * phiếu nhập (NCC) và phiếu xuất (khách hàng). */
export function PartnerPicker<T extends PartnerOption>({
  value,
  onSelect,
  search,
  placeholder,
}: PartnerPickerProps<T>) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 250);
  const [results, setResults] = useState<T[]>([]);

  useEffect(() => {
    let active = true;
    void search(debouncedQuery).then((items) => {
      if (active) setResults(items);
    });
    return () => {
      active = false;
    };
  }, [debouncedQuery, search]);

  const items =
    value && !results.some((p) => p.id === value.id) ? [value, ...results] : results;

  return (
    <Combobox<T | null>
      items={items}
      itemToStringLabel={(partner) => partner?.name ?? ""}
      isItemEqualToValue={(a, b) => a?.id === b?.id}
      value={value}
      onValueChange={onSelect}
      // Không truyền `inputValue` — lý do xem ghi chú trong ProductPicker.
      // Truyền vào là ô Nhà cung cấp/Khách hàng trống trơn khi mở lại phiếu.
      onInputValueChange={setQuery}
    >
      <ComboboxInputGroup className="min-w-0 flex-1">
        <ComboboxInput placeholder={placeholder ?? "Gõ tên để tìm..."} />
        <ComboboxClear />
        <ComboboxTrigger />
      </ComboboxInputGroup>
      <ComboboxPopup>
        <ComboboxEmpty>Không tìm thấy.</ComboboxEmpty>
        <ComboboxList>
          {(partner: T) => <ComboboxItem key={partner.id} value={partner}>{partner.name}</ComboboxItem>}
        </ComboboxList>
      </ComboboxPopup>
    </Combobox>
  );
}
