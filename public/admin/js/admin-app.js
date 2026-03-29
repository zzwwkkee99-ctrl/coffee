// Admin App - Consume logic & records

let currentCard = null;

// Check auth on page load
if (!requireAuth()) {
  // Will redirect to login
}

// Logout
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    clearAuth();
    window.location.href = '/h5/admin/login.html';
  });
}

// Phone input - Enter to lookup
const phoneInput = document.getElementById('phoneInput');
if (phoneInput) {
  phoneInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') lookupCardsByPhone();
  });
}

async function lookupCardsByPhone() {
  const phone = document.getElementById('phoneInput').value.trim();
  if (!phone || !/^1\d{10}$/.test(phone)) {
    window.showToast('请输入有效的手机号');
    return;
  }

  try {
    const res = await apiRequest(`/admin/cards/by-phone/${phone}`);
    const customer = res.data.customer;
    const cards = res.data.cards;
    
    hideCardInfo();
    
    if (!cards || cards.length === 0) {
      window.showToast('该客户没有任何卡片');
      const cs = document.getElementById('cardSelectSection');
      if(cs) cs.style.display = 'none';
      return;
    }
    
    if (cards.length === 1) {
      const cs = document.getElementById('cardSelectSection');
      if(cs) cs.style.display = 'none';
      currentCard = { ...cards[0], customer_name: customer.name, customer_phone: customer.phone };
      showCardInfo(currentCard);
    } else {
      showCardList(cards, customer);
    }
  } catch (err) {
    window.showToast(err.message);
    const cs = document.getElementById('cardSelectSection');
    if(cs) cs.style.display = 'none';
    hideCardInfo();
  }
}

function showCardList(cards, customer) {
  const container = document.getElementById('cardSelectList');
  document.getElementById('cardSelectSection').style.display = 'block';
  hideCardInfo();
  
  window.tempCardsSelectMap = {};
  container.innerHTML = cards.map(card => {
    const fullCard = { ...card, customer_name: customer.name, customer_phone: customer.phone };
    window.tempCardsSelectMap[card.id] = fullCard;
    
    let statusText = card.status === 'active' ? '使用中' : (card.status === 'exhausted' ? '已用尽' : '已禁用');
    let statusClass = card.status === 'active' ? 'tag-active' : 'tag-disabled';
    
    return `
      <div class="record-item" style="cursor:pointer; margin: 8px 0; border: 1px solid var(--border);" onclick="selectCardToConsume('${card.id}')">
        <div class="record-header">
           <span class="tag tag-${card.type === 'value' ? 'value' : 'count'}">${card.type === 'value' ? '储值卡' : '次卡'}</span>
           <span class="tag ${statusClass}">${statusText}</span>
        </div>
        <div style="font-size: 14px; margin-top: 5px; color: var(--text);">
           卡号: ${card.card_no}<br/>
           ${card.type === 'value' ? `余额: ¥${card.balance}` : `剩余: ${card.remaining_count}次`}
        </div>
      </div>
    `;
  }).join('');
}

window.selectCardToConsume = function(cardId) {
  currentCard = window.tempCardsSelectMap[cardId];
  document.getElementById('cardSelectSection').style.display = 'none';
  showCardInfo(currentCard);
};

function showCardInfo(card) {
  document.getElementById('cardInfoSection').style.display = 'block';
  document.getElementById('cardNo').textContent = card.card_no;
  document.getElementById('customerName').textContent = `${card.customer_name} (${card.customer_phone})`;

  const typeEl = document.getElementById('cardType');
  if (card.type === 'value') {
    typeEl.innerHTML = '<span class="tag tag-value">储值卡</span>';
  } else {
    typeEl.innerHTML = '<span class="tag tag-count">次卡</span>';
  }

  if (card.type === 'value') {
    document.getElementById('cardBalance').textContent = `¥${card.balance}`;
  } else {
    document.getElementById('cardBalance').textContent = `${card.remaining_count}/${card.total_count}次`;
  }

  const statusEl = document.getElementById('cardStatus');
  const statusMap = {
    active: { cls: 'tag-active', text: '使用中' },
    exhausted: { cls: 'tag-exhausted', text: '已用尽' },
    disabled: { cls: 'tag-disabled', text: '已禁用' },
  };
  const s = statusMap[card.status] || { cls: '', text: card.status };
  statusEl.innerHTML = `<span class="tag ${s.cls}">${s.text}</span>`;

  // Show/hide consume form based on status
  const consumeForm = document.getElementById('consumeForm');
  if (card.status === 'active') {
    consumeForm.style.display = 'block';
    const amountInput = document.getElementById('consumeAmount');
    if (card.type === 'value') {
      amountInput.placeholder = `消费金额 (最多 ¥${card.balance})`;
      amountInput.max = card.balance;
      amountInput.type = 'number';
      amountInput.step = '0.01';
    } else {
      amountInput.placeholder = `消费次数 (剩余 ${card.remaining_count}次)`;
      amountInput.max = card.remaining_count;
      amountInput.type = 'number';
      amountInput.step = '1';
      amountInput.min = '1';
      amountInput.value = '1';
    }
  } else {
    consumeForm.style.display = 'none';
  }
}

function hideCardInfo() {
  document.getElementById('cardInfoSection').style.display = 'none';
  currentCard = null;
}

async function consumeCard() {
  if (!currentCard) return;

  const amountInput = document.getElementById('consumeAmount');
  const noteInput = document.getElementById('consumeNote');
  const rawValue = amountInput.value;

  if (currentCard.type === 'count') {
    // Count card: must be a positive integer, <= remaining count
    const count = Number(rawValue);
    if (!rawValue || !Number.isInteger(count) || count <= 0) {
      window.showToast('请输入正整数的消费次数');
      return;
    }
    if (count > currentCard.remaining_count) {
      window.showToast(`消费次数不能超过剩余次数 (${currentCard.remaining_count}次)`);
      return;
    }
  } else {
    // Value card: must be > 0, <= balance
    const amount = parseFloat(rawValue);
    if (!rawValue || isNaN(amount) || amount <= 0) {
      window.showToast('请输入大于0的消费金额');
      return;
    }
    if (amount > parseFloat(currentCard.balance)) {
      window.showToast(`消费金额不能超过余额 (¥${currentCard.balance})`);
      return;
    }
  }

  const value = parseFloat(rawValue);
  const body = { note: noteInput.value };
  if (currentCard.type === 'value') {
    body.amount = value;
  } else {
    body.count = Math.floor(value);
  }

  try {
    const res = await apiRequest(`/admin/cards/${currentCard.id}/consume`, {
      method: 'POST',
      body: JSON.stringify(body),
    });

    const detail = currentCard.type === 'value' ? `消费 ¥${value}` : `消费 ${Math.floor(value)}次`;
    document.getElementById('successDetail').textContent = `${currentCard.customer_name} - ${detail}`;
    
    // Store the newly created tx id for undo
    window.lastTxId = res.data.transaction ? res.data.transaction.id : null;
    
    document.getElementById('successOverlay').style.display = 'flex';
  } catch (err) {
    window.showToast(err.message);
  }
}

function resetPage() {
  document.getElementById('successOverlay').style.display = 'none';
  const pi = document.getElementById('phoneInput');
  if (pi) pi.value = '';
  document.getElementById('consumeAmount').value = '';
  document.getElementById('consumeNote').value = '';
  window.lastTxId = null;
  hideCardInfo();
}

window.undoLastTransaction = async function() {
  if (!window.lastTxId) {
    window.showToast('无法撤销: 找不到流水ID');
    return;
  }
  
  if (!confirm('确认要撤销刚才的核销吗？撤销后将回退对应的金额或次数。')) {
    return;
  }
  
  try {
    await apiRequest(`/admin/transactions/${window.lastTxId}/undo`, { method: 'POST' });
    window.showToast('撤销成功！');
    resetPage();
  } catch (err) {
    window.showToast(err.message);
  }
};

// ============================================================
// QR Scanner
// ============================================================
let html5QrScanner = null;
let scannerProcessing = false;

window.openScanner = function() {
  const overlay = document.getElementById('scannerOverlay');
  overlay.style.display = 'flex';

  // Hide other sections
  hideCardInfo();
  const cs = document.getElementById('cardSelectSection');
  if (cs) cs.style.display = 'none';

  if (typeof Html5Qrcode === 'undefined') {
    window.showToast('扫码组件加载失败，请刷新页面重试');
    overlay.style.display = 'none';
    return;
  }

  html5QrScanner = new Html5Qrcode('qr-reader');
  scannerProcessing = false;

  html5QrScanner.start(
    { facingMode: 'environment' },
    {
      fps: 10,
      qrbox: { width: 250, height: 250 },
    },
    onScanSuccess,
    () => {} // ignore scan failures (no QR in frame)
  ).catch((err) => {
    console.error('Camera start failed:', err);
    window.showToast('无法访问摄像头，请检查权限设置');
    overlay.style.display = 'none';
  });
};

window.closeScanner = function() {
  const overlay = document.getElementById('scannerOverlay');
  if (html5QrScanner) {
    html5QrScanner.stop().then(() => {
      html5QrScanner.clear();
      html5QrScanner = null;
    }).catch(() => {
      html5QrScanner = null;
    });
  }
  overlay.style.display = 'none';
};

async function onScanSuccess(decodedText) {
  // Prevent multiple rapid scans
  if (scannerProcessing) return;
  scannerProcessing = true;

  const cardNo = decodedText.trim();
  if (!cardNo) {
    scannerProcessing = false;
    return;
  }

  try {
    const res = await apiRequest(`/admin/cards/${encodeURIComponent(cardNo)}`);
    const card = res.data;

    // Close scanner first
    closeScanner();

    // Set current card and show info
    currentCard = card;
    showCardInfo(card);
    window.showToast(`已识别卡号: ${card.card_no}`);
  } catch (err) {
    // Close scanner
    closeScanner();
    window.showToast(`无效的卡二维码: ${err.message}`);
  }
}

