/**
 * @fileoverview Componente de barra lateral reutilizable
 * Este módulo proporciona una función para renderizar una barra lateral canónica
 * con los elementos de navegación principales del sistema.
 */

import { initSidebar } from './sidebar.js';
import { Auth } from '../lib/auth.js';

/**
 * Renderiza una barra lateral canónica con tres elementos: Dashboard, Contratistas y Admin
 * @param {HTMLElement|string} target - Elemento contenedor o selector donde se insertará la barra lateral
 * @returns {HTMLElement} El elemento de barra lateral creado
 */
export function renderSidebar(target) {
  // Determina el contenedor donde se insertará la barra lateral
  let container = null;
  if(typeof target === 'string') container = document.querySelector(target);
  else if(target instanceof HTMLElement) container = target;
  
  // Si no se especifica un contenedor, crea uno al inicio del body
  if(!container) { 
    container = document.createElement('div'); 
    document.body.insertBefore(container, document.body.firstChild); 
  }

  // Evita renderizar múltiples veces en el mismo contenedor
  if(container.dataset.sidebarRendered === '1') return container.querySelector('aside.sidebar');

  // Crea el elemento de barra lateral
  const aside = document.createElement('aside');
  aside.className = 'sidebar collapsed flex-shrink-0 text-gray-300';
  aside.setAttribute('aria-expanded','false');

  // Establece el contenido HTML de la barra lateral
  aside.innerHTML = `
    <div class="p-6">
      <h1 class="text-2xl font-bold text-white menu-title">Panel</h1>
    </div>
    <nav class="mt-6">
      <ul>
        <!-- Enlaces de navegación principales con iconos -->
        <li class="px-6 py-3" data-section="dashboard"><a class="flex items-center" href="/src/pages/dashboard.html"><span class="material-icons">dashboard</span><span class="ml-4 menu-label">Dashboard</span></a></li>
        <li class="px-6 py-3" data-section="contratistas"><a class="flex items-center" href="/src/pages/contratistas.html"><span class="material-icons">people</span><span class="ml-4 menu-label">Contratistas</span></a></li>
        <li class="px-6 py-3" data-section="precontractual"><a class="flex items-center" href="/src/pages/precontractual.html"><span class="material-icons">timeline</span><span class="ml-4 menu-label">Precontractual</span></a></li>
        <li class="px-6 py-3" data-section="admin"><a class="flex items-center" href="/src/pages/admin/admin.html"><span class="material-icons">admin_panel_settings</span><span class="ml-4 menu-label">Admin</span></a></li>
      </ul>
    </nav>
  <!-- Área inferior con configuración y botón de logout destacado -->
  <div class="bottom-area">
        <div class="flex items-center justify-between mb-3">
          <a class="flex items-center text-gray-300 hover:bg-gray-700 px-4 py-2 rounded-md" href="#">
            <span class="material-icons">settings</span>
            <span class="ml-4 menu-label">Settings</span>
          </a>
          <button class="pin-btn text-gray-300 hover:text-white focus:outline-none px-2 py-2" title="Pin sidebar" aria-pressed="false">
            <span class="material-icons">push_pin</span>
          </button>
        </div>
        <div>
          <button class="logout-danger w-full flex items-center justify-center gap-3" title="Cerrar sesión">
            <span class="material-icons">logout</span>
            <span class="menu-label">Cerrar sesión</span>
          </button>
        </div>
    </div>
  `;

  // Agrega la barra lateral al contenedor y marca como renderizada
  container.appendChild(aside);
  container.dataset.sidebarRendered = '1';

  // Inicializa el comportamiento de la barra lateral
  try {
    initSidebar(aside);
  } catch (e) {
    console.warn('initSidebar failed', e);
  }

  // Conectar el botón de cerrar sesión si existe: usa Auth.logout() y redirige al login
  try {
    const logoutBtn = aside.querySelector('.logout-danger');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', (ev) => {
        try { Auth.logout(); } catch (e) { console.warn('Auth.logout failed', e); }
        // Evita que el historial permita volver a la sesión anterior
        try { window.location.replace('/src/pages/login.html'); } catch (e) { window.location.href = '/src/pages/login.html'; }
      });
    }
  } catch (e) { /* noop */ }

  return aside;
}

/**
 * Auto-inicialización cuando existe un div#shared-sidebar en la página
 * Busca automáticamente un contenedor con id="shared-sidebar" al cargar el DOM
 * y renderiza la barra lateral en él si existe
 */
document.addEventListener('DOMContentLoaded', () => {
  try {
    const el = document.getElementById('shared-sidebar');
    if(el) renderSidebar(el);
  } catch(e) {}
});
