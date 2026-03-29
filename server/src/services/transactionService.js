const db = require('../config/db');

async function listTransactions({ page = 1, pageSize = 20, cardId, operatorId, startDate, endDate }) {
  const query = db('transactions')
    .join('cards', 'transactions.card_id', 'cards.id')
    .join('customers', 'cards.customer_id', 'customers.id')
    .leftJoin('users', 'transactions.operator_id', 'users.id')
    .select(
      'transactions.*',
      'cards.card_no',
      'cards.type as card_type',
      'customers.name as customer_name',
      'customers.phone as customer_phone',
      'users.name as operator_name'
    );

  if (cardId) query.where('transactions.card_id', cardId);
  if (operatorId) query.where('transactions.operator_id', operatorId);
  if (startDate) query.where('transactions.created_at', '>=', startDate);
  if (endDate) query.where('transactions.created_at', '<=', endDate);

  const total = await query.clone().clearSelect().count('* as count').first();
  const list = await query.orderBy('transactions.created_at', 'desc')
    .limit(pageSize).offset((page - 1) * pageSize);

  // Mark consume transactions that have already been undone
  for (const tx of list) {
    if (tx.type === 'consume') {
      const undoTx = await db('transactions').where('note', `撤销消费流水#${tx.id}`).first();
      tx.is_undone = !!undoTx;
    }
  }

  return { list, total: total.count, page, pageSize };
}

async function exportTransactions({ cardId, operatorId, startDate, endDate }) {
  const query = db('transactions')
    .join('cards', 'transactions.card_id', 'cards.id')
    .join('customers', 'cards.customer_id', 'customers.id')
    .leftJoin('users', 'transactions.operator_id', 'users.id')
    .select(
      'transactions.id',
      'cards.card_no',
      'cards.type as card_type',
      'customers.name as customer_name',
      'customers.phone as customer_phone',
      'transactions.type',
      'transactions.amount',
      'transactions.count',
      'transactions.balance_after',
      'transactions.count_after',
      'users.name as operator_name',
      'transactions.note',
      'transactions.created_at'
    );

  if (cardId) query.where('transactions.card_id', cardId);
  if (operatorId) query.where('transactions.operator_id', operatorId);
  if (startDate) query.where('transactions.created_at', '>=', startDate);
  if (endDate) query.where('transactions.created_at', '<=', endDate);

  return query.orderBy('transactions.created_at', 'desc');
}

async function listCardTransactions(cardId, { page = 1, pageSize = 20 }) {
  const total = await db('transactions').where({ card_id: cardId }).count('* as count').first();
  const list = await db('transactions')
    .leftJoin('users', 'transactions.operator_id', 'users.id')
    .select('transactions.*', 'users.name as operator_name')
    .where('transactions.card_id', cardId)
    .orderBy('transactions.created_at', 'desc')
    .limit(pageSize).offset((page - 1) * pageSize);
  return { list, total: total.count, page, pageSize };
}

async function undoTransaction(txId, operatorId, operatorRole) {
  const AppError = require('../middleware/errorHandler').AppError;
  const tx = await db('transactions').where({ id: txId }).first();
  if (!tx) throw new AppError('流水不存在', 404);
  if (tx.type !== 'consume') throw new AppError('只能撤销消费记录', 400);

  // Authorization: only the original operator or admin can undo
  if (operatorRole !== 'admin' && tx.operator_id !== operatorId) {
    throw new AppError('只能撤销自己的操作记录', 403);
  }

  const alreadyUndo = await db('transactions').where('note', `撤销消费流水#${txId}`).first();
  if (alreadyUndo) throw new AppError('该流水已经被撤销过了', 400);

  const card = await db('cards').where({ id: tx.card_id }).first();
  if (!card) throw new AppError('对应的卡片不存在', 404);

  return db.transaction(async (trx) => {
    let balance_after = card.balance;
    let count_after = card.remaining_count;
    
    if (card.type === 'value') {
      await trx('cards').where({ id: card.id }).update({
        balance: trx.raw('balance + ?', [tx.amount]),
        status: 'active'
      });
      balance_after = parseFloat(card.balance) + parseFloat(tx.amount);
    } else {
      await trx('cards').where({ id: card.id }).update({
        remaining_count: trx.raw('remaining_count + ?', [tx.count]),
        status: 'active'
      });
      count_after = card.remaining_count + tx.count;
    }

    const [newTxId] = await trx('transactions').insert({
      card_id: card.id,
      type: 'undo',
      amount: tx.amount,
      count: tx.count,
      balance_after: card.type === 'value' ? balance_after : null,
      count_after: card.type === 'count' ? count_after : null,
      operator_id: operatorId,
      note: `撤销消费流水#${txId}`
    });

    return trx('transactions').where({ id: newTxId }).first();
  });
}

module.exports = { listTransactions, exportTransactions, listCardTransactions, undoTransaction };
