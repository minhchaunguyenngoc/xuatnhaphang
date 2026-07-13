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

export const receiptItemSchema = z.object({
  product_id: z.number().min(1, "Chọn sản phẩm"),
  quantity: z.number().min(1, "Số lượng phải >= 1"),
  unit_price: z.number().min(0, "Đơn giá phải >= 0"),
});

export const importReceiptSchema = z.object({
  receipt_number: z.string().min(1, "Số phiếu không được để trống"),
  date: z.string().min(1, "Ngày không được để trống"),
  supplier: z.string().optional(),
  note: z.string().optional(),
  items: z.array(receiptItemSchema).min(1, "Cần ít nhất 1 sản phẩm"),
});

export const exportReceiptSchema = z.object({
  receipt_number: z.string().min(1, "Số phiếu không được để trống"),
  date: z.string().min(1, "Ngày không được để trống"),
  customer: z.string().optional(),
  note: z.string().optional(),
  items: z.array(receiptItemSchema).min(1, "Cần ít nhất 1 sản phẩm"),
});