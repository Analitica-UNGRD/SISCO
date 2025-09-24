// Admin Datos Básicos Component Script
export default class AdminDatosBasicos {
  constructor(adminManager) {
    this.adminManager = adminManager;
    this.formId = 'formPersona';
    this.init();
  }

  init() {
    this.bindFormEvents();
    this.setupValidation();
  }

  bindFormEvents() {
    const form = document.getElementById(this.formId);
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleSubmit();
    });

    // Real-time validation
    const inputs = form.querySelectorAll('input, select');
    // debounce helper
    const debounce = (fn, wait=600) => { let t; return (...a)=>{ clearTimeout(t); t = setTimeout(()=>fn(...a), wait); }; };

    // autosave: validate minimal required fields then upsert persona
  this.autoSavePersona = debounce(async () => {
      try {
        // minimal validation: Identificacion and Nombre required
        const ident = form.querySelector('[name="Identificacion"]');
        const nombre = form.querySelector('[name="Nombre"]');
        if (!ident || !nombre) return;
        if (!ident.value.trim() || !nombre.value.trim()) return; // don't autosave incomplete

        // collect data and call upsert
        // If Grupo_OAPI has a custom value, copy it into the select so FormData contains the real value
        const grupoSelect = form.querySelector('#p_Grupo_OAPI');
        const grupoCustom = form.querySelector('#p_Grupo_OAPI_custom');
        if (grupoSelect && grupoCustom && grupoSelect.value === 'Otro' && grupoCustom.value.trim()) {
          grupoSelect.value = grupoCustom.value.trim();
        }
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        // Use upsertPersona if available on backend
        try { this.setAutosaveStatus('Guardando...', 'saving'); } catch(e){}
        const res = await this.adminManager.apiFetch('upsertPersona', data);
        if (res && res.ok) {
          // write back persona_id to hidden field
          const hidden = form.querySelector('input[name="persona_id"]');
          if (hidden && res.persona_id) hidden.value = res.persona_id;
          // if API returned the persona object or id, update context
          this.adminManager.ctx.persona = res.data || res || this.adminManager.ctx.persona;
          try { this.adminManager.saveCtx(); } catch(e){}
          // visual feedback
          try { this.setAutosaveStatus('Guardado automáticamente', 'success'); } catch(e){}
        } else {
          try { this.setAutosaveStatus(res?.message || 'Error al guardar automáticamente', 'error'); } catch(e){}
        }
      } catch (e) {
  console.warn('autosave persona failed', e);
  try { this.setAutosaveStatus('Error de conexión al guardar automáticamente', 'error'); } catch(err){}
      }
    }, 800);

    inputs.forEach(input => {
      input.addEventListener('blur', () => this.validateField(input));
      // Remove autosave on input - user requested explicit Save button only
      input.addEventListener('input', (e) => { this.clearFieldError(input); });
    });

    // Context updates
    const identInput = document.getElementById('p_Identificacion');
    const nombreInput = document.getElementById('p_Nombre');
    
    if (identInput) {
      identInput.addEventListener('input', () => this.updatePreview());
    }
    
    if (nombreInput) {
      nombreInput.addEventListener('input', () => this.updatePreview());
    }

    // Grupo OAPI: show custom input when 'Otro' selected
    const grupoSelect = document.getElementById('p_Grupo_OAPI');
    const grupoCustom = document.getElementById('p_Grupo_OAPI_custom');
    if (grupoSelect) {
      grupoSelect.addEventListener('change', () => {
        if (grupoSelect.value === 'Otro') {
          grupoCustom.classList.remove('hidden');
          grupoCustom.required = true;
        } else {
          grupoCustom.classList.add('hidden');
          grupoCustom.required = false;
          grupoCustom.value = '';
        }
        this.updatePreview();
      });
    }
  }

  setupValidation() {
    this.validationRules = {
      Identificacion: {
        required: true,
        pattern: /^[0-9]+$/,
        message: 'La identificación debe contener solo números'
      },
      Tipo_identificacion: {
        required: true,
        message: 'El tipo de identificación es requerido'
      },
      Nombre: {
        required: true,
        minLength: 2,
        message: 'El nombre debe tener al menos 2 caracteres'
      },
      Correo: {
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        message: 'Ingrese un correo electrónico válido'
      }
    };
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
      message = 'Este campo es requerido';
    }

    // Pattern validation
    if (value && rules.pattern && !rules.pattern.test(value)) {
      isValid = false;
      message = rules.message;
    }

    // MinLength validation
    if (value && rules.minLength && value.length < rules.minLength) {
      isValid = false;
      message = rules.message;
    }

    this.setFieldValidation(field, isValid, message);
    return isValid;
  }

  setFieldValidation(field, isValid, message) {
    const wrapper = field.closest('.input-wrapper');
    if (!wrapper) return;

    // Remove existing error elements
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

    // Collect form data
    // Ensure custom Grupo_OAPI is applied if present
    const grupoSelect = form.querySelector('#p_Grupo_OAPI');
    const grupoCustom = form.querySelector('#p_Grupo_OAPI_custom');
    if (grupoSelect && grupoCustom && grupoSelect.value === 'Otro' && grupoCustom.value.trim()) {
      grupoSelect.value = grupoCustom.value.trim();
    }
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    // Show loading
    this.setFormLoading(true);

    try {
  // Use upsertPersona for create or update (backend supports this)
  const result = await this.adminManager.apiFetch('upsertPersona', data);

      if (result && result.ok) {
        this.showResult('Persona guardada exitosamente', 'success');
        
        // Update context if successful
        if (result.data) {
          this.adminManager.ctx.persona = result.data;
          this.adminManager.updateContextUI();
          this.adminManager.saveCtx();
        }

        // Update hidden ID field for future updates: backend may return persona_id at top-level or inside data
        const returnedId = result.persona_id || (result.data && result.data.persona_id) || null;
        if (returnedId) {
          const hiddenIdField = form.querySelector('input[name="persona_id"]');
          if (hiddenIdField) hiddenIdField.value = returnedId;
        }
      } else {
        this.showResult(result?.message || 'Error al guardar la persona', 'error');
      }
    } catch (error) {
      console.error('Error saving persona:', error);
      this.showResult('Error de conexión al guardar la persona', 'error');
    } finally {
      this.setFormLoading(false);
    }
  }

  // Public wrapper used by admin main to trigger save
  async handleSave() {
    return this.handleSubmit();
  }

  setFormLoading(loading) {
    const form = document.getElementById(this.formId);
    const submitBtn = form?.querySelector('button[type="submit"]');
    
    if (loading) {
      form?.classList.add('loading');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="material-icons text-sm animate-spin">sync</span><span>Guardando...</span>';
      }
    } else {
      form?.classList.remove('loading');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span class="material-icons">save</span><span>Guardar Persona</span>';
      }
    }
  }

  showResult(message, type) {
    const resultDiv = document.getElementById('personaResult');
    if (!resultDiv) return;

    const bgColor = type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700';
    resultDiv.className = `mt-3 text-sm p-3 rounded ${bgColor}`;
    resultDiv.textContent = message;

    // Clear after 5 seconds
    setTimeout(() => {
      resultDiv.textContent = '';
      resultDiv.className = 'mt-3 text-sm';
    }, 5000);
  }

  // Autosave status indicator (saving / success / error)
  setAutosaveStatus(message, type) {
    const resultDiv = document.getElementById('personaResult');
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

  updatePreview() {
    // Update preview panel with current form data
    const nombreInput = document.getElementById('p_Nombre');
    const identInput = document.getElementById('p_Identificacion');
    const correoInput = document.getElementById('p_Correo');
    const grupoInput = document.getElementById('p_Grupo_OAPI');
    const perfilInput = document.getElementById('p_Perfil');

    // Update preview elements if they exist
    const previewNombre = document.getElementById('preview-nombre');
    const previewIdent = document.getElementById('preview-identificacion');
    const previewCorreo = document.getElementById('preview-correo');
    const previewGrupo = document.getElementById('preview-grupo-oapi');
    const previewPerfil = document.getElementById('preview-perfil');

    if (previewNombre && nombreInput) {
      previewNombre.textContent = nombreInput.value || 'Nombre del contratista';
    }
    
    if (previewIdent && identInput) {
      previewIdent.textContent = this.adminManager.formatIdWithDots(identInput.value) || '12345678';
    }
    
    if (previewCorreo && correoInput) {
      previewCorreo.textContent = correoInput.value || 'correo@ejemplo.com';
    }
    
    if (previewGrupo && grupoInput) {
      previewGrupo.textContent = grupoInput.value || 'Sistemas';
    }
    
    if (previewPerfil && perfilInput) {
      previewPerfil.textContent = perfilInput.value || 'Perfil';
    }
  }

  // Load persona data into form
  loadPersonaData(persona) {
    if (!persona) return;

    const form = document.getElementById(this.formId);
    if (!form) return;

    // Map persona data to form fields
    const fieldMapping = {
      'p_persona_id': 'persona_id',
      'p_Nombre': 'Nombre',
      'p_Identificacion': 'Identificacion',
      'p_Correo': 'Correo',
      'p_Tipo_identificacion': 'Tipo_identificacion',
      'p_Grupo_OAPI': 'Grupo_OAPI',
      'p_Perfil': 'Perfil',
      'p_Estado': 'Estado'
    };

    Object.entries(fieldMapping).forEach(([fieldId, dataKey]) => {
      const field = document.getElementById(fieldId);
      if (field && persona[dataKey] !== undefined) {
        field.value = persona[dataKey];
      }
    });

    // Update preview
    this.updatePreview();
  }

  // Clear form
  clearForm() {
    // Avoid clearing during in-progress persona selection or while tests run
    if (window._globalSuppressClear || window._adminTestSuiteRunning || this.adminManager?._suppressAutoClear) {
      console.log('clearForm suppressed in AdminDatosBasicos due to global/test suppression');
      return;
    }

    const form = document.getElementById(this.formId);
    if (form) {
      form.reset();

      // Clear all validation errors
      const errorElements = form.querySelectorAll('.field-error');
      errorElements.forEach(el => el.remove());

      const errorFields = form.querySelectorAll('.error');
      errorFields.forEach(field => field.classList.remove('error'));
    }

    this.updatePreview();
  }
}
