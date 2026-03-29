const { AppError } = require('./errorHandler');

/**
 * Anti-replay / Idempotency middleware
 *
 * Clients must include a unique `X-Idempotency-Key` header (UUIDv4)
 * on critical write operations. The server rejects duplicate keys
 * within a 10-minute TTL window.
 */

const TTL_MS = 10 * 60 * 1000; // 10 minutes
const processedKeys = new Map(); // key -> timestamp

// Periodic cleanup every 3 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, ts] of processedKeys) {
    if (now - ts > TTL_MS) processedKeys.delete(key);
  }
}, 3 * 60 * 1000);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Require a valid idempotency key and reject duplicates.
 */
function requireIdempotencyKey(req, res, next) {
  const key = req.headers['x-idempotency-key'];

  if (!key) {
    throw new AppError('缺少幂等性标识（X-Idempotency-Key），请刷新页面重试', 400);
  }

  if (!UUID_RE.test(key)) {
    throw new AppError('无效的幂等性标识格式', 400);
  }

  if (processedKeys.has(key)) {
    throw new AppError('请勿重复提交，该操作已处理', 409);
  }

  // Mark key as processed
  processedKeys.set(key, Date.now());

  next();
}

module.exports = { requireIdempotencyKey };
