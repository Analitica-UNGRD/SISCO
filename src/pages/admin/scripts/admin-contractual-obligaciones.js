// Admin Contractual Obligaciones Component
export default class AdminContractualObligaciones {
  constructor(adminManager) {
    this.adminManager = adminManager;
    this.defaultSlots = 8;
    this.maxSlots = 12;
    this.fields = [];
    this.currentContratoId = null;
    this.isSaving = false;

    this.container = document.getElementById('contractualObligacionesFields');
    this.addBtn = document.getElementById('contractualObligacionesAddField');
    this.saveBtn = document.getElementById('contractualObligacionesSave');
    this.resetBtn = document.getElementById('contractualObligacionesReset');
    this.resultBox = document.getElementById('contractualObligacionesResult');

    this.boundContextHandler = (event) => this.handleContextUpdate(event?.detail || {});
    this.init();
  }

  init() {
    if (!this.container) return;

    this.renderInitialFields();
    this.bindEvents();
    this.bootstrapFromContext();
  }

  renderInitialFields(count = this.defaultSlots) {
    this.container.innerHTML = '';
    this.fields = [];

    for (let i = 0; i < count; i++) {
      this.addField({ suppressMessage: true });
    }
  }

  bindEvents() {
    if (this.addBtn) {
      this.addBtn.addEventListener('click', () => this.addField());
    }

    if (this.saveBtn) {
      this.saveBtn.addEventListener('click', () => this.saveObligaciones());
    }

    if (this.resetBtn) {
      this.resetBtn.addEventListener('click', () => this.resetFields());
    }

    document.addEventListener('admin:context-updated', this.boundContextHandler);
  }

  bootstrapFromContext() {
    try {
      const detail = { persona: this.adminManager?.ctx?.persona, contrato: this.adminManager?.ctx?.contrato };
      this.handleContextUpdate(detail);
    } catch (error) {
      console.warn('No se pudo inicializar obligaciones con el contexto actual', error);
    }
  }

  addField(options = {}) {
    if (this.fields.length >= this.maxSlots) {
      if (!options.suppressMessage) {
        this.showMessage(`Solo se permiten ${this.maxSlots} obligaciones.`, 'warning');
      }
      return null;
    }

    const index = this.fields.length;
    const wrapper = document.createElement('div');
    wrapper.className = 'bg-white border rounded p-3';
    wrapper.dataset.index = index;

    const label = document.createElement('div');
    label.className = 'flex items-center justify-between mb-2';
    label.innerHTML = `
      <span class="text-sm font-medium text-gray-700">Obligación ${index + 1}</span>
      ${index + 1 > this.defaultSlots ? '<button type="button" class="text-xs text-red-600 hover:underline" data-action="remove">Quitar</button>' : ''}
    `;

    const textarea = document.createElement('textarea');
    textarea.className = 'mt-1 p-2 border rounded w-full min-h-[96px]';
    textarea.placeholder = 'Describe la obligación...';
    textarea.dataset.index = index;

    const meta = { index, wrapper, textarea };
    this.fields.push(meta);

    wrapper.appendChild(label);
    const inputWrapper = document.createElement('div');
    inputWrapper.className = 'input-wrapper';
    inputWrapper.appendChild(textarea);
    wrapper.appendChild(inputWrapper);
    this.container.appendChild(wrapper);

    const removeBtn = wrapper.querySelector('[data-action="remove"]');
    if (removeBtn) {
      removeBtn.addEventListener('click', () => this.removeField(meta));
    }

    return meta;
  }

  removeField(fieldMeta) {
    if (!fieldMeta) return;

    const indexToRemove = this.fields.indexOf(fieldMeta);
    if (indexToRemove === -1) return;

    if (indexToRemove < this.defaultSlots) {
      // Keep default slots; just clear the textarea
      fieldMeta.textarea.value = '';
      fieldMeta.wrapper.dataset.obligacionId = '';
      return;
    }

    fieldMeta.wrapper.remove();
    this.fields.splice(indexToRemove, 1);
    this.relabelFields();
  }

  relabelFields() {
    this.fields.forEach((meta, idx) => {
      meta.index = idx;
      meta.wrapper.dataset.index = idx;
      meta.textarea.dataset.index = idx;

      const title = meta.wrapper.querySelector('.text-sm.font-medium');
      if (title) {
        title.textContent = `Obligación ${idx + 1}`;
      }

      const removeBtn = meta.wrapper.querySelector('[data-action="remove"]');
      if (removeBtn) {
        if (idx + 1 > this.defaultSlots) {
          removeBtn.classList.remove('hidden');
        } else {
          removeBtn.classList.add('hidden');
        }
      }
    });
  }

  async handleContextUpdate(detail = {}) {
    const contrato = detail.contrato;
    const contratoId = contrato ? (contrato.contrato_id || contrato.id) : null;

    if (!contratoId) {
      this.currentContratoId = null;
      this.resetFields({ keepSlots: true, silent: true });
      this.showMessage('Selecciona un contrato para cargar o guardar obligaciones.', 'info');
      return;
    }

    if (this.currentContratoId === contratoId) return;

    this.currentContratoId = contratoId;
    await this.loadObligaciones(contratoId);
  }

  async loadObligaciones(contratoId) {
    if (!contratoId) return;

    this.setLoading(true);
    try {
      const response = await this.adminManager.apiFetch('getObligacionesByContrato', { contrato_id: contratoId });
      if (response?.ok) {
        const items = Array.isArray(response.items) ? response.items : [];
        this.populateFields(items);
        if (items.length) {
          this.showMessage(`Se cargaron ${items.length} obligaciones registradas.`, 'success');
        } else {
          this.showMessage('Este contrato aún no tiene obligaciones registradas.', 'info');
        }
      } else {
        this.populateFields([]);
        this.showMessage(response?.error || 'No se pudieron cargar las obligaciones.', 'error');
      }
    } catch (error) {
      console.error('Error al cargar obligaciones contractuales', error);
      this.populateFields([]);
      this.showMessage('Error de conexión al cargar obligaciones.', 'error');
    } finally {
      this.setLoading(false);
    }
  }

  populateFields(items) {
    const sanitized = items.slice(0, this.maxSlots);
    const requiredSlots = Math.max(this.defaultSlots, sanitized.length);

    if (this.fields.length < requiredSlots) {
      const toAdd = requiredSlots - this.fields.length;
      for (let i = 0; i < toAdd; i++) {
        this.addField({ suppressMessage: true });
      }
    }

    this.fields.forEach((meta, idx) => {
      const data = sanitized[idx];
      const value = data?.Descripcion || '';
      meta.textarea.value = value;
      meta.wrapper.dataset.obligacionId = data?.obligacion_id || '';
    });

    // Clean remaining slots if there are fewer items than fields
    for (let i = sanitized.length; i < this.fields.length; i++) {
      this.fields[i].textarea.value = '';
      this.fields[i].wrapper.dataset.obligacionId = '';
    }
  }

  resetFields(options = {}) {
    const keepSlots = options.keepSlots === true;
    const silent = options.silent === true;

    if (!keepSlots) {
      this.renderInitialFields();
    } else {
      this.fields.forEach(meta => {
        meta.textarea.value = '';
        meta.wrapper.dataset.obligacionId = '';
      });
    }

    if (!silent) {
      this.showMessage('Campos de obligaciones reiniciados.', 'info');
    }
  }

  collectPayloads() {
    const contrato = this.adminManager?.ctx?.contrato;
    if (!contrato) {
      this.showMessage('Selecciona un contrato antes de guardar.', 'warning');
      return null;
    }

    const contratoId = contrato.contrato_id || contrato.id;
    const personaId = this.adminManager?.ctx?.persona ? (this.adminManager.ctx.persona.persona_id || this.adminManager.ctx.persona.id) : '';

    const activeFields = (this.fields && this.fields.length)
      ? this.fields
      : Array.from(this.container?.querySelectorAll('textarea') || []).map(textarea => ({
          textarea,
          wrapper: textarea.closest('[data-index]')
        }));

    const payloads = [];
    let totalFilled = 0;

    activeFields.forEach(meta => {
      const textarea = meta?.textarea;
      if (!textarea) return;
      const value = (textarea.value || '').trim();
      const wrapper = meta.wrapper || textarea.closest('[data-index]');
      const obligacionId = wrapper?.dataset?.obligacionId || '';

      if (!value) return;

      totalFilled += 1;
      payloads.push({
        obligacion_id: obligacionId,
        contrato_id: contratoId,
        persona_id: personaId,
        Descripcion: value
      });
    });

    return { payloads, totalFilled };
  }

  async saveObligaciones() {
    if (this.isSaving) return;

    const payloadResult = this.collectPayloads();
    if (!payloadResult) {
      return;
    }

    const { payloads, totalFilled } = payloadResult;

    if (totalFilled === 0) {
      this.showMessage('Ingresa al menos una obligación para guardar.', 'warning');
      return;
    }

    this.setSaving(true);
    try {
      const results = [];
      for (const payload of payloads) {
        const endpoint = payload.obligacion_id ? 'upsertObligacion' : 'crearObligacion';
        const response = await this.adminManager.apiFetch(endpoint, payload);
        results.push(response);
      }

      const failures = results.filter(r => !r?.ok);
      if (failures.length) {
        this.showMessage('Algunas obligaciones no se guardaron. Revisa la conexión e inténtalo nuevamente.', 'error');
      } else {
        this.showMessage('Obligaciones guardadas correctamente.', 'success');
        await this.loadObligaciones(this.currentContratoId);
      }
    } catch (error) {
      console.error('Error al guardar obligaciones contractuales', error);
      this.showMessage('Error al guardar las obligaciones.', 'error');
    } finally {
      this.setSaving(false);
    }
  }

  setLoading(isLoading) {
    if (isLoading) {
      this.container.classList.add('opacity-50', 'pointer-events-none');
      if (this.saveBtn) this.saveBtn.disabled = true;
      if (this.addBtn) this.addBtn.disabled = true;
      if (this.resetBtn) this.resetBtn.disabled = true;
    } else {
      this.container.classList.remove('opacity-50', 'pointer-events-none');
      if (this.saveBtn) this.saveBtn.disabled = false;
      if (this.addBtn) this.addBtn.disabled = false;
      if (this.resetBtn) this.resetBtn.disabled = false;
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
      this.saveBtn.innerHTML = '<span class="material-icons text-sm">save</span><span>Guardar obligaciones</span>';
    }
  }

  showMessage(message, type = 'info') {
    if (!this.resultBox) return;

    const styles = {
      success: 'bg-green-100 text-green-700',
      error: 'bg-red-100 text-red-700',
      warning: 'bg-yellow-100 text-yellow-700',
      info: 'bg-blue-100 text-blue-700'
    };

    this.resultBox.className = `mt-3 text-sm p-3 rounded ${styles[type] || styles.info}`;
    this.resultBox.textContent = message;

    clearTimeout(this.messageTimeout);
    this.messageTimeout = setTimeout(() => {
      this.resultBox.textContent = '';
      this.resultBox.className = 'mt-3 text-sm';
    }, 6000);
  }

  async handleSave() {
    await this.saveObligaciones();
  }

  destroy() {
    document.removeEventListener('admin:context-updated', this.boundContextHandler);
    if (this.messageTimeout) {
      clearTimeout(this.messageTimeout);
    }
  }
}
