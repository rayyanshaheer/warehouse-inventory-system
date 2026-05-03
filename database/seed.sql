USE warehouse_inventory_system;

INSERT INTO roles (role_id, role_name, description) VALUES
  (1, 'Admin', 'Full access to all warehouse inventory modules'),
  (2, 'Warehouse Manager', 'Manages stock, receiving, fulfillment, and reports'),
  (3, 'Staff', 'Creates orders and records day-to-day warehouse actions')
ON DUPLICATE KEY UPDATE
  role_name = VALUES(role_name),
  description = VALUES(description);

INSERT INTO users (user_id, full_name, email, phone, password_hash, role_id, is_active) VALUES
  (1, 'Rayyan Shaheer', 'rayyan.warehouse@example.com', '+92-300-5550101', '$2y$10$demoHashForPresentationOnlyRayyan', 1, TRUE),
  (2, 'Abdul Raheem', 'abdul.manager@example.com', '+92-300-5550102', '$2y$10$demoHashForPresentationOnlyAbdul', 2, TRUE),
  (3, 'Maira Khan', 'maira.staff@example.com', '+92-300-5550103', '$2y$10$demoHashForPresentationOnlyMaira', 3, TRUE)
ON DUPLICATE KEY UPDATE
  full_name = VALUES(full_name),
  phone = VALUES(phone),
  password_hash = VALUES(password_hash),
  role_id = VALUES(role_id),
  is_active = VALUES(is_active);

INSERT INTO suppliers (supplier_id, supplier_name, contact_person, phone, email, address, is_active) VALUES
  (1, 'Pak Industrial Supplies', 'Hassan Ali', '+92-21-111-200-300', 'orders@pakindustrial.example', 'SITE Area, Karachi', TRUE),
  (2, 'Metro Packaging Co.', 'Ayesha Malik', '+92-42-555-2020', 'sales@metropackaging.example', 'Industrial Estate, Lahore', TRUE),
  (3, 'North Star Safety Gear', 'Bilal Ahmed', '+92-51-555-3030', 'support@northstarsafety.example', 'I-9 Sector, Islamabad', TRUE),
  (4, 'Swift Logistics Tools', 'Nadia Farooq', '+92-21-555-4040', 'team@swiftlogtools.example', 'Korangi Creek, Karachi', TRUE)
ON DUPLICATE KEY UPDATE
  supplier_name = VALUES(supplier_name),
  contact_person = VALUES(contact_person),
  phone = VALUES(phone),
  address = VALUES(address),
  is_active = VALUES(is_active);

INSERT INTO categories (category_id, category_name, description) VALUES
  (1, 'Packaging', 'Boxes, wraps, tape, labels, and packing support material'),
  (2, 'Handling Equipment', 'Tools and equipment used to move warehouse stock'),
  (3, 'Safety Supplies', 'Protective gear and compliance supplies'),
  (4, 'Electronics', 'Scanning and warehouse technology assets')
ON DUPLICATE KEY UPDATE
  category_name = VALUES(category_name),
  description = VALUES(description);

INSERT INTO products (
  product_id,
  sku,
  product_name,
  category_id,
  primary_supplier_id,
  unit_of_measure,
  unit_price,
  reorder_level,
  is_active
) VALUES
  (1, 'PAL-IND-001', 'Industrial Wooden Pallet', 2, 1, 'pcs', 1650.00, 30, TRUE),
  (2, 'BOX-COR-010', 'Corrugated Box 10x10', 1, 2, 'pcs', 85.00, 200, TRUE),
  (3, 'TAPE-HD-002', 'Heavy Duty Packing Tape', 1, 2, 'roll', 290.00, 75, TRUE),
  (4, 'SCAN-RF-100', 'RF Barcode Scanner', 4, 4, 'pcs', 18500.00, 8, TRUE),
  (5, 'GLOVE-NIT-M', 'Nitrile Gloves Medium', 3, 3, 'box', 1450.00, 100, TRUE),
  (6, 'WRAP-ST-500', 'Stretch Wrap Roll 500m', 1, 2, 'roll', 1350.00, 40, TRUE),
  (7, 'LABEL-THE-004', 'Thermal Shipping Label 4x6', 1, 2, 'roll', 750.00, 250, TRUE),
  (8, 'VEST-SAF-YL', 'Reflective Safety Vest Yellow', 3, 3, 'pcs', 980.00, 15, TRUE)
ON DUPLICATE KEY UPDATE
  product_name = VALUES(product_name),
  category_id = VALUES(category_id),
  primary_supplier_id = VALUES(primary_supplier_id),
  unit_of_measure = VALUES(unit_of_measure),
  unit_price = VALUES(unit_price),
  reorder_level = VALUES(reorder_level),
  is_active = VALUES(is_active);

INSERT INTO inventory (product_id, quantity_on_hand) VALUES
  (1, 120),
  (2, 850),
  (3, 62),
  (4, 14),
  (5, 95),
  (6, 38),
  (7, 420),
  (8, 16)
ON DUPLICATE KEY UPDATE
  quantity_on_hand = VALUES(quantity_on_hand);

INSERT INTO purchase_orders (
  purchase_order_id,
  supplier_id,
  created_by,
  order_date,
  expected_date,
  status,
  notes
) VALUES
  (1, 2, 2, '2026-04-11', '2026-04-16', 'RECEIVED', 'Monthly packaging replenishment'),
  (2, 3, 2, '2026-04-22', '2026-05-08', 'PENDING', 'Safety stock for new shift team'),
  (3, 4, 1, '2026-04-26', '2026-05-05', 'PARTIALLY_RECEIVED', 'Scanner refresh order')
ON DUPLICATE KEY UPDATE
  supplier_id = VALUES(supplier_id),
  created_by = VALUES(created_by),
  order_date = VALUES(order_date),
  expected_date = VALUES(expected_date),
  status = VALUES(status),
  notes = VALUES(notes);

INSERT INTO purchase_order_items (
  purchase_order_item_id,
  purchase_order_id,
  product_id,
  quantity_ordered,
  quantity_received,
  unit_cost
) VALUES
  (1, 1, 2, 500, 500, 70.00),
  (2, 1, 3, 120, 120, 240.00),
  (3, 1, 6, 60, 60, 1120.00),
  (4, 2, 5, 180, 0, 1200.00),
  (5, 2, 8, 35, 0, 800.00),
  (6, 3, 4, 10, 4, 16100.00)
ON DUPLICATE KEY UPDATE
  quantity_ordered = VALUES(quantity_ordered),
  quantity_received = VALUES(quantity_received),
  unit_cost = VALUES(unit_cost);

INSERT INTO sales_orders (
  sales_order_id,
  created_by,
  destination,
  order_date,
  status,
  notes
) VALUES
  (1, 3, 'Karachi Retail Dispatch Dock', '2026-04-18', 'FULFILLED', 'Packed and dispatched to retail channel'),
  (2, 2, 'Lahore Distribution Center', '2026-04-29', 'PENDING', 'Awaiting final stock allocation'),
  (3, 3, 'Islamabad Corporate Client', '2026-05-01', 'PENDING', 'Priority fulfillment requested')
ON DUPLICATE KEY UPDATE
  created_by = VALUES(created_by),
  destination = VALUES(destination),
  order_date = VALUES(order_date),
  status = VALUES(status),
  notes = VALUES(notes);

INSERT INTO sales_order_items (
  sales_order_item_id,
  sales_order_id,
  product_id,
  quantity_requested,
  unit_price
) VALUES
  (1, 1, 2, 120, 85.00),
  (2, 1, 7, 80, 750.00),
  (3, 2, 1, 45, 1650.00),
  (4, 2, 3, 90, 290.00),
  (5, 3, 5, 110, 1450.00),
  (6, 3, 6, 25, 1350.00)
ON DUPLICATE KEY UPDATE
  quantity_requested = VALUES(quantity_requested),
  unit_price = VALUES(unit_price);

INSERT INTO inventory_transactions (
  transaction_id,
  product_id,
  purchase_order_id,
  sales_order_id,
  performed_by,
  transaction_type,
  quantity,
  transaction_time,
  notes
) VALUES
  (1, 2, 1, NULL, 2, 'IN', 500, '2026-04-16 10:15:00', 'Received boxes from purchase order 1'),
  (2, 3, 1, NULL, 2, 'IN', 120, '2026-04-16 10:21:00', 'Received packing tape from purchase order 1'),
  (3, 6, 1, NULL, 2, 'IN', 60, '2026-04-16 10:27:00', 'Received stretch wrap from purchase order 1'),
  (4, 2, NULL, 1, 3, 'OUT', 120, '2026-04-18 15:35:00', 'Fulfilled sales order 1'),
  (5, 7, NULL, 1, 3, 'OUT', 80, '2026-04-18 15:40:00', 'Fulfilled sales order 1'),
  (6, 4, 3, NULL, 1, 'IN', 4, '2026-04-30 09:10:00', 'Partial scanner delivery'),
  (7, 5, NULL, NULL, 2, 'ADJUSTMENT', 5, '2026-05-01 11:20:00', 'Cycle count correction')
ON DUPLICATE KEY UPDATE
  product_id = VALUES(product_id),
  purchase_order_id = VALUES(purchase_order_id),
  sales_order_id = VALUES(sales_order_id),
  performed_by = VALUES(performed_by),
  transaction_type = VALUES(transaction_type),
  quantity = VALUES(quantity),
  transaction_time = VALUES(transaction_time),
  notes = VALUES(notes);

