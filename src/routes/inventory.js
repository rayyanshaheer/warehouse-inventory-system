import { Router } from 'express';
import { withTransaction } from '../db.js';
import {
  AppError,
  asyncHandler,
  cleanString,
  requireFields,
  toInt
} from '../utils.js';

export const inventoryRouter = Router();

inventoryRouter.post('/inventory/adjust', asyncHandler(async (req, res) => {
  requireFields(req.body, ['product_id', 'adjustment_type', 'quantity', 'performed_by']);

  const productId = toInt(req.body.product_id, 'product_id', { min: 1 });
  const quantity = toInt(req.body.quantity, 'quantity', { min: 1 });
  const performedBy = toInt(req.body.performed_by, 'performed_by', { min: 1 });
  const adjustmentType = cleanString(req.body.adjustment_type).toUpperCase();

  if (!['INCREASE', 'DECREASE', 'SET'].includes(adjustmentType)) {
    throw new AppError('adjustment_type must be INCREASE, DECREASE, or SET');
  }

  const result = await withTransaction(async (connection) => {
    const [[product]] = await connection.execute(`
      SELECT
        p.product_id,
        p.sku,
        p.product_name,
        i.quantity_on_hand
      FROM products p
      JOIN inventory i ON i.product_id = p.product_id
      WHERE p.product_id = ?
      FOR UPDATE
    `, [productId]);

    if (!product) {
      throw new AppError('Product not found', 404);
    }

    let newQuantity = product.quantity_on_hand;
    let movementQuantity = quantity;

    if (adjustmentType === 'INCREASE') {
      newQuantity += quantity;
    } else if (adjustmentType === 'DECREASE') {
      newQuantity -= quantity;
    } else {
      newQuantity = quantity;
      movementQuantity = Math.abs(quantity - product.quantity_on_hand);
    }

    if (newQuantity < 0) {
      throw new AppError('Inventory cannot be reduced below zero', 409, {
        product_id: productId,
        quantity_on_hand: product.quantity_on_hand,
        requested_quantity: quantity
      });
    }

    await connection.execute(`
      UPDATE inventory
      SET quantity_on_hand = ?
      WHERE product_id = ?
    `, [newQuantity, productId]);

    if (movementQuantity > 0) {
      const note = cleanString(req.body.notes, 'Manual stock adjustment');
      await connection.execute(`
        INSERT INTO inventory_transactions (
          product_id,
          performed_by,
          transaction_type,
          quantity,
          notes
        )
        VALUES (?, ?, 'ADJUSTMENT', ?, ?)
      `, [productId, performedBy, movementQuantity, `${adjustmentType}: ${note}`]);
    }

    return {
      product_id: productId,
      sku: product.sku,
      product_name: product.product_name,
      previous_quantity: product.quantity_on_hand,
      quantity_on_hand: newQuantity
    };
  });

  res.json({ data: result });
}));

