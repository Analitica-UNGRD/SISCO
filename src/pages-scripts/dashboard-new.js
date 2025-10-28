// Este archivo quedó como alias histórico. Toda la lógica del dashboard
// vive ahora en `dashboard.js`. Se conserva únicamente para evitar errores
// en builds que todavía importen este archivo.

console.warn('[dashboard-new] Usa ../pages-scripts/dashboard.js. Este archivo ya no contiene lógica.');

/**
 * Enriquece las personas con sus nombres
 */
async function enrichPersonasWithNames(personas) {
  try {
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: 'listPersonas',
        payload: {}
      })
    });
    
    const result = await response.json();
    if (!result.ok) return personas;
    
    const todasPersonas = result.items || [];
    
    return personas.map(persona => {
      const personaCompleta = todasPersonas.find(p => p.persona_id === persona.persona_id);
      return {
        ...persona,
        nombre: personaCompleta?.Nombre || 'Nombre no encontrado'
      };
    });
  } catch (error) {
    console.error('Error obteniendo nombres:', error);
    return personas;
  }
}

/**
 * Maneja la selección de una persona
 */
async function handlePersonaSelection(event) {
  const personaId = event.target.value;
  const container = document.getElementById('timeline-container');
  
  if (!personaId) {
    container.innerHTML = '<div class="text-gray-500 text-center py-8">Selecciona una persona para ver su progreso</div>';
    return;
  }
  
  try {
  showLoading(true, 'timeline-container', 'Preparando línea de tiempo...');
    
    // Obtener timeline de la persona
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: 'listPrecontractual',
        payload: { persona_id: personaId }
      })
    });
    
    const result = await response.json();
    if (!result.ok) throw new Error(result.error);
    
    const eventos = result.items.filter(item => item.persona_id === personaId);
    renderTimeline(container, eventos);
    
  } catch (error) {
    console.error('Error cargando timeline:', error);
    container.innerHTML = '<div class="text-red-500 text-center py-8">Error al cargar el progreso</div>';
  } finally {
    showLoading(false, 'timeline-container');
  }
}

/**
 * Renderiza el timeline de una persona
 */
function renderTimeline(container, eventos) {
  if (!eventos.length) {
    container.innerHTML = '<div class="text-gray-500 text-center py-8">No se encontraron eventos para esta persona</div>';
    return;
  }
  
  // Ordenar eventos por fecha
  eventos.sort((a, b) => new Date(a.Fecha_evento) - new Date(b.Fecha_evento));
  
  let html = '<div class="space-y-4">';
  
  eventos.forEach((evento, index) => {
    const isLast = index === eventos.length - 1;
    const isCompleted = evento.Estado?.toLowerCase() === 'finalizada';
    
    html += `
      <div class="flex items-start space-x-4">
        <div class="flex flex-col items-center">
          <div class="w-4 h-4 rounded-full ${isCompleted ? 'bg-green-500' : 'bg-yellow-500'} flex-shrink-0"></div>
          ${!isLast ? '<div class="w-0.5 h-8 bg-gray-300 mt-2"></div>' : ''}
        </div>
        <div class="flex-1 pb-4">
          <h4 class="font-semibold text-gray-800">${escapeHtml(evento.Etapa || '')}</h4>
          <p class="text-sm text-gray-600">${escapeHtml(evento.Fase || '')}</p>
          <p class="text-xs text-gray-500 mt-1">
            ${formatDate(evento.Fecha_evento)} - 
            <span class="capitalize ${isCompleted ? 'text-green-600' : 'text-yellow-600'}">
              ${evento.Estado || 'En proceso'}
            </span>
          </p>
        </div>
      </div>
    `;
  });
  
  html += '</div>';
  container.innerHTML = html;
}

/**
 * Renderiza personas con tiempo excesivo
 */
function renderPersonasTiempoExcesivo(personas = []) {
  const container = document.getElementById('lista-tiempo-excesivo');
  if (!container) return;
  
  // Filtrar personas que llevan más de 30 días
  const hoy = new Date();
  const personasExcesivas = personas.filter(persona => {
    const fechaUltima = new Date(persona.fechaUltima);
    const diasTranscurridos = Math.floor((hoy - fechaUltima) / (1000 * 60 * 60 * 24));
    return diasTranscurridos > 30;
  });
  
  if (!personasExcesivas.length) {
    container.innerHTML = '<div class="text-green-600 text-sm">No hay candidatos con tiempo excesivo</div>';
    return;
  }
  
  let html = '';
  personasExcesivas.forEach(persona => {
    const fechaUltima = new Date(persona.fechaUltima);
    const diasTranscurridos = Math.floor((hoy - fechaUltima) / (1000 * 60 * 60 * 24));
    
    html += `
      <div class="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
        <div class="flex justify-between items-start">
          <div>
            <span class="font-medium text-yellow-800">Persona ${persona.persona_id}</span>
            <p class="text-sm text-yellow-700">${persona.etapaActual}</p>
          </div>
          <span class="text-sm font-semibold text-yellow-800">${diasTranscurridos} días</span>
        </div>
      </div>
    `;
  });
  
  container.innerHTML = html;
}

/**
 * Muestra/oculta indicador de carga
 */
const loaderState = new Map();

function showLoading(show, containerId = null, message) {
  const key = containerId || '__global__';
  const current = loaderState.get(key) || 0;
  const resolvedMessage = message || (containerId ? 'Procesando sección...' : 'Cargando datos...');

  if (show) {
    loaderState.set(key, current + 1);
    const variant = containerId ? 'toast' : 'blocking';
    showLoader(resolvedMessage, variant);

    if (containerId) {
      const container = document.getElementById(containerId);
      if (container) {
        container.dataset.loaderPlaceholder = 'true';
        container.innerHTML = '<div class="text-center py-4"><div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div></div>';
      }
    }
    return;
  }

  if (!current) return;

  if (current === 1) {
    loaderState.delete(key);
  } else {
    loaderState.set(key, current - 1);
  }

  hideLoader();

  if (containerId) {
    const container = document.getElementById(containerId);
    if (container && container.dataset.loaderPlaceholder) {
      delete container.dataset.loaderPlaceholder;
    }
  }
}

/**
 * Muestra mensaje de error
 */
function showError(message) {
  const notification = document.createElement('div');
  notification.className = 'fixed top-4 right-4 bg-red-500 text-white p-4 rounded-lg shadow-lg z-50';
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 5000);
}

/**
 * Formatea una cantidad como moneda colombiana
 */
function formatCurrency(amount) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(amount);
}

/**
 * Formatea una fecha
 */
function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Escapa HTML para prevenir XSS
 */
function escapeHtml(unsafe) {
  return String(unsafe || '')
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
