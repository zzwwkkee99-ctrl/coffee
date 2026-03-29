const jwt = require('jsonwebtoken');
const config = require('../config');
const { AppError } = require('./errorHandler');

function authMiddleware(userType) {
  return (req, res, next) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw new AppError('未登录，请先登录', 401);
    }
    try {
      const token = header.split(' ')[1];
      const decoded = jwt.verify(token, config.jwt.secret);
      if (decoded.userType !== userType) {
        throw new AppError('无权访问', 403);
      }
      req.user = decoded;
      next();
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw new AppError('登录已过期，请重新登录', 401);
      }
      if (err.isOperational) throw err;
      throw new AppError('无效的登录凭证', 401);
    }
  };
}

module.exports = authMiddleware;
