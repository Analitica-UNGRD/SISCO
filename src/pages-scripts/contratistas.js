// Script para la página de contratistas (conectado con backend)
import { initSidebar } from './sidebar.js';
let contratosData = [];
const obligacionesCache = new Map();
let currentObligacionesContratoId = null;

// Función para realizar peticiones al backend Apps Script
async function fetchFromBackend(path, payload = {}) {
  try {
    // Mostrar indicador de carga en las peticiones largas
    const loadingTimeout = setTimeout(() => {
      const loadingIndicator = document.createElement('div');
      loadingIndicator.id = 'api-loading-indicator';
      loadingIndicator.className = 'fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center';
      loadingIndicator.innerHTML = `
        <div class="animate-spin rounded-full h-4 w-4 border-2 border-white mr-2"></div>
        <span>Conectando con el servidor...</span>
      `;
      document.body.appendChild(loadingIndicator);
    }, 300); // Solo mostrar si tarda más de 300ms
    
    // Intentar varios endpoints en caso de que alguno falle
    const apiUrls = [
  '/api',                               // Preferir ruta relativa (Vercel serverless)
  'http://localhost:3000/api',          // Servidor proxy local
  'http://127.0.0.1:3000/api',          // Alternativa para localhost
  window.location.origin + '/api-proxy' // Alternativa relativa a la raíz actual
    ];
    
    let lastError = null;
    let response = null;
    
    // Intentar cada URL hasta que una funcione
    for (const apiUrl of apiUrls) {
      try {
        console.log(`Intentando conectar a: ${apiUrl}`);
        response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            path,
            payload
          }),
        });
        
        // Si la petición fue exitosa, salimos del bucle
        if (response.ok) {
          console.log(`Conexión exitosa a: ${apiUrl}`);
          break;
        } else {
          lastError = new Error(`Error HTTP: ${response.status} en ${apiUrl}`);
        }
      } catch (err) {
        console.warn(`Fallo al conectar a ${apiUrl}:`, err);
        lastError = err;
        // Continuamos con la siguiente URL
      }
    }
    
    // Si no se pudo conectar a ninguna URL
    if (!response || !response.ok) {
      throw lastError || new Error('No se pudo conectar a ningún endpoint');
    }
    
    // Limpiar indicador de carga
    clearTimeout(loadingTimeout);
    const indicator = document.getElementById('api-loading-indicator');
    if (indicator) {
      document.body.removeChild(indicator);
    }
    
    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }
    
    const data = await response.json();
    if (!data.ok) {
      throw new Error(data.error || 'Error desconocido en la API');
    }
    
    return data;
  } catch (error) {
    console.error('Error al realizar la petición al backend:', error);
    
    // Limpiar indicador de carga en caso de error
    const indicator = document.getElementById('api-loading-indicator');
    if (indicator) {
      document.body.removeChild(indicator);
    }
    
    // Mostrar mensaje de error
    const errorToast = document.createElement('div');
    errorToast.className = 'fixed bottom-4 left-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg z-50';
    errorToast.innerHTML = `Error: ${error.message}`;
    document.body.appendChild(errorToast);
    
    setTimeout(() => {
      errorToast.style.opacity = '0';
      errorToast.style.transition = 'opacity 0.5s ease';
      setTimeout(() => {
        try { document.body.removeChild(errorToast); } catch(e) {}
      }, 500);
    }, 5000);
    
    throw error;
  }
}

// Función para formatear fechas ISO a formato legible (DD/MM/YYYY)
function formatDate(dateStr) {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    // Formato DD/MM/YYYY
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch(e) {
    console.warn('Error formateando fecha:', e);
    return dateStr;
  }
}

function formatCurrency(v){ return new Intl.NumberFormat('es-CO',{style:'currency', currency:'COP', maximumFractionDigits:0}).format(v); }

// Función para formatear números de documento con separadores de miles (1.070.983.009)
function formatDocumentNumber(num) {
  if (!num) return '-';
  // Convierte a string si es número
  const numStr = String(num);
  // Verifica si ya es un formato válido o si es un número
  if (isNaN(numStr.replace(/\./g, ''))) return numStr;
  // Formatea con separador de miles (punto)
  return new Intl.NumberFormat('es-CO', {useGrouping: true}).format(numStr.replace(/\./g, '')).replace(/,/g, '.');
}

// Normalize text for diacritic-insensitive comparisons
function normalizeText(str){
  if(!str) return '';
    // remove diacritics and fold to lower-case
    return String(str).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
}

function renderSemaforo(list){
  const container = document.getElementById('semaforoList');
  container.innerHTML = '';
  
  // Update counter in the header
  const counter = document.getElementById('semaforoCounter');
  if (counter) {
    counter.textContent = list.length;
  }
  
  // Display empty state if no contracts
  if (list.length === 0) {
    container.innerHTML = `
      <div class="flex flex-col items-center justify-center text-center p-8 h-60 text-gray-500">
        <div class="w-16 h-16 mb-4 rounded-full bg-blue-50 flex items-center justify-center pulse-animation">
          <span class="material-icons text-blue-400 text-2xl">schedule</span>
        </div>
        <h4 class="font-medium text-gray-700 mb-1">¡Todo en orden!</h4>
        <p class="text-sm text-gray-500">No hay contratos próximos a vencer en este momento</p>
        <button class="mt-4 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors">
          Revisar todos los contratos
        </button>
      </div>
    `;
    return;
  }
  
  // No necesitamos elementos adicionales para la cabecera, ya tenemos el título principal
  
  // Crear contenedor para estados con colores - moviéndolo más arriba
  const statusIndicatorsContainer = document.createElement('div');
  statusIndicatorsContainer.className = 'status-indicators flex justify-between mb-3 px-1';
  statusIndicatorsContainer.innerHTML = `
    <div class="status-indicator flex items-center gap-1">
      <span class="w-2 h-2 bg-gray-400 rounded-full"></span>
      <span class="text-xs text-gray-600">Vencido</span>
    </div>
    <div class="status-indicator flex items-center gap-1">
      <span class="w-2 h-2 bg-red-400 rounded-full"></span>
      <span class="text-xs text-gray-600">Crítico</span>
    </div>
    <div class="status-indicator flex items-center gap-1">
      <span class="w-2 h-2 bg-amber-400 rounded-full"></span>
      <span class="text-xs text-gray-600">Alerta</span>
    </div>
    <div class="status-indicator flex items-center gap-1">
      <span class="w-2 h-2 bg-green-400 rounded-full"></span>
      <span class="text-xs text-gray-600">OK</span>
    </div>
  `;
  
  // Crear contenedor para las tarjetas con scroll - ajustando posición
  const cardsContainer = document.createElement('div');
  cardsContainer.className = 'contratos-cards overflow-y-auto custom-scrollbar mt-2';
  cardsContainer.style.maxHeight = '380px'; // Altura aumentada para mostrar 3 tarjetas sin scroll
  
  // Group contracts by status for better organization
  const groups = {
    expired: [],   // < 0 days (vencido)
    critical: [],  // 0-30 days (crítico)
    warning: [],   // 31-90 days (alerta)
    ok: []         // > 90 days (ok)
  };
  
  list.forEach(item => {
    const daysToEnd = Math.ceil((new Date(item.Fin) - new Date())/ (1000*60*60*24));
    
    if (isNaN(daysToEnd)) {
      // Si la fecha no es válida, ponerlo en crítico
      groups.critical.push({ item, daysToEnd });
    } else if (daysToEnd < 0) {
      // Vencido (días negativos)
      groups.expired.push({ item, daysToEnd });
    } else if (daysToEnd <= 30) {
      // Crítico (0-30 días)
      groups.critical.push({ item, daysToEnd });
    } else if (daysToEnd <= 90) {
      // Alerta (31-90 días)
      groups.warning.push({ item, daysToEnd });
    } else {
      // OK (más de 90 días)
      groups.ok.push({ item, daysToEnd });
    }
  });
  
  // Ordenar cada grupo por días restantes (ascendente)
  groups.expired.sort((a, b) => a.daysToEnd - b.daysToEnd);
  groups.critical.sort((a, b) => a.daysToEnd - b.daysToEnd);
  groups.warning.sort((a, b) => a.daysToEnd - b.daysToEnd);
  groups.ok.sort((a, b) => a.daysToEnd - b.daysToEnd);
  
  // Sort groups by priority: vencido, crítico, alerta, ok
  const sortedItems = [
    ...groups.expired,
    ...groups.critical,
    ...groups.warning,
    ...groups.ok
  ];
  
  // Mostramos solo los primeros 3 contratos, pero permitimos ver más al hacer scroll
  // Create cards for each item
  sortedItems.forEach((entry, i) => {
    const { item, daysToEnd } = entry;
    const card = document.createElement('div');
    card.className = 'semaforo-card cursor-pointer';
    card.dataset.id = item.contrato_id;
    
    // compute relative day label
    let dayLabel = '-';
    let statusClass = '';
    let statusLabel = '';
    let daysColor = '';
    
    if(!isNaN(daysToEnd)){
      // Classification
      if(daysToEnd < 0){
        dayLabel = `${Math.abs(daysToEnd)} días vencido`;
        statusClass = 'gray-status';
        daysColor = 'text-red-900 font-bold';
        statusLabel = 'Vencido';
      } else if(daysToEnd <= 30){
        dayLabel = `${daysToEnd} días restantes`;
        statusClass = 'red-status';
        daysColor = 'text-red-800 font-semibold';
        statusLabel = 'Crítico';
      } else if(daysToEnd <= 90){
        dayLabel = `${daysToEnd} días restantes`;
        statusClass = 'amber-status';
        daysColor = 'text-amber-800 font-semibold';
        statusLabel = 'Alerta';
      } else {
        dayLabel = `${daysToEnd} días restantes`;
        statusClass = 'green-status';
        daysColor = 'text-green-800 font-semibold';
        statusLabel = 'OK';
      }
    }
    
    // Estructura según la imagen de referencia
    card.className += ` ${statusClass}`;
    
    // Formato para valor del contrato
    const formattedValue = formatCurrency(item.Valor_total);
    
    card.innerHTML = `
      <div class="p-3 rounded-lg">
        <div class="flex justify-between">
          <div>
            <h4 class="font-bold text-gray-900">${item.persona}</h4>
            <div class="text-sm text-gray-700">N° ${item.Numero_contrato || '-'}</div>
          </div>
          <div class="status-badge ${statusClass}">${statusLabel}</div>
        </div>
        <div class="mt-1">
          <div class="text-sm font-medium">Valor: ${formattedValue}</div>
          <div class="text-sm font-medium">Plazo: ${item.Plazo ? item.Plazo.replace(/\s*meses\s*$/i, '') + ' meses' : '-'}</div>
          <div class="text-sm ${daysColor} font-bold mt-1">${dayLabel}</div>
        </div>
      </div>
    `;
    
    cardsContainer.appendChild(card);
    // staggered entrance
    setTimeout(()=> card.classList.add('enter'), 40 * i);
    
    // clicking a semaforo card selects that contrato and fills details
    card.addEventListener('click', ()=>{
      // remove previous selection classes
      document.querySelectorAll('.semaforo-card').forEach(x=> x.classList.remove('selected-semaforo'));
      card.classList.add('selected-semaforo');
      
      // NUEVA FUNCIONALIDAD: Mostrar solo este contratista en la tabla
      renderTable([item]);
      
      // sync table selection
      document.querySelectorAll('tr.contract-row').forEach(r=> r.classList.remove('selected-row'));
      const row = document.querySelector(`tr.contract-row[data-id="${item.contrato_id}"]`);
      if(row) row.classList.add('selected-row');
      
      // Update UI with selected contract details
      updateDetail(item);
      
      // Update status pill in header
      // Determinamos el valor de pillClass basado en daysToEnd
      let statusPillClass = '';
      if(isNaN(daysToEnd)) statusPillClass = '';
      else if(daysToEnd < 0 || daysToEnd <= 30) statusPillClass = 'overdue';
      else if(daysToEnd <= 90) statusPillClass = 'soon';
      else statusPillClass = 'ok';
      
      updateStatusPill(daysToEnd, statusPillClass, dayLabel);
      
      // Actualizar el selector de filtro para que coincida con la selección
      const filterSelect = document.getElementById('filterSelect');
      if(filterSelect) {
        filterSelect.value = item.contrato_id;
      }
    });
  });
  
  // Agregar todo al contenedor principal - solo los indicadores de estado y las tarjetas
  container.appendChild(statusIndicatorsContainer);
  container.appendChild(cardsContainer);
}

function populateFilter(list){
  const sel = document.getElementById('filterSelect');
  // keep default
  list.forEach(item=>{
    const opt = document.createElement('option'); opt.value=item.contrato_id; opt.textContent=`${item.persona} - ${item.contrato_id}`; sel.appendChild(opt);
  });
}

function renderTable(list){
  const container = document.getElementById('contractorsTable');
  container.innerHTML = ''; // Limpiar contenedor
  
  // Mostrar mensaje de filtro si solo hay un contratista
  if (list.length === 1) {
    const filterNotice = document.createElement('div');
    filterNotice.className = 'bg-blue-50 text-blue-700 px-4 py-2 mb-2 rounded-md flex items-center justify-between';
    filterNotice.innerHTML = `
      <span class="flex items-center">
        <span class="material-icons text-blue-500 mr-2">filter_alt</span>
        Mostrando solo: <strong class="ml-1">${list[0].persona}</strong>
      </span>
    `;
    container.appendChild(filterNotice);
  }
  
  const table = document.createElement('table'); 
  table.className='min-w-full text-sm';
  table.innerHTML = `<thead><tr class="text-left"><th class="p-2">Estado</th><th class="p-2">Contratista</th><th class="p-2">CDP</th><th class="p-2">RC</th><th class="p-2">Inicio</th><th class="p-2">Fin</th><th class="p-2">Valor total</th><th class="p-2">Valor mes</th><th class="p-2">Últ. periodo</th></tr></thead>`;
  const tbody = document.createElement('tbody');
  
  // Agrupar los contratos por estado, igual que en la sección de contratos próximos a vencer
  const groups = {
    expired: [],   // < 0 days (vencido)
    critical: [],  // 0-30 days (crítico)
    warning: [],   // 31-90 days (alerta)
    ok: []         // > 90 days (ok)
  };
  
  list.forEach(item => {
    const daysToEnd = Math.ceil((new Date(item.Fin) - new Date())/ (1000*60*60*24));
    
    if (isNaN(daysToEnd)) {
      // Si la fecha no es válida, ponerlo en crítico
      groups.critical.push({ item, daysToEnd });
    } else if (daysToEnd < 0) {
      // Vencido (días negativos)
      groups.expired.push({ item, daysToEnd });
    } else if (daysToEnd <= 30) {
      // Crítico (0-30 días)
      groups.critical.push({ item, daysToEnd });
    } else if (daysToEnd <= 90) {
      // Alerta (31-90 días)
      groups.warning.push({ item, daysToEnd });
    } else {
      // OK (más de 90 días)
      groups.ok.push({ item, daysToEnd });
    }
  });
  
  // Ordenar cada grupo por días restantes (ascendente)
  groups.expired.sort((a, b) => a.daysToEnd - b.daysToEnd);
  groups.critical.sort((a, b) => a.daysToEnd - b.daysToEnd);
  groups.warning.sort((a, b) => a.daysToEnd - b.daysToEnd);
  groups.ok.sort((a, b) => a.daysToEnd - b.daysToEnd);
  
  // Unir todos los grupos en el orden deseado: vencido, crítico, alerta, ok
  const sortedItems = [
    ...groups.expired,
    ...groups.critical,
    ...groups.warning,
    ...groups.ok
  ];
  
  sortedItems.forEach(entry => {
    const item = entry.item;
    const daysToEnd = entry.daysToEnd;
    
    let pillClass = '';
    let statusLabel = '';
    
    if(isNaN(daysToEnd)) {
      pillClass = 'overdue';
      statusLabel = 'Crítico';
    } else if(daysToEnd < 0) {
      pillClass = 'expired';
      statusLabel = 'Vencido';
    } else if(daysToEnd <= 30) {
      pillClass = 'overdue';
      statusLabel = 'Crítico';
    } else if(daysToEnd <= 90) {
      pillClass = 'soon';
      statusLabel = 'Alerta';
    } else {
      pillClass = 'ok';
      statusLabel = 'OK';
    }
    
    const dayLabel = isNaN(daysToEnd) ? '-' : (daysToEnd < 0 ? `${Math.abs(daysToEnd)}d vencido` : `${daysToEnd}d restantes`);

    const tr = document.createElement('tr'); 
    tr.className=`border-t contract-row ${pillClass}-row`; 
    tr.dataset.id = item.contrato_id;
    
    // Columna de estado con ancho fijo para evitar que se dañe el formato
    tr.innerHTML = `
      <td class="p-2 align-middle whitespace-nowrap" style="min-width: 160px">
        <span class="table-accent" style="background:${
          pillClass==='overdue'?'#dc2626':
          pillClass==='soon'?'#f59e0b':
          pillClass==='ok'?'#10b981':
          '#9ca3af'
        }"></span>
        <span class="table-pill ${pillClass}">${statusLabel} (${dayLabel})</span>
      </td>
      <td class="p-2">${item.persona} <div class="text-xs text-gray-500">N° ${item.Numero_contrato || '-'}</div></td>
      <td class="p-2">${item.Numero_CDP || '-'} <div class="text-xs text-gray-500">${formatDate(item.Fecha_CDP)}</div></td>
      <td class="p-2">${item.Numero_RC || '-'} <div class="text-xs text-gray-500">${formatDate(item.Fecha_RC)}</div></td>
      <td class="p-2">${formatDate(item.Inicio)}</td>
      <td class="p-2">${formatDate(item.Fin)}</td>
      <td class="p-2">${formatCurrency(item.Valor_total || 0)}</td>
      <td class="p-2">${formatCurrency(item.Valor_mensual || 0)}</td>
      <td class="p-2">${item.ultimo_periodo || '-'}</td>
    `;
    tbody.appendChild(tr);
  });
  // make rows clickable to select
  tbody.querySelectorAll('tr.contract-row').forEach(r=>{
    r.addEventListener('click', ()=>{
      const id = r.dataset.id; 
      const sel = contratosData.find(f => f.contrato_id === id);
      if(sel){
        // highlight row
        document.querySelectorAll('tr.contract-row').forEach(x=>x.classList.remove('selected-row'));
        r.classList.add('selected-row');
        // highlight semaforo
        document.querySelectorAll('.semaforo-card').forEach(x=>x.classList.remove('selected-semaforo'));
        const sc = document.querySelector(`.semaforo-card[data-id="${id}"]`);
        if(sc) sc.classList.add('selected-semaforo');
        updateDetail(sel);
      }
    });
  });
  table.appendChild(tbody);
  container.innerHTML = ''; container.appendChild(table);
}

function setObligacionesMessage(message, icon = 'assignment') {
  const container = document.getElementById('obligacionesTable');
  if (!container) return;
  container.innerHTML = `
    <div class="flex flex-col items-center justify-center py-8 text-center text-sm text-gray-500">
      <span class="material-icons text-3xl text-gray-300 mb-2">${icon}</span>
      ${message}
    </div>
  `;
}

function createMultilineCell(value, options = {}) {
  const td = document.createElement('td');
  td.className = options.className || 'p-2 align-top text-gray-700';
  const text = typeof value === 'string' ? value.trim() : (value ?? '').toString().trim();
  if (!text) {
    td.textContent = options.emptyLabel || '-';
    if (options.emptyClass) td.classList.add(options.emptyClass);
    return td;
  }

  text.split(/\r?\n+/).forEach((segment, index) => {
    const span = document.createElement('div');
    span.textContent = segment.trim();
    if (options.segmentClass) span.className = options.segmentClass;
    td.appendChild(span);
  });
  return td;
}

function createEvidenceCell(obligacion) {
  const td = document.createElement('td');
  td.className = 'p-2 align-top text-gray-700';
  const evidenciaUrl = (obligacion.Evidencia_URL || '').toString().trim();
  const evidenciaTexto = (obligacion.Producto || '').toString().trim();

  if (evidenciaUrl) {
    const link = document.createElement('a');
    link.href = evidenciaUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.className = 'text-blue-600 hover:underline break-words';
    link.textContent = evidenciaUrl;
    td.appendChild(link);

    if (evidenciaTexto) {
      const note = document.createElement('div');
      note.className = 'text-xs text-gray-500 mt-1 break-words';
      note.textContent = evidenciaTexto;
      td.appendChild(note);
    }
    return td;
  }

  if (evidenciaTexto) {
    evidenciaTexto.split(/\r?\n+/).forEach(seg => {
      const span = document.createElement('div');
      span.textContent = seg.trim();
      td.appendChild(span);
    });
    return td;
  }

  td.textContent = 'Sin evidencias';
  td.classList.add('text-gray-400');
  return td;
}

function renderObligacionesTable(contrato, obligaciones) {
  const container = document.getElementById('obligacionesTable');
  if (!container) return;

  if (!obligaciones || obligaciones.length === 0) {
    setObligacionesMessage('No se registran obligaciones para este contrato.', 'check_circle');
    return;
  }

  const table = document.createElement('table');
  table.className = 'min-w-full text-sm';
  table.innerHTML = `
    <thead>
      <tr class="text-left text-xs uppercase tracking-wide text-gray-500">
        <th class="p-2">Obligación</th>
        <th class="p-2">Actividades realizadas</th>
        <th class="p-2">Evidencias</th>
      </tr>
    </thead>
  `;

  const tbody = document.createElement('tbody');
  obligaciones.forEach((obligacion) => {
    const tr = document.createElement('tr');
    tr.className = 'border-t';

    tr.appendChild(createMultilineCell(obligacion.Descripcion, { segmentClass: 'break-words', emptyLabel: 'Sin descripción' }));
    tr.appendChild(createMultilineCell(obligacion.Actividades_realizadas || obligacion.Actividades, { segmentClass: 'break-words', emptyLabel: 'Sin actividades reportadas', emptyClass: 'text-gray-400' }));
    tr.appendChild(createEvidenceCell(obligacion));

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);

  container.innerHTML = '';
  if (contrato && (contrato.Numero_contrato || contrato.persona)) {
    const context = document.createElement('div');
    context.className = 'text-xs text-gray-500 mb-2 flex items-center gap-2';
    const icon = document.createElement('span');
    icon.className = 'material-icons text-sm text-gray-400';
    icon.textContent = 'bookmark';
    context.appendChild(icon);

    if (contrato.persona) {
      const personaSpan = document.createElement('span');
      personaSpan.className = 'font-medium text-gray-600';
      personaSpan.textContent = contrato.persona;
      context.appendChild(personaSpan);
    }

    if (contrato.Numero_contrato) {
      const separator = document.createElement('span');
      separator.className = 'text-gray-400';
      separator.textContent = '·';
      context.appendChild(separator);

      const contratoSpan = document.createElement('span');
      contratoSpan.textContent = `Contrato ${contrato.Numero_contrato}`;
      context.appendChild(contratoSpan);
    }

    container.appendChild(context);
  }
  container.appendChild(table);
}

async function updateObligacionesView(contrato) {
  const container = document.getElementById('obligacionesTable');
  if (!container) return;

  if (!contrato || !contrato.contrato_id) {
    currentObligacionesContratoId = null;
    setObligacionesMessage('Selecciona un contrato para ver las obligaciones asociadas.', 'assignment');
    return;
  }

  const contratoId = contrato.contrato_id;
  currentObligacionesContratoId = contratoId;

  // Mostrar estado de carga mientras consultamos la API
  container.innerHTML = `
    <div class="flex flex-col items-center justify-center py-8 text-center text-sm text-gray-500">
      <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mb-3"></div>
      Consultando obligaciones del contrato...
    </div>
  `;

  try {
    let obligaciones = obligacionesCache.get(contratoId);
    if (!obligaciones) {
      const response = await fetchFromBackend('getObligacionesByContrato', { contrato_id: contratoId });
      obligaciones = response?.items || response?.data || [];
      obligacionesCache.set(contratoId, obligaciones);
    }

    if (currentObligacionesContratoId !== contratoId) return;
    renderObligacionesTable(contrato, obligaciones);
  } catch (error) {
    console.error('Error al cargar obligaciones del contrato:', error);
    if (currentObligacionesContratoId === contratoId) {
      setObligacionesMessage('No fue posible cargar las obligaciones. Intenta nuevamente más tarde.', 'error');
    }
  }
}

function attachEvents(){
  const filterEl = document.getElementById('filterSelect');
  if(filterEl){
    filterEl.addEventListener('change', (e)=>{
      const val = e.target.value;
      if(val==='all'){ 
        renderTable(contratosData); 
        renderSemaforo(contratosData); 
        updateChart(contratosData); 
      } else { 
        const sel = contratosData.find(f=>f.contrato_id===val); 
        renderTable([sel]); 
        renderSemaforo([sel]); 
        updateDetail(sel); 
        updateChart([sel]); 
      }
    });
  }

  const globalSearch = document.getElementById('globalSearch');
  if(globalSearch){
    globalSearch.addEventListener('input', (e)=>{
      const q = normalizeText(e.target.value || '');
      const filtered = contratosData.filter(f=> 
        normalizeText(f.persona).includes(q) || 
        normalizeText(f.contrato_id).includes(q) ||
        normalizeText(f.documento_identidad || '').includes(q)
      );
      renderTable(filtered); 
      renderSemaforo(filtered); 
      updateChart(filtered);
    });
  }

  document.addEventListener('click', async (e)=>{
    const target = e.target.closest('#btnRefresh, #btnShowAll') || e.target;
    
    if(target && target.classList.contains('select-detail')){
      const id = target.dataset.id; 
      const sel = contratosData.find(f=>f.contrato_id===id); 
      updateDetail(sel);
    }
    
    // Botón para mostrar todos los contratistas
    if(target && target.id === 'btnShowAll'){
      // Restablecer el selector
      const filterSelect = document.getElementById('filterSelect');
      if(filterSelect) {
        filterSelect.value = 'all';
      }
      
      // Mostrar todos los contratistas en la tabla
      renderTable(contratosData);
      
      // Quitar selección de tarjetas en el semáforo
      document.querySelectorAll('.semaforo-card').forEach(x => x.classList.remove('selected-semaforo'));
      document.querySelectorAll('tr.contract-row').forEach(r => r.classList.remove('selected-row'));
      
      // Actualizar gráfico
      updateChart(contratosData);
    }
    
    if(target && target.id === 'btnRefresh'){
      try {
        // Cambiar el botón a estado de carga
        const btnRefresh = document.getElementById('btnRefresh');
        const originalContent = btnRefresh.innerHTML;
        btnRefresh.innerHTML = `
          <span class="flex items-center">
            <span class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1"></span>
            Cargando...
          </span>
        `;
        btnRefresh.disabled = true;
        
        // Recargar datos reales
        const newData = await loadAllContratos();
        contratosData = newData;
  obligacionesCache.clear();
  updateObligacionesView(null);
  updateDetail(null);
        
        // Actualizar UI
        renderTable(contratosData);
        renderSemaforo(contratosData);
        updateChart(contratosData);
        
        // Restaurar el botón
        setTimeout(() => {
          btnRefresh.innerHTML = originalContent;
          btnRefresh.disabled = false;
          
          // Mostrar notificación de éxito
          const notification = document.createElement('div');
          notification.className = 'fixed top-4 right-4 bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded shadow-lg z-50';
          notification.innerHTML = `
            <div class="flex items-center">
              <span class="material-icons text-green-500 mr-2">check_circle</span>
              Datos actualizados correctamente
            </div>
          `;
          document.body.appendChild(notification);
          
          setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.5s';
            setTimeout(() => {
              document.body.removeChild(notification);
            }, 500);
          }, 3000);
        }, 500);
        
      } catch (error) {
        console.error('Error al refrescar los datos:', error);
        
        // Restaurar el botón y mostrar error
        const btnRefresh = document.getElementById('btnRefresh');
        btnRefresh.innerHTML = `
          <span class="flex items-center">
            <span class="material-icons text-sm mr-1">refresh</span>
            Recargar
          </span>
        `;
        btnRefresh.disabled = false;
        
        // Mostrar notificación de error
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded shadow-lg z-50';
        notification.innerHTML = `
          <div class="flex items-center">
            <span class="material-icons text-red-500 mr-2">error</span>
            Error al actualizar datos: ${error.message}
          </div>
        `;
        document.body.appendChild(notification);
        
        setTimeout(() => {
          notification.style.opacity = '0';
          notification.style.transition = 'opacity 0.5s';
          setTimeout(() => {
            document.body.removeChild(notification);
          }, 500);
        }, 5000);
      }
    }
  });
}

function updateDetail(item){
  updateObligacionesView(item);
  // Populate header name and field cards with provided item (or placeholders)
  const headerText = document.getElementById('fc-nombre-text');
  const headerIcon = document.getElementById('fc-nombre-icon');
  const headerContainer = document.getElementById('fc-nombre-header');
  
  if(headerText) headerText.textContent = item ? item.persona : 'Nombre Contratista';
  
  if(headerIcon) {
    const personaColor = '#0ea5a4';
    headerIcon.textContent = '';
    // ensure inner material icon (consistent with HTML structure)
    headerIcon.innerHTML = `<span class="material-icons">person</span>`;
    headerIcon.style.background = item ? personaColor : 'transparent';
    headerIcon.style.color = item ? '#ffffff' : '#6b7280';
  }
  
  // Aplicar un estilo más destacado al nombre del contratista
  if(headerContainer) {
    headerContainer.style.padding = '1rem';
  }

  // icon/color map for fields
  const fieldMeta = {
  'fc-plazo': { icon: 'timeline', color: '#8b5cf6' },
  'fc-numero': { icon: 'confirmation_number', color: '#7c3aed' },
  'fc-doc': { icon: 'badge', color: '#64748b' },
    'fc-rc-numero': { icon: 'article', color: '#f97316' },
    'fc-cdp-numero': { icon: 'badge', color: '#6366f1' },
    'fc-rc-fecha': { icon: 'event', color: '#f97316' },
    'fc-cdp-fecha': { icon: 'event', color: '#6366f1' },
    'fc-inicio': { icon: 'event', color: '#10b981' },
    'fc-fin': { icon: 'event_busy', color: '#ef4444' },
    'fc-valor-inicial': { icon: 'paid', color: '#f59e0b' },
    'fc-adiciones': { icon: 'add_circle', color: '#f59e0b' },
    'fc-valor-mensual': { icon: 'calendar_month', color: '#06b6d4' },
  'fc-fecha-corte': { icon: 'event_note', color: '#64748b' },
  'fc-ultimo-cobro': { icon: 'receipt', color: '#64748b' }
  };

  function setCard(id, label, value){
    const el = document.getElementById(id);
    if(!el) return;
    const meta = fieldMeta[id] || { icon: 'info', color: '#9ca3af' };
    // try to read section color from closest ancestor .section-card-group via computed style
    let sectionColor = null;
    try{
      const group = el.closest && el.closest('.section-card-group');
      if(group){
        const cs = getComputedStyle(group);
        const v = cs.getPropertyValue('--section-color');
        if(v) sectionColor = v.trim();
      }
    }catch(e){ /* ignore */ }
    const baseColor = sectionColor || meta.color || '#9ca3af';
    // derive a light background for the whole card from the base color (very light tint)
    const lightBg = baseColor ? `${tinyTint(hexToRgb(baseColor) || baseColor,0.9)}` : '#ffffff';
    const iconHtml = `<div class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style="background:${baseColor};color:#fff"><span class="material-icons text-lg">${meta.icon}</span></div>`;
    // apply bg to the entire element so the card isn't white anymore
    el.style.background = lightBg;
    el.style.borderColor = 'transparent';
    el.style.padding = '0.8rem 0.6rem';
    el.style.borderRadius = '0.75rem';
    el.style.display = 'flex';
    el.style.flexDirection = 'row';
    el.classList.add('detail-card');
    el.innerHTML = `
      <div class="flex items-center">
        ${iconHtml}
        <div class="ml-3 w-full">
          <div class="text-sm font-medium text-gray-700">${label}</div>
          <div class="mt-1 text-sm font-semibold text-gray-800">${value ?? '-'}</div>
        </div>
      </div>
    `;
  }

  // tiny helper to mix color with white (rudimentary)
  function tinyTint(hex, mix){
    // hex '#rrggbb', mix between 0..1 where 1 is almost white
    try{
      const h = hex.replace('#','');
      const r = parseInt(h.substring(0,2),16);
      const g = parseInt(h.substring(2,4),16);
      const b = parseInt(h.substring(4,6),16);
      const nr = Math.round(r + (255 - r) * mix);
      const ng = Math.round(g + (255 - g) * mix);
      const nb = Math.round(b + (255 - b) * mix);
      return `rgb(${nr}, ${ng}, ${nb})`;
    }catch(e){ return '#ffffff'; }
  }

  // helper: accept color in #rrggbb or rgb(...) and return #rrggbb; if rgb input, convert to hex
  function hexToRgb(input){
    if(!input) return null;
    input = input.trim();
    if(input.startsWith('rgb')){
      const m = input.match(/(\d+),\s*(\d+),\s*(\d+)/);
      if(m) return `#${Number(m[1]).toString(16).padStart(2,'0')}${Number(m[2]).toString(16).padStart(2,'0')}${Number(m[3]).toString(16).padStart(2,'0')}`;
    }
    return input;
  }

  // Fill specific fields (use the provided keys in the user's request)
  // Subtítulo 1: Aspectos generales
  setCard('fc-plazo', 'Plazo del contrato', item ? (item.Plazo || '-') : '-');
  setCard('fc-numero', 'Número contrato', item ? (item.Numero_contrato || '-') : '-');
  setCard('fc-doc', 'Documento de identidad', item ? formatDocumentNumber(item.documento_identidad || item.Cedula) : '-');

  // Subtítulo 2: Aspectos presupuestales
  setCard('fc-rc-numero', 'RC', item ? (item.Numero_RC || '-') : '-');
  setCard('fc-cdp-numero', 'CDP', item ? (item.Numero_CDP || '-') : '-');
  setCard('fc-rc-fecha', 'Fecha RC', item ? formatDate(item.Fecha_RC) : '-');
  setCard('fc-cdp-fecha', 'Fecha CDP', item ? formatDate(item.Fecha_CDP) : '-');

  // Subtítulo 3: Vigencia Contrato
  setCard('fc-inicio', 'Inicio Contrato', item ? formatDate(item.Inicio) : '-');
  setCard('fc-fin', 'Fin de contrato', item ? formatDate(item.Fin) : '-');

  // Subtítulo 4: Aspectos financieros
  setCard('fc-valor-inicial', 'Valor Inicial', item ? (item.Valor_total ? formatCurrency(item.Valor_total) : '-') : '-');
  setCard('fc-adiciones', 'Adiciones', item ? (item.Adiciones ? formatCurrency(item.Adiciones) : '-') : '-');
  setCard('fc-valor-mensual', 'Valor Mensual', item ? (item.Valor_mensual ? formatCurrency(item.Valor_mensual) : '-') : '-');

  // Subtítulo 5: Cuenta de cobro
  setCard('fc-fecha-corte', 'Fecha de corte', item ? formatDate(item.Fecha_corte) : '-');
  setCard('fc-ultimo-cobro', 'Último cobro', item ? formatDate(item.ultimo_cobro) : '-');

  // keep previous interaction behaviors: highlight semaforo/table selection
  document.querySelectorAll('.semaforo-card').forEach(c=> c.classList.remove('selected-semaforo'));

  // clicking a semaforo card should filter table and show detail (delegated handler exists earlier)
  // highlight row in table if exists
  if(item){
    document.querySelectorAll('tr.contract-row').forEach(r=> r.classList.remove('selected-row'));
    const row = document.querySelector(`tr.contract-row[data-id="${item.contrato_id}"]`);
    if(row) row.classList.add('selected-row');
  }
}

let paymentsChart = null;
function updateChart(list){
  // build aggregated compliance % for demo
  const labels = ['P-5','P-4','P-3','P-2','P-1','P-0'];
  const series = labels.map((_,i)=>{
    const vals = list.map(it=> it.cumplimiento ? it.cumplimiento[i] || 0 : 0);
    const avg = vals.length? Math.round((vals.reduce((a,b)=>a+b,0)/vals.length)*100) : 0;
    return avg;
  });
  const ctx = document.getElementById('paymentsChart').getContext('2d');
  if(paymentsChart) paymentsChart.destroy();
  paymentsChart = new Chart(ctx, { 
    type:'bar', 
    data:{ 
      labels, 
      datasets:[{ 
        label:'Cumplimiento %', 
        data: series, 
        backgroundColor:'#60a5fa' 
      }] 
    }, 
    options:{ 
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          displayColors: false
        }
      },
      scales:{ 
        y:{ 
          beginAtZero: true, 
          max: 100,
          ticks: {
            font: {
              size: 10
            }
          }
        },
        x: {
          ticks: {
            font: {
              size: 10
            }
          }
        }
      } 
    } 
  });
}

// Helper function for status pill in header
function updateStatusPill(daysToEnd, pillClass, dayLabel) {
  const statusPill = document.getElementById('semaforoStatusPill');
  if (!statusPill) return;
  
  statusPill.className = 'table-pill';
  if (pillClass) {
    statusPill.classList.add(pillClass);
    statusPill.textContent = dayLabel && dayLabel !== '-' 
      ? `${dayLabel}` 
      : 'Sin datos';
  } else {
    statusPill.classList.add('ok');
    statusPill.textContent = 'Sin vencimiento';
  }
}

// Función para cargar los datos de pagos por contrato (mantener por compatibilidad)
// Esta función ya no se usa directamente, ahora usamos getAllPagos para obtener todos en una sola petición
async function loadPagosByContrato(contratoId) {
  try {
    const response = await fetchFromBackend('getPagosByContrato', { contrato_id: contratoId });
    return response.items || [];
  } catch (error) {
    console.error('Error al cargar pagos del contrato:', error);
    return [];
  }
}

// Función para procesar la información de cumplimiento de pagos
async function processCumplimientoData(contratos) {
  try {
    // Primero procesamos fechas y plazo en todos los contratos
    for (const contrato of contratos) {
      // Convertir fechas de string a objeto Date
      if (contrato.Inicio && typeof contrato.Inicio === 'string') {
        try {
          contrato.Inicio = new Date(contrato.Inicio);
        } catch(e) {
          console.warn(`Error al convertir fecha de inicio para contrato ${contrato.contrato_id}:`, e);
        }
      }
      
      if (contrato.Fin && typeof contrato.Fin === 'string') {
        try {
          contrato.Fin = new Date(contrato.Fin);
        } catch(e) {
          console.warn(`Error al convertir fecha de fin para contrato ${contrato.contrato_id}:`, e);
        }
      }
      
      // Calcular el plazo en meses si no viene especificado
      if (!contrato.Plazo) {
        if (contrato.Inicio instanceof Date && contrato.Fin instanceof Date) {
          // Calcular diferencia en meses
          const start = new Date(contrato.Inicio);
          const end = new Date(contrato.Fin);
          const diffYears = end.getFullYear() - start.getFullYear();
          const diffMonths = end.getMonth() - start.getMonth();
          const months = diffYears * 12 + diffMonths;
          contrato.Plazo = `${months} meses`;
        }
      }
      
      // Inicializar los valores por defecto para cada contrato
      contrato.cumplimiento = [0, 0, 0, 0, 0, 0];
      contrato.ultimo_periodo = '-';
      contrato.ultimo_cobro = '-';
      contrato.Fecha_corte = '-';
    }
    
    // Obtener todos los pagos en una sola petición
    console.log('Obteniendo todos los pagos en una sola petición');
    const allPagos = await fetchFromBackend('getAllPagos', {});
    
    if (allPagos && allPagos.items && allPagos.items.length > 0) {
      // Crear un mapa de pagos por contrato_id para acceso más rápido
      const pagosPorContrato = {};
      
      allPagos.items.forEach(pago => {
        const contratoId = pago.contrato_id;
        if (!contratoId) return;
        
        if (!pagosPorContrato[contratoId]) {
          pagosPorContrato[contratoId] = [];
        }
        pagosPorContrato[contratoId].push(pago);
      });
      
      // Ahora asignamos los pagos a cada contrato
      for (const contrato of contratos) {
        const contratoId = contrato.contrato_id;
        const pagos = pagosPorContrato[contratoId] || [];
        
        if (pagos.length > 0) {
          // Ordenamos los pagos por período (más reciente primero)
          const pagosSorted = pagos.sort((a, b) => {
            const periodoA = a.periodo || '';
            const periodoB = b.periodo || '';
            return periodoB.localeCompare(periodoA);
          });
          
          // Tomamos hasta los 6 pagos más recientes y los marcamos como cumplidos
          pagosSorted.slice(0, 6).forEach((pago, index) => {
            // Índice invertido para que el pago más reciente esté al final del array
            const reversedIndex = 5 - index;
            if (reversedIndex >= 0 && reversedIndex < 6) {
              contrato.cumplimiento[reversedIndex] = 1;
            }
          });
          
          // Establecer último período y último cobro
          if (pagosSorted.length > 0) {
            contrato.ultimo_periodo = pagosSorted[0].periodo || '-';
            contrato.ultimo_cobro = pagosSorted[0].fecha_pago || '-';
            contrato.Fecha_corte = pagosSorted[0].fecha_corte || '-';
          }
        }
      }
    } else {
      console.log('No se encontraron pagos o el endpoint getAllPagos no funcionó');
    }
  } catch (error) {
    console.error('Error al procesar los datos de cumplimiento:', error);
  }
  
  return contratos;
}

// Función para cargar todos los contratos
async function loadAllContratos() {
  try {
    const loadingMessage = document.createElement('div');
    loadingMessage.className = 'fixed top-0 left-0 w-full bg-blue-600 text-white text-center py-2 z-50';
    loadingMessage.textContent = 'Cargando datos de contratos...';
    document.body.appendChild(loadingMessage);
    
    // Intentamos varios endpoints para obtener contratos (por si alguno no está disponible)
    let response = null;
    let error = null;
    
    // Primera opción: getAllContratos
    try {
      response = await fetchFromBackend('getAllContratos', { includePersonas: true });
      console.log('Endpoint getAllContratos respondió correctamente');
    } catch (e) {
      console.log('Endpoint getAllContratos falló, intentando con listContratos', e);
      error = e;
      
      // Segunda opción: listContratos
      try {
        response = await fetchFromBackend('listContratos', { includePersonas: true });
        console.log('Endpoint listContratos respondió correctamente');
        error = null; // Limpiamos el error si tuvimos éxito
      } catch (e2) {
        console.log('También falló listContratos', e2);
        error = e2;
        
        // Tercera opción: getContratosByPersona sin parámetros (hack)
        try {
          response = await fetchFromBackend('getContratosByPersona', {});
          console.log('Endpoint getContratosByPersona respondió');
          error = null;
        } catch (e3) {
          console.log('Todos los endpoints fallaron', e3);
          error = e3;
        }
      }
    }
    
    if (!response || error) {
      throw error || new Error('No se pudo obtener datos de contratos');
    }
    
    // Procesamos la información de cumplimiento de pagos
    let contratos = await processCumplimientoData(response.items || []);
    
    // Eliminamos el mensaje de carga
    document.body.removeChild(loadingMessage);
    
    return contratos;
  } catch (error) {
    console.error('Error al cargar los contratos:', error);
    
    const errorMessage = document.createElement('div');
    errorMessage.className = 'fixed top-0 left-0 w-full bg-red-600 text-white text-center py-2 z-50';
    errorMessage.textContent = `Error al cargar datos: ${error.message}. Usando datos de ejemplo para demostración.`;
    document.body.appendChild(errorMessage);
    
    setTimeout(() => {
      try { document.body.removeChild(errorMessage); } catch(e) {}
    }, 5000);
    
    // En caso de error, devolvemos un array vacío
    return [];
  }
}

// Init
document.addEventListener('DOMContentLoaded', async () => {
  // Inicializa con pantalla de carga
  const semaforoList = document.getElementById('semaforoList');
  const contractorsTable = document.getElementById('contractorsTable');
  
  if (semaforoList) {
    semaforoList.innerHTML = `
      <div class="flex flex-col items-center justify-center text-center p-8 h-60">
        <div class="w-16 h-16 mb-4 rounded-full bg-blue-50 flex items-center justify-center pulse-animation">
          <span class="material-icons text-blue-400 text-2xl">hourglass_top</span>
        </div>
        <h4 class="font-medium text-gray-700 mb-1">Cargando datos...</h4>
        <p class="text-sm text-gray-500">Conectando con el servidor</p>
      </div>
    `;
  }
  
  if (contractorsTable) {
    contractorsTable.innerHTML = `
      <div class="flex items-center justify-center p-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span class="ml-3 text-gray-600">Cargando datos...</span>
      </div>
    `;
  }
  
  try {
    // Cargar datos reales
    contratosData = await loadAllContratos();
  obligacionesCache.clear();
  updateObligacionesView(null);
    
    // Si no hay datos, mostrar mensaje y detener la ejecución
    if (!contratosData || contratosData.length === 0) {
      if (semaforoList) {
        semaforoList.innerHTML = `
          <div class="flex flex-col items-center justify-center text-center p-8 h-60 text-gray-500">
            <div class="w-16 h-16 mb-4 rounded-full bg-red-50 flex items-center justify-center">
              <span class="material-icons text-red-400 text-2xl">error_outline</span>
            </div>
            <h4 class="font-medium text-gray-700 mb-1">No se encontraron datos</h4>
            <p class="text-sm text-gray-500">No hay contratos disponibles en este momento</p>
            <button id="btnRetry" class="mt-4 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors">
              Reintentar
            </button>
          </div>
        `;
        
        document.getElementById('btnRetry').addEventListener('click', () => {
          window.location.reload();
        });
      }
      
      if (contractorsTable) {
        contractorsTable.innerHTML = `
          <div class="flex flex-col items-center justify-center p-8 text-center">
            <span class="material-icons text-red-400 text-2xl mb-2">search_off</span>
            <p class="text-gray-600">No se encontraron contratos en el sistema.</p>
          </div>
        `;
      }
      
      return; // Detenemos la ejecución
    }
    
    // Inicializar la interfaz con datos reales
    populateFilter(contratosData);
    renderTable(contratosData);
    renderSemaforo(contratosData);
    attachEvents();
    updateChart(contratosData);
    updateDetail(null);

    // Aplicar filtro desde localStorage si viene del dashboard u otra página
    try {
      const raw = localStorage.getItem('contratistas_filtro');
      if (raw) {
        const filtro = JSON.parse(raw);
        if (filtro && filtro.tipo === 'persona' && filtro.valor) {
          // Intentar seleccionar por contrato asociado a persona
          // Buscar contratos que pertenezcan a la persona (campo persona_id o persona)
          const matches = contratosData.filter(c => c.persona_id === filtro.valor || c.persona === filtro.nombre || (c.persona && c.persona.includes && c.persona.includes(filtro.valor)));
          if (matches && matches.length > 0) {
            renderTable(matches);
            renderSemaforo(matches);
            updateChart(matches);
            // set filter select to first match contrato_id if exists
            const filterSelect = document.getElementById('filterSelect');
            if (filterSelect && matches[0].contrato_id) filterSelect.value = matches[0].contrato_id;
          }
        } else if (filtro && filtro.tipo === 'contrato' && filtro.valor) {
          const sel = contratosData.find(f=> f.contrato_id === filtro.valor);
          if (sel) {
            renderTable([sel]);
            renderSemaforo([sel]);
            updateChart([sel]);
            updateDetail(sel);
            const filterSelect = document.getElementById('filterSelect');
            if (filterSelect) filterSelect.value = sel.contrato_id;
          }
        }

        localStorage.removeItem('contratistas_filtro');
      }
    } catch (e) {
      console.warn('Error aplicando contratistas_filtro desde localStorage:', e);
    }
    
    // Inicializar con el primer contrato si está disponible
    if (contratosData && contratosData.length > 0) {
      const firstItem = contratosData[0];
      const daysToEnd = Math.ceil((new Date(firstItem.Fin) - new Date())/ (1000*60*60*24));
      let statusPillClass = '';
      if(isNaN(daysToEnd)) statusPillClass = '';
      else if(daysToEnd < 0 || daysToEnd <= 30) statusPillClass = 'overdue';
      else if(daysToEnd <= 90) statusPillClass = 'soon';
      else statusPillClass = 'ok';
      
      updateStatusPill(daysToEnd, statusPillClass, daysToEnd < 0 ? `${Math.abs(daysToEnd)}d vencido` : `${daysToEnd}d`);
    }
    
  } catch (error) {
    console.error('Error durante la inicialización:', error);
    
    if (semaforoList) {
      semaforoList.innerHTML = `
        <div class="flex flex-col items-center justify-center text-center p-8 h-60 text-gray-500">
          <div class="w-16 h-16 mb-4 rounded-full bg-red-50 flex items-center justify-center">
            <span class="material-icons text-red-400 text-2xl">error_outline</span>
          </div>
          <h4 class="font-medium text-gray-700 mb-1">Error de conexión</h4>
          <p class="text-sm text-gray-500">${error.message}</p>
          <button id="btnRetry" class="mt-4 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors">
            Reintentar
          </button>
        </div>
      `;
      
      document.getElementById('btnRetry').addEventListener('click', () => {
        window.location.reload();
      });
    }
  }
  
  // Asegurarse de que el sidebar se inicialice
  try { 
    const el = document.querySelector('aside.sidebar'); 
    if(el) initSidebar(el); 
  } catch(e) { /* fail silently */ }
});

// Función para refrescar los datos
export async function refreshContratos() {
  try {
    const newData = await loadAllContratos();
    contratosData = newData;
    obligacionesCache.clear();
    updateObligacionesView(null);
    updateDetail(null);
    renderTable(contratosData);
    renderSemaforo(contratosData);
    updateChart(contratosData);
    return true;
  } catch (error) {
    console.error('Error al refrescar datos:', error);
    return false;
  }
}
