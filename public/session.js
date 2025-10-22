// session.js
// Maneja la sesión: obtiene role desde /getSessionInfo y monta la plantilla adecuada
import { adminTemplate, contractorTemplate } from './templates.js';
import { loadDashboardData } from '/src/pages-scripts/dashboard.js';
import { USE_MOCKS, fetchSessionInfoMock } from './api.mocks.js';
import { APP_CONFIG } from '/src/lib/config.js';

// Obtiene la sesión actual a través del proxy configurado en APP_CONFIG.BASE_URL.
export async function fetchSessionInfo() {
  try {
    if (USE_MOCKS) return fetchSessionInfoMock();

    if (!APP_CONFIG || !APP_CONFIG.BASE_URL) {
      console.warn('APP_CONFIG.BASE_URL no está configurado, regresando fallback.');
      return { fallback: true, error: 'APP_CONFIG.BASE_URL no configurado' };
    }

    const response = await fetch(APP_CONFIG.BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: 'getSessionInfo', payload: {} })
    });

    if (response.status === 403) {
      return { fallback: true, error: 'El servicio de sesión respondió 403 (forbidden).' };
    }

    const raw = await response.text();
    let data;
    try {
      data = raw && raw.length ? JSON.parse(raw) : null;
    } catch (parseErr) {
      console.warn('Respuesta no JSON al obtener sesión:', parseErr, raw ? raw.substring(0, 150) : '');
      return { fallback: true, error: 'Respuesta no válida del backend de sesión' };
    }

    if (!data || !data.ok) {
      return { fallback: true, error: (data && data.error) || 'Error obteniendo sesión' };
    }

    return {
      email: data.email || '',
      role: data.rol || '',
      name: data.nombre || data.name || ''
    };
  } catch (err) {
    console.warn('fetchSessionInfo failed:', err);
    return { fallback: true, error: err.message };
  }
}

// bootstrap: decide template por role e inyecta en #app
export async function bootstrap() {
  const app = document.getElementById('app');
  app.innerHTML = '<div class="p-8">Cargando sesión...</div>';

  const session = await fetchSessionInfo();

  // usar mocks si no hay respuesta válida
  let role = 'contratista';
  let name = 'Usuario';
  let email = '';

  if (session && session.role) {
    role = session.role;
    name = session.name || name;
    email = session.email || '';
  } else if (session && session.fallback && USE_MOCKS) {
    // mock returned fallback marker: get a real mock
    const s = await fetchSessionInfoMock();
    role = s.role; name = s.name; email = s.email;
    // show demo banner
    app.innerHTML = `<div class="bg-yellow-100 p-3 text-yellow-800">Modo demo: usando datos locales</div>`;
  }

  // pick template
  if (role === 'admin') app.innerHTML += adminTemplate(name);
  else app.innerHTML += contractorTemplate(name);

  // attach small user info
  const avatar = document.getElementById('userAvatar');
  if (avatar) avatar.title = name + ' (' + (email || role) + ')';

  // now load dashboard data and charts
  await loadDashboardData(role, email);
}

// auto bootstrap when loaded
window.addEventListener('DOMContentLoaded', () => bootstrap());
