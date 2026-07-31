# CODEMAPS — Bản đồ sửa code nhanh

**Mục tiêu:** Mỗi lần sửa feature, agent/dev **chỉ mở các file trong map**, không rà toàn repo.

## Cách dùng (bắt buộc cho agent)

1. Đọc bảng **Feature → Files** trong `FEATURE_MAP.md`.
2. Chỉ `read` / `edit` các file được liệt kê (+ file liên quan trực tiếp nếu stacktrace chỉ ra).
3. Thứ tự layer khi sửa full-stack:

```
UI page/component → store → api.ts + types.ts → commands.rs → db.rs → models.rs
```

4. Sau khi xong feature: cập nhật `FEATURE_MAP.md` nếu thêm file/command/bảng mới.

## Cấu trúc docs

| File | Nội dung |
|------|----------|
| `FEATURE_MAP.md` | **Entry point chính** — feature → file + command + bảng DB |
| `BACKEND.md` | Rust: modules, line ranges trong `db.rs`, FIFO helpers |
| `FRONTEND.md` | Next.js pages, components, stores, lib |
| `DATA_FLOW.md` | Luồng dữ liệu, schema SQLite, quy tắc nghiệp vụ ngắn |

## File “nặng” cần tránh đọc full nếu không cần

| File | ~dòng | Khi nào mở |
|------|------:|------------|
| `src-tauri/src/db.rs` | ~4300 | Chỉ offset theo section trong `BACKEND.md` |
| `src/stores/inventory-store.ts` | ~500 | Sửa state products/customers/imports/exports/dashboard |
| `src/lib/types.ts` | ~340 | Đổi shape DTO frontend |
| `src-tauri/src/models.rs` | ~400 | Đổi shape DTO backend (giữ sync với types.ts) |

## Lệnh nhanh

```bash
# Dev desktop
npm run tauri dev

# Test logic DB (FIFO, debt, returns…)
cd src-tauri && cargo test

# Lint frontend
npm run lint
```
