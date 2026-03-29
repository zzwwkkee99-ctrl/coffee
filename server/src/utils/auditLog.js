const winston = require('winston');
const path = require('path');

/**
 * Security Audit Logger
 *
 * Logs security-relevant events to a dedicated audit log file.
 * Events: LOGIN_SUCCESS, LOGIN_FAIL, CONSUME, RECHARGE, UNDO,
 *         RESET_PASSWORD, CREATE_CARD, CHANGE_PASSWORD, etc.
 */

const auditLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.json()
  ),
  defaultMeta: { service: 'coffee-audit' },
  transports: [
    new winston.transports.File({
      filename: path.join(__dirname, '../../../logs/audit.log'),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    }),
  ],
});

// Also log to console in development
if (process.env.NODE_ENV !== 'production') {
  auditLogger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.printf(({ timestamp, event, message, ...rest }) => {
        return `[AUDIT ${timestamp}] ${event}: ${message} ${JSON.stringify(rest)}`;
      })
    ),
  }));
}

/**
 * Log an audit event
 * @param {string} event - Event type (e.g. LOGIN_SUCCESS)
 * @param {object} details - Event details
 * @param {string} details.message - Human-readable description
 * @param {number} [details.userId] - Operator user ID
 * @param {string} [details.ip] - Client IP address
 * @param {string} [details.phone] - Related phone number
 * @param {*} [details.extra] - Any additional context
 */
function auditLog(event, details = {}) {
  auditLogger.info({
    event,
    ...details,
  });
}

module.exports = { auditLog };
