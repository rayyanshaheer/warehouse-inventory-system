# 02. Database Model

## Existing Submitted Artifacts

- `warehouse_inventory_ddl.sql`: MySQL schema for the warehouse database.
- `DB-Project-ERD.pdf`: Crow's foot ERD for the same model.

## Main Entities

- `roles`: permission grouping for users.
- `users`: application users who create orders and perform transactions.
- `suppliers`: vendors that provide warehouse products.
- `categories`: product classification.
- `products`: SKU, price, supplier, reorder level, and active status.
- `inventory`: current quantity on hand per product.
- `purchase_orders`: inbound orders from suppliers.
- `purchase_order_items`: products ordered on purchase orders.
- `sales_orders`: outbound orders to destinations.
- `sales_order_items`: products requested on sales orders.
- `inventory_transactions`: audit log for stock movement.

## Important Relationships

- Each user belongs to one role.
- Each product belongs to one category and can have one primary supplier.
- Each product has one inventory row.
- Purchase orders belong to suppliers and users.
- Sales orders belong to users.
- Purchase and sales order items connect orders to products.
- Inventory transactions connect stock changes to products and optionally to purchase or sales orders.

## Business Rules

- Product SKU values must be unique.
- Email values for users and suppliers must be unique when present.
- Product prices, unit costs, reorder levels, and stock quantities cannot be negative.
- Received purchase quantity cannot exceed ordered purchase quantity.
- Sales fulfillment must check inventory before reducing stock.
- Low stock is reported when `quantity_on_hand <= reorder_level`.

## Reporting Needs

- Dashboard totals for products, suppliers, stock value, pending orders, and low-stock items.
- Low-stock report using the `low_stock_report` database view.
- Recent transaction feed showing inbound, outbound, and adjustment activity.
- Order tables showing status, totals, and item counts.

