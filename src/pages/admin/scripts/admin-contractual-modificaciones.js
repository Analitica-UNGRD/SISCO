// Admin Contractual Modificaciones Component
export default class AdminContractualModificaciones {
  constructor(adminManager) {
    this.adminManager = adminManager;
    this.form = document.getElementById('formModificacion');
    this.listContainer = document.getElementById('contractualModificacionesList');
    this.summaryEl = document.getElementById('contractualModificacionesSummary');
    this.refreshBtn = document.getElementById('contractualModificacionesRefresh');
    this.newBtn = document.getElementById('contractualModificacionesNew');
    this.cancelBtn = document.getElementById('contractualModificacionesCancel');
    this.saveBtn = document.getElementById('contractualModificacionesSave');
    this.resultBox = document.getElementById('contractualModificacionesResult');

    this.currentContratoId = null;
    this.currentPersonaId = null;
    this.modificaciones = [];
    this.activeModificacionId = null;
    this.isSaving = false;
    this.isLoading = false;

    this.boundContextHandler = (evt) => this.handleContextUpdate(evt?.detail || {});
    this.boundListHandler = (evt) => this.handleListClick(evt);

    this.bindEvents();
    this.bootstrapFromContext();
  }

  bindEvents() {
    if (this.form) {
      this.form.addEventListener('submit', (evt) => {
        evt.preventDefault();
        this.saveModificacion();
      });
    }

    if (this.listContainer) {
      this.listContainer.addEventListener('click', this.boundListHandler);
    }

    if (this.newBtn) {
      this.newBtn.addEventListener('click', () => {
        this.startNewEntry();
      });
    }

    if (this.refreshBtn) {
      this.refreshBtn.addEventListener('click', () => {
        if (this.currentContratoId) {
          this.loadModificaciones(this.currentContratoId, { force: true });
        }
      });
    }

    if (this.cancelBtn) {
      this.cancelBtn.addEventListener('click', () => {
        this.startNewEntry({ resetOnly: true });
      });
    }

    document.addEventListener('admin:context-updated', this.boundContextHandler);
  }

  bootstrapFromContext() {
    try {
      const persona = this.adminManager?.ctx?.persona || null;
      const contrato = this.adminManager?.ctx?.contrato || null;
      this.handleContextUpdate({ persona, contrato });
    } catch (error) {
      console.warn('No se pudo inicializar modificaciones con el contexto actual', error);
    }
  }

  handleContextUpdate(detail = {}) {
    const contrato = detail.contrato || null;
    const persona = detail.persona || null;
    const contratoId = contrato ? (contrato.contrato_id || contrato.id || contrato.cid || '').toString() : '';
    const personaId = persona ? (persona.persona_id || persona.id || persona.pid || '').toString() : '';

    if (!contratoId) {
      this.currentContratoId = null;
      this.currentPersonaId = personaId || '';
      this.modificaciones = [];
      this.updateSummary();
      this.renderList([]);
      this.startNewEntry({ disable: true, silent: true });
      this.updateContextModificaciones();
      return;
    }

    const contratoChanged = contratoId !== this.currentContratoId;
    this.currentContratoId = contratoId;
    this.currentPersonaId = personaId || '';

    if (this.form) {
      const contratoInput = document.getElementById('mod_contrato_id');
      const personaInput = document.getElementById('mod_persona_id');
      if (contratoInput) contratoInput.value = contratoId;
      if (personaInput) personaInput.value = this.currentPersonaId;
    }

    if (contratoChanged) {
      this.startNewEntry({ silent: true });
      this.loadModificaciones(contratoId);
    }
  }

  async loadModificaciones(contratoId, options = {}) {
    if (!contratoId) return;

    if (this.isLoading && !options.force) return;

    this.setLoading(true);
    try {
      const response = await this.adminManager.apiFetch('getModificacionesByContrato', { contrato_id: contratoId });
      if (response?.ok) {
        const items = Array.isArray(response.items) ? response.items : [];
        this.modificaciones = items;
  this.renderList(items);
  this.updateSummary();
        this.startNewEntry({ resetOnly: true, silent: true });
        this.showMessage(items.length ? `Se cargaron ${items.length} modificaciones.` : 'Este contrato no tiene modificaciones registradas.', items.length ? 'success' : 'info');
      } else {
        this.modificaciones = [];
        this.renderList([]);
        this.updateSummary();
        this.showMessage(response?.error || 'No se pudieron consultar las modificaciones.', 'error');
      }
    } catch (error) {
      console.error('Error al cargar modificaciones', error);
      this.showMessage('Error de conexión al consultar modificaciones.', 'error');
      this.modificaciones = [];
      this.renderList([]);
      this.updateSummary();
    } finally {
      this.setLoading(false);
      this.updateContextModificaciones();
    }
  }

  handleListClick(event) {
    if (!event?.target) return;
    const action = event.target.dataset.action;
    if (action === 'edit') {
      const modId = event.target.dataset.id;
      const item = this.modificaciones.find((mod) => String(mod.modificacion_id || mod.id || '') === String(modId));
      if (item) {
        this.populateForm(item);
      }
    }
    if (action === 'open-support') {
      const url = event.target.dataset.url;
      if (url) window.open(url, '_blank');
    }
  }

  startNewEntry(options = {}) {
    const disable = options.disable === true;
    this.activeModificacionId = null;
    if (!this.form) return;

    this.form.reset();
    const modIdInput = document.getElementById('mod_modificacion_id');
    if (modIdInput) modIdInput.value = '';
    const contratoInput = document.getElementById('mod_contrato_id');
    if (contratoInput) contratoInput.value = this.currentContratoId || '';
    const personaInput = document.getElementById('mod_persona_id');
    if (personaInput) personaInput.value = this.currentPersonaId || '';

    const seqInput = document.getElementById('mod_secuencia_mod');
    if (seqInput) {
      if (this.currentContratoId) {
        const nextSeq = this.computeNextSequence();
        seqInput.value = nextSeq;
      } else {
        seqInput.value = '';
      }
    }

    ['impacta_plazo', 'impacta_valor', 'impacta_supervisor', 'impacta_objeto'].forEach((name) => {
      const el = this.form.querySelector(`[name="${name}"]`);
      if (el) el.checked = false;
    });

    if (disable) {
      this.form.classList.add('opacity-50', 'pointer-events-none');
    } else {
      this.form.classList.remove('opacity-50', 'pointer-events-none');
    }

    this.highlightActiveCard();
    if (!options.silent) {
      this.showMessage('Formulario listo para nueva modificación.', 'info');
    }
  }

  populateForm(item = {}) {
    if (!this.form) return;
    this.form.classList.remove('opacity-50', 'pointer-events-none');

    const normalizeDate = (value) => {
      if (!value) return '';
      if (value instanceof Date) {
        return AdminContractualModificaciones.toInputDate(value);
      }
      if (typeof value === 'string' && value.includes('T')) {
        return value.split('T')[0];
      }
      return value;
    };

    const setValue = (id, value) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (el.type === 'date') {
        el.value = normalizeDate(value);
        return;
      }
      el.value = value !== undefined && value !== null ? value : '';
    };

    const toChecked = (value) => AdminContractualModificaciones.isTruthy(value);

    setValue('mod_modificacion_id', item.modificacion_id || item.id || '');
    setValue('mod_contrato_id', this.currentContratoId || item.contrato_id || '');
    setValue('mod_persona_id', this.currentPersonaId || item.persona_id || '');
    setValue('mod_secuencia_mod', item.secuencia_mod || item.secuencia || '');
    setValue('mod_tipo_modificacion', item.tipo_modificacion || '');
    setValue('mod_numero_acto', item.numero_acto || '');
    setValue('mod_fecha_suscripcion', item.fecha_suscripcion);
    setValue('mod_fecha_efecto_desde', item.fecha_efecto_desde);
    setValue('mod_fecha_efecto_hasta', item.fecha_efecto_hasta);
    setValue('mod_dias_prorroga', item.dias_prorroga || item.dias || '');
    setValue('mod_meses_prorroga', item.meses_prorroga || item.meses || '');
    setValue('mod_valor_adicionado', item.valor_adicionado || '');
    setValue('mod_valor_disminuido', item.valor_disminuido || '');
    setValue('mod_supervisor_nuevo', item.supervisor_nuevo || '');
    setValue('mod_objeto_nuevo', item.objeto_nuevo || '');
    setValue('mod_observaciones', item.observaciones || '');
    setValue('mod_soporte_URL', item.soporte_URL || '');
    setValue('mod_carpeta_drive_url', item.carpeta_drive_url || '');
    setValue('mod_numero_CDP_adicional', item.numero_CDP_adicional || '');
    setValue('mod_fecha_CDP_adicional', item.fecha_CDP_adicional);
    setValue('mod_numero_RC_adicional', item.numero_RC_adicional || '');
    setValue('mod_fecha_RC_adicional', item.fecha_RC_adicional);
    setValue('mod_estado_modificacion', item.estado_modificacion || '');

    const checkboxMap = {
      impacta_plazo: item.impacta_plazo,
      impacta_valor: item.impacta_valor,
      impacta_supervisor: item.impacta_supervisor,
      impacta_objeto: item.impacta_objeto
    };
    Object.keys(checkboxMap).forEach((key) => {
      const el = this.form.querySelector(`[name="${key}"]`);
      if (el) {
        el.checked = toChecked(checkboxMap[key]);
      }
    });

    this.activeModificacionId = item.modificacion_id || item.id || null;
    this.highlightActiveCard();
    this.showMessage('Modificación cargada para edición.', 'info');
  }

  highlightActiveCard() {
    if (!this.listContainer) return;
    const cards = this.listContainer.querySelectorAll('[data-modificacion-id]');
    cards.forEach((card) => {
      const isActive = this.activeModificacionId && card.dataset.modificacionId === String(this.activeModificacionId);
      card.classList.toggle('ring-2', !!isActive);
      card.classList.toggle('ring-indigo-200', !!isActive);
      card.classList.toggle('shadow-md', !!isActive);
    });
  }

  computeNextSequence() {
    if (!Array.isArray(this.modificaciones) || this.modificaciones.length === 0) return 1;
    const numbers = this.modificaciones.map((m) => Number(m.secuencia_mod || m.secuencia || 0)).filter((n) => !isNaN(n));
    if (!numbers.length) return 1;
    return Math.max(...numbers) + 1;
  }

  renderList(items = []) {
    if (!this.listContainer) return;
    if (!items.length) {
      this.listContainer.innerHTML = '<div class="text-sm text-slate-500 bg-slate-50 border border-dashed border-slate-200 rounded p-4">Sin modificaciones registradas para este contrato.</div>';
      return;
    }

    const html = items.map((item) => this.renderCard(item)).join('');
    this.listContainer.innerHTML = html;
    this.highlightActiveCard();
  }

  renderCard(item = {}) {
    const estado = item.estado_modificacion || 'Sin estado';
    const tipo = item.tipo_modificacion || 'Sin tipo';
    const secuencia = item.secuencia_mod || item.secuencia || '-';
    const fechaSuscripcion = AdminContractualModificaciones.formatDisplayDate(item.fecha_suscripcion);
    const fechaDesde = AdminContractualModificaciones.formatDisplayDate(item.fecha_efecto_desde);
    const fechaHasta = AdminContractualModificaciones.formatDisplayDate(item.fecha_efecto_hasta);
    const impactoPlazo = AdminContractualModificaciones.isTruthy(item.impacta_plazo);
    const impactoValor = AdminContractualModificaciones.isTruthy(item.impacta_valor);
    const impactoSupervisor = AdminContractualModificaciones.isTruthy(item.impacta_supervisor);
    const impactoObjeto = AdminContractualModificaciones.isTruthy(item.impacta_objeto);
    const valorAdd = item.valor_adicionado ? AdminContractualModificaciones.formatCurrency(item.valor_adicionado) : '-';
    const valorDim = item.valor_disminuido ? AdminContractualModificaciones.formatCurrency(item.valor_disminuido) : '-';
    const soporte = item.soporte_URL || '';
    const chipLabel = tipo === 'Otrosí' ? 'Otrosí' : (impactoValor ? 'Valor' : (impactoPlazo ? 'Plazo' : 'Modificación'));

    return `
      <article class="border border-slate-200 bg-white rounded-md p-4 shadow-sm" data-modificacion-id="${item.modificacion_id || ''}">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div class="text-sm font-semibold text-slate-800">Secuencia ${secuencia} · ${tipo}</div>
            <div class="text-xs text-slate-500">Suscrito: ${fechaSuscripcion || 's/d'} · Vigencia: ${fechaDesde || 's/d'} – ${fechaHasta || 's/d'}</div>
          </div>
          <div class="flex items-center gap-2">
            <span class="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-indigo-100 text-indigo-700">${chipLabel}</span>
            <span class="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${this.estadoBadgeClass(estado)}">${estado}</span>
            <button type="button" class="text-xs text-indigo-600 hover:underline" data-action="edit" data-id="${item.modificacion_id || ''}">Editar</button>
          </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3 text-xs text-slate-600">
          <div><span class="font-semibold">Número acto:</span> ${item.numero_acto || 's/d'}</div>
          <div><span class="font-semibold">Impacta plazo:</span> ${impactoPlazo ? 'Sí' : 'No'}</div>
          <div><span class="font-semibold">Impacta valor:</span> ${impactoValor ? 'Sí' : 'No'} · +${valorAdd} / -${valorDim}</div>
          <div><span class="font-semibold">Supervisor nuevo:</span> ${item.supervisor_nuevo || 's/d'}</div>
          <div class="md:col-span-2"><span class="font-semibold">Observaciones:</span> ${item.observaciones || 'Sin observaciones'}</div>
        </div>
        ${soporte ? `<div class="mt-3">
          <button type="button" class="text-xs text-sky-600 hover:underline" data-action="open-support" data-url="${soporte}">Abrir soporte</button>
        </div>` : ''}
      </article>
    `;
  }

  estadoBadgeClass(estado) {
    const normalized = (estado || '').toString().toLowerCase();
    if (normalized.includes('aprob')) return 'bg-emerald-100 text-emerald-700';
    if (normalized.includes('tram')) return 'bg-amber-100 text-amber-700';
    if (normalized.includes('rech')) return 'bg-rose-100 text-rose-700';
    if (normalized.includes('revoc')) return 'bg-gray-200 text-gray-700';
    if (normalized.includes('borr')) return 'bg-slate-100 text-slate-700';
    return 'bg-slate-100 text-slate-700';
  }

  updateSummary() {
    if (!this.summaryEl) return;
    if (!this.currentContratoId) {
      this.summaryEl.textContent = 'Selecciona un contrato para gestionar sus modificaciones.';
      return;
    }
    const total = Array.isArray(this.modificaciones) ? this.modificaciones.length : 0;
    if (!total) {
      this.summaryEl.textContent = 'Sin modificaciones registradas.';
      return;
    }
    const latest = this.modificaciones[this.modificaciones.length - 1] || {};
    const fecha = AdminContractualModificaciones.formatDisplayDate(latest.fecha_suscripcion) || AdminContractualModificaciones.formatDisplayDate(latest.fecha_efecto_desde);
    this.summaryEl.textContent = `${total} modificación${total === 1 ? '' : 'es'} registradas. Último trámite: ${latest.tipo_modificacion || 's/d'} ${fecha ? '· ' + fecha : ''}.`;
  }

  collectFormData() {
    if (!this.form) return null;
    const data = {};
    const formData = new FormData(this.form);
    formData.forEach((value, key) => {
      data[key] = value;
    });
    ['impacta_plazo', 'impacta_valor', 'impacta_supervisor', 'impacta_objeto'].forEach((key) => {
      const el = this.form.querySelector(`[name="${key}"]`);
      data[key] = !!(el && el.checked);
    });

    // Ensure numeric fields are kept as strings if empty to let backend clean
    ['dias_prorroga', 'meses_prorroga', 'valor_adicionado', 'valor_disminuido'].forEach((key) => {
      if (data[key] === '') data[key] = '';
    });

    if (!data.contrato_id && this.currentContratoId) data.contrato_id = this.currentContratoId;
    if (!data.persona_id && this.currentPersonaId) data.persona_id = this.currentPersonaId;

    return data;
  }

  async saveModificacion() {
    if (this.isSaving) return;
    if (!this.currentContratoId) {
      this.showMessage('Selecciona un contrato antes de guardar.', 'warning');
      return;
    }
    const payload = this.collectFormData();
    if (!payload) return;
    if (!payload.tipo_modificacion) {
      this.showMessage('Selecciona el tipo de modificación.', 'warning');
      return;
    }

    this.setSaving(true);
    try {
      const response = await this.adminManager.apiFetch('upsertModificacion', payload);
      if (response?.ok) {
        this.showMessage('Modificación guardada correctamente.', 'success');
        await this.loadModificaciones(this.currentContratoId, { force: true });
        if (response.data && response.data.modificacion_id) {
          this.activeModificacionId = response.data.modificacion_id;
          const savedItem = this.modificaciones.find((mod) => String(mod.modificacion_id || '') === String(response.data.modificacion_id));
          if (savedItem) {
            this.populateForm(savedItem);
          } else {
            this.startNewEntry({ keepSequenceFromData: true, silent: true });
          }
        } else {
          this.startNewEntry({ keepSequenceFromData: true, silent: true });
        }
      } else {
        this.showMessage(response?.error || 'No se pudo guardar la modificación.', 'error');
      }
    } catch (error) {
      console.error('Error al guardar modificación', error);
      this.showMessage('Error de conexión al guardar la modificación.', 'error');
    } finally {
      this.setSaving(false);
    }
  }

  setLoading(isLoading) {
    this.isLoading = isLoading;
    if (this.listContainer) {
      this.listContainer.classList.toggle('opacity-50', isLoading);
      this.listContainer.classList.toggle('pointer-events-none', isLoading);
    }
    if (this.refreshBtn) {
      this.refreshBtn.disabled = isLoading;
    }
    if (isLoading && this.listContainer) {
      this.listContainer.innerHTML = '<div class="text-sm text-slate-500">Cargando modificaciones...</div>';
    }
  }

  setSaving(isSaving) {
    this.isSaving = isSaving;
    if (!this.saveBtn) return;
    if (isSaving) {
      this.saveBtn.disabled = true;
      this.saveBtn.innerHTML = '<span class="material-icons text-sm animate-spin">sync</span><span>Guardando...</span>';
    } else {
      this.saveBtn.disabled = false;
      this.saveBtn.innerHTML = '<span class="material-icons text-sm">save</span><span>Guardar modificación</span>';
    }
  }

  showMessage(message, type = 'info') {
    if (!this.resultBox) return;
    const styles = {
      success: 'bg-emerald-100 text-emerald-700',
      error: 'bg-rose-100 text-rose-700',
      warning: 'bg-amber-100 text-amber-700',
      info: 'bg-sky-100 text-sky-700'
    };
    this.resultBox.className = `mt-3 text-sm p-3 rounded ${styles[type] || styles.info}`;
    this.resultBox.textContent = message;
    clearTimeout(this._messageTimer);
    this._messageTimer = setTimeout(() => {
      this.resultBox.textContent = '';
      this.resultBox.className = 'mt-3 text-sm';
    }, 5000);
  }

  updateContextModificaciones() {
    try {
      if (!this.adminManager) return;
      this.adminManager.ctx = this.adminManager.ctx || {};
      this.adminManager.ctx.modificaciones = Array.isArray(this.modificaciones) ? this.modificaciones : [];
      if (typeof this.adminManager.saveCtx === 'function') {
        this.adminManager.saveCtx();
      } else if (typeof this.adminManager.saveContext === 'function') {
        this.adminManager.saveContext();
      }
      if (typeof this.adminManager.updatePreviewPanel === 'function') {
        this.adminManager.updatePreviewPanel();
      }
      const evt = new CustomEvent('admin:modificaciones-updated', {
        detail: {
          contratoId: this.currentContratoId,
          items: this.modificaciones
        }
      });
      document.dispatchEvent(evt);
    } catch (error) {
      console.warn('No se pudo actualizar el contexto con las modificaciones', error);
    }
  }

  destroy() {
    document.removeEventListener('admin:context-updated', this.boundContextHandler);
    if (this.listContainer) {
      this.listContainer.removeEventListener('click', this.boundListHandler);
    }
    if (this._messageTimer) {
      clearTimeout(this._messageTimer);
    }
  }

  static formatDisplayDate(value) {
    if (!value) return '';
    let dateObj = value;
    if (!(value instanceof Date)) {
      const parsed = new Date(value);
      if (!isNaN(parsed.getTime())) {
        dateObj = parsed;
      }
    }
    if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) return value;
    const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = months[dateObj.getMonth()] || '';
    const year = dateObj.getFullYear();
    return `${day} ${month} ${year}`;
  }

  static toInputDate(value) {
    if (!value) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  }

  static isTruthy(value) {
    if (value === true) return true;
    if (typeof value === 'string') {
      const v = value.trim().toLowerCase();
      return v === 'true' || v === '1' || v === 'si' || v === 'sí' || v === 'x';
    }
    if (typeof value === 'number') return value !== 0;
    return false;
  }

  static formatCurrency(value) {
    if (value === null || value === undefined || value === '') return '-';
    const num = Number(value);
    if (isNaN(num)) return value;
    try {
      return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(num);
    } catch (_) {
      return num.toLocaleString('es-CO');
    }
  }
}
