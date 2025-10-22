// Este archivo permite redirigir las peticiones al backend desde el frontend
// cuando se está ejecutando con http-server simple
(function(){
  const originalFetch = window.fetch.bind(window);

  async function resolveRequestInit(input, init){
    if (typeof input === 'string') return { targetUrl: input, requestInit: init };
    if (input instanceof Request) {
      const cloned = input.clone();
      const requestInit = init ? { ...init } : {
        method: cloned.method,
        headers: new Headers(cloned.headers)
      };
      if (requestInit.body === undefined && cloned.method && !/^(GET|HEAD)$/i.test(cloned.method)) {
        requestInit.body = await cloned.text();
      }
      return { targetUrl: cloned.url, requestInit };
    }
    return { targetUrl: '', requestInit: init };
  }

  async function proxyFetch(input, init){
    const { targetUrl, requestInit } = await resolveRequestInit(input, init);
    const normalizedUrl = targetUrl ? new URL(targetUrl, window.location.origin) : null;
    const isSameOriginProxy = normalizedUrl && normalizedUrl.origin === window.location.origin && normalizedUrl.pathname === '/api-proxy';

    if (!isSameOriginProxy) {
      return originalFetch(input, init);
    }

    const targets = ['http://localhost:3000/api', '/api'];
    let lastError = null;
    let lastResponse = null;

    for (const target of targets) {
      try {
        const resp = await originalFetch(target, requestInit);
        if (resp && resp.ok) {
          return resp;
        }
        lastResponse = resp;
      } catch (err) {
        lastError = err;
        continue;
      }
    }

    if (lastResponse) {
      return lastResponse;
    }

    if (lastError) {
      throw lastError;
    }

    return originalFetch(input, init);
  }

  window.fetch = function(input, init){
    return proxyFetch(input, init);
  };

  function appendStatusBadge(){
    if (document.getElementById('api-proxy-status')) return;
    const statusEl = document.createElement('div');
    statusEl.id = 'api-proxy-status';
    statusEl.style.cssText = 'position:fixed; bottom:0; right:0; background:#2563eb; color:white; font-size:12px; padding:2px 5px; z-index:9999; border-top-left-radius:4px; opacity:0.8;';
    statusEl.innerHTML = 'API: <span id="api-status">Comprobando...</span>';
    document.body.appendChild(statusEl);
    checkConnectivity(statusEl);
  }

  function checkConnectivity(statusEl){
    const statusNode = document.getElementById('api-status');
    const updateStatus = (text, color) => {
      if (statusNode) statusNode.textContent = text;
      statusEl.style.background = color;
    };

    originalFetch('http://localhost:3000/health')
      .then(response => {
        if (response.ok) {
          updateStatus('Conectado (local)', '#10b981');
        } else {
          updateStatus('Error (local)', '#ef4444');
        }
      })
      .catch(localErr => {
        originalFetch('/api/health')
          .then(response => {
            if (response.ok) {
              updateStatus('Conectado (/api)', '#10b981');
            } else {
              updateStatus('Error', '#ef4444');
            }
          })
          .catch(relativeErr => {
            updateStatus('Sin conexión', '#f59e0b');
            console.warn('No se puede conectar al servidor proxy (ni localhost ni /api):', localErr, relativeErr);
          });
      });
  }

  function init(){
    if (document.body) {
      appendStatusBadge();
    } else {
      document.addEventListener('DOMContentLoaded', appendStatusBadge, { once: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
