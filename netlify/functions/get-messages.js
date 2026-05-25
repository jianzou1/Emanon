// netlify/functions/get-messages.js
// 从 Netlify Blobs 读取留言与评论

const { getStore } = require('@netlify/blobs');

const jsonHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'no-store',
};

const STORE_NAME = 'guestbook';
// Key 前缀约定（与 post-message.js 保持一致）：
//   主留言：  msg:<reverseTs>:<id>
//   回复：    re:<replyTo>:<reverseTs>:<id>
// 旧数据所有 entry 都用 'msg:' 前缀，靠 entry.replyTo 字段区分；本函数读取时同时扫两个前缀，
// 并以 entry.replyTo 字段为权威依据分类，确保新旧数据共存期间正确分桶。
const MSG_KEY_PREFIX = 'msg:';
const REPLY_KEY_PREFIX = 're:';
const PER_PAGE = 20;

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        ...jsonHeaders,
        'Access-Control-Allow-Methods': 'GET,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: jsonHeaders,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    const store = getBlobStore();
    const page = Math.max(parseInt(event.queryStringParameters?.page || '1', 10) || 1, 1);

    // 同时 list 两个前缀，兼容存量数据（旧回复在 msg: 前缀下）
    const [listedMsg, listedReply] = await Promise.all([
      store.list({ prefix: MSG_KEY_PREFIX }),
      store.list({ prefix: REPLY_KEY_PREFIX }),
    ]);
    const blobs = [
      ...(Array.isArray(listedMsg?.blobs) ? listedMsg.blobs : []),
      ...(Array.isArray(listedReply?.blobs) ? listedReply.blobs : []),
    ];

    const loaded = await Promise.all(
      blobs.map(async blob => {
        try {
          const raw = await store.get(blob.key);
          if (!raw) return null;
          const entry = normalizeEntry(JSON.parse(raw));
          entry.blobKey = blob.key;
          return entry;
        } catch (err) {
          console.warn('skip invalid blob:', blob?.key, err?.message || err);
          return null;
        }
      })
    );

    const valid = loaded.filter(Boolean);

    // 分离主留言和回复
    const messages = [];
    const replies = [];
    for (const entry of valid) {
      if (entry.isReply || entry.replyTo) {
        replies.push(entry);
      } else {
        messages.push(entry);
      }
    }

    // 仅对主留言按时间倒序排列并分页
    messages.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const totalMessages = messages.length;
    const start = (page - 1) * PER_PAGE;
    const end = start + PER_PAGE;
    const pageMessages = messages.slice(start, end);

    // 收集当前页主留言的 messageId，筛选对应回复
    const pageMessageIds = new Set(pageMessages.map(m => m.messageId));
    const pageReplies = replies.filter(r => pageMessageIds.has(r.replyTo));

    // 合并：当前页主留言 + 其完整回复
    const result = [...pageMessages, ...pageReplies];

    return {
      statusCode: 200,
      headers: jsonHeaders,
      body: JSON.stringify({ items: result, total: totalMessages }),
    };
  } catch (err) {
    console.error('get-messages error:', err);
    return {
      statusCode: 500,
      headers: jsonHeaders,
      body: JSON.stringify({
        error: err.message || 'Internal Server Error',
        code: err.code || 'BLOBS_READ_FAILED',
      }),
    };
  }
};

function getBlobStore() {
  try {
    return getStore(STORE_NAME);
  } catch (autoErr) {
    const siteID = process.env.NETLIFY_SITE_ID || process.env.SITE_ID || '';
    const token =
      process.env.NETLIFY_API_TOKEN ||
      process.env.NETLIFY_BLOBS_TOKEN ||
      process.env.NETLIFY_AUTH_TOKEN ||
      '';

    if (!siteID || !token) {
      const error = new Error(
        'Blobs context unavailable. Set NETLIFY_SITE_ID and NETLIFY_API_TOKEN (or NETLIFY_BLOBS_TOKEN) in site env vars.'
      );
      error.code = 'BLOBS_CONTEXT_MISSING';
      throw error;
    }

    return getStore(STORE_NAME, { siteID, token });
  }
}

function normalizeEntry(input) {
  const createdAt = input?.created_at || new Date().toISOString();
  const rawMessageId = String(input?.messageId || '').trim();
  const rawReplyTo = String(input?.replyTo || '').trim();
  const replyTo = rawReplyTo || (rawMessageId.startsWith('re:') ? rawMessageId.slice(3) : '');
  const fallbackId = String(new Date(createdAt).getTime() || Date.now());
  const messageId = replyTo ? fallbackId : (rawMessageId || fallbackId);

  return {
    id: String(input?.id || `${fallbackId}-${Math.random().toString(16).slice(2, 8)}`),
    messageId,
    replyTo,
    replyToNickname: String(input?.replyToNickname || '').trim().slice(0, 8),
    isReply: Boolean(replyTo),
    nickname: String(input?.nickname || 'unknown').slice(0, 8),
    message: String(input?.message || ''),
    ip: String(input?.ip || ''),
    location: String(input?.location || ''),
    created_at: createdAt,
  };
}
