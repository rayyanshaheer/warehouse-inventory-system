export class AppError extends Error {
  constructor(message, status = 400, details = null) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.details = details;
  }
}

export function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

export function requireFields(body, fields) {
  const missing = fields.filter((field) => {
    const value = body[field];
    return value === undefined || value === null || String(value).trim() === '';
  });

  if (missing.length > 0) {
    throw new AppError(`Missing required field${missing.length === 1 ? '' : 's'}: ${missing.join(', ')}`);
  }
}

export function cleanString(value, fallback = null) {
  if (value === undefined || value === null) {
    return fallback;
  }

  const cleaned = String(value).trim();
  return cleaned === '' ? fallback : cleaned;
}

export function toInt(value, field, options = {}) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed)) {
    throw new AppError(`${field} must be an integer`);
  }

  if (options.min !== undefined && parsed < options.min) {
    throw new AppError(`${field} must be at least ${options.min}`);
  }

  if (options.max !== undefined && parsed > options.max) {
    throw new AppError(`${field} must be at most ${options.max}`);
  }

  return parsed;
}

export function toDecimal(value, field, options = {}) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw new AppError(`${field} must be a number`);
  }

  if (options.min !== undefined && parsed < options.min) {
    throw new AppError(`${field} must be at least ${options.min}`);
  }

  return parsed;
}

export function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export function normalizeLimit(value, fallback = 25, max = 100) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  return toInt(value, 'limit', { min: 1, max });
}

export function requireItems(items, label = 'items') {
  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError(`${label} must contain at least one row`);
  }
}

