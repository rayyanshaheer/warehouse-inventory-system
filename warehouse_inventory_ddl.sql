-- Group Number: 17
-- Project Title: Inventory Management System for Warehouse
-- Members: Rayyan Shaheer (23P-0557), Abdul Raheem (23P-0591)

DROP DATABASE IF EXISTS warehouse_inventory_system;
CREATE DATABASE warehouse_inventory_system
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE warehouse_inventory_system;

CREATE TABLE roles (
    role_id INT AUTO_INCREMENT PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL,
    description VARCHAR(255),
    CONSTRAINT uq_roles_role_name UNIQUE (role_name)
) ENGINE=InnoDB;

CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(120) NOT NULL,
    phone VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    role_id INT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_users_email UNIQUE (email),
    CONSTRAINT fk_users_role
        FOREIGN KEY (role_id) REFERENCES roles(role_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE suppliers (
    supplier_id INT AUTO_INCREMENT PRIMARY KEY,
    supplier_name VARCHAR(120) NOT NULL,
    contact_person VARCHAR(120),
    phone VARCHAR(20),
    email VARCHAR(120),
    address VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_suppliers_email UNIQUE (email)
) ENGINE=InnoDB;

CREATE TABLE categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    CONSTRAINT uq_categories_name UNIQUE (category_name)
) ENGINE=InnoDB;

CREATE TABLE products (
    product_id INT AUTO_INCREMENT PRIMARY KEY,
    sku VARCHAR(40) NOT NULL,
    product_name VARCHAR(150) NOT NULL,
    category_id INT NOT NULL,
    primary_supplier_id INT,
    unit_of_measure VARCHAR(20) NOT NULL DEFAULT 'pcs',
    unit_price DECIMAL(10, 2) NOT NULL,
    reorder_level INT NOT NULL DEFAULT 10,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_products_sku UNIQUE (sku),
    CONSTRAINT chk_products_unit_price CHECK (unit_price >= 0),
    CONSTRAINT chk_products_reorder_level CHECK (reorder_level >= 0),
    CONSTRAINT fk_products_category
        FOREIGN KEY (category_id) REFERENCES categories(category_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_products_primary_supplier
        FOREIGN KEY (primary_supplier_id) REFERENCES suppliers(supplier_id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE inventory (
    product_id INT PRIMARY KEY,
    quantity_on_hand INT NOT NULL DEFAULT 0,
    last_updated DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_inventory_quantity CHECK (quantity_on_hand >= 0),
    CONSTRAINT fk_inventory_product
        FOREIGN KEY (product_id) REFERENCES products(product_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE purchase_orders (
    purchase_order_id INT AUTO_INCREMENT PRIMARY KEY,
    supplier_id INT NOT NULL,
    created_by INT NOT NULL,
    order_date DATE NOT NULL,
    expected_date DATE,
    status ENUM('PENDING', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED')
        NOT NULL DEFAULT 'PENDING',
    notes VARCHAR(255),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_purchase_orders_supplier
        FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_purchase_orders_created_by
        FOREIGN KEY (created_by) REFERENCES users(user_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE purchase_order_items (
    purchase_order_item_id INT AUTO_INCREMENT PRIMARY KEY,
    purchase_order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity_ordered INT NOT NULL,
    quantity_received INT NOT NULL DEFAULT 0,
    unit_cost DECIMAL(10, 2) NOT NULL,
    CONSTRAINT chk_poi_quantity_ordered CHECK (quantity_ordered > 0),
    CONSTRAINT chk_poi_quantity_received CHECK (quantity_received >= 0),
    CONSTRAINT chk_poi_quantity_consistency CHECK (quantity_received <= quantity_ordered),
    CONSTRAINT chk_poi_unit_cost CHECK (unit_cost >= 0),
    CONSTRAINT uq_purchase_order_product UNIQUE (purchase_order_id, product_id),
    CONSTRAINT fk_purchase_order_items_order
        FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(purchase_order_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT fk_purchase_order_items_product
        FOREIGN KEY (product_id) REFERENCES products(product_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE sales_orders (
    sales_order_id INT AUTO_INCREMENT PRIMARY KEY,
    created_by INT NOT NULL,
    destination VARCHAR(120) NOT NULL,
    order_date DATE NOT NULL,
    status ENUM('PENDING', 'FULFILLED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    notes VARCHAR(255),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sales_orders_created_by
        FOREIGN KEY (created_by) REFERENCES users(user_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE sales_order_items (
    sales_order_item_id INT AUTO_INCREMENT PRIMARY KEY,
    sales_order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity_requested INT NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    CONSTRAINT chk_soi_quantity_requested CHECK (quantity_requested > 0),
    CONSTRAINT chk_soi_unit_price CHECK (unit_price >= 0),
    CONSTRAINT uq_sales_order_product UNIQUE (sales_order_id, product_id),
    CONSTRAINT fk_sales_order_items_order
        FOREIGN KEY (sales_order_id) REFERENCES sales_orders(sales_order_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT fk_sales_order_items_product
        FOREIGN KEY (product_id) REFERENCES products(product_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE inventory_transactions (
    transaction_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    purchase_order_id INT,
    sales_order_id INT,
    performed_by INT NOT NULL,
    transaction_type ENUM('IN', 'OUT', 'ADJUSTMENT') NOT NULL,
    quantity INT NOT NULL,
    transaction_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notes VARCHAR(255),
    CONSTRAINT chk_inventory_txn_quantity CHECK (quantity > 0),
    CONSTRAINT chk_inventory_txn_source
        CHECK (NOT (purchase_order_id IS NOT NULL AND sales_order_id IS NOT NULL)),
    CONSTRAINT fk_inventory_transactions_product
        FOREIGN KEY (product_id) REFERENCES products(product_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_inventory_transactions_purchase_order
        FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(purchase_order_id)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,
    CONSTRAINT fk_inventory_transactions_sales_order
        FOREIGN KEY (sales_order_id) REFERENCES sales_orders(sales_order_id)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,
    CONSTRAINT fk_inventory_transactions_performed_by
        FOREIGN KEY (performed_by) REFERENCES users(user_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE INDEX idx_products_category_id ON products (category_id);
CREATE INDEX idx_products_supplier_id ON products (primary_supplier_id);
CREATE INDEX idx_purchase_orders_supplier ON purchase_orders (supplier_id);
CREATE INDEX idx_purchase_orders_created_by ON purchase_orders (created_by);
CREATE INDEX idx_sales_orders_created_by ON sales_orders (created_by);
CREATE INDEX idx_inventory_transactions_product ON inventory_transactions (product_id);
CREATE INDEX idx_inventory_transactions_time ON inventory_transactions (transaction_time);

CREATE OR REPLACE VIEW low_stock_report AS
SELECT
    p.product_id,
    p.sku,
    p.product_name,
    c.category_name,
    i.quantity_on_hand,
    p.reorder_level,
    (p.reorder_level - i.quantity_on_hand) AS shortage_quantity
FROM products p
JOIN categories c ON c.category_id = p.category_id
JOIN inventory i ON i.product_id = p.product_id
WHERE p.is_active = TRUE
  AND i.quantity_on_hand <= p.reorder_level;
