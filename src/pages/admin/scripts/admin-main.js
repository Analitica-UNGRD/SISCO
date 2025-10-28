// Admin Main Coordinator - Modular version
import { APP_CONFIG } from '../../../lib/config.js';
import { initSidebar } from '../../../pages-scripts/sidebar.js';
import { toast, openModal, closeModal } from '../../../lib/ui.js';
import { simpleSearch } from '../../../lib/search.js';
import { showLoaderDuring } from '../../../lib/loader.js';

// Small debounce helper (module-scoped) to avoid depending on global legacy functions
function debounce(fn, wait){ let t; return (...a)=>{ clearTimeout(t); t = setTimeout(()=>fn(...a), wait); }; }

// Format date for display like '27 sep 2024' (Spanish short month)
function formatDisplayDate(d){
  try{
    if(!d) return '';
    const dt = new Date(d);
    if(isNaN(dt.getTime())) return d;
    const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
    const day = String(dt.getDate()).padStart(2,'0');
    const mon = months[dt.getMonth()] || '';
    const year = dt.getFullYear();
    return `${day} ${mon} ${year}`;
  }catch(e){ return d; }
}

// Format currency for Colombian pesos
function formatCurrency(value){
  try{
    if (value === null || value === undefined || value === '') return '-';
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(value));
  }catch(e){ return String(value); }
}

// Component management
class AdminComponentManager {
  constructor() {
    this.components = new Map();
    this.currentSection = 'contractual';
  this.ctx = { persona: null, contrato: null, modificaciones: [] }; // Always start clean
    this.CTX_KEY = 'admin_ctx_v1';
    this.__apiLogs = [];
    this._personasDataset = [];
    this._filteredPersonas = [];
    this._personasVisibleStep = 20;
    this._personasVisibleLimit = this._personasVisibleStep;
    this._personaDropdownOutsideClickHandler = null;
    
    // Clear any old test data
    try {
      const stored = localStorage.getItem(this.CTX_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Remove test data if it exists
        if (parsed.persona && (parsed.persona.nombre === 'Test' || parsed.persona.id === 1)) {
          localStorage.removeItem(this.CTX_KEY);
        }
        if (parsed.contrato && (parsed.contrato.objeto === 'Test Contract' || parsed.contrato.id === 1)) {
          localStorage.removeItem(this.CTX_KEY);
        }
      }
    } catch (e) {
      localStorage.removeItem(this.CTX_KEY);
    }
  }

  // API fetch function (maintain compatibility)
  async apiFetch(path, payload) {
    if (!APP_CONFIG || !APP_CONFIG.BASE_URL) {
      console.error('APP_CONFIG.BASE_URL not configured. Cannot connect to Google Sheets.');
      throw new Error('Base URL not configured');
    }

    const executeRequest = async () => {
      console.debug('apiFetch ->', path, payload ? Object.assign({}, payload) : null);
      this.addApiLogEntry({ stage: 'request', path, payload });

      const response = await fetch(APP_CONFIG.BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ path, payload })
      });

      let json = null;
      try {
        json = await response.json();
      } catch (e) {
        console.error('Error parsing JSON response:', e);
        throw new Error('Invalid JSON response from server');
      }

      console.debug('apiFetch <-', path, json);
      this.addApiLogEntry({ stage: 'response', path, payload, response: json });
      this.renderApiLogsPanel();
      return json;
    };

    try {
      const message = `Procesando ${path}...`;
      return await showLoaderDuring(executeRequest, message, 'blocking', 320);
    } catch (e) {
      console.error('apiFetch error', path, e);
      this.addApiLogEntry({ stage: 'error', path, payload, error: e.message });
      this.renderApiLogsPanel();
      throw e;
    }
  }

  // Load component HTML
  async loadComponent(componentName) {
    if (this.components.has(componentName)) {
      return this.components.get(componentName);
    }

    try {
      // Utilizamos la ruta correcta para los componentes
      const response = await fetch(`./components/admin-${componentName}.html`);
      if (!response.ok) {
        throw new Error(`Failed to load component: ${componentName}`);
      }
      
      const html = await response.text();
      this.components.set(componentName, html);
      return html;
    } catch (error) {
      console.error(`Error loading component ${componentName}:`, error);
      return `<div class="error-message">Error loading ${componentName} component</div>`;
    }
  }

  // Load component script
  async loadComponentScript(componentName) {
    try {
      const module = await import(`./admin-${componentName}.js`);
      return module.default || module;
    } catch (error) {
      console.warn(`No script found for component ${componentName}:`, error);
      return null;
    }
  }

  // Render section
  async renderSection(sectionName) {
    const contentContainer = document.getElementById('adminContent');
    if (!contentContainer) {
      console.error('No se encontró el contenedor adminContent');
      return;
    }

    // Show loading
    contentContainer.innerHTML = '<div class="loading-state">Cargando...</div>';

    try {
      let componentHtml = '';
      
      // Load components based on section
      const previewHtml = await this.loadComponent('preview');
      
      switch (sectionName) {
        case 'contractual':
          const datosBasicos = await this.loadComponent('datos-basicos');
          const contratos = await this.loadComponent('contratos');
          const contractualObligaciones = await this.loadComponent('contractual-obligaciones');
          const contractualModificaciones = await this.loadComponent('contractual-modificaciones');
          componentHtml = `
            <div class="dual-panel">
              <div class="form-panel-section">
                ${datosBasicos}
                ${contratos}
                ${contractualObligaciones}
                ${contractualModificaciones}
              </div>
              <div class="preview-panel-section">
                ${previewHtml}
              </div>
            </div>
          `;
          break;
          
        case 'cuentas-cobro':
          const obligaciones = await this.loadComponent('obligaciones');
          const pagos = await this.loadComponent('pagos');
          componentHtml = `
            <div class="dual-panel">
              <div class="form-panel-section">
                ${obligaciones}
                ${pagos}
              </div>
              <div class="preview-panel-section">
                ${previewHtml}
              </div>
            </div>
          `;
          break;
          
        case 'precontractual':
          const precontractual = await this.loadComponent('precontractual');
          const precontractualPreview = await this.loadComponent('precontractual-preview');
          componentHtml = `
            <div class="dual-panel">
              <div class="form-panel-section">
                ${precontractual}
              </div>
              <div class="preview-panel-section">
                ${precontractualPreview}
              </div>
            </div>
          `;
          break;
          
        case 'configuracion':
          const roles = await this.loadComponent('roles');
          componentHtml = `
            <div class="dual-panel">
              <div class="form-panel-section">
                ${roles}
              </div>
              <div class="preview-panel-section">
                ${previewHtml}
              </div>
            </div>
          `;
          break;
          
        default:
          componentHtml = '<div class="error-message">Sección no encontrada</div>';
      }

      // Render content
      contentContainer.innerHTML = componentHtml;
      
      // Pequeña pausa para asegurar que el DOM se ha actualizado
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Load and initialize scripts primero para que los componentes puedan registrar sus propios manejadores
      await this.initializeSectionScripts(sectionName);
      
      // Setup preview panel event listeners (now that preview is in DOM)
      this.setupPreviewPanel();
      
      // Después inicializamos los acordeones
      this.setupFormSectionsAccordion();
      
      // Re-apply context to forms after scripts initialize so values persist across navigation
      try { this.applyCtxToForms(); } catch (e) { console.warn('applyCtxToForms failed', e); }
      
      // Asegurarse de que todos los acordeones empiecen colapsados en todas las secciones
      try { 
        this.collapseFormSectionsIn(contentContainer);
      } catch (e) { 
        console.warn('collapseFormSectionsIn failed', e); 
      }
      
      // Forzar un reflow para que los cambios en el DOM se apliquen correctamente
      contentContainer.offsetHeight;
      
      // Dar otra pequeña pausa para que todo se estabilice
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Update current section
      this.currentSection = sectionName;
      
      // Update navigation
      this.updateSectionNavigation(sectionName);
      
      // Apply fade-in effect
      contentContainer.classList.add('fade-in');
      setTimeout(() => contentContainer.classList.remove('fade-in'), 300);
      
    } catch (error) {
      console.error('Error rendering section:', error);
      contentContainer.innerHTML = '<div class="error-message">Error cargando la sección</div>';
    }
  }

  // Apply current context (persona/contrato) to any visible forms and update preview
  applyCtxToForms() {
    try {
      if (this.ctx && this.ctx.persona) {
    console.log('Re-aplicando ctx.persona a formularios visibles');
        this.fillPersonaForm(this.ctx.persona);
      }
      if (this.ctx && this.ctx.contrato) {
  console.log('Re-aplicando ctx.contrato a formularios visibles');
        this.fillContratoForm(this.ctx.contrato);
      }

      // Ensure preview panel is updated after filling forms
      this.updatePreviewPanel();
    } catch (e) {
      console.warn('applyCtxToForms error', e);
    }
  }

  // Approximate number of months between two dates (a, b can be strings or Date)
  approxMonthsBetween(a, b){
    try{
      if(!a || !b) return '';
      const da = new Date(a);
      const db = new Date(b);
      if(isNaN(da.getTime()) || isNaN(db.getTime())) return '';
      const years = db.getFullYear() - da.getFullYear();
      const months = db.getMonth() - da.getMonth();
      const total = years * 12 + months + (db.getDate() >= da.getDate() ? 0 : -1);
      return Math.max(0, total).toString();
    }catch(e){ return ''; }
  }

  // Initialize section scripts
  async initializeSectionScripts(sectionName) {
    if (this.currentComponentInstances) {
      Object.values(this.currentComponentInstances).forEach(inst => {
        if (inst && typeof inst.destroy === 'function') {
          try {
            inst.destroy();
          } catch (error) {
            console.warn('No se pudo destruir un componente previo', error);
          }
        }
      });
    }

    const componentInstances = {};
    
    switch (sectionName) {
      case 'contractual':
        const DatosBasicos = await this.loadComponentScript('datos-basicos');
        const Contratos = await this.loadComponentScript('contratos');
  const ContractualObligaciones = await this.loadComponentScript('contractual-obligaciones');
  const ContractualModificaciones = await this.loadComponentScript('contractual-modificaciones');
        
        if (DatosBasicos) {
          componentInstances.datosBasicos = new DatosBasicos(this);
        }
        if (Contratos) {
          componentInstances.contratos = new Contratos(this);
        }
        if (ContractualObligaciones) {
          componentInstances.contractualObligaciones = new ContractualObligaciones(this);
        }
        if (ContractualModificaciones) {
          componentInstances.contractualModificaciones = new ContractualModificaciones(this);
        }
        break;
        
      case 'cuentas-cobro':
        const Obligaciones = await this.loadComponentScript('obligaciones');
        const Pagos = await this.loadComponentScript('pagos');
        
        if (Obligaciones) {
          componentInstances.obligaciones = new Obligaciones(this);
        }
        if (Pagos) {
          componentInstances.pagos = new Pagos(this);
        }
        break;
        
      case 'precontractual':
        const Precontractual = await this.loadComponentScript('precontractual');
        const PrecontractualPreview = await this.loadComponentScript('precontractual-preview');
        if (Precontractual) {
          componentInstances.precontractual = new Precontractual(this);
        }
        if (PrecontractualPreview) {
          componentInstances.precontractualPreview = new PrecontractualPreview(this);
        }
        break;
        
      case 'configuracion':
        const Roles = await this.loadComponentScript('roles');
        if (Roles) {
          componentInstances.roles = new Roles(this);
        }
        break;
    }

    // Store component instances for cleanup
    this.currentComponentInstances = componentInstances;
    
  // Ensure accordion functionality is setup again after scripts load
  this.setupFormSectionsAccordion();

    // Re-initialize common functionality
    this.initializeCommonFeatures();
  }

  // Initialize common features
  initializeCommonFeatures() {
    // Form section toggles
    this.initFormSectionToggles();
    
    // Context management
    this.updateContextUI();
    
    // Load personas
    this.loadPersonasList();
    
  // Form bindings
  this.initFormBindings();

    // Bind preview editable fields to forms and context
    this.initPreviewEditableBindings();

    // Global save button (replaces previous navigation dropdown)
    try {
      const saveBtn = document.getElementById('navSaveButton');
      if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
          toast('info', 'Guardando cambios...', 1500);
          // Try to find a visible save button inside current loaded components
          // Prioritize component-level submit buttons with data-action="save"
          const compSave = document.querySelector('.form-panel-section .btn-save, [data-action="save"]');
          if (compSave) {
            compSave.click();
            toast('success', 'Guardado (componente)', 2000);
            return;
          }

          // Fallback: find a form in the visible content and submit it
          const form = document.querySelector('#dynamic-content form');
          if (form) {
            // If the form has a submit button, click it; else submit programmatically
            const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
            if (submitBtn) {
              submitBtn.click();
              toast('success', 'Guardado (formulario)', 2000);
            } else {
              form.dispatchEvent(new Event('submit', { bubbles: true }));
              toast('success', 'Guardado (formulario)', 2000);
            }
            return;
          }

          // Last resort: call component-level save methods if exposed
          if (this.currentComponentInstances) {
            Object.values(this.currentComponentInstances).forEach(inst => {
              if (inst && typeof inst.save === 'function') {
                try { inst.save(); } catch (e) { console.warn('component save failed', e); }
              }
            });
          }
        });
      }
    } catch (e) { console.warn('navSaveButton init failed', e); }

  }

  // Initialize bindings for editable preview fields
  initPreviewEditableBindings() {
    const inputs = document.querySelectorAll('.preview-input');
    if (!inputs || !inputs.length) return;

    const debouncedUpdate = debounce(async (name, value) => {
      try {
        // Update context and form fields where applicable
        switch (name) {
          case 'preview-nombre':
            this.ctx.persona = this.ctx.persona || {};
            this.ctx.persona.Nombre = value;
            // update persona form
            const pName = document.getElementById('p_Nombre'); if (pName) pName.value = value;
            // Persist change
            if (this.ctx.persona && (this.ctx.persona.persona_id || this.ctx.persona.id)) {
              try { await this.apiFetch('upsertPersona', this.ctx.persona); } catch (e) { console.warn('upsertPersona failed', e); }
            }
            break;
          case 'preview-identificacion':
            this.ctx.persona = this.ctx.persona || {};
            this.ctx.persona.Identificacion = value;
            const pId = document.getElementById('p_Identificacion'); if (pId) pId.value = value;
            if (this.ctx.persona && (this.ctx.persona.persona_id || this.ctx.persona.id)) {
              try { await this.apiFetch('upsertPersona', this.ctx.persona); } catch (e) { console.warn('upsertPersona failed', e); }
            }
            break;
          case 'preview-correo':
            this.ctx.persona = this.ctx.persona || {};
            this.ctx.persona.Correo = value;
            const pCorreo = document.getElementById('p_Correo'); if (pCorreo) pCorreo.value = value;
            if (this.ctx.persona && (this.ctx.persona.persona_id || this.ctx.persona.id)) {
              try { await this.apiFetch('upsertPersona', this.ctx.persona); } catch (e) { console.warn('upsertPersona failed', e); }
            }
            break;
          case 'preview-grupo-oapi':
            this.ctx.persona = this.ctx.persona || {};
            this.ctx.persona.Grupo_OAPI = value;
            const pGrupo = document.getElementById('p_Grupo_OAPI'); if (pGrupo) pGrupo.value = value;
            if (this.ctx.persona && (this.ctx.persona.persona_id || this.ctx.persona.id)) {
              try { await this.apiFetch('upsertPersona', this.ctx.persona); } catch (e) { console.warn('upsertPersona failed', e); }
            }
            break;
          case 'preview-perfil':
            this.ctx.persona = this.ctx.persona || {};
            this.ctx.persona.Perfil = value;
            const pPerfil = document.getElementById('p_Perfil'); if (pPerfil) pPerfil.value = value;
            if (this.ctx.persona && (this.ctx.persona.persona_id || this.ctx.persona.id)) {
              try { await this.apiFetch('upsertPersona', this.ctx.persona); } catch (e) { console.warn('upsertPersona failed', e); }
            }
            break;
          // Contract fields
          case 'preview-contrato':
          case 'preview-tipo-vinculacion':
          case 'preview-inicio-contrato':
          case 'preview-fin-contrato':
          case 'preview-plazo':
          case 'preview-valor-total':
          case 'preview-valor-mensual':
          case 'preview-cdp':
          case 'preview-fecha-cdp':
          case 'preview-rc':
          case 'preview-fecha-rc':
            // For contract edits, update form fields and try to upsert contrato
            this.ctx.contrato = this.ctx.contrato || {};
            // Map preview id -> contrato property
            const map = {
              'preview-contrato': 'Numero_contrato',
              'preview-tipo-vinculacion': 'Tipo_vinculacion',
              'preview-inicio-contrato': 'Inicio',
              'preview-fin-contrato': 'Fin',
              'preview-plazo': 'Plazo_meses',
              'preview-valor-total': 'Valor_total',
              'preview-valor-mensual': 'Valor_mensual',
              'preview-cdp': 'Numero_CDP',
              'preview-fecha-cdp': 'Fecha_CDP',
              'preview-rc': 'Numero_RC',
              'preview-fecha-rc': 'Fecha_RC'
            };
            const prop = map[name];
            if (prop) this.ctx.contrato[prop] = value;
            // Update corresponding form input if present
            const formIdMap = {
              'Numero_contrato': 'c_Numero_contrato',
              'Tipo_vinculacion': 'c_Tipo_vinculacion',
              'Inicio': 'c_Inicio',
              'Fin': 'c_Fin',
              'Plazo_meses': 'c_Plazo_meses',
              'Valor_total': 'c_Valor_total',
              'Valor_mensual': 'c_Valor_mensual',
              'Numero_CDP': 'c_Numero_CDP',
              'Fecha_CDP': 'c_Fecha_CDP',
              'Numero_RC': 'c_Numero_RC',
              'Fecha_RC': 'c_Fecha_RC'
            };
            if (prop && formIdMap[prop]) {
              const el = document.getElementById(formIdMap[prop]);
              if (el) el.value = value;
            }
            if (this.ctx.contrato && (this.ctx.contrato.contrato_id || this.ctx.contrato.id)) {
              try { await this.apiFetch('upsertContrato', this.ctx.contrato); } catch (e) { console.warn('upsertContrato failed', e); }
            }
            break;
        }

        // Save context after changes
        try { this.saveCtx(); } catch (e) {}
        // Update top UI and preview consistency
        try { this.updateContextUI(); } catch (e) {}
      } catch (err) {
        console.warn('preview-input update failed', err);
      }
    }, 600);

    inputs.forEach(inp => {
      // init value from current preview text/content if needed
      const id = inp.id;
      // attach listener
      inp.addEventListener('input', (e) => {
        debouncedUpdate(id, e.target.value);
      });
      // for date-like fields we may also want change
      inp.addEventListener('change', (e) => {
        debouncedUpdate(id, e.target.value);
      });
    });
  }

  // Collapse all .form-section elements inside a container
  collapseFormSectionsIn(container) {
    if (!container) return;
    const formSections = container.querySelectorAll('.form-section');
    formSections.forEach(fs => {
      const content = fs.querySelector('.form-section-content');
      if (content) {
        // prefer manipulating classes used by the rest of the code
        content.style.display = 'none';
        content.classList.remove('expanded');
      }
      const icon = fs.querySelector('.toggle-icon');
      if (icon) icon.textContent = 'expand_more';
      fs.classList.remove('active');
      try { fs.setAttribute('aria-expanded', 'false'); } catch (e) {}
    });
  }

  // Form section toggles
  initFormSectionToggles() {
    const headers = document.querySelectorAll('.form-section-header');
    headers.forEach(header => {
      const toggleIcon = header.querySelector('.toggle-icon');
      const content = header.nextElementSibling;
      
      if (toggleIcon && content) {
        header.addEventListener('click', () => {
          const isCollapsed = content.style.display === 'none';
          content.style.display = isCollapsed ? 'block' : 'none';
          toggleIcon.textContent = isCollapsed ? 'expand_less' : 'expand_more';
        });
      }
    });
  }

  // Context management
  updateContextUI() {
    const p = this.ctx.persona;
    const c = this.ctx.contrato;
    
    const elNombre = document.getElementById('ctxPersonaNombre');
    const elIdent = document.getElementById('ctxPersonaIdent');
    const elPid = document.getElementById('ctxPersonaId');
    const elCnum = document.getElementById('ctxContratoNum');
    const elCid = document.getElementById('ctxContratoId');
    
    if (elNombre) elNombre.textContent = p ? (p.Nombre || p.name || '-') : '-';
    if (elIdent) elIdent.textContent = p ? this.formatIdWithDots(p.Identificacion || p.identificacion || '') : '';
    if (elPid) elPid.textContent = p ? (p.persona_id || p.id || '-') : '-';
    if (elCnum) elCnum.textContent = c ? (c.Numero_contrato || c.numero || '-') : '-';
    if (elCid) elCid.textContent = c ? (c.contrato_id || c.id || '-') : '-';

    // Fill readonly FK inputs
    const personaIdInputs = document.querySelectorAll('input[name="persona_id"]');
    personaIdInputs.forEach(i => {
      if (this.ctx.persona) {
        i.value = this.ctx.persona.persona_id || this.ctx.persona.id || '';
        i.readOnly = true;
        i.classList.add('bg-gray-50');
      } else {
        i.value = '';
        i.readOnly = false;
        i.classList.remove('bg-gray-50');
      }
    });

    try {
      const contextEvent = new CustomEvent('admin:context-updated', {
        detail: {
          persona: this.ctx.persona || null,
          contrato: this.ctx.contrato || null
        }
      });
      document.dispatchEvent(contextEvent);
    } catch (error) {
      console.warn('No se pudo notificar el cambio de contexto (versión resumida)', error);
    }
  }

  // Section navigation
  updateSectionNavigation(activeSection) {
    const navItems = document.querySelectorAll('.section-nav-item');
    navItems.forEach(item => {
      item.classList.toggle('active', item.dataset.section === activeSection);
    });
  }

  // Form bindings (basic structure)
  initFormBindings() {
    // Context persona toggle
    const ctxPersonaToggle = document.getElementById('ctxPersonaToggle');
    if (ctxPersonaToggle) {
      ctxPersonaToggle.addEventListener('click', () => {
        this.togglePersonaDropdown();
      });
    }

    // Context persona reload button
    const ctxPersonaReload = document.getElementById('ctxPersonaReload');
    if (ctxPersonaReload) {
      ctxPersonaReload.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent dropdown from closing
        this.reloadPersonasList();
      });
    }

    // Reset form button
    const btnResetForm = document.getElementById('btnResetForm');
    if (btnResetForm) {
      btnResetForm.addEventListener('click', () => {
        this.resetAllForms();
      });
    }
  }

  // Utility functions
  formatIdWithDots(id) {
    if (!id) return '';
    return id.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  addApiLogEntry(entry) {
    try {
      const ts = (new Date()).toISOString();
      this.__apiLogs.unshift(Object.assign({ ts }, entry));
      if (this.__apiLogs.length > 20) this.__apiLogs.length = 20;
    } catch (e) {}
  }

  renderApiLogsPanel() {
    // Implementation for API logs panel
    // This will be expanded based on the original functionality
  }

  togglePersonaDropdown() {
    const dropdown = document.getElementById('ctxPersonaDropdown');
    if (dropdown) {
      dropdown.classList.toggle('hidden');
    }
  }

  resetAllForms() {
    // If suppression flag is set, avoid performing a reset (defensive)
    if (this._suppressAutoClear) {
      console.log('resetAllForms suppressed due to in-progress selection');
      return;
    }
    if (window._globalSuppressClear) {
      console.log('resetAllForms suppressed due to global suppression flag');
      return;
    }
    // If test-suite auto-run is enabled or currently running, avoid clearing
    if (window.ADMIN_TESTS_AUTORUN === true || window._adminTestSuiteRunning === true) {
      console.log('resetAllForms suppressed because tests are/should be running');
      return;
    }
    // Trace caller for debugging unexpected resets
    console.trace('resetAllForms called');
    // Create a snapshot so we can undo the reset
    const snapshot = {
      ctx: JSON.parse(JSON.stringify(this.ctx || {})),
      forms: []
    };

    const forms = Array.from(document.querySelectorAll('form'));
    forms.forEach(form => {
      const data = { id: form.id || null, fields: {} };
      const elements = Array.from(form.querySelectorAll('input,select,textarea'));
      elements.forEach(el => {
        if (!el.name) return;
        if (el.type === 'checkbox' || el.type === 'radio') data.fields[el.name] = el.checked;
        else data.fields[el.name] = el.value;
      });
      snapshot.forms.push(data);
    });

    // Perform the actual reset, but skip individual forms if suppression flags are active
    forms.forEach(form => {
      if (this._suppressAutoClear || window._globalSuppressClear || window.ADMIN_TESTS_AUTORUN === true || window._adminTestSuiteRunning === true) {
        console.log('Skipping reset for form', form.id || form.name || form);
        return;
      }
      try { form.reset(); } catch (e) { console.warn('form.reset failed for', form.id, e); }
    });

    // Clear runtime context
    this.ctx = { persona: null, contrato: null };
    try { this.saveCtx(); } catch (e) { console.warn('saveCtx failed', e); }
    try { this.updateContextUI(); } catch (e) { console.warn('updateContextUI failed', e); }

    // Ensure preview panel is cleared/updated
    try {
      this.updatePreviewPanel();
      if (typeof window.updatePreview === 'function') window.updatePreview();
    } catch (e) { console.warn('updatePreview failed', e); }

    // Close persona dropdowns/modals and deselect list items
    try {
      const ctxDropdown = document.getElementById('ctxPersonaDropdown');
      if (ctxDropdown) ctxDropdown.classList.add('hidden');
      const lookupModal = document.getElementById('modalLookupPersona');
      if (lookupModal && typeof closeModal === 'function') closeModal('modalLookupPersona');

      const toggleLabel = document.getElementById('ctxPersonaToggleLabel');
      if (toggleLabel) toggleLabel.textContent = 'Seleccionar persona';

      const hiddenPersona = document.getElementById('p_persona_id');
      if (hiddenPersona) hiddenPersona.value = '';
      document.querySelectorAll('input[name="persona_id"]').forEach(i => { i.value = ''; i.readOnly = false; i.classList.remove('bg-gray-50'); });

      document.querySelectorAll('#ctxPersonaList .persona-item.active, #lookupResults .persona-item.active, #ctxPersonaList .p-2.persona-item.active').forEach(el => el.classList.remove('active'));

      const emptyPreview = document.getElementById('emptyPreview');
      const contractorPreview = document.getElementById('contractorPreview');
      if (emptyPreview && contractorPreview) {
        emptyPreview.classList.remove('hidden');
        contractorPreview.classList.add('hidden');
      }
    } catch (e) { console.warn('cleanup UI after reset failed', e); }

    // Show undo toast
    try {
      const container = document.getElementById('toastContainer');
      if (container) {
        const el = document.createElement('div');
        el.className = 'max-w-sm w-full px-4 py-2 rounded shadow text-sm flex items-center justify-between gap-3 bg-gray-50 text-gray-800';
        const msg = document.createElement('div');
        msg.textContent = 'Formulario limpiado';
        const undoBtn = document.createElement('button');
        undoBtn.className = 'ml-3 px-3 py-1 bg-blue-600 text-white rounded text-xs';
        undoBtn.textContent = 'Deshacer';
        el.appendChild(msg);
        el.appendChild(undoBtn);
        container.appendChild(el);

        let removed = false;
        const removeEl = () => { if (removed) return; removed = true; el.classList.add('opacity-0'); setTimeout(()=> el.remove(), 300); };

        const timeout = setTimeout(() => { removeEl(); }, 6000);

        undoBtn.addEventListener('click', () => {
          // Restore context
          try {
            this.ctx = JSON.parse(JSON.stringify(snapshot.ctx || {}));
            try { this.saveCtx(); } catch (e) { console.warn('saveCtx on undo failed', e); }
            try { this.updateContextUI(); } catch (e) {}

            // Restore forms
            snapshot.forms.forEach(fsnap => {
              if (!fsnap.id) return;
              const form = document.getElementById(fsnap.id);
              const targetForm = form || document.querySelector(`form`);
              if (!targetForm) return;
              Object.keys(fsnap.fields || {}).forEach(name => {
                const els = Array.from(targetForm.querySelectorAll(`[name="${name}"]`));
                els.forEach(elm => {
                  if (elm.type === 'checkbox' || elm.type === 'radio') elm.checked = !!fsnap.fields[name];
                  else elm.value = fsnap.fields[name];
                  elm.dispatchEvent(new Event('change', { bubbles: true }));
                });
              });
            });

            // Update preview
            try { this.updatePreviewPanel(); } catch (e) {}
            if (typeof window.updatePreview === 'function') window.updatePreview();
          } catch (e) { console.warn('undo restore failed', e); }

          clearTimeout(timeout);
          removeEl();
        });
      } else {
        // fallback to simple toast
        toast('info', 'Formulario limpiado');
      }
    } catch (e) { console.warn('undo toast failed', e); }
  }

  saveCtx() {
    localStorage.setItem(this.CTX_KEY, JSON.stringify(this.ctx));
  }

  loadCtx() {
    // Use the existing loadContext method
    this.loadContext();
  }

  // Setup preview panel event listeners (now that preview is part of dual-panel)
  setupPreviewPanel() {
    try {
      // Configuramos el botón de cierre en móviles
      const closeBtn = document.getElementById('previewCloseBtn');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          const previewPanel = document.getElementById('previewPanel');
          if (previewPanel) {
            previewPanel.classList.add('hidden');
          }
        });
      }
    } catch (error) {
      console.error('Error setting up preview panel:', error);
    }
  }

  // Initialize the admin system
  async init() {
  // Per UX: on page load behave like "Limpiar" - enable by default so reload clears context
  // If you want to opt-out, set window.ADMIN_CLEAR_ON_LOAD = false before DOMContentLoaded
  try {
    if (typeof window.ADMIN_CLEAR_ON_LOAD === 'undefined') window.ADMIN_CLEAR_ON_LOAD = true;
    const clearOnLoad = window.ADMIN_CLEAR_ON_LOAD === true || window.ADMIN_CLEAR_ON_LOAD === 'true';
    if (clearOnLoad) {
      // (reload should act as reset)
      this.clearContextSilently();
      // Then clear any test data that might have been persisted (no-ops if already clean)
      this.clearTestData();
    } else {
      console.log('admin-main: clearOnLoad explicitly disabled (set window.ADMIN_CLEAR_ON_LOAD = true to enable)');
    }
  } catch (e) { console.warn('init clearOnLoad check failed', e); }

    // Initialize sidebar
    initSidebar();

    // Setup preview panel handlers (preview now integrated in dual-panel)
    this.setupPreviewPanel();

    // Setup section navigation
    const navItems = document.querySelectorAll('.section-nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', async () => {
        // Remove active class from all items
        navItems.forEach(navItem => navItem.classList.remove('active'));
        // Add active class to clicked item
        item.classList.add('active');
        
        const section = item.dataset.section;
        await this.renderSection(section);
      });
    });

    // Setup button actions
    this.setupButtonActions();

    // Load initial section
    await this.renderSection(this.currentSection);

    // Initialize API logs panel
    this.renderApiLogsPanel();

    // Setup navigation dropdown
    this.setupNavigationDropdown();

    // Load personas list for dropdown
    await this.loadPersonasList();

    console.log('Admin system initialized');
  }

  // Clear test data from UI and context
  clearTestData() {
    // If a user-driven selection is in progress, skip automatic clears
    if (this._suppressAutoClear) {
      console.log('clearTestData suppressed due to in-progress selection');
      console.trace('clearTestData suppressed');
      return;
    }
    if (window._globalSuppressClear) {
      console.log('clearTestData suppressed due to global suppression flag');
      return;
    }
    // Also skip if test-suite is running or auto-run enabled (we don't want tests to clear live selections)
    if (window.ADMIN_TESTS_AUTORUN === true || window._adminTestSuiteRunning === true) {
      console.log('clearTestData suppressed because tests are/should be running');
      return;
    }

    // Clear any test data from context
    if (this.ctx.persona && (this.ctx.persona.nombre === 'Test' || this.ctx.persona.name === 'Test')) {
      this.ctx.persona = null;
    }
    if (this.ctx.contrato && (this.ctx.contrato.objeto === 'Test Contract' || this.ctx.contrato.name === 'Test Contract')) {
      this.ctx.contrato = null;
    }
    
    // Save clean context
    this.saveContext();
    
    // Force update UI
    this.updateContextUI();
    
  console.log('Test data cleared from context and UI');
  }

  // Setup button actions
  setupButtonActions() {
    // Setup save button
    const saveButton = document.getElementById('navSaveButton');
    if (saveButton) {
      saveButton.addEventListener('click', () => {
        this.handleSaveAction();
      });
    }
    
    // Setup reset form button
    const resetButton = document.getElementById('btnResetForm');
    if (resetButton) {
      resetButton.addEventListener('click', () => {
        this.handleResetForm();
      });
    }
    
    // Setup persona toggle dropdown
    const personaToggle = document.getElementById('ctxPersonaToggle');
    const personaDropdown = document.getElementById('ctxPersonaDropdown');
    
    if (personaToggle && personaDropdown) {
      personaToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        personaDropdown.classList.toggle('hidden');
      });
      
      // Close dropdown when clicking outside
      document.addEventListener('click', (e) => {
        if (!personaToggle.contains(e.target) && !personaDropdown.contains(e.target)) {
          personaDropdown.classList.add('hidden');
        }
      });
      
      // Setup search in dropdown
      const searchInput = document.getElementById('ctxPersonaSearch');
      if (searchInput) {
        searchInput.addEventListener('input', debounce(() => {
          this.filterPersonasList(searchInput.value);
        }, 300));
      }
      
      // Setup load more button
      const loadMoreButton = document.getElementById('ctxPersonaLoadMore');
      if (loadMoreButton) {
        loadMoreButton.addEventListener('click', () => {
          this.loadMorePersonas();
        });
      }
    }
  }
  
  // Handle save action for active form
  async handleSaveAction() {
    try {
      const activeSection = this.currentSection;
      let component = null;
      
      switch (activeSection) {
        case 'contractual':
          if (this.currentComponentInstances?.datosBasicos) {
            await this.currentComponentInstances.datosBasicos.handleSave();
          }
          if (this.currentComponentInstances?.contratos) {
            await this.currentComponentInstances.contratos.handleSave();
          }
          if (this.currentComponentInstances?.contractualObligaciones) {
            await this.currentComponentInstances.contractualObligaciones.handleSave();
          }
          toast('Datos guardados correctamente', 'success');
          break;
        case 'cuentas-cobro':
          if (this.currentComponentInstances?.obligaciones) {
            await this.currentComponentInstances.obligaciones.handleSave();
          }
          if (this.currentComponentInstances?.pagos) {
            await this.currentComponentInstances.pagos.handleSave();
          }
          toast('Datos guardados correctamente', 'success');
          break;
        case 'precontractual':
          if (this.currentComponentInstances?.precontractual) {
            await this.currentComponentInstances.precontractual.handleSave();
          }
          toast('Datos guardados correctamente', 'success');
          break;
        case 'configuracion':
          if (this.currentComponentInstances?.roles) {
            await this.currentComponentInstances.roles.handleSave();
          }
          toast('Configuración guardada correctamente', 'success');
          break;
        default:
          toast('No hay formulario activo para guardar', 'warning');
      }
    } catch (error) {
      console.error('Error guardando datos:', error);
      toast('Error al guardar: ' + error.message, 'error');
    }
  }
  
  // Handle reset form action
  handleResetForm() {
    try {
      // Clear context
  this.ctx = { persona: null, contrato: null, modificaciones: [] };
      this.saveContext();
      
      // Update UI
      this.updateContextUI();
      
      // Reset any visible forms
      this.resetActiveForms();
      
      toast('Formulario limpiado correctamente', 'info');
    } catch (error) {
      console.error('Error reseteando formulario:', error);
      toast('Error al resetear formulario', 'error');
    }
  }
  
  // Reset all active forms in the current section
  resetActiveForms() {
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
      form.reset();
    });
  }

  // Setup navigation dropdown functionality
  setupNavigationDropdown() {
    const dropdownButton = document.getElementById('navDropdown');
    const dropdownMenu = document.getElementById('navDropdownMenu');

    if (dropdownButton && dropdownMenu) {
      dropdownButton.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownMenu.classList.toggle('hidden');
      });

      // Close dropdown when clicking outside
      document.addEventListener('click', (e) => {
        if (!dropdownButton.contains(e.target) && !dropdownMenu.contains(e.target)) {
          dropdownMenu.classList.add('hidden');
        }
      });

      // Close dropdown when clicking on menu items
      dropdownMenu.addEventListener('click', () => {
        dropdownMenu.classList.add('hidden');
      });
    }
  }

  // Context management methods
  saveContext() {
    try {
      localStorage.setItem(this.CTX_KEY, JSON.stringify(this.ctx));
    } catch (error) {
      console.error('Error saving context:', error);
    }
  }

  loadContext() {
    try {
      const stored = localStorage.getItem(this.CTX_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Defensive: filter out test/mocked persona or contrato persisted accidentally
        if (parsed.persona) {
          const name = (parsed.persona.nombre || parsed.persona.Nombre || parsed.persona.name || '').toString().toLowerCase();
          const id = Number(parsed.persona.persona_id || parsed.persona.id || parsed.persona.ID || 0);
          if (name.includes('test') || id === 1) {
            parsed.persona = null;
          }
        }
        if (parsed.contrato) {
          const cnum = (parsed.contrato.Numero_contrato || parsed.contrato.numero || parsed.contrato.objeto || '').toString().toLowerCase();
          const cid = Number(parsed.contrato.contrato_id || parsed.contrato.id || 0);
          if (cnum.includes('test') || cid === 1) {
            parsed.contrato = null;
          }
        }

        this.ctx = Object.assign({ persona: null, contrato: null, modificaciones: [] }, parsed);
        if (!Array.isArray(this.ctx.modificaciones)) {
          this.ctx.modificaciones = [];
        }
        this.updateContextUI();
      }
    } catch (error) {
      console.error('Error loading context:', error);
    }
  }

  // Clear context silently on page load without showing undo toast
  clearContextSilently() {
    // If a user-driven selection is in progress, skip automatic clears
    if (this._suppressAutoClear) {
      console.log('clearContextSilently suppressed due to in-progress selection');
      console.trace('clearContextSilently suppressed');
      return;
    }
    if (window._globalSuppressClear) {
      console.log('clearContextSilently suppressed due to global suppression flag');
      return;
    }
    // Also skip if tests are running
    if (window.ADMIN_TESTS_AUTORUN === true || window._adminTestSuiteRunning === true) {
      console.log('clearContextSilently suppressed because tests are/should be running');
      return;
    }

    try {
      this.ctx = { persona: null, contrato: null };
      // persist cleared context
      try { this.saveContext(); } catch (e) { console.warn('saveContext failed', e); }
      // update UI components
      try { this.updateContextUI(); } catch (e) { console.warn('updateContextUI failed', e); }

      // Clear preview panel if present
      try {
        this.updatePreviewPanel();
        const ctxDropdown = document.getElementById('ctxPersonaDropdown');
        if (ctxDropdown) ctxDropdown.classList.add('hidden');
        const toggleLabel = document.getElementById('ctxPersonaToggleLabel');
        if (toggleLabel) toggleLabel.textContent = 'Seleccionar persona';
        const hiddenPersona = document.getElementById('p_persona_id');
        if (hiddenPersona) hiddenPersona.value = '';
      } catch (e) { console.warn('silent cleanup failed', e); }
    } catch (e) {
      console.warn('clearContextSilently failed', e);
    }
  }

  updateContextUI() {
  console.log('updateContextUI llamado, contexto actual:', this.ctx);
    
    // Update persona context display in top bar
    if (this.ctx.persona) {
      const nombreEl = document.getElementById('ctxPersonaNombre');
      const identEl = document.getElementById('ctxPersonaIdent');
      const idEl = document.getElementById('ctxPersonaId');
      
      const nombre = this.ctx.persona.nombre || this.ctx.persona.Nombre || this.ctx.persona.name || 'Sin nombre';
      const ident = this.ctx.persona.identificacion || this.ctx.persona.Identificacion || this.ctx.persona.id || 'Sin ID';
      const personaId = this.ctx.persona.persona_id || this.ctx.persona.id || this.ctx.persona.ID || 'Sin ID';
      
  console.log('Actualizando barra superior:', { nombre, ident, personaId });
      
      if (nombreEl) {
        nombreEl.textContent = nombre;
  console.log('Nombre actualizado en barra:', nombre);
      } else {
    console.error('Elemento ctxPersonaNombre no encontrado');
      }
      
      if (identEl) {
        identEl.textContent = ident;
  console.log('Identificación actualizada en barra:', ident);
      }
      
      if (idEl) {
        idEl.textContent = personaId;
  console.log('ID actualizado en barra:', personaId);
      }
    } else {
      // Clear context if no persona selected
      const nombreEl = document.getElementById('ctxPersonaNombre');
      const identEl = document.getElementById('ctxPersonaIdent');
      const idEl = document.getElementById('ctxPersonaId');
      
      if (nombreEl) nombreEl.textContent = '-';
      if (identEl) identEl.textContent = '-';
      if (idEl) idEl.textContent = '-';
      
  console.log('Contexto de persona limpiado');
    }

    // Update contrato context display in top bar
    if (this.ctx.contrato) {
      const contratoNumEl = document.getElementById('ctxContratoNum');
      const contratoIdEl = document.getElementById('ctxContratoId');
      
      // Try multiple field names for contract number
      const contratoNum = this.ctx.contrato.numero_contrato || 
                         this.ctx.contrato.Numero_contrato || 
                         this.ctx.contrato.numero || 
                         this.ctx.contrato.Numero ||
                         this.ctx.contrato.objeto || 
                         this.ctx.contrato.Objeto ||
                         this.ctx.contrato.name || 
                         'Sin número';
      const contratoId = this.ctx.contrato.contrato_id || this.ctx.contrato.id || 'Sin ID';
      
  console.log('Actualizando contrato en barra:', { contratoNum, contratoId });
  console.log('Datos completos del contrato:', this.ctx.contrato);
      
      if (contratoNumEl) {
        contratoNumEl.textContent = contratoNum;
  console.log('Número de contrato actualizado:', contratoNum);
      }
      
      if (contratoIdEl) {
        contratoIdEl.textContent = contratoId;
  console.log('ID de contrato actualizado:', contratoId);
      }
    } else {
      // Clear context if no contrato selected
      const contratoNumEl = document.getElementById('ctxContratoNum');
      const contratoIdEl = document.getElementById('ctxContratoId');
      
      if (contratoNumEl) contratoNumEl.textContent = '-';
      if (contratoIdEl) contratoIdEl.textContent = '-';
      
  console.log('Contexto de contrato limpiado');
    }

    // Update legacy displays if they exist
    const personaDisplay = document.getElementById('current-persona');
    if (personaDisplay && this.ctx.persona) {
      personaDisplay.textContent = this.ctx.persona.nombre || 'Sin nombre';
    }

    const contratoDisplay = document.getElementById('current-contrato');
    if (contratoDisplay && this.ctx.contrato) {
      contratoDisplay.textContent = this.ctx.contrato.objeto || 'Sin objeto';
    }

    try {
      const contextEvent = new CustomEvent('admin:context-updated', {
        detail: {
          persona: this.ctx.persona || null,
          contrato: this.ctx.contrato || null
        }
      });
      document.dispatchEvent(contextEvent);
    } catch (error) {
      console.warn('No se pudo notificar el cambio de contexto', error);
    }
  }

  // Load personas list
  async loadPersonasList() {
    try {
  console.log('Iniciando carga de personas desde Google Sheets...');
      const result = await this.apiFetch('listPersonas', {});
      
  console.log('Respuesta COMPLETA del backend:', JSON.stringify(result, null, 2));
      
      if (result && result.ok && result.items) {
        const personas = Array.isArray(result.items) ? result.items : [];
        // Filter out obvious test/mock entries
        const filtered = personas.filter(p => {
          const name = (p.nombre || p.Nombre || p.name || '').toString().toLowerCase();
          const id = Number(p.persona_id || p.id || p.ID || 0);
          if (!name) return true;
          if (name.includes('test')) return false;
          if (id === 1) return false;
          return true;
        });
  console.log('Personas encontradas (raw):', personas.length, 'filtered:', filtered.length);
        this._personasDataset = filtered;
        const searchInput = document.getElementById('ctxPersonaSearch');
        const currentQuery = searchInput ? searchInput.value : '';
        if (currentQuery && currentQuery.trim()) {
          this.filterPersonasList(currentQuery);
        } else {
          this._filteredPersonas = [...filtered];
          this._personasVisibleLimit = this._personasVisibleStep;
          this.renderPersonasDropdown();
        }
      } else {
  console.error('Error en la estructura de respuesta:', result);
  console.log('Expected: { ok: true, items: [...] }');
  console.log('Received:', result);
        this._personasDataset = [];
        this._filteredPersonas = [];
        this._personasVisibleLimit = this._personasVisibleStep;
        this.renderPersonasDropdown();
      }
    } catch (error) {
  console.error('Error de red/conexión loading personas:', error);
      this._personasDataset = [];
      this._filteredPersonas = [];
      this._personasVisibleLimit = this._personasVisibleStep;
      this.renderPersonasDropdown();
    }
  }

  // Reload personas list with visual feedback
  async reloadPersonasList() {
  console.log('Recargando lista de personas...');
    
    // Show loading state
    const personaCount = document.getElementById('ctxPersonaCount');
    const reloadBtn = document.getElementById('ctxPersonaReload');
    
    if (personaCount) {
      personaCount.textContent = 'Recargando...';
    }
    
    if (reloadBtn) {
      reloadBtn.style.opacity = '0.5';
      reloadBtn.style.pointerEvents = 'none';
    }
    
    try {
      await this.loadPersonasList();
  console.log('Lista de personas recargada exitosamente');
      
      // Show success feedback briefly
      if (personaCount) {
        const originalText = personaCount.textContent;
        personaCount.textContent = '¡Actualizado!';
        personaCount.style.color = '#16a34a'; // green
        
        setTimeout(() => {
          personaCount.textContent = originalText;
          personaCount.style.color = '';
        }, 1500);
      }
    } catch (error) {
  console.error('Error al recargar personas:', error);
      if (personaCount) {
        personaCount.textContent = 'Error al recargar';
        personaCount.style.color = '#dc2626'; // red
        
        setTimeout(() => {
          personaCount.textContent = '0 personas';
          personaCount.style.color = '';
        }, 2000);
      }
    } finally {
      // Restore button state
      if (reloadBtn) {
        reloadBtn.style.opacity = '';
        reloadBtn.style.pointerEvents = '';
      }
    }
  }

  renderPersonasDropdown() {
    const personasToRender = Array.isArray(this._filteredPersonas)
      ? this._filteredPersonas.slice(0, this._personasVisibleLimit)
      : [];
    this.updatePersonaCount();
    this.populatePersonasDropdown(personasToRender);
    this.updateLoadMoreState();
  }

  updatePersonaCount() {
    const personaCount = document.getElementById('ctxPersonaCount');
    if (!personaCount) return;
    const total = Array.isArray(this._filteredPersonas) ? this._filteredPersonas.length : 0;
    if (!total) {
      personaCount.textContent = 'Sin resultados';
      return;
    }
    personaCount.textContent = total === 1 ? '1 persona' : `${total} personas`;
  }

  updateLoadMoreState() {
    const loadMoreButton = document.getElementById('ctxPersonaLoadMore');
    if (!loadMoreButton) return;
    const hasMore = Array.isArray(this._filteredPersonas) && this._filteredPersonas.length > this._personasVisibleLimit;
    if (hasMore) {
      loadMoreButton.classList.remove('hidden');
      loadMoreButton.disabled = false;
    } else {
      loadMoreButton.classList.add('hidden');
      loadMoreButton.disabled = true;
    }
  }

  findPersonaById(personaId) {
    if (!personaId) return null;
    if (personaId.startsWith('idx-')) {
      const idx = Number(personaId.slice(4));
      if (!Number.isNaN(idx) && Array.isArray(this._filteredPersonas) && this._filteredPersonas[idx]) {
        return this._filteredPersonas[idx];
      }
    }
    const dataset = Array.isArray(this._personasDataset) ? this._personasDataset : [];
    return dataset.find(p => {
      const possibleIds = [p.persona_id, p.id, p.ID, p.rowIndex];
      return possibleIds.some(val => val !== undefined && val !== null && val.toString() === personaId);
    }) || null;
  }

  filterPersonasList(query) {
    const dataset = Array.isArray(this._personasDataset) ? this._personasDataset : [];
    const trimmed = (query || '').trim();
    if (!dataset.length) {
      this._filteredPersonas = [];
      this._personasVisibleLimit = this._personasVisibleStep;
      this.renderPersonasDropdown();
      return;
    }
    if (!trimmed) {
      this._filteredPersonas = [...dataset];
    } else {
      this._filteredPersonas = simpleSearch(trimmed, dataset, {
        fields: ['nombre', 'Nombre', 'identificacion', 'Identificacion', 'persona_id', 'personaId', 'correo', 'email']
      });
    }
    this._personasVisibleLimit = this._personasVisibleStep;
    this.renderPersonasDropdown();
  }

  loadMorePersonas() {
    if (!Array.isArray(this._filteredPersonas) || !this._filteredPersonas.length) {
      this.updateLoadMoreState();
      return;
    }
    this._personasVisibleLimit += this._personasVisibleStep;
    this.renderPersonasDropdown();
  }

  // Populate personas dropdown
  populatePersonasDropdown(personas) {
  console.log('populatePersonasDropdown called with:', personas.length, 'personas');
    
    const personaDropdown = document.getElementById('ctxPersonaToggle');
    const personaList = document.getElementById('ctxPersonaList');
    
    if (personaList) {
      if (!personas.length) {
        personaList.innerHTML = '<div class="p-2 text-sm text-gray-500">Sin resultados</div>';
      } else {
    personaList.innerHTML = personas.map((persona, index) => {
  console.log(`Persona ${index}:`, JSON.stringify(persona, null, 2));
        
        // Try different possible field names
        const nombre = persona.nombre || persona.Nombre || persona.name || persona.Name || 'Sin nombre';
        const identificacion = persona.identificacion || persona.Identificacion || persona.id || persona.ID || persona.documento || 'Sin ID';
    const primaryId = persona.persona_id || persona.id || persona.ID || persona.rowIndex;
    const filteredIndex = Array.isArray(this._filteredPersonas) ? this._filteredPersonas.indexOf(persona) : index;
    const personaKeyBase = (primaryId !== undefined && primaryId !== null) ? primaryId : `idx-${filteredIndex >= 0 ? filteredIndex : index}`;
    const personaId = personaKeyBase.toString();
        
  console.log(`Procesando: nombre="${nombre}", identificacion="${identificacion}", personaId="${personaId}"`);
        
        return `
          <div class="persona-item p-2 hover:bg-gray-100 cursor-pointer rounded" data-persona-id="${personaId}">
            <div class="font-medium text-sm">${nombre}</div>
            <div class="text-xs text-gray-500">${identificacion}</div>
          </div>
        `;
      }).join('');
      }
      
      // Add click handlers (ensure single-click selection: stopPropagation and close dropdown afterwards)
      personaList.querySelectorAll('.persona-item').forEach(item => {
        item.addEventListener('click', (e) => {
          try {
            e.stopPropagation();
            const personaId = item.dataset.personaId;
            const persona = this.findPersonaById(personaId);
            if (persona) {
              console.log('Persona seleccionada (click handler):', persona);
              // Set global suppression to avoid stray clears from other listeners/tests
              try { window._globalSuppressClear = true; } catch(e) {}
              // Also set instance-level flag
              this._suppressAutoClear = true;

              // Call selectPersona and ensure we clear suppression after it completes
              Promise.resolve(this.selectPersona(persona)).finally(() => {
                // release suppression after a short delay to let downstream tasks run
                setTimeout(() => {
                  try { window._globalSuppressClear = false; } catch(e) {}
                  this._suppressAutoClear = false;
                }, 450);
              });

              // Hide dropdown after a microtask to ensure selectPersona runs first
              setTimeout(() => {
                const dropdownEl = document.getElementById('ctxPersonaDropdown');
                if (dropdownEl) dropdownEl.classList.add('hidden');
              }, 0);
            }
          } catch (err) {
            console.warn('persona click handler failed', err);
          }
        });
      });
    }

    // Setup dropdown toggle (remove existing listeners first)
    if (personaDropdown) {
      const dropdown = document.getElementById('ctxPersonaDropdown');
      const toggleLabel = document.getElementById('ctxPersonaToggleLabel');
      
      // Remove existing click listeners
      const newPersonaDropdown = personaDropdown.cloneNode(true);
      personaDropdown.parentNode.replaceChild(newPersonaDropdown, personaDropdown);
      
      newPersonaDropdown.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
          if (dropdown) {
          dropdown.classList.toggle('hidden');
          console.log('Dropdown toggled, hidden:', dropdown.classList.contains('hidden'));
        }
      });
      
      // Close dropdown when clicking outside (remove old handler to avoid duplicates)
      if (this._personaDropdownOutsideClickHandler) {
        document.removeEventListener('click', this._personaDropdownOutsideClickHandler);
      }
      this._personaDropdownOutsideClickHandler = (e) => {
        if (dropdown && !newPersonaDropdown.contains(e.target) && !dropdown.contains(e.target)) {
          dropdown.classList.add('hidden');
        }
      };
      document.addEventListener('click', this._personaDropdownOutsideClickHandler);
    }
  }

  // Select persona
  async selectPersona(persona) {
  console.log('Seleccionando persona:', JSON.stringify(persona, null, 2));

  // Suppress automatic clears while we process this selection
  this._suppressAutoClear = true;

  this.ctx.persona = persona;
    try { this.saveContext(); } catch (e) { console.warn('saveContext on selectPersona failed', e); }

    // Update dropdown label with flexible field names
    const toggleLabel = document.getElementById('ctxPersonaToggleLabel');
      if (toggleLabel) {
      const nombre = persona.nombre || persona.Nombre || persona.name || persona.Name || 'Persona seleccionada';
      toggleLabel.textContent = nombre;
      console.log('Label actualizado a:', nombre);
    }

    // Update context UI immediately
    this.updateContextUI();

    // Close dropdown UI immediately
    const dropdown = document.getElementById('ctxPersonaDropdown');
    if (dropdown) {
      dropdown.classList.add('hidden');
    }

    // Load contracts for this persona with flexible ID and wait to avoid race conditions
    const personaId = persona.persona_id || persona.id || persona.ID || persona.rowIndex;
    if (personaId) {
      try {
  console.log('Cargando contratos para persona ID:', personaId);
        await this.loadContratosForPersona(personaId);
      } catch (e) {
        console.warn('loadContratosForPersona failed', e);
      }
    }

    // Fill form fields with persona data after contratos loaded
    try { this.fillPersonaForm(persona); } catch (e) { console.warn('fillPersonaForm failed', e); }

    // Notify precontractual component about persona selection
    try {
      const precontractualComponent = this.currentComponentInstances && this.currentComponentInstances.precontractual;
      if (precontractualComponent && typeof precontractualComponent.updatePersonaContext === 'function') {
        const personaName = persona.nombre || persona.Nombre || persona.name || 'Persona seleccionada';
        precontractualComponent.updatePersonaContext(personaId, personaName);
  console.log('Precontractual component notified of persona selection:', personaName);
      }
    } catch (e) {
      console.warn('Failed to notify precontractual component:', e);
    }

    // Notify precontractual preview component about persona selection
    try {
      const precontractualPreviewComponent = this.currentComponentInstances && this.currentComponentInstances.precontractualPreview;
      if (precontractualPreviewComponent && typeof precontractualPreviewComponent.updatePersonaContext === 'function') {
        const personaName = persona.nombre || persona.Nombre || persona.name || 'Persona seleccionada';
        precontractualPreviewComponent.updatePersonaContext(personaId, personaName);
  console.log('Precontractual preview component notified of persona selection:', personaName);
      }
    } catch (e) {
      console.warn('Failed to notify precontractual preview component:', e);
    }

    // Update preview now that persona and contrato context should be stable
    try { this.updatePreviewPanel(); } catch (e) { console.warn('updatePreviewPanel after selectPersona failed', e); }

  // Re-apply context shortly after to defend against stray clears (race with other listeners/tests)
  setTimeout(() => {
      try {
        try { this.saveContext(); } catch (e) { /* ignore */ }
        try { this.updateContextUI(); } catch (e) { /* ignore */ }
        try { this.updatePreviewPanel(); } catch (e) { /* ignore */ }
  console.log('Re-aplicado contexto tras selección para asegurar estabilidad');
      } catch (e) { console.warn('delayed reapply failed', e); }
    }, 100);
  // Release suppression after a small delay so other automatic tasks can resume
  setTimeout(() => { this._suppressAutoClear = false; }, 400);
  console.log('Persona seleccionada completamente:', {
      nombre: persona.nombre || persona.Nombre,
      id: personaId,
      contexto: this.ctx
    });
  }

  // Fill persona form with selected data
  fillPersonaForm(persona) {
  console.log('Llenando formulario con datos de persona');
    
    // Map of possible field names to form input IDs
    const fieldMappings = {
      // Identificación
      'p_Identificacion': persona.identificacion || persona.Identificacion || persona.id || persona.ID || '',
      'p_Tipo_identificacion': persona.tipo_identificacion || persona.Tipo_identificacion || persona.tipo || 'CC',
      // Nombre
      'p_Nombre': persona.nombre || persona.Nombre || persona.name || persona.Name || '',
      // Correo
      'p_Correo': persona.correo || persona.Correo || persona.email || persona.Email || '',
  // Grupo OAPI and Perfil (flexible fallbacks)
  'p_Grupo_OAPI': persona.Grupo_OAPI || persona.Grupo || persona.grupo || persona.GrupoOAPI || persona.grupo_oapi || '',
  'p_Perfil': persona.Perfil || persona.perfil || persona.Profile || persona.profile || persona.cargo || persona.Role || '',
      // Estado
      'p_Estado': persona.estado || persona.Estado || persona.status || persona.Status || 'Activo',
      // Hidden ID
      'p_persona_id': persona.persona_id || persona.id || persona.ID || persona.rowIndex || ''
    };

    // Also fill the persona reference in contract form
    const contratoPersonaField = document.getElementById('c_persona_id');
    const contratoPersonaHidden = document.getElementById('c_persona_id_hidden');
    if (contratoPersonaField) {
      const personaDisplayName = persona.nombre || persona.Nombre || persona.name || persona.Name || 'Sin nombre';
      contratoPersonaField.value = personaDisplayName;
  console.log(`Campo c_persona_id (display) llenado con: "${personaDisplayName}"`);
    }
    if (contratoPersonaHidden) {
      contratoPersonaHidden.value = persona.persona_id || persona.id || '';
  console.log(`Campo c_persona_id_hidden (id) llenado con: "${contratoPersonaHidden.value}"`);
    }

    // Fill each field if it exists
    Object.keys(fieldMappings).forEach(fieldId => {
      const element = document.getElementById(fieldId);
      if (element) {
        element.value = fieldMappings[fieldId];
  console.log(`Campo ${fieldId} llenado con: "${fieldMappings[fieldId]}"`);
      } else {
  console.log(`Campo ${fieldId} no encontrado en el DOM`);
      }
    });

    // Trigger change events to update any dependent elements
    Object.keys(fieldMappings).forEach(fieldId => {
      const element = document.getElementById(fieldId);
      if (element) {
        element.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  }

  // Load contratos for persona
  async loadContratosForPersona(personaId) {
    try {
  console.log('Cargando contratos para persona ID:', personaId);
      const result = await this.apiFetch('getContratosByPersona', { persona_id: personaId });
      
  console.log('Respuesta de contratos:', result);
      
      if (result && result.ok && result.items) {
        const contratos = Array.isArray(result.items) ? result.items : [];
  console.log('Contratos encontrados:', contratos.length);
  console.log('Lista de contratos:', contratos);
        
        // If there are contracts, automatically select the first one
        if (contratos.length > 0) {
          const primerContrato = contratos[0];
          console.log('Seleccionando primer contrato automáticamente:', primerContrato);
          this.selectContrato(primerContrato);
        } else {
          console.log('No se encontraron contratos para esta persona');
          // Clear any existing contract context
          this.ctx.contrato = null;
          this.saveContext();
          this.updateContextUI();
        }
        
        // You could also populate a contracts dropdown here if it exists
        this.populateContratosDropdown(contratos);
      } else {
  console.error('Error en respuesta de contratos:', result);
      }
    } catch (error) {
  console.error('Error loading contratos:', error);
    }
  }

  // Select contrato
  selectContrato(contrato) {
  console.log('Seleccionando contrato:', contrato);
    
  this.ctx.contrato = contrato;
  this.ctx.modificaciones = [];
    this.saveContext();
    this.updateContextUI();
    
    // Fill contract form with selected data
    this.fillContratoForm(contrato);

  // Ensure preview reflects the newly selected contract immediately
  try { this.updatePreviewPanel(); } catch (e) { console.warn('updatePreviewPanel after selectContrato failed', e); }
    
  console.log('Contrato seleccionado:', {
      numero: contrato.numero || contrato.objeto,
      id: contrato.contrato_id || contrato.id,
      contexto: this.ctx
    });
  }

  // Fill contrato form with selected data
  fillContratoForm(contrato) {
  console.log('Llenando formulario de contrato con datos:', contrato);
    
    // Helper function to format dates for HTML date inputs (YYYY-MM-DD)
    const formatDateForInput = (dateValue) => {
      if (!dateValue) return '';
      
      // If it's already in YYYY-MM-DD format, return as is
      if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
        return dateValue;
      }
      
      // Try to parse various date formats
      let date;
      if (dateValue instanceof Date) {
        date = dateValue;
      } else if (typeof dateValue === 'string') {
        // Handle common formats: DD/MM/YYYY, MM/DD/YYYY, DD-MM-YYYY, etc.
        const parts = dateValue.split(/[\/\-\.]/);
        if (parts.length === 3) {
          // Assume DD/MM/YYYY format (common in Spanish)
          const [day, month, year] = parts;
          date = new Date(year, month - 1, day);
        } else {
          date = new Date(dateValue);
        }
      } else {
        date = new Date(dateValue);
      }
      
      // Return formatted date or empty if invalid
      if (date && !isNaN(date.getTime())) {
        return date.toISOString().split('T')[0]; // YYYY-MM-DD format
      }
      
  console.log(`No se pudo formatear fecha: "${dateValue}"`);
      return '';
    };
    
    // Map of possible field names to form input IDs
    const fieldMappings = {
      // Basic contract info (persona handled separately to avoid putting id into visible display)
      'c_Numero_contrato': contrato.numero_contrato || contrato.Numero_contrato || contrato.numero || contrato.Numero || '',
      'c_contrato_id': contrato.contrato_id || contrato.id || contrato.ID || contrato.rowIndex || '',
      'c_Tipo_vinculacion': contrato.tipo_vinculacion || contrato.Tipo_vinculacion || contrato.tipo || '',
      
      // Contract details
      'c_Objeto': contrato.objeto || contrato.Objeto || contrato.descripcion || contrato.Descripcion || '',
      'c_Plazo_meses': contrato.plazo_meses || contrato.Plazo_meses || contrato.plazo || contrato.Plazo || '',
      
      // Financial info
      'c_Valor_total': contrato.valor_total || contrato.Valor_total || contrato.valor || contrato.Valor || '',
      'c_Valor_mensual': contrato.valor_mensual || contrato.Valor_mensual || '',
      
      // Additional info
      'c_Origen_fondo': contrato.origen_fondo || contrato.Origen_fondo || '',
      'c_Supervisor': contrato.supervisor || contrato.Supervisor || '',
      'c_Numero_CDP': contrato.numero_cdp || contrato.Numero_CDP || contrato.cdp || contrato.CDP || '',
      'c_Numero_RC': contrato.numero_rc || contrato.Numero_RC || contrato.rc || contrato.RC || '',
      'c_Estado': contrato.estado || contrato.Estado || contrato.status || contrato.Status || 'Vigente',
      'c_Carpeta_Drive_URL': contrato.carpeta_drive_url || contrato.Carpeta_Drive_URL || contrato.drive_url || contrato.driveUrl || ''
    };

    // Handle date fields separately with proper formatting
    const dateFields = {
      'c_Inicio': formatDateForInput(contrato.inicio || contrato.Inicio || contrato.fecha_inicio || contrato.Fecha_inicio),
      'c_Fin': formatDateForInput(contrato.fin || contrato.Fin || contrato.fecha_fin || contrato.Fecha_fin),
      'c_Fecha_CDP': formatDateForInput(contrato.fecha_cdp || contrato.Fecha_CDP),
      'c_Fecha_RC': formatDateForInput(contrato.fecha_rc || contrato.Fecha_RC)
    };

    // Fill regular fields
    Object.keys(fieldMappings).forEach(fieldId => {
      const element = document.getElementById(fieldId);
      if (element) {
        // Handle selects with custom 'Otro' option
        if (fieldId === 'c_Tipo_vinculacion' || fieldId === 'c_Origen_fondo') {
          const val = fieldMappings[fieldId] || '';
          const option = Array.from(element.options || []).find(o => o.value === val);
          if (option) element.value = val;
          else if (val) { element.value = 'Otro'; const custom = document.getElementById(fieldId + '_custom'); if (custom) { custom.classList.remove('hidden'); custom.value = val; custom.required = true; } }
          else element.value = '';
        } else {
          element.value = fieldMappings[fieldId];
        }
  console.log(`Campo contrato ${fieldId} llenado con: "${fieldMappings[fieldId]}"`);
      } else {
  console.log(`Campo contrato ${fieldId} no encontrado en el DOM`);
      }
    });

    // Fill date fields with proper formatting
    Object.keys(dateFields).forEach(fieldId => {
      const element = document.getElementById(fieldId);
      if (element) {
        element.value = dateFields[fieldId];
  console.log(`Campo fecha ${fieldId} llenado con: "${dateFields[fieldId]}"`);
      } else {
  console.log(`Campo fecha ${fieldId} no encontrado en el DOM`);
      }
    });

    // Special handling for select elements
    const estadoSelect = document.getElementById('c_Estado');
    if (estadoSelect && fieldMappings['c_Estado']) {
      estadoSelect.value = fieldMappings['c_Estado'];
  console.log(`Select Estado configurado a: "${fieldMappings['c_Estado']}"`);
    }

    // Populate persona hidden id and visible display safely
    try {
      const personaHidden = document.getElementById('c_persona_id_hidden');
      const personaDisplay = document.getElementById('c_persona_id');
      const personaId = contrato.persona_id || contrato.personaId || contrato.persona || '';
      if (personaHidden) personaHidden.value = personaId || '';
      let displayName = '';
      if (contrato.Nombre) displayName = contrato.Nombre;
      else if (contrato.persona_nombre) displayName = contrato.persona_nombre;
      else if (this.ctx.persona && this.ctx.persona.persona_id && personaId && this.ctx.persona.persona_id === personaId) displayName = this.ctx.persona.Nombre || this.ctx.persona.nombre || '';
      if (personaDisplay) personaDisplay.value = displayName;
    } catch (e) {
      console.warn('Could not set persona display/hidden in fillContratoForm', e);
    }

    // Trigger change events to update any dependent elements
    const allFields = { ...fieldMappings, ...dateFields };
    Object.keys(allFields).forEach(fieldId => {
      const element = document.getElementById(fieldId);
      if (element) {
        element.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

  console.log('Formulario de contrato llenado completamente con fechas formateadas');
  }

  // Populate contratos dropdown (if it exists)
  populateContratosDropdown(contratos) {
  console.log('Actualizando dropdown de contratos con:', contratos.length, 'contratos');
    
    // This would populate a contracts dropdown if you have one in your UI
    // For now, just log the contracts
    contratos.forEach((contrato, index) => {
  console.log(`Contrato ${index + 1}:`, {
        numero: contrato.numero || contrato.objeto,
        id: contrato.contrato_id || contrato.id,
        estado: contrato.estado || contrato.Estado
      });
    });
  }

  // Update preview panel with selected persona data
  updatePreviewPanel() {
    const previewPanel = document.getElementById('previewPanel');
    if (!previewPanel) {
  console.log('Preview panel no encontrado');
      return;
    }
    // If the preview component exists in the DOM (loaded from component file), prefer updating its fields
    const emptyPreview = document.getElementById('emptyPreview');
    const contractorPreview = document.getElementById('contractorPreview');

    if (!this.ctx.persona) {
      if (emptyPreview) emptyPreview.classList.remove('hidden');
      if (contractorPreview) contractorPreview.classList.add('hidden');
      return;
    }

    if (emptyPreview) emptyPreview.classList.add('hidden');
    if (contractorPreview) contractorPreview.classList.remove('hidden');

    // Actualizar el panel de vista previa con los datos del contratista
    const persona = this.ctx.persona;
    const nombre = persona.nombre || persona.Nombre || persona.name || 'Sin nombre';
    const identificacion = persona.identificacion || persona.Identificacion || persona.id || '-';
    const correo = persona.correo || persona.Correo || persona.email || '-';
    const estado = persona.estado || persona.Estado || persona.status || 'Activo';
  const grupo = persona.Grupo_OAPI || persona.Grupo || persona.grupo || persona.GrupoOAPI || persona.grupo_oapi || document.getElementById('p_Grupo_OAPI')?.value || '-';
  const perfil = persona.Perfil || persona.perfil || persona.Profile || persona.profile || persona.cargo || persona.Role || document.getElementById('p_Perfil')?.value || '-';

    // Persona fields
  const elNombre = document.getElementById('preview-nombre'); if (elNombre) { if ('value' in elNombre) elNombre.value = nombre; else elNombre.textContent = nombre; }
  const elIdent = document.getElementById('preview-identificacion'); if (elIdent) { const val = this.formatIdWithDots(identificacion); if ('value' in elIdent) elIdent.value = val; else elIdent.textContent = val; }
  const elCorreo = document.getElementById('preview-correo'); if (elCorreo) { if ('value' in elCorreo) elCorreo.value = correo; else elCorreo.textContent = correo; }
  const elGrupo = document.getElementById('preview-grupo-oapi'); if (elGrupo) { if ('value' in elGrupo) elGrupo.value = grupo; else elGrupo.textContent = grupo; }
  const elPerfil = document.getElementById('preview-perfil'); if (elPerfil) { if ('value' in elPerfil) elPerfil.value = perfil; else elPerfil.textContent = perfil; }

    // Estado badge
    try { updateStatusBadge(estado); } catch (e) { /* ignore */ }

    // Contrato fields (try context first then form fields)
  const c = this.ctx.contrato || {};
  const cNum = c.Numero_contrato || c.numero || c.Numero || document.getElementById('c_Numero_contrato')?.value || '-';
  const cTipo = c.Tipo_vinculacion || c.tipo || document.getElementById('c_Tipo_vinculacion')?.value || '-';
  const cInicioRaw = c.Inicio || c.inicio || c.Fecha_inicio || document.getElementById('c_Inicio')?.value || '';
  const cFinRaw = c.Fin || c.fin || c.Fecha_fin || document.getElementById('c_Fin')?.value || '';
  const cPlazo = c.Plazo_meses || c.plazo || document.getElementById('c_Plazo_meses')?.value || this.approxMonthsBetween(cInicioRaw, cFinRaw) || '-';
  const cValorTotal = (c.Valor_total !== undefined && c.Valor_total !== null) ? c.Valor_total : (document.getElementById('c_Valor_total')?.value || '-');
  const cValorMensual = (c.Valor_mensual !== undefined && c.Valor_mensual !== null) ? c.Valor_mensual : (document.getElementById('c_Valor_mensual')?.value || '-');
  const cValorAdicion = (c.Valor_adicion !== undefined && c.Valor_adicion !== null) ? c.Valor_adicion : (document.getElementById('c_Valor_adicion')?.value || '0');
  const cCDP = c.Numero_CDP || c.Numero_Cdp || c['Numero CDP'] || c.cdp || c.CDP || document.getElementById('c_Numero_CDP')?.value || '-';
  const cFechaCDPRaw = c.Fecha_CDP || c.FechaCdp || c['Fecha CDP'] || document.getElementById('c_Fecha_CDP')?.value || '';
  const cRC = c.Numero_RC || c.NumeroRc || c['Numero RC'] || c.rc || c.RC || document.getElementById('c_Numero_RC')?.value || '-';
  const cFechaRCRaw = c.Fecha_RC || c.FechaRc || c['Fecha RC'] || document.getElementById('c_Fecha_RC')?.value || '';

  // Actualizar datos del contratista en el panel de vista previa
  const elContrato = document.getElementById('preview-contrato'); 
  if (elContrato) { if ('value' in elContrato) elContrato.value = cNum || '-'; else elContrato.textContent = cNum || '-'; }
  
  const elTipoV = document.getElementById('preview-tipo-vinculacion'); 
  if (elTipoV) { if ('value' in elTipoV) elTipoV.value = cTipo || '-'; else elTipoV.textContent = cTipo || '-'; }
  
  const elInicio = document.getElementById('preview-inicio-contrato'); 
  if (elInicio) { const v = cInicioRaw ? formatDisplayDate(cInicioRaw) : '-'; if ('value' in elInicio) elInicio.value = v; else elInicio.textContent = v; }
  
  const elFin = document.getElementById('preview-fin-contrato'); 
  if (elFin) { const v = cFinRaw ? formatDisplayDate(cFinRaw) : '-'; if ('value' in elFin) elFin.value = v; else elFin.textContent = v; }
  
  const elPlazo = document.getElementById('preview-plazo'); 
  if (elPlazo) { const v = cPlazo ? `${cPlazo} meses` : '-'; if ('value' in elPlazo) elPlazo.value = v; else elPlazo.textContent = v; }
  
  const elValorTotal = document.getElementById('preview-valor-total'); 
  if (elValorTotal) { 
    const v = (cValorTotal && !isNaN(Number(cValorTotal))) ? formatCurrency(Number(cValorTotal)) : '-'; 
    if ('value' in elValorTotal) elValorTotal.value = v; else elValorTotal.textContent = v;
  }
  
  const elValorMens = document.getElementById('preview-valor-mensual'); 
  if (elValorMens) { 
    const v = (cValorMensual && !isNaN(Number(cValorMensual))) ? formatCurrency(Number(cValorMensual)) : '-'; 
    if ('value' in elValorMens) elValorMens.value = v; else elValorMens.textContent = v;
  }
  
  const elCDP = document.getElementById('preview-cdp'); 
  if (elCDP) { if ('value' in elCDP) elCDP.value = cCDP || '-'; else elCDP.textContent = cCDP || '-'; }
  
  const elFechaCDP = document.getElementById('preview-fecha-cdp'); 
  if (elFechaCDP) { 
    const v = cFechaCDPRaw ? formatDisplayDate(cFechaCDPRaw) : '-'; 
    if ('value' in elFechaCDP) elFechaCDP.value = v; else elFechaCDP.textContent = v;
  }
  
  const elRC = document.getElementById('preview-rc'); 
  if (elRC) { if ('value' in elRC) elRC.value = cRC || '-'; else elRC.textContent = cRC || '-'; }
  
  const elFechaRC = document.getElementById('preview-fecha-rc'); 
  if (elFechaRC) { 
    const v = cFechaRCRaw ? formatDisplayDate(cFechaRCRaw) : '-'; 
    if ('value' in elFechaRC) elFechaRC.value = v; else elFechaRC.textContent = v;
  }

  // Modificaciones preview block
  const mods = Array.isArray(this.ctx.modificaciones) ? this.ctx.modificaciones : [];
  const modsSummaryEl = document.getElementById('preview-modificaciones-summary');
  const modsListEl = document.getElementById('preview-modificaciones-list');
  const modsChipEl = document.getElementById('preview-modificacion-chip');

  if (modsSummaryEl) {
    if (!mods.length) {
      modsSummaryEl.textContent = 'Sin modificaciones registradas.';
    } else {
      const latestMod = mods[mods.length - 1] || {};
      const latestType = latestMod.tipo_modificacion || latestMod.Tipo_modificacion || '-';
      const latestEstado = latestMod.estado_modificacion || latestMod.Estado_modificacion || '-';
      const latestDate = latestMod.fecha_suscripcion || latestMod.fecha_efecto_desde || latestMod.fecha_efecto_hasta || '';
      const formattedDate = latestDate ? formatDisplayDate(latestDate) : '';
      modsSummaryEl.textContent = `${mods.length} modificación${mods.length === 1 ? '' : 'es'} · Último: ${latestType} (${latestEstado})${formattedDate ? ' · ' + formattedDate : ''}`;
    }
  }

  if (modsListEl) {
    if (!mods.length) {
      modsListEl.innerHTML = '';
    } else {
      const toBool = (val) => {
        if (val === true) return true;
        if (val === false || val === null || val === undefined) return false;
        if (typeof val === 'number') return val !== 0;
        const str = String(val).trim().toLowerCase();
        return str === 'true' || str === '1' || str === 'si' || str === 'sí' || str === 'x';
      };
      const recent = mods.slice(-3).reverse();
      modsListEl.innerHTML = recent.map((item) => {
        const tipo = item.tipo_modificacion || item.Tipo_modificacion || '-';
        const seq = item.secuencia_mod || item.Secuencia || item.secuencia || '-';
        const estado = item.estado_modificacion || item.Estado_modificacion || '-';
        const fecha = item.fecha_suscripcion || item.fecha_efecto_desde || item.fecha_efecto_hasta || '';
        const formattedFecha = fecha ? formatDisplayDate(fecha) : 's/d';
        const plazoImpact = toBool(item.impacta_plazo);
        const valorImpact = toBool(item.impacta_valor);
        const flagParts = [];
        if (plazoImpact) flagParts.push('Plazo');
        if (valorImpact) flagParts.push('Valor');
        const flags = flagParts.length ? ` • ${flagParts.join(' & ')}` : '';
        return `
          <div class="preview-mini-field preview-mod-item">
            <span class="material-icons">sync_alt</span>
            <div class="preview-mod-item-text">
              <div class="preview-mod-item-title">${tipo} · Seq ${seq}</div>
              <div class="preview-mod-item-meta">${formattedFecha} · ${estado}${flags}</div>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  if (modsChipEl) {
    const latestOtrosi = [...mods].reverse().find((item) => {
      const tipo = (item.tipo_modificacion || item.Tipo_modificacion || '').toString().toLowerCase();
      return tipo.includes('otros');
    });
    if (latestOtrosi) {
      const seq = latestOtrosi.secuencia_mod || latestOtrosi.secuencia || '';
      const estado = latestOtrosi.estado_modificacion || latestOtrosi.Estado_modificacion || '';
      const seqText = seq ? ` #${seq}` : '';
      const estadoText = estado ? ` · ${estado}` : '';
      modsChipEl.textContent = `Otrosí${seqText}${estadoText}`;
      modsChipEl.classList.remove('hidden');
    } else {
      modsChipEl.classList.add('hidden');
      modsChipEl.textContent = '';
    }
  }

    console.log('Preview panel actualizado para:', nombre);
  }
  
  // Configuración de los acordeones en las secciones de formulario
  setupFormSectionsAccordion() {
    const headers = document.querySelectorAll('.form-section-header');
    console.log('Configurando acordeones, encontrados:', headers.length);
    
    // Eliminar primero todos los event listeners anteriores usando clonación
    headers.forEach(header => {
      const newHeader = header.cloneNode(true);
      if (header.parentNode) {
        header.parentNode.replaceChild(newHeader, header);
      }
    });
    
    // Ahora agregamos los nuevos event listeners a todos los headers
    document.querySelectorAll('.form-section-header').forEach(header => {
      header.setAttribute('data-accordion-initialized', 'true');
      
      // Asegurarse de que el icono sea el correcto inicialmente
      const icon = header.querySelector('.toggle-icon');
      if (icon) {
        icon.textContent = 'expand_more'; // Icono para sección cerrada
      }
      
      // Identificar la sección para mejor logging
      const section = header.closest('.form-section');
      if (!section) return;
      
      const sectionId = section.id || 'sin-id';
      const content = section.querySelector('.form-section-content');
      
      if (!content) {
        console.error(`No se encontró el contenido del acordeón para sección: ${sectionId}`);
        return;
      }
      
      // Asegurarse de que esté cerrado al inicio
      content.classList.remove('open');
      
      // Agregamos el evento click
      header.addEventListener('click', () => {
        // Toggle la clase open
        const isOpen = content.classList.contains('open');
        
        // Primero cerrar todos los otros acordeones si se está abriendo este
        if (!isOpen) {
          // Encontrar todos los contenidos y cerrarlos
          const allSections = document.querySelectorAll('.form-section');
          allSections.forEach(otherSection => {
            if (otherSection === section) return; // Saltar la sección actual
            
            const otherContent = otherSection.querySelector('.form-section-content');
            const otherHeader = otherSection.querySelector('.form-section-header');
            const otherIcon = otherHeader ? otherHeader.querySelector('.toggle-icon') : null;
            
            if (otherContent && otherContent.classList.contains('open')) {
              otherContent.classList.remove('open');
            }
            
            if (otherIcon) {
              otherIcon.textContent = 'expand_more';
            }
          });
        }
        
        if (isOpen) {
          // Cerramos el acordeón
          content.classList.remove('open');
          
          if (icon) {
            icon.textContent = 'expand_more';
          }
          
          console.log(`Cerrando acordeón: ${sectionId}`);
        } else {
          // Abrimos el acordeón
          content.classList.add('open');
          
          if (icon) {
            icon.textContent = 'expand_less';
          }
          
          console.log(`Abriendo acordeón: ${sectionId}`);
        }
      });
    });
  }
  
  // Colapsar todas las secciones de formulario dentro de un contenedor
  collapseFormSectionsIn(container) {
    if (!container) {
      console.warn('collapseFormSectionsIn: contenedor no encontrado');
      return;
    }
    
    const sections = container.querySelectorAll('.form-section');
    console.log('Colapsando acordeones, encontrados:', sections.length);
    
    if (sections.length === 0) {
      console.warn('No se encontraron secciones de formulario en el contenedor');
      return;
    }
    
    // Procesar cada sección para asegurarse de que están correctamente cerradas
    sections.forEach(section => {
      const content = section.querySelector('.form-section-content');
      const header = section.querySelector('.form-section-header');
      const icon = header ? header.querySelector('.toggle-icon') : null;
      
      if (content) {
        // Usar removeAttribute para eliminar cualquier estilo inline que pueda interferir
        content.removeAttribute('style');
        
        // Asegurar que la clase open no esté presente
        if (content.classList.contains('open')) {
          content.classList.remove('open');
          console.log(`Cerrando sección: ${section.id || 'sin ID'}`);
        }
        
        // Doble verificación para forzar el estado cerrado
        setTimeout(() => {
          content.classList.remove('open');
        }, 10);
      } else {
        console.warn('Sección sin contenido:', section.id || 'sin ID');
      }
      
      if (icon) {
        icon.textContent = 'expand_more';
      }
    });
    
    // Forzar un reflow para aplicar los cambios
    container.offsetHeight;
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const adminManager = new AdminComponentManager();
  window.adminManager = adminManager; // For debugging
  
  // Iniciar el administrador
  adminManager.init().then(() => {
    // Asegurar que los acordeones se configuren correctamente
    setTimeout(() => {
      const adminContent = document.getElementById('adminContent');
      if (adminContent) {
        // Colapsar todos los acordeones y asegurar que estén cerrados
        adminManager.collapseFormSectionsIn(adminContent);
      }
    }, 300);
  });
  
  // Inicializar el panel de debug
  const debugPanel = new AdminDebugPanel();
  window.debugPanel = debugPanel;
});

export { AdminComponentManager };
