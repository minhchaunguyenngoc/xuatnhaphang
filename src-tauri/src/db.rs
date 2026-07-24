use rusqlite::{params, Connection, Result as SqlResult};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::AppHandle;
use tauri::Manager;

use crate::models::*;

/// Tạo lỗi nghiệp vụ mang thông điệp tiếng Việt. Dùng biến thể
/// `InvalidParameterName(String)` làm "hộp" chứa chuỗi; tầng commands
/// (`map_err_vi`) rút đúng chuỗi này ra để hiển thị, không kèm prefix kỹ thuật.
pub fn app_err(msg: impl Into<String>) -> rusqlite::Error {
    rusqlite::Error::InvalidParameterName(msg.into())
}

/// Validate phần đầu phiếu (số phiếu, ngày, có ít nhất 1 dòng). Dùng chung cho
/// cả phiếu nhập và phiếu xuất — chặn dữ liệu rỗng trước khi ghi DB.
fn validate_receipt_header(receipt_number: &str, date: &str, item_count: usize) -> SqlResult<()> {
    if receipt_number.trim().is_empty() {
        return Err(app_err("Số phiếu không được để trống."));
    }
    if date.trim().is_empty() {
        return Err(app_err("Ngày phiếu không được để trống."));
    }
    if item_count == 0 {
        return Err(app_err("Phiếu phải có ít nhất 1 sản phẩm."));
    }
    Ok(())
}

pub struct Database {
    pub conn: Mutex<Connection>,
}

impl Database {
    pub fn new(path: PathBuf) -> SqlResult<Self> {
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent).ok();
        }

        let conn = Connection::open(path)?;
        conn.execute_batch("PRAGMA foreign_keys = ON;")?;
        let db = Self {
            conn: Mutex::new(conn),
        };
        db.init_schema()?;
        Ok(db)
    }

    fn init_schema(&self) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute_batch(
            "
            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                code TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL,
                unit TEXT NOT NULL DEFAULT 'cái',
                import_price REAL NOT NULL DEFAULT 0,
                export_price REAL NOT NULL DEFAULT 0,
                stock_quantity INTEGER NOT NULL DEFAULT 0,
                min_stock INTEGER NOT NULL DEFAULT 0,
                category TEXT,
                description TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
            );

            CREATE TABLE IF NOT EXISTS import_receipts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                receipt_number TEXT NOT NULL UNIQUE,
                date TEXT NOT NULL,
                supplier TEXT,
                note TEXT,
                total_amount REAL NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
            );

            CREATE TABLE IF NOT EXISTS import_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                receipt_id INTEGER NOT NULL REFERENCES import_receipts(id) ON DELETE CASCADE,
                product_id INTEGER NOT NULL REFERENCES products(id),
                quantity INTEGER NOT NULL,
                unit_price REAL NOT NULL,
                total_price REAL NOT NULL
            );

            CREATE TABLE IF NOT EXISTS export_receipts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                receipt_number TEXT NOT NULL UNIQUE,
                date TEXT NOT NULL,
                customer TEXT,
                note TEXT,
                total_amount REAL NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
            );

            CREATE TABLE IF NOT EXISTS export_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                receipt_id INTEGER NOT NULL REFERENCES export_receipts(id) ON DELETE CASCADE,
                product_id INTEGER NOT NULL REFERENCES products(id),
                quantity INTEGER NOT NULL,
                unit_price REAL NOT NULL,
                total_price REAL NOT NULL,
                cost_price REAL NOT NULL DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS inventory_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_id INTEGER NOT NULL REFERENCES products(id),
                movement_type TEXT NOT NULL,
                quantity_change INTEGER NOT NULL,
                reference_id INTEGER NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
            );

            CREATE TABLE IF NOT EXISTS product_batches (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_id INTEGER NOT NULL REFERENCES products(id),
                receipt_id INTEGER REFERENCES import_receipts(id) ON DELETE SET NULL,
                quantity INTEGER NOT NULL,
                remaining_quantity INTEGER NOT NULL,
                cost_price REAL NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
            );

            CREATE TABLE IF NOT EXISTS customers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                code TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL,
                phone TEXT,
                address TEXT,
                note TEXT,
                debt REAL NOT NULL DEFAULT 0,
                total_spent REAL NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
            );

            CREATE TABLE IF NOT EXISTS suppliers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                code TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL,
                phone TEXT,
                address TEXT,
                note TEXT,
                debt REAL NOT NULL DEFAULT 0,
                total_purchased REAL NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
            );

            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                full_name TEXT NOT NULL,
                is_admin INTEGER NOT NULL DEFAULT 0,
                is_active INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
            );

            CREATE TABLE IF NOT EXISTS user_permissions (
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                permission_key TEXT NOT NULL,
                PRIMARY KEY (user_id, permission_key)
            );

            CREATE TABLE IF NOT EXISTS audit_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER REFERENCES users(id),
                action TEXT NOT NULL,
                detail TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
            );

            CREATE TABLE IF NOT EXISTS return_receipts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                receipt_number TEXT NOT NULL UNIQUE,
                return_type TEXT NOT NULL,
                original_receipt_id INTEGER NOT NULL,
                date TEXT NOT NULL,
                note TEXT,
                total_amount REAL NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
            );

            CREATE TABLE IF NOT EXISTS return_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                return_id INTEGER NOT NULL REFERENCES return_receipts(id) ON DELETE CASCADE,
                original_item_id INTEGER NOT NULL,
                product_id INTEGER NOT NULL REFERENCES products(id),
                quantity INTEGER NOT NULL,
                unit_price REAL NOT NULL,
                cost_price REAL NOT NULL DEFAULT 0,
                total_price REAL NOT NULL
            );
            ",
        )?;

        Self::migrate_export_items_cost_price(&conn)?;
        // Cột mở rộng cho bán hàng (POS): chiết khấu, thanh toán, liên kết khách/NCC.
        Self::add_column_if_missing(&conn, "export_receipts", "customer_id", "INTEGER")?;
        Self::add_column_if_missing(
            &conn,
            "export_receipts",
            "discount",
            "REAL NOT NULL DEFAULT 0",
        )?;
        Self::add_column_if_missing(
            &conn,
            "export_receipts",
            "amount_paid",
            "REAL NOT NULL DEFAULT 0",
        )?;
        Self::add_column_if_missing(
            &conn,
            "export_receipts",
            "payment_method",
            "TEXT NOT NULL DEFAULT 'cash'",
        )?;
        Self::add_column_if_missing(&conn, "import_receipts", "supplier_id", "INTEGER")?;
        // Cho phép sửa phiếu nhập (khi lô chưa bị xuất đụng tới) — cần dấu thời
        // gian lần sửa cuối; phiếu cũ backfill = created_at.
        Self::add_column_if_missing(&conn, "import_receipts", "updated_at", "TEXT")?;
        conn.execute(
            "UPDATE import_receipts SET updated_at = created_at WHERE updated_at IS NULL OR updated_at = ''",
            [],
        )?;
        // FIFO phải theo NGÀY PHIẾU, không theo thời điểm insert (Issue 8). Thêm
        // cột ngày nhập trên batch; batch cũ backfill = ngày tạo.
        Self::add_column_if_missing(&conn, "product_batches", "import_date", "TEXT")?;
        conn.execute(
            "UPDATE product_batches SET import_date = date(created_at) WHERE import_date IS NULL OR import_date = ''",
            [],
        )?;
        Self::backfill_batches_for_existing_stock(&conn)?;
        Self::bootstrap_default_admin(&conn)?;

        Ok(())
    }

    /// Nếu DB (mới hoặc vừa cập nhật từ bản chưa có đăng nhập) chưa có tài
    /// khoản nào, tạo sẵn 1 admin mặc định để khách không bị khóa ngoài sau
    /// khi cập nhật. Idempotent: chỉ chạy khi bảng `users` rỗng.
    fn bootstrap_default_admin(conn: &Connection) -> SqlResult<()> {
        let count: i64 = conn.query_row("SELECT COUNT(*) FROM users", [], |row| row.get(0))?;
        if count > 0 {
            return Ok(());
        }
        let password_hash = crate::auth::hash_password(crate::auth::DEFAULT_ADMIN_PASSWORD)
            .map_err(|e| app_err(format!("Không thể khởi tạo tài khoản quản trị: {e}")))?;
        conn.execute(
            "INSERT INTO users (username, password_hash, full_name, is_admin, is_active)
             VALUES (?1, ?2, ?3, 1, 1)",
            params![
                crate::auth::DEFAULT_ADMIN_USERNAME,
                password_hash,
                "Quản trị viên"
            ],
        )?;
        Ok(())
    }

    /// Older DBs created before FIFO costing existed lack this column.
    fn migrate_export_items_cost_price(conn: &Connection) -> SqlResult<()> {
        Self::add_column_if_missing(
            conn,
            "export_items",
            "cost_price",
            "REAL NOT NULL DEFAULT 0",
        )
    }

    /// Adds `column` (with the given SQL type/default `ddl`) to `table` if a DB
    /// created by an older schema version is missing it. Idempotent.
    fn add_column_if_missing(
        conn: &Connection,
        table: &str,
        column: &str,
        ddl: &str,
    ) -> SqlResult<()> {
        let has_column = conn
            .prepare(&format!("PRAGMA table_info({table})"))?
            .query_map([], |row| row.get::<_, String>(1))?
            .collect::<SqlResult<Vec<String>>>()?
            .iter()
            .any(|c| c == column);

        if !has_column {
            conn.execute(
                &format!("ALTER TABLE {table} ADD COLUMN {column} {ddl}"),
                [],
            )?;
        }
        Ok(())
    }

    /// Products that already carried stock before batches existed (or before this
    /// migration ran) get one synthetic opening batch so FIFO costing has a basis.
    fn backfill_batches_for_existing_stock(conn: &Connection) -> SqlResult<()> {
        conn.execute(
            "INSERT INTO product_batches (product_id, receipt_id, quantity, remaining_quantity, cost_price, import_date, created_at)
             SELECT id, NULL, stock_quantity, stock_quantity, import_price, date(created_at), created_at
             FROM products
             WHERE stock_quantity > 0
               AND id NOT IN (SELECT DISTINCT product_id FROM product_batches)",
            [],
        )?;
        Ok(())
    }

    /// Consumes stock FIFO across open batches for `product_id` and returns the
    /// total cost of the quantity consumed (unit cost = total / quantity).
    fn consume_batches_fifo(
        tx: &rusqlite::Transaction,
        product_id: i64,
        quantity: i64,
    ) -> SqlResult<f64> {
        let batches: Vec<(i64, i64, f64)> = {
            let mut stmt = tx.prepare(
                "SELECT id, remaining_quantity, cost_price FROM product_batches
                 WHERE product_id = ?1 AND remaining_quantity > 0
                 ORDER BY COALESCE(import_date, date(created_at)) ASC, id ASC",
            )?;
            let rows = stmt
                .query_map(params![product_id], |row| {
                    Ok((row.get(0)?, row.get(1)?, row.get(2)?))
                })?
                .collect::<SqlResult<Vec<_>>>()?;
            rows
        };

        let mut remaining = quantity;
        let mut total_cost = 0.0;
        for (batch_id, batch_remaining, cost_price) in batches {
            if remaining <= 0 {
                break;
            }
            let take = remaining.min(batch_remaining);
            tx.execute(
                "UPDATE product_batches SET remaining_quantity = remaining_quantity - ?1 WHERE id = ?2",
                params![take, batch_id],
            )?;
            total_cost += take as f64 * cost_price;
            remaining -= take;
        }

        if remaining > 0 {
            // Không đủ lô để tiêu thụ (tồn ↔ batch lệch nhau). Sau khi đã kiểm tra
            // tồn gộp ở create_export_receipt thì gần như không xảy ra; nếu có thì
            // báo lỗi để rollback, KHÔNG âm thầm lấy giá vốn tạm (Issue 10).
            let code: String = tx
                .query_row(
                    "SELECT code FROM products WHERE id = ?1",
                    params![product_id],
                    |row| row.get(0),
                )
                .unwrap_or_else(|_| product_id.to_string());
            return Err(app_err(format!(
                "Không đủ lô hàng để xuất cho sản phẩm {code}. Vui lòng kiểm tra lại tồn kho."
            )));
        }

        Ok(total_cost)
    }

    /// Tính lại giá vốn bình quân (`products.import_price`) từ các lô còn tồn sau
    /// khi xuất FIFO (Issue 5). Hết lô → 0 để không định giá tồn sai.
    fn recompute_avg_cost(tx: &rusqlite::Transaction, product_id: i64) -> SqlResult<()> {
        let avg_cost: f64 = tx.query_row(
            "SELECT COALESCE(SUM(remaining_quantity * cost_price) / NULLIF(SUM(remaining_quantity), 0), 0)
             FROM product_batches WHERE product_id = ?1 AND remaining_quantity > 0",
            params![product_id],
            |row| row.get(0),
        )?;
        tx.execute(
            "UPDATE products SET import_price = ?1, updated_at = datetime('now', 'localtime') WHERE id = ?2",
            params![avg_cost, product_id],
        )?;
        Ok(())
    }

    pub fn get_products(&self) -> SqlResult<Vec<Product>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, code, name, unit, import_price, export_price, stock_quantity, min_stock, category, description, created_at, updated_at
             FROM products ORDER BY name ASC",
        )?;

        let products = stmt
            .query_map([], |row| {
                Ok(Product {
                    id: row.get(0)?,
                    code: row.get(1)?,
                    name: row.get(2)?,
                    unit: row.get(3)?,
                    import_price: row.get(4)?,
                    export_price: row.get(5)?,
                    stock_quantity: row.get(6)?,
                    min_stock: row.get(7)?,
                    category: row.get(8)?,
                    description: row.get(9)?,
                    created_at: row.get(10)?,
                    updated_at: row.get(11)?,
                })
            })?
            .collect::<SqlResult<Vec<_>>>()?;

        Ok(products)
    }

    /// Tạo sản phẩm mới. Nếu bỏ trống `code`:
    /// - Nếu đã có sản phẩm trùng CẢ tên lẫn giá nhập/giá xuất → coi là cùng
    ///   1 sản phẩm, trả về sản phẩm đó thay vì tạo bản ghi trùng.
    /// - Ngược lại tự sinh mã mới (SP0001, SP0002, ...).
    /// Người dùng vẫn có thể tự gõ mã riêng — chỉ áp dụng logic này khi để trống.
    pub fn create_product(&self, input: CreateProduct) -> SqlResult<Product> {
        let conn = self.conn.lock().unwrap();

        let code = input.code.trim();
        if code.is_empty() {
            let existing_result: SqlResult<i64> = conn.query_row(
                "SELECT id FROM products WHERE name = ?1 AND import_price = ?2 AND export_price = ?3",
                params![input.name, input.import_price, input.export_price],
                |row| row.get(0),
            );
            let existing_id = match existing_result {
                Ok(id) => Some(id),
                Err(rusqlite::Error::QueryReturnedNoRows) => None,
                Err(e) => return Err(e),
            };
            if let Some(id) = existing_id {
                drop(conn);
                return self.get_product_by_id(id);
            }

            let generated_code = Self::generate_product_code(&conn)?;
            let id = Self::insert_product(&conn, &generated_code, &input)?;
            drop(conn);
            return self.get_product_by_id(id);
        }

        let id = Self::insert_product(&conn, code, &input)?;
        drop(conn);
        self.get_product_by_id(id)
    }

    fn insert_product(conn: &Connection, code: &str, input: &CreateProduct) -> SqlResult<i64> {
        conn.execute(
            "INSERT INTO products (code, name, unit, import_price, export_price, min_stock, category, description)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                code,
                input.name,
                input.unit,
                input.import_price,
                input.export_price,
                input.min_stock,
                input.category,
                input.description
            ],
        )?;
        Ok(conn.last_insert_rowid())
    }

    /// Sinh mã tiếp theo dạng SP0001, SP0002, ... dựa trên số lớn nhất đang có
    /// (không dùng COUNT vì mã có thể đã bị xóa/lệch thứ tự).
    fn generate_product_code(conn: &Connection) -> SqlResult<String> {
        let mut stmt = conn.prepare("SELECT code FROM products WHERE code LIKE 'SP%'")?;
        let codes: Vec<String> = stmt
            .query_map([], |row| row.get::<_, String>(0))?
            .collect::<SqlResult<Vec<_>>>()?;
        let next = codes
            .iter()
            .filter_map(|c| c.strip_prefix("SP"))
            .filter_map(|n| n.parse::<u32>().ok())
            .max()
            .map(|n| n + 1)
            .unwrap_or(1);
        Ok(format!("SP{next:04}"))
    }

    pub fn update_product(&self, input: UpdateProduct) -> SqlResult<Product> {
        {
            let conn = self.conn.lock().unwrap();
            // Khi còn tồn kho, `import_price` là giá vốn bình quân do hệ thống tự
            // duy trì (theo nhập + FIFO) — không cho sửa tay để tránh sai định giá
            // (Issue 15). Chỉ nhận `import_price` từ input khi tồn = 0.
            let (stock, current_cost, current_export_price): (i64, f64, f64) = conn
                .query_row(
                    "SELECT stock_quantity, import_price, export_price FROM products WHERE id = ?1",
                    params![input.id],
                    |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
                )?;
            let import_price = if stock > 0 {
                current_cost
            } else {
                input.import_price
            };
            conn.execute(
                "UPDATE products SET code=?1, name=?2, unit=?3, import_price=?4, export_price=?5, min_stock=?6, category=?7, description=?8, updated_at=datetime('now', 'localtime')
                 WHERE id=?9",
                params![
                    input.code,
                    input.name,
                    input.unit,
                    import_price,
                    input.export_price,
                    input.min_stock,
                    input.category,
                    input.description,
                    input.id
                ],
            )?;

            // Ghi lại THỜI ĐIỂM đổi giá vào lịch sử (Kiểm kho) — quantity_change=0
            // vì không ảnh hưởng tồn kho, chỉ đánh dấu mốc thời gian đổi giá.
            if (current_export_price - input.export_price).abs() > f64::EPSILON {
                conn.execute(
                    "INSERT INTO inventory_history (product_id, movement_type, quantity_change, reference_id)
                     VALUES (?1, 'export_price_change', 0, ?1)",
                    params![input.id],
                )?;
            }
            if stock == 0 && (current_cost - import_price).abs() > f64::EPSILON {
                conn.execute(
                    "INSERT INTO inventory_history (product_id, movement_type, quantity_change, reference_id)
                     VALUES (?1, 'import_price_change', 0, ?1)",
                    params![input.id],
                )?;
            }
        }
        self.get_product_by_id(input.id)
    }

    pub fn delete_product(&self, id: i64) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM products WHERE id = ?1", params![id])?;
        Ok(())
    }

    fn get_product_by_id(&self, id: i64) -> SqlResult<Product> {
        let conn = self.conn.lock().unwrap();
        conn.query_row(
            "SELECT id, code, name, unit, import_price, export_price, stock_quantity, min_stock, category, description, created_at, updated_at
             FROM products WHERE id = ?1",
            params![id],
            |row| {
                Ok(Product {
                    id: row.get(0)?,
                    code: row.get(1)?,
                    name: row.get(2)?,
                    unit: row.get(3)?,
                    import_price: row.get(4)?,
                    export_price: row.get(5)?,
                    stock_quantity: row.get(6)?,
                    min_stock: row.get(7)?,
                    category: row.get(8)?,
                    description: row.get(9)?,
                    created_at: row.get(10)?,
                    updated_at: row.get(11)?,
                })
            },
        )
    }

    pub fn get_customers(&self) -> SqlResult<Vec<Customer>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, code, name, phone, address, note, debt, total_spent, created_at, updated_at
             FROM customers ORDER BY name ASC",
        )?;
        let rows = stmt
            .query_map([], Self::map_customer)?
            .collect::<SqlResult<Vec<_>>>()?;
        Ok(rows)
    }

    fn map_customer(row: &rusqlite::Row) -> SqlResult<Customer> {
        Ok(Customer {
            id: row.get(0)?,
            code: row.get(1)?,
            name: row.get(2)?,
            phone: row.get(3)?,
            address: row.get(4)?,
            note: row.get(5)?,
            debt: row.get(6)?,
            total_spent: row.get(7)?,
            created_at: row.get(8)?,
            updated_at: row.get(9)?,
        })
    }

    pub fn create_customer(&self, input: CreateCustomer) -> SqlResult<Customer> {
        let id = {
            let conn = self.conn.lock().unwrap();
            conn.execute(
                "INSERT INTO customers (code, name, phone, address, note)
                 VALUES (?1, ?2, ?3, ?4, ?5)",
                params![
                    input.code,
                    input.name,
                    input.phone,
                    input.address,
                    input.note
                ],
            )?;
            conn.last_insert_rowid()
        };
        self.get_customer_by_id(id)
    }

    pub fn update_customer(&self, input: UpdateCustomer) -> SqlResult<Customer> {
        {
            let conn = self.conn.lock().unwrap();
            conn.execute(
                "UPDATE customers SET code=?1, name=?2, phone=?3, address=?4, note=?5, updated_at=datetime('now', 'localtime')
                 WHERE id=?6",
                params![
                    input.code,
                    input.name,
                    input.phone,
                    input.address,
                    input.note,
                    input.id
                ],
            )?;
        }
        self.get_customer_by_id(input.id)
    }

    pub fn delete_customer(&self, id: i64) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        // Chặn xóa khi còn hóa đơn liên quan hoặc còn công nợ (Issue 9) — tránh
        // phiếu mồ côi / mất dấu công nợ.
        let referenced: i64 = conn.query_row(
            "SELECT COUNT(*) FROM export_receipts WHERE customer_id = ?1",
            params![id],
            |row| row.get(0),
        )?;
        if referenced > 0 {
            return Err(app_err(
                "Không thể xóa khách hàng đang có hóa đơn liên quan.",
            ));
        }
        let debt: f64 = conn
            .query_row(
                "SELECT debt FROM customers WHERE id = ?1",
                params![id],
                |row| row.get(0),
            )
            .unwrap_or(0.0);
        if debt > 0.0 {
            return Err(app_err("Không thể xóa khách hàng đang còn công nợ."));
        }
        conn.execute("DELETE FROM customers WHERE id = ?1", params![id])?;
        Ok(())
    }

    fn get_customer_by_id(&self, id: i64) -> SqlResult<Customer> {
        let conn = self.conn.lock().unwrap();
        conn.query_row(
            "SELECT id, code, name, phone, address, note, debt, total_spent, created_at, updated_at
             FROM customers WHERE id = ?1",
            params![id],
            Self::map_customer,
        )
    }

    pub fn get_suppliers(&self) -> SqlResult<Vec<Supplier>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, code, name, phone, address, note, debt, total_purchased, created_at, updated_at
             FROM suppliers ORDER BY name ASC",
        )?;
        let rows = stmt
            .query_map([], Self::map_supplier)?
            .collect::<SqlResult<Vec<_>>>()?;
        Ok(rows)
    }

    fn map_supplier(row: &rusqlite::Row) -> SqlResult<Supplier> {
        Ok(Supplier {
            id: row.get(0)?,
            code: row.get(1)?,
            name: row.get(2)?,
            phone: row.get(3)?,
            address: row.get(4)?,
            note: row.get(5)?,
            debt: row.get(6)?,
            total_purchased: row.get(7)?,
            created_at: row.get(8)?,
            updated_at: row.get(9)?,
        })
    }

    pub fn create_supplier(&self, input: CreateSupplier) -> SqlResult<Supplier> {
        let id = {
            let conn = self.conn.lock().unwrap();
            conn.execute(
                "INSERT INTO suppliers (code, name, phone, address, note)
                 VALUES (?1, ?2, ?3, ?4, ?5)",
                params![
                    input.code,
                    input.name,
                    input.phone,
                    input.address,
                    input.note
                ],
            )?;
            conn.last_insert_rowid()
        };
        self.get_supplier_by_id(id)
    }

    pub fn update_supplier(&self, input: UpdateSupplier) -> SqlResult<Supplier> {
        {
            let conn = self.conn.lock().unwrap();
            conn.execute(
                "UPDATE suppliers SET code=?1, name=?2, phone=?3, address=?4, note=?5, updated_at=datetime('now', 'localtime')
                 WHERE id=?6",
                params![
                    input.code,
                    input.name,
                    input.phone,
                    input.address,
                    input.note,
                    input.id
                ],
            )?;
        }
        self.get_supplier_by_id(input.id)
    }

    pub fn delete_supplier(&self, id: i64) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        // Chặn xóa khi còn phiếu nhập liên quan (Issue 9).
        let referenced: i64 = conn.query_row(
            "SELECT COUNT(*) FROM import_receipts WHERE supplier_id = ?1",
            params![id],
            |row| row.get(0),
        )?;
        if referenced > 0 {
            return Err(app_err(
                "Không thể xóa nhà cung cấp đang có phiếu nhập liên quan.",
            ));
        }
        conn.execute("DELETE FROM suppliers WHERE id = ?1", params![id])?;
        Ok(())
    }

    fn get_supplier_by_id(&self, id: i64) -> SqlResult<Supplier> {
        let conn = self.conn.lock().unwrap();
        conn.query_row(
            "SELECT id, code, name, phone, address, note, debt, total_purchased, created_at, updated_at
             FROM suppliers WHERE id = ?1",
            params![id],
            Self::map_supplier,
        )
    }

    pub fn create_import_receipt(&self, input: CreateImportReceipt) -> SqlResult<ImportReceipt> {
        // Validation server-side (Issue 7): chặn phiếu rỗng / số lượng, giá không hợp lệ.
        validate_receipt_header(&input.receipt_number, &input.date, input.items.len())?;
        for item in &input.items {
            if item.product_id <= 0 {
                return Err(app_err("Dòng nhập thiếu sản phẩm hợp lệ."));
            }
            if item.quantity < 1 {
                return Err(app_err("Số lượng nhập phải >= 1."));
            }
            if item.unit_price < 0.0 {
                return Err(app_err("Đơn giá nhập không được âm."));
            }
        }

        let mut conn = self.conn.lock().unwrap();
        let tx = conn.transaction()?;

        let total_amount: f64 = input
            .items
            .iter()
            .map(|item| item.quantity as f64 * item.unit_price)
            .sum();

        tx.execute(
            "INSERT INTO import_receipts (receipt_number, date, supplier, supplier_id, note, total_amount)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                input.receipt_number,
                input.date,
                input.supplier,
                input.supplier_id,
                input.note,
                total_amount
            ],
        )?;
        let receipt_id = tx.last_insert_rowid();

        if let Some(supplier_id) = input.supplier_id {
            tx.execute(
                "UPDATE suppliers SET total_purchased = total_purchased + ?1, updated_at = datetime('now', 'localtime') WHERE id = ?2",
                params![total_amount, supplier_id],
            )?;
        }

        for item in &input.items {
            let total_price = item.quantity as f64 * item.unit_price;
            tx.execute(
                "INSERT INTO import_items (receipt_id, product_id, quantity, unit_price, total_price)
                 VALUES (?1, ?2, ?3, ?4, ?5)",
                params![
                    receipt_id,
                    item.product_id,
                    item.quantity,
                    item.unit_price,
                    total_price
                ],
            )?;

            let (current_stock, current_avg_cost): (i64, f64) = tx.query_row(
                "SELECT stock_quantity, import_price FROM products WHERE id = ?1",
                params![item.product_id],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )?;
            let new_stock = current_stock + item.quantity;
            let new_avg_cost = if new_stock > 0 {
                (current_stock as f64 * current_avg_cost + item.quantity as f64 * item.unit_price)
                    / new_stock as f64
            } else {
                item.unit_price
            };

            tx.execute(
                "UPDATE products SET stock_quantity = ?1, import_price = ?2, updated_at = datetime('now', 'localtime') WHERE id = ?3",
                params![new_stock, new_avg_cost, item.product_id],
            )?;

            tx.execute(
                "INSERT INTO product_batches (product_id, receipt_id, quantity, remaining_quantity, cost_price, import_date)
                 VALUES (?1, ?2, ?3, ?3, ?4, ?5)",
                params![item.product_id, receipt_id, item.quantity, item.unit_price, input.date],
            )?;

            tx.execute(
                "INSERT INTO inventory_history (product_id, movement_type, quantity_change, reference_id)
                 VALUES (?1, 'import', ?2, ?3)",
                params![item.product_id, item.quantity, receipt_id],
            )?;
        }

        tx.commit()?;
        drop(conn);
        self.get_import_receipt(receipt_id)
    }

    pub fn get_import_receipts(&self) -> SqlResult<Vec<ImportReceipt>> {
        let conn = self.conn.lock().unwrap();
        // 1 query lấy header, 1 query lấy toàn bộ item rồi gom theo receipt_id
        // trong Rust — tránh N+1 (Issue 17).
        let mut receipts: Vec<ImportReceipt> = {
            let mut stmt = conn.prepare(
                "SELECT id, receipt_number, date, supplier, supplier_id, note, total_amount, created_at
                 FROM import_receipts ORDER BY date DESC, id DESC",
            )?;
            let rows = stmt
                .query_map([], |row| {
                    Ok(ImportReceipt {
                        id: row.get(0)?,
                        receipt_number: row.get(1)?,
                        date: row.get(2)?,
                        supplier: row.get(3)?,
                        supplier_id: row.get(4)?,
                        note: row.get(5)?,
                        total_amount: row.get(6)?,
                        created_at: row.get(7)?,
                        items: vec![],
                    })
                })?
                .collect::<SqlResult<Vec<_>>>()?;
            rows
        };

        let mut items_by_receipt: HashMap<i64, Vec<ImportItem>> = HashMap::new();
        {
            let mut stmt = conn.prepare(
                "SELECT ii.id, ii.receipt_id, ii.product_id, p.name, p.code, ii.quantity, ii.unit_price, ii.total_price
                 FROM import_items ii
                 JOIN products p ON p.id = ii.product_id
                 ORDER BY ii.id ASC",
            )?;
            let rows = stmt.query_map([], |row| {
                Ok(ImportItem {
                    id: row.get(0)?,
                    receipt_id: row.get(1)?,
                    product_id: row.get(2)?,
                    product_name: row.get(3)?,
                    product_code: row.get(4)?,
                    quantity: row.get(5)?,
                    unit_price: row.get(6)?,
                    total_price: row.get(7)?,
                })
            })?;
            for item in rows {
                let item = item?;
                items_by_receipt
                    .entry(item.receipt_id)
                    .or_default()
                    .push(item);
            }
        }

        for receipt in &mut receipts {
            if let Some(items) = items_by_receipt.remove(&receipt.id) {
                receipt.items = items;
            }
        }
        Ok(receipts)
    }

    fn get_import_receipt(&self, id: i64) -> SqlResult<ImportReceipt> {
        let conn = self.conn.lock().unwrap();
        let receipt = conn.query_row(
            "SELECT id, receipt_number, date, supplier, supplier_id, note, total_amount, created_at
             FROM import_receipts WHERE id = ?1",
            params![id],
            |row| {
                Ok(ImportReceipt {
                    id: row.get(0)?,
                    receipt_number: row.get(1)?,
                    date: row.get(2)?,
                    supplier: row.get(3)?,
                    supplier_id: row.get(4)?,
                    note: row.get(5)?,
                    total_amount: row.get(6)?,
                    created_at: row.get(7)?,
                    items: vec![],
                })
            },
        )?;

        let mut stmt = conn.prepare(
            "SELECT ii.id, ii.receipt_id, ii.product_id, p.name, p.code, ii.quantity, ii.unit_price, ii.total_price
             FROM import_items ii
             JOIN products p ON p.id = ii.product_id
             WHERE ii.receipt_id = ?1",
        )?;

        let items = stmt
            .query_map(params![id], |row| {
                Ok(ImportItem {
                    id: row.get(0)?,
                    receipt_id: row.get(1)?,
                    product_id: row.get(2)?,
                    product_name: row.get(3)?,
                    product_code: row.get(4)?,
                    quantity: row.get(5)?,
                    unit_price: row.get(6)?,
                    total_price: row.get(7)?,
                })
            })?
            .collect::<SqlResult<Vec<_>>>()?;

        Ok(ImportReceipt { items, ..receipt })
    }

    /// Sửa phiếu nhập — CHỈ cho phép khi mọi lô hàng (`product_batches`) của
    /// phiếu này còn nguyên vẹn, tức chưa phiếu xuất nào tiêu thụ. Nếu đã bị
    /// đụng tới thì từ chối để không phá vỡ giá vốn FIFO của các phiếu xuất
    /// đã tạo dựa trên lô cũ. Cách làm: gỡ hiệu ứng của các dòng cũ (tồn kho,
    /// lô, lịch sử, công nợ NCC) rồi áp dụng lại y hệt logic
    /// `create_import_receipt` cho các dòng mới — giữ nguyên `receipt_number`.
    pub fn update_import_receipt(&self, input: UpdateImportReceipt) -> SqlResult<ImportReceipt> {
        if input.date.trim().is_empty() {
            return Err(app_err("Ngày phiếu không được để trống."));
        }
        if input.items.is_empty() {
            return Err(app_err("Phiếu phải có ít nhất 1 sản phẩm."));
        }
        for item in &input.items {
            if item.product_id <= 0 {
                return Err(app_err("Dòng nhập thiếu sản phẩm hợp lệ."));
            }
            if item.quantity < 1 {
                return Err(app_err("Số lượng nhập phải >= 1."));
            }
            if item.unit_price < 0.0 {
                return Err(app_err("Đơn giá nhập không được âm."));
            }
        }

        let mut conn = self.conn.lock().unwrap();
        let tx = conn.transaction()?;

        let touched: i64 = tx.query_row(
            "SELECT COUNT(*) FROM product_batches WHERE receipt_id = ?1 AND remaining_quantity < quantity",
            params![input.id],
            |row| row.get(0),
        )?;
        if touched > 0 {
            return Err(app_err(
                "Phiếu nhập đã có hàng được xuất, không thể sửa.",
            ));
        }

        let (old_supplier_id, old_total): (Option<i64>, f64) = tx.query_row(
            "SELECT supplier_id, total_amount FROM import_receipts WHERE id = ?1",
            params![input.id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )?;

        let old_items: Vec<(i64, i64)> = {
            let mut stmt =
                tx.prepare("SELECT product_id, quantity FROM import_items WHERE receipt_id = ?1")?;
            let rows = stmt
                .query_map(params![input.id], |row| Ok((row.get(0)?, row.get(1)?)))?
                .collect::<SqlResult<Vec<_>>>()?;
            rows
        };
        for (product_id, quantity) in &old_items {
            tx.execute(
                "UPDATE products SET stock_quantity = stock_quantity - ?1, updated_at = datetime('now', 'localtime') WHERE id = ?2",
                params![quantity, product_id],
            )?;
        }
        tx.execute(
            "DELETE FROM product_batches WHERE receipt_id = ?1",
            params![input.id],
        )?;
        tx.execute(
            "DELETE FROM import_items WHERE receipt_id = ?1",
            params![input.id],
        )?;
        tx.execute(
            "DELETE FROM inventory_history WHERE movement_type = 'import' AND reference_id = ?1",
            params![input.id],
        )?;
        for (product_id, _) in &old_items {
            Self::recompute_avg_cost(&tx, *product_id)?;
        }

        if let Some(old_sid) = old_supplier_id {
            tx.execute(
                "UPDATE suppliers SET total_purchased = total_purchased - ?1, updated_at = datetime('now', 'localtime') WHERE id = ?2",
                params![old_total, old_sid],
            )?;
        }

        let new_total: f64 = input
            .items
            .iter()
            .map(|item| item.quantity as f64 * item.unit_price)
            .sum();

        for item in &input.items {
            let total_price = item.quantity as f64 * item.unit_price;
            tx.execute(
                "INSERT INTO import_items (receipt_id, product_id, quantity, unit_price, total_price)
                 VALUES (?1, ?2, ?3, ?4, ?5)",
                params![
                    input.id,
                    item.product_id,
                    item.quantity,
                    item.unit_price,
                    total_price
                ],
            )?;

            let (current_stock, current_avg_cost): (i64, f64) = tx.query_row(
                "SELECT stock_quantity, import_price FROM products WHERE id = ?1",
                params![item.product_id],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )?;
            let new_stock = current_stock + item.quantity;
            let new_avg_cost = if new_stock > 0 {
                (current_stock as f64 * current_avg_cost + item.quantity as f64 * item.unit_price)
                    / new_stock as f64
            } else {
                item.unit_price
            };

            tx.execute(
                "UPDATE products SET stock_quantity = ?1, import_price = ?2, updated_at = datetime('now', 'localtime') WHERE id = ?3",
                params![new_stock, new_avg_cost, item.product_id],
            )?;

            tx.execute(
                "INSERT INTO product_batches (product_id, receipt_id, quantity, remaining_quantity, cost_price, import_date)
                 VALUES (?1, ?2, ?3, ?3, ?4, ?5)",
                params![item.product_id, input.id, item.quantity, item.unit_price, input.date],
            )?;

            tx.execute(
                "INSERT INTO inventory_history (product_id, movement_type, quantity_change, reference_id)
                 VALUES (?1, 'import', ?2, ?3)",
                params![item.product_id, item.quantity, input.id],
            )?;

            // Dòng 'import' ở trên phản ánh trạng thái MỚI sau khi sửa (đã xoá
            // dòng cũ) nên tự nó không cho thấy phiếu từng bị sửa. Thêm 1 dòng
            // đánh dấu riêng (quantity_change = 0, không ảnh hưởng tồn kho) để
            // Kiểm kho hiển thị được lịch sử "đã sửa phiếu nhập".
            tx.execute(
                "INSERT INTO inventory_history (product_id, movement_type, quantity_change, reference_id)
                 VALUES (?1, 'import_edit', 0, ?2)",
                params![item.product_id, input.id],
            )?;
        }

        if let Some(new_sid) = input.supplier_id {
            tx.execute(
                "UPDATE suppliers SET total_purchased = total_purchased + ?1, updated_at = datetime('now', 'localtime') WHERE id = ?2",
                params![new_total, new_sid],
            )?;
        }

        tx.execute(
            "UPDATE import_receipts SET date=?1, supplier=?2, supplier_id=?3, note=?4, total_amount=?5, updated_at=datetime('now', 'localtime')
             WHERE id=?6",
            params![
                input.date,
                input.supplier,
                input.supplier_id,
                input.note,
                new_total,
                input.id
            ],
        )?;

        tx.commit()?;
        drop(conn);
        self.get_import_receipt(input.id)
    }

    pub fn create_export_receipt(&self, input: CreateExportReceipt) -> SqlResult<ExportReceipt> {
        // Validation server-side (Issue 7).
        validate_receipt_header(&input.receipt_number, &input.date, input.items.len())?;
        for item in &input.items {
            if item.product_id <= 0 {
                return Err(app_err("Dòng xuất thiếu sản phẩm hợp lệ."));
            }
            if item.quantity < 1 {
                return Err(app_err("Số lượng xuất phải >= 1."));
            }
            if item.unit_price < 0.0 {
                return Err(app_err("Đơn giá xuất không được âm."));
            }
        }
        if input.discount < 0.0 {
            return Err(app_err("Chiết khấu không được âm."));
        }
        if input.amount_paid < 0.0 {
            return Err(app_err("Số tiền thanh toán không được âm."));
        }

        let mut conn = self.conn.lock().unwrap();

        // Kiểm tra tồn theo TỔNG số lượng mỗi sản phẩm trong phiếu (Issue 4): nhiều
        // dòng cùng 1 sản phẩm phải cộng dồn, tránh lọt qua rồi âm tồn.
        let mut wanted: HashMap<i64, i64> = HashMap::new();
        for item in &input.items {
            *wanted.entry(item.product_id).or_insert(0) += item.quantity;
        }
        for (product_id, need) in &wanted {
            let (code, stock): (String, i64) = conn.query_row(
                "SELECT code, stock_quantity FROM products WHERE id = ?1",
                params![product_id],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )?;
            if stock < *need {
                return Err(app_err(format!(
                    "Không đủ tồn kho cho sản phẩm {code}. Cần {need}, còn {stock}."
                )));
            }
        }

        let tx = conn.transaction()?;
        let items_total: f64 = input
            .items
            .iter()
            .map(|item| item.quantity as f64 * item.unit_price)
            .sum();
        // Chiết khấu ở mức đơn; tổng phải thu không âm.
        let discount = input.discount.max(0.0);
        let total_amount = (items_total - discount).max(0.0);

        // Nếu chọn khách từ danh bạ, lấy tên để lưu vào cột hiển thị `customer`.
        let customer_name: Option<String> = match input.customer_id {
            Some(cid) => Some(tx.query_row(
                "SELECT name FROM customers WHERE id = ?1",
                params![cid],
                |row| row.get(0),
            )?),
            None => input.customer.clone(),
        };

        tx.execute(
            "INSERT INTO export_receipts (receipt_number, date, customer, customer_id, discount, amount_paid, payment_method, note, total_amount)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![
                input.receipt_number,
                input.date,
                customer_name,
                input.customer_id,
                discount,
                input.amount_paid,
                input.payment_method,
                input.note,
                total_amount
            ],
        )?;
        let receipt_id = tx.last_insert_rowid();

        // Cập nhật tổng mua & công nợ khách hàng.
        // `amount_paid` là TIỀN KHÁCH ĐƯA (tender), có thể lớn hơn hóa đơn khi thối
        // lại. Công nợ chỉ tính phần còn thiếu của CHÍNH hóa đơn này, nên phải kẹp
        // số đã áp vào [0, total_amount] — không dùng tiền thừa trừ nợ cũ (Issue 1).
        if let Some(cid) = input.customer_id {
            let applied = input.amount_paid.clamp(0.0, total_amount);
            let remaining_for_debt = (total_amount - applied).max(0.0);
            tx.execute(
                "UPDATE customers SET total_spent = total_spent + ?1, debt = debt + ?2, updated_at = datetime('now', 'localtime') WHERE id = ?3",
                params![total_amount, remaining_for_debt, cid],
            )?;
        }

        for item in &input.items {
            let total_price = item.quantity as f64 * item.unit_price;
            let total_cost = Self::consume_batches_fifo(&tx, item.product_id, item.quantity)?;
            let cost_price = total_cost / item.quantity as f64;

            tx.execute(
                "INSERT INTO export_items (receipt_id, product_id, quantity, unit_price, total_price, cost_price)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                params![
                    receipt_id,
                    item.product_id,
                    item.quantity,
                    item.unit_price,
                    total_price,
                    cost_price
                ],
            )?;

            tx.execute(
                "UPDATE products SET stock_quantity = stock_quantity - ?1, updated_at = datetime('now', 'localtime') WHERE id = ?2",
                params![item.quantity, item.product_id],
            )?;

            // Sau khi tiêu thụ lô, tính lại giá vốn bình quân từ lô còn lại (Issue 5).
            Self::recompute_avg_cost(&tx, item.product_id)?;

            tx.execute(
                "INSERT INTO inventory_history (product_id, movement_type, quantity_change, reference_id)
                 VALUES (?1, 'export', ?2, ?3)",
                params![item.product_id, -item.quantity, receipt_id],
            )?;
        }

        tx.commit()?;
        drop(conn);
        self.get_export_receipt(receipt_id)
    }

    pub fn get_export_receipts(&self) -> SqlResult<Vec<ExportReceipt>> {
        let conn = self.conn.lock().unwrap();
        // 1 query header + 1 query item, gom trong Rust — tránh N+1 (Issue 17).
        let mut receipts: Vec<ExportReceipt> = {
            let mut stmt = conn.prepare(
                "SELECT id, receipt_number, date, customer, customer_id, discount, amount_paid, payment_method, note, total_amount, created_at
                 FROM export_receipts ORDER BY date DESC, id DESC",
            )?;
            let rows = stmt
                .query_map([], |row| {
                    Ok(ExportReceipt {
                        id: row.get(0)?,
                        receipt_number: row.get(1)?,
                        date: row.get(2)?,
                        customer: row.get(3)?,
                        customer_id: row.get(4)?,
                        discount: row.get(5)?,
                        amount_paid: row.get(6)?,
                        payment_method: row.get(7)?,
                        note: row.get(8)?,
                        total_amount: row.get(9)?,
                        created_at: row.get(10)?,
                        items: vec![],
                    })
                })?
                .collect::<SqlResult<Vec<_>>>()?;
            rows
        };

        let mut items_by_receipt: HashMap<i64, Vec<ExportItem>> = HashMap::new();
        {
            let mut stmt = conn.prepare(
                "SELECT ei.id, ei.receipt_id, ei.product_id, p.name, p.code, ei.quantity, ei.unit_price, ei.total_price, ei.cost_price
                 FROM export_items ei
                 JOIN products p ON p.id = ei.product_id
                 ORDER BY ei.id ASC",
            )?;
            let rows = stmt.query_map([], |row| {
                Ok(ExportItem {
                    id: row.get(0)?,
                    receipt_id: row.get(1)?,
                    product_id: row.get(2)?,
                    product_name: row.get(3)?,
                    product_code: row.get(4)?,
                    quantity: row.get(5)?,
                    unit_price: row.get(6)?,
                    total_price: row.get(7)?,
                    cost_price: row.get(8)?,
                })
            })?;
            for item in rows {
                let item = item?;
                items_by_receipt
                    .entry(item.receipt_id)
                    .or_default()
                    .push(item);
            }
        }

        for receipt in &mut receipts {
            if let Some(items) = items_by_receipt.remove(&receipt.id) {
                receipt.items = items;
            }
        }
        Ok(receipts)
    }

    fn get_export_receipt(&self, id: i64) -> SqlResult<ExportReceipt> {
        let conn = self.conn.lock().unwrap();
        let receipt = conn.query_row(
            "SELECT id, receipt_number, date, customer, customer_id, discount, amount_paid, payment_method, note, total_amount, created_at
             FROM export_receipts WHERE id = ?1",
            params![id],
            |row| {
                Ok(ExportReceipt {
                    id: row.get(0)?,
                    receipt_number: row.get(1)?,
                    date: row.get(2)?,
                    customer: row.get(3)?,
                    customer_id: row.get(4)?,
                    discount: row.get(5)?,
                    amount_paid: row.get(6)?,
                    payment_method: row.get(7)?,
                    note: row.get(8)?,
                    total_amount: row.get(9)?,
                    created_at: row.get(10)?,
                    items: vec![],
                })
            },
        )?;

        let mut stmt = conn.prepare(
            "SELECT ei.id, ei.receipt_id, ei.product_id, p.name, p.code, ei.quantity, ei.unit_price, ei.total_price, ei.cost_price
             FROM export_items ei
             JOIN products p ON p.id = ei.product_id
             WHERE ei.receipt_id = ?1",
        )?;

        let items = stmt
            .query_map(params![id], |row| {
                Ok(ExportItem {
                    id: row.get(0)?,
                    receipt_id: row.get(1)?,
                    product_id: row.get(2)?,
                    product_name: row.get(3)?,
                    product_code: row.get(4)?,
                    quantity: row.get(5)?,
                    unit_price: row.get(6)?,
                    total_price: row.get(7)?,
                    cost_price: row.get(8)?,
                })
            })?
            .collect::<SqlResult<Vec<_>>>()?;

        Ok(ExportReceipt { items, ..receipt })
    }

    /// Khách trả hàng đã mua — BẮT BUỘC gắn với dòng hàng cụ thể trên phiếu
    /// bán gốc, không vượt quá số đã bán (trừ các lần trả trước). Nhập lại
    /// kho đúng giá vốn đã ghi trên dòng xuất gốc (`export_items.cost_price`),
    /// không dùng giá vốn hiện tại hay giá tự nhập — khớp sổ sách.
    pub fn create_customer_return(&self, input: CreateCustomerReturn) -> SqlResult<ReturnReceipt> {
        if input.date.trim().is_empty() {
            return Err(app_err("Ngày trả không được để trống."));
        }
        if input.items.is_empty() {
            return Err(app_err("Phiếu trả phải có ít nhất 1 sản phẩm."));
        }
        for item in &input.items {
            if item.quantity < 1 {
                return Err(app_err("Số lượng trả phải >= 1."));
            }
        }

        let mut conn = self.conn.lock().unwrap();
        let tx = conn.transaction()?;

        struct Line {
            original_item_id: i64,
            product_id: i64,
            quantity: i64,
            unit_price: f64,
            cost_price: f64,
        }
        let mut lines = Vec::with_capacity(input.items.len());
        for item in &input.items {
            let row: SqlResult<(i64, i64, f64, f64)> = tx.query_row(
                "SELECT product_id, quantity, unit_price, cost_price FROM export_items WHERE id = ?1",
                params![item.original_item_id],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
            );
            let (product_id, original_quantity, unit_price, cost_price) = match row {
                Ok(v) => v,
                Err(rusqlite::Error::QueryReturnedNoRows) => {
                    return Err(app_err("Không tìm thấy dòng hàng gốc trên phiếu bán."))
                }
                Err(e) => return Err(e),
            };

            let already_returned: i64 = tx.query_row(
                "SELECT COALESCE(SUM(ri.quantity), 0) FROM return_items ri
                 JOIN return_receipts rr ON rr.id = ri.return_id
                 WHERE rr.return_type = 'customer' AND ri.original_item_id = ?1",
                params![item.original_item_id],
                |row| row.get(0),
            )?;
            if item.quantity > original_quantity - already_returned {
                return Err(app_err(
                    "Số lượng trả vượt quá số lượng đã bán (sau khi trừ các lần trả trước).",
                ));
            }

            lines.push(Line {
                original_item_id: item.original_item_id,
                product_id,
                quantity: item.quantity,
                unit_price,
                cost_price,
            });
        }

        let total_amount: f64 = lines.iter().map(|l| l.quantity as f64 * l.unit_price).sum();

        tx.execute(
            "INSERT INTO return_receipts (receipt_number, return_type, original_receipt_id, date, note, total_amount)
             VALUES (?1, 'customer', ?2, ?3, ?4, ?5)",
            params![
                input.receipt_number,
                input.original_receipt_id,
                input.date,
                input.note,
                total_amount
            ],
        )?;
        let return_id = tx.last_insert_rowid();

        for line in &lines {
            let total_price = line.quantity as f64 * line.unit_price;
            tx.execute(
                "INSERT INTO return_items (return_id, original_item_id, product_id, quantity, unit_price, cost_price, total_price)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                params![
                    return_id,
                    line.original_item_id,
                    line.product_id,
                    line.quantity,
                    line.unit_price,
                    line.cost_price,
                    total_price
                ],
            )?;

            // Lô mới nhập lại kho, đúng giá vốn đã bán ra (không phải giá vốn
            // bình quân hiện tại) — `receipt_id` để NULL vì không gắn phiếu nhập nào.
            tx.execute(
                "INSERT INTO product_batches (product_id, quantity, remaining_quantity, cost_price, import_date)
                 VALUES (?1, ?2, ?2, ?3, ?4)",
                params![line.product_id, line.quantity, line.cost_price, input.date],
            )?;
            tx.execute(
                "UPDATE products SET stock_quantity = stock_quantity + ?1, updated_at = datetime('now', 'localtime') WHERE id = ?2",
                params![line.quantity, line.product_id],
            )?;
            Self::recompute_avg_cost(&tx, line.product_id)?;
            tx.execute(
                "INSERT INTO inventory_history (product_id, movement_type, quantity_change, reference_id)
                 VALUES (?1, 'customer_return', ?2, ?3)",
                params![line.product_id, line.quantity, return_id],
            )?;
        }

        // Trả hàng làm giảm cả công nợ lẫn doanh thu đã ghi nhận của khách,
        // đối xứng với cách create_export_receipt cộng cả hai cùng lúc. Kẹp
        // nợ về 0 — không theo dõi phần "khách được hoàn dư" (nhất quán với
        // cách amount_paid dư không trừ nợ cũ ở phiếu bán).
        let customer_id: Option<i64> = tx.query_row(
            "SELECT customer_id FROM export_receipts WHERE id = ?1",
            params![input.original_receipt_id],
            |row| row.get(0),
        )?;
        if let Some(cid) = customer_id {
            tx.execute(
                "UPDATE customers SET debt = MAX(debt - ?1, 0), total_spent = total_spent - ?1, updated_at = datetime('now', 'localtime') WHERE id = ?2",
                params![total_amount, cid],
            )?;
        }

        tx.commit()?;
        drop(conn);
        self.get_return_receipt(return_id)
    }

    /// Trả hàng đã nhập cho nhà cung cấp — BẮT BUỘC gắn với dòng hàng cụ thể
    /// trên phiếu nhập gốc. Khác với trả hàng khách: phải trừ đúng LÔ của
    /// chính phiếu nhập đó (không phải FIFO chung), vì phải trả đúng lô đã
    /// nhập — nếu lô đó đã bị bán bớt thì không đủ để trả.
    pub fn create_supplier_return(&self, input: CreateSupplierReturn) -> SqlResult<ReturnReceipt> {
        if input.date.trim().is_empty() {
            return Err(app_err("Ngày trả không được để trống."));
        }
        if input.items.is_empty() {
            return Err(app_err("Phiếu trả phải có ít nhất 1 sản phẩm."));
        }
        for item in &input.items {
            if item.quantity < 1 {
                return Err(app_err("Số lượng trả phải >= 1."));
            }
        }

        let mut conn = self.conn.lock().unwrap();
        let tx = conn.transaction()?;

        struct Line {
            original_item_id: i64,
            product_id: i64,
            quantity: i64,
            unit_price: f64,
        }
        let mut lines = Vec::with_capacity(input.items.len());
        for item in &input.items {
            let row: SqlResult<(i64, i64, f64)> = tx.query_row(
                "SELECT product_id, quantity, unit_price FROM import_items WHERE id = ?1",
                params![item.original_item_id],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
            );
            let (product_id, original_quantity, unit_price) = match row {
                Ok(v) => v,
                Err(rusqlite::Error::QueryReturnedNoRows) => {
                    return Err(app_err("Không tìm thấy dòng hàng gốc trên phiếu nhập."))
                }
                Err(e) => return Err(e),
            };

            let already_returned: i64 = tx.query_row(
                "SELECT COALESCE(SUM(ri.quantity), 0) FROM return_items ri
                 JOIN return_receipts rr ON rr.id = ri.return_id
                 WHERE rr.return_type = 'supplier' AND ri.original_item_id = ?1",
                params![item.original_item_id],
                |row| row.get(0),
            )?;
            if item.quantity > original_quantity - already_returned {
                return Err(app_err(
                    "Số lượng trả vượt quá số lượng đã nhập (sau khi trừ các lần trả trước).",
                ));
            }

            let batch_row: SqlResult<(i64, i64)> = tx.query_row(
                "SELECT id, remaining_quantity FROM product_batches WHERE receipt_id = ?1 AND product_id = ?2",
                params![input.original_receipt_id, product_id],
                |row| Ok((row.get(0)?, row.get(1)?)),
            );
            let (batch_id, batch_remaining) = match batch_row {
                Ok(v) => v,
                Err(rusqlite::Error::QueryReturnedNoRows) => {
                    return Err(app_err("Không tìm thấy lô hàng của phiếu nhập này để trả."))
                }
                Err(e) => return Err(e),
            };
            if item.quantity > batch_remaining {
                return Err(app_err(
                    "Hàng đã được bán bớt, không đủ để trả cho nhà cung cấp.",
                ));
            }
            tx.execute(
                "UPDATE product_batches SET remaining_quantity = remaining_quantity - ?1 WHERE id = ?2",
                params![item.quantity, batch_id],
            )?;

            lines.push(Line {
                original_item_id: item.original_item_id,
                product_id,
                quantity: item.quantity,
                unit_price,
            });
        }

        let total_amount: f64 = lines.iter().map(|l| l.quantity as f64 * l.unit_price).sum();

        tx.execute(
            "INSERT INTO return_receipts (receipt_number, return_type, original_receipt_id, date, note, total_amount)
             VALUES (?1, 'supplier', ?2, ?3, ?4, ?5)",
            params![
                input.receipt_number,
                input.original_receipt_id,
                input.date,
                input.note,
                total_amount
            ],
        )?;
        let return_id = tx.last_insert_rowid();

        for line in &lines {
            let total_price = line.quantity as f64 * line.unit_price;
            tx.execute(
                "INSERT INTO return_items (return_id, original_item_id, product_id, quantity, unit_price, cost_price, total_price)
                 VALUES (?1, ?2, ?3, ?4, ?5, 0, ?6)",
                params![
                    return_id,
                    line.original_item_id,
                    line.product_id,
                    line.quantity,
                    line.unit_price,
                    total_price
                ],
            )?;

            tx.execute(
                "UPDATE products SET stock_quantity = stock_quantity - ?1, updated_at = datetime('now', 'localtime') WHERE id = ?2",
                params![line.quantity, line.product_id],
            )?;
            Self::recompute_avg_cost(&tx, line.product_id)?;
            tx.execute(
                "INSERT INTO inventory_history (product_id, movement_type, quantity_change, reference_id)
                 VALUES (?1, 'supplier_return', ?2, ?3)",
                params![line.product_id, -line.quantity, return_id],
            )?;
        }

        // `suppliers.debt` không được ghi ở bất kỳ đâu khác trong hệ thống
        // (luôn = 0, chưa có cơ chế mua chịu NCC) nên không đụng vào — chỉ
        // điều chỉnh total_purchased cho đúng thực tế đã mua.
        let supplier_id: Option<i64> = tx.query_row(
            "SELECT supplier_id FROM import_receipts WHERE id = ?1",
            params![input.original_receipt_id],
            |row| row.get(0),
        )?;
        if let Some(sid) = supplier_id {
            tx.execute(
                "UPDATE suppliers SET total_purchased = total_purchased - ?1, updated_at = datetime('now', 'localtime') WHERE id = ?2",
                params![total_amount, sid],
            )?;
        }

        tx.commit()?;
        drop(conn);
        self.get_return_receipt(return_id)
    }

    pub fn get_return_receipts(&self) -> SqlResult<Vec<ReturnReceipt>> {
        let conn = self.conn.lock().unwrap();
        let mut receipts: Vec<ReturnReceipt> = {
            let mut stmt = conn.prepare(
                "SELECT id, receipt_number, return_type, original_receipt_id, date, note, total_amount, created_at
                 FROM return_receipts ORDER BY date DESC, id DESC",
            )?;
            let rows = stmt
                .query_map([], |row| {
                    Ok(ReturnReceipt {
                        id: row.get(0)?,
                        receipt_number: row.get(1)?,
                        return_type: row.get(2)?,
                        original_receipt_id: row.get(3)?,
                        date: row.get(4)?,
                        note: row.get(5)?,
                        total_amount: row.get(6)?,
                        created_at: row.get(7)?,
                        items: vec![],
                    })
                })?
                .collect::<SqlResult<Vec<_>>>()?;
            rows
        };

        let mut items_by_return: HashMap<i64, Vec<ReturnItem>> = HashMap::new();
        {
            let mut stmt = conn.prepare(
                "SELECT ri.id, ri.return_id, ri.original_item_id, ri.product_id, p.name, p.code, ri.quantity, ri.unit_price, ri.cost_price, ri.total_price
                 FROM return_items ri
                 JOIN products p ON p.id = ri.product_id
                 ORDER BY ri.id ASC",
            )?;
            let rows = stmt.query_map([], |row| {
                Ok(ReturnItem {
                    id: row.get(0)?,
                    return_id: row.get(1)?,
                    original_item_id: row.get(2)?,
                    product_id: row.get(3)?,
                    product_name: row.get(4)?,
                    product_code: row.get(5)?,
                    quantity: row.get(6)?,
                    unit_price: row.get(7)?,
                    cost_price: row.get(8)?,
                    total_price: row.get(9)?,
                })
            })?;
            for item in rows {
                let item = item?;
                items_by_return.entry(item.return_id).or_default().push(item);
            }
        }

        for receipt in &mut receipts {
            if let Some(items) = items_by_return.remove(&receipt.id) {
                receipt.items = items;
            }
        }
        Ok(receipts)
    }

    fn get_return_receipt(&self, id: i64) -> SqlResult<ReturnReceipt> {
        let conn = self.conn.lock().unwrap();
        let receipt = conn.query_row(
            "SELECT id, receipt_number, return_type, original_receipt_id, date, note, total_amount, created_at
             FROM return_receipts WHERE id = ?1",
            params![id],
            |row| {
                Ok(ReturnReceipt {
                    id: row.get(0)?,
                    receipt_number: row.get(1)?,
                    return_type: row.get(2)?,
                    original_receipt_id: row.get(3)?,
                    date: row.get(4)?,
                    note: row.get(5)?,
                    total_amount: row.get(6)?,
                    created_at: row.get(7)?,
                    items: vec![],
                })
            },
        )?;

        let mut stmt = conn.prepare(
            "SELECT ri.id, ri.return_id, ri.original_item_id, ri.product_id, p.name, p.code, ri.quantity, ri.unit_price, ri.cost_price, ri.total_price
             FROM return_items ri
             JOIN products p ON p.id = ri.product_id
             WHERE ri.return_id = ?1",
        )?;
        let items = stmt
            .query_map(params![id], |row| {
                Ok(ReturnItem {
                    id: row.get(0)?,
                    return_id: row.get(1)?,
                    original_item_id: row.get(2)?,
                    product_id: row.get(3)?,
                    product_name: row.get(4)?,
                    product_code: row.get(5)?,
                    quantity: row.get(6)?,
                    unit_price: row.get(7)?,
                    cost_price: row.get(8)?,
                    total_price: row.get(9)?,
                })
            })?
            .collect::<SqlResult<Vec<_>>>()?;

        Ok(ReturnReceipt { items, ..receipt })
    }

    fn map_user_row(
        row: &rusqlite::Row,
    ) -> SqlResult<(i64, String, String, String, bool, bool, String, String)> {
        Ok((
            row.get(0)?,
            row.get(1)?,
            row.get(2)?,
            row.get(3)?,
            row.get(4)?,
            row.get(5)?,
            row.get(6)?,
            row.get(7)?,
        ))
    }

    fn load_permissions(conn: &Connection, user_id: i64, is_admin: bool) -> SqlResult<Vec<String>> {
        if is_admin {
            return Ok(crate::auth::PERMISSION_KEYS
                .iter()
                .map(|(key, _)| key.to_string())
                .collect());
        }
        let mut stmt =
            conn.prepare("SELECT permission_key FROM user_permissions WHERE user_id = ?1")?;
        let rows = stmt
            .query_map(params![user_id], |row| row.get::<_, String>(0))?
            .collect::<SqlResult<Vec<_>>>()?;
        Ok(rows)
    }

    pub fn login(&self, input: LoginInput) -> SqlResult<User> {
        let conn = self.conn.lock().unwrap();
        let result = conn.query_row(
            "SELECT id, username, password_hash, full_name, is_admin, is_active, created_at, updated_at
             FROM users WHERE username = ?1",
            params![input.username],
            Self::map_user_row,
        );
        let (id, username, password_hash, full_name, is_admin, is_active, created_at, updated_at) =
            match result {
                Ok(v) => v,
                Err(rusqlite::Error::QueryReturnedNoRows) => {
                    return Err(app_err("Sai tên đăng nhập hoặc mật khẩu."))
                }
                Err(e) => return Err(e),
            };

        if !is_active {
            return Err(app_err("Tài khoản đã bị khóa."));
        }
        if !crate::auth::verify_password(&input.password, &password_hash) {
            return Err(app_err("Sai tên đăng nhập hoặc mật khẩu."));
        }

        let permissions = Self::load_permissions(&conn, id, is_admin)?;
        Ok(User {
            id,
            username,
            full_name,
            is_admin,
            is_active,
            permissions,
            created_at,
            updated_at,
        })
    }

    pub fn get_users(&self) -> SqlResult<Vec<User>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, username, password_hash, full_name, is_admin, is_active, created_at, updated_at
             FROM users ORDER BY username ASC",
        )?;
        let rows = stmt
            .query_map([], Self::map_user_row)?
            .collect::<SqlResult<Vec<_>>>()?;
        let mut users = Vec::with_capacity(rows.len());
        for (id, username, _hash, full_name, is_admin, is_active, created_at, updated_at) in rows {
            let permissions = Self::load_permissions(&conn, id, is_admin)?;
            users.push(User {
                id,
                username,
                full_name,
                is_admin,
                is_active,
                permissions,
                created_at,
                updated_at,
            });
        }
        Ok(users)
    }

    fn get_user_by_id(&self, id: i64) -> SqlResult<User> {
        let conn = self.conn.lock().unwrap();
        let (id, username, _hash, full_name, is_admin, is_active, created_at, updated_at) = conn
            .query_row(
                "SELECT id, username, password_hash, full_name, is_admin, is_active, created_at, updated_at
                 FROM users WHERE id = ?1",
                params![id],
                Self::map_user_row,
            )?;
        let permissions = Self::load_permissions(&conn, id, is_admin)?;
        Ok(User {
            id,
            username,
            full_name,
            is_admin,
            is_active,
            permissions,
            created_at,
            updated_at,
        })
    }

    pub fn create_user(&self, input: CreateUser) -> SqlResult<User> {
        if input.username.trim().is_empty() {
            return Err(app_err("Tên đăng nhập không được để trống."));
        }
        if input.password.len() < 4 {
            return Err(app_err("Mật khẩu phải có ít nhất 4 ký tự."));
        }
        let password_hash = crate::auth::hash_password(&input.password)
            .map_err(|e| app_err(format!("Không thể tạo mật khẩu: {e}")))?;

        let mut conn = self.conn.lock().unwrap();
        let tx = conn.transaction()?;
        tx.execute(
            "INSERT INTO users (username, password_hash, full_name, is_admin, is_active) VALUES (?1, ?2, ?3, ?4, 1)",
            params![input.username, password_hash, input.full_name, input.is_admin],
        )?;
        let id = tx.last_insert_rowid();
        if !input.is_admin {
            for key in &input.permissions {
                tx.execute(
                    "INSERT INTO user_permissions (user_id, permission_key) VALUES (?1, ?2)",
                    params![id, key],
                )?;
            }
        }
        tx.commit()?;
        drop(conn);
        self.get_user_by_id(id)
    }

    pub fn update_user(&self, input: UpdateUser) -> SqlResult<User> {
        if input.username.trim().is_empty() {
            return Err(app_err("Tên đăng nhập không được để trống."));
        }
        let mut conn = self.conn.lock().unwrap();
        let tx = conn.transaction()?;

        if !input.is_admin {
            let was_admin: bool = tx.query_row(
                "SELECT is_admin FROM users WHERE id = ?1",
                params![input.id],
                |row| row.get(0),
            )?;
            let other_admins: i64 = tx.query_row(
                "SELECT COUNT(*) FROM users WHERE is_admin = 1 AND id != ?1",
                params![input.id],
                |row| row.get(0),
            )?;
            if was_admin && other_admins == 0 {
                return Err(app_err(
                    "Không thể bỏ quyền admin của tài khoản admin cuối cùng.",
                ));
            }
        }

        match &input.password {
            Some(new_password) => {
                let password_hash = crate::auth::hash_password(new_password)
                    .map_err(|e| app_err(format!("Không thể tạo mật khẩu: {e}")))?;
                tx.execute(
                    "UPDATE users SET username=?1, password_hash=?2, full_name=?3, is_admin=?4, is_active=?5, updated_at=datetime('now', 'localtime')
                     WHERE id=?6",
                    params![
                        input.username,
                        password_hash,
                        input.full_name,
                        input.is_admin,
                        input.is_active,
                        input.id
                    ],
                )?;
            }
            None => {
                tx.execute(
                    "UPDATE users SET username=?1, full_name=?2, is_admin=?3, is_active=?4, updated_at=datetime('now', 'localtime')
                     WHERE id=?5",
                    params![
                        input.username,
                        input.full_name,
                        input.is_admin,
                        input.is_active,
                        input.id
                    ],
                )?;
            }
        }

        tx.execute(
            "DELETE FROM user_permissions WHERE user_id = ?1",
            params![input.id],
        )?;
        if !input.is_admin {
            for key in &input.permissions {
                tx.execute(
                    "INSERT INTO user_permissions (user_id, permission_key) VALUES (?1, ?2)",
                    params![input.id, key],
                )?;
            }
        }

        tx.commit()?;
        drop(conn);
        self.get_user_by_id(input.id)
    }

    pub fn delete_user(&self, id: i64) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        let is_admin: bool = conn.query_row(
            "SELECT is_admin FROM users WHERE id = ?1",
            params![id],
            |row| row.get(0),
        )?;
        if is_admin {
            let other_admins: i64 = conn.query_row(
                "SELECT COUNT(*) FROM users WHERE is_admin = 1 AND id != ?1",
                params![id],
                |row| row.get(0),
            )?;
            if other_admins == 0 {
                return Err(app_err("Không thể xóa admin cuối cùng."));
            }
        }
        conn.execute("DELETE FROM users WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn get_dashboard_stats(&self) -> SqlResult<DashboardStats> {
        let conn = self.conn.lock().unwrap();
        let total_products: i64 =
            conn.query_row("SELECT COUNT(*) FROM products", [], |row| row.get(0))?;
        let low_stock_count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM products WHERE stock_quantity <= min_stock",
            [],
            |row| row.get(0),
        )?;
        let total_stock_value: f64 = conn.query_row(
            "SELECT COALESCE(SUM(stock_quantity * import_price), 0) FROM products",
            [],
            |row| row.get(0),
        )?;
        let import_total_month: f64 = conn.query_row(
            "SELECT COALESCE(SUM(total_amount), 0) FROM import_receipts WHERE strftime('%Y-%m', date) = strftime('%Y-%m', 'now', 'localtime')",
            [],
            |row| row.get(0),
        )?;
        let export_total_month: f64 = conn.query_row(
            "SELECT COALESCE(SUM(total_amount), 0) FROM export_receipts WHERE strftime('%Y-%m', date) = strftime('%Y-%m', 'now', 'localtime')",
            [],
            |row| row.get(0),
        )?;
        // Lợi nhuận = (doanh thu dòng - giá vốn FIFO) - chiết khấu cấp phiếu (Issue 2+3).
        // Trừ discount MỘT lần/phiếu, không nhân theo số dòng.
        let profit_month: f64 = conn.query_row(
            "SELECT COALESCE((
                 SELECT SUM(ei.total_price - ei.quantity * ei.cost_price)
                 FROM export_items ei
                 JOIN export_receipts er ON er.id = ei.receipt_id
                 WHERE strftime('%Y-%m', er.date) = strftime('%Y-%m', 'now', 'localtime')
             ), 0)
             - COALESCE((
                 SELECT SUM(discount) FROM export_receipts
                 WHERE strftime('%Y-%m', date) = strftime('%Y-%m', 'now', 'localtime')
             ), 0)",
            [],
            |row| row.get(0),
        )?;

        Ok(DashboardStats {
            total_products,
            low_stock_count,
            total_stock_value,
            import_total_month,
            export_total_month,
            profit_month,
        })
    }

    pub fn get_profit_report(&self, from: &str, to: &str) -> SqlResult<ProfitReport> {
        let conn = self.conn.lock().unwrap();
        // Doanh thu từng SP đã trừ chiết khấu phiếu, phân bổ theo tỷ lệ
        // (line_total / tổng dòng của phiếu) — Issue 2+3.
        let mut stmt = conn.prepare(
            "SELECT ei.product_id, p.code, p.name,
                    SUM(ei.quantity) AS qty,
                    SUM(ei.total_price - COALESCE(er.discount * ei.total_price / NULLIF(rt.items_total, 0), 0)) AS revenue,
                    SUM(ei.quantity * ei.cost_price) AS cost
             FROM export_items ei
             JOIN export_receipts er ON er.id = ei.receipt_id
             JOIN products p ON p.id = ei.product_id
             JOIN (SELECT receipt_id, SUM(total_price) AS items_total
                   FROM export_items GROUP BY receipt_id) rt ON rt.receipt_id = ei.receipt_id
             WHERE er.date BETWEEN ?1 AND ?2
             GROUP BY ei.product_id, p.code, p.name
             ORDER BY (SUM(ei.total_price - COALESCE(er.discount * ei.total_price / NULLIF(rt.items_total, 0), 0)) - SUM(ei.quantity * ei.cost_price)) DESC",
        )?;

        let by_product = stmt
            .query_map(params![from, to], |row| {
                let revenue: f64 = row.get(4)?;
                let cost: f64 = row.get(5)?;
                let profit = revenue - cost;
                let margin_percent = if revenue > 0.0 {
                    profit / revenue * 100.0
                } else {
                    0.0
                };
                Ok(ProductProfitRow {
                    product_id: row.get(0)?,
                    product_code: row.get(1)?,
                    product_name: row.get(2)?,
                    quantity_sold: row.get(3)?,
                    revenue,
                    cost,
                    profit,
                    margin_percent,
                })
            })?
            .collect::<SqlResult<Vec<_>>>()?;

        let total_revenue: f64 = by_product.iter().map(|r| r.revenue).sum();
        let total_cost: f64 = by_product.iter().map(|r| r.cost).sum();
        let total_profit = total_revenue - total_cost;
        let margin_percent = if total_revenue > 0.0 {
            total_profit / total_revenue * 100.0
        } else {
            0.0
        };

        Ok(ProfitReport {
            from_date: from.to_string(),
            to_date: to.to_string(),
            total_revenue,
            total_cost,
            total_profit,
            margin_percent,
            by_product,
        })
    }

    pub fn get_inventory_history(&self) -> SqlResult<Vec<InventoryHistory>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT ih.id, ih.product_id, p.name, ih.movement_type, ih.quantity_change, ih.reference_id,
                    CASE ih.movement_type
                        WHEN 'import' THEN ir.receipt_number
                        WHEN 'import_edit' THEN ir.receipt_number
                        WHEN 'export' THEN er.receipt_number
                    END AS receipt_number,
                    ih.created_at
             FROM inventory_history ih
             JOIN products p ON p.id = ih.product_id
             LEFT JOIN import_receipts ir ON ih.movement_type IN ('import', 'import_edit') AND ir.id = ih.reference_id
             LEFT JOIN export_receipts er ON ih.movement_type = 'export' AND er.id = ih.reference_id
             ORDER BY ih.created_at DESC, ih.id DESC
             LIMIT 200",
        )?;

        let history = stmt
            .query_map([], |row| {
                Ok(InventoryHistory {
                    id: row.get(0)?,
                    product_id: row.get(1)?,
                    product_name: row.get(2)?,
                    movement_type: row.get(3)?,
                    quantity_change: row.get(4)?,
                    reference_id: row.get(5)?,
                    receipt_number: row.get(6)?,
                    created_at: row.get(7)?,
                })
            })?
            .collect::<SqlResult<Vec<_>>>()?;

        Ok(history)
    }
}

pub fn init_database(app: &AppHandle) -> SqlResult<Database> {
    let data_dir = app
        .path()
        .app_data_dir()
        .expect("failed to resolve app data directory");
    let db_path = data_dir.join("inventory.db");
    Database::new(db_path)
}

#[cfg(test)]
mod tests {
    use super::*;

    impl Database {
        /// DB in-memory cho test (schema đầy đủ như bản thật).
        fn new_memory() -> Self {
            let conn = Connection::open_in_memory().unwrap();
            conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
            let db = Self {
                conn: Mutex::new(conn),
            };
            db.init_schema().unwrap();
            db
        }
    }

    fn product(db: &Database, code: &str, export_price: f64) -> i64 {
        db.create_product(CreateProduct {
            code: code.to_string(),
            name: format!("SP {code}"),
            unit: "cái".to_string(),
            import_price: 0.0,
            export_price,
            min_stock: 0,
            category: None,
            description: None,
        })
        .unwrap()
        .id
    }

    fn import(db: &Database, no: &str, date: &str, pid: i64, qty: i64, price: f64) {
        db.create_import_receipt(CreateImportReceipt {
            receipt_number: no.to_string(),
            date: date.to_string(),
            supplier: None,
            supplier_id: None,
            note: None,
            items: vec![ImportItemInput {
                product_id: pid,
                quantity: qty,
                unit_price: price,
            }],
        })
        .unwrap();
    }

    fn export_items(
        db: &Database,
        no: &str,
        date: &str,
        customer_id: Option<i64>,
        discount: f64,
        amount_paid: f64,
        items: Vec<ExportItemInput>,
    ) -> SqlResult<ExportReceipt> {
        db.create_export_receipt(CreateExportReceipt {
            receipt_number: no.to_string(),
            date: date.to_string(),
            customer: None,
            customer_id,
            discount,
            amount_paid,
            payment_method: "cash".to_string(),
            note: None,
            items,
        })
    }

    fn stock(db: &Database, pid: i64) -> i64 {
        db.get_product_by_id(pid).unwrap().stock_quantity
    }
    fn avg_cost(db: &Database, pid: i64) -> f64 {
        db.get_product_by_id(pid).unwrap().import_price
    }

    // Issue 5 + 8: FIFO theo ngày phiếu, giá vốn dòng đúng lô, giá vốn BQ tính lại.
    #[test]
    fn fifo_cost_and_recomputed_avg_cost() {
        let db = Database::new_memory();
        let p = product(&db, "P1", 100.0);
        import(&db, "PN1", "2026-01-01", p, 10, 10.0);
        import(&db, "PN2", "2026-01-02", p, 10, 20.0);
        assert_eq!(stock(&db, p), 20);
        assert!((avg_cost(&db, p) - 15.0).abs() < 1e-9); // BQ (10*10+10*20)/20

        let rec = export_items(
            &db,
            "HD1",
            "2026-01-03",
            None,
            0.0,
            0.0,
            vec![ExportItemInput {
                product_id: p,
                quantity: 10,
                unit_price: 100.0,
            }],
        )
        .unwrap();
        // Xuất 10 → tiêu thụ lô rẻ (@10) trước.
        assert!((rec.items[0].cost_price - 10.0).abs() < 1e-9);
        assert_eq!(stock(&db, p), 10);
        // Giá vốn BQ tính lại từ lô còn lại (@20).
        assert!((avg_cost(&db, p) - 20.0).abs() < 1e-9);
    }

    // Issue 1: tender > total, có khách → công nợ KHÔNG bị trừ.
    #[test]
    fn debt_not_reduced_when_overpaid() {
        let db = Database::new_memory();
        let p = product(&db, "P1", 50.0);
        import(&db, "PN1", "2026-01-01", p, 10, 10.0);
        let c = db
            .create_customer(CreateCustomer {
                code: "KH1".into(),
                name: "Khach".into(),
                phone: None,
                address: None,
                note: None,
            })
            .unwrap()
            .id;
        export_items(
            &db,
            "HD1",
            "2026-01-02",
            Some(c),
            0.0,
            100.0, // đưa dư
            vec![ExportItemInput {
                product_id: p,
                quantity: 1,
                unit_price: 50.0,
            }],
        )
        .unwrap();
        let debt = db.get_customer_by_id(c).unwrap().debt;
        assert!(debt.abs() < 1e-9, "debt phải = 0, thực tế {debt}");
    }

    // Issue 1: tender < total, có khách → công nợ tăng đúng phần còn thiếu.
    #[test]
    fn debt_increases_by_remaining() {
        let db = Database::new_memory();
        let p = product(&db, "P1", 50.0);
        import(&db, "PN1", "2026-01-01", p, 10, 10.0);
        let c = db
            .create_customer(CreateCustomer {
                code: "KH1".into(),
                name: "Khach".into(),
                phone: None,
                address: None,
                note: None,
            })
            .unwrap()
            .id;
        export_items(
            &db,
            "HD1",
            "2026-01-02",
            Some(c),
            0.0,
            20.0,
            vec![ExportItemInput {
                product_id: p,
                quantity: 1,
                unit_price: 50.0,
            }],
        )
        .unwrap();
        let debt = db.get_customer_by_id(c).unwrap().debt;
        assert!((debt - 30.0).abs() < 1e-9, "debt phải = 30, thực tế {debt}");
    }

    // Issue 4: 2 dòng cùng SP vượt tồn → reject, tồn không đổi.
    #[test]
    fn aggregate_stock_check_rejects_overselling() {
        let db = Database::new_memory();
        let p = product(&db, "P1", 50.0);
        import(&db, "PN1", "2026-01-01", p, 10, 10.0);
        let res = export_items(
            &db,
            "HD1",
            "2026-01-02",
            None,
            0.0,
            0.0,
            vec![
                ExportItemInput {
                    product_id: p,
                    quantity: 6,
                    unit_price: 50.0,
                },
                ExportItemInput {
                    product_id: p,
                    quantity: 6,
                    unit_price: 50.0,
                },
            ],
        );
        assert!(res.is_err());
        assert_eq!(stock(&db, p), 10, "tồn không được đổi khi reject");
    }

    // Issue 7: items rỗng / số lượng <= 0 → Err.
    #[test]
    fn validation_rejects_bad_input() {
        let db = Database::new_memory();
        let p = product(&db, "P1", 50.0);
        import(&db, "PN1", "2026-01-01", p, 10, 10.0);
        // rỗng
        assert!(export_items(&db, "HD1", "2026-01-02", None, 0.0, 0.0, vec![]).is_err());
        // qty <= 0
        assert!(export_items(
            &db,
            "HD2",
            "2026-01-02",
            None,
            0.0,
            0.0,
            vec![ExportItemInput {
                product_id: p,
                quantity: 0,
                unit_price: 50.0,
            }],
        )
        .is_err());
        // import qty âm
        assert!(db
            .create_import_receipt(CreateImportReceipt {
                receipt_number: "PN2".into(),
                date: "2026-01-02".into(),
                supplier: None,
                supplier_id: None,
                note: None,
                items: vec![ImportItemInput {
                    product_id: p,
                    quantity: -1,
                    unit_price: 10.0,
                }],
            })
            .is_err());
        assert_eq!(stock(&db, p), 10);
    }

    // Issue 2+3: báo cáo lợi nhuận trừ chiết khấu phiếu.
    #[test]
    fn profit_report_subtracts_discount() {
        let db = Database::new_memory();
        let p = product(&db, "P1", 100.0);
        import(&db, "PN1", "2026-06-01", p, 10, 40.0);
        export_items(
            &db,
            "HD1",
            "2026-06-15",
            None,
            10.0, // chiết khấu phiếu
            0.0,
            vec![ExportItemInput {
                product_id: p,
                quantity: 1,
                unit_price: 100.0,
            }],
        )
        .unwrap();
        let rep = db.get_profit_report("2026-06-01", "2026-06-30").unwrap();
        // Doanh thu 100 - CK 10 = 90; giá vốn 40; LN 50.
        assert!(
            (rep.total_revenue - 90.0).abs() < 1e-9,
            "revenue {}",
            rep.total_revenue
        );
        assert!(
            (rep.total_profit - 50.0).abs() < 1e-9,
            "profit {}",
            rep.total_profit
        );
    }

    #[test]
    fn update_import_receipt_allowed_when_untouched() {
        let db = Database::new_memory();
        let p = product(&db, "P1", 100.0);
        import(&db, "PN1", "2026-01-01", p, 10, 10.0);
        let receipt_id = db.get_import_receipts().unwrap()[0].id;

        let updated = db
            .update_import_receipt(UpdateImportReceipt {
                id: receipt_id,
                date: "2026-01-01".into(),
                supplier: None,
                supplier_id: None,
                note: None,
                items: vec![ImportItemInput {
                    product_id: p,
                    quantity: 20,
                    unit_price: 10.0,
                }],
            })
            .unwrap();
        assert_eq!(updated.items[0].quantity, 20);
        assert_eq!(stock(&db, p), 20);
    }

    #[test]
    fn update_import_receipt_rejected_when_batch_consumed() {
        let db = Database::new_memory();
        let p = product(&db, "P1", 100.0);
        import(&db, "PN1", "2026-01-01", p, 10, 10.0);
        let receipt_id = db.get_import_receipts().unwrap()[0].id;
        export_items(
            &db,
            "HD1",
            "2026-01-02",
            None,
            0.0,
            0.0,
            vec![ExportItemInput {
                product_id: p,
                quantity: 5,
                unit_price: 50.0,
            }],
        )
        .unwrap();

        let res = db.update_import_receipt(UpdateImportReceipt {
            id: receipt_id,
            date: "2026-01-01".into(),
            supplier: None,
            supplier_id: None,
            note: None,
            items: vec![ImportItemInput {
                product_id: p,
                quantity: 20,
                unit_price: 10.0,
            }],
        });
        assert!(res.is_err(), "phải từ chối sửa khi lô đã bị xuất đụng tới");
        assert_eq!(stock(&db, p), 5, "tồn không đổi khi sửa bị từ chối");
    }

    #[test]
    fn customer_return_restocks_at_original_cost_and_reduces_debt() {
        let db = Database::new_memory();
        let p = product(&db, "P1", 100.0);
        import(&db, "PN1", "2026-01-01", p, 10, 10.0);
        let c = db
            .create_customer(CreateCustomer {
                code: "KH1".into(),
                name: "Khach".into(),
                phone: None,
                address: None,
                note: None,
            })
            .unwrap()
            .id;
        let sale = export_items(
            &db,
            "HD1",
            "2026-01-02",
            Some(c),
            0.0,
            0.0,
            vec![ExportItemInput {
                product_id: p,
                quantity: 5,
                unit_price: 100.0,
            }],
        )
        .unwrap();
        assert_eq!(stock(&db, p), 5);
        assert!((db.get_customer_by_id(c).unwrap().debt - 500.0).abs() < 1e-9);

        let export_item_id = sale.items[0].id;
        let ret = db
            .create_customer_return(CreateCustomerReturn {
                receipt_number: "PT1".into(),
                original_receipt_id: sale.id,
                date: "2026-01-03".into(),
                note: None,
                items: vec![ReturnItemInput {
                    original_item_id: export_item_id,
                    product_id: p,
                    quantity: 2,
                }],
            })
            .unwrap();
        assert!(
            (ret.items[0].cost_price - 10.0).abs() < 1e-9,
            "phải nhập lại đúng giá vốn đã bán, không phải giá vốn hiện tại"
        );
        assert_eq!(stock(&db, p), 7, "tồn tăng lại đúng số lượng trả");
        assert!(
            (db.get_customer_by_id(c).unwrap().debt - 300.0).abs() < 1e-9,
            "nợ phải giảm đúng giá trị hàng trả (2 x 100)"
        );

        // Đã trả 2/5, thử trả thêm 4 (vượt quá 3 còn lại) phải bị từ chối.
        let over = db.create_customer_return(CreateCustomerReturn {
            receipt_number: "PT2".into(),
            original_receipt_id: sale.id,
            date: "2026-01-04".into(),
            note: None,
            items: vec![ReturnItemInput {
                original_item_id: export_item_id,
                product_id: p,
                quantity: 4,
            }],
        });
        assert!(over.is_err(), "không được trả vượt quá số lượng còn lại");
    }

    #[test]
    fn supplier_return_rejects_when_batch_already_sold() {
        let db = Database::new_memory();
        let p = product(&db, "P1", 100.0);
        import(&db, "PN1", "2026-01-01", p, 10, 10.0);
        let receipts = db.get_import_receipts().unwrap();
        let receipt_id = receipts[0].id;
        let import_item_id = receipts[0].items[0].id;
        export_items(
            &db,
            "HD1",
            "2026-01-02",
            None,
            0.0,
            0.0,
            vec![ExportItemInput {
                product_id: p,
                quantity: 10,
                unit_price: 50.0,
            }],
        )
        .unwrap();

        let res = db.create_supplier_return(CreateSupplierReturn {
            receipt_number: "PTN1".into(),
            original_receipt_id: receipt_id,
            date: "2026-01-03".into(),
            note: None,
            items: vec![ReturnItemInput {
                original_item_id: import_item_id,
                product_id: p,
                quantity: 1,
            }],
        });
        assert!(res.is_err(), "không được trả NCC khi hàng đã bán hết");
    }

    #[test]
    fn supplier_return_reduces_stock_when_batch_available() {
        let db = Database::new_memory();
        let p = product(&db, "P1", 100.0);
        import(&db, "PN1", "2026-01-01", p, 10, 10.0);
        let receipts = db.get_import_receipts().unwrap();
        let receipt_id = receipts[0].id;
        let import_item_id = receipts[0].items[0].id;

        db.create_supplier_return(CreateSupplierReturn {
            receipt_number: "PTN1".into(),
            original_receipt_id: receipt_id,
            date: "2026-01-02".into(),
            note: None,
            items: vec![ReturnItemInput {
                original_item_id: import_item_id,
                product_id: p,
                quantity: 3,
            }],
        })
        .unwrap();
        assert_eq!(stock(&db, p), 7);
    }

    fn new_product_input(name: &str, import_price: f64, export_price: f64) -> CreateProduct {
        CreateProduct {
            code: String::new(),
            name: name.to_string(),
            unit: "cái".to_string(),
            import_price,
            export_price,
            min_stock: 0,
            category: None,
            description: None,
        }
    }

    #[test]
    fn create_product_auto_generates_code_when_blank() {
        let db = Database::new_memory();
        let p = db.create_product(new_product_input("Áo thun", 50.0, 80.0)).unwrap();
        assert!(p.code.starts_with("SP"), "mã phải tự sinh, thực tế {}", p.code);
    }

    #[test]
    fn create_product_reuses_existing_when_name_and_prices_match() {
        let db = Database::new_memory();
        let first = db.create_product(new_product_input("Áo thun", 50.0, 80.0)).unwrap();
        let second = db.create_product(new_product_input("Áo thun", 50.0, 80.0)).unwrap();
        assert_eq!(
            first.id, second.id,
            "trùng tên + cả 2 giá phải dùng lại đúng sản phẩm cũ"
        );
    }

    #[test]
    fn create_product_creates_new_when_price_differs() {
        let db = Database::new_memory();
        let first = db.create_product(new_product_input("Áo thun", 50.0, 80.0)).unwrap();
        let second = db.create_product(new_product_input("Áo thun", 50.0, 90.0)).unwrap();
        assert_ne!(
            first.id, second.id,
            "khác giá xuất phải tạo sản phẩm mới, không dùng chung mã"
        );
        assert_ne!(first.code, second.code);
    }

    #[test]
    fn update_product_logs_export_price_change_to_history() {
        let db = Database::new_memory();
        let p = db.create_product(new_product_input("Áo thun", 50.0, 80.0)).unwrap();

        db.update_product(UpdateProduct {
            id: p.id,
            code: p.code.clone(),
            name: p.name.clone(),
            unit: p.unit.clone(),
            import_price: p.import_price,
            export_price: 95.0,
            min_stock: p.min_stock,
            category: None,
            description: None,
        })
        .unwrap();

        let history = db.get_inventory_history().unwrap();
        assert!(
            history
                .iter()
                .any(|h| h.movement_type == "export_price_change" && h.product_id == p.id),
            "phải ghi lại mốc thời gian đổi giá bán vào lịch sử kiểm kho"
        );

        // Sửa lại thông tin khác nhưng KHÔNG đổi giá bán → không ghi thêm marker.
        let before = history
            .iter()
            .filter(|h| h.movement_type == "export_price_change")
            .count();
        db.update_product(UpdateProduct {
            id: p.id,
            code: p.code.clone(),
            name: "Áo thun cổ tròn".into(),
            unit: p.unit.clone(),
            import_price: p.import_price,
            export_price: 95.0,
            min_stock: p.min_stock,
            category: None,
            description: None,
        })
        .unwrap();
        let after = db
            .get_inventory_history()
            .unwrap()
            .iter()
            .filter(|h| h.movement_type == "export_price_change")
            .count();
        assert_eq!(before, after, "không đổi giá thì không ghi thêm marker");
    }
}
