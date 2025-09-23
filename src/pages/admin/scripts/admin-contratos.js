// Admin Contratos Component Script
export default class AdminContratos {
  constructor(adminManager) {
    this.adminManager = adminManager;
    this.formId = 'formContrato';
    this.init();
  }

  init() {
    this.bindFormEvents();
    this.setupValidation();
    this.setupCalculations();
  this.bindPreviewRefresh();
  }

  bindFormEvents() {
    const form = document.getElementById(this.formId);
    if (!form) return;

    // Bind new button events
    const btnEditar = document.getElementById('btnEditarContrato');
    const btnGuardarNuevo = document.getElementById('btnGuardarNuevo');
    
    if (btnEditar) {
      btnEditar.addEventListener('click', async (e) => {
        e.preventDefault();
        await this.handleEditarContrato();
      });
    }
    
    if (btnGuardarNuevo) {
      btnGuardarNuevo.addEventListener('click', async (e) => {
        e.preventDefault();
        await this.handleGuardarNuevo();
      });
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      // Default submit now uses the old upsertContrato for backward compatibility
      await this.handleSubmit();
    });

    // Real-time validation
    const inputs = form.querySelectorAll('input, select, textarea');
    const debounce = (fn, wait=700) => { let t; return (...a)=>{ clearTimeout(t); t = setTimeout(()=>fn(...a), wait); }; };

    // autosave for contrato: minimal required persona_id and Numero_contrato
    this.autoSaveContrato = debounce(async () => {
      try {
        const personaField = form.querySelector('[name="persona_id"]');
        const numeroField = form.querySelector('[name="Numero_contrato"]');
        if (!personaField || !numeroField) return;
        if (!personaField.value.trim() || !numeroField.value.trim()) return;

        // Apply any custom 'Otro' values so FormData gets the real value
        const tipoSelect = form.querySelector('#c_Tipo_vinculacion');
        const tipoCustom = form.querySelector('#c_Tipo_vinculacion_custom');
        if (tipoSelect && tipoCustom && tipoSelect.value === 'Otro' && tipoCustom.value.trim()) {
          tipoSelect.value = tipoCustom.value.trim();
        }
        const origenSelect = form.querySelector('#c_Origen_fondo');
        const origenCustom = form.querySelector('#c_Origen_fondo_custom');
        if (origenSelect && origenCustom && origenSelect.value === 'Otro' && origenCustom.value.trim()) {
          origenSelect.value = origenCustom.value.trim();
        }
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        try { this.setAutosaveStatus('Guardando...', 'saving'); } catch(e){}
        const res = await this.adminManager.apiFetch('upsertContrato', data);
        if (res && res.ok) {
          const hidden = form.querySelector('input[name="contrato_id"]');
          if (hidden && res.contrato_id) hidden.value = res.contrato_id;
          // Merge the full form data with returned contrato_id so context has usable fields immediately
          const contratoId = res.contrato_id || (res.data && res.data.contrato_id) || null;
          const merged = Object.assign({}, data || {}, {});
          if (contratoId) merged.contrato_id = contratoId;
          // Normalize persona id field name if present
          if (!merged.persona_id && merged.personaId) merged.persona_id = merged.personaId;
          this.adminManager.ctx.contrato = res.data || merged || this.adminManager.ctx.contrato;
          try { this.adminManager.saveCtx(); } catch(e){}
          // Update UI and preview so the contract info is visible immediately
          try { this.adminManager.updateContextUI(); } catch(e){}
          try { this.adminManager.updatePreviewPanel(); } catch(e){}
          // Optionally reload contratos for this persona to ensure server-synced list is current
          try { if (merged.persona_id) await this.adminManager.loadContratosForPersona(merged.persona_id); } catch(e){}
          try { this.setAutosaveStatus('Contrato guardado automáticamente', 'success'); } catch(e){}
        } else {
            try { this.setAutosaveStatus(res?.message || 'Error al guardar automáticamente', 'error'); } catch(e){}
        }
      } catch (e) {
        console.warn('autosave contrato failed', e);
          try { this.setAutosaveStatus('Error de conexión al guardar automáticamente', 'error'); } catch(err){}
      }
    }, 900);

    inputs.forEach(input => {
      input.addEventListener('blur', () => this.validateField(input));
      input.addEventListener('input', (e) => {
        this.clearFieldError(input);
        this.updatePreview();
        // If editing contract number, update central preview/context immediately
        try {
          if (input.id === 'c_Numero_contrato') {
            this.adminManager.ctx = this.adminManager.ctx || {};
            this.adminManager.ctx.contrato = this.adminManager.ctx.contrato || {};
            this.adminManager.ctx.contrato.Numero_contrato = input.value;
            try { this.adminManager.updatePreviewPanel(); } catch(e) {}
          }
        } catch(e) {}
        // Removed autosave on input - user prefers explicit Save
      });
    });

    // Date calculations
    const inicioInput = document.getElementById('c_Inicio');
    const finInput = document.getElementById('c_Fin');
    const plazoInput = document.getElementById('c_Plazo_meses');

    if (inicioInput && finInput) {
      inicioInput.addEventListener('change', () => this.calculatePlazo());
      finInput.addEventListener('change', () => this.calculatePlazo());
    }

    if (plazoInput) {
      plazoInput.addEventListener('input', () => this.calculateFechaFin());
    }

    // Custom select handling: Tipo_vinculacion and Origen_fondo
    const tipoSelect = document.getElementById('c_Tipo_vinculacion');
    const tipoCustom = document.getElementById('c_Tipo_vinculacion_custom');
    if (tipoSelect) {
      tipoSelect.addEventListener('change', () => {
        if (tipoSelect.value === 'Otro') {
          tipoCustom.classList.remove('hidden');
          tipoCustom.required = true;
        } else {
          tipoCustom.classList.add('hidden');
          tipoCustom.required = false;
          tipoCustom.value = '';
        }
        this.updatePreview();
      });
    }

    const origenSelect = document.getElementById('c_Origen_fondo');
    const origenCustom = document.getElementById('c_Origen_fondo_custom');
    if (origenSelect) {
      origenSelect.addEventListener('change', () => {
        if (origenSelect.value === 'Otro') {
          origenCustom.classList.remove('hidden');
          origenCustom.required = true;
        } else {
          origenCustom.classList.add('hidden');
          origenCustom.required = false;
          origenCustom.value = '';
        }
        this.updatePreview();
      });
    }

    // Value calculations
    const valorTotalInput = document.getElementById('c_Valor_total');
    const valorMensualInput = document.getElementById('c_Valor_mensual');

    if (valorTotalInput && valorMensualInput && plazoInput) {
      valorTotalInput.addEventListener('input', () => this.calculateValorMensual());
      valorMensualInput.addEventListener('input', () => this.calculateValorTotal());
    }
  }

  setupValidation() {
    this.validationRules = {
      persona_id: {
        required: true,
        message: 'Debe seleccionar una persona'
      },
      Numero_contrato: {
        // Keep required, but accept any format for contract numbers
        required: true,
        message: 'El número de contrato es requerido'
      },
      Inicio: {
        validate: (value) => {
          if (!value) return { valid: true };
          const fecha = new Date(value);
          const hoy = new Date();
          return {
            valid: fecha >= new Date(hoy.getFullYear() - 1, 0, 1),
            message: 'La fecha debe ser posterior al año anterior'
          };
        }
      },
      Fin: {
        validate: (value, formData) => {
          if (!value || !formData.Inicio) return { valid: true };
          const inicio = new Date(formData.Inicio);
          const fin = new Date(value);
          return {
            valid: fin > inicio,
            message: 'La fecha fin debe ser posterior a la fecha inicio'
          };
        }
      },
      Valor_total: {
        validate: (value) => {
          if (!value) return { valid: true };
          const num = parseFloat(value);
          return {
            valid: num > 0,
            message: 'El valor debe ser mayor a 0'
          };
        }
      }
    };
  }

  setupCalculations() {
    // Auto-fill persona_id from context
    this.updatePersonaContext();
  }

  validateField(field) {
    const fieldName = field.name;
    const rules = this.validationRules[fieldName];
    
    if (!rules) return true;

    const value = field.value.trim();
    let isValid = true;
    let message = '';

    // Required validation
    if (rules.required && !value) {
      isValid = false;
      message = rules.message || 'Este campo es requerido';
    }

    // Pattern validation
    if (value && rules.pattern && !rules.pattern.test(value)) {
      isValid = false;
      message = rules.message;
    }

    // Custom validation
    if (value && rules.validate) {
      const form = document.getElementById(this.formId);
      const formData = new FormData(form);
      const formObj = Object.fromEntries(formData.entries());
      const result = rules.validate(value, formObj);
      isValid = result.valid;
      if (!result.valid) message = result.message;
    }

    this.setFieldValidation(field, isValid, message);
    return isValid;
  }

  setFieldValidation(field, isValid, message) {
    const wrapper = field.closest('.input-wrapper');
    if (!wrapper) return;

    const existingError = wrapper.querySelector('.field-error');
    if (existingError) {
      existingError.remove();
    }

    if (isValid) {
      field.classList.remove('error');
    } else {
      field.classList.add('error');
      
      const errorElement = document.createElement('div');
      errorElement.className = 'field-error text-red-500 text-xs mt-1';
      errorElement.textContent = message;
      wrapper.appendChild(errorElement);
    }
  }

  clearFieldError(field) {
    field.classList.remove('error');
    const wrapper = field.closest('.input-wrapper');
    if (wrapper) {
      const errorElement = wrapper.querySelector('.field-error');
      if (errorElement) {
        errorElement.remove();
      }
    }
  }

  calculatePlazo() {
    const inicioInput = document.getElementById('c_Inicio');
    const finInput = document.getElementById('c_Fin');
    const plazoInput = document.getElementById('c_Plazo_meses');

    if (!inicioInput?.value || !finInput?.value || !plazoInput) return;

    const inicio = new Date(inicioInput.value);
    const fin = new Date(finInput.value);
    
    if (fin > inicio) {
      const meses = (fin.getFullYear() - inicio.getFullYear()) * 12 + 
                   (fin.getMonth() - inicio.getMonth());
      plazoInput.value = Math.max(1, meses);
      this.updatePreview();
    }
  }

  calculateFechaFin() {
    const inicioInput = document.getElementById('c_Inicio');
    const finInput = document.getElementById('c_Fin');
    const plazoInput = document.getElementById('c_Plazo_meses');

    if (!inicioInput?.value || !plazoInput?.value) return;

    const inicio = new Date(inicioInput.value);
    const meses = parseInt(plazoInput.value);
    
    if (meses > 0) {
      const fin = new Date(inicio);
      fin.setMonth(fin.getMonth() + meses);
      fin.setDate(fin.getDate() - 1); // Último día del mes anterior
      
      finInput.value = fin.toISOString().split('T')[0];
      this.updatePreview();
    }
  }

  calculateValorMensual() {
    const valorTotalInput = document.getElementById('c_Valor_total');
    const valorMensualInput = document.getElementById('c_Valor_mensual');
    const plazoInput = document.getElementById('c_Plazo_meses');

    if (!valorTotalInput?.value || !plazoInput?.value || !valorMensualInput) return;

    const total = parseFloat(valorTotalInput.value);
    const meses = parseInt(plazoInput.value);
    
    if (total > 0 && meses > 0) {
      const mensual = Math.round(total / meses);
      valorMensualInput.value = mensual;
      this.updatePreview();
    }
  }

  calculateValorTotal() {
    const valorTotalInput = document.getElementById('c_Valor_total');
    const valorMensualInput = document.getElementById('c_Valor_mensual');
    const plazoInput = document.getElementById('c_Plazo_meses');

    if (!valorMensualInput?.value || !plazoInput?.value || !valorTotalInput) return;

    const mensual = parseFloat(valorMensualInput.value);
    const meses = parseInt(plazoInput.value);
    
    if (mensual > 0 && meses > 0) {
      const total = mensual * meses;
      valorTotalInput.value = total;
      this.updatePreview();
    }
  }

  updatePersonaContext() {
    // visible field holds display name, hidden contains actual id
    const personaDisplay = document.getElementById('c_persona_id');
    const personaHidden = document.getElementById('c_persona_id_hidden');
    if (this.adminManager.ctx.persona) {
      if (personaDisplay) personaDisplay.value = this.adminManager.ctx.persona.Nombre || this.adminManager.ctx.persona.nombre || '';
      if (personaHidden) personaHidden.value = this.adminManager.ctx.persona.persona_id || this.adminManager.ctx.persona.id || '';
    } else {
      if (personaDisplay) personaDisplay.value = '';
      if (personaHidden) personaHidden.value = '';
    }
  }

  updatePreview() {
    // Update contract preview elements
    const numeroInput = document.getElementById('c_Numero_contrato');
    const inicioInput = document.getElementById('c_Inicio');
    const finInput = document.getElementById('c_Fin');
    const plazoInput = document.getElementById('c_Plazo_meses');
    const valorMensualInput = document.getElementById('c_Valor_mensual');
    const valorTotalInput = document.getElementById('c_Valor_total');

    // Update preview elements if they exist
    const previewContrato = document.getElementById('preview-contrato');
    const previewInicio = document.getElementById('preview-inicio-contrato');
    const previewFin = document.getElementById('preview-fin-contrato');
    const previewPlazo = document.getElementById('preview-plazo');
    const previewValorMensual = document.getElementById('preview-valor-mensual');
    const previewValorTotal = document.getElementById('preview-valor-total');

    if (previewContrato && numeroInput) {
      previewContrato.textContent = numeroInput.value || 'Contrato';
    }
    
    if (previewInicio && inicioInput) {
      previewInicio.textContent = this.formatDate(inicioInput.value) || '-';
    }
    
    if (previewFin && finInput) {
      previewFin.textContent = this.formatDate(finInput.value) || '-';
    }
    
    if (previewPlazo && plazoInput) {
      const meses = plazoInput.value;
      previewPlazo.textContent = meses ? `${meses} meses` : '-';
    }
    
    if (previewValorMensual && valorMensualInput) {
      previewValorMensual.textContent = this.formatCurrency(valorMensualInput.value) || '-';
    }
    
    if (previewValorTotal && valorTotalInput) {
      previewValorTotal.textContent = this.formatCurrency(valorTotalInput.value) || '-';
    }
  }

  // Bind refresh button in the contractor preview panel to allow manual reload with spinner
  bindPreviewRefresh() {
    try {
      this.contractualRefreshBtn = document.getElementById('contractualPreviewRefresh');
      if (!this.contractualRefreshBtn) return;

      this.contractualRefreshBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        await this.refreshPreviewWithSpinner();
      });
    } catch (e) {
      console.warn('bindPreviewRefresh failed', e);
    }
  }

  async refreshPreviewWithSpinner() {
    const btn = this.contractualRefreshBtn;
    if (!btn) return;
    try {
      // show spinner
      btn.disabled = true;
      const icon = btn.querySelector('.material-icons');
      if (icon) icon.classList.add('animate-spin');

      // Optional: reload contratos for the current persona to ensure preview uses latest server data
      try {
        if (this.adminManager && this.adminManager.ctx && this.adminManager.ctx.persona && (this.adminManager.ctx.persona.persona_id || this.adminManager.ctx.persona.id)) {
          await this.adminManager.loadContratosForPersona(this.adminManager.ctx.persona.persona_id || this.adminManager.ctx.persona.id);
        }
      } catch (e) {
        // ignore reload errors but log
        console.warn('Failed to reload contratos during preview refresh', e);
      }

      // Update preview visuals
      try { this.updatePreview(); } catch (e) { console.warn('updatePreview failed', e); }

    } finally {
      // hide spinner
      btn.disabled = false;
      const icon = btn.querySelector('.material-icons');
      if (icon) icon.classList.remove('animate-spin');
    }
  }

  async handleSubmit() {
    const form = document.getElementById(this.formId);
    if (!form) return;

    // Validate all fields
    const inputs = form.querySelectorAll('input[required], select[required]');
    let isFormValid = true;

    inputs.forEach(input => {
      if (!this.validateField(input)) {
        isFormValid = false;
      }
    });

    if (!isFormValid) {
      this.showResult('Por favor, corrija los errores en el formulario', 'error');
      return;
    }

  // Collect form data (use hidden persona_id)
    // Ensure custom selects are applied
    const tipoSelect = form.querySelector('#c_Tipo_vinculacion');
    const tipoCustom = form.querySelector('#c_Tipo_vinculacion_custom');
    if (tipoSelect && tipoCustom && tipoSelect.value === 'Otro' && tipoCustom.value.trim()) {
      tipoSelect.value = tipoCustom.value.trim();
    }
    const origenSelect = form.querySelector('#c_Origen_fondo');
    const origenCustom = form.querySelector('#c_Origen_fondo_custom');
    if (origenSelect && origenCustom && origenSelect.value === 'Otro' && origenCustom.value.trim()) {
      origenSelect.value = origenCustom.value.trim();
    }
    const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());

    // Show loading
    this.setFormLoading(true);

    try {
  // Use upsertContrato (backend supports upsertContrato for create/update)
  const result = await this.adminManager.apiFetch('upsertContrato', data);

      if (result && result.ok) {
        this.showResult('Contrato guardado exitosamente', 'success');
        
        // Update context if successful
        if (result.data) {
          this.adminManager.ctx.contrato = result.data;
          this.adminManager.updateContextUI();
          this.adminManager.saveCtx();
        }

        // Update hidden ID field
        if (result.data && result.data.contrato_id) {
          const hiddenIdField = form.querySelector('input[name="contrato_id"]');
          if (hiddenIdField) {
            hiddenIdField.value = result.data.contrato_id;
          }
        }
      } else {
        this.showResult(result?.message || 'Error al guardar el contrato', 'error');
      }
    } catch (error) {
      console.error('Error saving contrato:', error);
      this.showResult('Error de conexión al guardar el contrato', 'error');
    } finally {
      this.setFormLoading(false);
    }
  }

  async handleEditarContrato() {
    const form = document.getElementById(this.formId);
    if (!form) return;

    // Check if we have a contrato_id to edit
    const contratoId = form.querySelector('input[name="contrato_id"]')?.value;
    if (!contratoId) {
      this.showResult('No hay contrato seleccionado para editar. Use "Guardar Nuevo" para crear uno nuevo.', 'error');
      return;
    }

    // Validate all fields
    const inputs = form.querySelectorAll('input[required], select[required]');
    let isFormValid = true;

    inputs.forEach(input => {
      if (!this.validateField(input)) {
        isFormValid = false;
      }
    });

    if (!isFormValid) {
      this.showResult('Por favor, corrija los errores en el formulario', 'error');
      return;
    }

    // Collect form data
    const tipoSelect = form.querySelector('#c_Tipo_vinculacion');
    const tipoCustom = form.querySelector('#c_Tipo_vinculacion_custom');
    if (tipoSelect && tipoCustom && tipoSelect.value === 'Otro' && tipoCustom.value.trim()) {
      tipoSelect.value = tipoCustom.value.trim();
    }
    const origenSelect = form.querySelector('#c_Origen_fondo');
    const origenCustom = form.querySelector('#c_Origen_fondo_custom');
    if (origenSelect && origenCustom && origenSelect.value === 'Otro' && origenCustom.value.trim()) {
      origenSelect.value = origenCustom.value.trim();
    }
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    // Show loading
    this.setFormLoading(true, 'Editando...');

    try {
      const result = await this.adminManager.apiFetch('editarContrato', data);

      if (result && result.ok) {
        this.showResult('Contrato editado exitosamente', 'success');
        
        // Update context if successful
        if (result.contrato_id) {
          // Reload the contract data to show updated values
          const updatedData = Object.assign({}, data, { contrato_id: result.contrato_id });
          this.adminManager.ctx.contrato = updatedData;
          this.adminManager.updateContextUI();
          this.adminManager.saveCtx();
        }
      } else {
        this.showResult(result?.error || 'Error al editar el contrato', 'error');
      }
    } catch (error) {
      console.error('Error editing contrato:', error);
      this.showResult('Error de conexión al editar el contrato', 'error');
    } finally {
      this.setFormLoading(false);
    }
  }

  async handleGuardarNuevo() {
    const form = document.getElementById(this.formId);
    if (!form) return;

    // Validate all fields
    const inputs = form.querySelectorAll('input[required], select[required]');
    let isFormValid = true;

    inputs.forEach(input => {
      if (!this.validateField(input)) {
        isFormValid = false;
      }
    });

    if (!isFormValid) {
      this.showResult('Por favor, corrija los errores en el formulario', 'error');
      return;
    }

    // Collect form data
    const tipoSelect = form.querySelector('#c_Tipo_vinculacion');
    const tipoCustom = form.querySelector('#c_Tipo_vinculacion_custom');
    if (tipoSelect && tipoCustom && tipoSelect.value === 'Otro' && tipoCustom.value.trim()) {
      tipoSelect.value = tipoCustom.value.trim();
    }
    const origenSelect = form.querySelector('#c_Origen_fondo');
    const origenCustom = form.querySelector('#c_Origen_fondo_custom');
    if (origenSelect && origenCustom && origenSelect.value === 'Otro' && origenCustom.value.trim()) {
      origenSelect.value = origenCustom.value.trim();
    }
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    // Remove contrato_id so backend knows to create new
    delete data.contrato_id;

    // Show loading
    this.setFormLoading(true, 'Creando nuevo contrato...');

    try {
      const result = await this.adminManager.apiFetch('guardarNuevoContrato', data);

      if (result && result.ok) {
        this.showResult('Nuevo contrato creado exitosamente. Los contratos anteriores fueron marcados como Finalizados.', 'success');
        
        // Update form with new contrato_id
        if (result.contrato_id) {
          const hiddenIdField = form.querySelector('input[name="contrato_id"]');
          if (hiddenIdField) {
            hiddenIdField.value = result.contrato_id;
          }
          
          // Update context
          const newContrato = Object.assign({}, data, { contrato_id: result.contrato_id });
          this.adminManager.ctx.contrato = newContrato;
          this.adminManager.updateContextUI();
          this.adminManager.saveCtx();
        }
      } else {
        this.showResult(result?.error || 'Error al crear el nuevo contrato', 'error');
      }
    } catch (error) {
      console.error('Error creating new contrato:', error);
      this.showResult('Error de conexión al crear el nuevo contrato', 'error');
    } finally {
      this.setFormLoading(false);
    }
  }

  setFormLoading(loading, customMessage = null) {
    const form = document.getElementById(this.formId);
    const submitBtn = form?.querySelector('button[type="submit"]');
    const btnEditar = document.getElementById('btnEditarContrato');
    const btnGuardarNuevo = document.getElementById('btnGuardarNuevo');
    
    if (loading) {
      form?.classList.add('loading');
      
      // Disable all action buttons
      if (submitBtn) submitBtn.disabled = true;
      if (btnEditar) {
        btnEditar.disabled = true;
        if (customMessage === 'Editando...') {
          btnEditar.innerHTML = '<span class="material-icons text-sm animate-spin">sync</span><span>Editando...</span>';
        } else {
          btnEditar.disabled = true;
        }
      }
      if (btnGuardarNuevo) {
        btnGuardarNuevo.disabled = true;
        if (customMessage === 'Creando nuevo contrato...') {
          btnGuardarNuevo.innerHTML = '<span class="material-icons text-sm animate-spin">sync</span><span>Creando...</span>';
        } else {
          btnGuardarNuevo.disabled = true;
        }
      }
      
      if (submitBtn && !customMessage) {
        submitBtn.innerHTML = '<span class="material-icons text-sm animate-spin">sync</span><span>Guardando...</span>';
      }
    } else {
      form?.classList.remove('loading');
      
      // Re-enable all action buttons with original text
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span class="material-icons text-sm">save</span><span>Guardar Contrato</span>';
      }
      if (btnEditar) {
        btnEditar.disabled = false;
        btnEditar.innerHTML = '<span class="material-icons text-sm">edit</span><span>Editar Contrato</span>';
      }
      if (btnGuardarNuevo) {
        btnGuardarNuevo.disabled = false;
        btnGuardarNuevo.innerHTML = '<span class="material-icons text-sm">add</span><span>Guardar Nuevo</span>';
      }
    }
  }

  // Public wrapper used by admin main to trigger save
  async handleSave() {
    return this.handleSubmit();
  }

  showResult(message, type) {
    const resultDiv = document.getElementById('contratoResult');
    if (!resultDiv) return;

    const bgColor = type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700';
    resultDiv.className = `mt-3 text-sm p-3 rounded ${bgColor}`;
    resultDiv.textContent = message;

    setTimeout(() => {
      resultDiv.textContent = '';
      resultDiv.className = 'mt-3 text-sm';
    }, 5000);
  }

  // Autosave status indicator (saving / success / error)
  setAutosaveStatus(message, type) {
    const resultDiv = document.getElementById('contratoResult');
    if (!resultDiv) return;
    let bgColor;
    if (type === 'saving') bgColor = 'bg-yellow-100 text-yellow-800';
    else if (type === 'success') bgColor = 'bg-green-100 text-green-700';
    else bgColor = 'bg-red-100 text-red-700';

    resultDiv.className = `mt-3 text-sm p-3 rounded ${bgColor}`;
    resultDiv.textContent = message;

    if (type !== 'saving') {
      setTimeout(() => {
        resultDiv.textContent = '';
        resultDiv.className = 'mt-3 text-sm';
      }, 2500);
    }
  }

  // Utility functions
  formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES');
  }

  formatCurrency(value) {
    if (!value) return '';
    const num = parseFloat(value);
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(num);
  }

  // Load contract data into form
  loadContratoData(contrato) {
    if (!contrato) return;

    const form = document.getElementById(this.formId);
    if (!form) return;

    const fieldMapping = {
      'c_contrato_id': 'contrato_id',
      'c_persona_id': 'persona_id',
      'c_Numero_contrato': 'Numero_contrato',
      'c_Tipo_vinculacion': 'Tipo_vinculacion',
      'c_Objeto': 'Objeto',
      'c_Inicio': 'Inicio',
      'c_Fin': 'Fin',
      'c_Plazo_meses': 'Plazo_meses',
      'c_Valor_total': 'Valor_total',
      'c_Valor_mensual': 'Valor_mensual',
      'c_Origen_fondo': 'Origen_fondo',
      'c_Supervisor': 'Supervisor',
      'c_Numero_CDP': 'Numero_CDP',
      'c_Fecha_CDP': 'Fecha_CDP',
      'c_Numero_RC': 'Numero_RC',
      'c_Fecha_RC': 'Fecha_RC',
      'c_Estado': 'Estado',
      'c_Carpeta_Drive_URL': 'Carpeta_Drive_URL'
    };

    Object.entries(fieldMapping).forEach(([fieldId, dataKey]) => {
      // Skip persona mapping here - we handle persona display/hidden explicitly below
      if (fieldId === 'c_persona_id') return;
      const field = document.getElementById(fieldId);
      if (field && contrato[dataKey] !== undefined) {
        field.value = contrato[dataKey];
      }
    });

    // Populate persona hidden id and visible display safely
    const personaHidden = document.getElementById('c_persona_id_hidden');
    const personaDisplay = document.getElementById('c_persona_id');
    const personaId = contrato.persona_id || contrato.personaId || contrato.persona || null;
    if (personaHidden) personaHidden.value = personaId || '';

    // Determine a display name: prefer explicit fields in contrato, otherwise use current ctx persona when ids match
    let displayName = '';
    if (contrato.persona_nombre) displayName = contrato.persona_nombre;
    else if (contrato.Nombre) displayName = contrato.Nombre;
    else if (this.adminManager && this.adminManager.ctx && this.adminManager.ctx.persona && this.adminManager.ctx.persona.persona_id && personaId && this.adminManager.ctx.persona.persona_id === personaId) {
      displayName = this.adminManager.ctx.persona.Nombre || this.adminManager.ctx.persona.nombre || '';
    }

    if (personaDisplay) personaDisplay.value = displayName;

    this.updatePreview();
  }

  // Clear form
  clearForm() {
    // Skip if suppression flags are active (selection in-progress or tests running)
    if (window._globalSuppressClear || window._adminTestSuiteRunning || this.adminManager?._suppressAutoClear) {
      console.log('clearForm suppressed in AdminContratos due to global/test suppression');
      return;
    }

    const form = document.getElementById(this.formId);
    if (form) {
      form.reset();

      const errorElements = form.querySelectorAll('.field-error');
      errorElements.forEach(el => el.remove());

      const errorFields = form.querySelectorAll('.error');
      errorFields.forEach(field => field.classList.remove('error'));
    }

    this.updatePreview();
  }
}
