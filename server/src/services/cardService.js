const db = require('../config/db');
const { AppError } = require('../middleware/errorHandler');
const { generateCardNo } = require('../utils/cardNo');

async function issueCard({ customerId, type, amount, count, memo, issuedBy, templateId }) {
  const customer = await db('customers').where({ id: customerId }).first();
  if (!customer) throw new AppError('客户不存在', 404);

  // If templateId given, check for existing same-template card for this customer
  if (templateId) {
    const existingCard = await db('cards')
      .where({ customer_id: customerId, template_id: templateId })
      .whereIn('status', ['active', 'exhausted'])
      .first();

    if (existingCard) {
      // Recharge existing card instead of creating new one
      if (existingCard.type === 'value') {
        return rechargeCard({
          cardId: existingCard.id,
          amount,
          operatorId: issuedBy,
          note: memo ? `办卡充值：${memo}` : '办卡充值',
        });
      } else {
        return rechargeCountCard({
          cardId: existingCard.id,
          count,
          operatorId: issuedBy,
          note: memo ? `办卡充次：${memo}` : '办卡充次',
        });
      }
    }
  }

  const cardNo = generateCardNo();

  const [cardId] = await db.transaction(async (trx) => {
    const [id] = await trx('cards').insert({
      card_no: cardNo,
      customer_id: customerId,
      type,
      balance: type === 'value' ? amount : 0,
      remaining_count: type === 'count' ? count : 0,
      total_value: type === 'value' ? amount : 0,
      total_count: type === 'count' ? count : 0,
      memo: memo || null,
      status: 'active',
      issued_by: issuedBy,
      template_id: templateId || null,
    });

    await trx('transactions').insert({
      card_id: id,
      type: 'issue',
      amount: type === 'value' ? amount : null,
      count: type === 'count' ? count : null,
      balance_after: type === 'value' ? amount : null,
      count_after: type === 'count' ? count : null,
      operator_id: issuedBy,
      note: `发卡${memo ? '：' + memo : ''}`,
    });

    return [id];
  });

  return db('cards').where({ id: cardId }).first();
}

async function getCardByNo(cardNo) {
  const card = await db('cards')
    .join('customers', 'cards.customer_id', 'customers.id')
    .select('cards.*', 'customers.name as customer_name', 'customers.phone as customer_phone')
    .where('cards.card_no', cardNo)
    .first();
  if (!card) throw new AppError('卡不存在', 404);
  return card;
}

async function listCards({ page = 1, pageSize = 20, customerId, type, status }) {
  const query = db('cards')
    .join('customers', 'cards.customer_id', 'customers.id')
    .leftJoin('card_templates', 'cards.template_id', 'card_templates.id')
    .select(
      'cards.*',
      'customers.name as customer_name',
      'customers.phone as customer_phone',
      'card_templates.name as template_name'
    );

  if (customerId) query.where('cards.customer_id', customerId);
  if (type) query.where('cards.type', type);
  if (status) query.where('cards.status', status);

  const total = await query.clone().clearSelect().count('* as count').first();
  const list = await query.orderBy('cards.created_at', 'desc')
    .limit(pageSize).offset((page - 1) * pageSize);
  return { list, total: total.count, page, pageSize };
}

async function listCardsByPhone(phone) {
  const customer = await db('customers').where({ phone }).first();
  if (!customer) throw new AppError('该手机号未注册', 404);

  const cards = await db('cards')
    .leftJoin('card_templates', 'cards.template_id', 'card_templates.id')
    .select('cards.*', 'card_templates.name as template_name')
    .where('cards.customer_id', customer.id)
    .orderBy('cards.created_at', 'desc');

  return {
    customer: { id: customer.id, name: customer.name, phone: customer.phone },
    cards,
  };
}

async function consumeCard({ cardId, amount, count, operatorId, note }) {
  const card = await db('cards').where({ id: cardId }).first();
  if (!card) throw new AppError('卡不存在', 404);
  if (card.status !== 'active') throw new AppError('该卡不可使用', 400);

  return db.transaction(async (trx) => {
    if (card.type === 'value') {
      if (!amount || amount <= 0) throw new AppError('请输入消费金额', 400);
      const affected = await trx('cards')
        .where({ id: cardId, status: 'active' })
        .whereRaw('balance >= ?', [amount])
        .update({ balance: trx.raw('balance - ?', [amount]) });
      if (!affected) throw new AppError('余额不足', 400);

      const updated = await trx('cards').where({ id: cardId }).first();
      const [txId] = await trx('transactions').insert({
        card_id: cardId, type: 'consume', amount,
        balance_after: updated.balance, operator_id: operatorId, note,
      });

      if (parseFloat(updated.balance) === 0) {
        await trx('cards').where({ id: cardId }).update({ status: 'exhausted' });
        updated.status = 'exhausted';
      }
      return { ...updated, transaction: { id: txId } };

    } else {
      const deduct = count || 1;
      const affected = await trx('cards')
        .where({ id: cardId, status: 'active' })
        .whereRaw('remaining_count >= ?', [deduct])
        .update({ remaining_count: trx.raw('remaining_count - ?', [deduct]) });
      if (!affected) throw new AppError('剩余次数不足', 400);

      const updated = await trx('cards').where({ id: cardId }).first();
      const [txId] = await trx('transactions').insert({
        card_id: cardId, type: 'consume', count: deduct,
        count_after: updated.remaining_count, operator_id: operatorId, note,
      });

      if (updated.remaining_count === 0) {
        await trx('cards').where({ id: cardId }).update({ status: 'exhausted' });
        updated.status = 'exhausted';
      }
      return { ...updated, transaction: { id: txId } };
    }
  });
}

async function rechargeCard({ cardId, amount, operatorId, note }) {
  const card = await db('cards').where({ id: cardId }).first();
  if (!card) throw new AppError('卡不存在', 404);
  if (card.type !== 'value') throw new AppError('仅储值卡可充值', 400);
  if (!amount || amount <= 0) throw new AppError('请输入充值金额', 400);

  return db.transaction(async (trx) => {
    await trx('cards').where({ id: cardId }).update({
      balance: trx.raw('balance + ?', [amount]),
      total_value: trx.raw('total_value + ?', [amount]),
      status: 'active',
    });

    const updated = await trx('cards').where({ id: cardId }).first();
    await trx('transactions').insert({
      card_id: cardId, type: 'recharge', amount,
      balance_after: updated.balance, operator_id: operatorId, note: note || '充值',
    });

    return updated;
  });
}

async function rechargeCountCard({ cardId, count, operatorId, note }) {
  const card = await db('cards').where({ id: cardId }).first();
  if (!card) throw new AppError('卡不存在', 404);
  if (card.type !== 'count') throw new AppError('仅次卡可充次', 400);
  if (!count || count <= 0) throw new AppError('请输入充值次数', 400);

  return db.transaction(async (trx) => {
    await trx('cards').where({ id: cardId }).update({
      remaining_count: trx.raw('remaining_count + ?', [count]),
      total_count: trx.raw('total_count + ?', [count]),
      status: 'active',
    });

    const updated = await trx('cards').where({ id: cardId }).first();
    await trx('transactions').insert({
      card_id: cardId, type: 'recharge', count,
      count_after: updated.remaining_count, operator_id: operatorId, note: note || '充次',
    });

    return updated;
  });
}

module.exports = { issueCard, getCardByNo, listCards, listCardsByPhone, consumeCard, rechargeCard, rechargeCountCard };
