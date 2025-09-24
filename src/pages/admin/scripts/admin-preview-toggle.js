/**
 * Script para añadir un botón de toggle para mostrar/ocultar el panel de vista previa
 * Este es especialmente útil en pantallas más pequeñas
 */

document.addEventListener('DOMContentLoaded', function() {
  // Crear el botón toggle para mostrar/ocultar el panel de vista previa
  function createToggleButton() {
    const toggleButton = document.createElement('button');
    toggleButton.id = 'togglePreviewBtn';
    toggleButton.className = 'fixed bottom-4 right-4 bg-indigo-600 text-white p-3 rounded-full shadow-lg z-50';
    toggleButton.innerHTML = '<span class="material-icons">visibility</span>';
    toggleButton.setAttribute('title', 'Mostrar/ocultar vista previa');
    toggleButton.setAttribute('aria-label', 'Mostrar/ocultar vista previa');
    
    document.body.appendChild(toggleButton);
    
    // Añadir evento click para mostrar/ocultar el panel
    toggleButton.addEventListener('click', togglePreviewPanel);
  }
  
  // Función para mostrar/ocultar el panel
  function togglePreviewPanel() {
    const previewPanel = document.getElementById('previewPanel');
    if (!previewPanel) return;
    
    const isVisible = previewPanel.classList.contains('active');
    
    if (isVisible) {
      previewPanel.classList.remove('active');
      document.getElementById('togglePreviewBtn').innerHTML = '<span class="material-icons">visibility</span>';
    } else {
      previewPanel.classList.add('active');
      document.getElementById('togglePreviewBtn').innerHTML = '<span class="material-icons">visibility_off</span>';
    }
  }
  
  // Inicializar el botón toggle
  createToggleButton();
  
  // Detectar cambios en la selección de contratistas para mostrar el panel automáticamente
  document.addEventListener('contractorSelected', function() {
    const previewPanel = document.getElementById('previewPanel');
    if (previewPanel && !previewPanel.classList.contains('active')) {
      previewPanel.classList.add('active');
      document.getElementById('togglePreviewBtn').innerHTML = '<span class="material-icons">visibility_off</span>';
    }
  });
});
