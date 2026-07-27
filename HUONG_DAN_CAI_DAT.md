# Hướng dẫn cài đặt Xuất Nhập Hàng cho Windows

Phần mềm quản lý Nhập – Xuất hàng, chạy hoàn toàn trên máy tính của bạn (không cần internet, không lưu dữ liệu lên đâu khác).

## Có gì mới trong bản 0.2.1

- **Sửa lỗi trả hàng tính sai giá trị khi đơn gốc có chiết khấu** — trước đây hoàn lại đúng giá niêm yết (nhiều hơn số khách thực trả), giờ trừ đúng phần đã bớt giá.
- **Sửa lỗi báo cáo không trừ hàng trả** — Báo cáo lợi nhuận và số liệu Tổng quan giờ trừ đúng phần hàng khách trả trong kỳ.
- **Sửa lỗi in phiếu bị tràn sang trang 2** — nội dung giờ luôn nằm gọn ở đầu trang 1.

## Có gì mới trong bản 0.2.0

- **Đăng nhập & phân quyền nhân viên** — mỗi người 1 tài khoản riêng, cấp đúng quyền cần dùng (xem chi tiết ở mục 5 bên dưới).
- **Sửa được phiếu nhập hàng** đã tạo (nếu lô hàng đó chưa xuất bán).
- **Trả hàng** — khách trả hàng đã mua, hoặc trả hàng lại cho nhà cung cấp, đều gắn đúng phiếu gốc.
- **Nhập hàng nhanh hơn**: gõ tên/mã để tìm sản phẩm, tạo sản phẩm mới ngay trong lúc lập phiếu (không cần thoát ra trang khác), mã sản phẩm có thể để trống để hệ thống tự sinh, sửa được cả giá bán ngay tại đó.
- **Bán hàng rõ ràng hơn**: khoá không cho sửa tay đơn giá từng dòng hàng lúc thanh toán — muốn giảm giá thì nhập vào đúng ô "Chiết khấu".
- **In hoá đơn**: sửa lỗi nội dung bị thụt xuống cuối trang A4; thêm tuỳ chọn ẩn dòng chiết khấu khi in (số liệu báo cáo vẫn đúng).
- **Kiểm kho**: ghi lại thời điểm sửa phiếu nhập và thời điểm đổi giá bán/giá nhập, xem lại được trong lịch sử.

## 1. Yêu cầu hệ thống

- Windows 10 hoặc Windows 11, bản 64-bit.
- Còn khoảng 200MB dung lượng trống.
- Máy đã kết nối internet **khi cài lần đầu** (để tải Microsoft WebView2 nếu máy chưa có sẵn — Windows 10/11 bản mới thường đã có sẵn).

## 2. Tải file cài đặt

1. Truy cập trang tải: https://github.com/minhchaunguyenngoc/xuatnhaphang/releases
2. Chọn bản mới nhất ở đầu danh sách (đánh dấu **Latest**).
3. Trong mục **Assets**, tải file:
   - `Xuat.Nhap.Hang_x.x.x_x64-setup.exe` (khuyên dùng), **hoặc**
   - `Xuat.Nhap.Hang_x.x.x_x64_en-US.msi`

   Chỉ cần tải **một trong hai** file trên, không cần tải cả hai (`x.x.x` là số phiên bản, ví dụ `0.1.1`).

## 3. Cài đặt

1. Mở file `.exe` (hoặc `.msi`) vừa tải, thường nằm trong thư mục **Downloads**.
2. Nếu Windows hiện cảnh báo màu xanh **"Windows protected your PC"**:
   - Bấm **More info** (Thông tin thêm)
   - Bấm **Run anyway** (Vẫn chạy)

   > Đây là cảnh báo bình thường của Windows với phần mềm mới chưa có chứng chỉ số trả phí, không phải virus. Nếu muốn yên tâm hơn, có thể quét file bằng Windows Defender trước khi chạy.
3. Làm theo các bước trong trình cài đặt (Next → Install → Finish).
4. Sau khi cài xong, mở ứng dụng **Xuất Nhập Hàng** từ Start Menu hoặc icon ngoài Desktop.

## 4. Sử dụng lần đầu

- Ứng dụng tự tạo cơ sở dữ liệu trống khi mở lần đầu, chưa có dữ liệu mẫu.
- Dữ liệu được lưu trong 1 file duy nhất trên máy (không đồng bộ mạng), nên:
  - **Sao lưu định kỳ**: có thể copy file dữ liệu ra USB/ổ cứng ngoài để phòng mất máy/hỏng ổ đĩa.
  - Không xoá thư mục dữ liệu ứng dụng nếu chưa sao lưu.

## 5. Đăng nhập (từ bản 0.2.0)

Từ bản **0.2.0**, ứng dụng yêu cầu đăng nhập mỗi lần mở, để phân quyền theo từng nhân viên.

- Nếu đây là **lần đầu cài đặt**, hoặc bạn **vừa cập nhật** từ bản cũ (0.1.x) lên 0.2.0: ứng dụng tự tạo sẵn 1 tài khoản quản trị mặc định:
  - Tên đăng nhập: `admin`
  - Mật khẩu: `admin123`
- **Đăng nhập bằng tài khoản trên, sau đó vào mục "Người dùng" ở thanh bên để:**
  1. Đổi mật khẩu tài khoản admin ngay (không dùng mật khẩu mặc định lâu dài).
  2. Tạo thêm tài khoản riêng cho từng nhân viên, chỉ cấp đúng quyền cần dùng (vd. nhân viên bán hàng không cần xem báo cáo lợi nhuận).

> Lưu ý: đây vẫn là ứng dụng chạy local trên 1 máy — tài khoản dùng để phân quyền/theo dõi thao tác giữa các nhân viên **dùng chung máy tính đó**, không đồng bộ dữ liệu qua máy khác.

## 6. Cập nhật phiên bản mới

Khi có bản mới, chỉ cần:
1. Tải file cài đặt mới nhất từ link ở Bước 2.
2. Chạy để cài đè lên bản cũ (dữ liệu cũ không bị mất).

## 7. Gỡ cài đặt

- Vào **Settings → Apps → Installed apps**, tìm **Xuất Nhập Hàng**, chọn **Uninstall**.
- Gỡ ứng dụng không xoá file dữ liệu, nếu muốn xoá hẳn dữ liệu thì xoá thêm thư mục dữ liệu ứng dụng (liên hệ hỗ trợ nếu cần biết đường dẫn chính xác).

## 8. Xử lý sự cố thường gặp

| Vấn đề | Cách xử lý |
|---|---|
| Bị chặn bởi SmartScreen | Làm theo Bước 3.2 ở trên (More info → Run anyway) |
| Phần mềm diệt virus cảnh báo | Thêm ứng dụng vào danh sách ngoại lệ (whitelist), đây là cảnh báo do phần mềm chưa phổ biến, không phải mã độc |
| Mở ứng dụng bị lỗi trắng màn hình | Cài Microsoft Edge WebView2 Runtime: https://developer.microsoft.com/microsoft-edge/webview2/ |
| Máy 32-bit không cài được | Ứng dụng chỉ hỗ trợ Windows 64-bit |
| Quên mật khẩu / không đăng nhập được | Cần một tài khoản admin khác đăng nhập để đặt lại, hoặc liên hệ hỗ trợ |

## 9. Hỗ trợ

Nếu gặp khó khăn khi cài đặt hoặc sử dụng, vui lòng liên hệ trực tiếp để được hỗ trợ.
