// Admin Obligaciones Component Script
export default class AdminObligaciones {
  constructor(adminManager) {
    this.adminManager = adminManager;
    this.formId = 'formObligacion';
    this.init();
  }

  init() {
    this.bindFormEvents();
    this.setupValidation();
    this.updateContextFields();
  }

  bindFormEvents() {
    const form = document.getElementById(this.formId);
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleSubmit();
    });

    // Real-time validation
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      input.addEventListener('blur', () => this.validateField(input));
      input.addEventListener('input', () => {
        this.clearFieldError(input);
        this.updatePreview();
      });
    });

    // Auto-format period field
    const periodoInput = document.getElementById('o_Periodo');
    if (periodoInput) {
      periodoInput.addEventListener('input', (e) => {
        this.formatPeriodoInput(e.target);
      });
    }
  }

  setupValidation() {
    this.validationRules = {
      contrato_id: {
        required: true,
        message: 'Debe seleccionar un contrato'
      },
      Descripcion: {
        required: true,
        minLength: 10,
        message: 'La descripción debe tener al menos 10 caracteres'
      },
      Periodo: {
        pattern: /^\d{4}-\d{2}$/,
        message: 'Formato requerido: YYYY-MM (ej: 2025-01)'
      },
      Evidencia_URL: {
        validate: (value) => {
          if (!value) return { valid: true };
          try {
            new URL(value);
            return { valid: true };
          } catch {
            return { valid: false, message: 'Ingrese una URL válida' };
          }
        }
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
      message = rules.message || 'Este campo es requerido';
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

    // Custom validation
    if (value && rules.validate) {
      const result = rules.validate(value);
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

  formatPeriodoInput(input) {
    let value = input.value.replace(/\D/g, ''); // Solo números
    
    if (value.length >= 4) {
      value = value.substring(0, 4) + '-' + value.substring(4, 6);
    }
    
    input.value = value;
  }

  updateContextFields() {
    // Auto-fill from context
    const contratoIdInput = document.getElementById('o_contrato_id');
    const personaIdInput = document.getElementById('o_persona_id');
    
    if (contratoIdInput && this.adminManager.ctx.contrato) {
      contratoIdInput.value = this.adminManager.ctx.contrato.contrato_id || this.adminManager.ctx.contrato.id || '';
    }
    
    if (personaIdInput && this.adminManager.ctx.persona) {
      personaIdInput.value = this.adminManager.ctx.persona.persona_id || this.adminManager.ctx.persona.id || '';
    }

    // Auto-fill current period
    const periodoInput = document.getElementById('o_Periodo');
    if (periodoInput && !periodoInput.value) {
      const now = new Date();
      const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      periodoInput.value = currentPeriod;
    }
  }

  updatePreview() {
    // Update preview elements if they exist
    const descripcionInput = document.getElementById('o_Descripcion');
    const periodoInput = document.getElementById('o_Periodo');
    const estadoInput = document.getElementById('o_Estado');

    // Update preview list
    const previewList = document.getElementById('preview-obligaciones-list');
    const obligacionesList = document.getElementById('obligaciones-list');

    if (previewList || obligacionesList) {
      const currentData = {
        descripcion: descripcionInput?.value || 'Descripción de la obligación',
        periodo: periodoInput?.value || new Date().toISOString().slice(0, 7),
        estado: estadoInput?.value || 'Pendiente'
      };

      const previewHtml = this.generateObligacionPreview(currentData);
      
      if (previewList) previewList.innerHTML = previewHtml;
      if (obligacionesList) obligacionesList.innerHTML = previewHtml;
    }
  }

  generateObligacionPreview(obligacion) {
    const estadoClass = this.getEstadoClass(obligacion.estado);
    
    return `
      <div class="preview-obligation-item p-3 bg-white border rounded-lg mb-2 hover:shadow-md transition-shadow">
        <div class="flex items-start justify-between mb-2">
          <h4 class="font-medium text-gray-800 text-sm">${obligacion.descripcion}</h4>
          <span class="status-badge ${estadoClass} text-xs px-2 py-1 rounded">${obligacion.estado}</span>
        </div>
        <div class="text-xs text-gray-600 flex items-center gap-4">
          <span class="flex items-center gap-1">
            <span class="material-icons text-xs">calendar_month</span>
            ${this.formatPeriod(obligacion.periodo)}
          </span>
          ${obligacion.actividades ? `
            <span class="flex items-center gap-1">
              <span class="material-icons text-xs">task_alt</span>
              Actividades registradas
            </span>
          ` : ''}
        </div>
      </div>
    `;
  }

  getEstadoClass(estado) {
    switch (estado?.toLowerCase()) {
      case 'completada': return 'bg-green-100 text-green-800';
      case 'en proceso': return 'bg-blue-100 text-blue-800';
      case 'pendiente': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  formatPeriod(period) {
    if (!period) return '';
    const [year, month] = period.split('-');
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
  }

  async handleSubmit() {
    const form = document.getElementById(this.formId);
    if (!form) return;

    // Validate all fields
    const inputs = form.querySelectorAll('input[required], select[required], textarea[required]');
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
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    // Ensure context fields are populated
    if (!data.contrato_id && this.adminManager.ctx.contrato) {
      data.contrato_id = this.adminManager.ctx.contrato.contrato_id || this.adminManager.ctx.contrato.id;
    }
    if (!data.persona_id && this.adminManager.ctx.persona) {
      data.persona_id = this.adminManager.ctx.persona.persona_id || this.adminManager.ctx.persona.id;
    }

    // Show loading
    this.setFormLoading(true);

    try {
      const isUpdate = data.obligacion_id && data.obligacion_id !== '';
      const endpoint = isUpdate ? 'updateObligacion' : 'createObligacion';

      const result = await this.adminManager.apiFetch(endpoint, data);

      if (result && result.ok) {
        this.showResult('Obligación guardada exitosamente', 'success');
        
        // Update hidden ID field
        if (result.data && result.data.obligacion_id) {
          const hiddenIdField = form.querySelector('input[name="obligacion_id"]');
          if (hiddenIdField) {
            hiddenIdField.value = result.data.obligacion_id;
          }
        }

        // Refresh obligations list if available
        await this.loadObligacionesList();
      } else {
        this.showResult(result?.message || 'Error al guardar la obligación', 'error');
      }
    } catch (error) {
      console.error('Error saving obligacion:', error);
      this.showResult('Error de conexión al guardar la obligación', 'error');
    } finally {
      this.setFormLoading(false);
    }
  }

  async loadObligacionesList() {
    if (!this.adminManager.ctx.contrato) return;

    try {
      const contratoId = this.adminManager.ctx.contrato.contrato_id || this.adminManager.ctx.contrato.id;
      const result = await this.adminManager.apiFetch('getObligacionesByContrato', { contrato_id: contratoId });
      
      if (result && result.ok) {
        const obligaciones = Array.isArray(result.data) ? result.data : [];
        this.renderObligacionesList(obligaciones);
      }
    } catch (error) {
      console.error('Error loading obligaciones:', error);
    }
  }

  renderObligacionesList(obligaciones) {
    const previewList = document.getElementById('preview-obligaciones-list');
    const obligacionesList = document.getElementById('obligaciones-list');

    if (obligaciones.length === 0) {
      const emptyMessage = '<div class="text-gray-500 text-center py-4">No hay obligaciones registradas</div>';
      if (previewList) previewList.innerHTML = emptyMessage;
      if (obligacionesList) obligacionesList.innerHTML = emptyMessage;
      return;
    }

    const listHtml = obligaciones.map(obligacion => this.generateObligacionPreview(obligacion)).join('');
    
    if (previewList) previewList.innerHTML = listHtml;
    if (obligacionesList) obligacionesList.innerHTML = listHtml;
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
        submitBtn.innerHTML = '<span class="material-icons text-sm">save</span><span>Guardar Obligación</span>';
      }
    }
  }

  showResult(message, type) {
    const resultDiv = document.getElementById('obligacionResult');
    if (!resultDiv) return;

    const bgColor = type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700';
    resultDiv.className = `mt-3 text-sm p-3 rounded ${bgColor}`;
    resultDiv.textContent = message;

    setTimeout(() => {
      resultDiv.textContent = '';
      resultDiv.className = 'mt-3 text-sm';
    }, 5000);
  }

  // Load obligation data into form
  loadObligacionData(obligacion) {
    if (!obligacion) return;

    const form = document.getElementById(this.formId);
    if (!form) return;

    const fieldMapping = {
      'o_obligacion_id': 'obligacion_id',
      'o_contrato_id': 'contrato_id',
      'o_persona_id': 'persona_id',
      'o_Descripcion': 'Descripcion',
      'o_Actividades_realizadas': 'Actividades_realizadas',
      'o_Producto': 'Producto',
      'o_Periodo': 'Periodo',
      'o_Estado': 'Estado',
      'o_Evidencia_URL': 'Evidencia_URL'
    };

    Object.entries(fieldMapping).forEach(([fieldId, dataKey]) => {
      const field = document.getElementById(fieldId);
      if (field && obligacion[dataKey] !== undefined) {
        field.value = obligacion[dataKey];
      }
    });

    this.updatePreview();
  }

  // Clear form
  clearForm() {
    // Skip if suppression flags are active
    if (window._globalSuppressClear || window._adminTestSuiteRunning || this.adminManager?._suppressAutoClear) {
      console.log('clearForm suppressed in AdminObligaciones due to global/test suppression');
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

    // Restore context fields
    this.updateContextFields();
    this.updatePreview();
  }
}
