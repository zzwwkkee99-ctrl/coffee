const db = require('../config/db');
const { AppError } = require('../middleware/errorHandler');

async function listTemplates(includeDisabled = false) {
  const query = db('card_templates').orderBy('created_at', 'desc');
  if (!includeDisabled) {
    query.where('status', 'active');
  }
  return query;
}

async function createTemplate({ name, type, amount, count }) {
  if (type === 'value' && (!amount || amount <= 0)) {
    throw new AppError('储值卡模板必须设置金额', 400);
  }
  if (type === 'count' && (!count || count <= 0)) {
    throw new AppError('次卡模板必须设置次数', 400);
  }

  const [id] = await db('card_templates').insert({
    name,
    type,
    amount: type === 'value' ? amount : null,
    count: type === 'count' ? count : null,
    status: 'active',
  });

  return db('card_templates').where({ id }).first();
}

async function updateTemplateStatus(id, status) {
  const affected = await db('card_templates').where({ id }).update({ status, updated_at: db.fn.now() });
  if (!affected) throw new AppError('模板不存在', 404);
  return { id, status };
}

async function getTemplate(id) {
  const tpl = await db('card_templates').where({ id }).first();
  if (!tpl) throw new AppError('卡片模板不存在', 404);
  return tpl;
}

module.exports = { listTemplates, createTemplate, updateTemplateStatus, getTemplate };
