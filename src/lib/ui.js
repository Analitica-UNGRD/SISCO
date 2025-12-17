/**
 * @fileoverview Utilidades mínimas para la interfaz de usuario
 * Este módulo proporciona funciones para gestionar notificaciones toast y modales,
 * permitiendo una interacción más rica con el usuario.
 */

/**
 * Crea un elemento DOM para una notificación toast
 * @private
 * @param {string} type - Tipo de notificación ('success', 'error', 'info')
 * @param {string} message - Mensaje a mostrar
 * @returns {HTMLElement} - Elemento DOM para la notificación
 */
function makeToastEl(type, message){
	const el = document.createElement('div');
	el.className = 'max-w-sm w-full px-4 py-2 rounded shadow text-sm flex items-center gap-3';
	
	// Establece los colores según el tipo de notificación
	if(type === 'success') el.classList.add('bg-green-50','text-green-800');
	else if(type === 'error') el.classList.add('bg-red-50','text-red-800');
	else el.classList.add('bg-gray-50','text-gray-800');
	
	el.textContent = message;
	return el;
}

/**
 * Muestra una notificación toast
 * @param {string} type - Tipo de notificación ('success', 'error', 'info')
 * @param {string} message - Mensaje a mostrar
 * @param {number} ms - Duración en milisegundos
 */
export function toast(type, message, ms=3500){
	try{
		const container = document.getElementById('toastContainer');
		// Si no existe el contenedor, usa la consola como fallback
		if(!container) return console[type === 'error' ? 'error' : 'log'](message);
		
		const el = makeToastEl(type, message);
		container.appendChild(el);
		
		// Elimina el elemento después del tiempo especificado con una transición de opacidad
		setTimeout(()=>{ 
			el.classList.add('opacity-0'); 
			setTimeout(()=> el.remove(), 300); 
		}, ms);
	}catch(e){ console.error(e); }
}

/**
 * Abre un modal por su ID
 * @param {string} id - ID del elemento modal
 */
export function openModal(id){
	const el = document.getElementById(id); if(!el) return;
	el.classList.remove('hidden');
	
	// Enfoca automáticamente el primer input dentro del modal
	const fi = el.querySelector('input,button,textarea'); 
	if(fi) fi.focus();
}

/**
 * Cierra un modal por su ID
 * @param {string} id - ID del elemento modal
 */
export function closeModal(id){
	const el = document.getElementById(id); if(!el) return;
	el.classList.add('hidden');
}

/**
 * Muestra un mensaje (compatibilidad con versiones anteriores)
 * @param {string} message - Mensaje a mostrar
 * @param {string} type - Tipo de mensaje ('info', 'success', 'error')
 * @param {number} ms - Duración en milisegundos
 */
export function showMessage(message, type='info', ms=3500){
	// Normaliza los argumentos: toast espera (type, message, ms)
	try{ return toast(type, message, ms); }catch(e){ console.error(e); }
}

/**
 * Objeto UI para acceso conveniente a las funciones
 * @type {Object}
 */
export const UI = { toast, showMessage, openModal, closeModal };

/**
 * Quita un prefijo numérico de una etiqueta de fase/etapa para uso visual.
 * Ejemplos: "1. Documentación" -> "Documentación", "1.1. Subfase" -> "Subfase"
 * No modifica la cadena original en los datos; solo devuelve una versión para mostrar.
 * @param {string} label
 * @returns {string}
 */
export function stripLeadingNumber(label){
	if(label === null || label === undefined) return label;
	try{
		const s = String(label);
		// Coincide con prefijos como "1.", "1.1.", "1-2.", "1)" etc.
		return s.replace(/^\s*(?:\d+(?:[\.\-]\d+)*[\.\-]?)\s*/, '');
	}catch(e){ return label; }
}

// Incluir en el objeto UI para compatibilidad
UI.stripLeadingNumber = stripLeadingNumber;
