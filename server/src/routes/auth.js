const express = require('express');
const Joi = require('joi');
const validate = require('../middleware/validate');
const { loginLimiter, recordFailedAttempt, clearFailedAttempts } = require('../middleware/loginLimiter');
const { auditLog } = require('../utils/auditLog');
const { adminLogin, customerLogin } = require('../services/authService');

const router = express.Router();

const loginSchema = Joi.object({
  phone: Joi.string().pattern(/^1\d{10}$/).required().messages({
    'string.pattern.base': '请输入有效的手机号',
  }),
  password: Joi.string().min(6).max(50).required(),
});

router.post('/admin/login', validate(loginSchema), loginLimiter, async (req, res, next) => {
  try {
    const result = await adminLogin(req.body.phone, req.body.password);
    clearFailedAttempts(req.body.phone);
    auditLog('LOGIN_SUCCESS', {
      message: `管理端登录成功: ${req.body.phone}`,
      phone: req.body.phone,
      userId: result.user.id,
      ip: req.ip || req.connection.remoteAddress,
      userType: 'admin',
    });
    res.json({ success: true, data: result });
  } catch (err) {
    if (err.statusCode === 401) {
      const remaining = recordFailedAttempt(req.body.phone);
      auditLog('LOGIN_FAIL', {
        message: `管理端登录失败: ${req.body.phone}`,
        phone: req.body.phone,
        ip: req.ip || req.connection.remoteAddress,
        userType: 'admin',
        remainingAttempts: remaining,
      });
    }
    next(err);
  }
});

router.post('/customer/login', validate(loginSchema), loginLimiter, async (req, res, next) => {
  try {
    const result = await customerLogin(req.body.phone, req.body.password);
    clearFailedAttempts(req.body.phone);
    auditLog('LOGIN_SUCCESS', {
      message: `客户端登录成功: ${req.body.phone}`,
      phone: req.body.phone,
      userId: result.user.id,
      ip: req.ip || req.connection.remoteAddress,
      userType: 'customer',
    });
    res.json({ success: true, data: result });
  } catch (err) {
    if (err.statusCode === 401) {
      const remaining = recordFailedAttempt(req.body.phone);
      auditLog('LOGIN_FAIL', {
        message: `客户端登录失败: ${req.body.phone}`,
        phone: req.body.phone,
        ip: req.ip || req.connection.remoteAddress,
        userType: 'customer',
        remainingAttempts: remaining,
      });
    }
    next(err);
  }
});

module.exports = router;
