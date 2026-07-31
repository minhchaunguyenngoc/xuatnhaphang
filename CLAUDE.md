# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Status:** Active development. This is a local Desktop App quản lý Nhập - Xuất hàng (Inventory Management).

---

## ⚡ Agent navigation (đọc trước khi sửa code)

**Không rà toàn repo.** Mỗi task:

1. Mở `docs/CODEMAPS/FEATURE_MAP.md` → tìm feature → **chỉ đọc/sửa file trong bảng đó**.
2. Full-stack edit order:  
   `UI page/component → store → api.ts + types.ts → commands.rs → db.rs (+ models.rs)`.
3. `db.rs` (~4300 dòng): **không đọc full** — dùng line ranges trong `docs/CODEMAPS/BACKEND.md` hoặc `rg "pub fn <name>" src-tauri/src/db.rs`.
4. Thêm command/file mới → cập nhật `FEATURE_MAP.md` (checklist §12).

| Doc | Khi dùng |
|-----|----------|
| [`docs/CODEMAPS/README.md`](docs/CODEMAPS/README.md) | Mục lục + quy tắc |
| [`docs/CODEMAPS/FEATURE_MAP.md`](docs/CODEMAPS/FEATURE_MAP.md) | **Entry chính** feature → files |
| [`docs/CODEMAPS/BACKEND.md`](docs/CODEMAPS/BACKEND.md) | Rust modules, section `db.rs` |
| [`docs/CODEMAPS/FRONTEND.md`](docs/CODEMAPS/FRONTEND.md) | Pages, stores, components |
| [`docs/CODEMAPS/DATA_FLOW.md`](docs/CODEMAPS/DATA_FLOW.md) | Luồng invoke + schema notes |

### Cây thư mục ngắn

```
src/app/<route>/page.tsx     → màn hình
src/components/<domain>/     → dialogs, pickers
src/stores/*.ts              → Zustand (inventory | returns | auth | users | company)
src/lib/api.ts + types.ts    → bridge Tauri + DTO frontend
src-tauri/src/commands.rs    → thin wrappers
src-tauri/src/db.rs          → SQL + business logic + tests
src-tauri/src/models.rs      → DTO Rust
src-tauri/src/auth.rs        → password hash
src-tauri/src/lib.rs         → đăng ký invoke_handler
```

### File “nặng” — mở có chủ đích

| File | Chỉ mở khi |
|------|------------|
| `src-tauri/src/db.rs` | Sửa SQL/rule tồn/FIFO/returns/profit (theo section) |
| `src/stores/inventory-store.ts` | State products/partners/imports/exports/dashboard |
| `src/lib/types.ts` + `models.rs` | Đổi shape DTO (giữ sync 2 phía) |

Bỏ qua: `node_modules/`, `.next/`, `out/`, `src-tauri/target/`.

---

## Project Overview

Ứng dụng Desktop quản lý kho hàng, nhập xuất hàng hóa. Giúp theo dõi tồn kho realtime, quản lý sản phẩm, phiếu nhập/xuất, trả hàng, POS, và xuất báo cáo Excel. Chạy hoàn toàn local, phù hợp cho cá nhân/doanh nghiệp nhỏ. Tên project: xuatnhaphang.

## Tech Stack

- *Framework*: Tauri 2 + Next.js 15 (App Router) + TypeScript
- *UI*: Tailwind CSS + shadcn/ui + Lucide React
- *Database*: SQLite (local file-based)
- *State Management*: Zustand
- *Form Validation*: React Hook Form + Zod
- *Export*: xlsx (Excel reports)
- *Date*: date-fns
- *Build*: Tauri (build ra .exe / .dmg / AppImage)

## Commands

- *Install dependencies*: `npm install`
- *Run dev mode*: `npm run tauri dev`
- *Build desktop app*: `npm run tauri build`
- *Lint*: `npm run lint`
- *Backend tests*: `cd src-tauri && cargo test`

## Architecture

- *Frontend*: Next.js App Router — Dashboard, POS, Products, Inventory, Imports, Exports, Returns, Customers, Suppliers, Reports, Users.
- *Backend*: Tauri commands (`commands.rs`) + SQLite (`db.rs` / rusqlite).
- *Data Flow*: UI → Zustand (`src/stores`) → `api.ts` `invoke()` → command → SQLite → update store/UI.
- *Main modules*: xem bảng trong `docs/CODEMAPS/FEATURE_MAP.md`.
- *Database*: app data dir / `inventory.db`; schema + migrate trong `Database::init_schema`.

## Profit Logic (FIFO Costing)

- Mỗi phiếu nhập tạo 1 dòng `product_batches` (product_id, quantity, remaining_quantity, cost_price, `import_date` = ngày phiếu). Giá vốn bình quân trên `products.import_price` được cập nhật theo trọng số tồn kho hiện tại khi nhập.
- Khi xuất hàng, tiêu thụ batch theo thứ tự **ngày phiếu nhập** (FIFO theo `import_date`, không theo thời điểm insert); giá vốn thực tế của từng dòng xuất được lưu vào `export_items.cost_price`. Thiếu lô để tiêu thụ → báo lỗi (không lấy giá vốn tạm).
- Sau mỗi lần xuất, `products.import_price` được **tính lại** từ các lô còn tồn (`recompute_avg_cost`); hết lô → 0. Do đó khi còn tồn kho, `import_price` là giá vốn hệ thống quản lý và không cho sửa tay (UI khóa ô + backend giữ giá cũ trong `update_product`).
- Lợi nhuận dòng = (unit_price - cost_price) * quantity. Lợi nhuận đơn/kỳ = tổng lợi nhuận các dòng **trừ chiết khấu cấp phiếu** (`export_receipts.discount`), không phải tổng xuất trừ tổng nhập.
- Báo cáo lợi nhuận theo sản phẩm/kỳ dùng command `get_profit_report`, group theo product, tính margin %. Chiết khấu phiếu được **phân bổ theo tỷ lệ** `line_total / tổng dòng của phiếu` để trừ vào doanh thu từng sản phẩm; dashboard trừ discount một lần mỗi phiếu. Customer returns được trừ khỏi report.
- Công nợ khách khi bán: chỉ tính phần còn thiếu của chính hóa đơn (`amount_paid` kẹp `[0, total_amount]`) — tiền thừa không trừ nợ cũ.

## Security & Local Rules

- App chạy **local-first** (Tauri desktop), không có network API server — không áp dụng JWT/OAuth/HTTPS/rate-limit kiểu web server.
- Auth **local multi-user**: bảng `users` + `user_permissions`, password hash argon2 (`auth.rs`), session Zustand + permission keys trên UI (`sidebar`, `hasPermission`). Vẫn single-machine, không server.
- Validate UI bằng Zod; SQL parameterized (`params!`), không nối chuỗi.
- Lỗi Rust map `.map_err(|e| e.to_string())` — thông điệp tiếng Việt; không leak stack trace production.

## Hướng dẫn agent

- Plan → Code (đúng file map) → Review → Test (`cargo test` khi đụng `db.rs`/FIFO/returns/profit).
- TypeScript strict; comment khi rule nghiệp vụ không hiển nhiên.
- Feature/command/schema mới → cập nhật `docs/CODEMAPS/*` (và CLAUDE.md nếu đổi rule nền).
- Spec đụng mạng/multi-device/cloud: hỏi user trước; mặc định giữ local-first.
