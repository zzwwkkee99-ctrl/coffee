const express = require('express');
const Joi = require('joi');
const validate = require('../middleware/validate');
const { validateParams, validateQuery } = require('../middleware/validateParams');
const requireRole = require('../middleware/role');
const authMiddleware = require('../middleware/auth');
const { requireIdempotencyKey } = require('../middleware/idempotency');
const { audit } = require('../middleware/auditMiddleware');
const { listStaff, createStaff, updateStaffStatus } = require('../services/staffService');
const { listCustomers, createCustomer, findOrCreateCustomer, resetPassword } = require('../services/customerService');
const { issueCard, getCardByNo, listCards, listCardsByPhone, consumeCard, rechargeCard, rechargeCountCard } = require('../services/cardService');
const { listTransactions, exportTransactions } = require('../services/transactionService');
const { listTemplates, createTemplate, updateTemplateStatus } = require('../services/cardTemplateService');

const router = express.Router();
router.use(authMiddleware('admin'));

// --- Common param schemas ---
const idParamSchema = Joi.object({
  id: Joi.number().integer().positive().required().messages({
    'number.base': 'ID 必须为数字',
    'number.integer': 'ID 必须为整数',
    'number.positive': 'ID 必须大于 0',
  }),
});

const paginationQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(100).default(20),
}).unknown(true); // allow additional filters

const phoneParamSchema = Joi.object({
  phone: Joi.string().pattern(/^1\d{10}$/).required().messages({
    'string.pattern.base': '手机号格式无效',
  }),
});

const cardNoParamSchema = Joi.object({
  cardNo: Joi.string().pattern(/^CF[A-Z0-9]+$/).required().messages({
    'string.pattern.base': '卡号格式无效',
  }),
});

// --- Staff (admin-only) ---
router.get('/staff', requireRole('admin'), async (req, res, next) => {
  try { res.json({ success: true, data: await listStaff() }); } catch (e) { next(e); }
});

router.post('/staff', requireRole('admin'), validate(Joi.object({
  phone: Joi.string().pattern(/^1\d{10}$/).required(),
  password: Joi.string().min(6).max(50).required(),
  name: Joi.string().max(50).required(),
})), audit('CREATE_STAFF'), async (req, res, next) => {
  try { res.json({ success: true, data: await createStaff(req.body) }); } catch (e) { next(e); }
});

router.patch('/staff/:id/status', requireRole('admin'),
  validateParams(idParamSchema),
  validate(Joi.object({
    status: Joi.string().valid('active', 'disabled').required(),
  })),
  audit('UPDATE_STAFF_STATUS'),
  async (req, res, next) => {
    try { res.json({ success: true, data: await updateStaffStatus(req.params.id, req.body.status) }); } catch (e) { next(e); }
  }
);

// --- Customers ---
router.get('/customers',
  validateQuery(Joi.object({
    page: Joi.number().integer().min(1).default(1),
    pageSize: Joi.number().integer().min(1).max(100).default(20),
    search: Joi.string().max(50).allow('').default(''),
  })),
  async (req, res, next) => {
    try {
      const { page, pageSize, search } = req.query;
      res.json({ success: true, data: await listCustomers({ page, pageSize, search }) });
    } catch (e) { next(e); }
  }
);

router.post('/customers', requireRole('admin'), validate(Joi.object({
  phone: Joi.string().pattern(/^1\d{10}$/).required(),
  name: Joi.string().max(50).required(),
  password: Joi.string().min(6).max(50).optional(),
})), audit('CREATE_CUSTOMER'), async (req, res, next) => {
  try { res.json({ success: true, data: await createCustomer(req.body) }); } catch (e) { next(e); }
});

router.post('/customers/:id/reset-password', requireRole('admin'),
  validateParams(idParamSchema),
  requireIdempotencyKey,
  audit('RESET_PASSWORD'),
  async (req, res, next) => {
    try { res.json({ success: true, data: await resetPassword(req.params.id) }); } catch (e) { next(e); }
  }
);

// --- Card Templates ---
router.get('/card-templates', async (req, res, next) => {
  try {
    const includeDisabled = req.query.includeDisabled === 'true';
    res.json({ success: true, data: await listTemplates(includeDisabled) });
  } catch (e) { next(e); }
});

router.post('/card-templates', requireRole('admin'), validate(Joi.object({
  name: Joi.string().max(100).required(),
  type: Joi.string().valid('value', 'count').required(),
  amount: Joi.number().positive().when('type', { is: 'value', then: Joi.required() }),
  count: Joi.number().integer().positive().when('type', { is: 'count', then: Joi.required() }),
})), audit('CREATE_TEMPLATE'), async (req, res, next) => {
  try { res.json({ success: true, data: await createTemplate(req.body) }); } catch (e) { next(e); }
});

router.patch('/card-templates/:id/status', requireRole('admin'),
  validateParams(idParamSchema),
  validate(Joi.object({
    status: Joi.string().valid('active', 'disabled').required(),
  })),
  audit('UPDATE_TEMPLATE_STATUS'),
  async (req, res, next) => {
    try { res.json({ success: true, data: await updateTemplateStatus(req.params.id, req.body.status) }); } catch (e) { next(e); }
  }
);

// --- Cards ---
router.post('/cards',
  requireIdempotencyKey,
  validate(Joi.object({
    phone: Joi.string().pattern(/^1\d{10}$/).required(),
    name: Joi.string().max(50).allow('').optional(),
    templateId: Joi.number().integer().positive().required(),
    memo: Joi.string().max(255).allow('').optional(),
  })),
  audit('ISSUE_CARD'),
  async (req, res, next) => {
    try {
      const { phone, name, templateId, memo } = req.body;
      const { customer } = await findOrCreateCustomer({ phone, name });
      const tpl = await require('../services/cardTemplateService').getTemplate(templateId);
      const data = await issueCard({
        customerId: customer.id,
        type: tpl.type,
        amount: tpl.amount,
        count: tpl.count,
        memo: memo || tpl.name,
        issuedBy: req.user.id,
        templateId: tpl.id,
      });
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }
);

router.get('/cards',
  validateQuery(Joi.object({
    page: Joi.number().integer().min(1).default(1),
    pageSize: Joi.number().integer().min(1).max(100).default(20),
    customerId: Joi.number().integer().positive().optional(),
    type: Joi.string().valid('value', 'count').optional(),
    status: Joi.string().valid('active', 'exhausted', 'disabled').optional(),
  })),
  async (req, res, next) => {
    try {
      const { page, pageSize, customerId, type, status } = req.query;
      res.json({ success: true, data: await listCards({ page, pageSize, customerId, type, status }) });
    } catch (e) { next(e); }
  }
);

router.get('/cards/by-phone/:phone',
  validateParams(phoneParamSchema),
  async (req, res, next) => {
    try {
      res.json({ success: true, data: await listCardsByPhone(req.params.phone) });
    } catch (e) { next(e); }
  }
);

router.get('/cards/:cardNo',
  validateParams(cardNoParamSchema),
  async (req, res, next) => {
    try { res.json({ success: true, data: await getCardByNo(req.params.cardNo) }); } catch (e) { next(e); }
  }
);

router.post('/cards/:id/consume',
  validateParams(idParamSchema),
  requireIdempotencyKey,
  validate(Joi.object({
    amount: Joi.number().positive().optional(),
    count: Joi.number().integer().positive().optional(),
    note: Joi.string().max(255).allow('').optional(),
  }).oxor('amount', 'count')), // at most one of amount or count
  audit('CONSUME'),
  async (req, res, next) => {
    try {
      const data = await consumeCard({ cardId: req.params.id, ...req.body, operatorId: req.user.id });
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }
);

router.post('/cards/:id/recharge',
  validateParams(idParamSchema),
  requireIdempotencyKey,
  validate(Joi.object({
    amount: Joi.number().positive().optional(),
    count: Joi.number().integer().positive().optional(),
    note: Joi.string().max(255).allow('').optional(),
  })),
  audit('RECHARGE'),
  async (req, res, next) => {
    try {
      const card = await require('../config/db')('cards').where({ id: req.params.id }).first();
      if (!card) return res.status(404).json({ success: false, message: '卡不存在' });

      let data;
      if (card.type === 'value') {
        data = await rechargeCard({ cardId: req.params.id, amount: req.body.amount, operatorId: req.user.id, note: req.body.note });
      } else {
        data = await rechargeCountCard({ cardId: req.params.id, count: req.body.count, operatorId: req.user.id, note: req.body.note });
      }
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }
);

// --- Transactions ---
router.post('/transactions/:id/undo',
  validateParams(idParamSchema),
  requireIdempotencyKey,
  audit('UNDO_TRANSACTION'),
  async (req, res, next) => {
    try {
      const data = await require('../services/transactionService').undoTransaction(req.params.id, req.user.id, req.user.role);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }
);

router.get('/transactions',
  validateQuery(Joi.object({
    page: Joi.number().integer().min(1).default(1),
    pageSize: Joi.number().integer().min(1).max(100).default(20),
    cardId: Joi.number().integer().positive().optional(),
    operatorId: Joi.number().integer().positive().optional(),
    startDate: Joi.string().isoDate().optional(),
    endDate: Joi.string().isoDate().optional(),
  })),
  async (req, res, next) => {
    try {
      const { page, pageSize, cardId, operatorId, startDate, endDate } = req.query;
      res.json({ success: true, data: await listTransactions({ page, pageSize, cardId, operatorId, startDate, endDate }) });
    } catch (e) { next(e); }
  }
);

router.get('/transactions/export', requireRole('admin'),
  validateQuery(Joi.object({
    cardId: Joi.number().integer().positive().optional(),
    operatorId: Joi.number().integer().positive().optional(),
    startDate: Joi.string().isoDate().optional(),
    endDate: Joi.string().isoDate().optional(),
  })),
  audit('EXPORT_TRANSACTIONS'),
  async (req, res, next) => {
    try {
      const { cardId, operatorId, startDate, endDate } = req.query;
      const rows = await exportTransactions({ cardId, operatorId, startDate, endDate });

      const typeMap = { issue: '开卡', consume: '消费', recharge: '充值' };
      const header = 'ID,卡号,卡类型,客户姓名,客户手机号,交易类型,金额,次数,余额(后),次数(后),操作人,备注,时间\n';
      const csv = header + rows.map(r => [
        r.id,
        r.card_no,
        r.card_type === 'value' ? '储值卡' : '次卡',
        r.customer_name,
        r.customer_phone,
        typeMap[r.type] || r.type,
        r.amount ?? '',
        r.count ?? '',
        r.balance_after ?? '',
        r.count_after ?? '',
        r.operator_name || '',
        (r.note || '').replace(/,/g, '，'),
        new Date(r.created_at).toLocaleString('zh-CN'),
      ].join(',')).join('\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=transactions_${Date.now()}.csv`);
      // Add BOM for Excel compatibility
      res.send('\uFEFF' + csv);
    } catch (e) { next(e); }
  }
);

module.exports = router;
