const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { AppError } = require('../middleware/errorHandler');

async function listStaff() {
  return db('users').select('id', 'phone', 'name', 'role', 'status', 'created_at').orderBy('created_at', 'desc');
}

async function createStaff({ phone, password, name }) {
  const existing = await db('users').where({ phone }).first();
  if (existing) throw new AppError('该手机号已注册', 409);

  const hash = await bcrypt.hash(password, 10);
  const [id] = await db('users').insert({
    phone, password_hash: hash, name, role: 'staff', status: 'active',
  });
  return { id, phone, name, role: 'staff', status: 'active' };
}

async function updateStaffStatus(id, status) {
  const affected = await db('users').where({ id }).update({ status });
  if (!affected) throw new AppError('店员不存在', 404);
  return { id, status };
}

module.exports = { listStaff, createStaff, updateStaffStatus };
