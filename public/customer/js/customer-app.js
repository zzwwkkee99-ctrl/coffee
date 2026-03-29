// Customer App - Card list, detail logic

if (!requireAuth()) { /* redirect */ }

// Logout
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    clearAuth();
    window.location.href = '/h5/customer/login.html';
  });
}

// Welcome message
const user = getUser();
const welcomeMsg = document.getElementById('welcomeMsg');
if (welcomeMsg && user) {
  welcomeMsg.textContent = `欢迎，${user.name}`;
}

const statusTextMap = {
  active: '使用中',
  exhausted: '已用尽',
  disabled: '已禁用',
};

async function loadCards() {
  const container = document.getElementById('cardsList');
  if (!container) return;

  try {
    const res = await apiRequest('/customer/cards');
    const cards = res.data;

    if (!cards.length) {
      container.innerHTML = `
        <div class="empty">
          <div class="empty-icon">🎴</div>
          <p>暂无会员卡</p>
          <p style="font-size:13px;margin-top:8px;">请联系店员开卡</p>
        </div>`;
      return;
    }

    container.innerHTML = cards.map(card => `
      <a class="card-item" href="/h5/customer/card-detail.html?id=${card.id}">
        <div class="card-item-header">
          <span class="card-item-type ${card.type}">${card.type === 'value' ? '储值卡' : '次卡'}</span>
          <span class="card-item-status ${card.status}">${statusTextMap[card.status] || card.status}</span>
        </div>
        <div class="card-item-balance">
          ${card.type === 'value' ? `¥${card.balance}` : card.remaining_count}
          <span class="unit">${card.type === 'value' ? '' : '次剩余'}</span>
        </div>
        <div class="card-item-meta">
          <span>${card.memo || '会员卡'}</span>
          <span>${new Date(card.created_at).toLocaleDateString()}</span>
        </div>
      </a>
    `).join('');
  } catch (err) {
    container.innerHTML = `<div class="empty">加载失败: ${err.message}</div>`;
  }
}

loadCards();
