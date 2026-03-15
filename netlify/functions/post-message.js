// netlify/functions/post-message.js
// 写入留言与评论到 Netlify Blobs

const { getStore } = require('@netlify/blobs');

const jsonHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'no-store',
};

const STORE_NAME = 'guestbook';
const KEY_PREFIX = 'msg:';

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        ...jsonHeaders,
        'Access-Control-Allow-Methods': 'POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: jsonHeaders,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    const payload = parseBody(event);
    const nickname = String(payload.nickname || 'unknown').trim().slice(0, 8) || 'unknown';
    const message = String(payload.message || '').trim();
    const rawMessageId = String(payload.messageId || '').trim();

    if (!message) {
      return {
        statusCode: 400,
        headers: jsonHeaders,
        body: JSON.stringify({ error: 'message is required' }),
      };
    }

    const now = Date.now();
    const isReply = rawMessageId.startsWith('re:');
    const replyTo = isReply ? rawMessageId.slice(3).trim() : '';
    const messageId = isReply ? String(now) : (rawMessageId || String(now));
    const createdAt = new Date(now).toISOString();
    const id = `${now}-${Math.random().toString(16).slice(2, 10)}`;

    const entry = {
      id,
      messageId,
      replyTo,
      isReply: Boolean(replyTo),
      nickname,
      message: message.slice(0, 500),
      created_at: createdAt,
    };

    const reverseTs = String(9999999999999 - now).padStart(13, '0');
    const key = `${KEY_PREFIX}${reverseTs}:${id}`;

    const store = getBlobStore();
    await store.set(key, JSON.stringify(entry));

    return {
      statusCode: 200,
      headers: jsonHeaders,
      body: JSON.stringify({ ok: true, item: entry }),
    };
  } catch (err) {
    console.error('post-message error:', err);
    return {
      statusCode: 500,
      headers: jsonHeaders,
      body: JSON.stringify({
        error: err.message || 'Internal Server Error',
        code: err.code || 'BLOBS_WRITE_FAILED',
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

function parseBody(event) {
  const contentType = (event.headers?.['content-type'] || event.headers?.['Content-Type'] || '').toLowerCase();

  if (contentType.includes('application/json')) {
    return JSON.parse(event.body || '{}');
  }

  if (contentType.includes('application/x-www-form-urlencoded')) {
    const params = new URLSearchParams(event.body || '');
    return {
      nickname: params.get('nickname') || '',
      message: params.get('message') || '',
      messageId: params.get('messageId') || '',
    };
  }

  return JSON.parse(event.body || '{}');
}
