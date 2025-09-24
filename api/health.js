// Minimal health check for Vercel at /api/health
module.exports = (req, res) => {
  // Allow simple CORS for health checks
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    return res.end('');
  }

  if (req.method === 'GET') {
    res.statusCode = 200;
    return res.end(JSON.stringify({ ok: true, ts: new Date().toISOString() }));
  }

  res.statusCode = 405;
  return res.end(JSON.stringify({ ok: false, error: 'Method Not Allowed' }));
};
