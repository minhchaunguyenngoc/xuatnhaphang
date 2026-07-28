/**
 * Lấy thông điệp lỗi để hiện cho người dùng.
 *
 * Lệnh Tauri khai báo trả `Result<_, String>` (xem `src-tauri/src/commands.rs`),
 * nên khi thất bại `invoke` **reject bằng một chuỗi thuần, không phải `Error`**.
 * Trước đây frontend kiểm tra kiểu `error` có phải `Error` không rồi mới lấy
 * `.message`; chuỗi thuần luôn trượt phép kiểm tra đó, nên MỌI thông điệp do
 * backend soạn (`map_err_vi`, `app_err`) đều bị nuốt và thay bằng câu chung
 * chung. Người dùng chỉ thấy "Không thể cập nhật phiếu nhập" thay vì lý do
 * thật là "Phiếu nhập đã có hàng được xuất, không thể sửa.".
 *
 * Dùng hàm này ở mọi khối `catch` để câu backend trả về tới được người dùng.
 */
export function getErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === "string" && error.trim()) return error.trim();
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  return fallback;
}
