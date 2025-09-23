// session.js
// Maneja la sesión: obtiene role desde /getSessionInfo y monta la plantilla adecuada
import { adminTemplate, contractorTemplate } from './templates.js';
import { loadDashboardData } from '/src/pages-scripts/dashboard.js';
import { USE_MOCKS, fetchSessionInfoMock } from './api.mocks.js';

const SESSION_URL = 'https://script.google.com/macros/s/XXXX/getSessionInfo'; // reemplazar cuando esté listo

// Realiza GET a /getSessionInfo usando Content-Type: text/plain para evitar preflight.
export async function fetchSessionInfo() {
  try {
    if (USE_MOCKS) return fetchSessionInfoMock();

    const res = await fetch(SESSION_URL, { method: 'GET', headers: { 'Content-Type': 'text/plain' } });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
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
