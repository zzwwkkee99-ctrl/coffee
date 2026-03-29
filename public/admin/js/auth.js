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
  return localStorage.getItem('admin_h5_token');
}

function setToken(token) {
  localStorage.setItem('admin_h5_token', token);
}

function setUser(user) {
  localStorage.setItem('admin_h5_user', JSON.stringify(user));
}

function getUser() {
  return JSON.parse(localStorage.getItem('admin_h5_user') || 'null');
}

function clearAuth() {
  localStorage.removeItem('admin_h5_token');
  localStorage.removeItem('admin_h5_user');
}

function requireAuth() {
  if (!getToken()) {
    window.location.href = '/h5/admin/login.html';
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
    clearAuth();
    window.location.href = '/h5/admin/login.html';
    throw new Error('登录已过期');
  }

  if (!data.success) {
    throw new Error(data.message || '请求失败');
  }

  return data;
}

// Login form handler
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const phone = document.getElementById('phone').value.trim();
    const password = document.getElementById('password').value;
    const btn = document.getElementById('loginBtn');

    if (!/^1\d{10}$/.test(phone)) {
      window.showToast('请输入有效的手机号');
      return;
    }

    btn.disabled = true;
    btn.textContent = '登录中...';

    try {
      const res = await apiRequest('/auth/admin/login', {
        method: 'POST',
        body: JSON.stringify({ phone, password }),
      });
      setToken(res.data.token);
      setUser(res.data.user);
      window.location.href = '/h5/admin/scan.html';
    } catch (err) {
      window.showToast(err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = '登录';
    }
  });
}
