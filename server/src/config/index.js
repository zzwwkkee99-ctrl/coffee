require('dotenv').config();
const logger = require('../utils/logger');

const jwtSecret = process.env.JWT_SECRET || 'dev-secret';

// Security: warn or block on default JWT secret
if (jwtSecret === 'dev-secret') {
  if (process.env.NODE_ENV === 'production') {
    logger.error('🚨 FATAL: JWT_SECRET is using the default value in production! Set a strong JWT_SECRET environment variable.');
    process.exit(1);
  } else {
    logger.warn('⚠️  JWT_SECRET is using the default value "dev-secret". This is insecure — set a strong JWT_SECRET in .env for production.');
  }
}

module.exports = {
  port: process.env.PORT || 3001,
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'coffee_card',
  },
  jwt: {
    secret: jwtSecret,
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
};
