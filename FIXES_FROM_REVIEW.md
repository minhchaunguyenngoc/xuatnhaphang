# Fix plan — Code review handoff (Claude)

> File này để Claude Code đọc và **sửa bug theo thứ tự ưu tiên**.  
> Nguồn: full codebase review (2026-07-17).  
> Stack: Tauri 2 + Next.js 15 + SQLite (rusqlite). Đọc `CLAUDE.md` trước khi code.

**Quy tắc khi sửa:**
1. Plan → Code → Review → Test (theo CLAUDE.md).
2. Ưu tiên **bug P0/P1** trước; suggestions làm sau nếu còn thời gian.
3. Giữ kiến trúc local-first, single-user. Không thêm JWT/network auth.
4. Validate ở UI (Zod) **và** Rust. Lỗi map sang tiếng Việt dễ hiểu.
5. SQL parameterized (`params!`), mutation quan trọng trong transaction.
6. Sửa xong: `npm run lint` + build/check Rust nếu có thể (`cargo check` trong `src-tauri`).
7. Cập nhật file này: đánh dấu `[x]` khi xong từng issue.

---

## Bối cảnh nghiệp vụ (đọc kỹ)

| Khái niệm | Ý nghĩa trong app |
|-----------|-------------------|
| `products.import_price` | Giá vốn bình quân gia quyền (weighted average) — dùng định giá tồn + fallback FIFO |
| `product_batches` | Từng lô nhập; xuất tiêu thụ FIFO theo batch |
| `export_items.cost_price` | Giá vốn thực tế dòng xuất (sau FIFO) |
| `export_receipts.discount` | Chiết khấu cấp phiếu (POS) |
| `export_receipts.amount_paid` | Hiện đang lưu **tiền khách đưa (tender)** từ POS — dễ nhầm với số đã áp vào hóa đơn |
| Lợi nhuận | Doanh thu − giá vốn FIFO dòng bán, **không** phải “tổng xuất − tổng nhập” |

---

## P0 — Sửa ngay (sai tiền / tồn kho)

### [x] Issue 1 — Debt khách hàng dùng tender thay vì số đã thu áp hóa đơn

- **File:** `src-tauri/src/db.rs` (~dòng 744–750), liên quan POS: `src/components/pos/payment-dialog.tsx`, `src/app/pos/page.tsx`
- **Bug:** `debt += total_amount - amount_paid`. POS gửi `amount_paid` = tiền khách đưa. Khi tender > total (có tiền thừa), `remaining` âm → **giảm công nợ khách sai**.
- **Fix:**
  1. Trong `create_export_receipt`, tính:
     ```text
     applied = min(amount_paid, total_amount).max(0)
     remaining_for_debt = (total_amount - applied).max(0)
     ```
  2. Cập nhật `customers.debt += remaining_for_debt` (và `total_spent` theo `total_amount` hoặc policy hiện tại — giữ nhất quán).
  3. Vẫn được lưu `amount_paid` nguyên (tender) nếu cần in tiền thừa; **chỉ debt math dùng `applied`**.
  4. Không dùng overpayment để trừ nợ cũ trừ khi có feature “thanh toán nợ” riêng (chưa có → đừng tự suy).
- **Test thủ công:**
  - Khách có sẵn debt 100k; bán 50k, tender 100k, change 50k → debt **không giảm**, chỉ +0 nợ mới (hoá đơn đã trả đủ).
  - Bán 50k, tender 20k, có customer_id → debt +30k.

### [x] Issue 2 + 3 — Báo cáo lợi nhuận bỏ qua chiết khấu phiếu

- **File:** `src-tauri/src/db.rs` — `get_dashboard_stats` (~901–908), `get_profit_report` (~920–933); frontend `src/app/reports/page.tsx` nếu cần copy.
- **Bug:** Revenue/profit từ `SUM(export_items.total_price)` và `total_price - qty*cost` **không trừ** `export_receipts.discount`. Chiết khấu POS → LN/margin **ảo cao**.
- **Fix (chọn 1, ưu tiên A):**
  - **A (khuyến nghị):** Ở report/dashboard, join receipt:
    - Doanh thu kỳ = `SUM(ei.total_price)` theo phiếu − `er.discount` (cẩn thận double-count khi group: subtract discount **một lần/phiếu**).
    - Lợi nhuận = doanh thu đã trừ CK − tổng giá vốn FIFO.
  - **B:** Khi tạo phiếu, phân bổ `discount` tỷ lệ vào từng `export_items.total_price` (đổi schema/hành vi lưu — impact lớn hơn).
  - Product-level: phân bổ discount theo tỷ lệ `line_total / items_total` rồi trừ vào revenue từng SP.
- **Test:** POS 1 SP 100k, CK 10k, cost 40k → doanh thu 90k, LN 50k (không phải 60k).

### [x] Issue 4 — Kiểm tra tồn theo dòng, không aggregate theo product

- **File:** `src-tauri/src/db.rs` — `create_export_receipt` (~693–705)
- **Bug:** Hai dòng cùng `product_id` (qty 6+6, tồn 10) mỗi dòng pass `stock >= qty` → sau đó tồn âm.
- **Fix:**
  1. Trước loop: `HashMap<product_id, sum_qty>`; so `sum_qty` với `stock_quantity`.
  2. Lỗi tiếng Việt: `"Không đủ tồn kho cho sản phẩm {code/name}. Cần X, còn Y."`
  3. (Bonus) Gộp cập nhật stock 1 lần/product trong transaction.
- **Test:** Form xuất 2 dòng cùng SP vượt tồn → reject, không ghi DB.

### [x] Issue 5 — Không cập nhật `import_price` sau xuất FIFO

- **File:** `src-tauri/src/db.rs` — sau consume batch trong `create_export_receipt` (~771–774); helper có thể tái dùng từ logic import.
- **Bug:** Chỉ giảm `stock_quantity`; average cost không recompute từ batch còn lại → định giá tồn sai.
- **Fix:** Sau khi tiêu thụ batch (mỗi product xuất trong phiếu):
  ```sql
  -- nếu còn remaining_quantity > 0:
  import_price = SUM(remaining_quantity * cost_price) / SUM(remaining_quantity)
  -- nếu hết batch: import_price = 0 (hoặc giữ policy hiện tại, document rõ)
  UPDATE products SET stock_quantity = ?, import_price = ?, ...
  ```
- **Test:** Nhập 10@10 rồi 10@20; xuất 10 → `import_price` ≈ 20, stock 10.

### [x] Issue 7 — Thiếu validation server-side import/export

- **File:** `src-tauri/src/db.rs` — `create_import_receipt`, `create_export_receipt` (~524–603, 690+)
- **Bug:** Accept empty items, qty ≤ 0, giá âm → qty âm khi xuất **tăng tồn**.
- **Fix (đầu hàm, trước transaction hoặc ngay trong tx trước mutate):**
  - `items` không rỗng
  - mỗi item: `product_id > 0`, `quantity >= 1` (hoặc `> 0` nếu cho phép lẻ — **thống nhất với UI Zod**)
  - `unit_price >= 0`, `discount >= 0`, `amount_paid >= 0`
  - `date` / `receipt_number` không rỗng
  - Message lỗi tiếng Việt
- **Test:** invoke trực tiếp (nếu có) hoặc unit test Rust với qty âm → Err, stock không đổi.

---

## P1 — Bug logic / UX sai nghiệp vụ

### [x] Issue 8 — FIFO theo `created_at` wall-clock, không theo ngày phiếu

- **File:** `src-tauri/src/db.rs` — insert batch (~587–591), `consume_batches_fifo` ORDER BY
- **Bug:** Phiếu nhập backdate vẫn FIFO theo thời điểm insert.
- **Fix:**
  - Option 1: `ORDER BY ir.date ASC, pb.id ASC` (join `import_receipts`) — cần `import_receipt_id` trên batch **hoặc** store business date trên batch.
  - Option 2 (đơn giản hơn nếu schema cho phép): khi insert batch, set `created_at` = ngày phiếu (chuỗi date + time cố định) **và** document rằng FIFO = thứ tự business date + id.
- **Khuyến nghị:** Thêm cột `import_date TEXT` (hoặc `import_receipt_id`) trên `product_batches` + migrate; FIFO order theo đó. Migration an toàn trong `init_schema`.

### [x] Issue 6 — Công nợ NCC không bao giờ được ghi

- **File:** `src-tauri/src/db.rs` import (~548–552); UI `src/app/suppliers/page.tsx`
- **Bug:** UI hiện `suppliers.debt` (công nợ phải trả) nhưng import chỉ `total_purchased += …`, không đụng `debt`.
- **Fix — chọn 1 (hỏi user nếu không chắc; mặc định A nếu muốn feature đầy đủ):**
  - **A Implement payables:** Thêm `amount_paid` (optional) trên import receipt; `debt += total - amount_paid`; UI nhập đã trả NCC.
  - **B Hide:** Ẩn cột/công nợ NCC + sửa mô tả UI cho đến khi có feature (ít code, tránh misleading).
- **Không để UI nói “công nợ” khi luôn 0.**

### [x] Issue 10 — FIFO shortfall silent fallback

- **File:** `src-tauri/src/db.rs` — `consume_batches_fifo` (~244–253)
- **Bug:** Hết batch vẫn hoàn tất bán, cost shortfall = `import_price`.
- **Fix:** Nếu sau drain `remaining > 0` → `Err` tiếng Việt (sau Issue 4 gần như không xảy ra nếu stock ↔ batch đồng bộ). Optional: job reconcile `stock_quantity` vs `SUM(remaining_quantity)`.

---

## P2 — Suggestions (nên làm)

### [x] Issue 11 — Excel import parse số VN sai

- **File:** `src/lib/import-excel.ts` (`toNumber`)
- **Fix:** Locale-aware: `"1.000"` → 1000, `"12,5"` → 12.5; ưu tiên cell numeric từ xlsx.

### [x] Issue 12 — Hóa đơn in thiếu CK / đã thu / tiền thừa

- **File:** `src/components/receipts/invoice-print-dialog.tsx`
- **Fix:** Export type: in subtotal, chiết khấu, tổng TT, đã thu, còn nợ, PTTT khi khác default.

### [x] Issue 13 — Hint báo cáo LN sai nghĩa

- **File:** `src/app/reports/page.tsx` (~80–84)
- **Fix:** Đổi hint kiểu: “Doanh thu − giá vốn FIFO (đã trừ chiết khấu phiếu)” — khớp backend sau Issue 2.

### [x] Issue 14 — `receipt_number` chỉ chính xác tới giây

- **File:** `src/lib/format.ts` `generateReceiptNumber`
- **Fix:** Thêm ms hoặc random 3–4 ký tự; map UNIQUE constraint → “Số phiếu đã tồn tại”.

### [x] Issue 15 — User sửa tự do `import_price` khi còn tồn

- **File:** UI product form + `update_product` Rust
- **Fix:** `import_price` read-only khi `stock_quantity > 0` (system-maintained), hoặc tách “giá nhập gợi ý” vs “giá vốn BQ”.

### [x] Issue 16 — Lỗi SQLite tiếng Anh ra UI

- **File:** `src-tauri/src/commands.rs` (+ helper map error)
- **Fix:** Map `UNIQUE` / `FOREIGN KEY` / stock → chuỗi tiếng Việt ổn định; stock error kèm mã/tên SP.

### [x] Issue 17 — N+1 khi list phiếu

- **File:** `get_import_receipts` / `get_export_receipts`
- **Fix:** 1 query headers + 1 query items `WHERE receipt_id IN (...)` rồi group in Rust.

### [x] Issue 9 — FK thiếu cho customer_id / supplier_id trên phiếu

- **File:** schema migrate trong `db.rs`
- **Fix dài hạn:** rebuild table + FK; ngắn hạn: chặn xóa KH/NCC khi còn phiếu/debt > 0.

---

## P3 — Nits (thấp)

### [x] Issue 18 — Zod schema export/import thiếu field POS

- **File:** `src/lib/schemas.ts`
- **Fix:** Align với `CreateExportReceipt` / `CreateImportReceipt` hoặc xóa schema chết.

### [x] Issue 19 — `"csp": null` trong `tauri.conf.json`

- **Fix:** CSP local-only khi chưa load remote assets.

---

## Thứ tự implement đề xuất (1 PR hoặc nhiều commit nhỏ)

1. **Issue 7** — validation (chặn corrupt data)  
2. **Issue 4** — aggregate stock check  
3. **Issue 1** — debt / applied payment  
4. **Issue 5** — recompute average cost sau xuất  
5. **Issue 2+3** — profit + discount  
6. **Issue 10** — hard fail FIFO shortfall  
7. **Issue 8** — FIFO theo ngày phiếu  
8. **Issue 6** — supplier debt (implement **hoặc** hide UI)  
9. P2 theo nhu cầu UX  

---

## Checklist test sau khi sửa

- [x] Nhập hàng → batch + stock + `import_price` BQ đúng  
- [x] Xuất / POS 1 dòng, không CK → FIFO cost & LN đúng  
- [x] POS có chiết khấu → dashboard + báo cáo LN đúng  
- [x] POS tender > total + có customer → debt **không** bị trừ nhầm  
- [x] POS tender < total + customer → debt tăng đúng phần còn lại  
- [x] 2 dòng cùng SP vượt tồn → reject  
- [x] Xuất hết lô rẻ → `import_price` = cost lô còn lại  
- [x] Qty ≤ 0 / items rỗng từ backend → Err tiếng Việt  
- [x] `npm run lint` pass  
- [x] `cargo check` trong `src-tauri` pass  

---

## File trọng tâm

```
src-tauri/src/db.rs          # hầu hết logic P0/P1
src-tauri/src/commands.rs    # map lỗi
src-tauri/src/models.rs      # field input nếu thêm amount_paid import
src/components/pos/payment-dialog.tsx
src/app/pos/page.tsx
src/app/reports/page.tsx
src/app/suppliers/page.tsx
src/components/receipts/invoice-print-dialog.tsx
src/lib/import-excel.ts
src/lib/format.ts
src/lib/schemas.ts
```

---

## Không làm / ngoài scope (trừ khi user yêu cầu)

- Multi-user, JWT, HTTPS server, OAuth  
- Đổi sang online DB  
- Rewrite framework  

---

## Sau khi xong

1. Đánh dấu `[x]` từng issue trong file này.  
2. Nếu đổi kiến trúc costing/report: cập nhật mục **Profit Logic (FIFO Costing)** trong `CLAUDE.md`.  
3. Commit message gợi ý: `fix: correct debt, discount profit, stock checks, and FIFO cost basis`.
