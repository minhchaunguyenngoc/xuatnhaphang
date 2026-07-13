import * as XLSX from "xlsx";

import type { ExportReceipt, ImportReceipt, ProfitReport, Product } from "./types";

function downloadWorkbook(workbook: XLSX.WorkBook, filename: string) {
  XLSX.writeFile(workbook, filename);
}

export function exportProductsToExcel(products: Product[]) {
  const rows = products.map((product) => ({
    "Mã SP": product.code,
    "Tên SP": product.name,
    "Đơn vị": product.unit,
    "Giá nhập": product.import_price,
    "Giá xuất": product.export_price,
    "Tồn kho": product.stock_quantity,
    "Tồn tối thiểu": product.min_stock,
    "Danh mục": product.category ?? "",
    "Mô tả": product.description ?? "",
  }));

  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, sheet, "Tồn kho");
  downloadWorkbook(workbook, `ton-kho-${Date.now()}.xlsx`);
}

export function exportImportsToExcel(receipts: ImportReceipt[]) {
  const rows = receipts.flatMap((receipt) =>
    receipt.items.map((item) => ({
      "Số phiếu": receipt.receipt_number,
      "Ngày": receipt.date,
      "Nhà cung cấp": receipt.supplier ?? "",
      "Mã SP": item.product_code,
      "Tên SP": item.product_name,
      "Số lượng": item.quantity,
      "Đơn giá": item.unit_price,
      "Thành tiền": item.total_price,
      "Ghi chú": receipt.note ?? "",
    })),
  );

  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, sheet, "Nhập hàng");
  downloadWorkbook(workbook, `phieu-nhap-${Date.now()}.xlsx`);
}

export function exportExportsToExcel(receipts: ExportReceipt[]) {
  const rows = receipts.flatMap((receipt) =>
    receipt.items.map((item) => ({
      "Số phiếu": receipt.receipt_number,
      "Ngày": receipt.date,
      "Khách hàng": receipt.customer ?? "",
      "Mã SP": item.product_code,
      "Tên SP": item.product_name,
      "Số lượng": item.quantity,
      "Đơn giá": item.unit_price,
      "Thành tiền": item.total_price,
      "Ghi chú": receipt.note ?? "",
    })),
  );

  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, sheet, "Xuất hàng");
  downloadWorkbook(workbook, `phieu-xuat-${Date.now()}.xlsx`);
}

export function exportProfitReportToExcel(report: ProfitReport) {
  const rows = report.by_product.map((row) => ({
    "Mã SP": row.product_code,
    "Tên SP": row.product_name,
    "SL đã bán": row.quantity_sold,
    "Doanh thu": row.revenue,
    "Giá vốn": row.cost,
    "Lợi nhuận": row.profit,
    "Biên LN (%)": Number(row.margin_percent.toFixed(2)),
  }));

  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, sheet, "Lợi nhuận");
  downloadWorkbook(
    workbook,
    `bao-cao-loi-nhuan-${report.from_date}-den-${report.to_date}.xlsx`,
  );
}