// api/index.js
// Vercel Serverless function that acts as a proxy to the Google Apps Script
// endpoint. This adapts the previous express-based `server.js` into a single
// serverless handler suitable for Vercel's /api endpoint.

const fetch = require('node-fetch');

// Configuration via environment variables (no hardcoded exec URL)
const TARGET_URL = process.env.TARGET_URL; // must be provided in env
const API_TOKEN = process.env.API_TOKEN;   // shared secret with Apps Script
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:5500,http://127.0.0.1:5500,http://localhost:5501,http://127.0.0.1:5501').split(',').map(s => s.trim()).filter(Boolean);

// Simple in-memory rate limiter (per IP) for development. Serverless functions
// are ephemeral; this is only a best-effort protection during a single cold
// invocation and won't persist across invocations.
const RATE_WINDOW_MS = Number(process.env.RATE_WINDOW_MS || 60_000);
const RATE_MAX = Number(process.env.RATE_MAX || 120);
const rateStore = new Map();
function isRateLimited(ip) {
  try {
    const now = Date.now();
    const rec = rateStore.get(ip) || { ts: now, count: 0 };
    if (now - rec.ts > RATE_WINDOW_MS) {
      rec.ts = now; rec.count = 1;
      rateStore.set(ip, rec);
      return false;
    }
    rec.count = (rec.count || 0) + 1;
    rateStore.set(ip, rec);
    return rec.count > RATE_MAX;
  } catch (e) {
    return false;
  }
}

function setCorsHeaders(req, res) {
  const origin = req.headers.origin;
  if (!origin) {
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGINS[0] || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    return;
  }
  if (ALLOWED_ORIGINS.includes('*') || ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (ALLOWED_ORIGINS.length) {
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGINS[0]);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
}

module.exports = async (req, res) => {
  // Require configuration to be present
  if (!TARGET_URL || !API_TOKEN) {
    setCorsHeaders(req, res);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ ok: false, error: 'Missing TARGET_URL or API_TOKEN' }));
  }

  // Placeholder session check: replace with real auth later
  const hasSession = Boolean((process.env.DISABLE_SESSION_CHECK === '1') || (req.headers && (
    (req.headers.cookie && req.headers.cookie.includes('session=')) ||
    (req.headers.authorization && req.headers.authorization.trim()) ||
    (req.headers['x-session'] && req.headers['x-session'].trim())
  )));

  // Quick health check
  // Note: when deployed as a Vercel Serverless Function mounted at /api,
  // the incoming req.url may be '/health' (path within the function). Accept
  // '/health' and '/api/health' with or without trailing slash.
  if (req.method === 'GET' && (/\/?(api\/)?health\/?$/.test(req.url))) {
    setCorsHeaders(req, res);
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ ok: true, ts: new Date().toISOString(), target: TARGET_URL }));
  }

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    setCorsHeaders(req, res);
    res.statusCode = 200;
    return res.end('');
  }

  // Only accept POST for proxying
  if (req.method !== 'POST') {
    setCorsHeaders(req, res);
    res.statusCode = 405;
    return res.end('Method Not Allowed');
  }

  // Enforce session for API access
  if (!hasSession) {
    setCorsHeaders(req, res);
    res.statusCode = 401;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ ok: false, error: 'Unauthorized' }));
  }

  // Extract IP for simple rate limiting
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').toString();
  if (isRateLimited(ip)) {
    setCorsHeaders(req, res);
    res.statusCode = 429;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ ok: false, error: 'Too many requests' }));
  }

  // Read and normalize body as JSON
  let incoming = {};
  try {
    if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
      incoming = req.body;
    } else if (req.body && typeof req.body === 'string') {
      incoming = JSON.parse(req.body || '{}');
    } else if (req.body && Buffer.isBuffer(req.body)) {
      incoming = JSON.parse(req.body.toString('utf8') || '{}');
    } else {
      const text = await new Promise((resolve) => {
        let data = '';
        req.on('data', chunk => { data += chunk.toString(); });
        req.on('end', () => resolve(data));
        req.on('error', () => resolve(''));
      });
      incoming = text ? JSON.parse(text) : {};
    }
  } catch (_) { incoming = {}; }

  // Attach shared token for upstream validation
  const outbound = Object.assign({}, incoming, { token: API_TOKEN });

  try {
    // Forward to TARGET_URL as JSON
    const r = await fetch(TARGET_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(outbound),
      timeout: 30_000
    });

    // Try parse JSON for better status mapping
    let data, rawText;
    try {
      rawText = await r.text();
      data = rawText ? JSON.parse(rawText) : {};
    } catch (_) { data = null; }

    setCorsHeaders(req, res);

    // Map upstream semantic errors to HTTP codes when possible
    if (data && data.ok === false) {
      const err = String(data.error || '').toLowerCase();
      const hinted = Number(data.status || 0);
      const status = hinted || (err.includes('forbidden') ? 403 : err.includes('unknown path') ? 400 : 502);
      res.statusCode = status;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify(data));
    }

    // Pass-through on success or non-JSON
    res.statusCode = r.status;
    res.setHeader('Content-Type', 'application/json');
    return res.end(data ? JSON.stringify(data) : (rawText || '{}'));
  } catch (err) {
    console.error('proxy error', err);
    setCorsHeaders(req, res);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ ok: false, error: String(err) }));
  }
};
