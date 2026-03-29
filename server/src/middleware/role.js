const { AppError } = require('./errorHandler');

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new AppError('权限不足', 403);
    }
    next();
  };
}

module.exports = requireRole;
