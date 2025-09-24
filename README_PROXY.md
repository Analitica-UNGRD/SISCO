Proxy development helper

This project includes a small Express proxy that forwards requests from your local frontend to the Apps Script exec URL and adds CORS headers so the browser won't block requests.

Why use it
- Apps Script Web Apps do not allow setting arbitrary CORS headers from ContentService. Using a local proxy avoids CORS and lets you control retries and rate limits.

How to run
1. Install dependencies (Node.js required):

```powershell
cd D:\Seguimiento_contratistas
npm install express node-fetch@2 body-parser
```

2. Start the static frontend (if not running):

```powershell
npm start
```

3. Start the proxy:

```powershell
npm run proxy
```

This starts a proxy at http://localhost:3000. The frontend should point APP_CONFIG.BASE_URL to http://localhost:3000/api (see `src/lib/config.js` or `window.APP_CONFIG_OVERRIDE` in pages).

Change target Apps Script URL
- By default the proxy forwards to the URL embedded into the server. To override, set env var APPS_SCRIPT_URL when running:

```powershell
$env:APPS_SCRIPT_URL = 'https://script.google.com/....'
npm run proxy
```

Security note
- The proxy uses Access-Control-Allow-Origin: * for local development. Do not expose this proxy publicly without tightening CORS and auth.
