const API_BASE = '/api';

window.showToast = function(msg, duration = 3000) {
  let toast = document.getElementById('custom-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'custom-toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('toast-show');
  
  if (toast.timer) clearTimeout(toast.timer);
  toast.timer = setTimeout(() => {
    toast.classList.remove('toast-show');
  }, duration);
};
function getToken() {
  return localStorage.getItem('customer_token');
}

function setToken(token) {
  localStorage.setItem('customer_token', token);
}

function setUser(user) {
  localStorage.setItem('customer_user', JSON.stringify(user));
}

function getUser() {
  return JSON.parse(localStorage.getItem('customer_user') || 'null');
}

function clearAuth() {
  localStorage.removeItem('customer_token');
  localStorage.removeItem('customer_user');
}

function requireAuth() {
  if (!getToken()) {
    window.location.href = '/h5/customer/login.html';
    return false;
  }
  return true;
}

// Generate UUID v4 for idempotency
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

async function apiRequest(url, options = {}) {
  const token = getToken();
  const method = (options.method || 'GET').toUpperCase();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  // Auto-add idempotency key for write operations
  if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(method) && !headers['X-Idempotency-Key']) {
    headers['X-Idempotency-Key'] = generateUUID();
  }

  const res = await fetch(`${API_BASE}${url}`, { ...options, headers });
  const data = await res.json();

  if (res.status === 401) {
    // If we had a token, it means session expired → redirect to login
    if (token) {
      clearAuth();
      window.location.href = '/h5/customer/login.html';
      throw new Error('登录已过期');
    }
    // No token means this is a login attempt → show actual error message
    throw new Error(data.message || '手机号或密码错误');
  }

  if (!data.success) {
    throw new Error(data.message || '请求失败');
  }

  return data;
}

// Login form handler
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  // Restore remembered credentials
  const savedPhone = localStorage.getItem('customer_remember_phone');
  const savedPwd = localStorage.getItem('customer_remember_pwd');
  if (savedPhone && savedPwd) {
    document.getElementById('phone').value = savedPhone;
    document.getElementById('password').value = savedPwd;
    document.getElementById('rememberPwd').checked = true;
  }

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const phone = document.getElementById('phone').value.trim();
    const password = document.getElementById('password').value;
    const remember = document.getElementById('rememberPwd').checked;
    const btn = document.getElementById('loginBtn');

    if (!/^1\d{10}$/.test(phone)) {
      window.showToast('请输入有效的手机号');
      return;
    }

    btn.disabled = true;
    btn.textContent = '登录中...';

    try {
      const res = await apiRequest('/auth/customer/login', {
        method: 'POST',
        body: JSON.stringify({ phone, password }),
      });
      setToken(res.data.token);
      setUser(res.data.user);

      // Save or clear remembered credentials
      if (remember) {
        localStorage.setItem('customer_remember_phone', phone);
        localStorage.setItem('customer_remember_pwd', password);
      } else {
        localStorage.removeItem('customer_remember_phone');
        localStorage.removeItem('customer_remember_pwd');
      }

      window.location.href = '/h5/customer/cards.html';
    } catch (err) {
      window.showToast(err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = '登录';
    }
  });
}
