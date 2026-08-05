# Hướng dẫn cài đặt Xuất Nhập Hàng cho Windows

Phần mềm quản lý Nhập – Xuất hàng, chạy hoàn toàn trên máy tính của bạn (không cần internet, không lưu dữ liệu lên đâu khác).

## Có gì mới trong bản 0.4.1

- **Chọn phương thức khi trả nợ** — trang Công nợ giờ cho chọn **Tiền mặt** hay **Chuyển khoản** mỗi lần ghi nhận khách trả nợ (kể cả khi sửa lại lần trả đã ghi), thay vì mặc định luôn tính là tiền mặt. Lịch sử trả nợ của từng hoá đơn cũng hiện rõ lần nào trả bằng gì.
- **Sửa lỗi hoá đơn in ra hiện sai "Phương thức" khi bán ghi nợ** — hoá đơn bán theo hình thức Công nợ (khách chưa trả tiền) trước đây khi in ra vẫn hiện nhầm "Tiền mặt", giờ hiện đúng "Công nợ".

## Có gì mới trong bản 0.4.0

- **Bán ghi nợ cho khách quen** — thêm hình thức thanh toán **"Công nợ"** lúc bán hàng, bên cạnh Tiền mặt và Chuyển khoản. Dùng khi khách chưa trả (hết) tiền ngay lúc mua — hệ thống tự ghi nhận đúng số tiền còn thiếu, không cần tự tính tay.
- **Trang Công nợ mới** — xem toàn bộ khách hàng đang nợ, bấm vào từng khách để biết đúng hoá đơn nào còn nợ bao nhiêu. Khách trả dần từng đợt vẫn ghi nhận được (mỗi lần một số tiền khác nhau), và sửa/xoá được nếu lỡ ghi nhầm.
- **Hiện ngay hoá đơn nào còn nợ trên trang Hoá đơn bán hàng** — thêm cột "Còn nợ", nhìn danh sách là biết ngay hoá đơn nào đã thu đủ tiền, hoá đơn nào còn thiếu bao nhiêu, không cần mở từng hoá đơn ra xem.
- **Sửa và xoá được hoá đơn bán hàng** — trang Hoá đơn bán hàng giờ có nút Sửa (đổi ngày/khách/mặt hàng/ghi chú) và Xoá cho từng hoá đơn, tự khôi phục đúng lại tồn kho và công nợ như trước khi bán. Có 2 quyền riêng "Sửa hoá đơn bán hàng" / "Xoá hoá đơn bán hàng" ở trang Người dùng để cấp cho từng nhân viên.

## Có gì mới trong bản 0.3.2

- **Sửa lỗi ô "Giá trị hàng trả" hiện sai khi trả hàng có chiết khấu** — trước đây khi tạo hoặc sửa phiếu trả cho đơn đã bớt giá, ô này hiện đúng giá niêm yết (chưa trừ chiết khấu) thay vì đúng số tiền đã trừ giảm giá cho khách. Số tiền thực lưu vào phiếu trả luôn đúng từ trước — đây chỉ là lỗi hiển thị lúc lập phiếu, không ảnh hưởng dữ liệu đã lưu.

## Có gì mới trong bản 0.3.1

- **Sửa và xoá được phiếu trả hàng** — trang Trả hàng giờ có thêm nút Sửa và Xoá cho từng phiếu (khách trả hàng lẫn trả nhà cung cấp), thêm 2 quyền riêng "Sửa phiếu trả hàng" / "Xoá phiếu trả hàng" ở trang Người dùng để cấp cho từng nhân viên. Sửa/xoá phiếu trả sẽ tự khôi phục đúng lại tồn kho và công nợ như trước khi trả — có kiểm tra chặn để không làm sai sổ sách nếu hàng vừa trả lại đã lỡ bán tiếp.

## Có gì mới trong bản 0.3.0

- **Sửa lỗi mất tên sản phẩm và nhà cung cấp khi mở phiếu để sửa** — trước đây các ô này hiện trống trơn dù phiếu vẫn lưu đúng, giờ hiện lại đầy đủ.
- **Thông báo lỗi nói rõ lý do** — trước đây mọi lỗi đều hiện một câu chung chung (ví dụ "Không thể cập nhật phiếu nhập"), giờ hiện đúng nguyên nhân: *"Phiếu nhập đã có hàng được xuất, không thể sửa."*, *"Không đủ tồn kho cho sản phẩm X. Cần 5, còn 2."*, *"Chiết khấu không được lớn hơn tổng tiền hàng."*…
- **Sửa lỗi tìm kiếm phân biệt chữ hoa/thường** — gõ chữ thường giờ vẫn tìm ra hàng hoá, khách hàng, nhà cung cấp có tên viết hoa.
- **Sửa lỗi báo cáo ra lợi nhuận âm** — nguyên nhân là ô Chiết khấu cho nhập số lớn hơn tổng tiền hàng; giờ ô này bị chặn, và các phiếu đã lỡ nhập sai trước đây cũng được tính lại cho đúng mà không cần nhập lại.
- **Sửa lỗi in phiếu không nằm đầu trang** — nội dung giờ luôn bắt đầu ngay đầu trang 1, phiếu dài thì tự sang trang bình thường.
- **Chạy nhanh và mượt hơn** — thao tác nặng không còn làm đứng màn hình; lưu phiếu nhanh hơn; mở app nhanh hơn; danh sách dài và báo cáo nhiều dòng không còn giật.

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
