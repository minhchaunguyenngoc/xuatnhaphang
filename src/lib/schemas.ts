import { z } from "zod";

export const productSchema = z.object({
  code: z.string().min(1, "Mã sản phẩm không được để trống"),
  name: z.string().min(1, "Tên sản phẩm không được để trống"),
  unit: z.string().min(1, "Đơn vị không được để trống"),
  import_price: z.number().min(0, "Giá nhập phải >= 0"),
  export_price: z.number().min(0, "Giá xuất phải >= 0"),
  min_stock: z.number().min(0, "Tồn tối thiểu phải >= 0"),
  category: z.string().optional(),
  description: z.string().optional(),
});

export const customerSchema = z.object({
  code: z.string().min(1, "Mã khách hàng không được để trống"),
  name: z.string().min(1, "Tên khách hàng không được để trống"),
  phone: z.string().optional(),
  address: z.string().optional(),
  note: z.string().optional(),
});

export const supplierSchema = z.object({
  code: z.string().min(1, "Mã nhà cung cấp không được để trống"),
  name: z.string().min(1, "Tên nhà cung cấp không được để trống"),
  phone: z.string().optional(),
  address: z.string().optional(),
  note: z.string().optional(),
});

// Schema cho từng dòng hàng, dùng chung cho form phiếu nhập/xuất
// (receipt-form-dialog tự ghép phần header của phiếu). Các schema phiếu đầy đủ
// trước đây bị bỏ không dùng và thiếu field POS nên đã gỡ để tránh nhầm lẫn
// (Issue 18) — nguồn chuẩn là kiểu CreateImportReceipt/CreateExportReceipt.
export const receiptItemSchema = z.object({
  product_id: z.number().min(1, "Chọn sản phẩm"),
  quantity: z.number().min(1, "Số lượng phải >= 1"),
  unit_price: z.number().min(0, "Đơn giá phải >= 0"),
});