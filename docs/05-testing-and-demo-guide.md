# 05. Testing and Demo Guide

## Setup Test

1. Install Node.js dependencies.
2. Import `warehouse_inventory_ddl.sql` into MySQL.
3. Import `database/seed.sql` into the `warehouse_inventory_system` database.
4. Configure `.env` from `.env.example`.
5. Start the application.

## Functional Demo Checklist

1. Open the dashboard and confirm KPI cards load.
2. Add a supplier.
3. Add a category.
4. Add a product with opening stock.
5. Create a purchase order with at least one item.
6. Receive the purchase order and confirm stock increases.
7. Create a sales order with at least one item.
8. Fulfill the sales order and confirm stock decreases.
9. Try to fulfill a sales order with insufficient stock and confirm the app blocks it.
10. Record a manual inventory adjustment.
11. Review low-stock report and transaction history.

## Technical Verification

- `npm run lint`: checks JavaScript syntax for backend and frontend files.
- `npm run typecheck`: runs the same syntax checks as a lightweight project health command.
- MySQL import should complete without foreign key or check constraint errors.

## Demo Data Accounts

The seed data includes warehouse users for display and order ownership. Authentication is out of scope for this version, so the app uses a selected user when creating records.

