/**
 * Función para actualizar el badge de estado en el panel de vista previa - Modern Design
 * @param {string} estado - Estado del contratista
 */
function updateStatusBadge(estado) {
  const badgeContainer = document.getElementById('preview-estado-badge');
  if (!badgeContainer) return;
  
  badgeContainer.innerHTML = '';
  
  // Normalizar el estado
  const estadoNormalizado = (estado || 'Activo').toLowerCase();
  
  // Configurar estilos modernos según el estado
  const statusStyles = {
    'activo': { 
      class: 'status-active', 
      icon: 'check_circle',
      bg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      color: 'white'
    },
    'inactivo': { 
      class: 'status-inactive', 
      icon: 'cancel',
      bg: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      color: 'white'
    },
    'pendiente': { 
      class: 'status-pending', 
      icon: 'schedule',
      bg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      color: 'white'
    },
    'en proceso': { 
      class: 'status-processing', 
      icon: 'hourglass_empty',
      bg: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
      color: 'white'
    },
    'completado': { 
      class: 'status-completed', 
      icon: 'task_alt',
      bg: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
      color: 'white'
    }
  };
  
  // Determinar el estilo basado en el estado
  let config = statusStyles['activo']; // Default
  
  for (const [key, style] of Object.entries(statusStyles)) {
    if (estadoNormalizado.includes(key) || estadoNormalizado.includes(key.replace(' ', ''))) {
      config = style;
      break;
    }
  }
  
  const badge = document.createElement('div');
  badge.className = `preview-status-badge ${config.class}`;
  badge.style.cssText = `
    background: ${config.bg};
    color: ${config.color};
    padding: 0.5rem 1rem;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
  `;
  
  badge.innerHTML = `
    <span class="material-icons" style="font-size: 1rem;">${config.icon}</span>
    <span>${estado || 'Activo'}</span>
  `;
  
  badgeContainer.appendChild(badge);
}
