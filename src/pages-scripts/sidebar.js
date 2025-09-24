/**
 * @fileoverview Comportamiento compartido para la barra lateral
 * Este módulo implementa funcionalidades de barra lateral como expansión/colapso al pasar el ratón,
 * persistencia del estado "fijado", y resaltado de enlace activo.
 */

/**
 * Inicializa el comportamiento de la barra lateral
 * @param {HTMLElement|string} target - Elemento de la barra lateral o selector CSS
 * @param {Object} options - Opciones de configuración
 * @param {string} [options.storageKey='sidebarPinned'] - Clave para almacenar el estado en localStorage
 * @param {string} [options.selector='.sidebar'] - Selector CSS alternativo para encontrar la barra lateral
 */
export function initSidebar(target, options = {}) {
  // Encuentra el elemento de la barra lateral
  let sidebar = null;
  if(typeof target === 'string') sidebar = document.querySelector(target);
  else if(target instanceof HTMLElement) sidebar = target;
  else sidebar = document.querySelector(options.selector || '.sidebar');
  
  if(!sidebar) return; // No se encontró la barra lateral
  if(sidebar.dataset.sidebarInit === '1') return; // Ya inicializada
  
  // Configuración
  const STORAGE_KEY = options.storageKey || 'sidebarPinned';
  let hoverTimeout = null;
  const pinBtn = sidebar.querySelector('.pin-btn') || document.querySelector('.pin-btn');
  
  /**
   * Verifica si la barra lateral está fijada
   * @returns {boolean} true si está fijada
   */
  function isPinned() { try { return localStorage.getItem(STORAGE_KEY) === '1'; } catch(e) { return false; } }
  
  /**
   * Establece el estado de fijado de la barra lateral
   * @param {boolean} val - true para fijar, false para desfijar
   */
  function setPinned(val) { try { if(val) localStorage.setItem(STORAGE_KEY,'1'); else localStorage.removeItem(STORAGE_KEY); } catch(e) {} }
  
  /**
   * Expande la barra lateral
   */
  function expandSidebar() { sidebar.classList.remove('collapsed'); sidebar.classList.add('expanded'); sidebar.setAttribute('aria-expanded','true'); }
  
  /**
   * Colapsa la barra lateral (a menos que esté fijada)
   */
  function collapseSidebar() { if(isPinned()) return; sidebar.classList.remove('expanded'); sidebar.classList.add('collapsed'); sidebar.setAttribute('aria-expanded','false'); }
  
  // Controladores de eventos para ratón
  const onEnter = () => { if(hoverTimeout) clearTimeout(hoverTimeout); expandSidebar(); updatePinVisibility(); };
  const onLeave = () => { hoverTimeout = setTimeout(collapseSidebar, 180); updatePinVisibility(); };

  // Registra los eventos del ratón
  sidebar.addEventListener('mouseenter', onEnter);
  sidebar.addEventListener('mouseleave', onLeave);

  // Configura el botón de fijar si existe
  if(pinBtn) {
    pinBtn.addEventListener('click', () => { 
      const newPinned = !isPinned(); 
      setPinned(newPinned); 
      updatePinButton(); 
      if(newPinned) expandSidebar(); else collapseSidebar(); 
    });
  }

  /**
   * Determina si se debe mostrar el botón de fijar
   * @returns {boolean} true si se debe mostrar
   */
  function shouldShowPin() { try { return isPinned() || sidebar.matches(':hover') || sidebar.classList.contains('expanded'); } catch(e) { return isPinned(); } }
  
  /**
   * Actualiza la visibilidad del botón de fijar
   */
  function updatePinVisibility() { if(!pinBtn) return; if(shouldShowPin()) pinBtn.classList.add('force-visible'); else pinBtn.classList.remove('force-visible'); }
  
  /**
   * Actualiza la apariencia del botón de fijar según su estado
   */
  function updatePinButton() { 
    const pinned = isPinned(); 
    if(pinBtn) { 
      pinBtn.setAttribute('aria-pressed', pinned ? 'true' : 'false'); 
      pinBtn.title = pinned ? 'Desfijar barra lateral' : 'Fijar barra lateral'; 
      if(pinned) pinBtn.classList.add('pinned'); else pinBtn.classList.remove('pinned'); 
    } 
  }

  // Estado inicial
  if(isPinned()) expandSidebar(); else collapseSidebar();
  updatePinButton(); updatePinVisibility();

  // Refleja cambios desde otras pestañas/ventanas
  window.addEventListener('storage', (e) => {
    if(e.key === STORAGE_KEY) {
      updatePinButton();
      if(isPinned()) expandSidebar(); else collapseSidebar();
      updatePinVisibility();
    }
  });

  // Marca como inicializada y expone el elemento en el dataset
  sidebar.dataset.sidebarInit = '1';

  /**
   * Resalta el enlace activo basado en la ubicación actual
   * Compara las rutas de los enlaces con la URL actual para resaltar el enlace correspondiente
   */
  function highlightActiveLink() {
    try {
      // Obtiene todos los enlaces en la barra lateral
      const anchors = sidebar.querySelectorAll('a[href]');
      // URL actual sin fragmentos (#)
      const cur = (location.href || '').split('#')[0];
      // Ruta normalizada de la URL actual
      const curPath = (new URL(cur, location.href)).pathname.replace(/\/+$|^\/?/g,'');
      
      // Revisa cada enlace
      anchors.forEach(a => {
        try {
          const href = a.getAttribute('href');
          if(!href) return;
          // Resuelve a URL absoluta usando la ubicación actual como base
          const abs = (new URL(href, location.href)).href.split('#')[0];
          const absPath = (new URL(abs)).pathname.replace(/\/+$|^\/?/g,'');
          
          // Encuentra el elemento de lista padre
          const li = a.closest('li');
          if(!li) return;
          
          // Resalta si la ruta coincide con la actual
          if(absPath === curPath) {
            li.classList.add('bg-gray-700');
            // Asegura el color del texto para la etiqueta
            li.classList.add('text-white');
          } else {
            li.classList.remove('bg-gray-700');
            li.classList.remove('text-white');
          }
        } catch(e) {}
      });
    } catch(e) {}
  }

  // Resaltado inicial y en navegación
  try { highlightActiveLink(); window.addEventListener('popstate', highlightActiveLink); } catch(e) {}
}

/**
 * Helper de auto-inicialización: inicializa un elemento de barra lateral si aún no está inicializado
 * @param {HTMLElement} el - Elemento de la barra lateral a inicializar
 */
export function ensureInitForElement(el) {
  try {
    // Verifica si el elemento existe y no está ya inicializado
    if(!el || el.dataset.sidebarInit === '1') return;
    
    // Inicializa la barra lateral
    initSidebar(el);
    
    // Marca como inicializada para evitar inicializaciones duplicadas
    el.dataset.sidebarInit = '1';
  } catch(e) {}
}

/**
 * Observa adiciones al DOM para auto-inicializar barras laterales insertadas dinámicamente
 * Utiliza MutationObserver para detectar nuevos elementos sidebar y los inicializa automáticamente
 */
if(typeof MutationObserver !== 'undefined') {
  const mo = new MutationObserver((records) => {
    for(const r of records) {
      for(const n of r.addedNodes) {
        if(!(n instanceof HTMLElement)) continue;
        
        if(n.matches && n.matches('aside.sidebar')) {
          // Inicializa específicamente este elemento sidebar
          try { initSidebar(n); n.dataset.sidebarInit = '1'; } catch(e) {}
        } else {
          // También revisa los descendientes
          const found = n.querySelector && n.querySelector('aside.sidebar');
          if(found && !found.dataset.sidebarInit) { 
            try { initSidebar(found); found.dataset.sidebarInit = '1'; } catch(e) {} 
          }
        }
      }
    }
  });
  
  // Observa todo el documento para detectar nuevos elementos sidebar
  mo.observe(document.documentElement || document.body, { childList: true, subtree: true });
}
