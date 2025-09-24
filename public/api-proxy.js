// Este archivo permite redirigir las peticiones al backend desde el frontend
// cuando se está ejecutando con http-server simple

document.addEventListener('DOMContentLoaded', function() {
  // Crear un elemento para mostrar el estado de la conexión
  const statusEl = document.createElement('div');
  statusEl.id = 'api-proxy-status';
  statusEl.style.cssText = 'position:fixed; bottom:0; right:0; background:#2563eb; color:white; font-size:12px; padding:2px 5px; z-index:9999; border-top-left-radius:4px; opacity:0.8;';
  statusEl.innerHTML = 'API: <span id="api-status">Comprobando...</span>';
  document.body.appendChild(statusEl);
  
  // Comprobar si podemos conectar con la API relativa (/api/health) en
  // producción (Vercel) o fallback a localhost durante desarrollo.
  fetch('/api/health')
    .then(response => {
      if (response.ok) {
        document.getElementById('api-status').textContent = 'Conectado';
        statusEl.style.background = '#10b981'; // verde
      } else {
        document.getElementById('api-status').textContent = 'Error';
        statusEl.style.background = '#ef4444'; // rojo
      }
    })
    .catch(err => {
      // Fallback: intentar conectar al proxy local para dev (localhost)
      fetch('http://localhost:3000/health').then(r => {
        if (r.ok) {
          document.getElementById('api-status').textContent = 'Conectado (local)';
          statusEl.style.background = '#10b981';
          return;
        }
        document.getElementById('api-status').textContent = 'Error';
        statusEl.style.background = '#ef4444';
      }).catch(e => {
        document.getElementById('api-status').textContent = 'Sin conexión';
        statusEl.style.background = '#f59e0b'; // naranja
        console.warn('No se puede conectar al servidor proxy (ni /api ni localhost):', err, e);
      });
    });
    
  // Interceptar las peticiones a /api-proxy y redirigirlas al proxy
  const originalFetch = window.fetch;
  window.fetch = function(url, options) {
    if (url === '/api-proxy') {
      // Preferir la ruta relativa /api (función serverless en Vercel) y
      // caer a localhost en desarrollo si es necesario.
      return originalFetch('/api', options).catch(() => originalFetch('http://localhost:3000/api', options));
    }
    return originalFetch(url, options);
  };
});
