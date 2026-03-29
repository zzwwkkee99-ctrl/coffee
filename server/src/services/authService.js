const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const config = require('../config');
const { AppError } = require('../middleware/errorHandler');

async function adminLogin(phone, password) {
  const user = await db('users').where({ phone, status: 'active' }).first();
  if (!user) throw new AppError('手机号或密码错误', 401);

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw new AppError('手机号或密码错误', 401);

  const token = jwt.sign(
    { id: user.id, phone: user.phone, name: user.name, role: user.role, userType: 'admin' },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );

  return {
    token,
    user: { id: user.id, phone: user.phone, name: user.name, role: user.role },
  };
}

async function customerLogin(phone, password) {
  const customer = await db('customers').where({ phone }).first();
  if (!customer) throw new AppError('手机号或密码错误', 401);

  const valid = await bcrypt.compare(password, customer.password_hash);
  if (!valid) throw new AppError('手机号或密码错误', 401);

  const token = jwt.sign(
    { id: customer.id, phone: customer.phone, name: customer.name, userType: 'customer' },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );

  return {
    token,
    user: { id: customer.id, phone: customer.phone, name: customer.name },
  };
}

module.exports = { adminLogin, customerLogin };
