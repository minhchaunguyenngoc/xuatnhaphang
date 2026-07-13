# Xuất Nhập Hàng — Quản lý Nhập Xuất Kho

![CI](https://github.com/minhchaunguyenngoc/xuatnhaphang/actions/workflows/ci.yml/badge.svg)

Ứng dụng Desktop quản lý kho hàng, nhập xuất hàng hóa (Tauri 2 + Next.js 15 +
SQLite). Chạy hoàn toàn local, theo dõi tồn kho realtime, quản lý sản phẩm, phiếu
nhập/xuất, tính lợi nhuận theo FIFO và xuất báo cáo Excel.

## 📥 Tải về & cài đặt (người dùng)

Vào mục **[Releases](../../releases)** → tải file mới nhất theo hệ điều hành:

| Hệ điều hành | File tải về |
| --- | --- |
| Windows | `...x64-setup.exe` (hoặc `.msi`) |
| macOS (Intel & Apple Silicon) | `...universal.dmg` |

App **chưa mua chữ ký số** nên lần đầu mở sẽ có cảnh báo bảo mật — đây là bình
thường, làm theo hướng dẫn dưới để bỏ qua:

**Windows:** chạy file `-setup.exe` → gặp màn hình *"Windows protected your PC"* →
bấm **More info** → **Run anyway** → cài như bình thường. (WebView2 tự tải nếu máy
chưa có; Windows 11 đã có sẵn.)

**macOS:** mở file `.dmg`, kéo app vào **Applications**. Lần đầu mở nếu báo *"không
mở được / bị hỏng"*:
- Chuột phải vào app trong Applications → **Open** → **Open**; hoặc
- Mở Terminal chạy: `xattr -cr "/Applications/Xuat Nhap Hang.app"` rồi mở lại.

## 🛠️ Phát triển (developer)

```bash
npm install          # cài dependencies
npm run tauri:dev    # chạy app ở chế độ dev
npm run tauri:build  # build file cài cho hệ điều hành hiện tại
npm run lint         # kiểm tra lint
```

> ⚠️ Build local chỉ tạo được file cài của **chính hệ điều hành đang chạy**
> (máy Mac ra `.dmg`, máy Windows ra `.exe`). Muốn có đủ cả 2 nền tảng, dùng
> phát hành tự động bên dưới.

## 🚀 Phát hành (release)

Việc build file cài cho Windows + macOS được **GitHub Actions tự động** hóa qua
[`.github/workflows/release.yml`](.github/workflows/release.yml). Quy trình:

1. Cập nhật version cho khớp nhau ở 3 file: `package.json`, `src-tauri/tauri.conf.json`,
   `src-tauri/Cargo.toml`.
2. Commit, rồi tạo & đẩy tag:
   ```bash
   git tag v0.1.0
   git push origin v0.1.0
   ```
3. Actions build cả macOS + Windows (~10–20 phút) và tự tạo **Release** đính kèm
   file cài. Xong là người dùng vào Releases tải về được ngay.
