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
    const clientIP = extractClientIP(event.headers);
    const location = extractLocation(event.headers);
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
      ip: clientIP,
      location,
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

function extractClientIP(headers = {}) {
  const directIP = getHeader(headers, 'x-nf-client-connection-ip') || getHeader(headers, 'client-ip');
  if (directIP) return directIP.trim();

  const forwarded = getHeader(headers, 'x-forwarded-for');
  if (!forwarded) return '';

  const first = forwarded.split(',')[0] || '';
  return first.trim();
}

function extractLocation(headers = {}) {
  const geo = parseGeoHeader(getHeader(headers, 'x-nf-geo'));
  if (!geo) return '';

  const city = firstNonEmpty(geo.city, geo.city_name);
  const region = firstNonEmpty(geo.region, geo.subdivision, geo.state);
  const country = firstNonEmpty(
    geo.country,
    geo.country_name,
    typeof geo.country === 'object' ? geo.country?.name : ''
  );

  const parts = [city, region, country].filter(Boolean);
  if (parts.length === 0) return '';

  return Array.from(new Set(parts)).join(' · ');
}

function parseGeoHeader(raw) {
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    try {
      return JSON.parse(decodeURIComponent(raw));
    } catch {
      return null;
    }
  }
}

function getHeader(headers, name) {
  const target = String(name || '').toLowerCase();
  const keys = Object.keys(headers || {});
  const matchedKey = keys.find(k => String(k).toLowerCase() === target);
  return matchedKey ? String(headers[matchedKey] || '') : '';
}

function firstNonEmpty(...values) {
  for (const value of values) {
    if (value == null) continue;
    if (typeof value === 'object') continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return '';
}
