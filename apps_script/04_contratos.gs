/** Contratos handlers **/

// Ensure API_HANDLERS is initialized before we start adding handlers
if (typeof API_HANDLERS === 'undefined') {
  var API_HANDLERS = {};
}

function handleCrearContrato(payload) {
	try {
		var isDraft = !!payload._draft;
		var personaId = String(payload.persona_id || '').trim();
		var numero = String(payload.Numero_contrato || payload.Numero || '').trim();
		var objeto = String(payload.Objeto || payload.Objeto_contrato || '').trim();
		var inicio = payload.Inicio || payload.inicio || '';
		var fin = payload.Fin || payload.fin || '';
		var valorTotal = Number(payload.Valor_total || payload.ValorTotal || 0);
		if (!isDraft && (!personaId || !numero)) return { ok: false, error: 'persona_id y Numero_contrato son requeridos.' };
		var contratoId = 'C-' + uuidShort();
		var email = Session.getActiveUser().getEmail();
		var rowObj = {};
		rowObj['contrato_id'] = contratoId;
		rowObj['persona_id'] = personaId;
		rowObj['Numero_contrato'] = numero;
		rowObj['Objeto'] = objeto;
		rowObj['Inicio'] = inicio;
		rowObj['Fin'] = fin;
		rowObj['Plazo_meses'] = payload.Plazo_meses || '';
		rowObj['Valor_total'] = valorTotal || '';
		rowObj['Valor_mensual'] = payload.Valor_mensual || '';
		rowObj['Origen_fondo'] = payload.Origen_fondo || '';
		rowObj['Tipo_vinculacion'] = payload.Tipo_vinculacion || '';
		rowObj['Numero_CDP'] = payload.Numero_CDP || '';
		rowObj['Fecha_CDP'] = payload.Fecha_CDP || '';
		rowObj['Numero_RC'] = payload.Numero_RC || '';
		rowObj['Fecha_RC'] = payload.Fecha_RC || '';
		rowObj['Supervisor'] = payload.Supervisor || '';
		rowObj['Estado'] = payload.Estado || 'Vigente';
		rowObj['Carpeta_Drive_URL'] = payload.Carpeta_Drive_URL || '';
		rowObj['Creado_en'] = new Date();
		rowObj['Creado_por'] = email || '';
		appendRowToSheetByHeader(CONFIG.SHEETS.CONTRATOS, rowObj);
		return { ok: true, contrato_id: contratoId };
	} catch (err) { return { ok: false, error: String(err) }; }
}

function upsertContrato(payload) {
	try {
		var contratoId = String(payload.contrato_id || '').trim();
		var personaId = String(payload.persona_id || '').trim();
		var numero = String(payload.Numero_contrato || payload.Numero || '').trim();
		if (!contratoId && (!personaId || !numero)) return { ok: false, error: 'persona_id and Numero_contrato are required to create a contract' };
		var email = Session.getActiveUser().getEmail();
		if (contratoId) {
			var updates = {
				'persona_id': personaId || '',
				'Numero_contrato': numero || '',
				'Objeto': payload.Objeto || payload.Objeto_contrato || '',
				'Inicio': payload.Inicio || payload.inicio || '',
				'Fin': payload.Fin || payload.fin || '',
				'Plazo_meses': payload.Plazo_meses || '',
				'Valor_total': payload.Valor_total || payload.ValorTotal || '',
				'Valor_mensual': payload.Valor_mensual || '',
				'Origen_fondo': payload.Origen_fondo || '',
				'Tipo_vinculacion': payload.Tipo_vinculacion || '',
				'Numero_CDP': payload.Numero_CDP || '',
				'Fecha_CDP': payload.Fecha_CDP || '',
				'Numero_RC': payload.Numero_RC || '',
				'Fecha_RC': payload.Fecha_RC || '',
				'Supervisor': payload.Supervisor || '',
				'Estado': payload.Estado || '',
				'Carpeta_Drive_URL': payload.Carpeta_Drive_URL || '',
				'Actualizado_en': new Date(),
				'Actualizado_por': email || ''
			};
			var ok = updateRowInSheetByHeader(CONFIG.SHEETS.CONTRATOS, 'contrato_id', contratoId, updates);
			if (!ok) return { ok: false, error: 'Contrato not found to update' };
			return { ok: true, contrato_id: contratoId, updated: true };
		}
		var newId = 'C-' + uuidShort();
		var rowObj = {};
		rowObj['contrato_id'] = newId;
		rowObj['persona_id'] = personaId;
		rowObj['Numero_contrato'] = numero;
		rowObj['Objeto'] = payload.Objeto || payload.Objeto_contrato || '';
		rowObj['Inicio'] = payload.Inicio || payload.inicio || '';
		rowObj['Fin'] = payload.Fin || payload.fin || '';
		rowObj['Plazo_meses'] = payload.Plazo_meses || '';
		rowObj['Valor_total'] = payload.Valor_total || payload.ValorTotal || '';
		rowObj['Valor_mensual'] = payload.Valor_mensual || '';
		rowObj['Origen_fondo'] = payload.Origen_fondo || '';
		rowObj['Tipo_vinculacion'] = payload.Tipo_vinculacion || '';
		rowObj['Numero_CDP'] = payload.Numero_CDP || '';
		rowObj['Fecha_CDP'] = payload.Fecha_CDP || '';
		rowObj['Numero_RC'] = payload.Numero_RC || '';
		rowObj['Fecha_RC'] = payload.Fecha_RC || '';
		rowObj['Supervisor'] = payload.Supervisor || '';
		rowObj['Estado'] = payload.Estado || 'Vigente';
		rowObj['Carpeta_Drive_URL'] = payload.Carpeta_Drive_URL || '';
		rowObj['Creado_en'] = new Date();
		rowObj['Creado_por'] = email || '';
		appendRowToSheetByHeader(CONFIG.SHEETS.CONTRATOS, rowObj);
		return { ok: true, contrato_id: newId };
	} catch (err) { return { ok: false, error: String(err) }; }
}

function getContratosByPersona(payload) {
	try {
		var personaId = String(payload && payload.persona_id || '');
		if (!personaId) return { ok: false, error: 'persona_id required' };
		var sh = getSheet(CONFIG.SHEETS.CONTRATOS);
		var rows = sheetToObjects(sh).filter(function(r){ return String(r.persona_id||r['persona_id']||'') === String(personaId); });
		return { ok: true, items: rows };
	} catch (err) { return { ok: false, error: String(err) }; }
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

function getContratoById(payload) {
	try {
		var contratoId = String(payload && payload.contrato_id || '');
		if (!contratoId) return { ok: false, error: 'contrato_id required' };
		var sh = getSheet(CONFIG.SHEETS.CONTRATOS);
		var rows = sheetToObjects(sh);
		var contrato = rows.find(function(r){ return String(r.contrato_id || '') === contratoId; });
		
		if (!contrato) return { ok: false, error: 'Contrato not found' };
		
		// Si se solicita incluir datos de persona, obtenemos y combinamos los datos
		if (payload && payload.includePersona) {
			var personaId = contrato.persona_id;
			if (personaId) {
				var shPersonas = getSheet(CONFIG.SHEETS.PERSONAS);
				var personas = sheetToObjects(shPersonas);
				var persona = personas.find(function(p) { return String(p.persona_id || '') === String(personaId); });
				
				if (persona) {
					contrato = Object.assign({}, contrato, {
						persona: persona.Nombre || '',
						documento_identidad: persona.Identificacion || '',
						Tipo_identificacion: persona.Tipo_identificacion || ''
					});
				}
			}
		}
		
		return { ok: true, contrato: contrato };
	} catch (err) { return { ok: false, error: String(err) }; }
}

// Nuevas funciones para la lógica de Editar vs Guardar Nuevo
function editarContrato(payload) {
	try {
		var contratoId = String(payload.contrato_id || '').trim();
		if (!contratoId) return { ok: false, error: 'contrato_id es requerido para editar' };
		
		var email = Session.getActiveUser().getEmail();
		var updates = {
			'persona_id': payload.persona_id || '',
			'Numero_contrato': payload.Numero_contrato || payload.Numero || '',
			'Objeto': payload.Objeto || payload.Objeto_contrato || '',
			'Inicio': payload.Inicio || payload.inicio || '',
			'Fin': payload.Fin || payload.fin || '',
			'Plazo_meses': payload.Plazo_meses || '',
			'Valor_total': payload.Valor_total || payload.ValorTotal || '',
			'Valor_mensual': payload.Valor_mensual || '',
			'Origen_fondo': payload.Origen_fondo || '',
			'Tipo_vinculacion': payload.Tipo_vinculacion || '',
			'Numero_CDP': payload.Numero_CDP || '',
			'Fecha_CDP': payload.Fecha_CDP || '',
			'Numero_RC': payload.Numero_RC || '',
			'Fecha_RC': payload.Fecha_RC || '',
			'Supervisor': payload.Supervisor || '',
			'Estado': payload.Estado || '',
			'Carpeta_Drive_URL': payload.Carpeta_Drive_URL || '',
			'Actualizado_en': new Date()
		};
		
		var ok = updateRowInSheetByHeader(CONFIG.SHEETS.CONTRATOS, 'contrato_id', contratoId, updates);
		if (!ok) return { ok: false, error: 'Contrato no encontrado para editar' };
		
		return { ok: true, contrato_id: contratoId, action: 'edited' };
	} catch (err) { return { ok: false, error: String(err) }; }
}

function guardarNuevoContrato(payload) {
	try {
		var personaId = String(payload.persona_id || '').trim();
		var numero = String(payload.Numero_contrato || payload.Numero || '').trim();
		
		if (!personaId || !numero) {
			return { ok: false, error: 'persona_id y Numero_contrato son requeridos' };
		}
		
		// Primero, marcar contratos anteriores de esta persona como 'Finalizado'
		markPreviousContractsAsFinalized(personaId);
		
		// Crear nuevo contrato
		var contratoId = 'C-' + uuidShort();
		var email = Session.getActiveUser().getEmail();
		var rowObj = {};
		rowObj['contrato_id'] = contratoId;
		rowObj['persona_id'] = personaId;
		rowObj['Numero_contrato'] = numero;
		rowObj['Objeto'] = payload.Objeto || payload.Objeto_contrato || '';
		rowObj['Inicio'] = payload.Inicio || payload.inicio || '';
		rowObj['Fin'] = payload.Fin || payload.fin || '';
		rowObj['Plazo_meses'] = payload.Plazo_meses || '';
		rowObj['Valor_total'] = payload.Valor_total || payload.ValorTotal || '';
		rowObj['Valor_mensual'] = payload.Valor_mensual || '';
		rowObj['Origen_fondo'] = payload.Origen_fondo || '';
		rowObj['Tipo_vinculacion'] = payload.Tipo_vinculacion || '';
		rowObj['Numero_CDP'] = payload.Numero_CDP || '';
		rowObj['Fecha_CDP'] = payload.Fecha_CDP || '';
		rowObj['Numero_RC'] = payload.Numero_RC || '';
		rowObj['Fecha_RC'] = payload.Fecha_RC || '';
		rowObj['Supervisor'] = payload.Supervisor || '';
		rowObj['Estado'] = payload.Estado || 'Vigente';
		rowObj['Carpeta_Drive_URL'] = payload.Carpeta_Drive_URL || '';
		rowObj['Creado_en'] = new Date();
		rowObj['Creado_por'] = email || '';
		
		appendRowToSheetByHeader(CONFIG.SHEETS.CONTRATOS, rowObj);
		return { ok: true, contrato_id: contratoId, action: 'created_new' };
	} catch (err) { return { ok: false, error: String(err) }; }
}

function markPreviousContractsAsFinalized(personaId) {
	try {
		var sh = getSheet(CONFIG.SHEETS.CONTRATOS);
		var lr = sh.getLastRow();
		if (lr < 2) return;
		
		var hdr = getHeaderMap(sh);
		var personaIdIdx = hdr['persona_id'];
		var estadoIdx = hdr['Estado'];
		
		if (personaIdIdx === undefined || estadoIdx === undefined) return;
		
		var values = sh.getRange(2, 1, lr - 1, sh.getLastColumn()).getValues();
		var updated = false;
		
		for (var r = 0; r < values.length; r++) {
			var rowPersonaId = String(values[r][personaIdIdx] || '').trim();
			var currentEstado = String(values[r][estadoIdx] || '').trim();
			
			if (rowPersonaId === personaId && currentEstado === 'Vigente') {
				values[r][estadoIdx] = 'Finalizado';
				sh.getRange(2 + r, 1, 1, values[r].length).setValues([values[r]]);
				updated = true;
			}
		}
		
		if (updated) {
			try { Logger.log('markPreviousContractsAsFinalized: marked contracts for persona_id=%s as Finalizado', personaId); } catch(e){}
		}
	} catch (err) {
		try { Logger.log('Error in markPreviousContractsAsFinalized: %s', String(err)); } catch(e){}
	}
}

function getContratosVigentesByPersona(payload) {
	try {
		var personaId = String(payload && payload.persona_id || '');
		if (!personaId) return { ok: false, error: 'persona_id required' };
		
		var sh = getSheet(CONFIG.SHEETS.CONTRATOS);
		var rows = sheetToObjects(sh).filter(function(r){ 
			return String(r.persona_id || '') === String(personaId) && 
			       String(r.Estado || '').trim() === 'Vigente';
		});
		
		return { ok: true, items: rows };
	} catch (err) { return { ok: false, error: String(err) }; }
}

// Debug function to verify handlers are registered
function debugContratosHandlers() {
  try {
    var handlers = ['editarContrato', 'guardarNuevoContrato', 'getContratosVigentesByPersona'];
    var status = {};
    for (var i = 0; i < handlers.length; i++) {
      var handler = handlers[i];
      status[handler] = (API_HANDLERS && API_HANDLERS[handler]) ? 'registered' : 'missing';
    }
    return { ok: true, handlers: status, totalHandlers: Object.keys(API_HANDLERS || {}).length };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

// Register ALL handlers AFTER all functions are defined
API_HANDLERS = API_HANDLERS || {};
API_HANDLERS['crearContrato'] = handleCrearContrato;
API_HANDLERS['upsertContrato'] = upsertContrato;
API_HANDLERS['getContratosByPersona'] = getContratosByPersona;
API_HANDLERS['getAllContratos'] = getAllContratos;
API_HANDLERS['getContratoById'] = getContratoById;
API_HANDLERS['editarContrato'] = editarContrato;
API_HANDLERS['guardarNuevoContrato'] = guardarNuevoContrato;
API_HANDLERS['getContratosVigentesByPersona'] = getContratosVigentesByPersona;
API_HANDLERS['debugContratosHandlers'] = debugContratosHandlers;
