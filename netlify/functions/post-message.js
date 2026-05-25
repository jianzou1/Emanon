// netlify/functions/post-message.js
// 写入留言与评论到 Netlify Blobs

const { getStore } = require('@netlify/blobs');

const jsonHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'no-store',
};

const STORE_NAME = 'guestbook';
// Key 前缀约定：
//   主留言：  msg:<reverseTs>:<id>
//   回复：    re:<replyTo>:<reverseTs>:<id>
// 通过前缀直接区分主/回复，主留言列表可只 list 'msg:' 前缀，避免读全量回复。
// 旧数据：所有 entry 都用 'msg:' 前缀，靠 entry.replyTo 字段区分；读取侧做兼容。
const MSG_KEY_PREFIX = 'msg:';
const REPLY_KEY_PREFIX = 're:';

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
    const rawReplyToNickname = String(payload.replyToNickname || '').trim().slice(0, 8);

    if (!message) {
      return {
        statusCode: 400,
        headers: jsonHeaders,
        body: JSON.stringify({ error: 'message is required' }),
      };
    }

    const now = Date.now();
    const clientIP = extractClientIP(event.headers);
    const location = await extractLocation(event.headers, clientIP);
    const isReply = rawMessageId.startsWith('re:');
    const replyTo = isReply ? rawMessageId.slice(3).trim() : '';
    const messageId = isReply ? String(now) : (rawMessageId || String(now));
    const createdAt = new Date(now).toISOString();
    const id = `${now}-${Math.random().toString(16).slice(2, 10)}`;

    const entry = {
      id,
      messageId,
      replyTo,
      replyToNickname: isReply ? rawReplyToNickname : '',
      isReply: Boolean(replyTo),
      nickname,
      message: message.slice(0, 500),
      ip: clientIP,
      location,
      created_at: createdAt,
    };

    const reverseTs = String(9999999999999 - now).padStart(13, '0');
    // 主留言：msg:<reverseTs>:<id>
    // 回复：  re:<replyTo>:<reverseTs>:<id> —— 前缀含父 ID，便于按主留言精确拉回复
    const key = isReply
      ? `${REPLY_KEY_PREFIX}${replyTo}:${reverseTs}:${id}`
      : `${MSG_KEY_PREFIX}${reverseTs}:${id}`;

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
      replyToNickname: params.get('replyToNickname') || '',
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

async function extractLocation(headers = {}, ip = '') {
  const geo = parseGeoHeader(getHeader(headers, 'x-nf-geo'));
  if (geo) {
    const city = firstNonEmpty(geo.city, geo.city_name);
    const region = firstNonEmpty(geo.region, geo.subdivision, geo.state);
    const country = firstNonEmpty(
      geo.country,
      geo.country_name,
      typeof geo.country === 'object' ? geo.country?.name : ''
    );

    const fromGeo = joinLocation(city, region, country);
    if (fromGeo) return fromGeo;
  }

  const headerCity = firstNonEmpty(getHeader(headers, 'x-city'), getHeader(headers, 'x-nf-city'));
  const headerRegion = firstNonEmpty(getHeader(headers, 'x-region'), getHeader(headers, 'x-nf-region'));
  const headerCountry = firstNonEmpty(
    getHeader(headers, 'x-country-name'),
    getHeader(headers, 'x-nf-country-name'),
    getHeader(headers, 'x-country'),
    getHeader(headers, 'x-nf-country')
  );

  const fromHeaders = joinLocation(headerCity, headerRegion, headerCountry);
  if (fromHeaders) return fromHeaders;

  if (!ip) return '';

  const fromIP = await lookupLocationByIP(ip);
  return fromIP || '';
}

function joinLocation(city, region, country) {
  const parts = [city, region, country].filter(Boolean);
  if (parts.length === 0) return '';
  return Array.from(new Set(parts)).join(' · ');
}

async function lookupLocationByIP(ip) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1500);

  try {
    const url = `https://ipwho.is/${encodeURIComponent(ip)}`;
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return '';

    const data = await res.json();
    if (!data || data.success === false) return '';

    const city = firstNonEmpty(data.city);
    const region = firstNonEmpty(data.region);
    const country = firstNonEmpty(data.country);

    return joinLocation(city, region, country);
  } catch {
    return '';
  } finally {
    clearTimeout(timer);
  }
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
