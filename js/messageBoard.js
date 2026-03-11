// messageBoard.js
// 基于 Netlify Forms 的留言板模块

import langManager from '/js/langManager.js';

const MESSAGES_API = '/.netlify/functions/get-messages';

let currentPage = 1;
let isLoading = false;
let hasMore = true;

/**
 * 初始化留言板
 */
export function initializeMessageBoard() {
  currentPage = 1;
  isLoading = false;
  hasMore = true;
  bindFormEvents();
  loadMessages(true);
}

// ── 表单事件绑定 ────────────────────────────────────────────

function bindFormEvents() {
  const form = document.getElementById('msg-form');
  const nicknameInput = document.getElementById('msg-nickname');
  const contentInput = document.getElementById('msg-content');
  const charCount = document.getElementById('msg-char-count');
  const againBtn = document.getElementById('msg-again-btn');
  const refreshBtn = document.getElementById('msg-refresh-btn');
  const loadMoreBtn = document.getElementById('msg-load-more');

  if (!form || !nicknameInput || !contentInput) return;

  // 字数实时统计
  contentInput.addEventListener('input', () => {
    if (charCount) charCount.textContent = contentInput.value.length;
  });

  // 拦截表单提交，改为 AJAX 提交到 Netlify
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nickname = nicknameInput.value.trim();
    const content = contentInput.value.trim();

    if (!nickname) {
      nicknameInput.focus();
      showToast(langManager.translate('msg_warn_nickname') || '请输入昵称');
      return;
    }
    if (!content) {
      contentInput.focus();
      showToast(langManager.translate('msg_warn_content') || '请输入留言内容');
      return;
    }

    await submitToNetlify(form);
  });

  // "再留一条" 按钮 → 重置并显示表单，刷新列表
  if (againBtn) {
    againBtn.addEventListener('click', () => {
      form.reset();
      if (charCount) charCount.textContent = '0';
      setSuccessVisible(false);
      loadMessages(true);
    });
  }

  // 刷新列表
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => loadMessages(true));
  }

  // 加载更多
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', () => loadMessages(false));
  }
}

// ── Netlify Forms 提交 ───────────────────────────────────────

async function submitToNetlify(form) {
  const submitBtn = document.getElementById('msg-submit-btn');
  setSubmitting(true, submitBtn);

  try {
    const body = new URLSearchParams(new FormData(form)).toString();

    const res = await fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (res.ok) {
      setSuccessVisible(true);
    } else {
      showToast(langManager.translate('msg_submit_error') || '提交失败，请稍后再试');
    }
  } catch (err) {
    console.error('留言提交失败:', err);
    showToast(langManager.translate('msg_submit_error') || '提交失败，请稍后再试');
  } finally {
    setSubmitting(false, submitBtn);
  }
}

// ── 留言列表加载 ─────────────────────────────────────────────

async function loadMessages(reset = false) {
  if (isLoading) return;

  if (reset) {
    currentPage = 1;
    hasMore = true;
    clearMessageList();
  }

  if (!hasMore) return;

  isLoading = true;
  showLoading(true);
  hideEmpty();
  hideError();

  try {
    const res = await fetch(`${MESSAGES_API}?page=${currentPage}`);
    if (!res.ok) throw new Error(`API ${res.status}`);

    const items = await res.json();

    if (!Array.isArray(items) || items.length === 0) {
      if (currentPage === 1) showEmpty();
      hasMore = false;
      updatePagination();
      return;
    }

    items.forEach((item, idx) => renderMessage(item, idx));
    hasMore = items.length === 20;
    currentPage++;
    updatePagination();
  } catch (err) {
    console.error('加载留言失败:', err);
    if (currentPage === 1) showError();
  } finally {
    isLoading = false;
    showLoading(false);
  }
}

// ── 渲染单条留言 ────────────────────────────────────────────

function renderMessage(item, idx) {
  const list = document.getElementById('message-list');
  if (!list) return;

  const nickname = escHtml(item.nickname || 'Anonymous');
  const body = escHtml(item.message || '');
  const time = formatTime(item.created_at);
  const initial = (item.nickname || 'A').charAt(0).toUpperCase();

  const card = document.createElement('div');
  card.className = 'message-card';
  card.style.animationDelay = `${idx * 40}ms`;
  card.innerHTML = `
    <div class="message-card-header">
      <div class="message-avatar-placeholder">${escHtml(initial)}</div>
      <div class="message-meta">
        <span class="message-nickname">${nickname}</span>
        <span class="message-time">${escHtml(time)}</span>
      </div>
    </div>
    <div class="message-card-body">${body}</div>
  `;

  list.appendChild(card);
}

// ── DOM 工具函数 ──────────────────────────────────────────

function setSuccessVisible(visible) {
  const formBox = document.getElementById('msg-form-box');
  const successPanel = document.getElementById('msg-success');
  if (formBox) formBox.style.display = visible ? 'none' : '';
  if (successPanel) successPanel.style.display = visible ? 'block' : 'none';
}

function setSubmitting(loading, btn) {
  if (!btn) return;
  btn.disabled = loading;
}

function clearMessageList() {
  const list = document.getElementById('message-list');
  if (list) list.innerHTML = '';
}

function showLoading(visible) {
  const el = document.getElementById('msg-loading');
  if (el) el.style.display = visible ? 'block' : 'none';
}

function showEmpty() {
  const el = document.getElementById('msg-empty');
  if (el) el.style.display = 'block';
}

function hideEmpty() {
  const el = document.getElementById('msg-empty');
  if (el) el.style.display = 'none';
}

function showError() {
  const el = document.getElementById('msg-error');
  if (el) el.style.display = 'block';
}

function hideError() {
  const el = document.getElementById('msg-error');
  if (el) el.style.display = 'none';
}

function updatePagination() {
  const pag = document.getElementById('msg-pagination');
  if (pag) pag.style.display = hasMore ? 'block' : 'none';
}

function showToast(text) {
  let toast = document.getElementById('msg-toast-el');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'msg-toast-el';
    toast.className = 'msg-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = text;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 2500);
}

function formatTime(isoString) {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return isoString;
  }
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

