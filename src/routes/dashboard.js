import { Router } from 'express';
import { query } from '../db.js';
import { asyncHandler, normalizeLimit } from '../utils.js';

export const dashboardRouter = Router();

dashboardRouter.get('/dashboard', asyncHandler(async (req, res) => {
  const [summary] = await query(`
    SELECT
      (SELECT COUNT(*) FROM products WHERE is_active = TRUE) AS active_products,
      (SELECT COUNT(*) FROM suppliers WHERE is_active = TRUE) AS active_suppliers,
      (SELECT COALESCE(SUM(quantity_on_hand), 0) FROM inventory) AS total_units,
      (
        SELECT COALESCE(SUM(i.quantity_on_hand * p.unit_price), 0)
        FROM inventory i
        JOIN products p ON p.product_id = i.product_id
      ) AS inventory_value,
      (SELECT COUNT(*) FROM low_stock_report) AS low_stock_count,
      (
        SELECT COUNT(*)
        FROM purchase_orders
        WHERE status IN ('PENDING', 'PARTIALLY_RECEIVED')
      ) AS open_purchase_orders,
      (
        SELECT COUNT(*)
        FROM sales_orders
        WHERE status = 'PENDING'
      ) AS open_sales_orders
  `);

  const lowStock = await query(`
    SELECT
      product_id,
      sku,
      product_name,
      category_name,
      quantity_on_hand,
      reorder_level,
      shortage_quantity
    FROM low_stock_report
    ORDER BY shortage_quantity DESC, product_name
    LIMIT 8
  `);

  const recentTransactions = await query(`
    SELECT
      it.transaction_id,
      it.transaction_type,
      it.quantity,
      it.transaction_time,
      it.notes,
      p.sku,
      p.product_name,
      u.full_name AS performed_by_name
    FROM inventory_transactions it
    JOIN products p ON p.product_id = it.product_id
    JOIN users u ON u.user_id = it.performed_by
    ORDER BY it.transaction_time DESC, it.transaction_id DESC
    LIMIT 8
  `);

  res.json({
    data: {
      summary,
      lowStock,
      recentTransactions
    }
  });
}));

dashboardRouter.get('/transactions', asyncHandler(async (req, res) => {
  const limit = normalizeLimit(req.query.limit, 30, 100);

  const transactions = await query(`
    SELECT
      it.transaction_id,
      it.transaction_type,
      it.quantity,
      it.transaction_time,
      it.notes,
      it.purchase_order_id,
      it.sales_order_id,
      p.sku,
      p.product_name,
      u.full_name AS performed_by_name
    FROM inventory_transactions it
    JOIN products p ON p.product_id = it.product_id
    JOIN users u ON u.user_id = it.performed_by
    ORDER BY it.transaction_time DESC, it.transaction_id DESC
    LIMIT ${limit}
  `);

  res.json({ data: transactions });
}));

dashboardRouter.get('/inventory/low-stock', asyncHandler(async (req, res) => {
  const rows = await query(`
    SELECT
      product_id,
      sku,
      product_name,
      category_name,
      quantity_on_hand,
      reorder_level,
      shortage_quantity
    FROM low_stock_report
    ORDER BY shortage_quantity DESC, product_name
  `);

  res.json({ data: rows });
}));

