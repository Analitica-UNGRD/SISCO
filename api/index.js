// api/index.js
// Vercel Serverless function that acts as a proxy to the Google Apps Script
// endpoint. This adapts the previous express-based `server.js` into a single
// serverless handler suitable for Vercel's /api endpoint.

const fetch = require('node-fetch');

// Configuration via environment variables
const TARGET_URL = process.env.TARGET_URL || 'https://script.google.com/macros/s/AKfycbxDwFfPA3Ull4bEHbabzgxOvO1iQEuvM3fy_XbRJcwUnEBUuJee5JBHqPPeXo7v1xYwKg/exec';
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
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return;
  }
  if (ALLOWED_ORIGINS.includes('*') || ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (ALLOWED_ORIGINS.length) {
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGINS[0]);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

module.exports = async (req, res) => {
  // Quick health check
  if (req.method === 'GET' && req.url === '/api/health' || (req.method === 'GET' && req.url === '/api/health/')) {
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

  // Extract IP for simple rate limiting
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').toString();
  if (isRateLimited(ip)) {
    setCorsHeaders(req, res);
    res.statusCode = 429;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ ok: false, error: 'Too many requests' }));
  }

  // Read body as text (works with Vercel's Node runtime)
  let bodyText = '';
  if (req.body && typeof req.body === 'string') {
    bodyText = req.body;
  } else if (req.body && Buffer.isBuffer(req.body)) {
    bodyText = req.body.toString('utf8');
  } else if (req.body && typeof req.body === 'object') {
    // If parsed JSON
    try { bodyText = JSON.stringify(req.body); } catch(e) { bodyText = String(req.body); }
  } else {
    // Fallback: collect stream
    bodyText = await new Promise((resolve) => {
      let data = '';
      req.on('data', chunk => { data += chunk.toString(); });
      req.on('end', () => resolve(data));
      req.on('error', () => resolve(''));
    });
  }

  try {
    // Forward to TARGET_URL
    const r = await fetch(TARGET_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: bodyText || '{}',
      timeout: 30_000
    });

    const contentType = r.headers.get('content-type') || 'application/json';
    const text = await r.text();

    setCorsHeaders(req, res);
    res.statusCode = r.status;
    res.setHeader('Content-Type', contentType);
    return res.end(text);
  } catch (err) {
    console.error('proxy error', err);
    setCorsHeaders(req, res);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ ok: false, error: String(err) }));
  }
};
