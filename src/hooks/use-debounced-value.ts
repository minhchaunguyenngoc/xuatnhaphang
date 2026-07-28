import { useEffect, useState } from "react";

/** Trễ áp dụng giá trị (vd. ô tìm kiếm) sau khi người dùng ngừng gõ —
 * tránh gọi backend liên tục theo từng phím bấm. */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
}
