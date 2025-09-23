// Admin Precontractual Component Script
export default class AdminPrecontractual {
  constructor(adminManager) {
    this.adminManager = adminManager;
    this.formId = 'formPrecontractual';
    this.etapas = [];
    this.fases = [];
    this.eventos = [];
    this.init();
  }

  init() {
    this.setupFormElements();
    this.bindFormEvents();
    this.loadEtapas();
    this.setDefaultDate();
  }

  setupFormElements() {
    // Inicializar elementos del formulario
    this.form = document.getElementById(this.formId);
    this.etapaSelect = document.getElementById('pre_Etapa');
    this.faseSelect = document.getElementById('pre_Fase');
    this.personaIdInput = document.getElementById('pre_persona_id');
    this.fechaInput = document.getElementById('pre_Fecha');
    this.eventosList = document.getElementById('precontractualEventsList');
    this.loadButton = document.getElementById('btnLoadPrecontractual');
  }

  bindFormEvents() {
    if (!this.form) return;

    // Evento submit del formulario
    this.form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = this.form.querySelector('button[type="submit"]');
      try {
        this.setButtonLoading(submitBtn, true, 'Guardando...');
        await this.handleSubmit();
      } finally {
        this.setButtonLoading(submitBtn, false);
      }
    });

    // Evento cambio de etapa para cargar fases
    this.etapaSelect?.addEventListener('change', async (e) => {
      await this.loadFases(e.target.value);
    });

    // Botón cargar eventos
    this.loadButton?.addEventListener('click', async () => {
      try {
        this.setButtonLoading(this.loadButton, true, 'Cargando...');
        await this.loadEventosForCurrentPersona();
      } finally {
        this.setButtonLoading(this.loadButton, false);
      }
    });

    // Validación en tiempo real
    const inputs = this.form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      input.addEventListener('blur', () => this.validateField(input));
      input.addEventListener('input', () => this.clearFieldError(input));
    });

    // Special handling when Evento = 'Cierre administrativo'
    const eventoSelect = document.getElementById('pre_Evento');
    const estadoSelect = document.getElementById('pre_Estado');
    const observacionesInput = document.getElementById('pre_Observaciones');
    const faseSelect = document.getElementById('pre_Fase');

    if (eventoSelect) {
      eventoSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        if (val === 'Cierre administrativo') {
          // Prefill suggestion Estado = Finalizado but allow change
          if (estadoSelect && estadoSelect.value !== 'Finalizado') {
            estadoSelect.value = 'Finalizado';
            // small visual cue
            if (this.adminManager && typeof this.adminManager.showNotification === 'function') {
              this.adminManager.showNotification('Sugerencia: Estado = Finalizado para Cierre administrativo', 'info');
            }
          }

          // If selected phase does not have Finaliza_etapa true, show confirmation
          const selectedPhaseOption = faseSelect && faseSelect.options[faseSelect.selectedIndex];
          const finaliza = selectedPhaseOption && selectedPhaseOption.dataset && selectedPhaseOption.dataset.finalizaEtapa === 'true';
          if (!finaliza) {
            const confirmMsg = 'Estás cerrando la etapa por evento en una fase no final. ¿Confirmar "Cierre administrativo"?';
            const ok = window.confirm(confirmMsg);
            if (!ok) {
              // revert selection
              eventoSelect.value = '';
              return;
            }
          }

          // Require Observaciones
          if (observacionesInput) {
            observacionesInput.setAttribute('required', 'required');
            this.showFieldError(observacionesInput, 'Se requiere motivo para Cierre administrativo');
          }
        } else {
          // remove requirement
          if (observacionesInput) {
            observacionesInput.removeAttribute('required');
            this.clearFieldError(observacionesInput);
          }
        }
      });
    }
  }

  setButtonLoading(button, loading, text) {
    if (!button) return;
    if (loading) {
      button.disabled = true;
      if (!button.dataset.origHtml) button.dataset.origHtml = button.innerHTML;
      button.innerHTML = `<span class="material-icons text-sm animate-spin">sync</span><span>${text || 'Cargando...'}</span>`;
    } else {
      button.disabled = false;
      if (button.dataset.origHtml) {
        button.innerHTML = button.dataset.origHtml;
        delete button.dataset.origHtml;
      }
    }
  }

  setDefaultDate() {
    if (this.fechaInput && !this.fechaInput.value) {
      const today = new Date().toISOString().split('T')[0];
      this.fechaInput.value = today;
    }
  }

  async loadEtapas() {
    try {
      const response = await this.adminManager.apiFetch('listEtapas', {});
      if (response.ok && response.items) {
        this.etapas = response.items;
        this.populateEtapasDropdown();
      } else {
        console.error('Error cargando etapas:', response.error);
      }
    } catch (error) {
      console.error('Error cargando etapas:', error);
      this.adminManager.showNotification('Error cargando etapas', 'error');
    }
  }

  populateEtapasDropdown() {
    if (!this.etapaSelect) return;

    // Limpiar opciones existentes excepto la primera
    this.etapaSelect.innerHTML = '<option value="">Seleccione una etapa</option>';

    this.etapas.forEach(etapa => {
      const option = document.createElement('option');
      option.value = etapa.Etapa;
      option.textContent = etapa.Etapa;
      this.etapaSelect.appendChild(option);
    });
  }

  async loadFases(etapa) {
    if (!etapa) {
      this.clearFasesDropdown();
      return;
    }

    try {
      const response = await this.adminManager.apiFetch('listFases', { etapa });
      if (response.ok && response.items) {
        this.fases = response.items;
        this.populateFasesDropdown();
      } else {
        console.error('Error cargando fases:', response.error);
        this.clearFasesDropdown();
      }
    } catch (error) {
      console.error('Error cargando fases:', error);
      this.clearFasesDropdown();
    }
  }

  populateFasesDropdown() {
    if (!this.faseSelect) return;

    // Limpiar y habilitar el select de fases
    this.faseSelect.innerHTML = '<option value="">Seleccione una fase</option>';
    this.faseSelect.disabled = false;

    this.fases.forEach(fase => {
      const option = document.createElement('option');
      option.value = fase.FaseEtiqueta;
      option.textContent = fase.FaseEtiqueta;
      option.dataset.finalizaEtapa = fase.Finaliza_etapa || false;
      this.faseSelect.appendChild(option);
    });
  }

  clearFasesDropdown() {
    if (!this.faseSelect) return;
    this.faseSelect.innerHTML = '<option value="">Seleccione primero una etapa</option>';
    this.faseSelect.disabled = true;
  }

  async handleSubmit() {
    try {
      const formData = this.getFormData();
      
      // Validar datos requeridos
      if (!this.validateFormData(formData)) {
        return;
      }

      // Extra client-side guard: if Evento=Cierre administrativo then Observaciones must be present and Estado should be Finalizado (suggested)
      if (formData.Evento === 'Cierre administrativo') {
        if (!formData.Observaciones || formData.Observaciones.toString().trim() === '') {
          if (this.adminManager && typeof this.adminManager.showNotification === 'function') {
            this.adminManager.showNotification('Observaciones requeridas para Cierre administrativo', 'error');
          } else {
            console.error('Observaciones requeridas para Cierre administrativo');
          }
          return;
        }
      }

      const response = await this.adminManager.apiFetch('crearPrecontractual', formData);
      
      if (response.ok) {
        if (this.adminManager && typeof this.adminManager.showNotification === 'function') {
          this.adminManager.showNotification('Evento precontractual guardado exitosamente', 'success');
        } else {
          console.log('Evento precontractual guardado exitosamente');
        }
        // Set pre_id returned by backend into hidden and visible fields
        if (response.pre_id) {
          const preIdHidden = document.getElementById('pre_id');
          const preIdVisible = document.getElementById('pre_pre_id');
          if (preIdHidden) preIdHidden.value = response.pre_id;
          if (preIdVisible) preIdVisible.value = response.pre_id;
        }
        // Keep persona context, but clear other form fields
        this.clearForm();
        // Restore persona name/id after clearForm (if present in adminManager.ctx)
        try {
          const currentPersonaId = this.adminManager?.ctx?.persona?.id || this.adminManager?.ctx?.persona?.persona_id || '';
          const currentPersonaName = this.adminManager?.ctx?.persona?.nombre || this.adminManager?.ctx?.persona?.Nombre || '';
          if (currentPersonaId) {
            const personaHidden = document.getElementById('pre_persona_id');
            const personaNameVisible = document.getElementById('pre_persona_name');
            if (personaHidden) personaHidden.value = currentPersonaId;
            if (personaNameVisible) personaNameVisible.value = currentPersonaName;
          }
        } catch (e) {}

        this.loadEventosForCurrentPersona();
      } else {
        if (this.adminManager && typeof this.adminManager.showNotification === 'function') {
          this.adminManager.showNotification(`Error: ${response.error}`, 'error');
        } else {
          console.error('Error:', response.error);
        }
      }
    } catch (error) {
      console.error('Error guardando evento precontractual:', error);
      if (this.adminManager && typeof this.adminManager.showNotification === 'function') {
        this.adminManager.showNotification('Error guardando evento precontractual', 'error');
      } else {
        console.error('Error guardando evento precontractual');
      }
    }
  }

  // Public wrapper for admin main
  async handleSave() {
    return this.handleSubmit();
  }

  getFormData() {
    const formData = new FormData(this.form);
    const data = {};
    
    for (let [key, value] of formData.entries()) {
      data[key] = value;
    }

    // Convertir Intento a número
    if (data.Intento) {
      data.Intento = parseInt(data.Intento) || 1;
    }

    return data;
  }

  validateFormData(data) {
    const requiredFields = ['persona_id', 'Etapa', 'Fase', 'Estado', 'Fecha'];
    const missingFields = [];

    requiredFields.forEach(field => {
      if (!data[field] || data[field].toString().trim() === '') {
        missingFields.push(field);
      }
    });

    if (missingFields.length > 0) {
      if (this.adminManager && typeof this.adminManager.showNotification === 'function') {
        this.adminManager.showNotification(`Campos requeridos: ${missingFields.join(', ')}`, 'error');
      } else {
        console.error('Campos requeridos:', missingFields.join(', '));
      }
      
      // Marcar campos con error
      missingFields.forEach(field => {
        const element = document.getElementById(`pre_${field}`) || document.querySelector(`[name="${field}"]`);
        if (element) {
          this.showFieldError(element, 'Este campo es requerido');
        }
      });
      
      return false;
    }

    return true;
  }

  validateField(field) {
    this.clearFieldError(field);
    
    const value = field.value.trim();
    const name = field.name || field.id;

    // Validaciones específicas
    if (field.hasAttribute('required') && !value) {
      this.showFieldError(field, 'Este campo es requerido');
      return false;
    }

    if (name === 'Evidencia_URL' && value) {
      try {
        new URL(value);
      } catch {
        this.showFieldError(field, 'Ingrese una URL válida');
        return false;
      }
    }

    if (name === 'Intento' && value) {
      const intento = parseInt(value);
      if (isNaN(intento) || intento < 1) {
        this.showFieldError(field, 'El intento debe ser un número mayor a 0');
        return false;
      }
    }

    return true;
  }

  showFieldError(field, message) {
    this.clearFieldError(field);
    
    field.classList.add('border-red-500');
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'field-error text-red-500 text-xs mt-1';
    errorDiv.textContent = message;
    
    const wrapper = field.closest('.input-wrapper') || field.parentNode;
    wrapper.appendChild(errorDiv);
  }

  clearFieldError(field) {
    field.classList.remove('border-red-500');
    
    const wrapper = field.closest('.input-wrapper') || field.parentNode;
    const existingError = wrapper.querySelector('.field-error');
    if (existingError) {
      existingError.remove();
    }
  }

  async loadEventosForCurrentPersona() {
    const personaId = this.personaIdInput?.value;
    if (!personaId) {
      this.eventosList.innerHTML = '<p class="text-gray-500 text-center">Seleccione una persona para ver sus eventos precontractuales</p>';
      return;
    }

    try {
      const response = await this.adminManager.apiFetch('listPrecontractual', {});
      if (response.ok && response.items) {
        // Filtrar eventos por persona_id
        const eventosPersona = response.items.filter(evento => evento.persona_id === personaId);
        this.displayEventos(eventosPersona);
      } else {
        console.error('Error cargando eventos:', response.error);
      }
    } catch (error) {
      console.error('Error cargando eventos:', error);
    }
  }

  displayEventos(eventos) {
    if (!this.eventosList) return;

    if (eventos.length === 0) {
      this.eventosList.innerHTML = '<p class="text-gray-500 text-center">No hay eventos registrados para esta persona</p>';
      return;
    }

    // Ordenar por fecha desc
    eventos.sort((a, b) => new Date(b.Fecha) - new Date(a.Fecha));

    const eventosHTML = eventos.map(evento => {
      const fecha = new Date(evento.Fecha).toLocaleDateString();
      const estadoClass = evento.Estado === 'Finalizado' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800';
      
      return `
        <div class="border rounded-lg p-3 mb-2 bg-white">
          <div class="flex justify-between items-start mb-2">
            <div class="flex-1">
              <div class="font-medium text-gray-900">${evento.Etapa || 'Sin etapa'}</div>
              <div class="text-sm text-gray-600">${evento.Fase || 'Sin fase'}</div>
            </div>
            <div class="text-right">
              <span class="inline-block px-2 py-1 text-xs font-medium rounded-full ${estadoClass}">
                ${evento.Estado || 'Sin estado'}
              </span>
              <div class="text-xs text-gray-500 mt-1">Intento: ${evento.Intento || 1}</div>
            </div>
          </div>
          
          <div class="grid grid-cols-2 gap-2 text-sm text-gray-600">
            <div><strong>Fecha:</strong> ${fecha}</div>
            <div><strong>Evento:</strong> ${evento.Evento || 'N/A'}</div>
            <div><strong>Responsable:</strong> ${evento.Responsable || 'N/A'}</div>
            <div><strong>ID:</strong> ${evento.pre_id || 'N/A'}</div>
          </div>
          
          ${evento.Observaciones ? `
            <div class="mt-2 text-sm text-gray-600">
              <strong>Observaciones:</strong> ${evento.Observaciones}
            </div>
          ` : ''}
          
          ${evento.Evidencia_URL ? `
            <div class="mt-2">
              <a href="${evento.Evidencia_URL}" target="_blank" class="text-blue-600 hover:text-blue-800 text-sm">
                Ver evidencia
              </a>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

    this.eventosList.innerHTML = `
      <div class="mb-3">
        <div class="text-sm text-gray-600">Total eventos: ${eventos.length}</div>
      </div>
      ${eventosHTML}
    `;
  }

  clearForm() {
    if (this.form) {
      // Preserve persona_id/name and pre_id; clear other fields
      const personaId = document.getElementById('pre_persona_id')?.value || '';
      const personaName = document.getElementById('pre_persona_name')?.value || '';
      const preId = document.getElementById('pre_id')?.value || '';

      // Reset and then restore preserved values
      this.form.reset();
      if (personaId) document.getElementById('pre_persona_id').value = personaId;
      if (personaName) document.getElementById('pre_persona_name').value = personaName;
      if (preId) {
        const preHidden = document.getElementById('pre_id');
        const preVisible = document.getElementById('pre_pre_id');
        if (preHidden) preHidden.value = preId;
        if (preVisible) preVisible.value = preId;
      }

      this.setDefaultDate();
      this.clearFasesDropdown();
      
      // Limpiar errores
      const errorElements = this.form.querySelectorAll('.field-error');
      errorElements.forEach(error => error.remove());
      
      const errorFields = this.form.querySelectorAll('.border-red-500');
      errorFields.forEach(field => field.classList.remove('border-red-500'));
    }
  }

  // Método llamado cuando se selecciona una persona
  updatePersonaContext(personaId, personaName) {
    // Set hidden persona_id and visible persona name
    const personaHidden = document.getElementById('pre_persona_id');
    const personaNameVisible = document.getElementById('pre_persona_name');
    if (personaHidden) personaHidden.value = personaId || '';
    if (personaNameVisible) personaNameVisible.value = personaName || '';

    // Also update adminManager context if available
    try {
      if (this.adminManager && this.adminManager.ctx) {
        this.adminManager.ctx.persona = this.adminManager.ctx.persona || {};
        this.adminManager.ctx.persona.id = personaId;
        this.adminManager.ctx.persona.nombre = personaName;
      }
    } catch (e) {}

    // Cargar eventos para la nueva persona
    this.loadEventosForCurrentPersona();
  }

  // Método para limpiar el contexto de persona
  clearPersonaContext() {
    if (this.personaIdInput) {
      this.personaIdInput.value = '';
      this.personaIdInput.placeholder = 'Ninguna persona seleccionada';
    }
    
    this.clearForm();
    this.eventosList.innerHTML = '<p class="text-gray-500 text-center">Seleccione una persona para ver sus eventos precontractuales</p>';
  }
}
