// messageBoard.js
// 基于 Netlify Blobs 的留言板模块

import langManager from '/js/langManager.js';
import { escHtml, escAttr } from '/js/utils.js';

const MESSAGES_API = '/.netlify/functions/get-messages';
const POST_MESSAGE_API = '/.netlify/functions/post-message';
const PAGE_SIZE = 20;
const NICKNAME_STORAGE_KEY = 'msg_last_nickname';

// Mock 模式判断：仅在 URL 参数或 localStorage 开启时激活
const USE_MOCK_MESSAGES = (() => {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get('mockMessages') === '1' || localStorage.getItem('mockMessages') === '1';
  } catch {
    return false;
  }
})();

// 调试模式：?debug=1 时显示每条留言的 Blob Key，用于 Netlify 后台维护
const DEBUG_MODE = (() => {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get('debug') === '1';
  } catch {
    return false;
  }
})();

// Mock 数据模块：条件动态导入，生产打包时 __DEV__ 为 false，
// Terser 的 dead code elimination 会把整个分支和 import() 移除
// __DEV__ 由 webpack DefinePlugin 注入，生产构建为 false，
// Terser dead code elimination 会移除整个 if 分支及 import()，不生成 Mock chunk
let mockModule = null;
async function getMockPageData(page) {
  if (__DEV__) {
    if (!mockModule) {
      mockModule = await import('/js/messageBoardMock.js');
    }
    return mockModule.getMockPageData(page, PAGE_SIZE);
  }
  return { items: [], total: 0 };
}

let currentPage = 1;
let isLoading = false;
let totalEntries = 0;
let totalPages = 1;
let currentEntries = [];
let activeReplyMessageId = null;
let activeReplyFormEl = null;
let activeReplyBtn = null;
let activeReplyToNickname = '';

// ── 留言数据预取缓存 ─────────────────────────────────────────
// 页面加载时静默预取第 1 页，切到留言板时直接渲染，无需等待
let prefetchedData = null;   // { items, total } | null
let prefetchPromise = null;  // Promise | null（防止重复请求）

/**
 * 静默预取留言第 1 页数据（由 main.js 在应用初始化时调用）
 * 不依赖 DOM，纯数据请求
 */
export function prefetchMessages() {
  if (prefetchedData || prefetchPromise) return; // 已有缓存或正在请求

  prefetchPromise = (USE_MOCK_MESSAGES ? getMockPageData(1) : fetchMessagePage(1))
    .then(result => {
      prefetchedData = result;
    })
    .catch(() => {
      // 预取失败不影响后续正常加载
    })
    .finally(() => {
      prefetchPromise = null;
    });
}

/**
 * 初始化留言板
 */
export function initializeMessageBoard() {
  currentPage = 1;
  isLoading = false;
  totalEntries = 0;
  totalPages = 1;
  currentEntries = [];
  activeReplyToNickname = '';
  closeReplyComposer();
  bindFormEvents();

  // 优先使用预取缓存，跳过网络请求
  if (prefetchedData) {
    const cached = prefetchedData;
    currentEntries = Array.isArray(cached.items) ? cached.items : [];
    totalEntries = cached.total || 0;
    totalPages = Math.max(1, Math.ceil(totalEntries / PAGE_SIZE));
    renderMessageList();
    updatePagination();
  } else if (prefetchPromise) {
    // 预取还在进行中，等它完成后渲染
    showLoading(true);
    prefetchPromise.then(() => {
      if (prefetchedData) {
        currentEntries = Array.isArray(prefetchedData.items) ? prefetchedData.items : [];
        totalEntries = prefetchedData.total || 0;
        totalPages = Math.max(1, Math.ceil(totalEntries / PAGE_SIZE));
        renderMessageList();
        updatePagination();
      } else {
        // 预取失败，降级为正常加载
        loadMessages(1);
      }
      showLoading(false);
    });
  } else {
    // 无预取数据（不应发生），降级为正常加载
    loadMessages(1);
  }
}

// ── 表单事件绑定 ────────────────────────────────────────────

function bindFormEvents() {
  const form = document.getElementById('msg-form');
  const nicknameInput = document.getElementById('msg-nickname');
  const contentInput = document.getElementById('msg-content');
  const messageIdInput = document.getElementById('msg-message-id');
  const charCount = document.getElementById('msg-char-count');

  if (!form || !nicknameInput || !contentInput || !messageIdInput) return;

  // 自动填入上次使用的昵称
  const savedNickname = localStorage.getItem(NICKNAME_STORAGE_KEY);
  if (savedNickname && !nicknameInput.value) {
    nicknameInput.value = savedNickname;
  }

  // 字数实时统计
  contentInput.addEventListener('input', () => {
    if (charCount) charCount.textContent = contentInput.value.length;
  });

  // 拦截表单提交，改为 AJAX 提交到 Netlify
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nickname = (nicknameInput.value.trim() || 'unknown').slice(0, 8);
    const content = contentInput.value.trim();

    if (!content) {
      contentInput.focus();
      showToast(langManager.translate('msg_warn_content') || '请输入留言内容');
      return;
    }

    nicknameInput.value = nickname;
    messageIdInput.value = String(Date.now());

    const submitBtn = document.getElementById('msg-submit-btn');
    const ok = await submitMessage(form, submitBtn);
    if (!ok) {
      showToast(langManager.translate('msg_submit_error') || '提交失败，请稍后再试');
      return;
    }

    localStorage.setItem(NICKNAME_STORAGE_KEY, nickname);
    form.reset();
    nicknameInput.value = nickname;
    messageIdInput.value = '';
    if (charCount) charCount.textContent = '0';
    showToast(langManager.translate('msg_success_title') || '留言已提交！');
    // 清除预取缓存，强制重新拉取最新数据
    prefetchedData = null;
    await loadMessages(1);
  });
}

// ── 统一留言/回复提交 ────────────────────────────────────────
// 合并原 submitToNetlify 和 submitReplyToNetlify，
// 差异仅在 replyToNickname 字段——不存在时发送空字符串即可

async function submitMessage(form, submitBtn) {
  setSubmitting(true, submitBtn);

  try {
    const formData = new FormData(form);
    const payload = {
      nickname: String(formData.get('nickname') || ''),
      message: String(formData.get('message') || ''),
      messageId: String(formData.get('messageId') || ''),
      replyToNickname: String(formData.get('replyToNickname') || ''),
    };

    const res = await fetch(POST_MESSAGE_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    return res.ok;
  } catch (err) {
    console.error('留言提交失败:', err);
    return false;
  } finally {
    setSubmitting(false, submitBtn);
  }
}

// ── 留言列表加载 ─────────────────────────────────────────────

async function loadMessages(page = 1) {
  if (isLoading) return;

  isLoading = true;
  currentPage = page;
  currentEntries = [];
  closeReplyComposer();
  clearMessageList();
  showLoading(true);
  hideEmpty();
  hideError();

  try {
    const result = USE_MOCK_MESSAGES
      ? await getMockPageData(currentPage)
      : await fetchMessagePage(currentPage);

    currentEntries = Array.isArray(result.items) ? result.items : [];
    totalEntries = result.total || 0;
    totalPages = Math.max(1, Math.ceil(totalEntries / PAGE_SIZE));

    renderMessageList();
    updatePagination();
  } catch (err) {
    console.error('加载留言失败:', err);
    showError();
  } finally {
    isLoading = false;
    showLoading(false);
  }
}

async function fetchMessagePage(page) {
  const res = await fetch(`${MESSAGES_API}?page=${page}`);
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

// ── 渲染留言列表 ────────────────────────────────────────────
// 使用 DocumentFragment 批量构建 DOM，减少重排次数

function renderMessageList() {
  const list = document.getElementById('message-list');
  if (!list) return;

  const messages = [];
  const repliesMap = new Map();

  currentEntries.forEach(raw => {
    const item = normalizeEntry(raw);

    if (item.replyTo) {
      if (!repliesMap.has(item.replyTo)) repliesMap.set(item.replyTo, []);
      repliesMap.get(item.replyTo).push(item);
      return;
    }

    messages.push(item);
  });

  if (messages.length === 0) {
    list.innerHTML = '';
    showEmpty();
    return;
  }

  hideEmpty();

  repliesMap.forEach(replies => {
    replies.sort((a, b) => parseTime(a.created_at) - parseTime(b.created_at));
  });

  // 使用 DocumentFragment 批量插入，避免逐条 appendChild 触发多次重排
  const fragment = document.createDocumentFragment();
  messages.forEach((item, idx) => {
    const replies = repliesMap.get(item.messageId) || [];
    const card = buildMessageCard(item, idx, replies);
    fragment.appendChild(card);
  });

  list.innerHTML = '';
  list.appendChild(fragment);
}

function buildMessageCard(item, idx, replies) {
  const nickname = escHtml(item.nickname || 'unknown');
  const location = escHtml(formatLocation(item));
  const body = escHtml(item.message || '');
  const time = formatTime(item.created_at);
  const commentBtnText = escHtml(translateWithFallback('msg_reply_btn', '评论'));
  const replyBtnText = escHtml(translateWithFallback('msg_reply_reply_btn', '回复'));
  const repliesHtml = replies.map(reply => {
    const replyNickname = escHtml(reply.nickname || 'unknown');
    const replyLocation = escHtml(formatLocation(reply));
    const replyBody = escHtml(reply.message || '');
    const replyTime = escHtml(formatTime(reply.created_at));
    const replyToNick = (reply.replyToNickname || '').trim();
    const atTag = replyToNick
      ? `<span class="message-reply-at">@${escHtml(replyToNick)}</span> `
      : '';
    const replyDebugHtml = DEBUG_MODE && reply.blobKey
      ? `<div class="msg-debug-tag" data-blob-key="${escAttr(reply.blobKey)}" title="点击复制 Blob Key">🔑 ${escHtml(reply.blobKey)}</div>`
      : '';
    return `
      <div class="message-reply-item" data-reply-nickname="${escAttr(reply.nickname || 'unknown')}">
        <div class="message-reply-meta">
          <span class="message-reply-nickname">${replyNickname}</span>
          <span class="message-reply-location">${replyLocation}</span>
          <span class="message-reply-time">${replyTime}</span>
          <span class="msg-reply-reply-btn" role="button" tabindex="0">${replyBtnText}</span>
        </div>
        <div class="message-reply-body">${atTag}${replyBody}</div>
        ${replyDebugHtml}
      </div>
    `;
  }).join('');

  const card = document.createElement('div');
  card.className = 'message-card';
  card.style.animationDelay = `${idx * 40}ms`;
  card.dataset.messageId = item.messageId;

  const debugHtml = DEBUG_MODE && item.blobKey
    ? `<div class="msg-debug-tag" data-blob-key="${escAttr(item.blobKey)}" title="点击复制 Blob Key">🔑 ${escHtml(item.blobKey)}</div>`
    : '';

  card.innerHTML = `
    <div class="message-card-header">
      <div class="message-meta">
        <span class="message-nickname">${nickname}</span>
        <span class="message-location">${location}</span>
        <span class="message-time">${escHtml(time)}</span>
        <span class="msg-reply-btn" role="button" tabindex="0">${commentBtnText}</span>
      </div>
    </div>
    <div class="message-card-body">${body}</div>
    ${debugHtml}
    ${repliesHtml ? `<div class="message-reply-list">${repliesHtml}</div>` : ''}
  `;

  // 主留言的评论按钮
  const replyBtn = card.querySelector('.msg-reply-btn');
  if (replyBtn) {
    replyBtn.addEventListener('click', () => {
      toggleReplyComposer(item.messageId, card, replyBtn, '');
    });
    replyBtn.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggleReplyComposer(item.messageId, card, replyBtn, '');
      }
    });
  }

  // 评论的回复按钮（回复其他评论）
  const replyReplyBtns = card.querySelectorAll('.msg-reply-reply-btn');
  replyReplyBtns.forEach(btn => {
    const replyItem = btn.closest('.message-reply-item');
    const targetNickname = replyItem ? replyItem.dataset.replyNickname : '';
    btn.addEventListener('click', () => {
      toggleReplyComposer(item.messageId, card, btn, targetNickname);
    });
    btn.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggleReplyComposer(item.messageId, card, btn, targetNickname);
      }
    });
  });

  // 调试标签点击复制 Blob Key
  if (DEBUG_MODE) {
    card.querySelectorAll('.msg-debug-tag').forEach(tag => {
      tag.addEventListener('click', () => {
        const key = tag.dataset.blobKey;
        if (!key) return;
        navigator.clipboard.writeText(key).then(() => {
          showToast('Blob Key 已复制');
        }).catch(() => {
          // fallback: 选中文本
          const range = document.createRange();
          range.selectNodeContents(tag);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
          showToast('请手动复制选中的 Key');
        });
      });
    });
  }

  return card;
}

/**
 * 标准化后端返回的留言条目，统一 messageId / replyTo 字段语义。
 *
 * 后端数据可能出现以下情况：
 *   1. 普通留言：replyTo 为空，messageId 为时间戳字符串
 *   2. 旧格式回复：replyTo 为空，但 messageId 以 "re:" 开头（如 "re:1711234567890"），
 *      此时 "re:" 后面的部分是被回复的原始留言 messageId
 *   3. 新格式回复：replyTo 直接给出原始留言 messageId
 *
 * 标准化逻辑：
 *   - 优先使用 replyTo 字段
 *   - 若 replyTo 为空但 messageId 带 "re:" 前缀，则从中提取父留言 ID
 *   - 回复的 messageId 统一重设为 created_at 时间戳（保证唯一性）
 *   - 普通留言保持原始 messageId，兜底使用 created_at 时间戳
 */
function normalizeEntry(entry) {
  const createdTs = parseTime(entry.created_at) || Date.now();
  const rawMessageId = String(entry.messageId || '').trim();
  const rawReplyTo = String(entry.replyTo || '').trim();

  // 确定父留言 ID：优先 replyTo，其次从 "re:" 前缀提取
  const replyTo = rawReplyTo || (rawMessageId.startsWith('re:') ? rawMessageId.slice(3) : '');

  // 回复条目的 messageId 用自身时间戳，普通留言保持原值或兜底时间戳
  const messageId = replyTo ? String(createdTs) : (rawMessageId || String(createdTs));

  return {
    ...entry,
    messageId,
    replyTo,
    replyToNickname: String(entry.replyToNickname || '').trim(),
  };
}

function parseTime(isoString) {
  const ts = new Date(isoString).getTime();
  return Number.isNaN(ts) ? 0 : ts;
}

function toggleReplyComposer(messageId, card, btn, replyToNickname = '') {
  // 如果点击同一个按钮则关闭
  if (activeReplyMessageId === messageId && activeReplyBtn === btn) {
    closeReplyComposer();
    return;
  }

  closeReplyComposer();

  activeReplyToNickname = replyToNickname;
  const composer = buildReplyComposer(messageId, replyToNickname);
  card.appendChild(composer);
  langManager.applyTranslations();

  activeReplyMessageId = messageId;
  activeReplyFormEl = composer;
  activeReplyBtn = btn;

  const nicknameInput = composer.querySelector('.msg-reply-nickname-input');
  const contentInput = composer.querySelector('.msg-reply-content-input');
  if (nicknameInput && nicknameInput.value) {
    if (contentInput) contentInput.focus();
  } else if (nicknameInput) {
    nicknameInput.focus();
  }
}

function closeReplyComposer() {
  if (activeReplyFormEl && activeReplyFormEl.parentNode) {
    activeReplyFormEl.parentNode.removeChild(activeReplyFormEl);
  }
  activeReplyMessageId = null;
  activeReplyFormEl = null;
  activeReplyBtn = null;
  activeReplyToNickname = '';
}

function buildReplyComposer(messageId, replyToNickname = '') {
  const replyPlaceholder = escAttr(translateWithFallback('msg_reply_content_placeholder', '写下你的评论...'));
  const replySubmitText = escHtml(translateWithFallback('msg_reply_submit_btn', '发送评论'));
  const cancelText = escHtml(translateWithFallback('msg_reply_cancel_btn', '取消'));

  // 回复目标提示
  const replyHintHtml = replyToNickname
    ? `<div class="message-reply-hint">
        <span data-lang-id="msg_replying_to">${escHtml(translateWithFallback('msg_replying_to', '回复'))}</span>
        <span class="message-reply-hint-nick">@${escHtml(replyToNickname)}</span>
        <span class="message-reply-hint-close" role="button" tabindex="0" title="取消指定回复">✕</span>
      </div>`
    : '';

  const wrapper = document.createElement('div');
  wrapper.className = 'message-reply-composer';
  wrapper.innerHTML = `
    <form class="msg-reply-form" method="POST">
      <input type="hidden" name="messageId" value="re:${escAttr(messageId)}">
      <input type="hidden" name="replyToNickname" class="msg-reply-to-nickname-input" value="${escAttr(replyToNickname)}">
      ${replyHintHtml}
      <div class="field-row-stacked">
        <label data-lang-id="msg_nickname_label"></label>
        <input class="msg-reply-nickname-input" name="nickname" type="text" maxlength="8" data-lang-placeholder="msg_nickname_placeholder">
      </div>
      <div class="field-row-stacked" style="margin-top:8px;">
        <label data-lang-id="msg_content_label"></label>
        <textarea class="msg-reply-content-input" name="message" rows="3" maxlength="500" placeholder="${replyPlaceholder}"></textarea>
      </div>
      <div class="message-reply-footer">
        <button class="msg-reply-cancel" type="button">${cancelText}</button>
        <button class="msg-reply-submit" type="submit">${replySubmitText}</button>
      </div>
    </form>
  `;

  const form = wrapper.querySelector('.msg-reply-form');
  const nicknameInput = wrapper.querySelector('.msg-reply-nickname-input');
  const contentInput = wrapper.querySelector('.msg-reply-content-input');
  const submitBtn = wrapper.querySelector('.msg-reply-submit');
  const cancelBtn = wrapper.querySelector('.msg-reply-cancel');
  const replyToNicknameInput = wrapper.querySelector('.msg-reply-to-nickname-input');

  // 清除 @回复 目标
  const hintClose = wrapper.querySelector('.message-reply-hint-close');
  if (hintClose) {
    hintClose.addEventListener('click', () => {
      if (replyToNicknameInput) replyToNicknameInput.value = '';
      const hintEl = wrapper.querySelector('.message-reply-hint');
      if (hintEl) hintEl.remove();
    });
  }

  // 取消按钮
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => closeReplyComposer());
  }

  // 自动填入上次使用的昵称
  const savedNick = localStorage.getItem(NICKNAME_STORAGE_KEY);
  if (savedNick && nicknameInput) {
    nicknameInput.value = savedNick;
  }

  if (form && nicknameInput && contentInput) {
    form.addEventListener('submit', async e => {
      e.preventDefault();

      const nickname = (nicknameInput.value.trim() || 'unknown').slice(0, 8);
      const content = contentInput.value.trim();

      if (!content) {
        contentInput.focus();
        showToast(langManager.translate('msg_warn_content') || '请输入留言内容');
        return;
      }

      nicknameInput.value = nickname;
      const ok = await submitMessage(form, submitBtn);
      if (!ok) {
        showToast(langManager.translate('msg_submit_error') || '提交失败，请稍后再试');
        return;
      }

      localStorage.setItem(NICKNAME_STORAGE_KEY, nickname);
      showToast(translateWithFallback('msg_reply_success', '评论已发送！'));
      closeReplyComposer();
      // 清除预取缓存，强制重新拉取最新数据
      prefetchedData = null;
      await loadMessages(1);
    });
  }

  return wrapper;
}

// ── DOM 工具函数 ──────────────────────────────────────────

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
  if (!pag) return;

  if (totalPages <= 1) {
    pag.style.display = 'none';
    return;
  }

  pag.style.display = 'flex';
  pag.innerHTML = '';

  const prevText = translateWithFallback('previous_page', '上一页');
  const nextText = translateWithFallback('next_page', '下一页');

  // 上一页按钮（首页不显示）
  if (currentPage > 1) {
    const prevBtn = document.createElement('button');
    prevBtn.className = 'msg-page-btn msg-page-prev';
    prevBtn.textContent = prevText;
    prevBtn.addEventListener('click', () => goToPage(currentPage - 1));
    pag.appendChild(prevBtn);
  }

  // 页码指示器：当前页/总页数
  const indicator = document.createElement('span');
  indicator.className = 'msg-page-indicator';
  indicator.textContent = `${currentPage}/${totalPages}`;
  pag.appendChild(indicator);

  // 下一页按钮（尾页不显示）
  if (currentPage < totalPages) {
    const nextBtn = document.createElement('button');
    nextBtn.className = 'msg-page-btn msg-page-next';
    nextBtn.textContent = nextText;
    nextBtn.addEventListener('click', () => goToPage(currentPage + 1));
    pag.appendChild(nextBtn);
  }
}

async function goToPage(page) {
  await loadMessages(page);
  // 滚动到导航栏位置，刚好能看到 tab 栏 + 第一条留言
  const tabBar = document.querySelector('menu[role="tablist"]');
  if (tabBar) {
    tabBar.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
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
    if (Number.isNaN(d.getTime())) return isoString;

    const now = Date.now();
    const diffMs = now - d.getTime();

    // 未来时间或刚刚发布，显示"1分钟前"
    if (diffMs < 60 * 1000) return langManager.translate('msg_time_minutes_ago', 1);

    const diffMin = Math.floor(diffMs / (60 * 1000));
    const diffHour = Math.floor(diffMs / (3600 * 1000));

    // 小于1小时：N分钟前
    if (diffMin < 60) return langManager.translate('msg_time_minutes_ago', diffMin);

    // 小于1天：N小时前
    if (diffHour < 24) return langManager.translate('msg_time_hours_ago', diffHour);

    // 大于等于1天：显示具体时间
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return isoString;
  }
}

function translateWithFallback(id, fallback) {
  const translated = langManager.translate(id);
  if (!translated || translated === id) return fallback;
  return translated;
}

function formatLocation(entry) {
  const location = String(entry?.location || '').trim();
  if (location) return location;
  return translateWithFallback('msg_location_unknown', '未知地区');
}
