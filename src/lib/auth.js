/**
 * @fileoverview Sistema de autenticación 
 * Este módulo proporciona funciones para la gestión de autenticación
 * incluyendo login, verificación de estado, y cierre de sesión.
 * Utiliza localStorage para almacenar los datos de sesión.
 */

import { APP_CONFIG } from './config.js';

/**
 * Objeto Auth con métodos de autenticación
 * @namespace
 */
const Auth = {
	/**
	 * Inicia sesión con credenciales de correo y contraseña
	 * @param {string} email - Correo electrónico del usuario (debe ser del dominio institucional)
	 * @param {string} password - Contraseña del usuario
	 * @returns {Promise<Object>} Resultado de la autenticación con estado y mensaje
	 */
	async login(email, password){
		// Valida que el correo sea del dominio institucional
		const domainOK = /@gestiondelriesgo\.gov\.co$/i.test(email);
		if(!domainOK) return { success:false, message:"Use su correo institucional @gestiondelriesgo.gov.co" };
		
		// Valida que la contraseña tenga un mínimo de caracteres
		if(!password || password.length < 3){
			return { success:false, message:"Contraseña muy corta" };
		}

		// Si hay una URL base configurada, llama al endpoint remoto de Apps Script
		if (APP_CONFIG && APP_CONFIG.BASE_URL) {
			try {
				// Realiza la petición de autenticación al servidor
				const resp = await fetch(APP_CONFIG.BASE_URL, {
					method: 'POST',
					headers: { 'Content-Type': 'text/plain' },
					body: JSON.stringify({ path: 'login', payload: { email, password } })
				});
				
				// Procesa la respuesta - tolera respuestas no-JSON (HTML/text) para dar
				// un mensaje de error legible en vez de lanzar un SyntaxError.
				const raw = await resp.text();
				let data;
				try {
					data = raw && raw.length ? JSON.parse(raw) : null;
				} catch (parseErr) {
					// Backend returned non-JSON (probably HTML error page). Surface a
					// concise message that includes a snippet to help debugging.
					const snippet = raw ? raw.substr(0, 200) : '';
					return { success: false, message: 'Error de conexión: respuesta no JSON - ' + snippet };
				}
				if (!data || !data.ok) {
					return { success: false, message: (data && data.error) || 'Error de autenticación' };
				}
				
				// Almacena token y metadatos de autenticación en localStorage
				const token = btoa(`${email}|${Date.now()}`);
				localStorage.setItem('auth_token', token);
				localStorage.setItem('auth_email', data.email || email);
				localStorage.setItem('auth_role', data.rol || '');
				
				return { success: true, message: 'OK', role: data.rol };
			} catch (err) {
				return { success: false, message: 'Error de conexión: ' + String(err) };
			}
		}

		// Comportamiento local/falso para desarrollo (fallback)
		const fakeToken = btoa(`${email}|${Date.now()}`);
		localStorage.setItem("auth_token", fakeToken);
		localStorage.setItem("auth_email", email);
		localStorage.setItem('auth_role', 'contratista');
		return { success:true, message:"OK", role: 'contratista' };
	},
	
	/**
	 * Verifica si el usuario está autenticado y su sesión no ha expirado
	 * @returns {boolean} true si hay un token válido y no ha expirado (1 hora)
	 */
	isAuthenticated(){
		const token = localStorage.getItem("auth_token");
		if (!token) return false;
		
		try {
			// Decodifica el token para obtener el timestamp
			const decoded = atob(token);
			const parts = decoded.split('|');
			if (parts.length < 2) return false;
			
			const timestamp = parseInt(parts[1]);
			const now = Date.now();
			const oneHour = 60 * 60 * 1000; // 1 hora en milisegundos
			
			// Verifica si la sesión ha expirado
			if (now - timestamp > oneHour) {
				// Sesión expirada, limpia los datos
				this.logout();
				return false;
			}
			
			return true;
		} catch (error) {
			// Token malformado, limpia los datos
			this.logout();
			return false;
		}
	},
	
	/**
	 * Cierra la sesión del usuario eliminando todos los datos de autenticación
	 */
	logout(){
		localStorage.removeItem("auth_token");
		localStorage.removeItem("auth_email");
		localStorage.removeItem('auth_role');
	},
	
	/**
	 * Obtiene el correo electrónico del usuario autenticado
	 * @returns {string|null} Correo electrónico o null si no está autenticado
	 */
	currentEmail(){
		return localStorage.getItem("auth_email");
	},
	
	/**
	 * Obtiene el rol del usuario autenticado
	 * @returns {string|null} Rol del usuario o null si no está definido
	 */
	currentRole(){
		return localStorage.getItem('auth_role');
	},
	
	/**
	 * Obtiene el tiempo restante de la sesión en minutos
	 * @returns {number} Minutos restantes de la sesión, 0 si ha expirado
	 */
	getSessionTimeRemaining(){
		const token = localStorage.getItem("auth_token");
		if (!token) return 0;
		
		try {
			const decoded = atob(token);
			const parts = decoded.split('|');
			if (parts.length < 2) return 0;
			
			const timestamp = parseInt(parts[1]);
			const now = Date.now();
			const oneHour = 60 * 60 * 1000; // 1 hora en milisegundos
			const remaining = oneHour - (now - timestamp);
			
			return remaining > 0 ? Math.ceil(remaining / (60 * 1000)) : 0;
		} catch (error) {
			return 0;
		}
	},
	
	/**
	 * Inicia el monitoreo automático de la sesión
	 * Redirige al login cuando la sesión expire
	 */
	startSessionMonitoring(){
		// Verificar cada minuto si la sesión sigue activa
		setInterval(() => {
			if (!this.isAuthenticated()) {
				// Sesión expirada, mostrar mensaje y redirigir al login
				if (typeof UI !== 'undefined' && UI.showMessage) {
					UI.showMessage('Su sesión ha expirado por seguridad. Por favor, inicie sesión nuevamente.', 'warning', 3000);
				}
				setTimeout(() => {
					window.location.href = '/src/pages/login.html';
				}, 3000);
			}
		}, 60000); // Verificar cada minuto
		
		// Verificar inmediatamente al cargar la página
		if (!this.isAuthenticated()) {
			window.location.href = '/src/pages/login.html';
		}
	},
	
	/**
	 * Renueva el token de sesión manteniendo la misma información
	 * Útil para extender la sesión cuando el usuario está activo
	 */
	renewToken(){
		if (!this.isAuthenticated()) return false;
		
		const email = this.currentEmail();
		const role = this.currentRole();
		
		if (email) {
			// Crear nuevo token con timestamp actual
			const newToken = btoa(`${email}|${Date.now()}`);
			localStorage.setItem('auth_token', newToken);
			return true;
		}
		
		return false;
	}
};

export { Auth };
export default Auth;
