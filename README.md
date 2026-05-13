# Warehouse Inventory System

Database-backed warehouse inventory management web application for DB Lab Group 17.

## Project Submission

- Group Number: 17
- Group Members:
  - Rayyan Shaheer (23P-0557)
  - Abdul Raheem (23P-0591)
- Project Title: Inventory Management System for Warehouse
- GitHub Repository: https://github.com/rayyanshaheer/warehouse-inventory-system
- Short Description: A Node.js, Express, and MySQL application for managing warehouse products, suppliers, categories, purchase orders, sales orders, inventory adjustments, low-stock reporting, and transaction history.

Submitted database artifacts are included:

- `DB-Project-ERD.pdf`
- `warehouse_inventory_ddl.sql`

## Technologies Used

- Node.js
- Express.js
- MySQL 8
- mysql2
- dotenv
- Static HTML, CSS, and JavaScript frontend

## CRUD Coverage

The application implements all four CRUD operations through the product catalog and supporting warehouse workflows:

- Create: add suppliers, categories, products, purchase orders, sales orders, and inventory adjustments.
- Read: view dashboard KPIs, product inventory, purchase orders, sales orders, low-stock reports, and transaction history.
- Update: edit product details/status, receive purchase orders, fulfill sales orders, and update stock with manual adjustments.
- Delete: delete a product from the active catalog using `DELETE /api/products/:id`. This is implemented as a soft delete by setting `products.is_active = FALSE`, so existing orders and inventory transaction history remain valid.

## Setup and Run

1. Install Node.js dependencies:

```bash
npm install
```

2. Create the MySQL database from the submitted DDL:

```bash
mysql -u root -p < warehouse_inventory_ddl.sql
```

On Ubuntu, if MySQL uses socket authentication for `root`, use:

```bash
sudo mysql < warehouse_inventory_ddl.sql
```

3. Load demo data:

```bash
mysql -u root -p warehouse_inventory_system < database/seed.sql
```

Or with Ubuntu socket authentication:

```bash
sudo mysql warehouse_inventory_system < database/seed.sql
```

4. Create a local environment file:

```bash
cp .env.example .env
```

5. Update `.env` if your MySQL username, password, host, or port is different.

6. Start the app:

```bash
npm start
```

7. Open the application:

```text
http://localhost:3000
```

## Verification

Run JavaScript syntax checks:

```bash
npm run lint
npm run typecheck
```

Check API health after MySQL is running and `.env` is configured:

```bash
curl http://localhost:3000/api/health
```

## Demo Flow

1. Open the dashboard and review KPIs.
2. Add a supplier and category.
3. Add a product with opening stock.
4. Edit the product details.
5. Delete the product from the active catalog.
6. Create a purchase order and receive it.
7. Create a sales order and fulfill it.
8. Try fulfilling an order with more quantity than available stock to show validation.
9. Apply a manual inventory adjustment.
10. Review low-stock and transaction reports.

## Database and SQL Injection Notes

- Database access is centralized in `src/db.js`.
- User-controlled values are sent to MySQL through `mysql2` parameterized calls using `?` placeholders and parameter arrays.
- Examples include product create/update/delete, supplier/category creation, order creation, order receiving, sales fulfillment, and inventory adjustment routes.
- The `limit` query parameter used by transaction history is converted to a bounded integer before it is interpolated into SQL.
- Because user input is validated and bound as parameters instead of concatenated into SQL strings, the application is designed to prevent SQL injection in its database routes.

## Notes

- Authentication is not implemented in this version. The active user selector records which seeded user performs stock-changing actions.
- Password hashes in `database/seed.sql` are placeholders for presentation data only.
- The original submitted DDL remains the source schema for the project.
