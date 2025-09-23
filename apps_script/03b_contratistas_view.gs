/**
 * Handlers especiales para la vista de contratistas
 */

// Función de diagnóstico para verificar que el archivo se está cargando
function getContratistasVersion() {
  return { ok: true, version: "1.0.1", loaded: true, filename: "03b_contratistas_view.gs" };
}

function getAllContratos(payload) {
  try {
    var sh = getSheet(CONFIG.SHEETS.CONTRATOS);
    var rows = sheetToObjects(sh);
    
    // Si se solicita incluir datos de personas, obtenemos y combinamos los datos
    if (payload && payload.includePersonas) {
      var shPersonas = getSheet(CONFIG.SHEETS.PERSONAS);
      var personas = sheetToObjects(shPersonas);
      var personasMap = {};
      
      // Crear un mapa de personas por ID para acceso más rápido
      personas.forEach(function(p) {
        personasMap[p.persona_id] = p;
      });
      
      // Combinar datos de personas con contratos
      rows = rows.map(function(contrato) {
        var persona = personasMap[contrato.persona_id] || {};
        return Object.assign({}, contrato, {
          persona: persona.Nombre || '',
          documento_identidad: persona.Identificacion || '',
          Tipo_identificacion: persona.Tipo_identificacion || ''
        });
      });
    }
    
    // Filtrar por estado si se especifica
    if (payload && payload.estado) {
      rows = rows.filter(function(r) { 
        return String(r.Estado || '').toLowerCase() === String(payload.estado).toLowerCase();
      });
    }
    
    return { ok: true, items: rows };
  } catch (err) { return { ok: false, error: String(err) }; }
}

// Asegurarse de que los handlers se registren
API_HANDLERS = API_HANDLERS || {};
API_HANDLERS['getAllContratos'] = getAllContratos;
API_HANDLERS['getContratistasVersion'] = getContratistasVersion;
