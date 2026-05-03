# 03. Application Architecture

## Stack

- Runtime: Node.js
- Backend: Express API
- Database: MySQL 8 using the submitted schema
- Frontend: Static HTML, CSS, and JavaScript served by the backend

## Project Layout

```text
database/
  seed.sql
docs/
  01-project-scope.md
  02-database-model.md
  03-application-architecture.md
  04-implementation-roadmap.md
  05-testing-and-demo-guide.md
public/
  index.html
  styles.css
  app.js
src/
  config.js
  db.js
  server.js
  routes/
  services/
warehouse_inventory_ddl.sql
```

## Backend Responsibilities

- Load database settings from environment variables.
- Serve the static frontend.
- Expose JSON API routes for dashboard data, products, suppliers, categories, orders, inventory, and transactions.
- Use database transactions for workflows that change multiple tables.
- Return useful validation errors to the interface.

## Frontend Responsibilities

- Render a polished operational dashboard.
- Provide forms for creating products, suppliers, categories, purchase orders, sales orders, and inventory adjustments.
- Display tables for products, orders, low stock, and transaction history.
- Show success and error messages without requiring a page refresh.

## Reliability Decisions

- Keep original submitted files available for grading.
- Add separate seed data instead of mixing demo data into the DDL.
- Use SQL transactions for receiving purchase orders and fulfilling sales orders.
- Keep the app dependency list small so it is practical to run on a student laptop.

