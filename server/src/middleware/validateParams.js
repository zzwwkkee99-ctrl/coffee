/**
 * Parameter validation middleware for req.params and req.query
 * Complements the existing body-only validate() middleware.
 */

function validateParams(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: false,
    });
    if (error) {
      const messages = error.details.map((d) => d.message).join('; ');
      return res.status(400).json({ success: false, message: `参数错误: ${messages}` });
    }
    req.params = value;
    next();
  };
}

function validateQuery(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true, // remove unexpected query params
    });
    if (error) {
      const messages = error.details.map((d) => d.message).join('; ');
      return res.status(400).json({ success: false, message: `查询参数错误: ${messages}` });
    }
    req.query = value;
    next();
  };
}

module.exports = { validateParams, validateQuery };
