// messageBoard.js
// 基于 Netlify Blobs 的留言板模块

import langManager from '/js/langManager.js';

const MESSAGES_API = '/.netlify/functions/get-messages';
const POST_MESSAGE_API = '/.netlify/functions/post-message';
const PAGE_SIZE = 20;
const NICKNAME_STORAGE_KEY = 'msg_last_nickname';
const USE_MOCK_MESSAGES = (() => {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get('mockMessages') === '1' || localStorage.getItem('mockMessages') === '1';
  } catch {
    return false;
  }
})();

let currentPage = 1;
let isLoading = false;
let hasMore = true;
let allEntries = [];
let activeReplyMessageId = null;
let activeReplyFormEl = null;
let activeReplyBtn = null;

const MOCK_BASE_TIME = new Date('2026-03-16T14:00:00+08:00').getTime();
const MOCK_NICKNAMES = ['Shelton', 'Cry', 'Mika', 'Sora', 'Aki', 'Neko', 'Pixel', 'Rin'];
const MOCK_MESSAGES = [
  '这个站的复古风格太戳我了。',
  '今天路过来打个卡，界面做得很细。',
  '文章区更新频率很舒服，继续保持！',
  'CRT效果开关很有意思，细节满分。',
  '游戏清单看得出来很用心整理。',
  '配色和字体真的很有年代感。',
  '收藏了，准备慢慢把文章都看一遍。',
  '留言板能评论之后互动感更强了。',
];
const MOCK_REPLIES = [
  '同感，尤其是像素字体部分。',
  '我也最喜欢这个页面布局。',
  '哈哈我也是这么想的。',
  '期待下一次更新内容。',
  '这个细节确实很棒。',
  '握手，审美在线。',
];
const MOCK_LOCATIONS = ['上海 · 中国', '东京 · 日本', '首尔 · 韩国', '台北 · 中国', '新加坡', '香港 · 中国'];

/**
 * 初始化留言板
 */
export function initializeMessageBoard() {
  currentPage = 1;
  isLoading = false;
  hasMore = true;
  allEntries = [];
  closeReplyComposer();
  bindFormEvents();
  loadMessages(true);
}

// ── 表单事件绑定 ────────────────────────────────────────────

function bindFormEvents() {
  const form = document.getElementById('msg-form');
  const nicknameInput = document.getElementById('msg-nickname');
  const contentInput = document.getElementById('msg-content');
  const messageIdInput = document.getElementById('msg-message-id');
  const charCount = document.getElementById('msg-char-count');
  const loadMoreBtn = document.getElementById('msg-load-more');

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
    const ok = await submitToNetlify(form, submitBtn);
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
    await loadMessages(true);
  });

  // 加载更多
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', () => loadMessages(false));
  }
}

// ── 留言提交 ────────────────────────────────────────────────

async function submitToNetlify(form, submitBtn) {
  setSubmitting(true, submitBtn);

  try {
    const formData = new FormData(form);
    const payload = {
      nickname: String(formData.get('nickname') || ''),
      message: String(formData.get('message') || ''),
      messageId: String(formData.get('messageId') || ''),
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

async function loadMessages(reset = false) {
  if (isLoading) return;

  if (reset) {
    currentPage = 1;
    hasMore = true;
    allEntries = [];
    closeReplyComposer();
    clearMessageList();
  }

  if (!hasMore) return;

  isLoading = true;
  showLoading(true);
  hideEmpty();
  hideError();

  try {
    const items = USE_MOCK_MESSAGES
      ? getMockPageData(currentPage)
      : await fetchMessagePage(currentPage);

    if (!Array.isArray(items) || items.length === 0) {
      hasMore = false;
      renderMessageList();
      updatePagination();
      return;
    }

    allEntries.push(...items);
    renderMessageList();

    hasMore = items.length === PAGE_SIZE;
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

async function fetchMessagePage(page) {
  const res = await fetch(`${MESSAGES_API}?page=${page}`);
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

function getMockPageData(page) {
  const totalMessages = 48;
  const start = (page - 1) * PAGE_SIZE;
  if (start >= totalMessages) return [];

  const end = Math.min(start + PAGE_SIZE, totalMessages);
  const items = [];

  for (let i = start; i < end; i++) {
    const messageTs = MOCK_BASE_TIME - i * 36 * 60 * 1000;
    const messageId = String(messageTs);

    items.push({
      id: `mock-msg-${i}`,
      messageId,
      replyTo: '',
      isReply: false,
      nickname: MOCK_NICKNAMES[i % MOCK_NICKNAMES.length],
      message: MOCK_MESSAGES[i % MOCK_MESSAGES.length],
      ip: `203.0.113.${(i % 200) + 1}`,
      location: MOCK_LOCATIONS[i % MOCK_LOCATIONS.length],
      created_at: new Date(messageTs).toISOString(),
    });

    if (i % 3 === 0) {
      const replyTs = messageTs + 8 * 60 * 1000;
      items.push({
        id: `mock-reply-a-${i}`,
        messageId: String(replyTs),
        replyTo: messageId,
        isReply: true,
        nickname: MOCK_NICKNAMES[(i + 2) % MOCK_NICKNAMES.length],
        message: MOCK_REPLIES[i % MOCK_REPLIES.length],
        ip: `203.0.113.${((i + 7) % 200) + 1}`,
        location: MOCK_LOCATIONS[(i + 1) % MOCK_LOCATIONS.length],
        created_at: new Date(replyTs).toISOString(),
      });
    }

    if (i % 5 === 0) {
      const replyTs = messageTs + 12 * 60 * 1000;
      items.push({
        id: `mock-reply-b-${i}`,
        messageId: String(replyTs),
        replyTo: messageId,
        isReply: true,
        nickname: MOCK_NICKNAMES[(i + 4) % MOCK_NICKNAMES.length],
        message: MOCK_REPLIES[(i + 1) % MOCK_REPLIES.length],
        ip: `203.0.113.${((i + 11) % 200) + 1}`,
        location: MOCK_LOCATIONS[(i + 2) % MOCK_LOCATIONS.length],
        created_at: new Date(replyTs).toISOString(),
      });
    }
  }

  // 模拟接口返回：按时间降序
  return items.sort((a, b) => parseTime(b.created_at) - parseTime(a.created_at));
}

// ── 渲染单条留言 ────────────────────────────────────────────

function renderMessageList() {
  const list = document.getElementById('message-list');
  if (!list) return;

  list.innerHTML = '';

  const messages = [];
  const repliesMap = new Map();

  allEntries.forEach(raw => {
    const item = normalizeEntry(raw);

    if (item.replyTo) {
      if (!repliesMap.has(item.replyTo)) repliesMap.set(item.replyTo, []);
      repliesMap.get(item.replyTo).push(item);
      return;
    }

    messages.push(item);
  });

  if (messages.length === 0) {
    showEmpty();
    return;
  }

  hideEmpty();

  repliesMap.forEach(replies => {
    replies.sort((a, b) => parseTime(a.created_at) - parseTime(b.created_at));
  });

  messages.forEach((item, idx) => {
    const replies = repliesMap.get(item.messageId) || [];
    renderMessageCard(item, idx, replies);
  });
}

function renderMessageCard(item, idx, replies) {
  const list = document.getElementById('message-list');
  if (!list) return;

  const nickname = escHtml(item.nickname || 'unknown');
  const location = escHtml(formatLocation(item));
  const body = escHtml(item.message || '');
  const time = formatTime(item.created_at);
  const commentBtnText = escHtml(translateWithFallback('msg_reply_btn', '评论'));
  const repliesHtml = replies.map(reply => {
    const replyNickname = escHtml(reply.nickname || 'unknown');
    const replyLocation = escHtml(formatLocation(reply));
    const replyBody = escHtml(reply.message || '');
    const replyTime = escHtml(formatTime(reply.created_at));
    return `
      <div class="message-reply-item">
        <div class="message-reply-meta">
          <span class="message-reply-nickname">${replyNickname}</span>
          <span class="message-reply-location">${replyLocation}</span>
          <span class="message-reply-time">${replyTime}</span>
        </div>
        <div class="message-reply-body">${replyBody}</div>
      </div>
    `;
  }).join('');

  const card = document.createElement('div');
  card.className = 'message-card';
  card.style.animationDelay = `${idx * 40}ms`;
  card.dataset.messageId = item.messageId;
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
    ${repliesHtml ? `<div class="message-reply-list">${repliesHtml}</div>` : ''}
  `;

  const replyBtn = card.querySelector('.msg-reply-btn');
  if (replyBtn) {
    replyBtn.addEventListener('click', () => {
      toggleReplyComposer(item.messageId, card, replyBtn);
    });
    replyBtn.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggleReplyComposer(item.messageId, card, replyBtn);
      }
    });
  }

  list.appendChild(card);
}

function normalizeEntry(entry) {
  const createdTs = parseTime(entry.created_at) || Date.now();
  const rawMessageId = String(entry.messageId || '').trim();
  const rawReplyTo = String(entry.replyTo || '').trim();
  const replyTo = rawReplyTo || (rawMessageId.startsWith('re:') ? rawMessageId.slice(3) : '');
  const messageId = replyTo ? String(createdTs) : (rawMessageId || String(createdTs));

  return {
    ...entry,
    messageId,
    replyTo,
  };
}

function parseTime(isoString) {
  const ts = new Date(isoString).getTime();
  return Number.isNaN(ts) ? 0 : ts;
}

function toggleReplyComposer(messageId, card, btn) {
  if (activeReplyMessageId === messageId) {
    closeReplyComposer();
    return;
  }

  closeReplyComposer();

  const composer = buildReplyComposer(messageId);
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
}

function buildReplyComposer(messageId) {
  const replyPlaceholder = escAttr(translateWithFallback('msg_reply_content_placeholder', '写下你的评论...'));
  const replySubmitText = escHtml(translateWithFallback('msg_reply_submit_btn', '发送评论'));

  const wrapper = document.createElement('div');
  wrapper.className = 'message-reply-composer';
  wrapper.innerHTML = `
    <form class="msg-reply-form" method="POST">
      <input type="hidden" name="messageId" value="re:${escAttr(messageId)}">
      <div class="field-row-stacked">
        <label data-lang-id="msg_nickname_label"></label>
        <input class="msg-reply-nickname-input" name="nickname" type="text" maxlength="8" data-lang-placeholder="msg_nickname_placeholder">
      </div>
      <div class="field-row-stacked" style="margin-top:8px;">
        <label data-lang-id="msg_content_label"></label>
        <textarea class="msg-reply-content-input" name="message" rows="3" maxlength="500" placeholder="${replyPlaceholder}"></textarea>
      </div>
      <div class="message-reply-footer">
        <button class="msg-reply-submit" type="submit">${replySubmitText}</button>
      </div>
    </form>
  `;

  const form = wrapper.querySelector('.msg-reply-form');
  const nicknameInput = wrapper.querySelector('.msg-reply-nickname-input');
  const contentInput = wrapper.querySelector('.msg-reply-content-input');
  const submitBtn = wrapper.querySelector('.msg-reply-submit');

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
      const ok = await submitToNetlify(form, submitBtn);
      if (!ok) {
        showToast(langManager.translate('msg_submit_error') || '提交失败，请稍后再试');
        return;
      }

      localStorage.setItem(NICKNAME_STORAGE_KEY, nickname);
      showToast(translateWithFallback('msg_reply_success', '评论已发送！'));
      closeReplyComposer();
      await loadMessages(true);
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

function escAttr(str) {
  return escHtml(str).replace(/`/g, '&#96;');
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

