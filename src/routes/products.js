import { Router } from 'express';
import { query, withTransaction } from '../db.js';
import {
  AppError,
  asyncHandler,
  cleanString,
  requireFields,
  toDecimal,
  toInt
} from '../utils.js';

export const productsRouter = Router();

const productSelect = `
  SELECT
    p.product_id,
    p.sku,
    p.product_name,
    p.category_id,
    c.category_name,
    p.primary_supplier_id,
    s.supplier_name,
    p.unit_of_measure,
    p.unit_price,
    p.reorder_level,
    p.is_active,
    p.created_at,
    i.quantity_on_hand,
    (i.quantity_on_hand * p.unit_price) AS inventory_value,
    CASE WHEN i.quantity_on_hand <= p.reorder_level THEN TRUE ELSE FALSE END AS is_low_stock
  FROM products p
  JOIN categories c ON c.category_id = p.category_id
  LEFT JOIN suppliers s ON s.supplier_id = p.primary_supplier_id
  JOIN inventory i ON i.product_id = p.product_id
`;

async function fetchProduct(db, productId) {
  const [rows] = await db.execute(`${productSelect} WHERE p.product_id = ?`, [productId]);
  return rows[0] || null;
}

productsRouter.get('/products', asyncHandler(async (req, res) => {
  const search = cleanString(req.query.search);
  const params = [];
  let sql = productSelect;

  if (search) {
    sql += `
      WHERE (
        p.sku LIKE ?
        OR p.product_name LIKE ?
        OR c.category_name LIKE ?
        OR s.supplier_name LIKE ?
      )
    `;
    const like = `%${search}%`;
    params.push(like, like, like, like);
  }

  sql += ' ORDER BY p.is_active DESC, p.product_name';

  const products = await query(sql, params);
  res.json({ data: products });
}));

productsRouter.post('/products', asyncHandler(async (req, res) => {
  requireFields(req.body, ['sku', 'product_name', 'category_id', 'unit_price']);

  const openingStock = req.body.opening_stock === undefined || req.body.opening_stock === ''
    ? 0
    : toInt(req.body.opening_stock, 'opening_stock', { min: 0 });
  const performedBy = req.body.performed_by === undefined || req.body.performed_by === ''
    ? 1
    : toInt(req.body.performed_by, 'performed_by', { min: 1 });

  const product = await withTransaction(async (connection) => {
    const [result] = await connection.execute(`
      INSERT INTO products (
        sku,
        product_name,
        category_id,
        primary_supplier_id,
        unit_of_measure,
        unit_price,
        reorder_level,
        is_active
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      cleanString(req.body.sku),
      cleanString(req.body.product_name),
      toInt(req.body.category_id, 'category_id', { min: 1 }),
      req.body.primary_supplier_id ? toInt(req.body.primary_supplier_id, 'primary_supplier_id', { min: 1 }) : null,
      cleanString(req.body.unit_of_measure, 'pcs'),
      toDecimal(req.body.unit_price, 'unit_price', { min: 0 }),
      req.body.reorder_level === undefined || req.body.reorder_level === ''
        ? 10
        : toInt(req.body.reorder_level, 'reorder_level', { min: 0 }),
      req.body.is_active === false || req.body.is_active === 'false' ? 0 : 1
    ]);

    const productId = result.insertId;

    await connection.execute(`
      INSERT INTO inventory (product_id, quantity_on_hand)
      VALUES (?, ?)
    `, [productId, openingStock]);

    if (openingStock > 0) {
      await connection.execute(`
        INSERT INTO inventory_transactions (
          product_id,
          performed_by,
          transaction_type,
          quantity,
          notes
        )
        VALUES (?, ?, 'ADJUSTMENT', ?, ?)
      `, [productId, performedBy, openingStock, 'Opening stock for new product']);
    }

    return fetchProduct(connection, productId);
  });

  res.status(201).json({ data: product });
}));

productsRouter.put('/products/:id', asyncHandler(async (req, res) => {
  const productId = toInt(req.params.id, 'product_id', { min: 1 });
  requireFields(req.body, ['sku', 'product_name', 'category_id', 'unit_price']);

  const result = await query(`
    UPDATE products
    SET
      sku = ?,
      product_name = ?,
      category_id = ?,
      primary_supplier_id = ?,
      unit_of_measure = ?,
      unit_price = ?,
      reorder_level = ?,
      is_active = ?
    WHERE product_id = ?
  `, [
    cleanString(req.body.sku),
    cleanString(req.body.product_name),
    toInt(req.body.category_id, 'category_id', { min: 1 }),
    req.body.primary_supplier_id ? toInt(req.body.primary_supplier_id, 'primary_supplier_id', { min: 1 }) : null,
    cleanString(req.body.unit_of_measure, 'pcs'),
    toDecimal(req.body.unit_price, 'unit_price', { min: 0 }),
    req.body.reorder_level === undefined || req.body.reorder_level === ''
      ? 10
      : toInt(req.body.reorder_level, 'reorder_level', { min: 0 }),
    req.body.is_active === false || req.body.is_active === 'false' ? 0 : 1,
    productId
  ]);

  if (result.affectedRows === 0) {
    throw new AppError('Product not found', 404);
  }

  const product = await query(`${productSelect} WHERE p.product_id = ?`, [productId]);
  res.json({ data: product[0] });
}));

productsRouter.delete('/products/:id', asyncHandler(async (req, res) => {
  const productId = toInt(req.params.id, 'product_id', { min: 1 });

  await query(`
    UPDATE products
    SET is_active = FALSE
    WHERE product_id = ?
  `, [productId]);

  const product = await query(`${productSelect} WHERE p.product_id = ?`, [productId]);

  if (!product[0]) {
    throw new AppError('Product not found', 404);
  }

  res.json({ data: product[0] });
}));
