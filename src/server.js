import express from 'express';
import path from 'node:path';
import { config } from './config.js';
import { pool } from './db.js';
import { dashboardRouter } from './routes/dashboard.js';
import { inventoryRouter } from './routes/inventory.js';
import { ordersRouter } from './routes/orders.js';
import { productsRouter } from './routes/products.js';
import { referenceRouter } from './routes/reference.js';
import { AppError, asyncHandler } from './utils.js';

const app = express();

app.use(express.json({ limit: '1mb' }));
app.use(express.static(config.publicDir));

app.get('/api/health', asyncHandler(async (req, res) => {
  await pool.query('SELECT 1 AS ok');

  res.json({
    data: {
      ok: true,
      service: 'warehouse-inventory-system',
      database: config.db.database
    }
  });
}));

app.use('/api', dashboardRouter);
app.use('/api', inventoryRouter);
app.use('/api', ordersRouter);
app.use('/api', productsRouter);
app.use('/api', referenceRouter);

app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    next(new AppError('API route not found', 404));
    return;
  }

  if (req.method === 'GET') {
    res.sendFile(path.join(config.publicDir, 'index.html'));
    return;
  }

  next(new AppError('Route not found', 404));
});

app.use((error, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (['ECONNREFUSED', 'ER_ACCESS_DENIED_ERROR', 'ER_BAD_DB_ERROR'].includes(error.code)) {
    res.status(503).json({
      error: 'Database connection failed. Check that MySQL is running and .env is configured.',
      code: error.code
    });
    return;
  }

  if (error.code === 'ER_DUP_ENTRY') {
    res.status(409).json({
      error: 'A record with the same unique value already exists.',
      code: error.code
    });
    return;
  }

  if (error.code === 'ER_NO_REFERENCED_ROW_2') {
    res.status(400).json({
      error: 'A related record does not exist.',
      code: error.code
    });
    return;
  }

  const status = error.status || 500;

  if (status >= 500) {
    console.error(error);
  }

  res.status(status).json({
    error: error.message || 'Unexpected server error',
    details: error.details || null
  });
});

app.listen(config.port, () => {
  console.log(`Warehouse inventory app running on http://localhost:${config.port}`);
});
