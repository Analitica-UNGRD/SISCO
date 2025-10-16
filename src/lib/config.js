/**
 * @fileoverview Configuración central del sistema - Gestión de URLs y entornos
 * Este módulo determina qué URL de API utilizar basándose en el entorno.
 * El sistema utiliza un enfoque de cascada para seleccionar la URL base:
 * 1. Si existe un override en window.APP_CONFIG_OVERRIDE.BASE_URL, se usa esa URL (prioridad máxima)
 * 2. En desarrollo local o red privada (localhost, IPs privadas), se usa el proxy local
 * 3. En producción, se usa la URL pública del Apps Script
 */

// Config resolver:
// - Highest priority: window.APP_CONFIG_OVERRIDE.BASE_URL (useful for temporary overrides)
// - In local/private-network development (localhost, 127.0.0.1, 10.*, 172.16-31.*, 192.168.*) prefer the local proxy
// - Otherwise use the Apps Script public exec URL (production)
// This makes the app work on LAN dev hosts like 172.16.x.x while keeping production pointing to Apps Script.

/** URL de configuración desde window, si existe (override manual) */
const _fromWindow = (typeof window !== 'undefined' && window.APP_CONFIG_OVERRIDE && window.APP_CONFIG_OVERRIDE.BASE_URL) ? window.APP_CONFIG_OVERRIDE.BASE_URL : '';

/** URL del Apps Script en producción */
const APPS_SCRIPT_EXEC = 'https://script.google.com/macros/s/AKfycbwtKk-C0E8S68xY6nXJiuQPaJBgBkJwM2LMdOwjWwl0xuV4PUpMs6seoYW7g_DQQsu5QA/exec';

/** Ruta relativa utilizada en despliegues (Vercel) */
const DEFAULT_RELATIVE_API = '/api';
/** Ruta auxiliar que activa el helper api-proxy.js durante desarrollo local */
const DEV_PROXY_PATH = '/api-proxy';

/** 
 * Detecta hostnames locales/privados típicos 
 * Cubre localhost, 127.0.0.1 y rangos de IP privados comunes
 * para determinar si se debe usar el proxy de desarrollo
 */
let useProxy = false;
try {
	if (typeof window !== 'undefined' && window.location && window.location.hostname) {
		const h = window.location.hostname;
		if (h === 'localhost' || h === '127.0.0.1') useProxy = true;
		// 10.x.x.x - Rango de IPs privadas Clase A
		if (/^10\./.test(h)) useProxy = true;
		// 192.168.x.x - Rango de IPs privadas Clase C
		if (/^192\.168\./.test(h)) useProxy = true;
		// 172.16.0.0 - 172.31.255.255 - Rango de IPs privadas Clase B
		if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(h)) useProxy = true;
	}
} catch (e) {
	// En caso de error, se establece en false como valor predeterminado
}

/** 
 * URL base resuelta según la lógica de prioridad:
 * 1. Override desde window (window.APP_CONFIG_OVERRIDE.BASE_URL)
 * 2. Preferir el proxy relativo de la misma origin (/api) para producción y despliegues
 *    (esto evita problemas de CORS al llamar directamente al Apps Script desde el cliente)
 * 3. Si por alguna razón necesitas apuntar directamente al Apps Script, usa
 *    window.APP_CONFIG_OVERRIDE.BASE_URL = APPS_SCRIPT_EXEC
 */
const resolvedDevPath = useProxy ? DEV_PROXY_PATH : DEFAULT_RELATIVE_API;

const RESOLVED_BASE = _fromWindow || resolvedDevPath;

/**
 * Configuración global de la aplicación
 * @const {Object} APP_CONFIG - Objeto de configuración exportado
 * @property {string} BASE_URL - URL base para las llamadas a la API
 */
export const APP_CONFIG = {
	BASE_URL: RESOLVED_BASE
};

/**
 * Función helper para obtener la configuración
 * @returns {Promise<Object>} Configuración de la aplicación
 */
export async function getConfig() {
	return {
		SCRIPT_URL: APP_CONFIG.BASE_URL
	};
}
