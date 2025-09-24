/**
 * @fileoverview Dashboard principal - Implementación actualizada
 * Conecta con Google Apps Script para obtener datos reales
 */

import { getConfig } from '../lib/config.js';

/** URL del script de Google Apps Script */
let SCRIPT_URL = '';

/** Cache para datos del dashboard */
let dashboardCache = null;

/**
 * Inicializa el dashboard al cargar la página
 */
document.addEventListener('DOMContentLoaded', async function() {
  try {
    // Obtener configuración
    const config = await getConfig();
    SCRIPT_URL = config.SCRIPT_URL;
    
    // Cargar datos del dashboard
    await loadDashboard();
    
    // Configurar actualizaciones automáticas cada 5 minutos
    setInterval(loadDashboard, 5 * 60 * 1000);
  } catch (error) {
    console.error('Error inicializando dashboard:', error);
    showError('Error al cargar el dashboard');
  }
});

/**
 * Carga todos los datos del dashboard
 */
async function loadDashboard() {
  try {
    showLoading(true);
    
    // Obtener datos del backend
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: 'dashboardSummary',
        payload: {}
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const result = await response.json();
    
    if (!result.ok) {
      throw new Error(result.error || 'Error desconocido');
    }
    
    dashboardCache = result.data;
    
    // Renderizar todos los componentes
    renderKPIs(dashboardCache);
    renderAlertas(dashboardCache.alertas);
    await renderPrecontractual(dashboardCache.precontractualResumen);
    
  } catch (error) {
    console.error('Error cargando dashboard:', error);
    showError('Error al cargar los datos del dashboard');
  } finally {
    showLoading(false);
  }
}

/**
 * Renderiza los KPIs principales
 */
function renderKPIs(data) {
  // Contratistas activos
  const contractorsEl = document.getElementById('contractors-count');
  if (contractorsEl) {
    contractorsEl.textContent = data.contratistasActivos || 0;
  }
  
  // Contratos próximos a vencer
  const expiringEl = document.getElementById('expiring-count');
  if (expiringEl) {
    expiringEl.textContent = data.contratosVencimiento?.count || 0;
  }
  
  // Personas en proceso precontractual
  const precontractualEl = document.getElementById('precontractual-count');
  if (precontractualEl) {
    precontractualEl.textContent = data.personasEnProceso?.count || 0;
  }
  
  // Pagos del mes
  const paymentsEl = document.getElementById('payments-amount');
  if (paymentsEl) {
    const pagos = data.pagosMes || {};
    paymentsEl.textContent = formatCurrency(pagos.pagado || 0);
  }
}

/**
 * Renderiza las alertas
 */
function renderAlertas(alertas = []) {
  const container = document.getElementById('alertsList');
  if (!container) return;
  
  container.innerHTML = '';
  
  if (!alertas.length) {
    container.innerHTML = '<div class="text-gray-500 text-center py-4">No hay alertas activas</div>';
    return;
  }
  
  alertas.forEach(alerta => {
    const alertaEl = createAlertaElement(alerta);
    container.appendChild(alertaEl);
  });
}

/**
 * Crea un elemento de alerta
 */
function createAlertaElement(alerta) {
  const div = document.createElement('div');
  
  let bgColor = 'bg-gray-50';
  let textColor = 'text-gray-800';
  let iconColor = 'text-gray-500';
  let icon = 'info';
  
  switch (alerta.tipo) {
    case 'warning':
      bgColor = 'bg-yellow-50';
      textColor = 'text-yellow-800';
      iconColor = 'text-yellow-500';
      icon = 'warning';
      break;
    case 'error':
      bgColor = 'bg-red-50';
      textColor = 'text-red-800';
      iconColor = 'text-red-500';
      icon = 'error';
      break;
    case 'info':
      bgColor = 'bg-blue-50';
      textColor = 'text-blue-800';
      iconColor = 'text-blue-500';
      icon = 'info';
      break;
  }
  
  div.className = `flex items-start ${bgColor} p-4 rounded-lg`;
  div.innerHTML = `
    <span class="material-icons ${iconColor} mr-4 mt-1">${icon}</span>
    <div>
      <h4 class="font-semibold ${textColor}">${escapeHtml(alerta.titulo)}</h4>
      <p class="text-sm ${textColor.replace('800', '600')}">${escapeHtml(alerta.mensaje)}</p>
    </div>
  `;
  
  return div;
}

/**
 * Renderiza la sección precontractual
 */
async function renderPrecontractual(resumen) {
  await renderPersonaSelector(resumen.personas);
  renderPersonasTiempoExcesivo(resumen.personas);
}

/**
 * Renderiza el selector de personas
 */
async function renderPersonaSelector(personas = []) {
  const selector = document.getElementById('persona-selector');
  if (!selector) return;
  
  // Limpiar opciones existentes
  selector.innerHTML = '<option value="">Seleccionar persona...</option>';
  
  // Obtener nombres de personas
  const personasConNombres = await enrichPersonasWithNames(personas);
  
  personasConNombres.forEach(persona => {
    const option = document.createElement('option');
    option.value = persona.persona_id;
    option.textContent = `${persona.nombre} - ${persona.etapaActual}`;
    selector.appendChild(option);
  });
  
  // Agregar evento de cambio
  selector.addEventListener('change', handlePersonaSelection);
}

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
    showLoading(true, 'timeline-container');
    
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
function showLoading(show, containerId = null) {
  if (containerId) {
    const container = document.getElementById(containerId);
    if (container && show) {
      container.innerHTML = '<div class="text-center py-4"><div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div></div>';
    }
    return;
  }
  
  const existing = document.getElementById('dashboard-loading');
  if (show && !existing) {
    const overlay = document.createElement('div');
    overlay.id = 'dashboard-loading';
    overlay.className = 'fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50';
    overlay.innerHTML = `
      <div class="bg-white p-6 rounded-lg shadow-lg flex items-center space-x-3">
        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <span>Cargando datos...</span>
      </div>
    `;
    document.body.appendChild(overlay);
  } else if (!show && existing) {
    existing.remove();
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
