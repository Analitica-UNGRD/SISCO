/** Obligaciones handlers **/
function handleCrearObligacion(payload) {
	try {
		var isDraft = !!payload._draft;
		var contratoId = String(payload.contrato_id || '').trim();
		var descripcion = String(payload.Descripcion || payload.descripcion || '').trim();
		if (!isDraft && (!contratoId || !descripcion)) return { ok: false, error: 'contrato_id y Descripcion son requeridos.' };
		var obligId = 'O-' + uuidShort();
		var email = Session.getActiveUser().getEmail();
		var rowObj = {};
		var personaForContrato = '';
		try{
			if (contratoId) {
				var shC = getSheet(CONFIG.SHEETS.CONTRATOS);
				var contratosList = sheetToObjects(shC);
				for(var ci=0; ci<contratosList.length; ci++){
					if(String(contratosList[ci]['contrato_id']||'') === contratoId){ personaForContrato = String(contratosList[ci].persona_id||contratosList[ci]['persona_id']||''); break; }
				}
			}
		}catch(e){}
		rowObj['obligacion_id'] = obligId;
		rowObj['persona_id'] = payload.persona_id || personaForContrato || '';
		rowObj['contrato_id'] = contratoId;
		rowObj['Descripcion'] = descripcion;
		rowObj['Actividades_realizadas'] = payload.Actividades_realizadas || '';
		rowObj['Producto'] = payload.Producto || '';
		rowObj['Evidencia_URL'] = payload.Evidencia_URL || '';
		rowObj['Periodo'] = payload.Periodo || '';
		rowObj['Estado'] = payload.Estado || 'Pendiente';
		rowObj['Ultima_actualizacion'] = new Date();
		rowObj['Actualizado_por'] = email || '';
		appendRowToSheetByHeader(CONFIG.SHEETS.OBLIGACIONES, rowObj);
		return { ok: true, obligacion_id: obligId };
	} catch (err) { return { ok: false, error: String(err) }; }
}

function upsertObligacion(payload) {
	try {
		var obligId = String(payload.obligacion_id || payload.obligacionId || '').trim();
		var contratoId = String(payload.contrato_id || '').trim();
		var descripcion = String(payload.Descripcion || payload.descripcion || '').trim();
		if (!obligId && (!contratoId || !descripcion)) return { ok: false, error: 'contrato_id and Descripcion are required' };
		var email = Session.getActiveUser().getEmail();
		if (obligId) {
			var updates = {
				'persona_id': payload.persona_id || '',
				'contrato_id': contratoId || '',
				'Descripcion': descripcion || '',
				'Actividades_realizadas': payload.Actividades_realizadas || '',
				'Producto': payload.Producto || '',
				'Evidencia_URL': payload.Evidencia_URL || '',
				'Periodo': payload.Periodo || '',
				'Estado': payload.Estado || '',
				'Ultima_actualizacion': new Date(),
				'Actualizado_por': email || ''
			};
			var ok = updateRowInSheetByHeader(CONFIG.SHEETS.OBLIGACIONES, 'obligacion_id', obligId, updates);
			if (!ok) return { ok: false, error: 'Obligacion not found to update' };
			return { ok: true, obligacion_id: obligId, updated: true };
		}
		var newId = 'O-' + uuidShort();
		var rowObj = {};
		rowObj['obligacion_id'] = newId;
		rowObj['persona_id'] = payload.persona_id || '';
		rowObj['contrato_id'] = contratoId;
		rowObj['Descripcion'] = descripcion;
		rowObj['Actividades_realizadas'] = payload.Actividades_realizadas || '';
		rowObj['Producto'] = payload.Producto || '';
		rowObj['Evidencia_URL'] = payload.Evidencia_URL || '';
		rowObj['Periodo'] = payload.Periodo || '';
		rowObj['Estado'] = payload.Estado || 'Pendiente';
		rowObj['Ultima_actualizacion'] = new Date();
		rowObj['Actualizado_por'] = email || '';
		appendRowToSheetByHeader(CONFIG.SHEETS.OBLIGACIONES, rowObj);
		return { ok: true, obligacion_id: newId };
	} catch (err) { return { ok: false, error: String(err) }; }
}

function getObligacionesByContrato(payload){
	try{
		var contratoId = String(payload && payload.contrato_id || '').trim();
		if(!contratoId) return { ok: false, error: 'contrato_id required' };
		var sh = getSheet(CONFIG.SHEETS.OBLIGACIONES);
		var rows = sheetToObjects(sh).filter(function(r){ return String(r.contrato_id||'') === String(contratoId); });
		return { ok: true, items: rows };
	}catch(err){ return { ok: false, error: String(err) }; }
}

API_HANDLERS = API_HANDLERS || {};
API_HANDLERS['crearObligacion'] = handleCrearObligacion;
API_HANDLERS['upsertObligacion'] = upsertObligacion;
API_HANDLERS['getObligacionesByContrato'] = getObligacionesByContrato;
