/**
 * Script para forzar un refresco del posicionamiento del panel de vista previa
 * Este script debe ejecutarse después de que todos los componentes estén cargados
 */

(function() {
  // Esperar a que todos los recursos estén cargados
  window.addEventListener('load', function() {
    console.log('Actualizando posición del panel de vista previa...');
    
    setTimeout(function() {
      // Forzar un refresco del posicionamiento
      const sectionNav = document.querySelector('.section-nav');
      const previewPanel = document.getElementById('previewPanel');
      
      if (previewPanel && sectionNav) {
        // Obtener posición exacta del menú de secciones
        const navRect = sectionNav.getBoundingClientRect();
        const bottomPosition = navRect.bottom + window.scrollY + 10;
        
        // Aplicar la posición al panel
        previewPanel.style.top = bottomPosition + 'px';
        previewPanel.style.maxHeight = (window.innerHeight - bottomPosition - 20) + 'px';
        
        // Mostrar en consola para depuración
        console.log('Panel de vista previa reposicionado:', {
          menuBottom: navRect.bottom,
          panelTop: bottomPosition,
          maxHeight: (window.innerHeight - bottomPosition - 20)
        });
        
        // Forzar un reflow del DOM
        previewPanel.style.display = 'none';
        previewPanel.offsetHeight; // Forzar reflow
        previewPanel.style.display = '';
      }
    }, 500); // Pequeño retraso para asegurar que todo esté listo
  });
})();
