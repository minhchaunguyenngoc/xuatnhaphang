# Frontend map (Next.js 15 App Router + Zustand)

## Cây thư mục `src/`

```
src/
├── app/                    # Routes (1 folder = 1 page)
│   ├── layout.tsx          # Root shell
│   ├── page.tsx            # Dashboard /
│   ├── pos/page.tsx
│   ├── products/page.tsx
│   ├── inventory/page.tsx
│   ├── imports/page.tsx
│   ├── exports/page.tsx
│   ├── returns/page.tsx
│   ├── debts/page.tsx
│   ├── customers/page.tsx
│   ├── suppliers/page.tsx
│   ├── reports/page.tsx
│   └── users/page.tsx
├── components/
│   ├── auth/               # login-screen
│   ├── layout/             # app-shell, sidebar
│   ├── products/           # form + picker
│   ├── receipts/           # import/export form, return form, print
│   ├── debts/               # debt-payment-dialog
│   ├── pos/                # payment-dialog
│   ├── customers|suppliers|users|settings/
│   ├── shared/             # page-header, pagination, partner-picker, stat-card
│   └── ui/                 # shadcn primitives
├── stores/                 # Zustand
├── lib/                    # api, types, schemas, export, format…
└── hooks/
```

## Route → store → API (nhanh)

| Route | Store chính | API methods chính |
|-------|-------------|-------------------|
| `/` | `useInventoryStore` | `getDashboardStats` |
| `/pos` | `useInventoryStore` | `createExportReceipt`, products, customers |
| `/products` | `useInventoryStore` | product CRUD + `importProducts` |
| `/inventory` | `useInventoryStore` | `getInventoryHistory`, products |
| `/imports` | `useInventoryStore` | import receipts |
| `/exports` | `useInventoryStore` | export receipts |
| `/returns` | **`useReturnsStore`** | return CRUD |
| `/debts` | **`useDebtsStore`** | `getCustomersWithDebt`, `getCustomerDebtInvoices`, debt payment CRUD |
| `/customers` | `useInventoryStore` | customer CRUD |
| `/suppliers` | `useInventoryStore` | supplier CRUD |
| `/reports` | `useInventoryStore` | `getProfitReport`, receipts |
| `/users` | `useUsersStore` | user CRUD + permissions |
| (login) | `useAuthStore` | `login` |
| (settings) | `useCompanyStore` | local only |

## Stores

| File | Domain |
|------|--------|
| `inventory-store.ts` | products, customers, suppliers, imports, exports, dashboard, profit, history |
| `returns-store.ts` | returns only |
| `debts-store.ts` | customers with debt, per-invoice debt list, debt payment CRUD |
| `auth-store.ts` | session user, `hasPermission`, login/logout |
| `users-store.ts` | admin users list |
| `company-store.ts` | company name/info localStorage |

`PAGE_SIZE = 20` trong inventory-store.

## Lib

| File | Việc |
|------|------|
| `api.ts` | **Single bridge** Tauri `invoke` — mọi command đi qua đây |
| `types.ts` | Mirror models Rust (giữ đồng bộ field names camelCase JSON) |
| `schemas.ts` | Zod form validation |
| `export.ts` | Excel export (xlsx) |
| `import-excel.ts` | Import products from Excel |
| `format.ts` | currency/date display |
| `errors.ts` | `getErrorMessage` |
| `utils.ts` | `cn()` |

## Components theo domain

| Domain | Components |
|--------|------------|
| Products | `product-form-dialog`, `product-picker` |
| Receipts (nhập/xuất) | `receipt-form-dialog`, `invoice-print-dialog` |
| Returns | `return-form-dialog` |
| Debts | `debt-payment-dialog` |
| POS | `payment-dialog` |
| Partners | `customer-form-dialog`, `supplier-form-dialog`, `partner-picker` |
| Auth/Users | `login-screen`, `user-form-dialog` |
| Layout | `app-shell`, `sidebar` |

## Pattern UI

1. Page `"use client"` → lấy action từ Zustand → gọi API qua store (không `invoke` trực tiếp trong page trừ exception).
2. Form: local state / RHF + Zod (`schemas.ts`) → submit → store mutation → toast (`sonner`).
3. Permission: `useAuthStore(s => s.hasPermission("key"))` + filter nav trong `sidebar.tsx`.
4. Pagination: shared `Pagination` + `PAGE_SIZE`.

## Không đụng trừ khi cần

- `src/components/ui/*` — design system base
- `out/`, `.next/`, `node_modules/`, `src-tauri/target/` — build artifacts
