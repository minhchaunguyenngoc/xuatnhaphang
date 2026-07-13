import * as XLSX from "xlsx";

import type { CreateProduct, ImportItemInput, Product } from "./types";

/** Chuẩn hoá header: bỏ khoảng trắng thừa + về chữ thường có dấu. */
function normalizeKey(key: string): string {
  return key.trim().toLowerCase();
}

/** Đọc số từ ô Excel (chấp nhận "1.000", "1,000", khoảng trắng). */
function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const cleaned = value.replace(/[^\d.-]/g, "");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function toText(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

// Bảng ánh xạ header (khớp file xuất ở export.ts) → thuộc tính sản phẩm.
const HEADER_ALIASES: Record<string, keyof CreateProduct> = {
  "mã sp": "code",
  mã: "code",
  "mã hàng": "code",
  "tên sp": "name",
  "tên hàng": "name",
  tên: "name",
  "đơn vị": "unit",
  "giá nhập": "import_price",
  "giá vốn": "import_price",
  "giá xuất": "export_price",
  "giá bán": "export_price",
  "tồn tối thiểu": "min_stock",
  "danh mục": "category",
  nhóm: "category",
  "mô tả": "description",
};

export interface ParsedProductsResult {
  products: CreateProduct[];
  skipped: number; // số dòng thiếu mã/tên bị bỏ qua
}

/**
 * Đọc danh sách sản phẩm từ file Excel (.xlsx/.xls). Sheet đầu tiên, hàng đầu
 * là header. Bỏ qua các dòng thiếu Mã hoặc Tên.
 */
export async function parseProductsFromExcel(
  file: File,
): Promise<ParsedProductsResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return { products: [], skipped: 0 };

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
  });

  const products: CreateProduct[] = [];
  let skipped = 0;

  for (const raw of rows) {
    const mapped: Partial<CreateProduct> = {};
    for (const [key, value] of Object.entries(raw)) {
      const field = HEADER_ALIASES[normalizeKey(key)];
      if (!field) continue;
      if (
        field === "import_price" ||
        field === "export_price" ||
        field === "min_stock"
      ) {
        mapped[field] = toNumber(value);
      } else {
        mapped[field] = toText(value);
      }
    }

    const code = toText(mapped.code);
    const name = toText(mapped.name);
    if (!code || !name) {
      skipped += 1;
      continue;
    }

    products.push({
      code,
      name,
      unit: toText(mapped.unit) || "cái",
      import_price: mapped.import_price ?? 0,
      export_price: mapped.export_price ?? 0,
      min_stock: mapped.min_stock ?? 0,
      category: toText(mapped.category) || null,
      description: toText(mapped.description) || null,
    });
  }

  return { products, skipped };
}

// ---- Import phiếu NHẬP KHO (mã hàng + số lượng + đơn giá) ----

const IMPORT_HEADER_ALIASES: Record<string, "code" | "quantity" | "unit_price"> = {
  "mã sp": "code",
  "mã hàng": "code",
  mã: "code",
  "số lượng": "quantity",
  sl: "quantity",
  "đơn giá": "unit_price",
  "giá nhập": "unit_price",
  "giá vốn": "unit_price",
};

export interface ParsedImportItemsResult {
  items: ImportItemInput[];
  skipped: number; // dòng thiếu mã/số lượng
  unknownCodes: string[]; // mã không khớp sản phẩm nào
}

/**
 * Đọc các dòng nhập kho từ Excel và ánh xạ mã hàng -> product_id dựa trên danh
 * sách sản phẩm hiện có. Mã không tồn tại được gom vào `unknownCodes`.
 */
export async function parseImportItemsFromExcel(
  file: File,
  products: Product[],
): Promise<ParsedImportItemsResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return { items: [], skipped: 0, unknownCodes: [] };

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
  });

  const byCode = new Map(
    products.map((p) => [p.code.trim().toLowerCase(), p]),
  );

  const items: ImportItemInput[] = [];
  let skipped = 0;
  const unknownCodes: string[] = [];

  for (const raw of rows) {
    let code = "";
    let quantity = 0;
    let unitPrice = 0;
    for (const [key, value] of Object.entries(raw)) {
      const field = IMPORT_HEADER_ALIASES[normalizeKey(key)];
      if (field === "code") code = toText(value);
      else if (field === "quantity") quantity = toNumber(value);
      else if (field === "unit_price") unitPrice = toNumber(value);
    }

    if (!code || quantity <= 0) {
      skipped += 1;
      continue;
    }
    const product = byCode.get(code.toLowerCase());
    if (!product) {
      unknownCodes.push(code);
      continue;
    }
    items.push({
      product_id: product.id,
      quantity,
      unit_price: unitPrice > 0 ? unitPrice : product.import_price,
    });
  }

  return { items, skipped, unknownCodes };
}

/** File Excel mẫu cho nhập kho: Mã hàng, Số lượng, Đơn giá. */
export function downloadImportTemplate() {
  const rows = [{ "Mã hàng": "SP001", "Số lượng": 10, "Đơn giá": 12000 }];
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, sheet, "Nhập kho");
  XLSX.writeFile(workbook, "mau-nhap-kho.xlsx");
}

/** Xuất file Excel mẫu (chỉ header + 1 dòng ví dụ) để người dùng điền. */
export function downloadProductTemplate() {
  const rows = [
    {
      "Mã SP": "SP001",
      "Tên SP": "Sản phẩm ví dụ",
      "Đơn vị": "cái",
      "Giá nhập": 10000,
      "Giá xuất": 15000,
      "Tồn tối thiểu": 5,
      "Danh mục": "Nhóm A",
      "Mô tả": "",
    },
  ];
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, sheet, "Hàng hóa");
  XLSX.writeFile(workbook, "mau-nhap-hang-hoa.xlsx");
}
