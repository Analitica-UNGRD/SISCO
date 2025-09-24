/**
 * @fileoverview Utilidades mínimas para mostrar indicadores de carga
 * Este módulo proporciona funciones básicas para gestionar los estados de carga
 * que pueden ser utilizados en toda la aplicación. Pueden ser reemplazados
 * por implementaciones más completas a nivel de UI.
 */

/**
 * Muestra un indicador de carga
 * @param {string} msg - Mensaje a mostrar durante la carga
 * @param {string} style - Estilo del loader ('transparent', 'fullscreen', etc.)
 */
export function showLoader(msg = 'Cargando...', style = 'transparent'){
  // Placeholder simple en consola; un loader real podría alternar elementos DOM
  console.log('[loader] ', msg, style);
}

/**
 * Muestra un indicador de carga mientras se resuelve una promesa o se ejecuta una función
 * Garantiza un tiempo mínimo de visualización para evitar parpadeos en operaciones rápidas
 * 
 * @param {Promise|Function} promiseOrFunc - Promesa a resolver o función que devuelve una promesa
 * @param {string} msg - Mensaje a mostrar durante la carga
 * @param {string} style - Estilo del loader ('transparent', 'fullscreen', etc.)
 * @param {number} minMs - Tiempo mínimo en milisegundos que se mostrará el indicador
 * @returns {Promise<any>} - El resultado de la promesa o función ejecutada
 */
export async function showLoaderDuring(promiseOrFunc, msg = 'Procesando...', style='transparent', minMs = 300){
  showLoader(msg, style);
  const start = Date.now();
  let result;
  
  if(typeof promiseOrFunc === 'function'){
    result = await promiseOrFunc();
  } else {
    result = await promiseOrFunc;
  }
  
  // Garantiza un tiempo mínimo de visualización para evitar parpadeos
  const elapsed = Date.now() - start;
  if(elapsed < minMs) await new Promise(r => setTimeout(r, minMs - elapsed));
  
  return result;
}
