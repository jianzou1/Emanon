// netlify/functions/get-messages.js
// 从 Netlify Blobs 读取留言与评论

const { getStore } = require('@netlify/blobs');

const jsonHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'no-store',
};

const STORE_NAME = 'guestbook';
const KEY_PREFIX = 'msg:';
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

    const listed = await store.list({ prefix: KEY_PREFIX });
    const blobs = Array.isArray(listed?.blobs) ? listed.blobs : [];

    const loaded = await Promise.all(
      blobs.map(async blob => {
        try {
          const raw = await store.get(blob.key);
          if (!raw) return null;
          return normalizeEntry(JSON.parse(raw));
        } catch (err) {
          console.warn('skip invalid blob:', blob?.key, err?.message || err);
          return null;
        }
      })
    );

    const sorted = loaded
      .filter(Boolean)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const start = (page - 1) * PER_PAGE;
    const end = start + PER_PAGE;
    const result = sorted.slice(start, end);

    return {
      statusCode: 200,
      headers: jsonHeaders,
      body: JSON.stringify(result),
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
    isReply: Boolean(replyTo),
    nickname: String(input?.nickname || 'unknown').slice(0, 8),
    message: String(input?.message || ''),
    created_at: createdAt,
  };
}
