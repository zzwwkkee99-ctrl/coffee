const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { AppError } = require('../middleware/errorHandler');

async function listCustomers({ page = 1, pageSize = 20, search = '' }) {
  const query = db('customers').select('id', 'phone', 'name', 'created_at');
  if (search) {
    query.where(function () {
      this.where('phone', 'like', `%${search}%`)
        .orWhere('name', 'like', `%${search}%`);
    });
  }
  const total = await query.clone().clearSelect().count('* as count').first();
  const list = await query.orderBy('created_at', 'desc')
    .limit(pageSize).offset((page - 1) * pageSize);
  return { list, total: total.count, page, pageSize };
}

async function createCustomer({ phone, name, password }) {
  const existing = await db('customers').where({ phone }).first();
  if (existing) throw new AppError('该手机号已注册', 409);

  // Default password = phone number
  const pwd = password || phone;
  const hash = await bcrypt.hash(pwd, 10);
  const [id] = await db('customers').insert({
    phone, password_hash: hash, name,
  });
  return { id, phone, name };
}

async function findOrCreateCustomer({ phone, name }) {
  const existing = await db('customers').where({ phone }).first();
  if (existing) {
    return { customer: existing, created: false };
  }

  // Auto-create with password = phone
  const hash = await bcrypt.hash(phone, 10);
  const customerName = name || phone;
  const [id] = await db('customers').insert({
    phone, password_hash: hash, name: customerName,
  });
  const customer = await db('customers').where({ id }).first();
  return { customer, created: true };
}

async function resetPassword(customerId) {
  const customer = await db('customers').where({ id: customerId }).first();
  if (!customer) throw new AppError('客户不存在', 404);

  const hash = await bcrypt.hash(customer.phone, 10);
  await db('customers').where({ id: customerId }).update({
    password_hash: hash,
    updated_at: db.fn.now(),
  });
  return { id: customerId, message: '密码已重置为手机号' };
}

async function changePassword(customerId, oldPassword, newPassword) {
  const customer = await db('customers').where({ id: customerId }).first();
  if (!customer) throw new AppError('客户不存在', 404);

  const valid = await bcrypt.compare(oldPassword, customer.password_hash);
  if (!valid) throw new AppError('原密码错误', 400);

  if (!newPassword || newPassword.length < 6) {
    throw new AppError('新密码至少6位', 400);
  }

  const hash = await bcrypt.hash(newPassword, 10);
  await db('customers').where({ id: customerId }).update({
    password_hash: hash,
    updated_at: db.fn.now(),
  });
  return { message: '密码修改成功' };
}

module.exports = { listCustomers, createCustomer, findOrCreateCustomer, resetPassword, changePassword };
