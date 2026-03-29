const { auditLog } = require('../utils/auditLog');

/**
 * Audit middleware factory
 * Logs the request details for security-sensitive operations.
 *
 * Usage: router.post('/path', audit('CREATE_CARD'), handler)
 *
 * @param {string} eventType - The audit event type
 */
function audit(eventType) {
  return (req, res, next) => {
    // Capture the original res.json to log on success
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (body && body.success) {
        auditLog(eventType, {
          message: `${eventType} operation completed`,
          userId: req.user ? req.user.id : null,
          userName: req.user ? req.user.name : null,
          ip: req.ip || req.connection.remoteAddress,
          method: req.method,
          path: req.originalUrl,
          params: req.params,
          // Avoid logging sensitive body fields
          bodyKeys: Object.keys(req.body || {}),
        });
      }
      return originalJson(body);
    };
    next();
  };
}

module.exports = { audit };
