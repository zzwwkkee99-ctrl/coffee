// QR Code rendering and card detail logic

if (!requireAuth()) { /* redirect */ }

const statusTextMap = {
  active: '使用中',
  exhausted: '已用尽',
  disabled: '已禁用',
};

const txTypeMap = {
  issue: '开卡',
  consume: '消费',
  recharge: '充值',
  undo: '撤销',
};

async function loadCardDetail() {
  const params = new URLSearchParams(window.location.search);
  const cardId = params.get('id');
  if (!cardId) {
    window.location.href = '/h5/customer/cards.html';
    return;
  }

  try {
    const res = await apiRequest(`/customer/cards/${cardId}`);
    const card = res.data;
    renderCard(card);
    renderQR(card);
    loadTransactions(cardId);
  } catch (err) {
    document.getElementById('cardDetail').innerHTML = `<div class="empty">加载失败: ${err.message}</div>`;
  }
}

function renderCard(card) {
  const detail = document.getElementById('cardDetail');

  let progressHtml = '';
  if (card.type === 'value') {
    const pct = card.total_value > 0 ? (card.balance / card.total_value * 100).toFixed(0) : 0;
    progressHtml = `
      <div class="progress">
        <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
        <div class="progress-text">已使用 ¥${(card.total_value - card.balance).toFixed(2)} / 累计充值 ¥${card.total_value}</div>
      </div>`;
  } else {
    const pct = card.total_count > 0 ? (card.remaining_count / card.total_count * 100).toFixed(0) : 0;
    progressHtml = `
      <div class="progress">
        <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
        <div class="progress-text">已使用 ${card.total_count - card.remaining_count}次 / 共 ${card.total_count}次</div>
      </div>`;
  }

  detail.innerHTML = `
    <div class="detail-card">
      <div class="card-no">No. ${card.card_no}</div>
      <div class="balance">
        ${card.type === 'value' ? `¥${card.balance}` : card.remaining_count}
        <span class="unit">${card.type === 'value' ? '' : '次剩余'}</span>
      </div>
      ${progressHtml}
    </div>`;
}

function renderQR(card) {
  if (card.status !== 'active') return;

  const qrSection = document.getElementById('qrSection');
  qrSection.style.display = 'block';

  const canvas = document.getElementById('qrCanvas');
  // QR code content is the card_no for staff to scan
  if (typeof QRCode !== 'undefined' && QRCode.toCanvas) {
    QRCode.toCanvas(canvas, card.card_no, {
      width: 200,
      margin: 2,
      color: { dark: '#1a1a2e', light: '#ffffff' },
    }, (error) => {
      if (error) {
        console.error('QR generation failed:', error);
        showQRFallback(qrSection, card.card_no);
      }
    });
  } else {
    console.error('QRCode library not loaded');
    showQRFallback(qrSection, card.card_no);
  }
}

function showQRFallback(container, cardNo) {
  // Show the card number as plain text so the user can tell the staff
  const canvas = container.querySelector('canvas');
  if (canvas) canvas.style.display = 'none';
  const fallback = document.createElement('div');
  fallback.style.cssText = 'padding:20px; background:#f5f5f5; border-radius:12px; font-size:20px; font-weight:700; letter-spacing:2px; color:#1a1a2e;';
  fallback.textContent = cardNo;
  container.querySelector('h3').after(fallback);
  const tip = container.querySelector('.qr-tip');
  if (tip) tip.textContent = '请将此卡号报给店员进行核销';
}

async function loadTransactions(cardId) {
  const txSection = document.getElementById('txSection');
  const txList = document.getElementById('txList');
  txSection.style.display = 'block';

  try {
    const res = await apiRequest(`/customer/cards/${cardId}/transactions`);
    const list = res.data.list;

    if (!list.length) {
      txList.innerHTML = '<div class="empty" style="padding:16px">暂无交易记录</div>';
      return;
    }

    txList.innerHTML = list.map(tx => `
      <div class="transaction-item">
        <div class="tx-info">
          <div class="tx-type">${txTypeMap[tx.type] || tx.type} ${tx.note ? '<span style="font-weight:normal;font-size:12px;color:#888;">(' + tx.note + ')</span>' : ''}</div>
          <div class="tx-time">${new Date(tx.created_at).toLocaleString('zh-CN')}</div>
        </div>
        <div class="tx-amount ${tx.type === 'consume' ? 'consume' : 'recharge'}">
          ${tx.type === 'consume' ? '-' : '+'}${tx.amount !== null ? `¥${tx.amount}` : `${tx.count}次`}
        </div>
      </div>
    `).join('');
  } catch (err) {
    txList.innerHTML = `<div class="empty" style="padding:16px">加载失败</div>`;
  }
}

loadCardDetail();
