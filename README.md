# Warehouse Inventory System

Database-backed warehouse inventory management system for Group 17.

Submitted base artifacts are still included:

- `DB-Project-ERD.pdf`
- `warehouse_inventory_ddl.sql`

The repository now also includes a runnable Node.js and MySQL web application that demonstrates the submitted schema through real warehouse workflows.

## Features

- Dashboard KPIs for active products, suppliers, stock units, inventory value, low stock, and pending orders.
- Product, supplier, and category creation.
- Current inventory table with reorder visibility and stock value.
- Purchase order creation and receiving.
- Sales order creation and fulfillment with stock validation.
- Manual inventory adjustments.
- Low-stock report powered by the `low_stock_report` database view.
- Inventory transaction history for inbound, outbound, and adjustment activity.

## Tech Stack

- Node.js
- Express
- MySQL 8
- Static HTML, CSS, and JavaScript frontend

## Project Structure

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
scripts/
  check-js.mjs
warehouse_inventory_ddl.sql
```

## Setup

Install dependencies:

```bash
npm install
```

Create the MySQL database from the submitted DDL:

```bash
mysql -u root -p < warehouse_inventory_ddl.sql
```

Load demo data:

```bash
mysql -u root -p warehouse_inventory_system < database/seed.sql
```

Create a local environment file:

```bash
cp .env.example .env
```

Update `.env` if your MySQL username, password, host, or port is different.

Start the app:

```bash
npm start
```

Open:

```text
http://localhost:3000
```

## Verification

Run JavaScript syntax checks:

```bash
npm run lint
npm run typecheck
```

Check API health after the database is imported and `.env` is configured:

```bash
curl http://localhost:3000/api/health
```

## Demo Flow

1. Open the dashboard and review KPIs.
2. Add a supplier and category.
3. Add a product with opening stock.
4. Create a purchase order and receive it.
5. Create a sales order and fulfill it.
6. Try fulfilling an order that has more quantity than available stock.
7. Apply a manual inventory adjustment.
8. Review low-stock and transaction reports.

## Notes

- Authentication is not implemented in this version. The active user selector records which seeded user performs stock-changing actions.
- Password hashes in `database/seed.sql` are placeholders for presentation data only.
- The original submitted DDL remains the source schema for the project.
