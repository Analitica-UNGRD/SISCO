/**
 * @fileoverview Dashboard principal - Implementación actualizada
 * Conecta con Google Apps Script para obtener datos reales
 */

import { getConfig } from '../lib/config.js';
import { simpleSearch, globalSearch } from '../lib/search.js';
import { showLoader, hideLoader } from '../lib/loader.js';
import { stripLeadingNumber } from '../lib/ui.js';

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
    
    // Bind del buscador global
    bindGlobalSearch();
    
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
 * Vincula el input de búsqueda global en la cabecera
 */
function bindGlobalSearch() {
  const input = document.getElementById('global-search-input') || document.querySelector('header input[placeholder="Search..."]');
  const resultsEl = document.getElementById('global-search-results');
  if (!input) return;

  let timeout = null;
  input.addEventListener('input', (e) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
  const q = e.target.value || '';
  applySearchFilter(q);
  renderGlobalSearchDropdown(q, resultsEl);
    }, 180);
  });

  // Atajo Ctrl+K para foco
  window.addEventListener('keydown', (ev) => {
    if (ev.ctrlKey && ev.key.toLowerCase() === 'k') {
      ev.preventDefault();
      input.focus();
      input.select();
    }
  });
}

function renderGlobalSearchDropdown(query, resultsEl) {
  if (!resultsEl) return;
  if (!query || !query.trim()) {
    resultsEl.classList.add('hidden');
    resultsEl.innerHTML = '';
    return;
  }

  const index = window.searchIndex || {};
  const groups = globalSearch(query, index, { limit: 8 });
  if (!groups || groups.length === 0) {
    resultsEl.classList.remove('hidden');
    resultsEl.innerHTML = `<div class="p-3 text-sm text-gray-500">No se encontraron resultados</div>`;
    return;
  }

  let html = '';
  groups.forEach(group => {
    html += `<div class="px-3 pt-2 text-xs text-gray-500 font-semibold">${group.category}</div>`;
    group.items.forEach(item => {
      const label = item.nombre || item.Nombre || item.Numero_contrato || item.contrato_id || item.persona_id || 'Item';
      const id = item.persona_id || item.contrato_id || '';
      html += `<div class="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm result-item" data-category="${group.key}" data-id="${id}">${escapeHtml(String(label))}</div>`;
    });
    html += `<div class="border-t my-1"></div>`;
  });

  resultsEl.innerHTML = html;
  resultsEl.classList.remove('hidden');

  resultsEl.querySelectorAll('.result-item').forEach(el => {
    el.addEventListener('click', () => {
      const cat = el.getAttribute('data-category');
      const id = el.getAttribute('data-id');
      resultsEl.classList.add('hidden');
      if (cat === 'personas') {
        localStorage.setItem('contratistas_filtro', JSON.stringify({ tipo: 'persona', valor: id, timestamp: Date.now() }));
        window.location.href = '/src/pages/contratistas.html';
      } else if (cat === 'precontractual') {
        localStorage.setItem('precontractual_filtro', JSON.stringify({ tipo: 'persona', valor: id, timestamp: Date.now() }));
        window.location.href = '/src/pages/precontractual.html';
      } else if (cat === 'contratos') {
        localStorage.setItem('contratistas_filtro', JSON.stringify({ tipo: 'contrato', valor: id, timestamp: Date.now() }));
        window.location.href = '/src/pages/contratistas.html';
      }
    });
  });
}

/**
 * Aplica el filtro de búsqueda al resumen precontractual
 */
function applySearchFilter(query) {
  const data = window.precontractualData || [];
  if (!query || !query.trim()) {
    // Empty query -> re-render full list
    renderVistaResumida();
    return;
  }
  const filtered = simpleSearch(query, data, { fields: ['persona_id', 'nombre', 'Nombre', 'contrato_id'] });
  renderFilteredVistaResumida(filtered);
}

/**
 * Renderiza la vista resumida basada en un arreglo filtrado (evita refetch)
 */
function renderFilteredVistaResumida(filteredCandidatos) {
  const container = document.getElementById('vista-resumida');
  if (!container) return;

  if (!Array.isArray(filteredCandidatos) || filteredCandidatos.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8">
        <p class="text-gray-500">No se encontraron candidatos con esa búsqueda</p>
      </div>
    `;
    return;
  }

  // Reuse the same rendering from renderVistaResumida's loop
  let html = '';
  const candidatosOrdenados = [...filteredCandidatos].sort((a, b) => {
    const etapasA = a.etapas.length;
    const etapasB = b.etapas.length;
    if (etapasA !== etapasB) return etapasB - etapasA;
    return a.tiempoTotal - b.tiempoTotal;
  });

  candidatosOrdenados.forEach((candidato, index) => {
    const etapaActual = candidato.etapas[candidato.etapas.length - 1];
    const estadoColor = candidato.estadoGeneral === 'Finalizado' ? 'text-green-600' : 'text-blue-600';

    let faseActual = 'Sin fase';
    if (etapaActual && etapaActual.eventos && etapaActual.eventos.length > 0) {
      const eventoMasReciente = etapaActual.eventos[etapaActual.eventos.length - 1];
      faseActual = eventoMasReciente.Fase || 'Sin fase';
      // Mostrar sin el número inicial
      faseActual = stripLeadingNumber(faseActual);
    }

    const etapasFinalizadas = candidato.etapas.filter(e => e.estado === 'Finalizado').length;
    const proximoActa = etapasFinalizadas >= 2 && candidato.estadoGeneral !== 'Finalizado';

    html += `
      <div class="candidato-item flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer transition-all duration-300 ease-out hover:bg-white hover:shadow-lg hover:scale-[1.02] hover:-translate-y-1 ${proximoActa ? 'border-l-4 border-green-500 bg-green-50 hover:bg-green-100' : 'hover:border-gray-200 border border-transparent'}"
           onclick="toggleCandidatoDetalle('${candidato.persona_id}', this)">
        <div class="flex items-center space-x-3">
          <div class="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-semibold transition-all duration-300 hover:bg-blue-200 hover:scale-110">
            ${index + 1}
          </div>
          <div>
            <h4 class="font-semibold text-gray-900 transition-colors duration-200">${escapeHtml(candidato.nombre)}</h4>
            <p class="text-sm text-gray-600 transition-colors duration-200">
              <span class="font-medium">${escapeHtml(stripLeadingNumber(etapaActual?.etapa || 'Sin etapa'))}</span>
              ${faseActual !== 'Sin fase' ? ` - ${escapeHtml(faseActual)}` : ''}
            </p>
            ${proximoActa ? '<span class="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full transition-all duration-200 hover:bg-green-200">Próximo a finalizar</span>' : ''}
          </div>
        </div>
        <div class="text-right">
          <p class="font-semibold ${estadoColor} transition-colors duration-200">${candidato.tiempoTotal} días</p>
          <div class="flex items-center justify-end gap-2">
            <p class="text-xs text-gray-500 transition-colors duration-200">${candidato.etapas.length} etapa${candidato.etapas.length !== 1 ? 's' : ''}</p>
            <button 
              onclick="irAPrecontractual('${candidato.persona_id}')" 
              class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors duration-200"
              title="Ver en Precontractual">
              Ver Detalles
            </button>
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

/**
 * Carga todos los datos del dashboard usando handlers existentes
 */
async function loadDashboard() {
  try {
    showLoading(true, null, 'Cargando datos del dashboard...');
    
    // Usar handlers existentes para obtener datos
    console.log('Cargando datos del dashboard usando handlers existentes...');
    
    // Obtener datos para construir las métricas
    const [personasData, contratosData, precontractualData] = await Promise.all([
      fetchData('listPersonas'),
      fetchData('listContratos'),
      fetchData('listPrecontractual')
    ]);
    
    // Construir datos del dashboard desde los handlers existentes
    dashboardCache = {
      contratistasActivos: calcularContratistasActivos(personasData),
      contratosVencimiento: calcularContratosVencimiento(contratosData),
      personasEnProceso: calcularPersonasEnProceso(precontractualData),
      pagosMes: { pagado: 0, esperado: 0, pendiente: 0 }, // Temporalmente en 0
      alertas: calcularAlertas(contratosData, personasData),
      precontractualResumen: calcularPrecontractualResumen(precontractualData, personasData)
    };
    // Indexar datasets para búsqueda global
    window.searchIndex = {
      personas: personasData || [],
      contratos: contratosData || [],
      precontractual: Array.isArray(precontractualData) ? precontractualData : []
    };
    
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
 * Fetch data from a specific handler
 */
async function fetchData(path, payload = {}) {
  const response = await fetch(SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, payload })
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  
  const result = await response.json();
  if (!result.ok) {
    throw new Error(result.error || 'Error desconocido');
  }
  
  return result.items || result.data || result;
}

/**
 * Calcula contratistas activos
 */
function calcularContratistasActivos(personas) {
  if (!personas || !Array.isArray(personas)) return 0;
  
  return personas.filter(persona => 
    String(persona.Estado || '').trim().toLowerCase() === 'activo'
  ).length;
}

/**
 * Calcula contratos próximos a vencer
 */
function calcularContratosVencimiento(contratos) {
  if (!contratos || !Array.isArray(contratos)) return { count: 0, contratos: [] };
  
  const hoy = new Date();
  const fechaLimite = new Date();
  fechaLimite.setDate(hoy.getDate() + 30); // 30 días desde hoy
  
  const contratosProximos = contratos.filter(contrato => {
    const estado = String(contrato.Estado || '').trim().toLowerCase();
    if (estado !== 'vigente') return false;
    
    const fechaFin = contrato.Fin;
    if (!fechaFin) return false;
    
    const fechaFinDate = new Date(fechaFin);
    return fechaFinDate >= hoy && fechaFinDate <= fechaLimite;
  }).map(contrato => ({
    contrato_id: contrato.contrato_id,
    numero: contrato.Numero_contrato,
    persona_id: contrato.persona_id,
    fechaFin: new Date(contrato.Fin),
    diasRestantes: Math.ceil((new Date(contrato.Fin) - hoy) / (1000 * 60 * 60 * 24))
  }));
  
  return {
    count: contratosProximos.length,
    contratos: contratosProximos.slice(0, 5)
  };
}

/**
 * Calcula personas en proceso de contratación
 */
function calcularPersonasEnProceso(precontractual) {
  if (!precontractual || !Array.isArray(precontractual)) return { count: 0, personas: [] };
  
  const personasPorEtapa = {};
  
  precontractual.forEach(registro => {
    const etapa = String(registro.Etapa || '').trim();
    const estado = String(registro.Estado || '').trim().toLowerCase();
    const personaId = registro.persona_id;
    
    // Solo procesar si no está completamente finalizado
    if (etapa !== "Acta de Inicio y Designacion de Supervision" || estado !== "finalizada") {
      if (!personasPorEtapa[personaId]) {
        personasPorEtapa[personaId] = {
          persona_id: personaId,
          etapaActual: etapa,
          estadoActual: estado,
          fechaUltima: registro.Fecha_evento || registro.Creado_en
        };
      } else {
        // Mantener la más reciente
        const fechaActual = new Date(registro.Fecha_evento || registro.Creado_en);
        const fechaAnterior = new Date(personasPorEtapa[personaId].fechaUltima);
        if (fechaActual > fechaAnterior) {
          personasPorEtapa[personaId].etapaActual = etapa;
          personasPorEtapa[personaId].estadoActual = estado;
          personasPorEtapa[personaId].fechaUltima = registro.Fecha_evento || registro.Creado_en;
        }
      }
    }
  });
  
  const personas = Object.values(personasPorEtapa);
  return {
    count: personas.length,
    personas: personas
  };
}

/**
 * Calcula alertas
 */
function calcularAlertas(contratos, personas) {
  const alertas = [];
  
  if (!contratos || !Array.isArray(contratos)) return alertas;
  
  const contratosVencimiento = calcularContratosVencimiento(contratos);
  
  contratosVencimiento.contratos.forEach(contrato => {
    // Buscar el nombre de la persona
    let nombrePersona = 'Persona no encontrada';
    if (personas && Array.isArray(personas)) {
      const persona = personas.find(p => p.persona_id === contrato.persona_id);
      if (persona) {
        nombrePersona = persona.Nombre || persona.nombre || 'Nombre no disponible';
      }
    }
    
    alertas.push({
      tipo: 'warning',
      titulo: 'Contrato próximo a vencer',
      mensaje: `${nombrePersona} - Contrato vence en ${contrato.diasRestantes} días`,
      prioridad: contrato.diasRestantes <= 7 ? 'alta' : 'media',
      tipoAlerta: 'contrato_vencer',
      datos: {
        persona_id: contrato.persona_id,
        nombre: nombrePersona,
        contrato_id: contrato.contrato_id
      }
    });
  });
  
  return alertas;
}

/**
 * Calcula resumen precontractual
 */
function calcularPrecontractualResumen(precontractual, personas) {
  const personasEnProceso = calcularPersonasEnProceso(precontractual);
  
  // Enriquecer con nombres si están disponibles
  if (personas && Array.isArray(personas)) {
    personasEnProceso.personas = personasEnProceso.personas.map(persona => {
      const personaCompleta = personas.find(p => p.persona_id === persona.persona_id);
      return {
        ...persona,
        nombre: personaCompleta?.Nombre || 'Nombre no encontrado'
      };
    });
  }
  
  return {
    totalPersonas: personasEnProceso.count,
    personas: personasEnProceso.personas.slice(0, 10)
  };
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
  
  // Hacer la alerta clickeable con cursor pointer y hover
  div.className = `flex items-start ${bgColor} p-4 rounded-lg cursor-pointer hover:shadow-md transition-shadow duration-200`;
  
  // Agregar click handler para redirección
  div.onclick = () => {
    if (alerta.datos && alerta.tipoAlerta) {
      irAAlerta(alerta.tipoAlerta, alerta.datos);
    }
  };
  
  div.innerHTML = `
    <span class="material-icons ${iconColor} mr-4 mt-1">${icon}</span>
    <div class="flex-1">
      <h4 class="font-semibold ${textColor}">${escapeHtml(alerta.titulo)}</h4>
      <p class="text-sm ${textColor.replace('800', '600')}">${escapeHtml(alerta.mensaje)}</p>
    </div>
    <span class="material-icons text-gray-400 ml-2">arrow_forward_ios</span>
  `;
  
  return div;
}

/**
 * Renderiza la sección precontractual
 */
async function renderPrecontractual(resumen) {
  await renderVistaResumida();
  await setupPrecontractualEventListeners();
  // La función renderPersonasTiempoExcesivo ahora usa los datos procesados
  // que se almacenan en window.precontractualData dentro de renderVistaResumida
  setTimeout(() => renderPersonasTiempoExcesivo(), 100);
}

/**
 * Renderiza la vista resumida de candidatos
 */
async function renderVistaResumida() {
  const container = document.getElementById('vista-resumida');
  if (!container) return;
  
  showLoading(true, 'vista-resumida', 'Actualizando vista resumida...');
  
  try {
    // Obtener datos procesados
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: 'listPrecontractual',
        payload: {}
      })
    });
    
    const result = await response.json();
    if (!result.ok) throw new Error(result.error);
    
    const processedData = await processPrecontractualData(result.items);
    
    // Almacenar datos procesados para uso posterior
    window.precontractualData = processedData;
    
    // Poblar selector
    await populateCandidatoSelector(processedData);
    
    if (!processedData.length) {
      container.innerHTML = `
        <div class="text-center py-8">
          <span class="material-icons text-4xl text-gray-300 mb-2">people_outline</span>
          <p class="text-gray-500">No hay candidatos en proceso precontractual</p>
        </div>
      `;
      return;
    }
    
    // Ordenar por proximidad a "Acta de inicio" (candidatos más avanzados primero)
    const candidatosOrdenados = [...processedData].sort((a, b) => {
      const etapasA = a.etapas.length;
      const etapasB = b.etapas.length;
      
      // Priorizar candidatos con más etapas (más avanzados)
      if (etapasA !== etapasB) return etapasB - etapasA;
      
      // Si tienen las mismas etapas, ordenar por tiempo total (menos tiempo = más eficiente)
      return a.tiempoTotal - b.tiempoTotal;
    });
    
    let html = '';
    
    candidatosOrdenados.forEach((candidato, index) => {
      const etapaActual = candidato.etapas[candidato.etapas.length - 1];
      const estadoColor = candidato.estadoGeneral === 'Finalizado' ? 'text-green-600' : 'text-blue-600';
      
      // Buscar la fase más reciente de la etapa actual (para mostrar sin número)
      let faseActual = 'Sin fase';
      if (etapaActual && etapaActual.eventos && etapaActual.eventos.length > 0) {
        const eventoMasReciente = etapaActual.eventos[etapaActual.eventos.length - 1];
        faseActual = eventoMasReciente.Fase || 'Sin fase';
        faseActual = stripLeadingNumber(faseActual);
      }
      
      // Determinar si está próximo a finalizar basándose en etapas completadas y estado
      const etapasFinalizadas = candidato.etapas.filter(e => e.estado === 'Finalizado').length;
      const proximoActa = etapasFinalizadas >= 2 && candidato.estadoGeneral !== 'Finalizado'; // 2 o más etapas finalizadas pero aún no completado
      
      html += `
        <div class="candidato-item flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer transition-all duration-300 ease-out hover:bg-white hover:shadow-lg hover:scale-[1.02] hover:-translate-y-1 ${proximoActa ? 'border-l-4 border-green-500 bg-green-50 hover:bg-green-100' : 'hover:border-gray-200 border border-transparent'}"
             onclick="toggleCandidatoDetalle('${candidato.persona_id}', this)">
          <div class="flex items-center space-x-3">
            <div class="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-semibold transition-all duration-300 hover:bg-blue-200 hover:scale-110">
              ${index + 1}
            </div>
            <div>
              <h4 class="font-semibold text-gray-900 transition-colors duration-200">${escapeHtml(candidato.nombre)}</h4>
              <p class="text-sm text-gray-600 transition-colors duration-200">
                <span class="font-medium">${escapeHtml(stripLeadingNumber(etapaActual?.etapa || 'Sin etapa'))}</span>
                ${faseActual !== 'Sin fase' ? ` - ${escapeHtml(faseActual)}` : ''}
              </p>
              ${proximoActa ? '<span class="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full transition-all duration-200 hover:bg-green-200">Próximo a finalizar</span>' : ''}
            </div>
          </div>
          <div class="text-right">
            <p class="font-semibold ${estadoColor} transition-colors duration-200">${candidato.tiempoTotal} días</p>
            <div class="flex items-center justify-end gap-2">
              <p class="text-xs text-gray-500 transition-colors duration-200">${candidato.etapas.length} etapa${candidato.etapas.length !== 1 ? 's' : ''}</p>
              <button 
                onclick="irAPrecontractual('${candidato.persona_id}', '${candidato.nombre.replace(/'/g, '\\\'')}')" 
                class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors duration-200"
                title="Ver en Precontractual">
                Ver Detalles
              </button>
            </div>
          </div>
        </div>
      `;
    });
    
    container.innerHTML = html;
    
  } catch (error) {
    console.error('Error renderizando vista resumida:', error);
    container.innerHTML = '<div class="text-red-500 text-center py-8">Error al cargar candidatos</div>';
  } finally {
    showLoading(false, 'vista-resumida');
  }
}

/**
 * Poblar el selector de candidatos
 */
async function populateCandidatoSelector(processedData) {
  const selector = document.getElementById('candidato-selector');
  if (!selector) return;
  
  // Limpiar y agregar opción por defecto
  selector.innerHTML = '<option value="">Ver todos los candidatos</option>';
  
  processedData.forEach(candidato => {
    const option = document.createElement('option');
    option.value = candidato.persona_id;
    option.textContent = candidato.nombre;
    selector.appendChild(option);
  });
}

/**
 * Configurar event listeners para la sección precontractual
 */
async function setupPrecontractualEventListeners() {
  // Selector de candidatos
  const candidatoSelector = document.getElementById('candidato-selector');
  if (candidatoSelector) {
    candidatoSelector.addEventListener('change', async (e) => {
      const personaId = e.target.value;
      
      if (personaId) {
        await mostrarDetallesCandidato(personaId);
      } else {
        mostrarVistaResumida();
      }
    });
  }
  
  // Botón de vista resumida
  const btnVistaResumida = document.getElementById('btn-vista-resumida');
  if (btnVistaResumida) {
    btnVistaResumida.addEventListener('click', () => {
      mostrarVistaResumida();
      // Resetear selector
      const selector = document.getElementById('candidato-selector');
      if (selector) selector.value = '';
    });
  }
}

/**
 * Mostrar vista resumida con animación profesional
 */
function mostrarVistaResumida() {
  const vistaResumida = document.getElementById('vista-resumida');
  const timelineContainer = document.getElementById('timeline-container');
  
  // Reset estado
  window.candidatoExpandido = null;
  
  // Remover efectos visuales de candidatos con animación
  document.querySelectorAll('.candidato-item').forEach(item => {
    item.style.transition = 'all 0.3s ease-out';
    item.classList.remove('ring-2', 'ring-blue-500', 'bg-blue-50');
  });
  
  if (timelineContainer && !timelineContainer.classList.contains('hidden')) {
    // Animación profesional de salida para timeline
    timelineContainer.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
    timelineContainer.style.transform = 'translateY(-20px)';
    timelineContainer.style.opacity = '0';
    
    setTimeout(() => {
      timelineContainer.classList.add('hidden');
      timelineContainer.style.transition = '';
      timelineContainer.style.transform = '';
      timelineContainer.style.opacity = '';
      
      // Animación profesional de entrada para vista resumida
      vistaResumida.style.opacity = '0';
      vistaResumida.style.transform = 'translateY(20px)';
      vistaResumida.classList.remove('hidden');
      
      requestAnimationFrame(() => {
        vistaResumida.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
        vistaResumida.style.transform = 'translateY(0)';
        vistaResumida.style.opacity = '1';
      });
      
      setTimeout(() => {
        vistaResumida.style.transition = '';
        vistaResumida.style.transform = '';
        vistaResumida.style.opacity = '';
      }, 400);
    }, 200);
  } else {
    // Si ya está visible, solo asegurar que esté mostrado
    vistaResumida.classList.remove('hidden');
  }
}

/**
 * Mostrar detalles de un candidato específico
 */
async function mostrarDetallesCandidato(personaId) {
  const vistaResumida = document.getElementById('vista-resumida');
  const timelineContainer = document.getElementById('timeline-container');
  
  if (vistaResumida) vistaResumida.classList.add('hidden');
  if (timelineContainer) timelineContainer.classList.remove('hidden');
  
  // Actualizar selector
  const selector = document.getElementById('candidato-selector');
  if (selector) selector.value = personaId;
  
  // Mostrar timeline del candidato específico
  if (window.precontractualData) {
    const candidato = window.precontractualData.find(c => c.persona_id === personaId);
    if (candidato) {
      renderTimelineDetallado([candidato]);
    }
  }
}

/**
 * Renderiza timeline detallado para candidatos específicos
 */
function renderTimelineDetallado(candidatos) {
  const container = document.getElementById('timeline-container');
  if (!container) return;
  
  if (!candidatos.length) {
    container.innerHTML = '<div class="text-center py-8 text-gray-500">No se encontró información del candidato</div>';
    return;
  }
  
  let html = '';
  
  candidatos.forEach((candidato, index) => {
    const maxDuracion = Math.max(...candidato.etapas.map(e => e.duracionDias));
    
    html += `
      <div class="candidate-timeline-item bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-4">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center">
            <div class="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-semibold mr-3">
              ${index + 1}
            </div>
            <h3 class="text-lg font-semibold text-gray-900">${escapeHtml(candidato.nombre)}</h3>
          </div>
          <div class="flex items-center space-x-3">
            <span class="px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeClass(candidato.estadoGeneral)}">
              ${candidato.estadoGeneral}
            </span>
            <div class="text-right">
              <p class="text-sm text-gray-500">Tiempo total</p>
              <p class="text-lg font-semibold text-gray-900">${candidato.tiempoTotal} días</p>
            </div>
          </div>
        </div>
        
        <div class="stage-timeline">
    `;
    
    candidato.etapas.forEach((etapa, etapaIndex) => {
      const width = maxDuracion > 0 ? Math.max((etapa.duracionDias / maxDuracion) * 100, 15) : 15;
      const fechaInicio = etapa.fechaInicio ? etapa.fechaInicio.toLocaleDateString('es-ES') : '-';
      const fechaFin = etapa.fechaFin ? etapa.fechaFin.toLocaleDateString('es-ES') : 'En curso';
      
      html += `
        <div class="stage-item mb-3">
          <div class="stage-label text-sm font-medium text-gray-700 mb-1">
            ${escapeHtml(etapa.etapa)}
          </div>
          <div class="stage-bar-container bg-gray-200 rounded-full h-6 relative mb-1">
            <div class="stage-bar-fill ${getStageBarClass(etapa.estado)} rounded-full h-6 flex items-center justify-center text-xs font-semibold text-white" 
                 style="width: ${width}%"
                 title="${etapa.duracionDias} días - ${fechaInicio} a ${fechaFin}">
              ${etapa.duracionDias}d
            </div>
          </div>
          <div class="stage-duration flex justify-between text-xs text-gray-500">
            <span>${fechaInicio}</span>
            <span>${fechaFin}</span>
          </div>
        </div>
      `;
    });
    
    html += `
        </div>
        
        <div class="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center text-sm text-gray-500">
          <span>${candidato.etapas.length} etapa${candidato.etapas.length !== 1 ? 's' : ''}</span>
          <span>Promedio: ${Math.round(candidato.tiempoTotal / candidato.etapas.length)} días por etapa</span>
        </div>
      </div>
    `;
  });
  
  container.innerHTML = html;
}

/**
 * Renderiza timeline general de todas las personas (como en página precontractual)
 */
async function renderTimelineGeneral(personas = []) {
  const container = document.getElementById('timeline-container');
  if (!container) return;
  
  showLoading(true, 'timeline-container', 'Preparando línea de tiempo...');
  
  try {
    // Obtener todos los datos precontractuales
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: 'listPrecontractual',
        payload: {}
      })
    });
    
    const result = await response.json();
    if (!result.ok) throw new Error(result.error);
    
    // Procesar los datos como en la página precontractual
    const processedData = await processPrecontractualData(result.items);
    
    if (!processedData.length) {
      container.innerHTML = `
        <div class="text-center py-12">
          <span class="material-icons text-6xl text-gray-300 mb-4">timeline</span>
          <p class="text-gray-500 text-lg">No hay datos precontractuales para mostrar</p>
        </div>
      `;
      return;
    }
    
    // Renderizar timeline como en precontractual.js
    let html = '';
    
    // Mostrar solo los primeros 5 candidatos
    const candidatosToShow = processedData.slice(0, 5);
    
    candidatosToShow.forEach((candidato, index) => {
      const maxDuracion = Math.max(...candidato.etapas.map(e => e.duracionDias));
      
      html += `
        <div class="candidate-timeline-item bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-4">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center">
              <div class="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-semibold mr-3">
                ${index + 1}
              </div>
              <h3 class="text-lg font-semibold text-gray-900">${escapeHtml(candidato.nombre)}</h3>
            </div>
            <div class="flex items-center space-x-3">
              <span class="px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeClass(candidato.estadoGeneral)}">
                ${candidato.estadoGeneral}
              </span>
              <div class="text-right">
                <p class="text-sm text-gray-500">Tiempo total</p>
                <p class="text-lg font-semibold text-gray-900">${candidato.tiempoTotal} días</p>
              </div>
            </div>
          </div>
          
          <div class="stage-timeline">
      `;
      
      candidato.etapas.forEach((etapa, etapaIndex) => {
        const width = maxDuracion > 0 ? Math.max((etapa.duracionDias / maxDuracion) * 100, 15) : 15;
        const fechaInicio = etapa.fechaInicio ? etapa.fechaInicio.toLocaleDateString('es-ES') : '-';
        const fechaFin = etapa.fechaFin ? etapa.fechaFin.toLocaleDateString('es-ES') : 'En curso';
        
        html += `
          <div class="stage-item mb-3">
            <div class="stage-label text-sm font-medium text-gray-700 mb-1">
              ${escapeHtml(etapa.etapa)}
            </div>
            <div class="stage-bar-container bg-gray-200 rounded-full h-6 relative mb-1">
              <div class="stage-bar-fill ${getStageBarClass(etapa.estado)} rounded-full h-6 flex items-center justify-center text-xs font-semibold text-white" 
                   style="width: ${width}%"
                   title="${etapa.duracionDias} días - ${fechaInicio} a ${fechaFin}">
                ${etapa.duracionDias}d
              </div>
            </div>
            <div class="stage-duration flex justify-between text-xs text-gray-500">
              <span>${fechaInicio}</span>
              <span>${fechaFin}</span>
            </div>
          </div>
        `;
      });
      
      html += `
          </div>
          
          <div class="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center text-sm text-gray-500">
            <span>${candidato.etapas.length} etapa${candidato.etapas.length !== 1 ? 's' : ''}</span>
            <span>Promedio: ${Math.round(candidato.tiempoTotal / candidato.etapas.length)} días por etapa</span>
          </div>
        </div>
      `;
    });
    
    if (processedData.length > 5) {
      html += `
        <div class="text-center py-4">
          <p class="text-gray-500 text-sm">Mostrando los primeros 5 candidatos de ${processedData.length} total</p>
        </div>
      `;
    }
    
    container.innerHTML = html;
    
  } catch (error) {
    console.error('Error renderizando timeline general:', error);
    container.innerHTML = '<div class="text-red-500 text-center py-8">Error al cargar el timeline</div>';
  } finally {
    showLoading(false, 'timeline-container');
  }
}

/**
 * Procesa los datos precontractuales igual que en precontractual.js
 */
async function processPrecontractualData(rawData) {
  if (!Array.isArray(rawData)) return [];
  
  console.log('rawData sample:', rawData.slice(0, 2)); // Ver los primeros 2 elementos
  
  // Obtener información de personas
  let personasInfo = [];
  try {
    const personasResponse = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: 'listPersonas',
        payload: {}
      })
    });
    
    const personasResult = await personasResponse.json();
    if (personasResult.ok) {
      personasInfo = personasResult.items || [];
    }
  } catch (error) {
    console.warn('Error obteniendo información de personas:', error);
  }
  
  // Agrupar por persona
  const groupedData = new Map();
  
    rawData.forEach(item => {
    console.log('rawData item keys:', Object.keys(item)); // Ver qué campos están disponibles
    
    const personaId = item.persona_id;    if (!groupedData.has(personaId)) {
      const personaInfo = personasInfo.find(p => p.persona_id === personaId);
      
      let nombrePersona = 'Persona sin nombre';
      if (personaInfo) {
        nombrePersona = personaInfo.nombre_completo || 
                      personaInfo.Nombre || 
                      personaInfo.nombre || 
                      personaInfo.NombreCompleto ||
                      `Persona ${personaId}`;
      }
      
      groupedData.set(personaId, {
        persona: personaInfo || { persona_id: personaId },
        nombrePersona: nombrePersona,
        etapas: new Map()
      });
    }
    
    const personData = groupedData.get(personaId);
    const etapa = item.Etapa;
    
    if (!personData.etapas.has(etapa)) {
      personData.etapas.set(etapa, {
        etapa: etapa,
        eventos: [],
        estado: 'En proceso',
        fechaInicio: null,
        fechaFin: null,
        duracionDias: 0,
        intento: 1
      });
    }
    
    personData.etapas.get(etapa).eventos.push(item);
  });
  
  // Procesar cada etapa para calcular duraciones y estados
  const processedData = [];
  
  groupedData.forEach((personData, personaId) => {
    const candidato = {
      persona_id: personaId,
      nombre: personData.nombrePersona,
      etapas: [],
      tiempoTotal: 0,
      estadoGeneral: 'En proceso'
    };
    
    personData.etapas.forEach((etapaData, etapaNombre) => {
      const etapa = processEtapa(etapaData);
      candidato.etapas.push(etapa);
      candidato.tiempoTotal += etapa.duracionDias;
    });
    
    // Determinar estado general
    const todasFinalizadas = candidato.etapas.every(e => e.estado === 'Finalizado');
    candidato.estadoGeneral = todasFinalizadas ? 'Finalizado' : 'En proceso';
    
    processedData.push(candidato);
  });
  
  return processedData;
}

/**
 * Procesa una etapa individual
 */
function processEtapa(etapaData) {
  console.log('processEtapa input:', etapaData);
  
  // Intentar diferentes nombres de campo para la fecha
  const eventos = etapaData.eventos.map(evento => {
    let fechaEvento = evento.Fecha_evento || evento.Fecha || evento.fecha || evento.fecha_evento;
    console.log('Evento fecha raw:', { 
      'Fecha_evento': evento.Fecha_evento,
      'Fecha': evento.Fecha,
      'fecha': evento.fecha,
      'fecha_evento': evento.fecha_evento,
      'selected': fechaEvento
    });
    return { ...evento, fechaCalculada: fechaEvento };
  }).sort((a, b) => parseDate(a.fechaCalculada) - parseDate(b.fechaCalculada));
  
  console.log('eventos ordenados:', eventos.map(e => ({ fechaCalculada: e.fechaCalculada, parsed: parseDate(e.fechaCalculada) })));
  
  // Encontrar todas las fechas de la etapa
  const fechasEtapa = eventos.map(e => parseDate(e.fechaCalculada)).filter(fecha => fecha !== null);
  
  console.log('fechasEtapa:', fechasEtapa);
  
  // Encontrar fecha más temprana (inicio) y más tardía (fin) de toda la etapa
  const fechaInicio = fechasEtapa.length > 0 ? new Date(Math.min(...fechasEtapa)) : null;
  const fechaFin = fechasEtapa.length > 0 ? new Date(Math.max(...fechasEtapa)) : null;
  
  console.log('fechaInicio:', fechaInicio, 'fechaFin:', fechaFin);
  
  // Calcular duración usando la fecha más temprana y más tardía
  let duracionDias = 0;
  if (fechaInicio && fechaFin) {
    duracionDias = Math.ceil((fechaFin - fechaInicio) / (1000 * 60 * 60 * 24)) + 1; // +1 para incluir ambos días
  } else if (fechaInicio) {
    // Si no hay fecha de fin, usar fecha actual para etapas en proceso
    duracionDias = Math.ceil((new Date() - fechaInicio) / (1000 * 60 * 60 * 24));
  }
  
  console.log('duracionDias calculada:', duracionDias);
  
  // Determinar estado basándose en si todas las fases están finalizadas
  const eventosFin = eventos.filter(e => e.Estado === 'Finalizada');
  const estado = eventosFin.length === eventos.length ? 'Finalizado' : 'En proceso';
  
  const result = {
    etapa: etapaData.etapa,
    estado: estado,
    fechaInicio: fechaInicio,
    fechaFin: estado === 'Finalizado' ? fechaFin : null,
    duracionDias: duracionDias,
    eventos: eventos,
    intento: Math.max(...eventos.map(e => e.Intento || 1))
  };
  
  console.log('processEtapa result:', result);
  
  return result;
}

/**
 * Parsea fechas en formato texto (2025-01-01) a objeto Date
 */
function parseDate(dateString) {
  if (!dateString) return null;
  
  console.log('parseDate input:', dateString, 'type:', typeof dateString);
  
  // Si ya es un objeto Date válido
  if (dateString instanceof Date && !isNaN(dateString.getTime())) {
    console.log('parseDate result (Date object):', dateString);
    return dateString;
  }
  
  // Si es string
  if (typeof dateString === 'string') {
    // Limpiar espacios
    const cleanDate = dateString.trim();
    console.log('parseDate cleanDate:', cleanDate);
    
    // Formato YYYY-MM-DD (más común en Google Sheets)
    if (cleanDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = cleanDate.split('-').map(Number);
      const result = new Date(year, month - 1, day); // month - 1 porque Date usa 0-indexado
      console.log('parseDate YYYY-MM-DD result:', result, 'from:', year, month-1, day);
      return result;
    }
    
    // Formato DD/MM/YYYY
    if (cleanDate.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
      const [day, month, year] = cleanDate.split('/').map(Number);
      const result = new Date(year, month - 1, day);
      console.log('parseDate DD/MM/YYYY result:', result);
      return result;
    }
    
    // Formato MM/DD/YYYY
    if (cleanDate.match(/^\d{1,2}-\d{1,2}-\d{4}$/)) {
      const [month, day, year] = cleanDate.split('-').map(Number);
      const result = new Date(year, month - 1, day);
      console.log('parseDate MM-DD-YYYY result:', result);
      return result;
    }
    
    // Intentar parsing nativo como último recurso
    const parsed = new Date(cleanDate);
    console.log('parseDate native parsing result:', parsed, 'isNaN:', isNaN(parsed.getTime()));
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  
  console.log('parseDate returning null for:', dateString);
  return null;
}

/**
 * Obtiene la clase CSS para la barra de etapa
 */
function getStageBarClass(estado) {
  switch (estado) {
    case 'Finalizado':
      return 'bg-green-500';
    case 'En proceso':
      return 'bg-yellow-500';
    default:
      return 'bg-gray-400';
  }
}

/**
 * Obtiene la clase CSS para el badge de estado
 */
function getStatusBadgeClass(estado) {
  switch (estado) {
    case 'Completado':
      return 'bg-green-100 text-green-800';
    case 'En proceso':
      return 'bg-yellow-100 text-yellow-800';
    case 'Sin iniciar':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
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
  option.textContent = `${persona.nombre} - ${stripLeadingNumber(persona.etapaActual || '')}`;
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
  showLoading(true, 'timeline-container', 'Calculando detalles del candidato...');
    
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
          <h4 class="font-semibold text-gray-800">${escapeHtml(stripLeadingNumber(evento.Etapa || ''))}</h4>
          <p class="text-sm text-gray-600">${escapeHtml(stripLeadingNumber(evento.Fase || ''))}</p>
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
 * Renderiza personas con mayor tiempo en proceso usando datos reales del timeline
 */
function renderPersonasTiempoExcesivo(personas = []) {
  const container = document.getElementById('lista-tiempo-excesivo');
  if (!container) return;
  
  // Usar los datos procesados que ya tenemos
  if (!window.precontractualData || !window.precontractualData.length) {
    container.innerHTML = '<div class="text-gray-500 text-sm">No hay candidatos en proceso</div>';
    return;
  }
  
  // Usar datos reales procesados y ordenar por tiempo total
  const personasConTiempo = [...window.precontractualData]
    .map(candidato => {
      // Obtener la etapa y fase actual (la más reciente)
      const etapaActual = candidato.etapas[candidato.etapas.length - 1];
      let faseActual = 'Sin fase';
      
      // Buscar la fase más reciente de la etapa actual
      if (etapaActual && etapaActual.eventos && etapaActual.eventos.length > 0) {
        const eventoMasReciente = etapaActual.eventos[etapaActual.eventos.length - 1];
        faseActual = eventoMasReciente.Fase || 'Sin fase';
      }
      
      return {
        ...candidato,
        diasTranscurridos: candidato.tiempoTotal,
        etapaActual: etapaActual?.etapa || 'Sin etapa',
        faseActual: faseActual
      };
    })
    .sort((a, b) => b.diasTranscurridos - a.diasTranscurridos); // Ordenar por más días primero
  
  let html = '';
  personasConTiempo.forEach((persona, index) => {
    // Determinar color según los días
    const priorityColor = persona.diasTranscurridos > 60 ? 'text-red-600' : 
                         persona.diasTranscurridos > 45 ? 'text-orange-600' : 
                         persona.diasTranscurridos > 30 ? 'text-yellow-600' : 'text-green-600';
    
    const bgColor = persona.diasTranscurridos > 60 ? 'bg-red-50 border-red-200' : 
                    persona.diasTranscurridos > 45 ? 'bg-orange-50 border-orange-200' : 
                    persona.diasTranscurridos > 30 ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200';
    
    html += `
      <div class="flex items-center justify-between p-3 ${bgColor} border rounded-lg">
        <div class="flex items-center">
          <div class="bg-gray-200 text-gray-600 rounded-full w-6 h-6 flex items-center justify-center text-xs font-semibold mr-3">
            ${index + 1}
          </div>
          <div>
            <span class="font-medium text-gray-900">${escapeHtml(persona.nombre || 'Nombre no disponible')}</span>
            <p class="text-xs text-gray-600">
              <span class="font-medium">${escapeHtml(stripLeadingNumber(persona.etapaActual))}</span>
              ${persona.faseActual !== 'Sin fase' ? ` - ${escapeHtml(stripLeadingNumber(persona.faseActual))}` : ''}
            </p>
          </div>
        </div>
        <div class="text-right">
          <span class="${priorityColor} font-semibold">${persona.diasTranscurridos} días</span>
        </div>
      </div>
    `;
  });
  
  container.innerHTML = html;
}

/**
 * Muestra/oculta indicador de carga
 */
let dashboardLoaderCount = 0;

function showLoading(show, containerId = null, message) {
  const container = containerId ? document.getElementById(containerId) : null;

  if (container) {
    if (show) {
      container.dataset.loaderPlaceholder = 'true';
      container.innerHTML = '<div class="text-center py-4"><div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div></div>';
    } else if (container.dataset.loaderPlaceholder) {
      delete container.dataset.loaderPlaceholder;
    }
    return;
  }

  const resolvedMessage = message || 'Cargando datos...';

  if (show) {
    dashboardLoaderCount += 1;
    showLoader(resolvedMessage, 'blocking');
    return;
  }

  if (dashboardLoaderCount > 0) {
    dashboardLoaderCount -= 1;
  }

  if (dashboardLoaderCount === 0) {
    hideLoader();
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
  
  const date = parseDate(dateString);
  if (!date) return '';
  
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

// Exponer funciones globalmente para uso en onclick
window.mostrarDetallesCandidato = async function(personaId) {
  const vistaResumida = document.getElementById('vista-resumida');
  const timelineContainer = document.getElementById('timeline-container');
  
  if (vistaResumida) vistaResumida.classList.add('hidden');
  if (timelineContainer) timelineContainer.classList.remove('hidden');
  
  // Actualizar selector
  const selector = document.getElementById('candidato-selector');
  if (selector) selector.value = personaId;
  
  // Mostrar timeline del candidato específico
  if (window.precontractualData) {
    const candidato = window.precontractualData.find(c => c.persona_id === personaId);
    if (candidato) {
      renderTimelineDetallado([candidato]);
    }
  }
};

// Variable para trackear el estado de cada candidato (expandido o no)
window.candidatoExpandido = null;

// Nueva función con animación profesional para toggle
window.toggleCandidatoDetalle = async function(personaId, element) {
  const vistaResumida = document.getElementById('vista-resumida');
  const timelineContainer = document.getElementById('timeline-container');
  
  // Si el mismo candidato ya está expandido, contraer
  if (window.candidatoExpandido === personaId) {
    // Animación profesional de salida
    timelineContainer.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
    timelineContainer.style.transform = 'translateY(-20px)';
    timelineContainer.style.opacity = '0';
    
    setTimeout(() => {
      timelineContainer.classList.add('hidden');
      timelineContainer.style.transform = '';
      timelineContainer.style.opacity = '';
      timelineContainer.style.transition = '';
      
      // Animación de entrada para vista resumida
      vistaResumida.style.opacity = '0';
      vistaResumida.style.transform = 'translateY(20px)';
      vistaResumida.classList.remove('hidden');
      
      requestAnimationFrame(() => {
        vistaResumida.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
        vistaResumida.style.transform = 'translateY(0)';
        vistaResumida.style.opacity = '1';
      });
      
      setTimeout(() => {
        vistaResumida.style.transition = '';
        vistaResumida.style.transform = '';
        vistaResumida.style.opacity = '';
      }, 400);
    }, 200);
    
    // Resetear estado
    window.candidatoExpandido = null;
    const selector = document.getElementById('candidato-selector');
    if (selector) selector.value = '';
    
    // Remover efecto visual del elemento con animación
    element.style.transition = 'all 0.3s ease-out';
    element.classList.remove('ring-2', 'ring-blue-500', 'bg-blue-50');
    
  } else {
    // Expandir nuevo candidato con animación profesional
    
    // Remover efecto visual del candidato anterior
    if (window.candidatoExpandido) {
      const elementoAnterior = document.querySelector(`[onclick*="${window.candidatoExpandido}"]`);
      if (elementoAnterior) {
        elementoAnterior.style.transition = 'all 0.3s ease-out';
        elementoAnterior.classList.remove('ring-2', 'ring-blue-500', 'bg-blue-50');
      }
    }
    
    // Agregar efecto visual al candidato actual con animación
    element.style.transition = 'all 0.3s ease-in';
    element.classList.add('ring-2', 'ring-blue-500', 'bg-blue-50');
    
    // Animación profesional de salida para vista resumida
    vistaResumida.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
    vistaResumida.style.transform = 'translateY(-20px)';
    vistaResumida.style.opacity = '0';
    
    setTimeout(() => {
      vistaResumida.classList.add('hidden');
      vistaResumida.style.transition = '';
      vistaResumida.style.transform = '';
      vistaResumida.style.opacity = '';
      
      // Preparar timeline con datos
      if (window.precontractualData) {
        const candidato = window.precontractualData.find(c => c.persona_id === personaId);
        if (candidato) {
          renderTimelineDetallado([candidato]);
        }
      }
      
      // Mostrar timeline con animación profesional
      timelineContainer.style.opacity = '0';
      timelineContainer.style.transform = 'translateY(20px)';
      timelineContainer.classList.remove('hidden');
      
      requestAnimationFrame(() => {
        timelineContainer.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
        timelineContainer.style.transform = 'translateY(0)';
        timelineContainer.style.opacity = '1';
      });
      
      setTimeout(() => {
        timelineContainer.style.transition = '';
        timelineContainer.style.transform = '';
        timelineContainer.style.opacity = '';
      }, 400);
      
    }, 200);
    
    // Actualizar estado
    window.candidatoExpandido = personaId;
    const selector = document.getElementById('candidato-selector');
    if (selector) selector.value = personaId;
  }
};

/**
 * Función para ir a la página Precontractual con filtro aplicado
 */
window.irAPrecontractual = function(personaId, nombrePersona) {
  // Guardar el filtro en localStorage para que la página precontractual lo use
  localStorage.setItem('precontractual_filtro', JSON.stringify({
    tipo: 'persona',
    valor: personaId,
    nombre: nombrePersona,
    timestamp: Date.now()
  }));
  
  // Redireccionar a la página precontractual
  window.location.href = '/src/pages/precontractual.html';
};

/**
 * Función para hacer clickeables las alertas y redireccionar con filtros
 */
window.irAAlerta = function(tipoAlerta, datos) {
  switch (tipoAlerta) {
    case 'contrato_vencer':
      // Guardar filtro para contratistas
      localStorage.setItem('contratistas_filtro', JSON.stringify({
        tipo: 'persona',
        valor: datos.persona_id,
        nombre: datos.nombre,
        timestamp: Date.now()
      }));
      window.location.href = '/src/pages/contratistas.html';
      break;
      
    case 'pago_pendiente':
      localStorage.setItem('contratistas_filtro', JSON.stringify({
        tipo: 'persona',
        valor: datos.persona_id,
        nombre: datos.nombre,
        timestamp: Date.now()
      }));
      window.location.href = '/src/pages/contratistas.html';
      break;
      
    case 'proceso_demorado':
      localStorage.setItem('precontractual_filtro', JSON.stringify({
        tipo: 'persona',
        valor: datos.persona_id,
        nombre: datos.nombre,
        timestamp: Date.now()
      }));
      window.location.href = '/src/pages/precontractual.html';
      break;
      
    default:
      console.warn('Tipo de alerta no reconocido:', tipoAlerta);
  }
};
