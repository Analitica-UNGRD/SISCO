/** Precontractual handlers **/

// Handler para obtener el catálogo de etapas y fases
function handleListPreCatalogo() {
  try {
    var sh = getSheet(CONFIG.SHEETS.PRE_CATALOGO);
    var data = sheetToObjects(sh);
    return { ok: true, items: data };
  } catch (err) { return { ok: false, error: String(err) }; }
}

// Handler para obtener etapas activas
function handleListEtapas() {
  try {
    var sh = getSheet(CONFIG.SHEETS.PRE_CATALOGO);
    var data = sheetToObjects(sh);
    var etapas = [];
    var etapasVistas = {};
    
    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      if (row.Activo && !etapasVistas[row.Etapa]) {
        etapas.push({
          Etapa: row.Etapa,
          OrdenEtapa: row.OrdenEtapa || 999
        });
        etapasVistas[row.Etapa] = true;
      }
    }
    
    // Ordenar por OrdenEtapa
    etapas.sort(function(a, b) { return (a.OrdenEtapa || 999) - (b.OrdenEtapa || 999); });
    return { ok: true, items: etapas };
  } catch (err) { return { ok: false, error: String(err) }; }
}

// Handler para obtener fases de una etapa específica
function handleListFases(payload) {
  try {
    var etapa = String(payload.etapa || '').trim();
    if (!etapa) return { ok: false, error: 'Etapa requerida' };
    
    var sh = getSheet(CONFIG.SHEETS.PRE_CATALOGO);
    var data = sheetToObjects(sh);
    var fases = [];
    
    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      if (row.Etapa === etapa && row.Activo) {
        fases.push({
          FaseEtiqueta: row.FaseEtiqueta,
          FaseNombre: row.FaseNombre,
          OrdenFase: row.OrdenFase || 999,
          Finaliza_etapa: row.Finaliza_etapa
        });
      }
    }
    
    // Ordenar por OrdenFase
    fases.sort(function(a, b) { return (a.OrdenFase || 999) - (b.OrdenFase || 999); });
    return { ok: true, items: fases };
  } catch (err) { return { ok: false, error: String(err) }; }
}

// Handler para obtener eventos precontractuales
function handleListPrecontractual() {
  try {
    var sh = getSheet(CONFIG.SHEETS.PRECONTRACTUAL);
    var data = sheetToObjects(sh);
    return { ok: true, items: data };
  } catch (err) { return { ok: false, error: String(err) }; }
}

function handleCrearPrecontractual(payload) {
	try {
		var isDraft = !!payload._draft;
		var personaId = String(payload.persona_id || '').trim();
		var etapa = String(payload.Etapa || '').trim();
		var fase = String(payload.Fase || '').trim();
		
		if (!isDraft && (!personaId || !etapa || !fase)) {
			return { ok: false, error: 'persona_id, Etapa y Fase son requeridos.' };
		}
		
		var preId = 'PRE-' + uuidShort();
		var email = Session.getActiveUser().getEmail();
		var identificacion = resolvePersonaIdentificacion(personaId, payload) || '';
		var rowObj = {};
		rowObj['pre_id'] = preId;
		rowObj['persona_id'] = personaId;
		rowObj['Identificacion'] = identificacion;
		rowObj['Etapa'] = etapa;
		rowObj['Fase'] = fase;
		rowObj['Estado'] = payload.Estado || 'En proceso';
		rowObj['Evento'] = payload.Evento || '';
		var eventoNombre = String(rowObj['Evento'] || '').trim();
		var intentoValor = parseInt(payload.Intento, 10);
		if (eventoNombre !== 'Repite') {
			intentoValor = 1;
		} else {
			intentoValor = isNaN(intentoValor) ? 2 : Math.max(2, intentoValor);
		}
		// Server-side validation: if Evento is Cierre administrativo, Observaciones required
		if (String(rowObj['Evento'] || '').trim() === 'Cierre administrativo') {
			var obsVal = String(payload.Observaciones || '').trim();
			if (!obsVal) {
				return { ok: false, error: 'Observaciones requeridas para Evento = Cierre administrativo' };
			}
			rowObj['Observaciones'] = obsVal;
		}
		rowObj['Intento'] = intentoValor;
		rowObj['Fecha'] = payload.Fecha || new Date();
		rowObj['Responsable'] = payload.Responsable || email || '';
		rowObj['Observaciones'] = payload.Observaciones || '';
		rowObj['Evidencia_URL'] = payload.Evidencia_URL || '';
		
		appendRowToSheetByHeader(CONFIG.SHEETS.PRECONTRACTUAL, rowObj);
		return { ok: true, pre_id: preId };
	} catch (err) { return { ok: false, error: String(err) }; }
}


function upsertPrecontractual(payload) {
	try {
		var preId = String(payload.pre_id || '').trim();
		var personaId = String(payload.persona_id || '').trim();
		var etapa = String(payload.Etapa || '').trim();
		var fase = String(payload.Fase || '').trim();
		
		if (!preId && (!personaId || !etapa || !fase)) {
			return { ok: false, error: 'persona_id, Etapa y Fase son requeridos' };
		}
		
		var email = Session.getActiveUser().getEmail();
		var identificacion = resolvePersonaIdentificacion(personaId, payload) || '';
		
		if (preId) {
			var updates = {
				'persona_id': personaId || '',
				'Identificacion': identificacion,
				'Etapa': etapa || '',
				'Fase': fase || '',
				'Estado': payload.Estado || '',
				'Evento': payload.Evento || '',
				'Fecha': payload.Fecha ? parseDateISO(payload.Fecha) : '',
				'Responsable': payload.Responsable || '',
				'Observaciones': payload.Observaciones || '',
				'Evidencia_URL': payload.Evidencia_URL || ''
			};
			var updEventoNombre = String(updates['Evento'] || '').trim();
			var updIntento = parseInt(payload.Intento, 10);
			if (updEventoNombre !== 'Repite') {
				updates['Intento'] = 1;
			} else {
				updIntento = isNaN(updIntento) ? 2 : Math.max(2, updIntento);
				updates['Intento'] = updIntento;
			}
			// Server-side validation for Cierre administrativo on update
			if (String(updates['Evento'] || '').trim() === 'Cierre administrativo') {
				var obsVal2 = String(updates['Observaciones'] || '').trim();
				if (!obsVal2) {
					return { ok: false, error: 'Observaciones requeridas para Evento = Cierre administrativo' };
				}
			}
			var ok = updateRowInSheetByHeader(CONFIG.SHEETS.PRECONTRACTUAL, 'pre_id', preId, updates);
			if (!ok) return { ok: false, error: 'Precontractual not found to update' };
			return { ok: true, pre_id: preId, updated: true };
		}
		
		var newId = 'PRE-' + uuidShort();
		var rowObj = {};
		rowObj['pre_id'] = newId;
		rowObj['persona_id'] = personaId;
		rowObj['Identificacion'] = identificacion;
		rowObj['Etapa'] = etapa;
		rowObj['Fase'] = fase;
		rowObj['Estado'] = payload.Estado || 'En proceso';
		rowObj['Evento'] = payload.Evento || '';
		var newEventoNombre = String(rowObj['Evento'] || '').trim();
		var newIntento = parseInt(payload.Intento, 10);
		if (newEventoNombre !== 'Repite') {
			newIntento = 1;
		} else {
			newIntento = isNaN(newIntento) ? 2 : Math.max(2, newIntento);
		}
		rowObj['Intento'] = newIntento;
		rowObj['Fecha'] = payload.Fecha || new Date();
		rowObj['Responsable'] = payload.Responsable || email || '';
		rowObj['Observaciones'] = payload.Observaciones || '';
		rowObj['Evidencia_URL'] = payload.Evidencia_URL || '';
		
		appendRowToSheetByHeader(CONFIG.SHEETS.PRECONTRACTUAL, rowObj);
		return { ok: true, pre_id: newId };
	} catch (err) { return { ok: false, error: String(err) }; }
}

// Registrar handlers en API map
API_HANDLERS = API_HANDLERS || {};
API_HANDLERS['listPreCatalogo'] = handleListPreCatalogo;
API_HANDLERS['listEtapas'] = handleListEtapas;
API_HANDLERS['listFases'] = handleListFases;
API_HANDLERS['listPrecontractual'] = handleListPrecontractual;
API_HANDLERS['crearPrecontractual'] = handleCrearPrecontractual;
API_HANDLERS['upsertPrecontractual'] = upsertPrecontractual;
