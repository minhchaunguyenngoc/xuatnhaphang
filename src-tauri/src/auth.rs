use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};

/// Tài khoản admin tự tạo khi DB chưa có user nào (DB mới hoặc vừa cập nhật
/// từ bản chưa có đăng nhập) — để khách không bị khóa ngoài dữ liệu cũ.
pub const DEFAULT_ADMIN_USERNAME: &str = "admin";
pub const DEFAULT_ADMIN_PASSWORD: &str = "admin123";

/// Danh mục quyền cố định trong code — không cần bảng riêng vì danh sách
/// không đổi theo dữ liệu người dùng. `users.manage` (trang Người dùng) cố
/// tình KHÔNG nằm trong danh sách này: chỉ `is_admin` mới được quản lý user,
/// tránh vòng lặp tự cấp quyền admin cho chính mình.
pub const PERMISSION_KEYS: &[(&str, &str)] = &[
    ("products.manage", "Quản lý hàng hoá"),
    ("imports.create", "Tạo phiếu nhập"),
    ("imports.edit", "Sửa phiếu nhập"),
    ("exports.create", "Bán hàng / tạo phiếu xuất"),
    ("returns.customer", "Trả hàng (khách)"),
    ("returns.supplier", "Trả hàng (nhà cung cấp)"),
    ("customers.manage", "Quản lý khách hàng"),
    ("suppliers.manage", "Quản lý nhà cung cấp"),
    ("reports.view", "Xem báo cáo lợi nhuận"),
    ("settings.manage", "Thiết lập công ty"),
];

pub fn hash_password(password: &str) -> Result<String, String> {
    let salt = SaltString::generate(&mut OsRng);
    Argon2::default()
        .hash_password(password.as_bytes(), &salt)
        .map(|hash| hash.to_string())
        .map_err(|e| e.to_string())
}

pub fn verify_password(password: &str, hash: &str) -> bool {
    let Ok(parsed_hash) = PasswordHash::new(hash) else {
        return false;
    };
    Argon2::default()
        .verify_password(password.as_bytes(), &parsed_hash)
        .is_ok()
}
