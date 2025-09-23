/**
 * Script para gestionar específicamente la posición y el estilo del panel de vista previa
 * Este archivo se encarga de ajustar la posición del panel de vista previa para que se muestre correctamente
 */

document.addEventListener('DOMContentLoaded', function() {
  // Establecer la posición del panel de vista previa
  function adjustPreviewPanel() {
    const sectionNav = document.querySelector('.section-nav');
    const previewPanel = document.getElementById('previewPanel');
    
    if (!previewPanel || !sectionNav) return;
    
    // Calcular la posición exacta basada en el menú de secciones
    const navRect = sectionNav.getBoundingClientRect();
    const bottomPosition = navRect.bottom + window.scrollY + 10; // 10px de espacio
    
    // Aplicar la posición correcta
    previewPanel.style.top = bottomPosition + 'px';
    
    // Ajustar la altura máxima para no sobrepasar el final de la ventana
    const maxHeight = window.innerHeight - bottomPosition - 20; // 20px de margen inferior
    previewPanel.style.maxHeight = maxHeight + 'px';
    
    // Asegurarnos de que el panel tenga el ancho correcto
    if (window.innerWidth > 992) {
      previewPanel.style.width = '300px';
    }
    
    // Añadir botón de alternancia en móviles si no existe
    if (window.innerWidth <= 768 && !document.getElementById('togglePreviewBtn')) {
      const toggleBtn = document.createElement('button');
      toggleBtn.id = 'togglePreviewBtn';
      toggleBtn.className = 'bg-indigo-600 text-white p-3 rounded-full shadow-lg';
      toggleBtn.innerHTML = '<span class="material-icons">visibility</span>';
      toggleBtn.addEventListener('click', function() {
        if (previewPanel.classList.contains('active')) {
          previewPanel.classList.remove('active');
          this.innerHTML = '<span class="material-icons">visibility</span>';
        } else {
          previewPanel.classList.add('active');
          this.innerHTML = '<span class="material-icons">visibility_off</span>';
        }
      });
      document.body.appendChild(toggleBtn);
    }
  }
  
  // Ajustar inicialmente
  adjustPreviewPanel();
  
  // Ajustar en redimensión
  window.addEventListener('resize', adjustPreviewPanel);
  
  // Si hay un cambio en la barra lateral (expandir/contraer)
  const sidebar = document.querySelector('.sidebar');
  if (sidebar) {
    const observer = new MutationObserver(adjustPreviewPanel);
    observer.observe(sidebar, { attributes: true });
  }
});
