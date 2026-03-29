const crypto = require('crypto');

function generateCardNo() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `CF${timestamp}${random}`;
}

module.exports = { generateCardNo };
