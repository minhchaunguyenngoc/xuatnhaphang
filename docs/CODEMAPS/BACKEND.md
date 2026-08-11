# Backend map (Tauri + Rust + SQLite)

## Modules (`src-tauri/src/`)

| File | Vai trò | ~dòng |
|------|---------|------:|
| `main.rs` | Entry binary | 6 |
| `lib.rs` | Bootstrap DB, `invoke_handler` đăng ký commands | 68 |
| `commands.rs` | Thin Tauri wrappers → `db.*` | 277 |
| `db.rs` | **Toàn bộ SQL + business logic + unit tests** | ~5230 |
| `models.rs` | DTO serde (Product, Receipts, User…) | ~400 |
| `auth.rs` | `hash_password` / `verify_password` (argon2) | 45 |

Config: `src-tauri/tauri.conf.json`, `Cargo.toml`, `capabilities/default.json`.

## Contract commands

- Mọi command: `#[tauri::command(async)]` + **`pub fn`** (blocking trên async runtime, không `async fn`).
- Lỗi trả `Result<T, String>` (tiếng Việt thân thiện).
- Frontend gọi qua `invoke("snake_case_name", { ... })` trong `src/lib/api.ts`.

## `db.rs` — mở theo section (line ranges)

> Line có thể lệch nhẹ sau refactor; search `pub fn <name>` nếu lệch.

### Core / schema

| Khoảng | Nội dung |
|--------|----------|
| ~1–104 | `Database`, `app_err`, validate header, path helpers |
| ~105–467 | `init_schema`, indexes, migrations, `add_column_if_missing`, backfill |
| ~499–571 | **FIFO:** `consume_batches_fifo`, `recompute_avg_cost` |

### Products (~572–814)

`get_products`, `get_low_stock_products`, `create_product`, `insert_product`, `generate_product_code`, `update_product`, `delete_product`, `get_product_by_id`

### Customers (~815–946)

CRUD + `map_customer`

### Suppliers (~947–1067)

CRUD + `map_supplier`

### Imports (~1068–1480)

`create_import_receipt`, `get_import_receipts`, `get_import_receipt`, `update_import_receipt`

### Exports (~1481–1964)

`create_export_receipt`, `reverse_export_effects`, `update_export_receipt`, `delete_export_receipt`, `get_export_receipts`, `get_export_receipt`

### Returns (~2020–2718)

Helpers: `apply_customer_return_lines`, `apply_customer_return_debt`, `apply_supplier_return_*`, `reverse_return_effects`  
Public: create/update customer|supplier return, `delete_return_receipt`, `get_return_receipts`

### Debt payments (~2772–3027)

`get_debt_payment`, `create_debt_payment`, `update_debt_payment`, `delete_debt_payment`, `get_debt_payments`, `get_customers_with_debt`, `get_customer_debt_invoices` — xem [FEATURE_MAP.md §6](FEATURE_MAP.md#6-debts-công-nợ-khách-hàng)

### Auth / users (~3029–3267)

`login`, `get_users`, `create_user`, `update_user`, `delete_user`, permissions load

### Dashboard / reports / history (~3268–3554)

`get_dashboard_stats`, `get_profit_report`, `get_receipt_profit_report`, `get_inventory_history`

### Init + tests (~3555–end)

`init_database`, `#[cfg(test)]` — FIFO, debt, profit, returns, product code, pagination

## Tables (schema trong `init_schema`)

| Table | Mục đích |
|-------|----------|
| `products` | Danh mục + stock + avg cost (`import_price`) + list price (`export_price`) |
| `product_batches` | Lô nhập còn lại (FIFO) |
| `import_receipts` / `import_items` | Phiếu nhập |
| `export_receipts` / `export_items` | Phiếu xuất (+ `cost_price` từng dòng) |
| `return_receipts` / `return_items` | Trả hàng KH / NCC |
| `inventory_history` | Lịch sử biến động / đổi giá |
| `customers` / `suppliers` | Đối tác + `debt` |
| `debt_payments` | Từng lần khách trả nợ, gắn 1 `export_receipt_id` cụ thể + `payment_method` (`cash`/`transfer`) |
| `users` / `user_permissions` | Auth local |
| `audit_log` | Audit |

DB file: app data dir / `inventory.db` (local, single-user).

## Hotspots nghiệp vụ (đọc trước khi sửa)

| Chủ đề | Hàm |
|--------|-----|
| FIFO costing | `consume_batches_fifo` |
| Giá vốn TB | `recompute_avg_cost` — hết lô thì GIỮ giá cũ, không về 0; `backfill_last_known_cost` sửa dữ liệu cũ (SCHEMA_VERSION 3) |
| Không oversell | check stock trong `create_export_receipt` |
| Công nợ KH | clamp `amount_paid` trong export; return giảm debt |
| Sửa phiếu nhập | `update_import_receipt` — reject nếu batch đã bán |
| Sửa/xoá phiếu xuất | `update_export_receipt`/`delete_export_receipt` — reject nếu đã có phiếu trả hàng dựa trên hoá đơn |
| Reverse trả hàng | `reverse_return_effects` |
| Trả nợ theo hoá đơn | `create/update/delete_debt_payment` — gắn đúng 1 `export_receipt_id`, clamp không vượt `remaining`, `payment_method` chỉ `cash`/`transfer` |
| Profit + discount + returns | `get_profit_report` (theo SP), `get_receipt_profit_report` (theo hoá đơn) — 2 báo cáo phải khớp tổng |

## Tests nên chạy khi đụng hotspot

```bash
cd src-tauri && cargo test
# hoặc filter:
cargo test fifo
cargo test debt
cargo test profit
cargo test return
cargo test product
```
