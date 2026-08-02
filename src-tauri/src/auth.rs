use std::sync::Mutex;

use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};

use crate::models::User;

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
    ("exports.edit", "Sửa hoá đơn bán hàng"),
    ("exports.delete", "Xoá hoá đơn bán hàng"),
    ("returns.customer", "Trả hàng (khách)"),
    ("returns.supplier", "Trả hàng (nhà cung cấp)"),
    ("returns.edit", "Sửa phiếu trả hàng"),
    ("returns.delete", "Xoá phiếu trả hàng"),
    ("debts.manage", "Quản lý công nợ (ghi nhận/sửa/xoá trả nợ)"),
    ("customers.manage", "Quản lý khách hàng"),
    ("suppliers.manage", "Quản lý nhà cung cấp"),
    ("reports.view", "Xem báo cáo lợi nhuận"),
    ("settings.manage", "Thiết lập công ty"),
];

/// Người dùng đang đăng nhập, giữ trong Tauri state (reset về `None` mỗi lần
/// mở app — khớp thiết kế "không lưu phiên đăng nhập" đã có ở frontend).
///
/// Trước đây phân quyền chỉ ẩn/hiện nút ở giao diện — không chặn được nếu ai
/// đó gọi thẳng lệnh Tauri (vd. qua devtools). Máy dùng chung nhiều tài khoản
/// nhân viên nên cần chặn thật ở phía Rust; `login`/`logout` cập nhật state
/// này, các lệnh ghi dữ liệu gọi `require`/`require_admin` trước khi chạy.
pub struct Session(pub Mutex<Option<User>>);

impl Default for Session {
    fn default() -> Self {
        Self(Mutex::new(None))
    }
}

impl Session {
    pub fn set(&self, user: User) {
        *self.0.lock().unwrap() = Some(user);
    }

    pub fn clear(&self) {
        *self.0.lock().unwrap() = None;
    }

    /// Từ chối nếu chưa đăng nhập hoặc thiếu quyền `key` (admin luôn qua).
    pub fn require(&self, key: &str) -> Result<(), String> {
        match self.0.lock().unwrap().as_ref() {
            None => Err("Vui lòng đăng nhập lại.".to_string()),
            Some(user) if user.is_admin || user.permissions.iter().any(|p| p == key) => Ok(()),
            Some(_) => Err("Bạn không có quyền thực hiện thao tác này.".to_string()),
        }
    }

    /// Quản lý người dùng không có permission key riêng (xem ghi chú ở
    /// `PERMISSION_KEYS`) — chỉ admin mới qua được.
    pub fn require_admin(&self) -> Result<(), String> {
        match self.0.lock().unwrap().as_ref() {
            None => Err("Vui lòng đăng nhập lại.".to_string()),
            Some(user) if user.is_admin => Ok(()),
            Some(_) => Err("Chỉ quản trị viên mới có quyền quản lý người dùng.".to_string()),
        }
    }
}

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

#[cfg(test)]
mod tests {
    use super::*;

    fn user(is_admin: bool, permissions: &[&str]) -> User {
        User {
            id: 1,
            username: "u".into(),
            full_name: "U".into(),
            is_admin,
            is_active: true,
            permissions: permissions.iter().map(|p| p.to_string()).collect(),
            created_at: "x".into(),
            updated_at: "x".into(),
        }
    }

    #[test]
    fn require_rejects_when_not_logged_in() {
        let session = Session::default();
        assert!(session.require("products.manage").is_err());
        assert!(session.require_admin().is_err());
    }

    #[test]
    fn require_rejects_when_missing_permission() {
        let session = Session::default();
        session.set(user(false, &["customers.manage"]));
        assert!(
            session.require("products.manage").is_err(),
            "không có quyền products.manage thì phải bị từ chối"
        );
        assert!(session.require("customers.manage").is_ok());
    }

    #[test]
    fn require_allows_admin_regardless_of_permission_list() {
        let session = Session::default();
        session.set(user(true, &[]));
        assert!(
            session.require("products.manage").is_ok(),
            "admin phải qua được mọi quyền dù danh sách permissions rỗng"
        );
        assert!(session.require_admin().is_ok());
    }

    #[test]
    fn require_admin_rejects_non_admin_even_with_all_permissions() {
        let session = Session::default();
        session.set(user(false, &["products.manage", "customers.manage"]));
        assert!(
            session.require_admin().is_err(),
            "quản lý người dùng chỉ admin mới được, không tính theo permissions"
        );
    }

    #[test]
    fn clear_reverts_to_logged_out() {
        let session = Session::default();
        session.set(user(true, &[]));
        assert!(session.require_admin().is_ok());
        session.clear();
        assert!(
            session.require_admin().is_err(),
            "đăng xuất rồi thì lệnh phải bị chặn lại như chưa đăng nhập"
        );
    }
}
