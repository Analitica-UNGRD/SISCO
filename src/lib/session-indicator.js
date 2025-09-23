/**
 * @fileoverview Indicador visual de sesión
 * Este módulo crea un indicador visual del tiempo restante de sesión
 * en la parte superior de la página
 */

import { Auth } from './auth.js';

/**
 * Clase para manejar el indicador visual de sesión
 */
class SessionIndicator {
    constructor() {
        this.element = null;
        this.intervalId = null;
        this.isVisible = false;
        this.init();
    }

    /**
     * Inicializa el indicador
     */
    init() {
        this.createElement();
        this.startUpdate();
    }

    /**
     * Crea el elemento HTML del indicador
     */
    createElement() {
        this.element = document.createElement('div');
        this.element.id = 'session-indicator';
        this.element.style.cssText = `
            position: fixed;
            top: 0;
            right: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 8px 16px;
            border-radius: 0 0 8px 8px;
            font-size: 12px;
            font-weight: 500;
            z-index: 9999;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            transition: all 0.3s ease;
            cursor: pointer;
            display: none;
        `;
        
        // Tooltip al hacer hover
        this.element.title = 'Tiempo restante de sesión. Haga clic para más información.';
        
        // Click para mostrar información detallada
        this.element.addEventListener('click', () => {
            this.showDetailedInfo();
        });

        document.body.appendChild(this.element);
    }

    /**
     * Inicia la actualización periódica del indicador
     */
    startUpdate() {
        this.updateDisplay();
        
        // Actualizar cada 30 segundos
        this.intervalId = setInterval(() => {
            this.updateDisplay();
        }, 30000);
    }

    /**
     * Actualiza la visualización del indicador
     */
    updateDisplay() {
        if (!Auth.isAuthenticated()) {
            this.hide();
            return;
        }

        const timeRemaining = Auth.getSessionTimeRemaining();
        
        if (timeRemaining <= 0) {
            this.hide();
            return;
        }

        // Mostrar solo cuando quedan menos de 20 minutos
        if (timeRemaining <= 20) {
            this.show();
            this.updateContent(timeRemaining);
            this.updateStyles(timeRemaining);
        } else {
            this.hide();
        }
    }

    /**
     * Actualiza el contenido del indicador
     * @param {number} minutes - Minutos restantes
     */
    updateContent(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        
        let text = '';
        if (hours > 0) {
            text = `${hours}h ${mins}m`;
        } else {
            text = `${mins}m`;
        }
        
        this.element.innerHTML = `
            <span style="opacity: 0.8;">⏱️</span>
            <span style="margin-left: 6px;">${text}</span>
        `;
    }

    /**
     * Actualiza los estilos según el tiempo restante
     * @param {number} minutes - Minutos restantes
     */
    updateStyles(minutes) {
        let background = '';
        
        if (minutes <= 5) {
            // Rojo crítico
            background = 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)';
            this.element.style.animation = 'pulse 2s infinite';
        } else if (minutes <= 10) {
            // Naranja advertencia
            background = 'linear-gradient(135deg, #ffa726 0%, #ff7043 100%)';
            this.element.style.animation = '';
        } else {
            // Azul información
            background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            this.element.style.animation = '';
        }
        
        this.element.style.background = background;
    }

    /**
     * Muestra el indicador
     */
    show() {
        if (!this.isVisible) {
            this.element.style.display = 'block';
            setTimeout(() => {
                this.element.style.transform = 'translateY(0)';
                this.element.style.opacity = '1';
            }, 10);
            this.isVisible = true;
        }
    }

    /**
     * Oculta el indicador
     */
    hide() {
        if (this.isVisible) {
            this.element.style.transform = 'translateY(-100%)';
            this.element.style.opacity = '0';
            setTimeout(() => {
                this.element.style.display = 'none';
            }, 300);
            this.isVisible = false;
        }
    }

    /**
     * Muestra información detallada de la sesión
     */
    showDetailedInfo() {
        const timeRemaining = Auth.getSessionTimeRemaining();
        const email = Auth.currentEmail();
        const role = Auth.currentRole();
        
        const message = `
Información de Sesión:
• Usuario: ${email || 'N/A'}
• Rol: ${role || 'N/A'}
• Tiempo restante: ${timeRemaining} minuto${timeRemaining !== 1 ? 's' : ''}

La sesión se renovará automáticamente con actividad del usuario.
        `.trim();
        
        alert(message);
    }

    /**
     * Destruye el indicador
     */
    destroy() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        
        if (this.element) {
            this.element.remove();
            this.element = null;
        }
        
        this.isVisible = false;
    }
}

// Agregar estilos CSS para la animación
const style = document.createElement('style');
style.textContent = `
    @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); }
    }
`;
document.head.appendChild(style);

// Crear instancia global del indicador
let sessionIndicator = null;

/**
 * Inicializa el indicador de sesión cuando se carga el DOM
 */
document.addEventListener('DOMContentLoaded', () => {
    // Solo inicializar en páginas que no sean login
    const currentPage = (location.pathname || '').split('/').pop() || '';
    const publicPages = ['login.html', 'index.html', ''];
    
    if (!publicPages.includes(currentPage)) {
        // Esperar un poco para que Auth esté disponible
        setTimeout(() => {
            if (typeof Auth !== 'undefined' && Auth.isAuthenticated()) {
                sessionIndicator = new SessionIndicator();
            }
        }, 1000);
    }
});

// Exportar la clase para uso manual si es necesario
export { SessionIndicator };
export default SessionIndicator;
