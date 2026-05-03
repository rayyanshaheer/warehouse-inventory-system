import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

dotenv.config();

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function numberFromEnv(name, fallback) {
  const rawValue = process.env[name];

  if (rawValue === undefined || rawValue === '') {
    return fallback;
  }

  const parsed = Number(rawValue);

  if (!Number.isFinite(parsed)) {
    throw new Error(`${name} must be a number`);
  }

  return parsed;
}

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: numberFromEnv('PORT', 3000),
  rootDir,
  publicDir: path.join(rootDir, 'public'),
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: numberFromEnv('DB_PORT', 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'warehouse_inventory_system',
    waitForConnections: true,
    connectionLimit: numberFromEnv('DB_CONNECTION_LIMIT', 10),
    queueLimit: 0,
    decimalNumbers: true,
    timezone: 'Z'
  }
};

