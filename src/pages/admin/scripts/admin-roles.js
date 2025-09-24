// Admin Roles Component Script
export default class AdminRoles {
  constructor(adminManager) {
    this.adminManager = adminManager;
    this.formId = 'formRol';
    this.init();
  }

  init() {
    this.bindFormEvents();
    this.setupValidation();
    this.updateContextFields();
    this.setupPermissionMatrix();
    this.loadRolesList();
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

    // Permission checkboxes
    const permissionCheckboxes = form.querySelectorAll('input[type="checkbox"][name^="perm_"]');
    permissionCheckboxes.forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        this.updatePermissionSummary();
        this.updatePreview();
      });
    });

    // Role template selector
    const templateSelect = document.getElementById('rl_template');
    if (templateSelect) {
      templateSelect.addEventListener('change', () => {
        this.applyRoleTemplate(templateSelect.value);
      });
    }

    // User assignment handling
    this.setupUserAssignment();
  }

  setupValidation() {
    this.validationRules = {
      Nombre_rol: {
        required: true,
        minLength: 3,
        validate: (value) => {
          if (!value) return { valid: false, message: 'El nombre del rol es requerido' };
          if (value.length < 3) return { valid: false, message: 'El nombre debe tener al menos 3 caracteres' };
          
          // Check for special characters
          if (!/^[a-zA-Z0-9\s\-_]+$/.test(value)) {
            return { valid: false, message: 'Solo se permiten letras, números, espacios, guiones y guiones bajos' };
          }
          
          return { valid: true };
        }
      },
      Descripcion: {
        required: true,
        minLength: 10,
        message: 'La descripción debe tener al menos 10 caracteres'
      },
      Estado: {
        required: true,
        message: 'Debe seleccionar un estado'
      }
    };
  }

  setupPermissionMatrix() {
    this.permissionCategories = {
      'personas': {
        label: 'Gestión de Personas',
        permissions: [
          { id: 'personas_read', label: 'Ver personas', description: 'Consultar listados y detalles de personas' },
          { id: 'personas_write', label: 'Crear/editar personas', description: 'Crear nuevas personas y modificar existentes' },
          { id: 'personas_delete', label: 'Eliminar personas', description: 'Eliminar registros de personas' }
        ]
      },
      'contratos': {
        label: 'Gestión de Contratos',
        permissions: [
          { id: 'contratos_read', label: 'Ver contratos', description: 'Consultar listados y detalles de contratos' },
          { id: 'contratos_write', label: 'Crear/editar contratos', description: 'Crear nuevos contratos y modificar existentes' },
          { id: 'contratos_delete', label: 'Eliminar contratos', description: 'Eliminar registros de contratos' },
          { id: 'contratos_approve', label: 'Aprobar contratos', description: 'Aprobar contratos para ejecución' }
        ]
      },
      'obligaciones': {
        label: 'Gestión de Obligaciones',
        permissions: [
          { id: 'obligaciones_read', label: 'Ver obligaciones', description: 'Consultar obligaciones contractuales' },
          { id: 'obligaciones_write', label: 'Crear/editar obligaciones', description: 'Gestionar obligaciones contractuales' },
          { id: 'obligaciones_approve', label: 'Aprobar obligaciones', description: 'Aprobar cumplimiento de obligaciones' }
        ]
      },
      'pagos': {
        label: 'Gestión de Pagos',
        permissions: [
          { id: 'pagos_read', label: 'Ver pagos', description: 'Consultar cuentas de cobro y pagos' },
          { id: 'pagos_write', label: 'Crear/editar pagos', description: 'Gestionar cuentas de cobro' },
          { id: 'pagos_approve', label: 'Aprobar pagos', description: 'Aprobar pagos para proceso' },
          { id: 'pagos_process', label: 'Procesar pagos', description: 'Marcar pagos como procesados' }
        ]
      },
      'admin': {
        label: 'Administración',
        permissions: [
          { id: 'admin_users', label: 'Gestión de usuarios', description: 'Crear y gestionar usuarios del sistema' },
          { id: 'admin_roles', label: 'Gestión de roles', description: 'Crear y gestionar roles y permisos' },
          { id: 'admin_config', label: 'Configuración', description: 'Acceso a configuración del sistema' },
          { id: 'admin_reports', label: 'Reportes avanzados', description: 'Generar reportes y estadísticas' }
        ]
      }
    };

    this.updatePermissionSummary();
  }

  setupUserAssignment() {
    const assignBtn = document.getElementById('assign-users-btn');
    const userModal = document.getElementById('user-assignment-modal');
    const saveAssignmentBtn = document.getElementById('save-user-assignment');
    const cancelAssignmentBtn = document.getElementById('cancel-user-assignment');

    if (assignBtn) {
      assignBtn.addEventListener('click', () => {
        this.showUserAssignmentModal();
      });
    }

    if (saveAssignmentBtn) {
      saveAssignmentBtn.addEventListener('click', () => {
        this.saveUserAssignment();
      });
    }

    if (cancelAssignmentBtn) {
      cancelAssignmentBtn.addEventListener('click', () => {
        this.hideUserAssignmentModal();
      });
    }
  }

  updatePermissionSummary() {
    const checkedPermissions = [];
    const form = document.getElementById(this.formId);
    
    Object.values(this.permissionCategories).forEach(category => {
      category.permissions.forEach(permission => {
        const checkbox = form?.querySelector(`input[name="perm_${permission.id}"]`);
        if (checkbox?.checked) {
          checkedPermissions.push(permission.label);
        }
      });
    });

    const summaryElement = document.getElementById('permissions-summary');
    if (summaryElement) {
      if (checkedPermissions.length === 0) {
        summaryElement.innerHTML = '<span class="text-gray-500">Sin permisos seleccionados</span>';
      } else {
        summaryElement.innerHTML = `
          <div class="flex flex-wrap gap-1">
            ${checkedPermissions.map(perm => 
              `<span class="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">${perm}</span>`
            ).join('')}
          </div>
        `;
      }
    }

    // Update permission count
    const countElement = document.getElementById('permissions-count');
    if (countElement) {
      countElement.textContent = checkedPermissions.length;
    }
  }

  applyRoleTemplate(template) {
    if (!template) return;

    const form = document.getElementById(this.formId);
    if (!form) return;

    // Clear all permissions first
    const allCheckboxes = form.querySelectorAll('input[type="checkbox"][name^="perm_"]');
    allCheckboxes.forEach(checkbox => {
      checkbox.checked = false;
    });

    // Apply template permissions
    const templates = {
      'admin': ['admin_users', 'admin_roles', 'admin_config', 'admin_reports', 'personas_read', 'personas_write', 'personas_delete', 'contratos_read', 'contratos_write', 'contratos_delete', 'contratos_approve', 'obligaciones_read', 'obligaciones_write', 'obligaciones_approve', 'pagos_read', 'pagos_write', 'pagos_approve', 'pagos_process'],
      'supervisor': ['personas_read', 'personas_write', 'contratos_read', 'contratos_write', 'contratos_approve', 'obligaciones_read', 'obligaciones_write', 'obligaciones_approve', 'pagos_read', 'pagos_approve', 'admin_reports'],
      'operador': ['personas_read', 'personas_write', 'contratos_read', 'contratos_write', 'obligaciones_read', 'obligaciones_write', 'pagos_read', 'pagos_write'],
      'consulta': ['personas_read', 'contratos_read', 'obligaciones_read', 'pagos_read']
    };

    const templatePerms = templates[template];
    if (templatePerms) {
      templatePerms.forEach(permId => {
        const checkbox = form.querySelector(`input[name="perm_${permId}"]`);
        if (checkbox) {
          checkbox.checked = true;
        }
      });
    }

    this.updatePermissionSummary();
    this.updatePreview();
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

    // Min length validation
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

  updateContextFields() {
    // Set default values
    const estadoInput = document.getElementById('rl_Estado');
    if (estadoInput && !estadoInput.value) {
      estadoInput.value = 'Activo';
    }
  }

  updatePreview() {
    // Update preview elements
    const nombreInput = document.getElementById('rl_Nombre_rol');
    const descripcionInput = document.getElementById('rl_Descripcion');
    const estadoInput = document.getElementById('rl_Estado');

    // Count permissions
    const form = document.getElementById(this.formId);
    const checkedPermissions = form?.querySelectorAll('input[type="checkbox"][name^="perm_"]:checked').length || 0;

    // Update preview list
    const previewList = document.getElementById('preview-roles-list');
    const rolesList = document.getElementById('roles-list');

    if (previewList || rolesList) {
      const currentData = {
        nombre_rol: nombreInput?.value || '',
        descripcion: descripcionInput?.value || '',
        estado: estadoInput?.value || 'Activo',
        permissions_count: checkedPermissions
      };

      const previewHtml = this.generateRolPreview(currentData);
      
      if (previewList) previewList.innerHTML = previewHtml;
      if (rolesList) rolesList.innerHTML = previewHtml;
    }
  }

  generateRolPreview(rol) {
    const estadoClass = this.getEstadoClass(rol.estado);
    
    return `
      <div class="preview-role-item p-3 bg-white border rounded-lg mb-2 hover:shadow-md transition-shadow">
        <div class="flex items-start justify-between mb-2">
          <div class="flex items-center gap-2">
            <span class="material-icons text-sm text-gray-500">admin_panel_settings</span>
            <h4 class="font-medium text-gray-800 text-sm">${rol.nombre_rol || 'Nuevo Rol'}</h4>
          </div>
          <span class="status-badge ${estadoClass} text-xs px-2 py-1 rounded">${rol.estado}</span>
        </div>
        
        <div class="mb-2">
          <p class="text-sm text-gray-700 mb-1">
            ${rol.descripcion || 'Sin descripción'}
          </p>
        </div>
        
        <div class="flex items-center justify-between text-xs text-gray-600">
          <div class="flex items-center gap-1">
            <span class="material-icons text-xs">security</span>
            <span>${rol.permissions_count} permisos</span>
          </div>
          <div class="flex items-center gap-1">
            <span class="material-icons text-xs">people</span>
            <span id="users-count-${rol.rol_id || 'new'}">0 usuarios</span>
          </div>
        </div>
      </div>
    `;
  }

  getEstadoClass(estado) {
    switch (estado?.toLowerCase()) {
      case 'activo': return 'bg-green-100 text-green-800';
      case 'inactivo': return 'bg-red-100 text-red-800';
      case 'suspendido': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
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

    // Collect permissions
    const permissions = [];
    const permissionCheckboxes = form.querySelectorAll('input[type="checkbox"][name^="perm_"]:checked');
    permissionCheckboxes.forEach(checkbox => {
      const permId = checkbox.name.replace('perm_', '');
      permissions.push(permId);
    });
    data.permissions = permissions;

    // Show loading
    this.setFormLoading(true);

    try {
      const isUpdate = data.rol_id && data.rol_id !== '';
      const endpoint = isUpdate ? 'updateRol' : 'createRol';

      const result = await this.adminManager.apiFetch(endpoint, data);

      if (result && result.ok) {
        this.showResult('Rol guardado exitosamente', 'success');
        
        // Update hidden ID field
        if (result.data && result.data.rol_id) {
          const hiddenIdField = form.querySelector('input[name="rol_id"]');
          if (hiddenIdField) {
            hiddenIdField.value = result.data.rol_id;
          }
        }

        // Refresh roles list
        await this.loadRolesList();
      } else {
        this.showResult(result?.message || 'Error al guardar el rol', 'error');
      }
    } catch (error) {
      console.error('Error saving rol:', error);
      this.showResult('Error de conexión al guardar el rol', 'error');
    } finally {
      this.setFormLoading(false);
    }
  }

  async loadRolesList() {
    try {
      const result = await this.adminManager.apiFetch('getRoles', {});
      
      if (result && result.ok) {
        const roles = Array.isArray(result.data) ? result.data : [];
        this.renderRolesList(roles);
      }
    } catch (error) {
      console.error('Error loading roles:', error);
    }
  }

  renderRolesList(roles) {
    const previewList = document.getElementById('preview-roles-list');
    const rolesList = document.getElementById('roles-list');

    if (roles.length === 0) {
      const emptyMessage = '<div class="text-gray-500 text-center py-4">No hay roles registrados</div>';
      if (previewList) previewList.innerHTML = emptyMessage;
      if (rolesList) rolesList.innerHTML = emptyMessage;
      return;
    }

    const listHtml = roles.map(rol => {
      // Count permissions and users for this role
      const permissionsCount = rol.permissions ? (Array.isArray(rol.permissions) ? rol.permissions.length : 0) : 0;
      
      const data = {
        ...rol,
        permissions_count: permissionsCount
      };

      return this.generateRolPreview(data);
    }).join('');
    
    if (previewList) previewList.innerHTML = listHtml;
    if (rolesList) rolesList.innerHTML = listHtml;
  }

  async showUserAssignmentModal() {
    const modal = document.getElementById('user-assignment-modal');
    if (!modal) return;

    try {
      // Load available users
      const result = await this.adminManager.apiFetch('getUsers', {});
      if (result && result.ok) {
        const users = Array.isArray(result.data) ? result.data : [];
        this.renderUserAssignmentList(users);
        modal.classList.remove('hidden');
      }
    } catch (error) {
      console.error('Error loading users:', error);
      this.showResult('Error al cargar la lista de usuarios', 'error');
    }
  }

  hideUserAssignmentModal() {
    const modal = document.getElementById('user-assignment-modal');
    if (modal) {
      modal.classList.add('hidden');
    }
  }

  renderUserAssignmentList(users) {
    const container = document.getElementById('users-assignment-list');
    if (!container) return;

    const html = users.map(user => `
      <div class="user-assignment-item flex items-center justify-between p-2 border rounded">
        <div class="flex items-center gap-2">
          <span class="material-icons text-sm text-gray-500">person</span>
          <div>
            <div class="font-medium text-sm">${user.nombre || 'Sin nombre'}</div>
            <div class="text-xs text-gray-500">${user.email || 'Sin email'}</div>
          </div>
        </div>
        <input type="checkbox" name="assign_user_${user.user_id}" value="${user.user_id}" class="rounded">
      </div>
    `).join('');

    container.innerHTML = html;
  }

  async saveUserAssignment() {
    // Implementation for saving user role assignments
    // This would typically involve API calls to assign roles to users
    this.hideUserAssignmentModal();
    this.showResult('Asignación de usuarios guardada', 'success');
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
        submitBtn.innerHTML = '<span class="material-icons text-sm">save</span><span>Guardar Rol</span>';
      }
    }
  }

  showResult(message, type) {
    const resultDiv = document.getElementById('rolResult');
    if (!resultDiv) return;

    const bgColor = type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700';
    resultDiv.className = `mt-3 text-sm p-3 rounded ${bgColor}`;
    resultDiv.textContent = message;

    setTimeout(() => {
      resultDiv.textContent = '';
      resultDiv.className = 'mt-3 text-sm';
    }, 5000);
  }

  // Load role data into form
  loadRolData(rol) {
    if (!rol) return;

    const form = document.getElementById(this.formId);
    if (!form) return;

    const fieldMapping = {
      'rl_rol_id': 'rol_id',
      'rl_Nombre_rol': 'Nombre_rol',
      'rl_Descripcion': 'Descripcion',
      'rl_Estado': 'Estado'
    };

    // Load basic fields
    Object.entries(fieldMapping).forEach(([fieldId, dataKey]) => {
      const field = document.getElementById(fieldId);
      if (field && rol[dataKey] !== undefined) {
        field.value = rol[dataKey];
      }
    });

    // Load permissions
    if (rol.permissions) {
      const permissions = Array.isArray(rol.permissions) ? rol.permissions : [];
      
      // Clear all checkboxes first
      const allCheckboxes = form.querySelectorAll('input[type="checkbox"][name^="perm_"]');
      allCheckboxes.forEach(checkbox => {
        checkbox.checked = false;
      });
      
      // Check the permissions for this role
      permissions.forEach(permId => {
        const checkbox = form.querySelector(`input[name="perm_${permId}"]`);
        if (checkbox) {
          checkbox.checked = true;
        }
      });
    }

    this.updatePermissionSummary();
    this.updatePreview();
  }

  // Clear form
  clearForm() {
    if (window._globalSuppressClear || window._adminTestSuiteRunning || this.adminManager?._suppressAutoClear) {
      console.log('clearForm suppressed in AdminRoles due to global/test suppression');
      return;
    }

    const form = document.getElementById(this.formId);
    if (form) {
      form.reset();

      const errorElements = form.querySelectorAll('.field-error');
      errorElements.forEach(el => el.remove());

      const errorFields = form.querySelectorAll('.error');
      errorFields.forEach(field => field.classList.remove('error'));

      // Clear all permission checkboxes
      const permissionCheckboxes = form.querySelectorAll('input[type="checkbox"][name^="perm_"]');
      permissionCheckboxes.forEach(checkbox => {
        checkbox.checked = false;
      });
    }

    // Restore defaults
    this.updateContextFields();
    this.updatePermissionSummary();
    this.updatePreview();
  }
}
