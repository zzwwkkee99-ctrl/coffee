const bcrypt = require('bcryptjs');

exports.seed = async function (knex) {
  const existing = await knex('users').where('phone', '13800000000').first();
  if (existing) return;

  const hash = await bcrypt.hash('admin123', 10);
  await knex('users').insert({
    phone: '13800000000',
    password_hash: hash,
    name: '店长',
    role: 'admin',
    status: 'active',
  });
};
