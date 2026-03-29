const express = require('express');
const Joi = require('joi');
const validate = require('../middleware/validate');
const { validateParams, validateQuery } = require('../middleware/validateParams');
const authMiddleware = require('../middleware/auth');
const { audit } = require('../middleware/auditMiddleware');
const db = require('../config/db');
const { listCardTransactions } = require('../services/transactionService');
const { changePassword } = require('../services/customerService');

const router = express.Router();
router.use(authMiddleware('customer'));

const idParamSchema = Joi.object({
  id: Joi.number().integer().positive().required().messages({
    'number.base': 'ID 必须为数字',
    'number.integer': 'ID 必须为整数',
    'number.positive': 'ID 必须大于 0',
  }),
});

router.get('/cards', async (req, res, next) => {
  try {
    const cards = await db('cards')
      .where({ customer_id: req.user.id })
      .select('id', 'card_no', 'type', 'balance', 'remaining_count', 'total_value', 'total_count', 'memo', 'status', 'created_at')
      .orderBy('created_at', 'desc');
    res.json({ success: true, data: cards });
  } catch (e) { next(e); }
});

router.get('/cards/:id',
  validateParams(idParamSchema),
  async (req, res, next) => {
    try {
      const card = await db('cards')
        .where({ id: req.params.id, customer_id: req.user.id })
        .first();
      if (!card) return res.status(404).json({ success: false, message: '卡不存在' });
      res.json({ success: true, data: card });
    } catch (e) { next(e); }
  }
);

router.get('/cards/:id/transactions',
  validateParams(idParamSchema),
  validateQuery(Joi.object({
    page: Joi.number().integer().min(1).default(1),
    pageSize: Joi.number().integer().min(1).max(100).default(20),
  })),
  async (req, res, next) => {
    try {
      const card = await db('cards').where({ id: req.params.id, customer_id: req.user.id }).first();
      if (!card) return res.status(404).json({ success: false, message: '卡不存在' });
      const { page, pageSize } = req.query;
      res.json({ success: true, data: await listCardTransactions(req.params.id, { page, pageSize }) });
    } catch (e) { next(e); }
  }
);

router.post('/change-password',
  validate(Joi.object({
    oldPassword: Joi.string().required(),
    newPassword: Joi.string().min(6).max(50).required(),
  })),
  audit('CHANGE_PASSWORD'),
  async (req, res, next) => {
    try {
      const data = await changePassword(req.user.id, req.body.oldPassword, req.body.newPassword);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }
);

module.exports = router;
