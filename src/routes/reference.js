import { Router } from 'express';
import { query } from '../db.js';
import { asyncHandler, cleanString, requireFields } from '../utils.js';

export const referenceRouter = Router();

referenceRouter.get('/reference', asyncHandler(async (req, res) => {
  const [categories, suppliers, users, products] = await Promise.all([
    query('SELECT category_id, category_name FROM categories ORDER BY category_name'),
    query(`
      SELECT supplier_id, supplier_name
      FROM suppliers
      WHERE is_active = TRUE
      ORDER BY supplier_name
    `),
    query(`
      SELECT u.user_id, u.full_name, r.role_name
      FROM users u
      JOIN roles r ON r.role_id = u.role_id
      WHERE u.is_active = TRUE
      ORDER BY u.full_name
    `),
    query(`
      SELECT
        p.product_id,
        p.sku,
        p.product_name,
        p.unit_price,
        i.quantity_on_hand
      FROM products p
      JOIN inventory i ON i.product_id = p.product_id
      WHERE p.is_active = TRUE
      ORDER BY p.product_name
    `)
  ]);

  res.json({
    data: {
      categories,
      suppliers,
      users,
      products
    }
  });
}));

referenceRouter.get('/suppliers', asyncHandler(async (req, res) => {
  const suppliers = await query(`
    SELECT
      supplier_id,
      supplier_name,
      contact_person,
      phone,
      email,
      address,
      is_active,
      created_at
    FROM suppliers
    ORDER BY supplier_name
  `);

  res.json({ data: suppliers });
}));

referenceRouter.post('/suppliers', asyncHandler(async (req, res) => {
  requireFields(req.body, ['supplier_name']);

  const params = [
    cleanString(req.body.supplier_name),
    cleanString(req.body.contact_person),
    cleanString(req.body.phone),
    cleanString(req.body.email),
    cleanString(req.body.address)
  ];

  const result = await query(`
    INSERT INTO suppliers (supplier_name, contact_person, phone, email, address)
    VALUES (?, ?, ?, ?, ?)
  `, params);

  const supplier = await query(`
    SELECT supplier_id, supplier_name, contact_person, phone, email, address, is_active, created_at
    FROM suppliers
    WHERE supplier_id = ?
  `, [result.insertId]);

  res.status(201).json({ data: supplier[0] });
}));

referenceRouter.get('/categories', asyncHandler(async (req, res) => {
  const categories = await query(`
    SELECT category_id, category_name, description
    FROM categories
    ORDER BY category_name
  `);

  res.json({ data: categories });
}));

referenceRouter.post('/categories', asyncHandler(async (req, res) => {
  requireFields(req.body, ['category_name']);

  const result = await query(`
    INSERT INTO categories (category_name, description)
    VALUES (?, ?)
  `, [
    cleanString(req.body.category_name),
    cleanString(req.body.description)
  ]);

  const category = await query(`
    SELECT category_id, category_name, description
    FROM categories
    WHERE category_id = ?
  `, [result.insertId]);

  res.status(201).json({ data: category[0] });
}));

