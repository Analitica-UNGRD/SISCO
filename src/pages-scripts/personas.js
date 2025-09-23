/**
 * @fileoverview Controlador para la página de gestión de personas
 * Este módulo maneja la visualización, búsqueda y administración de registros de personas.
 * Incluye protección de autenticación y renderizado de lista de personas.
 */

import { Auth } from './auth.js';
import { UI } from './ui.js';

/**
 * Inicialización cuando el DOM está completamente cargado
 * Configura la protección de autenticación, eventos y carga de datos
 */
document.addEventListener('DOMContentLoaded', async () => {
  // Verificación de autenticación - redirecciona si no está autenticado
  if(!Auth.isAuthenticated()) {
    // Usa ruta relativa para que las páginas bajo src/pages no se conviertan en /src/pages/src/...
    window.location.href = './login.html';
    return;
  }

  // Configurar evento del botón de regreso
  document.getElementById('backBtn').addEventListener('click', () => {
    // Navega relativo a la carpeta de página actual
    window.location.href = './dashboard.html';
  });

  // Referencia al contenedor de la lista de personas
  const listEl = document.getElementById('personasList');

  /**
   * Renderiza la lista de personas en el DOM
   * @param {Array} items - Array de objetos persona a mostrar
   */
  function renderList(items) {
    // Muestra mensaje si no hay personas
    if(!items || items.length === 0) {
      listEl.innerHTML = '<div class="loading">No hay personas registradas.</div>';
      return;
    }

    // Limpia la lista y agrega cada persona
    listEl.innerHTML = '';
    items.forEach(p => {
      const row = document.createElement('div');
      row.className = 'persona-item';
      
      // Plantilla para cada elemento de persona
      row.innerHTML = `
        <div>
          <div class="persona-name">${p.Nombre || p.name || ''}</div>
          <div class="persona-meta">${p.Cedula || p.cedula || p.email || ''}</div>
        </div>
        <div class="persona-actions">
          <button data-id="${p.id || ''}" class="viewBtn">Ver</button>
        </div>
      `;
      
      listEl.appendChild(row);
    });

    // Delegación de eventos para botones "Ver" (patrón de delegación)
    listEl.addEventListener('click', (e) => {
      const btn = e.target.closest('.viewBtn');
      if(!btn) return;
      
      const id = btn.dataset.id;
      UI.showMessage(`Ver persona ${id}`, 'info', 1500);
      // NOTA: Aquí se implementaría la navegación al detalle de la persona
    });
  }

  // Datos de demostración locales (a reemplazar con llamada API cuando esté disponible)
  const demo = [
    { id: '1', Nombre: 'Ana Pérez', Cedula: '12345678', email: 'ana@example.com' },
    { id: '2', Nombre: 'Carlos Ruiz', Cedula: '87654321', email: 'carlos@example.com' }
  ];

  // Simula carga con un pequeño retardo para mostrar comportamiento real
  setTimeout(() => {
    renderList(demo);
  }, 400);

});
