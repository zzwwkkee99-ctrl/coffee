# Coffee Card System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an MVP card issuance and consumption system for a coffee shop with admin web, admin H5, and customer H5.

**Architecture:** Single-server Node.js + Express backend with Knex.js ORM and MySQL. Three frontend clients: React + Ant Design admin web (PC), native HTML admin H5 (mobile scan), native HTML customer H5 (show QR code).

**Tech Stack:** Node.js 18, Express 4, Knex.js, MySQL 8, React 18, Vite 5, Ant Design 5, TypeScript, html5-qrcode, qrcode.js

**Spec:** `docs/superpowers/specs/2026-03-24-coffee-card-system-design.md`

---

## File Structure

### Backend (`server/`)

| File | Responsibility |
|------|---------------|
| `server/src/app.js` | Express app entry, middleware setup, mount routes |
| `server/src/config/db.js` | Knex instance and DB connection config |
| `server/src/config/index.js` | Central config (JWT secret, port, etc.) from env |
| `server/src/middleware/auth.js` | JWT verification middleware |
| `server/src/middleware/role.js` | Role-based access control middleware |
| `server/src/middleware/errorHandler.js` | Global error handler |
| `server/src/middleware/validate.js` | Joi validation middleware factory |
| `server/src/routes/auth.js` | Login routes (admin + customer) |
| `server/src/routes/admin.js` | Admin API routes (staff, customers, cards, transactions) |
| `server/src/routes/customer.js` | Customer API routes (my cards, transactions) |
| `server/src/services/authService.js` | Login, password hashing, JWT generation |
| `server/src/services/staffService.js` | Staff CRUD |
| `server/src/services/customerService.js` | Customer CRUD |
| `server/src/services/cardService.js` | Card issue, consume, recharge, query |
| `server/src/services/transactionService.js` | Transaction logging and query |
| `server/src/utils/cardNo.js` | Card number generator |
| `server/migrations/001_create_users.js` | users table |
| `server/migrations/002_create_customers.js` | customers table |
| `server/migrations/003_create_cards.js` | cards table |
| `server/migrations/004_create_transactions.js` | transactions table |
| `server/seeds/001_admin_user.js` | Default admin account |
| `server/knexfile.js` | Knex config (reads .env) |
| `server/package.json` | Dependencies |
| `server/.env.example` | Env template |

### Admin Web (`admin-web/`)

| File | Responsibility |
|------|---------------|
| `admin-web/src/main.tsx` | React app entry |
| `admin-web/src/App.tsx` | Root component with router |
| `admin-web/src/router/index.tsx` | Route definitions + auth guard |
| `admin-web/src/services/api.ts` | Axios instance with auth interceptor |
| `admin-web/src/stores/authStore.ts` | Zustand auth state (token, user) |
| `admin-web/src/pages/Login/index.tsx` | Login page |
| `admin-web/src/pages/Layout/index.tsx` | Main layout with sidebar nav |
| `admin-web/src/pages/Staff/index.tsx` | Staff management page |
| `admin-web/src/pages/Customers/index.tsx` | Customer management page |
| `admin-web/src/pages/Cards/Issue.tsx` | Card issuance page |
| `admin-web/src/pages/Cards/List.tsx` | Card list page |
| `admin-web/src/pages/Cards/Verify.tsx` | QR scan + consume page |
| `admin-web/src/pages/Cards/Recharge.tsx` | Recharge page |
| `admin-web/src/pages/Transactions/index.tsx` | Transaction records page |
| `admin-web/vite.config.ts` | Vite config with API proxy |
| `admin-web/tsconfig.json` | TS config |
| `admin-web/package.json` | Dependencies |

### Admin H5 (`public/admin/`)

| File | Responsibility |
|------|---------------|
| `public/admin/login.html` | Login page |
| `public/admin/scan.html` | Scan QR + consume page |
| `public/admin/records.html` | Recent verification records |
| `public/admin/css/admin.css` | Styles |
| `public/admin/js/auth.js` | Login, token management |
| `public/admin/js/scanner.js` | Camera + QR scanning |
| `public/admin/js/admin-app.js` | Consume logic, records fetch |

### Customer H5 (`public/customer/`)

| File | Responsibility |
|------|---------------|
| `public/customer/login.html` | Login page |
| `public/customer/cards.html` | My cards list |
| `public/customer/card-detail.html` | Card detail + QR code |
| `public/customer/css/customer.css` | Styles |
| `public/customer/js/auth.js` | Login, token management |
| `public/customer/js/customer-app.js` | Card list, detail logic |
| `public/customer/js/qrcode-render.js` | QR code rendering |

---

## Task 1: Project Setup & Database

### Task 1.1: Initialize Backend Project

**Files:**
- Create: `server/package.json`
- Create: `server/.env.example`
- Create: `server/knexfile.js`
- Create: `server/src/config/index.js`
- Create: `server/src/config/db.js`

- [ ] **Step 1: Create server directory and initialize npm**

```bash
mkdir -p server/src/config server/src/middleware server/src/routes server/src/services server/src/utils server/migrations server/seeds
cd server && npm init -y
```

- [ ] **Step 2: Install backend dependencies**

```bash
cd server && npm install express knex mysql2 jsonwebtoken bcryptjs joi winston dotenv cors helmet express-rate-limit
npm install --save-dev nodemon
```

- [ ] **Step 3: Create .env.example**

Create `server/.env.example`:
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=root
DB_NAME=coffee_card
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d
PORT=3001
```

- [ ] **Step 4: Create config/index.js**

Create `server/src/config/index.js`:
```javascript
require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3001,
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'coffee_card',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
};
```

- [ ] **Step 5: Create knexfile.js**

Create `server/knexfile.js`:
```javascript
const config = require('./src/config');

module.exports = {
  development: {
    client: 'mysql2',
    connection: {
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
      database: config.db.database,
    },
    migrations: { directory: './migrations' },
    seeds: { directory: './seeds' },
  },
  production: {
    client: 'mysql2',
    connection: {
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
      database: config.db.database,
    },
    migrations: { directory: './migrations' },
    seeds: { directory: './seeds' },
  },
};
```

- [ ] **Step 6: Create config/db.js**

Create `server/src/config/db.js`:
```javascript
const knex = require('knex');
const knexfile = require('../../knexfile');

const env = process.env.NODE_ENV || 'development';
const db = knex(knexfile[env]);

module.exports = db;
```

- [ ] **Step 7: Add dev script to package.json**

In `server/package.json`, add to scripts:
```json
{
  "scripts": {
    "dev": "nodemon src/app.js",
    "start": "node src/app.js",
    "migrate": "knex migrate:latest",
    "migrate:rollback": "knex migrate:rollback",
    "seed": "knex seed:run"
  }
}
```

- [ ] **Step 8: Commit**

```bash
git add server/
git commit -m "chore: initialize backend project structure"
```

---

### Task 1.2: Database Migrations

**Files:**
- Create: `server/migrations/001_create_users.js`
- Create: `server/migrations/002_create_customers.js`
- Create: `server/migrations/003_create_cards.js`
- Create: `server/migrations/004_create_transactions.js`

- [ ] **Step 1: Create users migration**

Create `server/migrations/001_create_users.js`:
```javascript
exports.up = function (knex) {
  return knex.schema.createTable('users', (table) => {
    table.increments('id').primary();
    table.string('phone', 20).notNullable().unique();
    table.string('password_hash', 255).notNullable();
    table.string('name', 50).notNullable();
    table.enum('role', ['admin', 'staff']).notNullable();
    table.enum('status', ['active', 'disabled']).defaultTo('active');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('users');
};
```

- [ ] **Step 2: Create customers migration**

Create `server/migrations/002_create_customers.js`:
```javascript
exports.up = function (knex) {
  return knex.schema.createTable('customers', (table) => {
    table.increments('id').primary();
    table.string('phone', 20).notNullable().unique();
    table.string('password_hash', 255).notNullable();
    table.string('name', 50).notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('customers');
};
```

- [ ] **Step 3: Create cards migration**

Create `server/migrations/003_create_cards.js`:
```javascript
exports.up = function (knex) {
  return knex.schema.createTable('cards', (table) => {
    table.increments('id').primary();
    table.string('card_no', 32).notNullable().unique();
    table.integer('customer_id').unsigned().notNullable()
      .references('id').inTable('customers').onDelete('RESTRICT');
    table.enum('type', ['value', 'count']).notNullable();
    table.decimal('balance', 10, 2).defaultTo(0);
    table.integer('remaining_count').defaultTo(0);
    table.decimal('total_value', 10, 2).defaultTo(0);
    table.integer('total_count').defaultTo(0);
    table.string('memo', 255).nullable();
    table.enum('status', ['active', 'exhausted', 'disabled']).defaultTo('active');
    table.integer('issued_by').unsigned().notNullable()
      .references('id').inTable('users').onDelete('RESTRICT');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.index(['customer_id', 'status']);
    table.index('issued_by');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('cards');
};
```

- [ ] **Step 4: Create transactions migration**

Create `server/migrations/004_create_transactions.js`:
```javascript
exports.up = function (knex) {
  return knex.schema.createTable('transactions', (table) => {
    table.increments('id').primary();
    table.integer('card_id').unsigned().notNullable()
      .references('id').inTable('cards').onDelete('RESTRICT');
    table.enum('type', ['issue', 'consume', 'recharge']).notNullable();
    table.decimal('amount', 10, 2).nullable();
    table.integer('count').nullable();
    table.decimal('balance_after', 10, 2).nullable();
    table.integer('count_after').nullable();
    table.integer('operator_id').unsigned().notNullable()
      .references('id').inTable('users').onDelete('RESTRICT');
    table.string('note', 255).nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index(['card_id', 'created_at']);
    table.index('operator_id');
    table.index('created_at');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('transactions');
};
```

- [ ] **Step 5: Create seed for default admin**

Create `server/seeds/001_admin_user.js`:
```javascript
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
```

- [ ] **Step 6: Start MySQL and run migrations**

```bash
# Start MySQL (Docker)
docker run -d --name coffee-mysql -p 3306:3306 \
  -e MYSQL_ROOT_PASSWORD=root \
  -e MYSQL_DATABASE=coffee_card \
  mysql:8.0

# Wait for MySQL to be ready, then:
cd server
cp .env.example .env
npx knex migrate:latest
npx knex seed:run
```

Expected: 4 migrations run, 1 seed inserted.

- [ ] **Step 7: Commit**

```bash
git add server/migrations/ server/seeds/
git commit -m "feat: add database migrations and admin seed"
```

---

## Task 2: Backend API — Auth & Middleware

### Task 2.1: Error Handler & Validation Middleware

**Files:**
- Create: `server/src/middleware/errorHandler.js`
- Create: `server/src/middleware/validate.js`

- [ ] **Step 1: Create error handler**

Create `server/src/middleware/errorHandler.js`:
```javascript
const logger = require('../utils/logger');

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : '服务器内部错误';

  logger.error(`${statusCode} - ${err.message}`, {
    path: req.path,
    method: req.method,
    stack: err.stack,
  });

  res.status(statusCode).json({
    success: false,
    message,
  });
}

module.exports = { AppError, errorHandler };
```

- [ ] **Step 2: Create logger utility**

Create `server/src/utils/logger.js`:
```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

module.exports = logger;
```

- [ ] **Step 3: Create validation middleware**

Create `server/src/middleware/validate.js`:
```javascript
function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) {
      const messages = error.details.map((d) => d.message).join('; ');
      return res.status(400).json({ success: false, message: messages });
    }
    req.body = value;
    next();
  };
}

module.exports = validate;
```

- [ ] **Step 4: Commit**

```bash
git add server/src/middleware/ server/src/utils/
git commit -m "feat: add error handler, logger, and validation middleware"
```

---

### Task 2.2: Auth Middleware & Auth Routes

**Files:**
- Create: `server/src/middleware/auth.js`
- Create: `server/src/middleware/role.js`
- Create: `server/src/services/authService.js`
- Create: `server/src/routes/auth.js`
- Create: `server/src/utils/cardNo.js`

- [ ] **Step 1: Create JWT auth middleware**

Create `server/src/middleware/auth.js`:
```javascript
const jwt = require('jsonwebtoken');
const config = require('../config');
const { AppError } = require('./errorHandler');

function authMiddleware(userType) {
  return (req, res, next) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw new AppError('未登录，请先登录', 401);
    }
    try {
      const token = header.split(' ')[1];
      const decoded = jwt.verify(token, config.jwt.secret);
      if (decoded.userType !== userType) {
        throw new AppError('无权访问', 403);
      }
      req.user = decoded;
      next();
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw new AppError('登录已过期，请重新登录', 401);
      }
      if (err.isOperational) throw err;
      throw new AppError('无效的登录凭证', 401);
    }
  };
}

module.exports = authMiddleware;
```

- [ ] **Step 2: Create role middleware**

Create `server/src/middleware/role.js`:
```javascript
const { AppError } = require('./errorHandler');

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new AppError('权限不足', 403);
    }
    next();
  };
}

module.exports = requireRole;
```

- [ ] **Step 3: Create auth service**

Create `server/src/services/authService.js`:
```javascript
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const config = require('../config');
const { AppError } = require('../middleware/errorHandler');

async function adminLogin(phone, password) {
  const user = await db('users').where({ phone, status: 'active' }).first();
  if (!user) throw new AppError('手机号或密码错误', 401);

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw new AppError('手机号或密码错误', 401);

  const token = jwt.sign(
    { id: user.id, phone: user.phone, name: user.name, role: user.role, userType: 'admin' },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );

  return {
    token,
    user: { id: user.id, phone: user.phone, name: user.name, role: user.role },
  };
}

async function customerLogin(phone, password) {
  const customer = await db('customers').where({ phone }).first();
  if (!customer) throw new AppError('手机号或密码错误', 401);

  const valid = await bcrypt.compare(password, customer.password_hash);
  if (!valid) throw new AppError('手机号或密码错误', 401);

  const token = jwt.sign(
    { id: customer.id, phone: customer.phone, name: customer.name, userType: 'customer' },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );

  return {
    token,
    user: { id: customer.id, phone: customer.phone, name: customer.name },
  };
}

module.exports = { adminLogin, customerLogin };
```

- [ ] **Step 4: Create auth routes**

Create `server/src/routes/auth.js`:
```javascript
const express = require('express');
const Joi = require('joi');
const validate = require('../middleware/validate');
const { adminLogin, customerLogin } = require('../services/authService');

const router = express.Router();

const loginSchema = Joi.object({
  phone: Joi.string().pattern(/^1\d{10}$/).required().messages({
    'string.pattern.base': '请输入有效的手机号',
  }),
  password: Joi.string().min(6).max(50).required(),
});

router.post('/admin/login', validate(loginSchema), async (req, res, next) => {
  try {
    const result = await adminLogin(req.body.phone, req.body.password);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.post('/customer/login', validate(loginSchema), async (req, res, next) => {
  try {
    const result = await customerLogin(req.body.phone, req.body.password);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
```

- [ ] **Step 5: Create card number generator**

Create `server/src/utils/cardNo.js`:
```javascript
const crypto = require('crypto');

function generateCardNo() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `CF${timestamp}${random}`;
}

module.exports = { generateCardNo };
```

- [ ] **Step 6: Commit**

```bash
git add server/src/
git commit -m "feat: add auth middleware, auth service, and auth routes"
```

---

## Task 3: Backend API — Admin Routes

### Task 3.1: Staff & Customer Services

**Files:**
- Create: `server/src/services/staffService.js`
- Create: `server/src/services/customerService.js`

- [ ] **Step 1: Create staff service**

Create `server/src/services/staffService.js`:
```javascript
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
```

- [ ] **Step 2: Create customer service**

Create `server/src/services/customerService.js`:
```javascript
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
  const total = await query.clone().count('* as count').first();
  const list = await query.orderBy('created_at', 'desc')
    .limit(pageSize).offset((page - 1) * pageSize);
  return { list, total: total.count, page, pageSize };
}

async function createCustomer({ phone, password, name }) {
  const existing = await db('customers').where({ phone }).first();
  if (existing) throw new AppError('该手机号已注册', 409);

  const hash = await bcrypt.hash(password, 10);
  const [id] = await db('customers').insert({
    phone, password_hash: hash, name,
  });
  return { id, phone, name };
}

module.exports = { listCustomers, createCustomer };
```

- [ ] **Step 3: Commit**

```bash
git add server/src/services/
git commit -m "feat: add staff and customer services"
```

---

### Task 3.2: Card & Transaction Services

**Files:**
- Create: `server/src/services/cardService.js`
- Create: `server/src/services/transactionService.js`

- [ ] **Step 1: Create card service**

Create `server/src/services/cardService.js`:
```javascript
const db = require('../config/db');
const { AppError } = require('../middleware/errorHandler');
const { generateCardNo } = require('../utils/cardNo');

async function issueCard({ customerId, type, amount, count, memo, issuedBy }) {
  const customer = await db('customers').where({ id: customerId }).first();
  if (!customer) throw new AppError('客户不存在', 404);

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
    .select('cards.*', 'customers.name as customer_name', 'customers.phone as customer_phone');

  if (customerId) query.where('cards.customer_id', customerId);
  if (type) query.where('cards.type', type);
  if (status) query.where('cards.status', status);

  const total = await query.clone().count('* as count').first();
  const list = await query.orderBy('cards.created_at', 'desc')
    .limit(pageSize).offset((page - 1) * pageSize);
  return { list, total: total.count, page, pageSize };
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
      await trx('transactions').insert({
        card_id: cardId, type: 'consume', amount,
        balance_after: updated.balance, operator_id: operatorId, note,
      });

      if (parseFloat(updated.balance) === 0) {
        await trx('cards').where({ id: cardId }).update({ status: 'exhausted' });
      }
      return trx('cards').where({ id: cardId }).first();

    } else {
      const deduct = count || 1;
      const affected = await trx('cards')
        .where({ id: cardId, status: 'active' })
        .whereRaw('remaining_count >= ?', [deduct])
        .update({ remaining_count: trx.raw('remaining_count - ?', [deduct]) });
      if (!affected) throw new AppError('剩余次数不足', 400);

      const updated = await trx('cards').where({ id: cardId }).first();
      await trx('transactions').insert({
        card_id: cardId, type: 'consume', count: deduct,
        count_after: updated.remaining_count, operator_id: operatorId, note,
      });

      if (updated.remaining_count === 0) {
        await trx('cards').where({ id: cardId }).update({ status: 'exhausted' });
      }
      return trx('cards').where({ id: cardId }).first();
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

module.exports = { issueCard, getCardByNo, listCards, consumeCard, rechargeCard };
```

- [ ] **Step 2: Create transaction service**

Create `server/src/services/transactionService.js`:
```javascript
const db = require('../config/db');

async function listTransactions({ page = 1, pageSize = 20, cardId, operatorId, startDate, endDate }) {
  const query = db('transactions')
    .join('cards', 'transactions.card_id', 'cards.id')
    .join('customers', 'cards.customer_id', 'customers.id')
    .join('users', 'transactions.operator_id', 'users.id')
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

  const total = await query.clone().count('* as count').first();
  const list = await query.orderBy('transactions.created_at', 'desc')
    .limit(pageSize).offset((page - 1) * pageSize);
  return { list, total: total.count, page, pageSize };
}

async function listCardTransactions(cardId, { page = 1, pageSize = 20 }) {
  const total = await db('transactions').where({ card_id: cardId }).count('* as count').first();
  const list = await db('transactions')
    .join('users', 'transactions.operator_id', 'users.id')
    .select('transactions.*', 'users.name as operator_name')
    .where('transactions.card_id', cardId)
    .orderBy('transactions.created_at', 'desc')
    .limit(pageSize).offset((page - 1) * pageSize);
  return { list, total: total.count, page, pageSize };
}

module.exports = { listTransactions, listCardTransactions };
```

- [ ] **Step 3: Commit**

```bash
git add server/src/services/
git commit -m "feat: add card and transaction services"
```

---

### Task 3.3: Admin & Customer Routes + App Entry

**Files:**
- Create: `server/src/routes/admin.js`
- Create: `server/src/routes/customer.js`
- Create: `server/src/app.js`

- [ ] **Step 1: Create admin routes**

Create `server/src/routes/admin.js`:
```javascript
const express = require('express');
const Joi = require('joi');
const validate = require('../middleware/validate');
const requireRole = require('../middleware/role');
const authMiddleware = require('../middleware/auth');
const { listStaff, createStaff, updateStaffStatus } = require('../services/staffService');
const { listCustomers, createCustomer } = require('../services/customerService');
const { issueCard, getCardByNo, listCards, consumeCard, rechargeCard } = require('../services/cardService');
const { listTransactions } = require('../services/transactionService');

const router = express.Router();
router.use(authMiddleware('admin'));

// --- Staff ---
router.get('/staff', requireRole('admin'), async (req, res, next) => {
  try { res.json({ success: true, data: await listStaff() }); } catch (e) { next(e); }
});

router.post('/staff', requireRole('admin'), validate(Joi.object({
  phone: Joi.string().pattern(/^1\d{10}$/).required(),
  password: Joi.string().min(6).max(50).required(),
  name: Joi.string().max(50).required(),
})), async (req, res, next) => {
  try { res.json({ success: true, data: await createStaff(req.body) }); } catch (e) { next(e); }
});

router.patch('/staff/:id/status', requireRole('admin'), validate(Joi.object({
  status: Joi.string().valid('active', 'disabled').required(),
})), async (req, res, next) => {
  try { res.json({ success: true, data: await updateStaffStatus(req.params.id, req.body.status) }); } catch (e) { next(e); }
});

// --- Customers ---
router.get('/customers', async (req, res, next) => {
  try {
    const { page, pageSize, search } = req.query;
    res.json({ success: true, data: await listCustomers({ page: +page || 1, pageSize: +pageSize || 20, search }) });
  } catch (e) { next(e); }
});

router.post('/customers', validate(Joi.object({
  phone: Joi.string().pattern(/^1\d{10}$/).required(),
  password: Joi.string().min(6).max(50).required(),
  name: Joi.string().max(50).required(),
})), async (req, res, next) => {
  try { res.json({ success: true, data: await createCustomer(req.body) }); } catch (e) { next(e); }
});

// --- Cards ---
router.post('/cards', validate(Joi.object({
  customerId: Joi.number().integer().positive().required(),
  type: Joi.string().valid('value', 'count').required(),
  amount: Joi.number().positive().when('type', { is: 'value', then: Joi.required() }),
  count: Joi.number().integer().positive().when('type', { is: 'count', then: Joi.required() }),
  memo: Joi.string().max(255).allow('').optional(),
})), async (req, res, next) => {
  try {
    const data = await issueCard({ ...req.body, issuedBy: req.user.id });
    res.json({ success: true, data });
  } catch (e) { next(e); }
});

router.get('/cards', async (req, res, next) => {
  try {
    const { page, pageSize, customerId, type, status } = req.query;
    res.json({ success: true, data: await listCards({ page: +page || 1, pageSize: +pageSize || 20, customerId, type, status }) });
  } catch (e) { next(e); }
});

router.get('/cards/:cardNo', async (req, res, next) => {
  try { res.json({ success: true, data: await getCardByNo(req.params.cardNo) }); } catch (e) { next(e); }
});

router.post('/cards/:id/consume', validate(Joi.object({
  amount: Joi.number().positive().optional(),
  count: Joi.number().integer().positive().optional(),
  note: Joi.string().max(255).allow('').optional(),
})), async (req, res, next) => {
  try {
    const data = await consumeCard({ cardId: req.params.id, ...req.body, operatorId: req.user.id });
    res.json({ success: true, data });
  } catch (e) { next(e); }
});

router.post('/cards/:id/recharge', validate(Joi.object({
  amount: Joi.number().positive().required(),
  note: Joi.string().max(255).allow('').optional(),
})), async (req, res, next) => {
  try {
    const data = await rechargeCard({ cardId: req.params.id, ...req.body, operatorId: req.user.id });
    res.json({ success: true, data });
  } catch (e) { next(e); }
});

// --- Transactions ---
router.get('/transactions', async (req, res, next) => {
  try {
    const { page, pageSize, cardId, operatorId, startDate, endDate } = req.query;
    res.json({ success: true, data: await listTransactions({ page: +page || 1, pageSize: +pageSize || 20, cardId, operatorId, startDate, endDate }) });
  } catch (e) { next(e); }
});

module.exports = router;
```

- [ ] **Step 2: Create customer routes**

Create `server/src/routes/customer.js`:
```javascript
const express = require('express');
const authMiddleware = require('../middleware/auth');
const db = require('../config/db');
const { listCardTransactions } = require('../services/transactionService');

const router = express.Router();
router.use(authMiddleware('customer'));

router.get('/cards', async (req, res, next) => {
  try {
    const cards = await db('cards')
      .where({ customer_id: req.user.id })
      .select('id', 'card_no', 'type', 'balance', 'remaining_count', 'total_value', 'total_count', 'memo', 'status', 'created_at')
      .orderBy('created_at', 'desc');
    res.json({ success: true, data: cards });
  } catch (e) { next(e); }
});

router.get('/cards/:id', async (req, res, next) => {
  try {
    const card = await db('cards')
      .where({ id: req.params.id, customer_id: req.user.id })
      .first();
    if (!card) return res.status(404).json({ success: false, message: '卡不存在' });
    res.json({ success: true, data: card });
  } catch (e) { next(e); }
});

router.get('/cards/:id/transactions', async (req, res, next) => {
  try {
    const card = await db('cards').where({ id: req.params.id, customer_id: req.user.id }).first();
    if (!card) return res.status(404).json({ success: false, message: '卡不存在' });
    const { page, pageSize } = req.query;
    res.json({ success: true, data: await listCardTransactions(req.params.id, { page: +page || 1, pageSize: +pageSize || 20 }) });
  } catch (e) { next(e); }
});

module.exports = router;
```

- [ ] **Step 3: Create app.js entry point**

Create `server/src/app.js`:
```javascript
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const { errorHandler } = require('./middleware/errorHandler');
const logger = require('./utils/logger');

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const customerRoutes = require('./routes/customer');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/customer', customerRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Coffee Card API is running' });
});

// Error handler (must be last)
app.use(errorHandler);

app.listen(config.port, () => {
  logger.info(`Server running on port ${config.port}`);
});

module.exports = app;
```

- [ ] **Step 4: Verify server starts**

```bash
cd server && npm run dev
```

Expected: `Server running on port 3001`

Test health check:
```bash
curl http://localhost:3001/api/health
```
Expected: `{"success":true,"message":"Coffee Card API is running"}`

- [ ] **Step 5: Test admin login**

```bash
curl -X POST http://localhost:3001/api/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"13800000000","password":"admin123"}'
```

Expected: `{"success":true,"data":{"token":"...","user":{"id":1,...,"role":"admin"}}}`

- [ ] **Step 6: Commit**

```bash
git add server/src/
git commit -m "feat: add admin routes, customer routes, and Express app entry"
```

---

## Task 4: Admin Web Frontend (React + Ant Design)

### Task 4.1: Initialize React Project

- [ ] **Step 1: Create Vite React project**

```bash
npx -y create-vite@latest admin-web --template react-ts
cd admin-web && npm install
```

- [ ] **Step 2: Install dependencies**

```bash
cd admin-web
npm install antd @ant-design/icons react-router-dom axios zustand dayjs
```

- [ ] **Step 3: Configure Vite proxy**

Overwrite `admin-web/vite.config.ts`:
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
```

- [ ] **Step 4: Commit**

```bash
git add admin-web/
git commit -m "chore: initialize admin web React project"
```

---

### Task 4.2: Auth Store, API Service & Router

**Files:**
- Create: `admin-web/src/services/api.ts`
- Create: `admin-web/src/stores/authStore.ts`
- Create: `admin-web/src/router/index.tsx`

- [ ] **Step 1: Create API service**

Create `admin-web/src/services/api.ts`:
```typescript
import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('admin_token');
      window.location.href = '/admin-web/login';
    }
    return Promise.reject(err.response?.data || err);
  }
);

export default api;
```

- [ ] **Step 2: Create auth store**

Create `admin-web/src/stores/authStore.ts`:
```typescript
import { create } from 'zustand';

interface User {
  id: number;
  phone: string;
  name: string;
  role: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
  isLoggedIn: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: localStorage.getItem('admin_token'),
  user: JSON.parse(localStorage.getItem('admin_user') || 'null'),
  setAuth: (token, user) => {
    localStorage.setItem('admin_token', token);
    localStorage.setItem('admin_user', JSON.stringify(user));
    set({ token, user });
  },
  logout: () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    set({ token: null, user: null });
  },
  isLoggedIn: () => !!get().token,
}));
```

- [ ] **Step 3: Create router with auth guard**

Create `admin-web/src/router/index.tsx`:
```tsx
import { Navigate, useRoutes } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import Login from '../pages/Login';
import Layout from '../pages/Layout';
import Staff from '../pages/Staff';
import Customers from '../pages/Customers';
import CardIssue from '../pages/Cards/Issue';
import CardList from '../pages/Cards/List';
import CardVerify from '../pages/Cards/Verify';
import CardRecharge from '../pages/Cards/Recharge';
import Transactions from '../pages/Transactions';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)();
  return isLoggedIn ? <>{children}</> : <Navigate to="/admin-web/login" />;
}

export default function AppRouter() {
  return useRoutes([
    { path: '/admin-web/login', element: <Login /> },
    {
      path: '/admin-web',
      element: <PrivateRoute><Layout /></PrivateRoute>,
      children: [
        { index: true, element: <Navigate to="/admin-web/cards" /> },
        { path: 'staff', element: <Staff /> },
        { path: 'customers', element: <Customers /> },
        { path: 'cards', element: <CardList /> },
        { path: 'cards/issue', element: <CardIssue /> },
        { path: 'cards/verify', element: <CardVerify /> },
        { path: 'cards/recharge', element: <CardRecharge /> },
        { path: 'transactions', element: <Transactions /> },
      ],
    },
    { path: '*', element: <Navigate to="/admin-web" /> },
  ]);
}
```

- [ ] **Step 4: Commit**

```bash
git add admin-web/src/
git commit -m "feat: add API service, auth store, and router"
```

---

### Task 4.3: Login Page

- [ ] **Step 1: Create Login page**

Create `admin-web/src/pages/Login/index.tsx` with Ant Design Form, phone + password inputs, login button, API call.

- [ ] **Step 2: Verify login works in browser**

Open `http://localhost:5173/admin-web/login`, login with `13800000000` / `admin123`.
Expected: Redirect to card list page.

- [ ] **Step 3: Commit**

---

### Task 4.4: Layout & Navigation

- [ ] **Step 1: Create Layout component**

Create `admin-web/src/pages/Layout/index.tsx` with Ant Design `Layout`, `Sider`, `Menu` sidebar with nav links.

- [ ] **Step 2: Commit**

---

### Task 4.5: Staff, Customer, Card, Transaction Pages

> Each page follows the same pattern: Ant Design `Table` + search/filter + modal for create/edit.
> Implement one by one in this order:

- [ ] **Step 1: Staff management page** — `admin-web/src/pages/Staff/index.tsx`
- [ ] **Step 2: Customer management page** — `admin-web/src/pages/Customers/index.tsx`
- [ ] **Step 3: Card list page** — `admin-web/src/pages/Cards/List.tsx`
- [ ] **Step 4: Card issue page** — `admin-web/src/pages/Cards/Issue.tsx`
- [ ] **Step 5: Card verify (scan) page** — `admin-web/src/pages/Cards/Verify.tsx`
- [ ] **Step 6: Card recharge page** — `admin-web/src/pages/Cards/Recharge.tsx`
- [ ] **Step 7: Transaction records page** — `admin-web/src/pages/Transactions/index.tsx`
- [ ] **Step 8: Commit each page individually**

---

### Task 4.6: Update App.tsx and main.tsx

- [ ] **Step 1: Update App.tsx**

```tsx
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import AppRouter from './router';

export default function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <BrowserRouter>
        <AppRouter />
      </BrowserRouter>
    </ConfigProvider>
  );
}
```

- [ ] **Step 2: Commit**

---

## Task 5: Admin H5 (Native HTML)

### Task 5.1: Login Page

- [ ] **Step 1: Create `public/admin/login.html`** — mobile login form
- [ ] **Step 2: Create `public/admin/css/admin.css`** — mobile-first responsive styles
- [ ] **Step 3: Create `public/admin/js/auth.js`** — login API call, token storage
- [ ] **Step 4: Commit**

### Task 5.2: Scan & Consume Page

- [ ] **Step 1: Create `public/admin/scan.html`** — camera + consume form
- [ ] **Step 2: Create `public/admin/js/scanner.js`** — html5-qrcode integration
- [ ] **Step 3: Create `public/admin/js/admin-app.js`** — consume API call, card info display
- [ ] **Step 4: Commit**

### Task 5.3: Recent Records Page

- [ ] **Step 1: Create `public/admin/records.html`** — list of recent verifications
- [ ] **Step 2: Commit**

---

## Task 6: Customer H5 (Native HTML)

### Task 6.1: Login Page

- [ ] **Step 1: Create `public/customer/login.html`** — mobile login form
- [ ] **Step 2: Create `public/customer/css/customer.css`** — mobile styles
- [ ] **Step 3: Create `public/customer/js/auth.js`** — login, token
- [ ] **Step 4: Commit**

### Task 6.2: Cards List Page

- [ ] **Step 1: Create `public/customer/cards.html`** — card list (balance, count, status)
- [ ] **Step 2: Create `public/customer/js/customer-app.js`** — fetch cards, render
- [ ] **Step 3: Commit**

### Task 6.3: Card Detail + QR Code Page

- [ ] **Step 1: Create `public/customer/card-detail.html`** — card detail + QR code + transactions
- [ ] **Step 2: Create `public/customer/js/qrcode-render.js`** — qrcode.js integration
- [ ] **Step 3: Commit**

---

## Task 7: Integration Testing & Polish

- [ ] **Step 1: End-to-end flow test**
  - Login as admin → create customer → issue value card → issue count card
  - Login as customer → view cards → view QR code
  - Login as staff on H5 → scan QR → consume → verify balance updated
  - Login as admin → view transactions

- [ ] **Step 2: Error handling test**
  - Try consume with insufficient balance → expect error
  - Try consume on exhausted card → expect error
  - Try login with wrong password → expect error

- [ ] **Step 3: Recharge flow test**
  - Recharge a value card → verify balance increased
  - Recharge an exhausted card → verify status becomes active

- [ ] **Step 4: Final commit and tag**

```bash
git tag v1.0.0-mvp
```
