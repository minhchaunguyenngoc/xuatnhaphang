# Feature → Files (sửa đúng chỗ)

Quy ước cột:

- **UI** = page + dialog/component
- **Store** = Zustand
- **API** = `src/lib/api.ts` method + Tauri command name
- **DB** = method trong `src-tauri/src/db.rs` (xem line range ở `BACKEND.md`)
- **Tables** = bảng SQLite chạm tới

---

## 1. Dashboard (Tổng quan)

| Layer | Files |
|-------|--------|
| UI | `src/app/page.tsx` |
| Store | `src/stores/inventory-store.ts` → `fetchDashboard`, `dashboardStats` |
| API | `api.getDashboardStats` → `get_dashboard_stats` |
| DB | `get_dashboard_stats` |
| Tables | `products`, `import_receipts`, `export_receipts`, `customers` |

---

## 2. Products (Hàng hoá)

| Layer | Files |
|-------|--------|
| UI | `src/app/products/page.tsx`, `src/components/products/product-form-dialog.tsx`, `src/components/products/product-picker.tsx` |
| Store | `inventory-store` → `fetchProducts`, `createProduct`, `updateProduct`, `deleteProduct`, `importProducts` |
| API | `getProducts`, `createProduct`, `updateProduct`, `deleteProduct`, `getProductById`, `getLowStockProducts` |
| Lib | `src/lib/import-excel.ts` (import Excel), `src/lib/schemas.ts` |
| DB | `get_products` … `delete_product`, `generate_product_code`, `insert_product` |
| Tables | `products`, `inventory_history` (đổi giá xuất), `product_batches` (gián tiếp qua tồn) |

**Quy tắc:** `import_price` (giá vốn TB) do hệ thống quản lý khi còn tồn — UI khóa, backend `update_product` giữ giá cũ.

---

## 3. Imports (Nhập hàng)

| Layer | Files |
|-------|--------|
| UI | `src/app/imports/page.tsx`, `src/components/receipts/receipt-form-dialog.tsx`, `src/components/receipts/invoice-print-dialog.tsx` |
| Store | `inventory-store` → `fetchImportReceipts`, `createImportReceipt`, `updateImportReceipt` |
| API | `getImportReceipts`, `createImportReceipt`, `updateImportReceipt`, `getImportReceiptById` |
| DB | `create_import_receipt`, `get_import_receipts`, `get_import_receipt`, `update_import_receipt` |
| Tables | `import_receipts`, `import_items`, `products`, `product_batches`, `inventory_history`, `suppliers` (debt nếu có) |

**Quy tắc:** mỗi dòng nhập → 1 batch; `update` bị từ chối nếu batch đã tiêu thụ (FIFO).

---

## 4. Exports / POS / Hóa đơn (Xuất bán)

| Layer | Files |
|-------|--------|
| UI POS | `src/app/pos/page.tsx`, `src/components/pos/payment-dialog.tsx` |
| UI list | `src/app/exports/page.tsx` |
| Shared form | `src/components/receipts/receipt-form-dialog.tsx`, `invoice-print-dialog.tsx` |
| Store | `inventory-store` → `fetchExportReceipts`, `createExportReceipt`, `updateExportReceipt`, `deleteExportReceipt` |
| API | `getExportReceipts`, `createExportReceipt`, `updateExportReceipt`, `deleteExportReceipt`, `getExportReceiptById` |
| DB | `create_export_receipt`, `update_export_receipt`, `delete_export_receipt`, `get_export_receipts`, `get_export_receipt` + helpers `consume_batches_fifo`, `recompute_avg_cost` |
| Tables | `export_receipts`, `export_items`, `products`, `product_batches`, `inventory_history`, `customers` (debt) |
| Permission | `exports.edit` (sửa ngày/khách/mặt hàng/ghi chú qua `receipt-form-dialog.tsx`, không đổi chiết khấu/đã thu), `exports.delete` (xoá phải reverse tồn kho + debt; chặn nếu đã có phiếu trả hàng dựa trên hoá đơn) |

**Quy tắc:** FIFO theo `import_date`; `export_items.cost_price` = giá vốn thực; debt = `total - amount_paid` (clamp paid); discount cấp phiếu. Sửa hoá đơn qua `receipt-form-dialog.tsx` không đổi chiết khấu/số tiền đã thu/hình thức thanh toán — đổi trạng thái thanh toán thuộc trang [Debts](#6-debts-công-nợ-khách-hàng) riêng.

---

## 5. Returns (Trả hàng)

| Layer | Files |
|-------|--------|
| UI | `src/app/returns/page.tsx`, `src/components/receipts/return-form-dialog.tsx` |
| Store | `src/stores/returns-store.ts` (riêng, không gộp inventory-store) |
| API | `getReturnReceipts`, `createCustomerReturn`, `createSupplierReturn`, `updateCustomerReturn`, `updateSupplierReturn`, `deleteReturnReceipt` |
| DB | `create/update_customer_return`, `create/update_supplier_return`, `delete_return_receipt`, `reverse_return_effects`, `apply_*_return_*` |
| Tables | `return_receipts`, `return_items`, `product_batches`, `products`, `customers`/`suppliers`, `inventory_history` |

**Quy tắc:** KH trả → restock batch theo cost gốc + giảm debt; trả NCC → giảm tồn nếu batch còn; xóa/sửa phải reverse effects.

---

## 6. Debts (Công nợ khách hàng)

| Layer | Files |
|-------|--------|
| UI | `src/app/debts/page.tsx`, `src/components/debts/debt-payment-dialog.tsx` |
| Store | `src/stores/debts-store.ts` (riêng, không gộp inventory-store) |
| API | `getCustomersWithDebt`, `getCustomerDebtInvoices`, `getDebtPayments`, `createDebtPayment`, `updateDebtPayment`, `deleteDebtPayment` |
| DB | `get_customers_with_debt`, `get_customer_debt_invoices`, `get_debt_payments`, `create_debt_payment`, `update_debt_payment`, `delete_debt_payment` |
| Tables | `debt_payments`, `export_receipts` (`amount_paid`), `customers` (`debt`) |
| Permission | `debts.manage` (`auth.rs` PERMISSION_KEYS) |

**Quy tắc:** trả nợ gắn vào ĐÚNG 1 hoá đơn (`export_receipt_id`), không tự chia FIFO qua nhiều hoá đơn; cộng/trừ `export_receipts.amount_paid` và `customers.debt` luôn cùng 1 transaction; sửa/xoá lần trả phải gỡ tác động cũ trước khi áp lại (xem test `update_debt_payment`/`delete_debt_payment_restores_debt` trong `db.rs`).

---

## 7. Inventory (Kiểm kho / lịch sử)

| Layer | Files |
|-------|--------|
| UI | `src/app/inventory/page.tsx` |
| Store | `inventory-store` → `fetchInventoryHistory`, `fetchProducts`, `fetchLowStockProducts` |
| API | `getInventoryHistory`, `getProducts`, `getLowStockProducts` |
| DB | `get_inventory_history`, `get_products`, `get_low_stock_products` |
| Tables | `inventory_history`, `products`, `product_batches` |

---

## 8. Customers / Suppliers

| Feature | UI | Store | API/DB |
|---------|----|-------|--------|
| Customers | `src/app/customers/page.tsx`, `components/customers/customer-form-dialog.tsx` | `inventory-store` customers* | `get/create/update/delete_customer*` |
| Suppliers | `src/app/suppliers/page.tsx`, `components/suppliers/supplier-form-dialog.tsx` | `inventory-store` suppliers* | `get/create/update/delete_supplier*` |
| Shared picker | `components/shared/partner-picker.tsx` | — | — |

Tables: `customers`, `suppliers` (+ `debt`).

---

## 9. Reports (Báo cáo + Excel)

| Layer | Files |
|-------|--------|
| UI | `src/app/reports/page.tsx` |
| Store | `inventory-store` → `fetchProfitReport`, receipts lists |
| API | `getProfitReport`, `getImportReceipts`, `getExportReceipts` |
| Lib | `src/lib/export.ts` (xlsx), `src/lib/format.ts` |
| DB | `get_profit_report` |
| Tables | `export_receipts`, `export_items`, `return_*` (trừ doanh thu trả), `import_*` |

**Quy tắc:** profit = (unit - cost)*qty − discount phân bổ; customer returns trừ khỏi report.

---

## 10. Auth / Users / Permissions

| Layer | Files |
|-------|--------|
| Login UI | `src/components/auth/login-screen.tsx` |
| Shell | `src/components/layout/app-shell.tsx`, `sidebar.tsx` (nav + permission filter) |
| Users UI | `src/app/users/page.tsx`, `components/users/user-form-dialog.tsx` |
| Store | `src/stores/auth-store.ts`, `src/stores/users-store.ts` |
| API | `login`, `getUsers`, `createUser`, `updateUser`, `deleteUser`, `getPermissions` |
| Backend | `src-tauri/src/auth.rs` (hash/verify), `db.rs` login/users, `commands.rs` |
| Tables | `users`, `user_permissions`, `audit_log` |

Permissions keys (UI): `products.manage`, `imports.create`, `imports.edit`, `exports.create`, `exports.edit`, `exports.delete`, `suppliers.manage`, `customers.manage`, `returns.customer`, `returns.supplier`, `returns.edit`, `returns.delete`, `debts.manage`, `reports.view`, `settings.manage`.

---

## 11. Company settings (local UI only)

| Layer | Files |
|-------|--------|
| UI | `src/components/settings/company-settings-dialog.tsx` |
| Store | `src/stores/company-store.ts` (localStorage, **không** qua Tauri) |

---

## 12. Shared / UI kit (chỉ khi sửa design system)

| Area | Path |
|------|------|
| shadcn primitives | `src/components/ui/*` |
| Layout chrome | `src/components/layout/*`, `src/components/shared/*` |
| Global styles | `src/app/globals.css`, `src/app/layout.tsx` |
| Utils | `src/lib/utils.ts`, `errors.ts`, `format.ts` |
| Forms validation | `src/lib/schemas.ts` (Zod) |
| Hooks | `src/hooks/use-debounced-value.ts` |

---

## 13. Khi thêm command mới (checklist)

1. Struct input/output trong `src-tauri/src/models.rs`
2. Method trong `src-tauri/src/db.rs` (+ test trong `#[cfg(test)]` cuối file)
3. Wrapper `#[tauri::command(async)]` trong `commands.rs` (giữ `pub fn`, **không** `async fn`)
4. Đăng ký trong `src-tauri/src/lib.rs` `invoke_handler![]`
5. Type mirror trong `src/lib/types.ts`
6. Method trong `src/lib/api.ts`
7. Store action + page/component
8. Cập nhật **file map này**

---

## 14. Khi sửa schema DB

1. `init_schema` / `add_column_if_missing` trong `db.rs` (không phá DB cũ)
2. Model + types.ts
3. Test migration/backfill nếu cần
4. Cập nhật `DATA_FLOW.md`
