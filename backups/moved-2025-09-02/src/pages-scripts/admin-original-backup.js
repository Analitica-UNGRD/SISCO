import { APP_CONFIG } from '../lib/config.js';
import { initSidebar } from './sidebar.js';
import { toast, openModal, closeModal } from '../lib/ui.js';

// Keep apiFetch signature compatible
function apiFetch(path, payload){
  if(!APP_CONFIG || !APP_CONFIG.BASE_URL) {
    console.warn('APP_CONFIG.BASE_URL not set; running in mock mode for', path);
    return Promise.resolve({ ok: true, mock: true });
  }
  // Debug: log outgoing request (avoid logging sensitive payloads in production)
  try{ console.debug('apiFetch ->', path, payload ? Object.assign({}, payload) : null); }catch(e){}
  // store for diagnostics
  try{ addApiLogEntry({ stage: 'request', path, payload }); }catch(e){}
  return fetch(APP_CONFIG.BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ path, payload })
  }).then(async r=>{
    let json = null;
    try{ json = await r.json(); }catch(e){ json = null; }
  console.debug('apiFetch <-', path, json);
  try{ addApiLogEntry({ stage: 'response', path, payload, response: json }); }catch(e){}
  renderApiLogsPanel();
  return json;
  }).catch(e=>{ console.error('apiFetch error', path, e); throw e; });
}

// --- context management ---
const CTX_KEY = 'admin_ctx_v1';
const ctx = { persona: null, contrato: null };

// Simple in-memory api call log for on-page diagnostics
const __apiLogs = [];
function addApiLogEntry(entry){
  try{
    const ts = (new Date()).toISOString();
    __apiLogs.unshift(Object.assign({ ts }, entry));
    // limit to last 20
    if(__apiLogs.length > 20) __apiLogs.length = 20;
  }catch(e){}
}

// Render a small diagnostics panel in the page showing last API calls
function renderApiLogsPanel(){
  try{
    const panel = document.getElementById('apiLogsPanel');
    if(!panel) return;
    panel.innerHTML = '';
    
    const header = document.createElement('div'); 
    header.className = 'p-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-t-xl flex items-center justify-between'; 
    header.innerHTML = `
      <span><span class="material-icons text-sm align-middle mr-2">bug_report</span>API Diagnostics</span>
      <span class="text-xs opacity-75">${__apiLogs.length} logs</span>
    `;
    panel.appendChild(header);
    
    const list = document.createElement('div'); 
    list.className = 'p-3 max-h-64 overflow-auto text-xs bg-gray-50';
    
    if(__apiLogs.length === 0) {
      list.innerHTML = '<div class="text-gray-500 text-center py-4">No hay logs disponibles</div>';
    } else {
      __apiLogs.slice(0,15).forEach((it, idx)=>{
        const row = document.createElement('div'); 
        row.className = 'mb-2 p-2 rounded bg-white border border-gray-200 hover:border-blue-300 transition-colors';
        
        const meta = document.createElement('div'); 
        meta.className = 'text-xs text-gray-600 mb-1 flex items-center justify-between'; 
        meta.innerHTML = `
          <span class="font-medium">${it.path || 'unknown'}</span>
          <span class="text-gray-400">${it.ts ? new Date(it.ts).toLocaleTimeString() : ''}</span>
        `;
        
        const content = document.createElement('div');
        content.className = 'text-xs text-gray-800 font-mono bg-gray-100 p-2 rounded max-h-20 overflow-auto';
        content.textContent = JSON.stringify(it.payload || it, null, 1);
        
        const copyBtn = document.createElement('button'); 
        copyBtn.className = 'mt-2 text-xs px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors'; 
        copyBtn.textContent = 'Copiar'; 
        copyBtn.addEventListener('click', ()=>{ 
          navigator.clipboard && navigator.clipboard.writeText(JSON.stringify(it, null, 2));
          copyBtn.textContent = '✓ Copiado';
          setTimeout(() => copyBtn.textContent = 'Copiar', 1000);
        });
        
        row.appendChild(meta); 
        row.appendChild(content); 
        row.appendChild(copyBtn);
        list.appendChild(row);
      });
    }
    
    panel.appendChild(list);
    
    const footer = document.createElement('div'); 
    footer.className = 'p-3 border-t bg-white rounded-b-xl flex gap-2';
    
    const forceBtn = document.createElement('button'); 
    forceBtn.className = 'flex-1 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded text-xs transition-colors'; 
    forceBtn.textContent = 'Test API';
    forceBtn.addEventListener('click', async ()=>{
      if(!ctx.persona){ 
        forceBtn.textContent = 'Sin persona';
        setTimeout(() => forceBtn.textContent = 'Test API', 1500);
        return; 
      }
      const pid = ctx.persona.persona_id || ctx.persona.id;
      addApiLogEntry({ stage: 'manual-fetch', path: 'getContratosByPersona', payload: { persona_id: pid } }); 
      renderApiLogsPanel();
      forceBtn.textContent = 'Ejecutando...';
      try{ 
        const res = await apiFetch('getContratosByPersona', { persona_id: pid }); 
        console.log('manual fetch contratos', res); 
        forceBtn.textContent = '✓ Completado';
        setTimeout(() => forceBtn.textContent = 'Test API', 2000);
      }catch(e){ 
        forceBtn.textContent = '✗ Error';
        setTimeout(() => forceBtn.textContent = 'Test API', 2000);
      }
    });
    
    const clearBtn = document.createElement('button'); 
    clearBtn.className = 'px-3 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded text-xs transition-colors'; 
    clearBtn.textContent = 'Limpiar';
    clearBtn.addEventListener('click', ()=>{
      __apiLogs.length = 0;
      renderApiLogsPanel();
    });
    
    footer.appendChild(forceBtn);
    footer.appendChild(clearBtn);
    panel.appendChild(footer);
  }catch(e){ console.warn('renderApiLogsPanel error', e); }
}

// Normalize API response shapes to an array of items when possible
function normalizeApiList(res){
  if(!res) return [];
  if(Array.isArray(res)) return res;
  if(res && Array.isArray(res.items)) return res.items;
  if(res && Array.isArray(res.data)) return res.data;
  if(res && Array.isArray(res.result)) return res.result;
  // common nested payloads
  if(res && res.payload && Array.isArray(res.payload.items)) return res.payload.items;
  if(res && res.payload && Array.isArray(res.payload.data)) return res.payload.data;
  return [];
}

function saveCtx(){ localStorage.setItem(CTX_KEY, JSON.stringify(ctx)); }
function loadCtx(){
  try{ const s = localStorage.getItem(CTX_KEY); if(s) Object.assign(ctx, JSON.parse(s)); }catch(e){}
}

function updateContextUI(){
  const p = ctx.persona;
  const c = ctx.contrato;
  const elNombre = document.getElementById('ctxPersonaNombre');
  const elIdent = document.getElementById('ctxPersonaIdent');
  const elPid = document.getElementById('ctxPersonaId');
  const elCnum = document.getElementById('ctxContratoNum');
  const elCid = document.getElementById('ctxContratoId');
  
  if(elNombre) elNombre.textContent = p ? (p.Nombre || p.name || '-') : '-';
  if(elIdent) elIdent.textContent = p ? formatIdWithDots(p.Identificacion || p.identificacion || '') : '';
  if(elPid) elPid.textContent = p ? (p.persona_id || p.id || '-') : '-';
  if(elCnum) elCnum.textContent = c ? (c.Numero_contrato || c.numero || '-') : '-';
  if(elCid) elCid.textContent = c ? (c.contrato_id || c.id || '-') : '-';
  // form-contractor-id element was removed from the UI; keep guard for backwards compatibility
  const elFormId = document.getElementById('form-contractor-id');
  if(elFormId){
    elFormId.textContent = p ? (p.persona_id || p.id || '--') : '--';
    // hide it if present (UI expects it removed)
    elFormId.parentElement && (elFormId.parentElement.style.display = 'none');
  }

  // Fill readonly FK inputs
  const personaIdInputs = document.querySelectorAll('input[name="persona_id"]');
  personaIdInputs.forEach(i=>{
    if(ctx.persona){ i.value = ctx.persona.persona_id || ctx.persona.id || ''; i.readOnly = true; i.classList.add('bg-gray-50'); }
    else { i.value = ''; i.readOnly = false; i.classList.remove('bg-gray-50'); }
  });

  // Populate persona form fields when persona is in context; clear them when no persona
  const personaFields = [
    { id: 'p_Nombre', key: 'Nombre' },
    { id: 'p_Identificacion', key: 'Identificacion' },
    { id: 'p_Correo', key: 'Correo' },
    { id: 'p_Tipo_identificacion', key: 'Tipo_identificacion' },
    { id: 'p_persona_id', key: 'persona_id' }
  ];

  personaFields.forEach(f => {
    const el = document.getElementById(f.id);
    if(!el) return;
    if(ctx.persona){
      el.value = ctx.persona[f.key] || ctx.persona[f.key.toLowerCase()] || '';
    } else {
      el.value = '';
    }

    // attach a sync listener once: only sync back to ctx.persona if a persona is selected
    if(!el.dataset.personSync){
      el.addEventListener('input', ()=>{
        if(!ctx.persona) return; // only sync when a persona is currently selected
        const v = el.value;
        ctx.persona = ctx.persona || {};
        ctx.persona[f.key] = v;
        saveCtx();
        updatePreview();
      });
      el.dataset.personSync = '1';
    }
  });
  const contratoIdInputs = document.querySelectorAll('input[name="contrato_id"]');
  contratoIdInputs.forEach(i=>{
    if(ctx.contrato){ i.value = ctx.contrato.contrato_id || ctx.contrato.id || ''; i.readOnly = true; i.classList.add('bg-gray-50'); }
    else { i.value = ''; i.readOnly = false; i.classList.remove('bg-gray-50'); }
  });
  
  // Update preview panel
  updatePreview();
  // Also populate persona/contract related forms (helpers)
  try{ if(typeof populatePersonaForm === 'function') populatePersonaForm(ctx.persona); }catch(e){}
  try{ if(typeof populatePagoForm === 'function') populatePagoForm(ctx.contrato); }catch(e){}
  try{ if(typeof populateObligacionForm === 'function') populateObligacionForm(ctx.contrato); }catch(e){}
  try{ if(typeof populatePrecontractualForm === 'function') populatePrecontractualForm(ctx.persona); }catch(e){}
  try{ if(typeof populateRolForm === 'function') populateRolForm(ctx.persona); }catch(e){}
}

// Update preview panel with context data
function updatePreview() {
  const p = ctx.persona;
  const c = ctx.contrato;
  
  // Persona data
  if (p) {
    document.getElementById('preview-nombre').textContent = p.Nombre || p.name || 'Sin nombre';
    // Mostrar visualmente la identificación con puntos (ej: 1.070.983.009) sin modificar el valor real en ctx
    document.getElementById('preview-identificacion').textContent = formatIdWithDots(p.Identificacion || p.identificacion || '-');
    document.getElementById('preview-correo').textContent = p.Correo || '-';
    document.getElementById('preview-grupo-oapi').textContent = p.Grupo_OAPI || '-';
    document.getElementById('preview-perfil').textContent = p.Perfil || '-';
    
    // Actualizar estado con animación visual
    updateStatusBadge(p.Estado || 'Activo');
  } else {
    document.getElementById('preview-nombre').textContent = 'Nombre del contratista';
  document.getElementById('preview-identificacion').textContent = '-';
    document.getElementById('preview-correo').textContent = '-';
    document.getElementById('preview-grupo-oapi').textContent = '-';
    document.getElementById('preview-perfil').textContent = '-';
    
    updateStatusBadge('Activo');
  }
  
  // Contrato data
  if (c) {
  // Si alguna propiedad de ctx.contrato falta, intentar completarla desde los campos del formulario
  const cNum = c.Numero_contrato || document.getElementById('c_Numero_contrato')?.value || c.numero || '-';
  const cTipo = c.Tipo_vinculacion || document.getElementById('c_Tipo_vinculacion')?.value || '-';
  const cInicioRaw = c.Inicio || document.getElementById('c_Inicio')?.value || c.numero || '';
  const cFinRaw = c.Fin || document.getElementById('c_Fin')?.value || '';
  const cInicio = cInicioRaw ? formatDisplayDate(cInicioRaw) : '';
  const cFin = cFinRaw ? formatDisplayDate(cFinRaw) : '';
  const valorMensual = (c.Valor_mensual !== undefined && c.Valor_mensual !== null) ? c.Valor_mensual : (document.getElementById('c_Valor_mensual')?.value || 0);
  const valorTotal = (c.Valor_total !== undefined && c.Valor_total !== null) ? c.Valor_total : (document.getElementById('c_Valor_total')?.value || 0);

  // compute approximate months between dates for a friendly 'plazo'
  let months = null;
  try{ if(cInicioRaw && cFinRaw){ months = approxMonthsBetween(cInicioRaw, cFinRaw); } }catch(e){}

  document.getElementById('preview-contrato').textContent = cNum || '-';
  document.getElementById('preview-tipo-vinculacion').textContent = cTipo || '-';
  document.getElementById('preview-periodo').textContent = (cInicio ? cInicio : '') + (cInicio && cFin ? ' a ' : '') + (cFin ? cFin : '');
  if(months) document.getElementById('preview-periodo').textContent += ` (${months} meses)`;
  document.getElementById('preview-valor-mensual').textContent = valorMensual ? formatCurrency(Number(valorMensual)) : '-';
  document.getElementById('preview-valor-total').textContent = valorTotal ? formatCurrency(Number(valorTotal)) : '-';
    
    // Cargar obligaciones y pagos si hay un contrato seleccionado
    loadObligationsForPreview(c.contrato_id || c.id);
    loadPaymentsForPreview(c.contrato_id || c.id);
  } else {
  // Si no hay contrato en contexto, intentar leer los valores actuales del formulario de contrato para mostrar en preview
  const cNum = document.getElementById('c_Numero_contrato')?.value || '-';
  const cTipo = document.getElementById('c_Tipo_vinculacion')?.value || '-';
  const cInicioRaw = document.getElementById('c_Inicio')?.value || '';
  const cFinRaw = document.getElementById('c_Fin')?.value || '';
  const cInicio = cInicioRaw ? formatDisplayDate(cInicioRaw) : '';
  const cFin = cFinRaw ? formatDisplayDate(cFinRaw) : '';
  const cValorMens = document.getElementById('c_Valor_mensual')?.value || '';
  const cValorTotal = document.getElementById('c_Valor_total')?.value || '';
  let months = null; try{ if(cInicioRaw && cFinRaw) months = approxMonthsBetween(cInicioRaw, cFinRaw); }catch(e){}

  document.getElementById('preview-contrato').textContent = cNum || '-';
  document.getElementById('preview-tipo-vinculacion').textContent = cTipo || '-';
  document.getElementById('preview-periodo').textContent = (cInicio ? cInicio : '') + (cInicio && cFin ? ' a ' : '') + (cFin ? cFin : '-');
  if(months) document.getElementById('preview-periodo').textContent += ` (${months} meses)`;
  document.getElementById('preview-valor-mensual').textContent = cValorMens ? formatCurrency(Number(cValorMens)) : '-';
  document.getElementById('preview-valor-total').textContent = cValorTotal ? formatCurrency(Number(cValorTotal)) : '-';

  // También cargar obligaciones y pagos usando valores del formulario (si aplica)
  loadObligationsForPreview(document.getElementById('c_contrato_id')?.value || null);
  loadPaymentsForPreview(document.getElementById('c_contrato_id')?.value || null);
    
    // Limpiar secciones de obligaciones y pagos
    const obligacionesEl = document.getElementById('preview-obligaciones-list');
    const pagosEl = document.getElementById('preview-pagos-list');
    
    if (obligacionesEl) {
      obligacionesEl.innerHTML = '<div class="preview-small-card">No hay obligaciones registradas</div>';
    }
    
    if (pagosEl) {
      pagosEl.innerHTML = '<div class="preview-small-card">No hay pagos registrados</div>';
    }
  }
}

// Formatea una cédula/número con puntos cada tres cifras desde la derecha; excluye caracteres no numéricos.
function formatIdWithDots(value){
  if(!value) return '-';
  const s = String(value || '').replace(/\D+/g,''); // mantener solo dígitos
  if(!s) return '-';
  // Insertar puntos cada tres dígitos desde la derecha
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
// Formatea una cédula/número con puntos cada tres cifras desde la derecha; excluye caracteres no numéricos.

// Convert any date-like string to an input-friendly YYYY-MM-DD (strip time and Z)
function toIsoDateValue(d){
  try{
    if(!d) return '';
    // if already YYYY-MM-DD
    if(/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
    const dt = new Date(d);
    if(isNaN(dt.getTime())) return '';
    const y = dt.getFullYear(); const m = String(dt.getMonth()+1).padStart(2,'0'); const day = String(dt.getDate()).padStart(2,'0');
    return `${y}-${m}-${day}`;
  }catch(e){ return ''; }
}

// Format date for display like '27 sep 2024' (Spanish short month)
function formatDisplayDate(d){
  try{
    if(!d) return '';
    // accept already ISO date or full datetime
    const dt = new Date(d);
    if(isNaN(dt.getTime())) return d;
    const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
    const day = String(dt.getDate()).padStart(2,'0');
    const mon = months[dt.getMonth()] || '';
    const year = dt.getFullYear();
    return `${day} ${mon} ${year}`;
  }catch(e){ return d; }
}

// Asegurar que los inputs type=date actualicen la vista previa cuando cambian (no modifican el valor enviado)
document.addEventListener('DOMContentLoaded', async ()=>{
  const dateInputs = document.querySelectorAll('input[type="date"]');
  dateInputs.forEach(i=>{
    i.addEventListener('change', ()=>{
      // Si el campo pertenece a contrato/pagos, refrescar periodo/pagos en preview
      updatePreview();
    });
  });
});

// Helper function to format currency
function formatCurrency(value) {
  if (!value) return '$0';
  return new Intl.NumberFormat('es-CO', { 
    style: 'currency', 
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(value);
}

// Actualiza la apariencia del estado según el valor
function updateStatusBadge(status) {
  const badgeElement = document.getElementById('preview-estado-badge');
  const statusText = document.getElementById('preview-estado');
  
  if (!badgeElement || !statusText) return;
  
  // Remover clases existentes
  badgeElement.classList.remove('active', 'inactive', 'pending');
  
  // Establecer nueva clase y texto
  statusText.textContent = status || 'Desconocido';
  
  if (status === 'Activo') {
    badgeElement.classList.add('active');
    badgeElement.querySelector('.material-icons').textContent = 'check_circle';
  } else if (status === 'Inactivo') {
    badgeElement.classList.add('inactive');
    badgeElement.querySelector('.material-icons').textContent = 'cancel';
  } else if (status === 'Suspendido' || status === 'Pendiente') {
    badgeElement.classList.add('pending');
    badgeElement.querySelector('.material-icons').textContent = 'pending';
  }
}

// Precargar lista de personas al inicio para evitar recargas al seleccionar
async function loadPersonasOnStart(){
  try{
    // Intentar usar API si está disponible
    let res = null;
    try{ res = await apiFetch('listPersonas', {}); }catch(e){ res = null; }
    let list = [];
    if(Array.isArray(res)) list = res;
    else if(res && Array.isArray(res.data)) list = res.data;
    else if(res && Array.isArray(res.result)) list = res.result;

    // Fallback: obtener algunas personas via lookupPersonas si no hay endpoint
    if(list.length === 0){
      try{ const lookup = await window.lookupPersonas('', 200); list = Array.isArray(lookup) ? lookup : (lookup && lookup.data) ? lookup.data : []; }catch(e){ /* ignore */ }
    }

  const container = document.getElementById('ctxPersonaList');
    if(!container) return;
    container.innerHTML = '';
  console.debug('loadPersonasOnStart loaded', list.length, 'personas');
    list.forEach(p=>{
      const row = document.createElement('div');
      row.className = 'p-2 border-b persona-item cursor-pointer';
      row.dataset.id = p.persona_id || p.id || '';
      row.innerHTML = `<div class="font-medium">${escapeHtml(p.Nombre || p.name || '-')}</div><div class="text-xs text-gray-500">${escapeHtml(p.Identificacion || p.identificacion || '')}</div>`;
      row.addEventListener('click', async ()=>{
        // mark active
        const prev = container.querySelector('.persona-item.active'); if(prev) prev.classList.remove('active');
        row.classList.add('active');
        // set context and load contratos as in renderLookupResults
        ctx.persona = Object.assign({}, p);
        ctx.contrato = null;
        saveCtx(); updateContextUI(); toast('success', 'Persona seleccionada');
        try{
          const personaId = ctx.persona.persona_id || ctx.persona.id;
          if(personaId){
            const contratosRes = await apiFetch('getContratosByPersona', { persona_id: personaId });
            console.debug('getContratosByPersona response for ctx list select', personaId, contratosRes);
            const lista = normalizeApiList(contratosRes);
            if(lista.length>0){
              ctx.contrato = { contrato_id: lista[0].contrato_id || lista[0].id, Numero_contrato: lista[0].Numero_contrato || lista[0].numero || '' };
              saveCtx(); updateContextUI(); updatePreview();
            }
          }
        }catch(e){ console.warn('No se pudieron cargar contratos', e); }
      });
      container.appendChild(row);
    });
  }catch(e){ console.warn('Error cargando personas iniciales', e); }
}

// Load obligations for the preview panel
async function loadObligationsForPreview(contratoId) {
  // permitimos generar la vista previa a partir de los campos del formulario aunque no haya contrato_id
  
  try {
    console.debug('loadObligationsForPreview called for contratoId', contratoId);
    // Try real API first
    let obligaciones = null;
    try{ obligaciones = await apiFetch('getObligacionesByContrato', { contrato_id: contratoId }); }catch(e){ obligaciones = null; }
    let lista = normalizeApiList(obligaciones);
    // If API returned items, render them; otherwise fall back to form-based data
    let obligacionesEl = document.getElementById('preview-obligaciones-list');
    if(!obligacionesEl) return;
    if(lista && lista.length){
      let html = '<div class="preview-card-grid">';
      lista.forEach(item => {
        const desc = item.Descripcion || item.descripcion || item.Descrip || item.descripcion_obligacion || item.descripcion || 'Sin descripción';
        const estado = item.Estado || item.estado || 'Pendiente';
        html += `<div class="preview-small-card"><div class="font-medium mb-2">${escapeHtml(desc)}</div><div class="flex justify-between items-center"><div class="text-xs text-neutral-500">ID: OBL-${escapeHtml(item.obligacion_id || item.id || Math.floor(Math.random()*1000))}</div><span class="status-badge ${estado === 'Cumplida' ? 'active' : 'pending'}"><span class="material-icons">${estado === 'Cumplida' ? 'check_circle' : 'pending'}</span><span>${escapeHtml(estado)}</span></span></div></div>`;
      });
      html += '</div>';
      obligacionesEl.innerHTML = html; 
      return;
    }

    // Fallback: use form fields as before but do NOT inject example obligations.
    const description = document.getElementById('o_Descripcion')?.value;
    const estado = document.getElementById('o_Estado')?.value || 'Pendiente';
    const obligInputId = document.getElementById('o_obligacion_id')?.value || '';

    obligacionesEl = document.getElementById('preview-obligaciones-list');
    if (!obligacionesEl) return;

    let html = '<div class="preview-card-grid">';

    if (description) {
      html += `<div class="preview-small-card">
        <div class="font-medium mb-2">${escapeHtml(description)}</div>
        <div class="flex justify-between items-center">
          <div class="text-xs text-neutral-500">ID: OBL-${escapeHtml(obligInputId || '')}</div>
          <span class="status-badge ${estado === 'Cumplida' ? 'active' : 'pending'}">
            <span class="material-icons">${estado === 'Cumplida' ? 'check_circle' : 'pending'}</span>
            <span>${escapeHtml(estado || 'Pendiente')}</span>
          </span>
        </div>
      </div>`;
    } else {
      html = '<div class="preview-small-card">No hay obligaciones registradas</div>';
    }

    html += '</div>'; // Cerrar preview-card-grid

    obligacionesEl.innerHTML = html;
  } catch (error) {
    console.error('Error loading obligations for preview:', error);
  }
}

// Load payments for the preview panel
async function loadPaymentsForPreview(contratoId) {
  // permitimos generar la vista previa a partir de los campos del formulario aunque no haya contrato_id
  
  try {
    console.debug('loadPaymentsForPreview called for contratoId', contratoId);
    // Try real API first
    let pagos = null;
    try{ pagos = await apiFetch('getPagosByContrato', { contrato_id: contratoId }); }catch(e){ pagos = null; }
  let lista = normalizeApiList(pagos);
  let pagosEl = document.getElementById('preview-pagos-list');
  if(!pagosEl) return;
  if(lista && lista.length){
      let html = '<div class="preview-card-grid">';
      lista.forEach(item=>{
        const val = item.Valor_pago || item.valor_pago || item.valor || 0;
        const fInicioRaw = item.Fecha_inicio || item.fecha_inicio || item.FechaInicio || '';
        const fFinRaw = item.Fecha_fin || item.fecha_fin || item.FechaFin || '';
        const fInicio = fInicioRaw ? formatDisplayDate(fInicioRaw) : '';
        const fFin = fFinRaw ? formatDisplayDate(fFinRaw) : '';
        const estado = item.Estado || item.estado || 'Borrador';
        const pagoId = item.pago_id || item.id || '';
        html += `<div class="preview-small-card"><div class="font-medium mb-2">${formatCurrency(Number(val))}</div><div class="flex items-center gap-2 mb-2"><span class="material-icons text-neutral-500">date_range</span><span class="text-sm">${escapeHtml(fInicio)} ${fFin ? `- ${escapeHtml(fFin)}` : ''}</span></div><div class="flex justify-between items-center"><div class="text-xs text-neutral-500">ID: PAG-${escapeHtml(pagoId || '')}</div><span class="status-badge ${estado === 'Aprobado' ? 'active' : estado === 'Rechazado' ? 'inactive' : 'pending'}"><span class="material-icons">${estado === 'Aprobado' ? 'check_circle' : estado === 'Rechazado' ? 'cancel' : 'pending'}</span><span>${escapeHtml(estado)}</span></span></div></div>`;
      });
      html += '</div>';
      pagosEl.innerHTML = html; 
      return;
    }

  // Fallback: use form fields as before
  pagosEl = document.getElementById('preview-pagos-list');
  if(!pagosEl) return;
  const fechaInicio = document.getElementById('pg_Fecha_inicio')?.value;
    const fechaFin = document.getElementById('pg_Fecha_fin')?.value;
    const valorPago = document.getElementById('pg_Valor_pago')?.value;
    const estado = document.getElementById('pg_Estado')?.value;
    
  // pagosEl already obtained above and verified
  let html = '<div class="preview-card-grid">';
    
    if (fechaInicio && valorPago) {
      // show only a single form-derived payment preview (no dummies)
      const fInicioFmt = formatDisplayDate(fechaInicio);
      const fFinFmt = fechaFin ? formatDisplayDate(fechaFin) : '';
      html += `<div class="preview-small-card">
        <div class="font-medium mb-2">${formatCurrency(Number(valorPago))}</div>
        <div class="flex items-center gap-2 mb-2">
          <span class="material-icons text-neutral-500">date_range</span>
          <span class="text-sm">${escapeHtml(fInicioFmt)} ${fFinFmt ? `- ${escapeHtml(fFinFmt)}` : ''}</span>
        </div>
        <div class="flex justify-between items-center">
          <div class="text-xs text-neutral-500">ID: PAG-</div>
          <span class="status-badge ${estado === 'Aprobado' ? 'active' : estado === 'Rechazado' ? 'inactive' : 'pending'}">
            <span class="material-icons">${estado === 'Aprobado' ? 'check_circle' : estado === 'Rechazado' ? 'cancel' : 'pending'}</span>
            <span>${escapeHtml(estado || 'Borrador')}</span>
          </span>
        </div>
      </div>`;
    } else {
      html = '<div class="preview-small-card">No hay pagos registrados</div>';
    }
    
    html += '</div>'; // Cerrar preview-card-grid
    
    pagosEl.innerHTML = html;
  } catch (error) {
    console.error('Error loading payments for preview:', error);
  }
}

// Simple debounce
function debounce(fn, wait){ let t; return (...a)=>{ clearTimeout(t); t = setTimeout(()=>fn(...a), wait); }; }

// Expose lookup using apiFetch but keep window.lookupPersonas available
window.lookupPersonas = function(q, limit){ return apiFetch('lookupPersonas', { q, limit: limit || 10 }); };

// Modal handlers for persona lookup
function renderLookupResults(container, data){
  container.innerHTML = '';
  if(!data || !Array.isArray(data) || data.length === 0){ container.innerHTML = '<div class="text-sm text-gray-500">No hay resultados</div>'; return; }
  data.forEach(r=>{
    const d = document.createElement('div');
    d.className = 'p-2 border rounded hover:bg-gray-50 cursor-pointer flex justify-between items-center';
    d.innerHTML = `<div>
      <div class="font-medium">${escapeHtml(r.Nombre||r.name||'-')}</div>
      <div class="text-xs text-gray-500">${escapeHtml(r.Identificacion||r.identificacion||'')} - ${escapeHtml(r.Correo||r.email||'')}</div>
    </div>
    <div class="text-xs text-gray-400">${escapeHtml(r.persona_id||r.id||'')}</div>`;
    d.addEventListener('click', async ()=>{
      // set full persona object into context so we preserve all available fields
      ctx.persona = Object.assign({}, r);
      // when selecting a new persona, clear any contrato fixed in context
      ctx.contrato = null;
      saveCtx(); updateContextUI(); closeModal('modalLookupPersona'); toast('success', 'Persona seleccionada');

      // Try to load contratos for this persona from backend and set first one in context (if any)
      try{
        const personaId = ctx.persona.persona_id || ctx.persona.id;
        if(personaId){
          const contratosRes = await apiFetch('getContratosByPersona', { persona_id: personaId });
          // Debug: print raw response to help diagnose backend shape
          console.debug('getContratosByPersona response for persona', personaId, contratosRes);
          const lista = normalizeApiList(contratosRes);
          if(lista.length > 0){
            // take the first contrato but keep all available fields; normalize common keys
            const raw = lista[0] || {};
            const contratoObj = {
              contrato_id: raw.contrato_id || raw.id || raw.ContratoId || raw.rowId || raw.contratoId || '',
              Numero_contrato: raw.Numero_contrato || raw.numero || raw.numero_contrato || raw.numeroContrato || raw.numero_contrato || '',
              Tipo_vinculacion: raw.Tipo_vinculacion || raw.tipo_vinculacion || raw.tipo || raw.Tipovinculacion || '',
              Inicio: raw.Inicio || raw.inicio || raw.fecha_inicio || raw.start_date || raw.fechaInicio || '',
              Fin: raw.Fin || raw.fin || raw.fecha_fin || raw.end_date || raw.fechaFin || '',
              Valor_mensual: (raw.Valor_mensual !== undefined && raw.Valor_mensual !== null) ? Number(raw.Valor_mensual) : (raw.valor_mensual || raw.valorMensual || raw.valor_total_mes || null),
              Valor_total: (raw.Valor_total !== undefined && raw.Valor_total !== null) ? Number(raw.Valor_total) : (raw.valor_total || raw.valorTotal || raw.total || null),
              // keep raw payload for debugging or future mapping
              __raw: raw
            };
            ctx.contrato = contratoObj;
            saveCtx();
            // populate contract form fields so updatePreview finds values even if backend keys vary
            try{ if(typeof populateContractForm === 'function') populateContractForm(ctx.contrato); }catch(e){}
            updateContextUI(); updatePreview();
          }
          // populate contract selection UI if present (e.g., a select)
          const contratoSel = document.getElementById('c_contrato_select');
          if(contratoSel){
            contratoSel.innerHTML = '';
            lista.forEach(it=>{ const opt = document.createElement('option'); opt.value = it.contrato_id || it.id; opt.textContent = it.Numero_contrato || it.contrato_id || it.numero || ''; contratoSel.appendChild(opt); });
          }
        }
      }catch(e){ console.warn('No se pudieron cargar contratos para la persona', e); }
    });
    container.appendChild(d);
  });
}

function escapeHtml(s){ return String(s||'').replace(/[&<>\"]/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c])); }

// Enhanced bindForm with validation rules and toasts
function bindForm(id, path, resultId, opts={}){
  const form = document.getElementById(id);
  const result = document.getElementById(resultId);
  if(!form) return;
  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    // Basic inline validation per requirements
    const fd = new FormData(form);
    const obj = {};
    for(const [k,v] of fd.entries()) obj[k] = v && v.trim ? v.trim() : v;

    // Normalize accents keys to ASCII if present
    const norm = (s)=> String(s||'');
    ['Identificaci\u00f3n','IdentificaciA3n','Identificaci\u00c3\u00b3n'].forEach(k=>{ if(k in obj){ obj.Identificacion = norm(obj[k]); delete obj[k]; } });
    ['Tipo_identificaci\u00f3n','Tipo_identificaciA3n','Tipo_identificaci\u00c3\u00b3n'].forEach(k=>{ if(k in obj){ obj.Tipo_identificacion = norm(obj[k]); delete obj[k]; } });

    // Validation rules
    try{
      // Log submit attempt for diagnostics so we can see payload even if API doesn't respond
      try{ addApiLogEntry({ stage: 'submit', path, payload: obj }); renderApiLogsPanel(); }catch(e){}
      if(path === 'crearContrato' || path === 'upsertContrato' || path === 'crearPrecontractual' || path === 'upsertPrecontractual'){
        if(!obj.persona_id && !ctx.persona){ throw { field: 'persona_id', message: 'Seleccione una persona antes.' }; }
        if(!obj.persona_id && ctx.persona) obj.persona_id = ctx.persona.persona_id || ctx.persona.id;
      }
      if(path === 'crearObligacion' || path === 'upsertObligacion' || path === 'crearPagoBorrador' || path === 'upsertPago'){
        if(!obj.contrato_id && !ctx.contrato){ throw { field: 'contrato_id', message: 'Seleccione o cree un contrato antes.' }; }
        if(!obj.contrato_id && ctx.contrato) obj.contrato_id = ctx.contrato.contrato_id || ctx.contrato.id;
      }
      // Periodo and Mes_fiscal regex
      if(obj.Periodo && !/^\d{4}-\d{2}$/.test(obj.Periodo)) throw { field: 'Periodo', message: 'Periodo debe tener formato YYYY-MM' };
      if(obj.Mes_fiscal && !/^\d{4}-\d{2}$/.test(obj.Mes_fiscal)) throw { field: 'Mes_fiscal', message: 'Mes_fiscal debe tener formato YYYY-MM' };
      // Dates
      ['Inicio','Fin','Fecha','Fecha_inicio','Fecha_fin','Fecha_radicacion','Fecha_CDP','Fecha_RC'].forEach(f=>{ 
        if(obj[f] && !/^\d{4}-\d{2}-\d{2}$/.test(obj[f])) 
          throw { field: f, message: f + ' debe ser YYYY-MM-DD' }; 
      });
      // Numbers: simple check
      ['Valor_total','Valor_mensual','Valor_pago','Plazo_meses'].forEach(f=>{ 
        if(obj[f] && isNaN(Number(obj[f]))) 
          throw { field: f, message: f + ' debe ser num\u00e9rico' }; 
      });
    }catch(err){
      // focus field and toast
      if(err && err.field){ const el = form.querySelector(`[name="${err.field}"]`); if(el){ el.focus(); } toast('error', err.message || 'Validaci\u00f3n'); return; }
      toast('error', 'Error de validaci\u00f3n'); return;
    }

    // Show loader on submit button
    const submitBtn = form.querySelector('button[type="submit"]');
    const origText = submitBtn ? submitBtn.textContent : null;
    if(submitBtn){ submitBtn.disabled = true; submitBtn.textContent = 'Enviando...'; }

    try{
      // If upserting a persona and no persona_id provided, try to find existing by Identificacion to avoid duplicates
      if(path === 'upsertPersona' && !obj.persona_id && obj.Identificacion){
        try{
          const found = await window.lookupPersonas(obj.Identificacion, 10);
          const arr = Array.isArray(found) ? found : (found && found.data) ? found.data : (found && found.result) ? found.result : [];
          const exact = arr.find(x => ((x.Identificacion || x.identificacion || '').trim()) === (obj.Identificacion||'').trim());
          if(exact){ obj.persona_id = exact.persona_id || exact.id; const inputs = document.querySelectorAll('input[name="persona_id"]'); inputs.forEach(i=>{ i.value = obj.persona_id; i.readOnly = true; i.classList.add('bg-gray-50'); }); toast('info', 'Persona existente encontrada - actualizando'); }
        }catch(e){ /* ignore lookup errors and proceed to upsert */ }
      }
      const res = await apiFetch(path, obj);
      if(res && res.ok){
        toast('success', 'Guardado con \u00e9xito');
        // If persona created/updated, store persona_id if present
        if((path === 'upsertPersona' || path === 'crearPersona') && res.persona_id){
          // set context persona to new/updated
          ctx.persona = ctx.persona || {};
          ctx.persona.persona_id = res.persona_id;
          // try to take back filled fields
          if(obj.Nombre) ctx.persona.Nombre = obj.Nombre;
          if(obj.Identificacion) ctx.persona.Identificacion = obj.Identificacion;
          if(obj.Correo) ctx.persona.Correo = obj.Correo;
          if(obj.Tipo_identificacion) ctx.persona.Tipo_identificacion = obj.Tipo_identificacion;
          saveCtx(); updateContextUI();
        }
        // If contract created/updated, try to capture contrato_id
        if((path === 'crearContrato' || path === 'upsertContrato') && (res.contrato_id || res.id)){
          const id = res.contrato_id || res.id || res.contratoId || res.rowId;
          if(id){ 
            ctx.contrato = { contrato_id: id, Numero_contrato: obj.Numero_contrato }; 
            saveCtx(); 
            updateContextUI(); 
            toast('success', 'Contrato guardado y fijado en contexto'); 
          }
        }

        // For pago creado, try to capture pago_id
        if((path === 'crearPagoBorrador' || path === 'upsertPago') && (res.pago_id)){
          toast('info', `Pago ${res.updated ? 'actualizado' : 'creado'} con ID: ${res.pago_id}`);
          // Update the form with new ID if created new
          if(!obj.pago_id && res.pago_id) {
            const el = document.getElementById('pg_pago_id');
            if(el) el.value = res.pago_id;
          }
          // Update numero cobro display
          if(res.numero_cobro) {
            const el = document.getElementById('pg_Numero_cobro');
            if(el) el.value = res.numero_cobro;
          }
        }

        // For obligacion created/updated
        if((path === 'crearObligacion' || path === 'upsertObligacion') && (res.obligacion_id)){
          toast('info', `Obligación ${res.updated ? 'actualizada' : 'creada'} con ID: ${res.obligacion_id}`);
          if(!obj.obligacion_id && res.obligacion_id) {
            const el = document.getElementById('o_obligacion_id');
            if(el) el.value = res.obligacion_id;
          }
        }

        // For precontractual created/updated
        if((path === 'crearPrecontractual' || path === 'upsertPrecontractual') && (res.pre_id)){
          toast('info', `Precontractual ${res.updated ? 'actualizado' : 'creado'} con ID: ${res.pre_id}`);
          if(!obj.pre_id && res.pre_id) {
            const el = document.getElementById('pre_id');
            if(el) el.value = res.pre_id;
          }
        }

        // Reset form for creation actions but not updates
        if(!obj.persona_id && !obj.contrato_id && !obj.obligacion_id && !obj.pago_id && !obj.pre_id) {
          form.reset();
        }
      } else {
        const msg = res && res.error ? res.error : JSON.stringify(res);
        toast('error', 'API: ' + msg);
      }
    }catch(err){
      toast('error', 'Error de conexi\u00f3n: ' + String(err));
    }finally{
      if(submitBtn){ submitBtn.disabled = false; submitBtn.textContent = origText; }
    }
  });
}

// Setup for form sections navigation
function setupFormSections() {
  // 1. Setup navigation between sections
  const navItems = document.querySelectorAll('.nav-item');
  const sections = document.querySelectorAll('.form-section');
  
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const sectionId = item.getAttribute('data-section');
      
      // Update active navigation item
      navItems.forEach(nav => nav.classList.remove('active'));
      item.classList.add('active');
      
      // Show/hide corresponding section
      sections.forEach(section => {
        if (section.id === sectionId) {
          section.classList.add('active');
          const content = section.querySelector('.form-section-content');
          if (content) content.classList.add('expanded');
        } else {
          section.classList.remove('active');
          const content = section.querySelector('.form-section-content');
          if (content) content.classList.remove('expanded');
        }
      });
      
      // Save active section to localStorage
      localStorage.setItem('admin_active_section', sectionId);
    });
  });
  
  // 2. Setup expand/collapse functionality for section headers
  const sectionHeaders = document.querySelectorAll('.form-section-header');
  
  sectionHeaders.forEach(header => {
    // Primary header toggle
    header.addEventListener('click', (ev) => {
      // If a click originates from a control inside the header that stops propagation,
      // still allow the header toggle to run by not relying on bubbling only.
      const section = header.parentElement;
      toggleSection(section);
    });

    // Also allow clicking directly on the icon element (some browsers/tools may capture icon clicks)
    const iconEl = header.querySelector('.toggle-icon');
    if (iconEl) {
      iconEl.addEventListener('click', (ev)=>{
        ev.stopPropagation(); // prevent duplicate header handler in some cases
        const section = header.parentElement;
        toggleSection(section);
      });
    }
  });

  // Shared toggle function so icon/header both use same logic
  function toggleSection(section){
    if(!section) return;
    section.classList.toggle('active');
    const content = section.querySelector('.form-section-content');
    if (content) {
      content.classList.toggle('expanded');
    }
    const header = section.querySelector('.form-section-header');
    const icon = header ? header.querySelector('.toggle-icon') : null;
    if (icon) {
      icon.textContent = content && content.classList.contains('expanded') ? 'expand_less' : 'expand_more';
    }
  }
  
  // 3. Load active section from localStorage
  const activeSection = localStorage.getItem('admin_active_section');
  if (activeSection) {
    const activeNav = document.querySelector(`.nav-item[data-section="${activeSection}"]`);
    if (activeNav) {
      activeNav.click();
    }
  }
  
  // 4. Setup reset form button
  const btnResetForm = document.getElementById('btnResetForm');
  if (btnResetForm) {
    btnResetForm.addEventListener('click', (e) => {
      e.preventDefault();
      if (confirm('¿Estás seguro de que quieres limpiar todos los campos del formulario?')) {
        // Reset all form fields
        const forms = document.querySelectorAll('form');
        forms.forEach(form => form.reset());
        
        // Clear validation classes
        const fields = document.querySelectorAll('.form-field');
        fields.forEach(field => {
          field.classList.remove('field-valid', 'field-error');
        });
        
  // Clear selected persona/contrato from context so no data is shown anywhere
  ctx.persona = null;
  ctx.contrato = null;
  saveCtx();
  // Update preview and context UI
  updateContextUI();
  // Asegurarse que la vista previa se oculte
  if (typeof checkEmptyPreview === 'function') {
    checkEmptyPreview();
  }
  // Reset the toggle label and sticky persona bar to defaults
  const toggleLabel = document.getElementById('ctxPersonaToggleLabel'); if(toggleLabel) toggleLabel.textContent = 'Seleccionar persona';
  const elNombre = document.getElementById('ctxPersonaNombre'); if(elNombre) elNombre.textContent = '-';
  const elIdent = document.getElementById('ctxPersonaIdent'); if(elIdent) elIdent.textContent = '-';
  const hiddenPersonaId = document.getElementById('p_persona_id'); if(hiddenPersonaId) hiddenPersonaId.value = '';
  // Deselect any highlighted items in persona dropdowns/lists
  document.querySelectorAll('#ctxPersonaList .persona-item.active, #lookupResults .persona-item.active, #ctxPersonaList .p-2.persona-item.active').forEach(el=> el.classList.remove('active'));
  const ctxToggle = document.getElementById('ctxPersonaToggle'); if(ctxToggle) ctxToggle.setAttribute('aria-expanded','false');
  updatePreview();
        
        toast('info', 'Formulario limpiado correctamente');
      }
    });
  }
  
  // 5. Setup change contract button
  const btnChangeContrato = document.getElementById('btnChangeContrato');
  if (btnChangeContrato) {
    btnChangeContrato.addEventListener('click', () => {
      // Activate the contract section
      const contractNav = document.querySelector('.nav-item[data-section="section-contrato"]');
      if (contractNav) {
        contractNav.click();
      }
    });
  }
}

// Setup field validation with enhanced features
function setupFieldValidation() {
  // Target both required attributes and fields with the field-required class
  const requiredFields = document.querySelectorAll('[required], .field-required input, .field-required select, .field-required textarea');
  
  requiredFields.forEach(field => {
    const wrapper = field.closest('.form-field') || field.closest('.field-required') || field.parentElement;
    if (wrapper) wrapper.classList.add('field-required');
    
    field.addEventListener('input', () => {
      validateField(field);
    });
    
    field.addEventListener('blur', () => {
      validateField(field);
    });
    
    // Also validate on form submit
    const form = field.closest('form');
    if (form) {
      form.addEventListener('submit', () => {
        validateField(field);
      });
    }
  });
  
  // Add live preview update on input changes
  const inputFields = document.querySelectorAll('input, select, textarea');
  const debouncedPreview = debounce(updatePreview, 300);
  
  inputFields.forEach(field => {
    field.addEventListener('change', debouncedPreview);
    field.addEventListener('blur', debouncedPreview);
  });
}

// Validate a single field with enhanced validation
function validateField(field) {
  const wrapper = field.closest('.form-field') || field.closest('.field-required') || field.parentElement;
  if (!wrapper) return;
  
  // Clear existing validation classes first
  wrapper.classList.remove('field-valid', 'field-error');
  
  // Handle different validation scenarios
  if (field.value && field.validity.valid) {
    wrapper.classList.add('field-valid');
  } else if (field.value && !field.validity.valid) {
    wrapper.classList.add('field-error');
  } else if (!field.value && field.required) {
    wrapper.classList.add('field-error');
  }
}

// Tab system handler
function setupTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-tab');
      
      // Hide all tab contents
      tabContents.forEach(content => {
        content.classList.remove('active');
      });
      
      // Remove active class from all buttons
      tabBtns.forEach(btn => {
        btn.classList.remove('active');
      });
      
      // Show the selected tab content
      const targetTab = document.getElementById(tabId);
      if (targetTab) targetTab.classList.add('active');
      
      // Add active class to the clicked button
      btn.classList.add('active');
      
      // Save active tab to localStorage
      localStorage.setItem('admin_active_tab', tabId);
    });
  });

  // Load active tab from localStorage
  const activeTab = localStorage.getItem('admin_active_tab');
  if (activeTab) {
    const tabBtn = document.querySelector(`.tab-btn[data-tab="${activeTab}"]`);
    if (tabBtn) tabBtn.click();
  } else {
    // Activate first tab by default if no saved preference
    const firstTabBtn = tabBtns[0];
    if (firstTabBtn) firstTabBtn.click();
  }
}

// Esta implementación se ha mejorado y actualizado en la función setupFieldValidation arriba
// Esta sección se ha eliminado para evitar duplicaciones

// Wire up DOM interactions
document.addEventListener('DOMContentLoaded', ()=>{
  // Initialize sidebar
  initSidebar();
  
  // Setup form sections navigation
  setupFormSections();
  
  // Setup field validation
  setupFieldValidation();
  
  // Setup tabs if they exist
  setupTabs();
  
  // Initialize preview panel
  updatePreview();

  // Create an on-page diagnostics panel for API logs (compact version)
  try{
    const existing = document.getElementById('apiLogsPanel');
    if(!existing){
      // Create toggle button
      const toggleBtn = document.createElement('button');
      toggleBtn.id = 'apiLogsToggle';
      toggleBtn.innerHTML = '<span class="material-icons">bug_report</span>';
      toggleBtn.style.cssText = `
        position: fixed;
        right: 12px;
        bottom: 12px;
        width: 48px;
        height: 48px;
        z-index: 9999;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        border-radius: 50%;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
      `;
      
      // Create panel
      const panel = document.createElement('div');
      panel.id = 'apiLogsPanel';
      panel.style.cssText = `
        position: fixed;
        right: 12px;
        bottom: 72px;
        width: 380px;
        max-width: 90vw;
        max-height: 400px;
        z-index: 9998;
        background: white;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.1);
        border: 1px solid rgba(255,255,255,0.2);
        display: none;
        backdrop-filter: blur(10px);
      `;
      
      // Toggle functionality
      toggleBtn.addEventListener('click', () => {
        const isVisible = panel.style.display !== 'none';
        panel.style.display = isVisible ? 'none' : 'block';
        toggleBtn.style.transform = isVisible ? 'scale(1)' : 'scale(1.1)';
      });
      
      // Hover effects
      toggleBtn.addEventListener('mouseenter', () => {
        toggleBtn.style.transform = 'scale(1.1)';
        toggleBtn.style.boxShadow = '0 6px 16px rgba(0,0,0,0.2)';
      });
      
      toggleBtn.addEventListener('mouseleave', () => {
        const isVisible = panel.style.display !== 'none';
        toggleBtn.style.transform = isVisible ? 'scale(1.1)' : 'scale(1)';
        toggleBtn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
      });
      
      document.body.appendChild(toggleBtn);
      document.body.appendChild(panel);
    }
    renderApiLogsPanel();
    // record configured backend URL so we can quickly verify which deployment the client talks to
    try{ addApiLogEntry({ stage: 'config', path: 'BASE_URL', payload: APP_CONFIG && APP_CONFIG.BASE_URL ? APP_CONFIG.BASE_URL : 'unset' }); renderApiLogsPanel(); }catch(e){}
  }catch(e){ console.warn('Could not create api logs panel', e); }

  // Preload personas list but DO NOT restore any saved context on startup.
  // (User requested absolutely blank screen until a persona is explicitly chosen.)
  loadPersonasOnStart().then(()=>{
    // Ensure initial empty context
    ctx.persona = null;
    ctx.contrato = null;
    saveCtx();
    updateContextUI();
  }).catch(e=>{ console.warn('loadPersonasOnStart failed', e); ctx.persona = null; ctx.contrato = null; saveCtx(); updateContextUI(); });

  // Clear any previously saved active section so all sections load collapsed
  try{ localStorage.removeItem('admin_active_section'); }catch(e){}
  // Collapse all sections on load
  document.querySelectorAll('.form-section').forEach(s=>{ s.classList.remove('active'); const c = s.querySelector('.form-section-content'); if(c) c.classList.remove('expanded'); const icon = s.querySelector('.toggle-icon'); if(icon) icon.textContent = 'expand_more'; });

  // Bind forms
  bindForm('formPersona','upsertPersona','personaResult');
  bindForm('formContrato','upsertContrato','contratoResult');
  bindForm('formPago','upsertPago','pagoResult');
  bindForm('formObligacion','upsertObligacion','obligacionResult');
  bindForm('formPre','upsertPrecontractual','preResult');
  bindForm('formRol','crearRol','rolResult');

  // Lookup modal
  const btnOpen = document.getElementById('btnOpenLookupPersona');
  const lookupInput = document.getElementById('lookupInput');
  const lookupResults = document.getElementById('lookupResults');
  const lookupCount = document.getElementById('lookupCount');
  const lookupLoadMore = document.getElementById('lookupLoadMore');
  const btnClose = document.getElementById('modalCloseLookup');

  // Quick connectivity test to help debug backend: call lookupPersonas once and show result in lookupCount
  (async function startupLookupTest(){
    if(!lookupCount) return;
    lookupCount.textContent = 'Probando conexión...';
    try{
      const test = await apiFetch('lookupPersonas', { q: '', limit: 5 });
      console.log('startup lookupPersonas response:', test);
      // normalize possible shapes
      let testData = [];
      if(Array.isArray(test)) testData = test;
      else if(test && Array.isArray(test.items)) testData = test.items;
      else if(test && Array.isArray(test.data)) testData = test.data;
      else if(test && Array.isArray(test.result)) testData = test.result;

      if(Array.isArray(testData)){
        lookupCount.textContent = `${testData.length} personas (test)`;
        toast('info', 'Conexión con backend OK (test)');
      } else {
        lookupCount.textContent = 'Respuesta: ' + (test && test.error ? test.error : JSON.stringify(test));
        toast('warning', 'Respuesta inesperada del backend (revisa consola)');
      }
    }catch(err){
      lookupCount.textContent = 'Error de conexión';
      toast('error', 'No se pudo conectar al backend: ' + String(err));
      console.error('startup lookup error', err);
    }
  })();

  if(btnOpen){ btnOpen.addEventListener('click', ()=> openModal('modalLookupPersona')); }
  if(btnClose){ btnClose.addEventListener('click', ()=> closeModal('modalLookupPersona')); }

  // Lookup state for modal (simple paging)
  let lookupPage = 0;
  let lookupQuery = '';
  let lookupBuffer = [];

  async function fetchLookup(q, page){
    // page * limit offset behaviour (server may support); we pass limit and offset
    const limit = 10;
    const payload = { q: q || '', limit, offset: (page||0) * limit };
  const res = await window.lookupPersonas(payload.q, payload.limit + (payload.offset||0));
  // backend may return different shapes: raw array, {data:[]}, {result:[]}, {items:[]}, or {ok:true, items:[]}
  let data = [];
  if(Array.isArray(res)) data = res;
  else if(res && Array.isArray(res.items)) data = res.items;
  else if(res && Array.isArray(res.data)) data = res.data;
  else if(res && Array.isArray(res.result)) data = res.result;
  else if(res && res.ok && Array.isArray(res.items)) data = res.items;
  return data || [];
  }

  // If an empty query returns no results, try seeded queries (vowels) and merge unique results
  async function seededFetch(q, page){
    const data = await fetchLookup(q, page);
    if(data && data.length) return data;
    const seeds = ['a','e','i','o','u','ñ'];
    try{
      const promises = seeds.map(s => fetchLookup(s, 0));
      const results = await Promise.all(promises);
      const flat = results.flat().filter(Boolean);
      // dedupe by persona_id or Identificacion
      const map = new Map();
      flat.forEach(item=>{
        const key = (item.persona_id || item.id || item.Identificacion || item.identificacion || JSON.stringify(item));
        if(!map.has(key)) map.set(key, item);
      });
      return Array.from(map.values()).slice(0, 50);
    }catch(e){ return data; }
  }

  const doSearch = debounce(async (q) => {
    lookupQuery = q || '';
    lookupPage = 0; lookupBuffer = [];
    try {
      if(!q || q.length < 2){
        // load initial page when cleared - try seededFetch so we show options even if backend requires q
        const initial = await seededFetch('', 0);
        lookupBuffer = initial || [];
        lookupCount.textContent = `${lookupBuffer.length} resultados`;
        renderLookupResults(lookupResults, lookupBuffer);
        return;
      }
      // Normal search
      let results = await fetchLookup(q, 0);
      // If server returned nothing for empty q, fall back to seededFetch
      if((!results || results.length === 0) && (!q || q.trim() === '')){
        results = await seededFetch(q, 0);
      }
      lookupBuffer = results || [];
      lookupCount.textContent = `${lookupBuffer.length} resultados`;
      renderLookupResults(lookupResults, lookupBuffer);
    } catch (err) {
      lookupResults.innerHTML = '<div class="text-sm text-red-500">Error al buscar</div>';
      lookupCount.textContent = 'Error';
    }
  }, 300);

  if(lookupInput){ lookupInput.addEventListener('input', (e)=> doSearch(e.target.value)); }

  // Helper to populate Persona form fields when a persona is selected
  function populatePersonaForm(p){
    try{
      if(!p) return;
      const id = p.persona_id || p.id || '';
      const nombre = p.Nombre || p.name || '';
      const identificacion = p.Identificacion || p.identificacion || '';
      const correo = p.Correo || p.email || '';
      const tipo = p.Tipo_identificacion || p.tipo || '';
      const perfil = p.Perfil || p.perfil || '';
      const grupo = p.Grupo_OAPI || p.grupo || '';
      const estado = p.Estado || p.estado || '';
      
      const fId = document.getElementById('p_Identificacion'); if(fId) fId.value = identificacion;
      const fTipo = document.getElementById('p_Tipo_identificacion'); if(fTipo) fTipo.value = tipo;
      const fNombre = document.getElementById('p_Nombre'); if(fNombre) fNombre.value = nombre;
      const fCorreo = document.getElementById('p_Correo'); if(fCorreo) fCorreo.value = correo;
      const fPerfil = document.getElementById('p_Perfil'); if(fPerfil) fPerfil.value = perfil;
      const fGrupo = document.getElementById('p_Grupo_OAPI'); if(fGrupo) fGrupo.value = grupo || '';
      const fEstado = document.getElementById('p_Estado'); if(fEstado && estado) fEstado.value = estado || '';
      const fPersonaId = document.getElementById('p_persona_id'); if(fPersonaId) fPersonaId.value = id;
      
      // update persona id in any hidden FK inputs
      const personaIdInputs = document.querySelectorAll('input[name="persona_id"]');
      personaIdInputs.forEach(i=>{ i.value = id; i.readOnly = true; i.classList.add('bg-gray-50'); });
      // update toggle label
      const toggleLabel = document.getElementById('ctxPersonaToggleLabel'); if(toggleLabel) toggleLabel.textContent = nombre || identificacion || id || 'Seleccionada';
    }catch(e){ /* ignore */ }
  }

  // Helper to populate contract form fields from a contract object (tries multiple common key names)
  function populateContractForm(c){
    try{
      if(!c) return;
      const id = c.contrato_id || c.id || c.ContratoId || '';
      const numero = c.Numero_contrato || c.numero || c.numero_contrato || '';
      const tipo = c.Tipo_vinculacion || c.tipo || '';
      const inicio = c.Inicio || c.inicio || c.fecha_inicio || c.start_date || '';
      const fin = c.Fin || c.fin || c.fecha_fin || c.end_date || '';
      const valorMens = (c.Valor_mensual !== undefined && c.Valor_mensual !== null) ? c.Valor_mensual : (c.valor_mensual || c.valorMensual || c.valor_total_mes || '');
      const valorTot = (c.Valor_total !== undefined && c.Valor_total !== null) ? c.Valor_total : (c.valor_total || c.valorTotal || c.total || '');

      const elNum = document.getElementById('c_Numero_contrato'); if(elNum) elNum.value = numero || '';
      const elId = document.getElementById('c_contrato_id'); if(elId) elId.value = id || '';
      const elTipo = document.getElementById('c_Tipo_vinculacion'); if(elTipo) elTipo.value = tipo || '';
    const elInicio = document.getElementById('c_Inicio'); if(elInicio && inicio) elInicio.value = toIsoDateValue(inicio);
    const elFin = document.getElementById('c_Fin'); if(elFin && fin) elFin.value = toIsoDateValue(fin);
      const elValMens = document.getElementById('c_Valor_mensual'); if(elValMens && (valorMens !== undefined)) elValMens.value = valorMens || '';
      const elValTot = document.getElementById('c_Valor_total'); if(elValTot && (valorTot !== undefined)) elValTot.value = valorTot || '';
      // objeto del contrato: try multiple locations incl. raw payload
      const elObjeto = document.getElementById('c_Objeto');
      if(elObjeto){
        let objetoVal = c.Objeto || c.objeto || c.descripcion || '';
        // inspect raw payload for common fields
        try{
          const r = c.__raw || c.raw || {};
          objetoVal = objetoVal || r.Objeto || r.objeto || r.Descripcion || r.descripcion || r.Objeto_del_contrato || r.objeto_contrato || '';
        }catch(e){}
        elObjeto.value = objetoVal || '';
      }
      // --- populate budget/additional fields (previously inside a <details>) ---
      try{
        const raw = c.__raw || c.raw || {};
        const origen = c.Origen_fondo || c.origen_fondo || raw.Origen_fondo || raw.origen_fondo || raw.origen || '';
        const supervisor = c.Supervisor || c.supervisor || raw.Supervisor || raw.supervisor || raw.supervisor_name || '';
        const numCdp = c.Numero_CDP || c.NumeroCdp || c.numero_cdp || c.numeroCDP || raw.Numero_CDP || raw.numero_cdp || raw.numeroCDP || raw.numero_cdp || '';
        const fechaCdp = c.Fecha_CDP || c.FechaCdp || c.fecha_cdp || raw.Fecha_CDP || raw.fecha_cdp || raw.fechaCDP || raw.fechaCDP || '';
        const numRc = c.Numero_RC || c.NumeroRc || c.numero_rc || raw.Numero_RC || raw.numero_rc || raw.numeroRC || '';
        const fechaRc = c.Fecha_RC || c.FechaRc || c.fecha_rc || raw.Fecha_RC || raw.fecha_rc || raw.fechaRC || '';
        const estado = c.Estado || c.estado || raw.Estado || raw.estado || '';
        const carpeta = c.Carpeta_Drive_URL || c.CarpetaDriveURL || raw.Carpeta_Drive_URL || raw.carpeta_drive_url || raw.carpeta || raw.drive_url || '';

        const elOrigen = document.getElementById('c_Origen_fondo'); if(elOrigen) elOrigen.value = origen || '';
        const elSupervisor = document.getElementById('c_Supervisor'); if(elSupervisor) elSupervisor.value = supervisor || '';
        const elNumCdp = document.getElementById('c_Numero_CDP'); if(elNumCdp) elNumCdp.value = numCdp || '';
        const elFechaCdp = document.getElementById('c_Fecha_CDP'); if(elFechaCdp) elFechaCdp.value = toIsoDateValue(fechaCdp) || '';
        const elNumRc = document.getElementById('c_Numero_RC'); if(elNumRc) elNumRc.value = numRc || '';
        const elFechaRc = document.getElementById('c_Fecha_RC'); if(elFechaRc) elFechaRc.value = toIsoDateValue(fechaRc) || '';
        const elEstado = document.getElementById('c_Estado'); if(elEstado && estado) elEstado.value = estado;
        const elCarp = document.getElementById('c_Carpeta_Drive_URL'); if(elCarp) elCarp.value = carpeta || '';
      }catch(e){ console.warn('populateContractForm: budget fields mapping failed', e); }
      // plazo meses: if present use it, otherwise compute
      const elPlazo = document.getElementById('c_Plazo_mesas');
      if(elPlazo){
        if(c.Plazo_meses || c.plazo || c.Plazo) elPlazo.value = c.Plazo_meses || c.plazo || c.Plazo || '';
        else {
          try{ if(inicio && fin){ elPlazo.value = approxMonthsBetween(inicio, fin); } }catch(e){}
        }
      }
    }catch(e){ console.warn('populateContractForm failed', e); }
  }

  // Approximate months between two dates (inclusive-ish)
  function approxMonthsBetween(a, b){
    const da = new Date(a); const db = new Date(b);
    if(isNaN(da.getTime()) || isNaN(db.getTime())) return null;
    const years = db.getFullYear() - da.getFullYear();
    const months = db.getMonth() - da.getMonth();
    const total = years * 12 + months + (db.getDate() >= da.getDate() ? 0 : 0);
    return Math.max(0, total || 0);
  }

  // Load more handler
  if(lookupLoadMore){ lookupLoadMore.addEventListener('click', async ()=>{
    try{
      lookupPage += 1;
      const more = await fetchLookup(lookupQuery, lookupPage);
      if(more && more.length){ lookupBuffer = lookupBuffer.concat(more); renderLookupResults(lookupResults, lookupBuffer); lookupCount.textContent = `${lookupBuffer.length} resultados`; }
      else { lookupLoadMore.textContent = 'No hay más'; lookupLoadMore.disabled = true; }
    }catch(e){ lookupCount.textContent = 'Error'; }
  }); }

  // --- Sticky persona dropdown handlers ---
  const ctxToggle = document.getElementById('ctxPersonaToggle');
  const ctxDropdown = document.getElementById('ctxPersonaDropdown');
  const ctxSearch = document.getElementById('ctxPersonaSearch');
  const ctxList = document.getElementById('ctxPersonaList');
  const ctxCount = document.getElementById('ctxPersonaCount');
  const ctxLoadMore = document.getElementById('ctxPersonaLoadMore');

  let ctxPage = 0, ctxQuery = '', ctxBuffer = [];

  function renderCtxPersonaList(container, data){
    container.innerHTML = '';
    if(!data || !data.length){ container.innerHTML = '<div class="text-sm text-gray-500">No hay resultados</div>'; return; }
    // keyboard active index storage
    container.dataset.activeIndex = '-1';
    data.forEach((r, idx)=>{
      const d = document.createElement('div');
      d.className = 'p-2 rounded hover:bg-gray-50 cursor-pointer flex items-center justify-between';
      d.tabIndex = 0;
      d.setAttribute('data-idx', String(idx));
      d.innerHTML = `<div class="flex-1">
        <div class="font-medium text-sm">${escapeHtml(r.Nombre||r.name||'-')}</div>
        <div class="text-xs text-gray-500">${escapeHtml(r.Identificacion||r.identificacion||'')}</div>
      </div>
      <div class="text-xs text-gray-400">${escapeHtml(r.persona_id||r.id||'')}</div>`;
      d.addEventListener('click', ()=> selectCtxPersona(r));
      d.addEventListener('keydown', (ev)=>{ if(ev.key === 'Enter'){ ev.preventDefault(); selectCtxPersona(r); } });
      container.appendChild(d);
    });
  }

  // Populate payment form fields from contract/context or by fetching latest pago if available
  async function populatePagoForm(contract){
    try{
      const contratoId = contract && (contract.contrato_id || contract.id) ? (contract.contrato_id || contract.id) : (document.getElementById('pg_contrato_id')?.value || null);
      // set contrato FK on form
      const cInps = document.querySelectorAll('input[name="contrato_id"]');
      cInps.forEach(i=>{ if(contratoId){ i.value = contratoId; i.readOnly = true; i.classList.add('bg-gray-50'); } else { i.value = ''; i.readOnly = false; i.classList.remove('bg-gray-50'); } });

      // set persona FK on pago form
      const personaId = ctx.persona ? (ctx.persona.persona_id || ctx.persona.id) : (document.getElementById('pg_persona_id')?.value || '');
      const pInps = document.querySelectorAll('#formPago input[name="persona_id"]');
      pInps.forEach(i=>{ i.value = personaId || ''; if(personaId) { i.readOnly = true; i.classList.add('bg-gray-50'); } });

      // If we have a contratoId try to fetch last pago to prefill some fields
      if(contratoId){
        try{
          const res = await apiFetch('getPagosByContrato', { contrato_id: contratoId });
          const list = normalizeApiList(res);
          // take the latest (last) pago if exists
          if(list && list.length){
            const last = list[list.length - 1];
            // map common keys
            const pagoId = last.pago_id || last.id || '';
            const inicio = last.Fecha_inicio || last.fecha_inicio || last.FechaInicio || '';
            const fin = last.Fecha_fin || last.fecha_fin || last.FechaFin || '';
            const valor = last.Valor_pago || last.valor_pago || last.valor || '';
            const mes = last.Mes_fiscal || last.mes_fiscal || last.MesFiscal || '';
            const estado = last.Estado || last.estado || '';
            const numero = last.Numero_cobro || last.Numero_cobro || last.numero_cobro || last.NumeroCobro || '';

            const elPagoId = document.getElementById('pg_pago_id'); if(elPagoId) elPagoId.value = pagoId || '';
            const elInicio = document.getElementById('pg_Fecha_inicio'); if(elInicio && inicio) elInicio.value = toIsoDateValue(inicio) || '';
            const elFin = document.getElementById('pg_Fecha_fin'); if(elFin && fin) elFin.value = toIsoDateValue(fin) || '';
            const elValor = document.getElementById('pg_Valor_pago'); if(elValor && (valor !== undefined)) elValor.value = valor || '';
            const elMes = document.getElementById('pg_Mes_fiscal'); if(elMes && mes) elMes.value = mes || '';
            const elEstado = document.getElementById('pg_Estado'); if(elEstado && estado) elEstado.value = estado || '';
            const elNumero = document.getElementById('pg_Numero_cobro'); if(elNumero && numero) elNumero.value = numero || '';
            return;
          }
        }catch(e){ console.warn('populatePagoForm: could not fetch pagos', e); }
      }

      // otherwise clear or keep form defaults
      const elPagoId = document.getElementById('pg_pago_id'); if(elPagoId && !elPagoId.value) elPagoId.value = '';
    }catch(e){ console.warn('populatePagoForm failed', e); }
  }

  // Populate obligation form fields using context or by fetching first obligation
  async function populateObligacionForm(contract){
    try{
      const contratoId = contract && (contract.contrato_id || contract.id) ? (contract.contrato_id || contract.id) : (document.getElementById('o_contrato_id')?.value || null);
      const elContrato = document.getElementById('o_contrato_id'); if(elContrato){ elContrato.value = contratoId || ''; }
      const elPersona = document.getElementById('o_persona_id'); if(elPersona){ elPersona.value = ctx.persona ? (ctx.persona.persona_id || ctx.persona.id) : ''; }

      if(contratoId){
        try{
          const res = await apiFetch('getObligacionesByContrato', { contrato_id: contratoId });
          const list = normalizeApiList(res);
          if(list && list.length){
            const first = list[0];
            const desc = first.Descripcion || first.descripcion || first.Descrip || '';
            const act = first.Actividades_realizadas || first.actividades || '';
            const prod = first.Producto || first.producto || '';
            const periodo = first.Periodo || first.periodo || '';
            const estado = first.Estado || first.estado || '';
            const evidencia = first.Evidencia_URL || first.evidencia_url || '';
            const id = first.obligacion_id || first.id || '';

            const elDesc = document.getElementById('o_Descripcion'); if(elDesc) elDesc.value = desc || '';
            const elAct = document.getElementById('o_Actividades_realizadas'); if(elAct) elAct.value = act || '';
            const elProd = document.getElementById('o_Producto'); if(elProd) elProd.value = prod || '';
            const elPeriodo = document.getElementById('o_Periodo'); if(elPeriodo) elPeriodo.value = periodo || '';
            const elEstado = document.getElementById('o_Estado'); if(elEstado && estado) elEstado.value = estado || '';
            const elEvid = document.getElementById('o_Evidencia_URL'); if(elEvid) elEvid.value = evidencia || '';
            const elId = document.getElementById('o_obligacion_id'); if(elId) elId.value = id || '';
            return;
          }
        }catch(e){ console.warn('populateObligacionForm: fetch failed', e); }
      }
      // no contrato or no obligations: clear fields when context cleared
      if(!contratoId){ document.getElementById('o_Descripcion') && (document.getElementById('o_Descripcion').value = ''); }
    }catch(e){ console.warn('populateObligacionForm failed', e); }
  }

  // Populate precontractual form fields using persona context
  async function populatePrecontractualForm(persona){
    try{
      const personaId = persona && (persona.persona_id || persona.id) ? (persona.persona_id || persona.id) : (document.getElementById('pre_persona_id')?.value || '');
      const elPersona = document.getElementById('pre_persona_id'); if(elPersona){ elPersona.value = personaId || ''; }
      if(personaId){
        try{
          // attempt to query persona context to retrieve precontractual items
          const res = await apiFetch('getPersonaContext', { persona_id: personaId });
          if(res && res.ok && Array.isArray(res.precontractual) && res.precontractual.length){
            const first = res.precontractual[0];
            const preId = first.pre_id || first.id || '';
            const req = first.Requisito || first.requisito || '';
            const estado = first.Estado || first.estado || '';
            const fecha = first.Fecha || first.fecha || '';
            const responsable = first.Responsable || first.responsable || '';
            const soporte = first.Soporte_URL || first.soporte_url || '';
            const obs = first.Observaciones || first.observaciones || '';

            const elPreId = document.getElementById('pre_id'); if(elPreId) elPreId.value = preId || '';
            const elReq = document.getElementById('pre_Requisito'); if(elReq) elReq.value = req || '';
            const elEstado = document.getElementById('pre_Estado'); if(elEstado && estado) elEstado.value = estado || '';
            const elFecha = document.getElementById('pre_Fecha'); if(elFecha && fecha) elFecha.value = toIsoDateValue(fecha) || '';
            const elResp = document.getElementById('pre_Responsable'); if(elResp) elResp.value = responsable || '';
            const elSop = document.getElementById('pre_Soporte_URL'); if(elSop) elSop.value = soporte || '';
            const elObs = document.getElementById('pre_Observaciones'); if(elObs) elObs.value = obs || '';
            return;
          }
        }catch(e){ console.warn('populatePrecontractualForm: fetch failed', e); }
      }
    }catch(e){ console.warn('populatePrecontractualForm failed', e); }
  }

  // Populate role form hinting email from persona (helpful UX)
  function populateRolForm(persona){
    try{
      const elEmail = document.getElementById('r_email');
      if(!elEmail) return;
      if(persona && (persona.Correo || persona.email)){
        elEmail.value = persona.Correo || persona.email;
      }
    }catch(e){ console.warn('populateRolForm failed', e); }
  }

  // helper to select from ctx dropdown and load contratos for that persona
  async function selectCtxPersona(r){
    ctx.persona = { 
      persona_id: r.persona_id || r.id, 
      Nombre: r.Nombre || r.name, 
      Identificacion: r.Identificacion || r.identificacion, 
      Correo: r.Correo || r.email, 
      Tipo_identificacion: r.Tipo_identificacion || r.tipo || '', 
      Perfil: r.Perfil || r.perfil || '',
      Grupo_OAPI: r.Grupo_OAPI || r.grupo || '',
      Estado: r.Estado || r.estado || ''
    };
    // clear any previously fixed contrato so we show the fresh one from backend
    ctx.contrato = null;
    saveCtx(); updateContextUI(); populatePersonaForm(ctx.persona);
    if(ctxDropdown) ctxDropdown.classList.add('hidden');
    toast('success', 'Persona seleccionada');

    // Attempt to load contratos for the selected persona
    try{
      const personaId = ctx.persona.persona_id || ctx.persona.id;
      if(personaId){
        const contratosRes = await apiFetch('getContratosByPersona', { persona_id: personaId });
        console.debug('getContratosByPersona response for ctx dropdown select', personaId, contratosRes);
        const lista = normalizeApiList(contratosRes);
        if(lista && lista.length > 0){
          const raw = lista[0];
          const contratoObj = {
            contrato_id: raw.contrato_id || raw.id || raw.ContratoId || raw.rowId || raw.contratoId || '',
            Numero_contrato: raw.Numero_contrato || raw.numero || raw.numero_contrato || raw.numeroContrato || '',
            Tipo_vinculacion: raw.Tipo_vinculacion || raw.tipo || '',
            Inicio: raw.Inicio || raw.inicio || raw.fecha_inicio || raw.start_date || '',
            Fin: raw.Fin || raw.fin || raw.fecha_fin || raw.end_date || '',
            Valor_mensual: (raw.Valor_mensual !== undefined && raw.Valor_mensual !== null) ? Number(raw.Valor_mensual) : (raw.valor_mensual || raw.valorMensual || raw.valor_total_mes || null),
            Valor_total: (raw.Valor_total !== undefined && raw.Valor_total !== null) ? Number(raw.Valor_total) : (raw.valor_total || raw.valorTotal || raw.total || null),
            __raw: raw
          };
          ctx.contrato = contratoObj; saveCtx();
          try{ populateContractForm(ctx.contrato); }catch(e){}
          updateContextUI(); updatePreview();
        } else {
          console.debug('No contratos returned for persona', personaId);
        }
      }
    }catch(e){ console.warn('Error loading contratos for ctx dropdown select', e); }
  }

  // keyboard navigation for ctx dropdown: up/down/enter/esc
  function ctxMoveHighlight(container, direction){
    const items = Array.from(container.querySelectorAll('[data-idx]'));
    if(!items.length) return;
    let ai = Number(container.dataset.activeIndex || -1);
    ai = Math.max(-1, Math.min(items.length - 1, ai + direction));
    // remove previous
    items.forEach(it=> it.classList.remove('bg-blue-50','ring','ring-blue-200'));
    if(ai >= 0){ const el = items[ai]; el.classList.add('bg-blue-50','ring','ring-blue-200'); el.scrollIntoView({ block: 'nearest' }); }
    container.dataset.activeIndex = String(ai);
  }

  // attach keyboard listeners when dropdown exists
  if(ctxDropdown){
    ctxDropdown.addEventListener('keydown', (e)=>{
      const target = e.target;
      if(e.key === 'ArrowDown'){ e.preventDefault(); ctxMoveHighlight(ctxList, +1); }
      else if(e.key === 'ArrowUp'){ e.preventDefault(); ctxMoveHighlight(ctxList, -1); }
      else if(e.key === 'Enter'){ e.preventDefault(); const ai = Number(ctxList.dataset.activeIndex || -1); if(ai >= 0){ const el = ctxList.querySelector('[data-idx="'+ai+'"]'); if(el){ el.click(); } } }
      else if(e.key === 'Escape'){ if(ctxDropdown) ctxDropdown.classList.add('hidden'); }
    });
  }

  async function ctxFetch(q, page){
    const data = await fetchLookup(q, page);
    return data;
  }

  if(ctxToggle){ ctxToggle.addEventListener('click', async ()=>{
    if(ctxDropdown) ctxDropdown.classList.toggle('hidden');
    if(!ctxDropdown || ctxDropdown.classList.contains('hidden')) return;
    // load initial
    ctxPage = 0; ctxQuery = ''; ctxBuffer = [];
    ctxCount.textContent = 'Cargando...';
    try{
      const data = await ctxFetch('', 0);
      ctxBuffer = data; renderCtxPersonaList(ctxList, ctxBuffer); ctxCount.textContent = `${ctxBuffer.length} resultados`;
      if(ctxBuffer.length < 10){ ctxLoadMore.textContent = 'No hay más'; ctxLoadMore.disabled = true; } else { ctxLoadMore.textContent = 'Cargar más'; ctxLoadMore.disabled = false; }
    }catch(e){ ctxList.innerHTML = '<div class="text-sm text-red-500">Error al cargar</div>'; ctxCount.textContent = 'Error'; }
  }); }

  if(ctxSearch){ ctxSearch.addEventListener('input', debounce(async (e)=>{
    const q = e.target.value || '';
    ctxQuery = q; ctxPage = 0; ctxBuffer = [];
    if(!q || q.length < 2){
      const data = await ctxFetch('', 0); ctxBuffer = data; renderCtxPersonaList(ctxList, ctxBuffer); ctxCount.textContent = `${ctxBuffer.length} resultados`; return;
    }
    try{ const data = await ctxFetch(q, 0); ctxBuffer = data; renderCtxPersonaList(ctxList, ctxBuffer); ctxCount.textContent = `${ctxBuffer.length} resultados`; }catch(e){ ctxList.innerHTML = '<div class="text-sm text-red-500">Error</div>'; ctxCount.textContent = 'Error'; }
  }, 300)); }

  if(ctxLoadMore){ ctxLoadMore.addEventListener('click', async ()=>{
    try{ ctxPage += 1; const more = await ctxFetch(ctxQuery, ctxPage); if(more && more.length){ ctxBuffer = ctxBuffer.concat(more); renderCtxPersonaList(ctxList, ctxBuffer); ctxCount.textContent = `${ctxBuffer.length} resultados`; } else { ctxLoadMore.textContent = 'No hay más'; ctxLoadMore.disabled = true; } }catch(e){ ctxCount.textContent = 'Error'; }
  }); }

  // Context change buttons
  const btnChangePersona = document.getElementById('btnChangePersona');
  if(btnChangePersona) btnChangePersona.addEventListener('click', ()=> openModal('modalLookupPersona'));

  // When opening modal via button, load initial list
  if(btnOpen){ btnOpen.addEventListener('click', async ()=>{
    openModal('modalLookupPersona');
    lookupCount.textContent = 'Cargando...';
    lookupPage = 0; lookupQuery = '';
    try{
      let data = await fetchLookup('', 0);
      if((!data || data.length === 0)){
        data = await seededFetch('', 0);
      }
      lookupBuffer = data;
      lookupCount.textContent = `${lookupBuffer.length} resultados`;
      renderLookupResults(lookupResults, lookupBuffer);
      if(lookupBuffer.length < 10){ lookupLoadMore.textContent = 'No hay más'; lookupLoadMore.disabled = true; } else { lookupLoadMore.textContent = 'Cargar más'; lookupLoadMore.disabled = false; }
    }catch(e){ lookupResults.innerHTML = '<div class="text-sm text-red-500">Error al cargar</div>'; lookupCount.textContent = 'Error'; }
  }); }

  const btnChangeContrato = document.getElementById('btnChangeContrato');
  if(btnChangeContrato) btnChangeContrato.addEventListener('click', ()=>{
    const el = document.getElementById('c_Numero_contrato'); if(el){ el.focus(); }
    
    // Navigate to the contract section
    const contractNav = document.querySelector('.nav-item[data-section="section-contrato"]');
    if (contractNav) {
      contractNav.click();
    }
  });

  try{ const el = document.querySelector('aside.sidebar'); if(el) initSidebar(el); }catch(e){ }

  // Load contrato details if we have contrato_id in context
  if(ctx.contrato && ctx.contrato.contrato_id) {
  console.debug('ctx.contrato found on startup:', ctx.contrato);
  // Try to populate the contract form with normalized keys
  try{ populateContractForm(ctx.contrato); }catch(e){ console.warn('populateContractForm failed', e); }
  // Update preview with current context
  updatePreview();
  }
});
