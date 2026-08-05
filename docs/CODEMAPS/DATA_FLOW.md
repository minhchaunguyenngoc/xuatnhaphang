# Data flow & schema notes

## Luồng chuẩn

```
Page / Dialog
    ↓ actions
Zustand store (src/stores/*)
    ↓ api.xxx()
src/lib/api.ts  →  invoke("command_name")
    ↓
commands.rs  (map error → String)
    ↓
db.rs  (rusqlite transaction + business rules)
    ↓
SQLite inventory.db
    ↓ Result
store set state → re-render UI
```

## FIFO / profit (tóm tắt — chi tiết trong CLAUDE.md)

1. **Nhập:** tạo `product_batches` (qty, remaining, cost, import_date); cập nhật avg `products.import_price`.
2. **Xuất:** `consume_batches_fifo` theo `import_date`; ghi `export_items.cost_price`; `recompute_avg_cost`.
3. **Lợi nhuận dòng:** `(unit_price - cost_price) * qty`.
4. **Lợi nhuận kỳ:** tổng dòng − discount phiếu (phân bổ tỷ lệ trên report theo SP).
5. **Trả KH:** restock batch + điều chỉnh debt/doanh thu report.
6. **Trả NCC:** giảm tồn nếu lô còn; reject nếu đã bán hết batch.
7. **Trả nợ (Debts):** `create/update/delete_debt_payment` cộng/trừ `export_receipts.amount_paid` và `customers.debt` cùng 1 transaction, gắn đúng 1 hoá đơn, clamp không vượt `remaining` của hoá đơn đó. Mỗi lần trả lưu `payment_method` (`cash`/`transfer`, không nhận `debt`) — validate ở `create_debt_payment`/`update_debt_payment`.

## File “source of truth” theo loại thay đổi

| Muốn đổi… | Mở trước |
|-----------|----------|
| Tên field DTO | `models.rs` + `types.ts` + `api.ts` |
| Rule tồn/FIFO/debt | `db.rs` section tương ứng + tests cuối file |
| Command mới | checklist trong `FEATURE_MAP.md` §13 |
| Màn hình list/filter | `app/<feature>/page.tsx` + store fetch |
| Form dialog | `components/**/*-form-dialog.tsx` + `schemas.ts` |
| Menu / quyền thấy trang | `sidebar.tsx` + `auth-store` |
| In hóa đơn | `invoice-print-dialog.tsx` + company-store |
| Excel | `export.ts` / `import-excel.ts` |

## Anti-patterns (tránh)

- Gọi `invoke` rải rác ngoài `api.ts`
- Sửa `db.rs` full-file read — dùng line range `BACKEND.md`
- Đổi `import_price` tay trên UI khi còn tồn
- Thêm table mà không `CREATE IF NOT EXISTS` + migrate an toàn
- `#[tauri::command]` sync non-async attribute (project chuẩn `async` attribute + blocking `fn`)
