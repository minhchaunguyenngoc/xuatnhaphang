# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Status:** Active development. This is a local Desktop App quản lý Nhập - Xuất hàng (Inventory Management).


## Project Overview

Ứng dụng Desktop quản lý kho hàng, nhập xuất hàng hóa. Giúp theo dõi tồn kho realtime, quản lý sản phẩm, phiếu nhập/xuất, và xuất báo cáo Excel. Chạy hoàn toàn local, phù hợp cho cá nhân/doanh nghiệp nhỏ. Tên project: xuatnhaphang.

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

- *Install dependencies*: npm install
- *Run dev mode*: npm run tauri dev
- *Build desktop app*: npm run tauri build
- *Lint*: npm run lint
- *Format*: npm run format

## Architecture

- *Frontend*: Next.js App Router (app/ directory) với các trang: Dashboard, Products, Imports, Exports, Reports.
- *Backend*: Tauri commands (src-tauri/src/commands.rs) + Rust core + SQLite qua rusqlite (src-tauri/src/db.rs).
- *Data Flow*: UI → Zustand Store (src/stores) → `invoke()` Tauri command → SQLite → Realtime update UI.
- *Main Modules*:
  - Products: Quản lý danh mục hàng hóa (giá nhập = giá vốn bình quân gia quyền, giá xuất = giá bán niêm yết).
  - Imports: Phiếu nhập hàng (tăng tồn kho, mở batch mới với giá vốn tại thời điểm nhập).
  - Exports: Phiếu xuất hàng (giảm tồn kho, tiêu thụ batch theo FIFO để tính đúng giá vốn đã bán).
  - Inventory: Theo dõi tồn kho hiện tại + lịch sử (inventory_history) + batch còn lại (product_batches).
  - Reports: Báo cáo nhập/xuất, tồn kho, lợi nhuận theo sản phẩm/khoảng thời gian + export Excel.
- *Database*: Single local SQLite file (app data dir/inventory.db), schema khởi tạo + migrate tự động trong `Database::init_schema`.

## Profit Logic (FIFO Costing)

- Mỗi phiếu nhập tạo 1 dòng `product_batches` (product_id, quantity, remaining_quantity, cost_price, `import_date` = ngày phiếu). Giá vốn bình quân trên `products.import_price` được cập nhật theo trọng số tồn kho hiện tại khi nhập.
- Khi xuất hàng, tiêu thụ batch theo thứ tự **ngày phiếu nhập** (FIFO theo `import_date`, không theo thời điểm insert); giá vốn thực tế của từng dòng xuất được lưu vào `export_items.cost_price`. Thiếu lô để tiêu thụ → báo lỗi (không lấy giá vốn tạm).
- Sau mỗi lần xuất, `products.import_price` được **tính lại** từ các lô còn tồn (`recompute_avg_cost`); hết lô → 0. Do đó khi còn tồn kho, `import_price` là giá vốn hệ thống quản lý và không cho sửa tay (UI khóa ô + backend giữ giá cũ trong `update_product`).
- Lợi nhuận dòng = (unit_price - cost_price) * quantity. Lợi nhuận đơn/kỳ = tổng lợi nhuận các dòng **trừ chiết khấu cấp phiếu** (`export_receipts.discount`), không phải tổng xuất trừ tổng nhập.
- Báo cáo lợi nhuận theo sản phẩm/kỳ dùng command `get_profit_report`, group theo product, tính margin %. Chiết khấu phiếu được **phân bổ theo tỷ lệ** `line_total / tổng dòng của phiếu` để trừ vào doanh thu từng sản phẩm; dashboard trừ discount một lần mỗi phiếu.
- Công nợ khách khi bán: chỉ tính phần còn thiếu của chính hóa đơn (`amount_paid` là tiền khách đưa nên được kẹp về `[0, total_amount]` trước khi tính nợ) — tiền thừa không trừ nợ cũ.

## Security & Local Rules

- App chạy hoàn toàn local, không có network server, không có JWT/OAuth/HTTPS/rate-limiting vì không có request nào đi qua mạng — các cơ chế bảo mật kiểu web server đó **không áp dụng** cho kiến trúc Tauri desktop này.
- Validate nghiêm ngặt input ở tầng UI bằng Zod, và ở tầng Rust bằng parameterized queries (rusqlite params!, không nối chuỗi SQL).
- Chưa có multi-user/RBAC. Nếu cần phân quyền trong tương lai: dùng bảng `users` local (PIN/password hash bằng argon2/bcrypt) + session lưu local + audit log các thao tác quan trọng — vẫn không cần JWT/HTTPS vì không có server.
- Không log/expose stack trace Rust ra UI production; luôn map lỗi qua `.map_err(|e| e.to_string())` với thông điệp tiếng Việt dễ hiểu cho người dùng cuối.

*Hướng dẫn cho Claude Code:* 
- Luôn tuân thủ quy trình: Plan → Code → Review → Test.
- Ưu tiên code sạch, TypeScript strict, comment rõ ràng.
- Khi thêm feature mới → cập nhật CLAUDE.md nếu cần.
- Khi có yêu cầu spec mới đụng tới kiến trúc nền tảng (auth, network, multi-user...), đối chiếu với "Security & Local Rules" ở trên trước khi áp dụng máy móc — ưu tiên giữ đúng bản chất local-first, single-user của app trừ khi user xác nhận muốn đổi kiến trúc.