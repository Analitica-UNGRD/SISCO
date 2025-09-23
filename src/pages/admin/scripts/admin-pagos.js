// Admin Pagos Component Script
export default class AdminPagos {
  constructor(adminManager) {
    this.adminManager = adminManager;
    this.formId = 'formPago';
    this.init();
  }

  init() {
    this.bindFormEvents();
    this.setupValidation();
    this.updateContextFields();
    this.setupCalculations();
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

    // Date range calculations
    const fechaInicioInput = document.getElementById('pg_Fecha_inicio');
    const fechaFinInput = document.getElementById('pg_Fecha_fin');
    const mesFiscalInput = document.getElementById('pg_Mes_fiscal');

    if (fechaInicioInput && fechaFinInput) {
      fechaInicioInput.addEventListener('change', () => this.calculateMesFiscal());
      fechaFinInput.addEventListener('change', () => this.calculateMesFiscal());
    }

    // Auto-format mes fiscal
    if (mesFiscalInput) {
      mesFiscalInput.addEventListener('input', (e) => {
        this.formatMesFiscalInput(e.target);
      });
    }

    // Auto-generate numero cobro
    this.generateNumeroCobro();
  }

  setupValidation() {
    this.validationRules = {
      contrato_id: {
        required: true,
        message: 'Debe seleccionar un contrato'
      },
      Fecha_inicio: {
        required: true,
        validate: (value) => {
          if (!value) return { valid: false, message: 'La fecha inicio es requerida' };
          const fecha = new Date(value);
          const hoy = new Date();
          return {
            valid: fecha <= hoy,
            message: 'La fecha inicio no puede ser futura'
          };
        }
      },
      Fecha_fin: {
        required: true,
        validate: (value, formData) => {
          if (!value) return { valid: false, message: 'La fecha fin es requerida' };
          if (!formData.Fecha_inicio) return { valid: true };
          
          const inicio = new Date(formData.Fecha_inicio);
          const fin = new Date(value);
          return {
            valid: fin >= inicio,
            message: 'La fecha fin debe ser posterior o igual a la fecha inicio'
          };
        }
      },
      Valor_pago: {
        required: true,
        validate: (value) => {
          if (!value) return { valid: false, message: 'El valor del pago es requerido' };
          const num = parseFloat(value);
          return {
            valid: num > 0,
            message: 'El valor debe ser mayor a 0'
          };
        }
      },
      Mes_fiscal: {
        required: true,
        pattern: /^\d{4}-\d{2}$/,
        message: 'Formato requerido: YYYY-MM (ej: 2025-01)'
      },
      URL_PDF: {
        validate: (value) => {
          if (!value) return { valid: true };
          try {
            new URL(value);
            return { valid: true };
          } catch {
            return { valid: false, message: 'Ingrese una URL válida' };
          }
        }
      },
      URL_Soportes: {
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

  setupCalculations() {
    // Period validation based on contract dates
    this.validatePaymentPeriod();
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

  calculateMesFiscal() {
    const fechaFinInput = document.getElementById('pg_Fecha_fin');
    const mesFiscalInput = document.getElementById('pg_Mes_fiscal');

    if (!fechaFinInput?.value || !mesFiscalInput) return;

    const fechaFin = new Date(fechaFinInput.value);
    const mesFiscal = `${fechaFin.getFullYear()}-${String(fechaFin.getMonth() + 1).padStart(2, '0')}`;
    
    mesFiscalInput.value = mesFiscal;
    this.updatePreview();
  }

  formatMesFiscalInput(input) {
    let value = input.value.replace(/\D/g, ''); // Solo números
    
    if (value.length >= 4) {
      value = value.substring(0, 4) + '-' + value.substring(4, 6);
    }
    
    input.value = value;
  }

  async generateNumeroCobro() {
    const numeroCobroInput = document.getElementById('pg_Numero_cobro');
    if (!numeroCobroInput || numeroCobroInput.value) return;

    try {
      if (this.adminManager.ctx.contrato) {
        const contratoId = this.adminManager.ctx.contrato.contrato_id || this.adminManager.ctx.contrato.id;
        const result = await this.adminManager.apiFetch('getNextNumeroCobro', { contrato_id: contratoId });
        
        if (result && result.ok && result.data) {
          numeroCobroInput.value = result.data.next_numero || 1;
        }
      }
    } catch (error) {
      console.warn('Could not generate numero cobro:', error);
    }
  }

  validatePaymentPeriod() {
    // Validate that payment period is within contract dates
    if (!this.adminManager.ctx.contrato) return;

    const contrato = this.adminManager.ctx.contrato;
    const fechaInicioInput = document.getElementById('pg_Fecha_inicio');
    const fechaFinInput = document.getElementById('pg_Fecha_fin');

    if (contrato.Inicio && fechaInicioInput) {
      fechaInicioInput.min = contrato.Inicio;
    }
    
    if (contrato.Fin && fechaFinInput) {
      fechaFinInput.max = contrato.Fin;
    }
  }

  updateContextFields() {
    // Auto-fill from context
    const contratoIdInput = document.getElementById('pg_contrato_id');
    const personaIdInput = document.getElementById('pg_persona_id');
    
    if (contratoIdInput && this.adminManager.ctx.contrato) {
      contratoIdInput.value = this.adminManager.ctx.contrato.contrato_id || this.adminManager.ctx.contrato.id || '';
    }
    
    if (personaIdInput && this.adminManager.ctx.persona) {
      personaIdInput.value = this.adminManager.ctx.persona.persona_id || this.adminManager.ctx.persona.id || '';
    }

    // Auto-fill valor_pago from contract
    const valorPagoInput = document.getElementById('pg_Valor_pago');
    if (valorPagoInput && !valorPagoInput.value && this.adminManager.ctx.contrato) {
      const valorMensual = this.adminManager.ctx.contrato.Valor_mensual;
      if (valorMensual) {
        valorPagoInput.value = valorMensual;
      }
    }
  }

  updatePreview() {
    // Update preview elements
    const numeroCobroInput = document.getElementById('pg_Numero_cobro');
    const fechaInicioInput = document.getElementById('pg_Fecha_inicio');
    const fechaFinInput = document.getElementById('pg_Fecha_fin');
    const valorPagoInput = document.getElementById('pg_Valor_pago');
    const estadoInput = document.getElementById('pg_Estado');
    const mesFiscalInput = document.getElementById('pg_Mes_fiscal');

    // Update preview list
    const previewList = document.getElementById('preview-pagos-list');
    const pagosList = document.getElementById('pagos-list');
    const totalPagos = document.getElementById('total-pagos');

    if (previewList || pagosList) {
      const currentData = {
        numero_cobro: numeroCobroInput?.value || 1,
        fecha_inicio: fechaInicioInput?.value || '',
        fecha_fin: fechaFinInput?.value || '',
        valor_pago: valorPagoInput?.value || 0,
        estado: estadoInput?.value || 'Borrador',
        mes_fiscal: mesFiscalInput?.value || ''
      };

      const previewHtml = this.generatePagoPreview(currentData);
      
      if (previewList) previewList.innerHTML = previewHtml;
      if (pagosList) pagosList.innerHTML = previewHtml;
      
      if (totalPagos) {
        totalPagos.textContent = `Total: ${this.formatCurrency(currentData.valor_pago)}`;
      }
    }
  }

  generatePagoPreview(pago) {
    const estadoClass = this.getEstadoClass(pago.estado);
    
    return `
      <div class="preview-payment-item p-3 bg-white border rounded-lg mb-2 hover:shadow-md transition-shadow">
        <div class="flex items-start justify-between mb-2">
          <div class="flex items-center gap-2">
            <span class="material-icons text-sm text-gray-500">receipt</span>
            <h4 class="font-medium text-gray-800 text-sm">Cuenta de Cobro #${pago.numero_cobro}</h4>
          </div>
          <span class="status-badge ${estadoClass} text-xs px-2 py-1 rounded">${pago.estado}</span>
        </div>
        
        <div class="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-2">
          <div class="flex items-center gap-1">
            <span class="material-icons text-xs">event</span>
            ${this.formatDate(pago.fecha_inicio)} - ${this.formatDate(pago.fecha_fin)}
          </div>
          <div class="flex items-center gap-1">
            <span class="material-icons text-xs">payments</span>
            ${this.formatCurrency(pago.valor_pago)}
          </div>
        </div>
        
        ${pago.mes_fiscal ? `
          <div class="text-xs text-gray-500 flex items-center gap-1">
            <span class="material-icons text-xs">calendar_month</span>
            Mes Fiscal: ${this.formatPeriod(pago.mes_fiscal)}
          </div>
        ` : ''}
      </div>
    `;
  }

  getEstadoClass(estado) {
    switch (estado?.toLowerCase()) {
      case 'aprobada': return 'bg-green-100 text-green-800';
      case 'radicada': return 'bg-blue-100 text-blue-800';
      case 'en revisión': return 'bg-yellow-100 text-yellow-800';
      case 'rechazada': return 'bg-red-100 text-red-800';
      case 'borrador': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
  }

  formatCurrency(value) {
    if (!value) return '$0';
    const num = parseFloat(value);
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(num);
  }

  formatPeriod(period) {
    if (!period) return '';
    const [year, month] = period.split('-');
    const monthNames = [
      'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
      'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
    ];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
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
      const isUpdate = data.pago_id && data.pago_id !== '';
      const endpoint = isUpdate ? 'updatePago' : 'createPago';

      const result = await this.adminManager.apiFetch(endpoint, data);

      if (result && result.ok) {
        this.showResult('Pago guardado exitosamente', 'success');
        
        // Update hidden ID field
        if (result.data && result.data.pago_id) {
          const hiddenIdField = form.querySelector('input[name="pago_id"]');
          if (hiddenIdField) {
            hiddenIdField.value = result.data.pago_id;
          }
        }

        // Refresh payments list if available
        await this.loadPagosList();
        
        // Generate next numero cobro for new payments
        if (!isUpdate) {
          await this.generateNumeroCobro();
        }
      } else {
        this.showResult(result?.message || 'Error al guardar el pago', 'error');
      }
    } catch (error) {
      console.error('Error saving pago:', error);
      this.showResult('Error de conexión al guardar el pago', 'error');
    } finally {
      this.setFormLoading(false);
    }
  }

  async loadPagosList() {
    if (!this.adminManager.ctx.contrato) return;

    try {
      const contratoId = this.adminManager.ctx.contrato.contrato_id || this.adminManager.ctx.contrato.id;
      const result = await this.adminManager.apiFetch('getPagosByContrato', { contrato_id: contratoId });
      
      if (result && result.ok) {
        const pagos = Array.isArray(result.data) ? result.data : [];
        this.renderPagosList(pagos);
      }
    } catch (error) {
      console.error('Error loading pagos:', error);
    }
  }

  renderPagosList(pagos) {
    const previewList = document.getElementById('preview-pagos-list');
    const pagosList = document.getElementById('pagos-list');
    const totalPagos = document.getElementById('total-pagos');

    if (pagos.length === 0) {
      const emptyMessage = '<div class="text-gray-500 text-center py-4">No hay pagos registrados</div>';
      if (previewList) previewList.innerHTML = emptyMessage;
      if (pagosList) pagosList.innerHTML = emptyMessage;
      if (totalPagos) totalPagos.textContent = 'Total: $0';
      return;
    }

    const listHtml = pagos.map(pago => this.generatePagoPreview(pago)).join('');
    const total = pagos.reduce((sum, pago) => sum + (parseFloat(pago.Valor_pago) || 0), 0);
    
    if (previewList) previewList.innerHTML = listHtml;
    if (pagosList) pagosList.innerHTML = listHtml;
    if (totalPagos) totalPagos.textContent = `Total: ${this.formatCurrency(total)}`;
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
        submitBtn.innerHTML = '<span class="material-icons text-sm">save</span><span>Guardar Pago</span>';
      }
    }
  }

  showResult(message, type) {
    const resultDiv = document.getElementById('pagoResult');
    if (!resultDiv) return;

    const bgColor = type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700';
    resultDiv.className = `mt-3 text-sm p-3 rounded ${bgColor}`;
    resultDiv.textContent = message;

    setTimeout(() => {
      resultDiv.textContent = '';
      resultDiv.className = 'mt-3 text-sm';
    }, 5000);
  }

  // Load payment data into form
  loadPagoData(pago) {
    if (!pago) return;

    const form = document.getElementById(this.formId);
    if (!form) return;

    const fieldMapping = {
      'pg_pago_id': 'pago_id',
      'pg_contrato_id': 'contrato_id',
      'pg_persona_id': 'persona_id',
      'pg_Numero_cobro': 'Numero_cobro',
      'pg_Fecha_inicio': 'Fecha_inicio',
      'pg_Fecha_fin': 'Fecha_fin',
      'pg_Fecha_radicacion': 'Fecha_radicacion',
      'pg_Valor_pago': 'Valor_pago',
      'pg_Mes_fiscal': 'Mes_fiscal',
      'pg_Estado': 'Estado',
      'pg_URL_PDF': 'URL_PDF',
      'pg_URL_Soportes': 'URL_Soportes',
      'pg_Observaciones': 'Observaciones'
    };

    Object.entries(fieldMapping).forEach(([fieldId, dataKey]) => {
      const field = document.getElementById(fieldId);
      if (field && pago[dataKey] !== undefined) {
        field.value = pago[dataKey];
      }
    });

    this.updatePreview();
  }

  // Clear form
  clearForm() {
    if (window._globalSuppressClear || window._adminTestSuiteRunning || this.adminManager?._suppressAutoClear) {
      console.log('clearForm suppressed in AdminPagos due to global/test suppression');
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

    // Restore context fields and generate new numero cobro
    this.updateContextFields();
    this.generateNumeroCobro();
    this.updatePreview();
  }
}
