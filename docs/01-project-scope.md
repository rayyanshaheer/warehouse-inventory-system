# 01. Project Scope

## Project

Inventory Management System for Warehouse

## Goal

Build a database-backed warehouse application that demonstrates the submitted ERD and SQL schema through a usable web interface. The project should be easy to present, easy to run, and strong enough to show real inventory workflows instead of only static tables.

## Primary Users

- Admin: manages users, products, suppliers, categories, orders, and reports.
- Warehouse manager: reviews stock, receives purchase orders, fulfills sales orders, and tracks inventory movement.
- Staff user: creates orders and records inventory adjustments.

## Core Workflows

1. View warehouse dashboard KPIs.
2. Maintain suppliers, categories, and products.
3. Track current stock for every product.
4. Create purchase orders from suppliers.
5. Receive purchase orders into inventory.
6. Create sales orders for outgoing stock.
7. Fulfill sales orders after stock validation.
8. Record manual inventory adjustments.
9. Review low-stock products and transaction history.

## Success Criteria

- The app uses the submitted relational model as its source of truth.
- Inventory cannot go below zero when fulfilling sales orders.
- Purchase receiving and sales fulfillment both write inventory transactions.
- The interface gives a clear dashboard, forms, tables, and reports.
- The project includes setup instructions, seed data, and verification commands.
- The git history contains regular commits with detailed messages.

