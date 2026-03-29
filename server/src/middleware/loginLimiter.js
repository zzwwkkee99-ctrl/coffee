const { AppError } = require('./errorHandler');
const logger = require('../utils/logger');

/**
 * Login brute-force protection
 * - Per-IP: max 20 attempts per 15-minute window
 * - Per-account (phone): max 5 failed attempts, then lock for 15 minutes
 */

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_IP_ATTEMPTS = 20;
const MAX_ACCOUNT_FAILS = 5;

// In-memory stores  { key -> { count, firstAttempt } }
const ipAttempts = new Map();
const accountFails = new Map();

// Periodic cleanup every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of ipAttempts) {
    if (now - val.firstAttempt > WINDOW_MS) ipAttempts.delete(key);
  }
  for (const [key, val] of accountFails) {
    if (now - val.firstAttempt > WINDOW_MS) accountFails.delete(key);
  }
}, 5 * 60 * 1000);

/**
 * Middleware: enforce login rate limits before authentication
 */
function loginLimiter(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const phone = req.body.phone;
  const now = Date.now();

  // --- IP-level check ---
  const ipKey = `ip:${ip}`;
  const ipRecord = ipAttempts.get(ipKey);
  if (ipRecord) {
    if (now - ipRecord.firstAttempt > WINDOW_MS) {
      ipAttempts.delete(ipKey);
    } else if (ipRecord.count >= MAX_IP_ATTEMPTS) {
      const retryAfter = Math.ceil((WINDOW_MS - (now - ipRecord.firstAttempt)) / 1000);
      logger.warn(`Login IP rate limit hit: ${ip}`);
      throw new AppError(`请求过于频繁，请${Math.ceil(retryAfter / 60)}分钟后再试`, 429);
    }
  }

  // --- Account-level check ---
  if (phone) {
    const acctRecord = accountFails.get(phone);
    if (acctRecord) {
      if (now - acctRecord.firstAttempt > WINDOW_MS) {
        accountFails.delete(phone);
      } else if (acctRecord.count >= MAX_ACCOUNT_FAILS) {
        const retryAfter = Math.ceil((WINDOW_MS - (now - acctRecord.firstAttempt)) / 1000);
        logger.warn(`Login account locked: ${phone}, IP: ${ip}`);
        throw new AppError(`登录失败次数过多，账号已锁定，请${Math.ceil(retryAfter / 60)}分钟后再试`, 429);
      }
    }
  }

  // Increment IP attempt count
  const existing = ipAttempts.get(ipKey);
  if (existing) {
    existing.count++;
  } else {
    ipAttempts.set(ipKey, { count: 1, firstAttempt: now });
  }

  next();
}

/**
 * Record a failed login attempt for account-level limiting
 */
function recordFailedAttempt(phone) {
  const now = Date.now();
  const record = accountFails.get(phone);
  if (record) {
    if (now - record.firstAttempt > WINDOW_MS) {
      accountFails.set(phone, { count: 1, firstAttempt: now });
    } else {
      record.count++;
    }
  } else {
    accountFails.set(phone, { count: 1, firstAttempt: now });
  }
  const current = accountFails.get(phone);
  return MAX_ACCOUNT_FAILS - current.count; // remaining attempts
}

/**
 * Clear failed attempts on successful login
 */
function clearFailedAttempts(phone) {
  accountFails.delete(phone);
}

module.exports = { loginLimiter, recordFailedAttempt, clearFailedAttempts };
