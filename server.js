// server.js
// Simple proxy server used during local development to forward requests
// from the frontend (running on http-server at port 5500) to a remote
// Google Apps Script endpoint. This file is intentionally lightweight
// and intended for development only. Do NOT use this as a production
// proxy without adding proper security controls.
//
// Inputs/Outputs (contract):
// - Inputs: HTTP requests from frontend (usually POST /api with text/plain body)
// - Outputs: Forwards the request to the TARGET_URL and mirrors the response
// - Error modes: Returns 500 on fetch errors, 429 when rate-limited

const express = require('express');
const fetch = require('node-fetch');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000; // default dev port for proxy

// Configuration via environment
// Comma-separated allowed origins (set ALLOWED_ORIGINS env var if needed)
// Default has common dev origins for local testing. Update TARGET_URL to
// point to your Apps Script deployment if it changes.
const TARGET_URL = process.env.TARGET_URL; // required in env
const API_TOKEN = process.env.API_TOKEN;   // shared secret with Apps Script
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:5500,http://127.0.0.1:5500,http://localhost:5501,http://127.0.0.1:5501,http://192.168.1.11:5500,http://localhost:3000').split(',').map(s=>s.trim()).filter(Boolean);

// Basic request size limit and parsers
// Use text body parser to accept 'text/plain' and generic payloads sent by the
// frontend. Limit the size to avoid memory issues; set BODY_LIMIT env var if
// you need larger payloads during development.
// Accept JSON (preferred) and text (fallback). We'll normalize to JSON.
app.use(bodyParser.json({ limit: process.env.BODY_LIMIT || '128kb' }));
app.use(bodyParser.text({ type: '*/*', limit: process.env.BODY_LIMIT || '128kb' }));

// Serve static files
app.use(express.static('./', { index: 'index.html' }));

// Global CORS middleware: ensure browser clients (localhost:5500/5501) receive the correct headers
// CORS helper middleware: reflect allowed origins or fall back to a safe default.
// Note: In production, set a strict list of allowed origins and consider
// enabling credentials only when necessary.
app.use(function(req, res, next){
  const origin = req.headers.origin || '';
  if (origin && (ALLOWED_ORIGINS.includes('*') || ALLOWED_ORIGINS.includes(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (ALLOWED_ORIGINS.length) {
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGINS[0]);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'false');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Simple in-memory rate limiter (per IP) to avoid accidental floods during dev
// Simple in-memory rate limiter for dev. It is not resilient across restarts
// and is per-process only. Adjust RATE_WINDOW_MS and RATE_MAX via env vars.
const RATE_WINDOW_MS = Number(process.env.RATE_WINDOW_MS || 60_000); // 1 minute
const RATE_MAX = Number(process.env.RATE_MAX || 120); // max requests per window per IP
const rateStore = new Map();
function isRateLimited(ip){
  try{
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
  } catch(e){ return false; }
}

// Health check endpoint to verify the server is running
// Health endpoint(s) - provide a stable JSON response used by start scripts
// and orchestration tools.
app.get('/health', (req, res) => {
  setCorsHeaders(req, res);
  res.json({ ok: true, ts: new Date().toISOString(), target: TARGET_URL });
});

// Preflight/CORS helper
function setCorsHeaders(req, res){
  const origin = req.headers.origin;
  if (!origin) {
    res.set('Access-Control-Allow-Origin', ALLOWED_ORIGINS.includes('*') ? '*' : ALLOWED_ORIGINS[0]);
    return;
  }
  if (ALLOWED_ORIGINS.includes('*') || ALLOWED_ORIGINS.includes(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
  }
  res.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
}

// Options handler for CORS preflight
// CORS preflight for /api
app.options('/api', (req, res) => {
  setCorsHeaders(req, res);
  return res.sendStatus(200);
});

// Proxy endpoint
// Proxy endpoint: accepts a text/plain body (or any text payload) and forwards
// it to the configured TARGET_URL. Mirrors the response including Content-Type.
app.post('/api', async (req, res) => {
  // Ensure configuration is present
  if (!TARGET_URL || !API_TOKEN) {
    setCorsHeaders(req, res);
    return res.status(500).json({ ok: false, error: 'Missing TARGET_URL or API_TOKEN' });
  }

  // Placeholder session enforcement for local dev
  const hasSession = Boolean((process.env.DISABLE_SESSION_CHECK === '1') || (req.headers && (
    (req.headers.cookie && req.headers.cookie.includes('session=')) ||
    (req.headers.authorization && req.headers.authorization.trim()) ||
    (req.headers['x-session'] && req.headers['x-session'].trim())
  )));
  if (!hasSession) {
    setCorsHeaders(req, res);
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  if (isRateLimited(ip)) {
    console.warn(`Rate limit hit for ${ip}`);
    setCorsHeaders(req, res);
    return res.status(429).json({ ok: false, error: 'Too many requests' });
  }

  try {
    // Normalize incoming to JSON
    let incoming = {};
    if (req.is('application/json') && req.body && typeof req.body === 'object') {
      incoming = req.body;
    } else if (typeof req.body === 'string') {
      try { incoming = JSON.parse(req.body || '{}'); } catch (_) { incoming = {}; }
    } else { incoming = {}; }

    const outbound = Object.assign({}, incoming, { token: API_TOKEN });

    console.log(`Proxying request from ${ip} to ${TARGET_URL}`);
    const r = await fetch(TARGET_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(outbound)
    });

    let data, rawText;
    try { rawText = await r.text(); data = rawText ? JSON.parse(rawText) : {}; } catch (_) { data = null; }

    setCorsHeaders(req, res);
    if (data && data.ok === false) {
      const err = String(data.error || '').toLowerCase();
      const hinted = Number(data.status || 0);
      const status = hinted || (err.includes('forbidden') ? 403 : err.includes('unknown path') ? 400 : 502);
      return res.status(status).json(data);
    }

    return res.status(r.status).type('application/json').send(data ? JSON.stringify(data) : (rawText || '{}'));
  } catch (err) {
    console.error('proxy error', err);
    setCorsHeaders(req, res);
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

app.listen(PORT, ()=> console.log(`Proxy server listening on http://localhost:${PORT} -> ${TARGET_URL}`));
