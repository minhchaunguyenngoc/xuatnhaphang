use rusqlite::{params, Connection, Result as SqlResult};
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::AppHandle;
use tauri::Manager;

use crate::models::*;

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
            ",
        )?;

        Self::migrate_export_items_cost_price(&conn)?;
        // Cột mở rộng cho bán hàng (POS): chiết khấu, thanh toán, liên kết khách/NCC.
        Self::add_column_if_missing(&conn, "export_receipts", "customer_id", "INTEGER")?;
        Self::add_column_if_missing(&conn, "export_receipts", "discount", "REAL NOT NULL DEFAULT 0")?;
        Self::add_column_if_missing(&conn, "export_receipts", "amount_paid", "REAL NOT NULL DEFAULT 0")?;
        Self::add_column_if_missing(
            &conn,
            "export_receipts",
            "payment_method",
            "TEXT NOT NULL DEFAULT 'cash'",
        )?;
        Self::add_column_if_missing(&conn, "import_receipts", "supplier_id", "INTEGER")?;
        Self::backfill_batches_for_existing_stock(&conn)?;

        Ok(())
    }

    /// Older DBs created before FIFO costing existed lack this column.
    fn migrate_export_items_cost_price(conn: &Connection) -> SqlResult<()> {
        Self::add_column_if_missing(conn, "export_items", "cost_price", "REAL NOT NULL DEFAULT 0")
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
            "INSERT INTO product_batches (product_id, receipt_id, quantity, remaining_quantity, cost_price, created_at)
             SELECT id, NULL, stock_quantity, stock_quantity, import_price, created_at
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
                 ORDER BY created_at ASC, id ASC",
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
            // Data drift fallback (should not normally happen): cost the shortfall
            // at the product's current average cost so profit reporting stays sane.
            let fallback_price: f64 = tx.query_row(
                "SELECT import_price FROM products WHERE id = ?1",
                params![product_id],
                |row| row.get(0),
            )?;
            total_cost += remaining as f64 * fallback_price;
        }

        Ok(total_cost)
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

    pub fn create_product(&self, input: CreateProduct) -> SqlResult<Product> {
        let id = {
            let conn = self.conn.lock().unwrap();
            conn.execute(
                "INSERT INTO products (code, name, unit, import_price, export_price, min_stock, category, description)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                params![
                    input.code,
                    input.name,
                    input.unit,
                    input.import_price,
                    input.export_price,
                    input.min_stock,
                    input.category,
                    input.description
                ],
            )?;
            conn.last_insert_rowid()
        };
        self.get_product_by_id(id)
    }

    pub fn update_product(&self, input: UpdateProduct) -> SqlResult<Product> {
        {
            let conn = self.conn.lock().unwrap();
            conn.execute(
                "UPDATE products SET code=?1, name=?2, unit=?3, import_price=?4, export_price=?5, min_stock=?6, category=?7, description=?8, updated_at=datetime('now', 'localtime')
                 WHERE id=?9",
                params![
                    input.code,
                    input.name,
                    input.unit,
                    input.import_price,
                    input.export_price,
                    input.min_stock,
                    input.category,
                    input.description,
                    input.id
                ],
            )?;
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
                params![input.code, input.name, input.phone, input.address, input.note],
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
                params![input.code, input.name, input.phone, input.address, input.note],
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
                "INSERT INTO product_batches (product_id, receipt_id, quantity, remaining_quantity, cost_price)
                 VALUES (?1, ?2, ?3, ?3, ?4)",
                params![item.product_id, receipt_id, item.quantity, item.unit_price],
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
        let receipts = {
            let mut stmt = conn.prepare(
                "SELECT id, receipt_number, date, supplier, note, total_amount, created_at
                 FROM import_receipts ORDER BY date DESC, id DESC",
            )?;

            let rows = stmt
                .query_map([], |row| {
                    Ok((
                        row.get::<_, i64>(0)?,
                        row.get::<_, String>(1)?,
                        row.get::<_, String>(2)?,
                        row.get::<_, Option<String>>(3)?,
                        row.get::<_, Option<String>>(4)?,
                        row.get::<_, f64>(5)?,
                        row.get::<_, String>(6)?,
                    ))
                })?
                .collect::<SqlResult<Vec<_>>>()?;
            rows
        };

        drop(conn);
        let mut result = Vec::new();
        for (id, receipt_number, date, supplier, note, total_amount, created_at) in receipts {
            let mut receipt = self.get_import_receipt(id)?;
            receipt.receipt_number = receipt_number;
            receipt.date = date;
            receipt.supplier = supplier;
            receipt.note = note;
            receipt.total_amount = total_amount;
            receipt.created_at = created_at;
            result.push(receipt);
        }
        Ok(result)
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

    pub fn create_export_receipt(&self, input: CreateExportReceipt) -> SqlResult<ExportReceipt> {
        let mut conn = self.conn.lock().unwrap();

        for item in &input.items {
            let stock: i64 = conn.query_row(
                "SELECT stock_quantity FROM products WHERE id = ?1",
                params![item.product_id],
                |row| row.get(0),
            )?;
            if stock < item.quantity {
                return Err(rusqlite::Error::InvalidParameterName(format!(
                    "Sản phẩm ID {} không đủ tồn kho (còn {})",
                    item.product_id, stock
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

        // Cập nhật tổng mua & công nợ khách hàng (phần chưa thanh toán).
        if let Some(cid) = input.customer_id {
            let remaining = total_amount - input.amount_paid;
            tx.execute(
                "UPDATE customers SET total_spent = total_spent + ?1, debt = debt + ?2, updated_at = datetime('now', 'localtime') WHERE id = ?3",
                params![total_amount, remaining, cid],
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
        let receipts = {
            let mut stmt = conn.prepare(
                "SELECT id, receipt_number, date, customer, note, total_amount, created_at
                 FROM export_receipts ORDER BY date DESC, id DESC",
            )?;

            let rows = stmt
                .query_map([], |row| {
                    Ok((
                        row.get::<_, i64>(0)?,
                        row.get::<_, String>(1)?,
                        row.get::<_, String>(2)?,
                        row.get::<_, Option<String>>(3)?,
                        row.get::<_, Option<String>>(4)?,
                        row.get::<_, f64>(5)?,
                        row.get::<_, String>(6)?,
                    ))
                })?
                .collect::<SqlResult<Vec<_>>>()?;
            rows
        };

        drop(conn);
        let mut result = Vec::new();
        for (id, receipt_number, date, customer, note, total_amount, created_at) in receipts {
            let mut receipt = self.get_export_receipt(id)?;
            receipt.receipt_number = receipt_number;
            receipt.date = date;
            receipt.customer = customer;
            receipt.note = note;
            receipt.total_amount = total_amount;
            receipt.created_at = created_at;
            result.push(receipt);
        }
        Ok(result)
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

    pub fn get_dashboard_stats(&self) -> SqlResult<DashboardStats> {
        let conn = self.conn.lock().unwrap();
        let total_products: i64 = conn.query_row(
            "SELECT COUNT(*) FROM products",
            [],
            |row| row.get(0),
        )?;
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
        let profit_month: f64 = conn.query_row(
            "SELECT COALESCE(SUM(ei.total_price - ei.quantity * ei.cost_price), 0)
             FROM export_items ei
             JOIN export_receipts er ON er.id = ei.receipt_id
             WHERE strftime('%Y-%m', er.date) = strftime('%Y-%m', 'now', 'localtime')",
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
        let mut stmt = conn.prepare(
            "SELECT ei.product_id, p.code, p.name,
                    SUM(ei.quantity) AS qty,
                    SUM(ei.total_price) AS revenue,
                    SUM(ei.quantity * ei.cost_price) AS cost
             FROM export_items ei
             JOIN export_receipts er ON er.id = ei.receipt_id
             JOIN products p ON p.id = ei.product_id
             WHERE er.date BETWEEN ?1 AND ?2
             GROUP BY ei.product_id, p.code, p.name
             ORDER BY (SUM(ei.total_price) - SUM(ei.quantity * ei.cost_price)) DESC",
        )?;

        let by_product = stmt
            .query_map(params![from, to], |row| {
                let revenue: f64 = row.get(4)?;
                let cost: f64 = row.get(5)?;
                let profit = revenue - cost;
                let margin_percent = if revenue > 0.0 { profit / revenue * 100.0 } else { 0.0 };
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
                        WHEN 'export' THEN er.receipt_number
                    END AS receipt_number,
                    ih.created_at
             FROM inventory_history ih
             JOIN products p ON p.id = ih.product_id
             LEFT JOIN import_receipts ir ON ih.movement_type = 'import' AND ir.id = ih.reference_id
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