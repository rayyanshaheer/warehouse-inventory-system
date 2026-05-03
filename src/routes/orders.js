import { Router } from 'express';
import { query, withTransaction } from '../db.js';
import {
  AppError,
  asyncHandler,
  cleanString,
  requireFields,
  requireItems,
  toDecimal,
  toInt,
  todayIsoDate
} from '../utils.js';

export const ordersRouter = Router();

async function executeRows(db, sql, params = []) {
  const result = await db.execute(sql, params);
  return Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result;
}

async function fetchPurchaseOrder(db, purchaseOrderId) {
  const [order] = await executeRows(db, `
    SELECT
      po.purchase_order_id,
      po.supplier_id,
      s.supplier_name,
      po.created_by,
      u.full_name AS created_by_name,
      po.order_date,
      po.expected_date,
      po.status,
      po.notes,
      po.created_at,
      COALESCE(totals.item_count, 0) AS item_count,
      COALESCE(totals.total_cost, 0) AS total_cost,
      COALESCE(totals.total_ordered, 0) AS total_ordered,
      COALESCE(totals.total_received, 0) AS total_received
    FROM purchase_orders po
    JOIN suppliers s ON s.supplier_id = po.supplier_id
    JOIN users u ON u.user_id = po.created_by
    LEFT JOIN (
      SELECT
        purchase_order_id,
        COUNT(*) AS item_count,
        SUM(quantity_ordered * unit_cost) AS total_cost,
        SUM(quantity_ordered) AS total_ordered,
        SUM(quantity_received) AS total_received
      FROM purchase_order_items
      GROUP BY purchase_order_id
    ) totals ON totals.purchase_order_id = po.purchase_order_id
    WHERE po.purchase_order_id = ?
  `, [purchaseOrderId]);

  if (!order) {
    return null;
  }

  const items = await executeRows(db, `
    SELECT
      poi.purchase_order_item_id,
      poi.product_id,
      p.sku,
      p.product_name,
      poi.quantity_ordered,
      poi.quantity_received,
      poi.unit_cost,
      (poi.quantity_ordered * poi.unit_cost) AS line_total
    FROM purchase_order_items poi
    JOIN products p ON p.product_id = poi.product_id
    WHERE poi.purchase_order_id = ?
    ORDER BY p.product_name
  `, [purchaseOrderId]);

  return { ...order, items };
}

async function fetchSalesOrder(db, salesOrderId) {
  const [order] = await executeRows(db, `
    SELECT
      so.sales_order_id,
      so.created_by,
      u.full_name AS created_by_name,
      so.destination,
      so.order_date,
      so.status,
      so.notes,
      so.created_at,
      COALESCE(totals.item_count, 0) AS item_count,
      COALESCE(totals.total_value, 0) AS total_value,
      COALESCE(totals.total_requested, 0) AS total_requested
    FROM sales_orders so
    JOIN users u ON u.user_id = so.created_by
    LEFT JOIN (
      SELECT
        sales_order_id,
        COUNT(*) AS item_count,
        SUM(quantity_requested * unit_price) AS total_value,
        SUM(quantity_requested) AS total_requested
      FROM sales_order_items
      GROUP BY sales_order_id
    ) totals ON totals.sales_order_id = so.sales_order_id
    WHERE so.sales_order_id = ?
  `, [salesOrderId]);

  if (!order) {
    return null;
  }

  const items = await executeRows(db, `
    SELECT
      soi.sales_order_item_id,
      soi.product_id,
      p.sku,
      p.product_name,
      soi.quantity_requested,
      soi.unit_price,
      (soi.quantity_requested * soi.unit_price) AS line_total,
      i.quantity_on_hand
    FROM sales_order_items soi
    JOIN products p ON p.product_id = soi.product_id
    JOIN inventory i ON i.product_id = soi.product_id
    WHERE soi.sales_order_id = ?
    ORDER BY p.product_name
  `, [salesOrderId]);

  return { ...order, items };
}

ordersRouter.get('/purchase-orders', asyncHandler(async (req, res) => {
  const orders = await query(`
    SELECT
      po.purchase_order_id,
      s.supplier_name,
      u.full_name AS created_by_name,
      po.order_date,
      po.expected_date,
      po.status,
      po.notes,
      po.created_at,
      COALESCE(totals.item_count, 0) AS item_count,
      COALESCE(totals.total_cost, 0) AS total_cost,
      COALESCE(totals.total_ordered, 0) AS total_ordered,
      COALESCE(totals.total_received, 0) AS total_received
    FROM purchase_orders po
    JOIN suppliers s ON s.supplier_id = po.supplier_id
    JOIN users u ON u.user_id = po.created_by
    LEFT JOIN (
      SELECT
        purchase_order_id,
        COUNT(*) AS item_count,
        SUM(quantity_ordered * unit_cost) AS total_cost,
        SUM(quantity_ordered) AS total_ordered,
        SUM(quantity_received) AS total_received
      FROM purchase_order_items
      GROUP BY purchase_order_id
    ) totals ON totals.purchase_order_id = po.purchase_order_id
    ORDER BY po.created_at DESC, po.purchase_order_id DESC
  `);

  res.json({ data: orders });
}));

ordersRouter.get('/purchase-orders/:id', asyncHandler(async (req, res) => {
  const order = await fetchPurchaseOrder({ execute: query }, toInt(req.params.id, 'purchase_order_id', { min: 1 }));

  if (!order) {
    throw new AppError('Purchase order not found', 404);
  }

  res.json({ data: order });
}));

ordersRouter.post('/purchase-orders', asyncHandler(async (req, res) => {
  requireFields(req.body, ['supplier_id', 'created_by']);
  requireItems(req.body.items, 'purchase order items');

  const items = req.body.items.map((item, index) => ({
    product_id: toInt(item.product_id, `items[${index}].product_id`, { min: 1 }),
    quantity_ordered: toInt(item.quantity_ordered, `items[${index}].quantity_ordered`, { min: 1 }),
    unit_cost: toDecimal(item.unit_cost, `items[${index}].unit_cost`, { min: 0 })
  }));

  const order = await withTransaction(async (connection) => {
    const [result] = await connection.execute(`
      INSERT INTO purchase_orders (
        supplier_id,
        created_by,
        order_date,
        expected_date,
        notes
      )
      VALUES (?, ?, ?, ?, ?)
    `, [
      toInt(req.body.supplier_id, 'supplier_id', { min: 1 }),
      toInt(req.body.created_by, 'created_by', { min: 1 }),
      cleanString(req.body.order_date, todayIsoDate()),
      cleanString(req.body.expected_date),
      cleanString(req.body.notes)
    ]);

    const purchaseOrderId = result.insertId;

    for (const item of items) {
      await connection.execute(`
        INSERT INTO purchase_order_items (
          purchase_order_id,
          product_id,
          quantity_ordered,
          unit_cost
        )
        VALUES (?, ?, ?, ?)
      `, [
        purchaseOrderId,
        item.product_id,
        item.quantity_ordered,
        item.unit_cost
      ]);
    }

    return fetchPurchaseOrder(connection, purchaseOrderId);
  });

  res.status(201).json({ data: order });
}));

ordersRouter.post('/purchase-orders/:id/receive', asyncHandler(async (req, res) => {
  const purchaseOrderId = toInt(req.params.id, 'purchase_order_id', { min: 1 });
  const performedBy = req.body.performed_by === undefined || req.body.performed_by === ''
    ? 1
    : toInt(req.body.performed_by, 'performed_by', { min: 1 });
  const receiptRows = Array.isArray(req.body.items) ? req.body.items : null;
  const receiptByItemId = new Map();
  const receiptByProductId = new Map();

  if (receiptRows) {
    for (const row of receiptRows) {
      const receiveQuantity = toInt(row.quantity_received, 'quantity_received', { min: 0 });

      if (row.purchase_order_item_id) {
        receiptByItemId.set(toInt(row.purchase_order_item_id, 'purchase_order_item_id', { min: 1 }), receiveQuantity);
      } else if (row.product_id) {
        receiptByProductId.set(toInt(row.product_id, 'product_id', { min: 1 }), receiveQuantity);
      } else {
        throw new AppError('Each receipt item needs purchase_order_item_id or product_id');
      }
    }
  }

  const order = await withTransaction(async (connection) => {
    const [[purchaseOrder]] = await connection.execute(`
      SELECT purchase_order_id, status
      FROM purchase_orders
      WHERE purchase_order_id = ?
      FOR UPDATE
    `, [purchaseOrderId]);

    if (!purchaseOrder) {
      throw new AppError('Purchase order not found', 404);
    }

    if (purchaseOrder.status === 'CANCELLED' || purchaseOrder.status === 'RECEIVED') {
      throw new AppError(`Purchase order cannot be received while status is ${purchaseOrder.status}`, 409);
    }

    const [items] = await connection.execute(`
      SELECT
        poi.purchase_order_item_id,
        poi.product_id,
        p.sku,
        p.product_name,
        poi.quantity_ordered,
        poi.quantity_received
      FROM purchase_order_items poi
      JOIN products p ON p.product_id = poi.product_id
      WHERE poi.purchase_order_id = ?
      FOR UPDATE
    `, [purchaseOrderId]);

    let receivedLines = 0;

    for (const item of items) {
      const remaining = item.quantity_ordered - item.quantity_received;
      let receiveQuantity = remaining;

      if (receiptRows) {
        if (receiptByItemId.has(item.purchase_order_item_id)) {
          receiveQuantity = receiptByItemId.get(item.purchase_order_item_id);
        } else if (receiptByProductId.has(item.product_id)) {
          receiveQuantity = receiptByProductId.get(item.product_id);
        } else {
          receiveQuantity = 0;
        }
      }

      if (receiveQuantity === 0) {
        continue;
      }

      if (receiveQuantity > remaining) {
        throw new AppError(`Cannot receive more than remaining quantity for ${item.sku}`, 409, {
          product_id: item.product_id,
          remaining_quantity: remaining,
          requested_quantity: receiveQuantity
        });
      }

      await connection.execute(`
        SELECT quantity_on_hand
        FROM inventory
        WHERE product_id = ?
        FOR UPDATE
      `, [item.product_id]);

      await connection.execute(`
        UPDATE purchase_order_items
        SET quantity_received = quantity_received + ?
        WHERE purchase_order_item_id = ?
      `, [receiveQuantity, item.purchase_order_item_id]);

      await connection.execute(`
        UPDATE inventory
        SET quantity_on_hand = quantity_on_hand + ?
        WHERE product_id = ?
      `, [receiveQuantity, item.product_id]);

      await connection.execute(`
        INSERT INTO inventory_transactions (
          product_id,
          purchase_order_id,
          performed_by,
          transaction_type,
          quantity,
          notes
        )
        VALUES (?, ?, ?, 'IN', ?, ?)
      `, [
        item.product_id,
        purchaseOrderId,
        performedBy,
        receiveQuantity,
        cleanString(req.body.notes, `Received stock for purchase order ${purchaseOrderId}`)
      ]);

      receivedLines += 1;
    }

    if (receivedLines === 0) {
      throw new AppError('No receivable quantity was provided', 400);
    }

    const [freshItems] = await connection.execute(`
      SELECT quantity_ordered, quantity_received
      FROM purchase_order_items
      WHERE purchase_order_id = ?
    `, [purchaseOrderId]);

    const totalOrdered = freshItems.reduce((sum, item) => sum + item.quantity_ordered, 0);
    const totalReceived = freshItems.reduce((sum, item) => sum + item.quantity_received, 0);
    const nextStatus = totalReceived >= totalOrdered ? 'RECEIVED' : 'PARTIALLY_RECEIVED';

    await connection.execute(`
      UPDATE purchase_orders
      SET status = ?
      WHERE purchase_order_id = ?
    `, [nextStatus, purchaseOrderId]);

    return fetchPurchaseOrder(connection, purchaseOrderId);
  });

  res.json({ data: order });
}));

ordersRouter.get('/sales-orders', asyncHandler(async (req, res) => {
  const orders = await query(`
    SELECT
      so.sales_order_id,
      u.full_name AS created_by_name,
      so.destination,
      so.order_date,
      so.status,
      so.notes,
      so.created_at,
      COALESCE(totals.item_count, 0) AS item_count,
      COALESCE(totals.total_value, 0) AS total_value,
      COALESCE(totals.total_requested, 0) AS total_requested
    FROM sales_orders so
    JOIN users u ON u.user_id = so.created_by
    LEFT JOIN (
      SELECT
        sales_order_id,
        COUNT(*) AS item_count,
        SUM(quantity_requested * unit_price) AS total_value,
        SUM(quantity_requested) AS total_requested
      FROM sales_order_items
      GROUP BY sales_order_id
    ) totals ON totals.sales_order_id = so.sales_order_id
    ORDER BY so.created_at DESC, so.sales_order_id DESC
  `);

  res.json({ data: orders });
}));

ordersRouter.get('/sales-orders/:id', asyncHandler(async (req, res) => {
  const order = await fetchSalesOrder({ execute: query }, toInt(req.params.id, 'sales_order_id', { min: 1 }));

  if (!order) {
    throw new AppError('Sales order not found', 404);
  }

  res.json({ data: order });
}));

ordersRouter.post('/sales-orders', asyncHandler(async (req, res) => {
  requireFields(req.body, ['created_by', 'destination']);
  requireItems(req.body.items, 'sales order items');

  const items = req.body.items.map((item, index) => ({
    product_id: toInt(item.product_id, `items[${index}].product_id`, { min: 1 }),
    quantity_requested: toInt(item.quantity_requested, `items[${index}].quantity_requested`, { min: 1 }),
    unit_price: toDecimal(item.unit_price, `items[${index}].unit_price`, { min: 0 })
  }));

  const order = await withTransaction(async (connection) => {
    const [result] = await connection.execute(`
      INSERT INTO sales_orders (
        created_by,
        destination,
        order_date,
        notes
      )
      VALUES (?, ?, ?, ?)
    `, [
      toInt(req.body.created_by, 'created_by', { min: 1 }),
      cleanString(req.body.destination),
      cleanString(req.body.order_date, todayIsoDate()),
      cleanString(req.body.notes)
    ]);

    const salesOrderId = result.insertId;

    for (const item of items) {
      await connection.execute(`
        INSERT INTO sales_order_items (
          sales_order_id,
          product_id,
          quantity_requested,
          unit_price
        )
        VALUES (?, ?, ?, ?)
      `, [
        salesOrderId,
        item.product_id,
        item.quantity_requested,
        item.unit_price
      ]);
    }

    return fetchSalesOrder(connection, salesOrderId);
  });

  res.status(201).json({ data: order });
}));

ordersRouter.post('/sales-orders/:id/fulfill', asyncHandler(async (req, res) => {
  const salesOrderId = toInt(req.params.id, 'sales_order_id', { min: 1 });
  const performedBy = req.body.performed_by === undefined || req.body.performed_by === ''
    ? 1
    : toInt(req.body.performed_by, 'performed_by', { min: 1 });

  const order = await withTransaction(async (connection) => {
    const [[salesOrder]] = await connection.execute(`
      SELECT sales_order_id, status
      FROM sales_orders
      WHERE sales_order_id = ?
      FOR UPDATE
    `, [salesOrderId]);

    if (!salesOrder) {
      throw new AppError('Sales order not found', 404);
    }

    if (salesOrder.status !== 'PENDING') {
      throw new AppError(`Sales order cannot be fulfilled while status is ${salesOrder.status}`, 409);
    }

    const [items] = await connection.execute(`
      SELECT
        soi.sales_order_item_id,
        soi.product_id,
        p.sku,
        p.product_name,
        soi.quantity_requested
      FROM sales_order_items soi
      JOIN products p ON p.product_id = soi.product_id
      WHERE soi.sales_order_id = ?
      FOR UPDATE
    `, [salesOrderId]);

    for (const item of items) {
      const [[stock]] = await connection.execute(`
        SELECT quantity_on_hand
        FROM inventory
        WHERE product_id = ?
        FOR UPDATE
      `, [item.product_id]);

      if (!stock || stock.quantity_on_hand < item.quantity_requested) {
        throw new AppError(`Insufficient stock for ${item.sku} - ${item.product_name}`, 409, {
          product_id: item.product_id,
          quantity_on_hand: stock ? stock.quantity_on_hand : 0,
          requested_quantity: item.quantity_requested
        });
      }
    }

    for (const item of items) {
      await connection.execute(`
        UPDATE inventory
        SET quantity_on_hand = quantity_on_hand - ?
        WHERE product_id = ?
      `, [item.quantity_requested, item.product_id]);

      await connection.execute(`
        INSERT INTO inventory_transactions (
          product_id,
          sales_order_id,
          performed_by,
          transaction_type,
          quantity,
          notes
        )
        VALUES (?, ?, ?, 'OUT', ?, ?)
      `, [
        item.product_id,
        salesOrderId,
        performedBy,
        item.quantity_requested,
        cleanString(req.body.notes, `Fulfilled sales order ${salesOrderId}`)
      ]);
    }

    await connection.execute(`
      UPDATE sales_orders
      SET status = 'FULFILLED'
      WHERE sales_order_id = ?
    `, [salesOrderId]);

    return fetchSalesOrder(connection, salesOrderId);
  });

  res.json({ data: order });
}));
