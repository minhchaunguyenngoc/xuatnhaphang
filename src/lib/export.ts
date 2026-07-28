import * as XLSX from "xlsx";

import type { ExportReceipt, ImportReceipt, ProfitReport, Product } from "./types";

/**
 * Nhả 2 khung hình cho trình duyệt vẽ xong trạng thái "Đang xuất..." trước khi
 * bắt đầu phần việc nặng.
 *
 * Việc dựng file Excel chạy đồng bộ và không cắt nhỏ được — với vài chục nghìn
 * dòng nó chiếm main thread vài giây. Không bỏ được cái đơ đó nếu không dùng
 * Web Worker, nhưng ít nhất phải đảm bảo người dùng đã thấy phản hồi trên nút
 * bấm trước khi màn hình đứng, thay vì tưởng app bị treo.
 */
function yieldToPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

function downloadWorkbook(workbook: XLSX.WorkBook, filename: string) {
  XLSX.writeFile(workbook, filename);
}

export async function exportProductsToExcel(products: Product[]) {
  await yieldToPaint();
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

export async function exportImportsToExcel(receipts: ImportReceipt[]) {
  await yieldToPaint();
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

export async function exportExportsToExcel(receipts: ExportReceipt[]) {
  await yieldToPaint();
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

export async function exportProfitReportToExcel(report: ProfitReport) {
  await yieldToPaint();
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