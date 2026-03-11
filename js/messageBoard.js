// messageBoard.js
// 基于 Netlify Forms 的留言板模块

import langManager from '/js/langManager.js';

const FORM_NAME = 'guestbook';

/**
 * 初始化留言板
 */
export function initializeMessageBoard() {
  bindFormEvents();
}

// ── 表单事件绑定 ────────────────────────────────────────────

function bindFormEvents() {
  const form = document.getElementById('msg-form');
  const nicknameInput = document.getElementById('msg-nickname');
  const contentInput = document.getElementById('msg-content');
  const charCount = document.getElementById('msg-char-count');
  const againBtn = document.getElementById('msg-again-btn');

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

  // "再留一条" 按钮 → 重置并显示表单
  if (againBtn) {
    againBtn.addEventListener('click', () => {
      form.reset();
      if (charCount) charCount.textContent = '0';
      setSuccessVisible(false);
    });
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
