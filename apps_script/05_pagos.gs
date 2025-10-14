/** Pagos handlers **/
function handleKpiPagos() {
	try {
		var sh = getSheet(CONFIG.SHEETS.PAGOS);
		var data = sheetToObjects(sh);
		var radicadas = 0, enRevision = 0, aprobadas30d = 0;
		var today = new Date();
		var t30 = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
		for (var i = 0; i < data.length; i++) {
			var row = data[i];
			var estado = String(row['Estado'] || '').trim();
			if (estado === 'Radicada') radicadas++;
			if (estado === 'En revisión') enRevision++;
			if (estado === 'Aprobada') {
				var fAprob = parseDateISO(row['Aprobado_en']);
				if (fAprob && fAprob >= t30) aprobadas30d++;
			}
		}
		return { ok: true, radicadas: radicadas, enRevision: enRevision, aprobadas30d: aprobadas30d };
	} catch (err) { return { ok: false, error: String(err) }; }
}

function handleCrearPagoBorrador(payload) {
	try {
		var contratoId = String(payload.contrato_id || '').trim();
		if (!contratoId) return { ok: false, error: 'contrato_id es requerido.' };
		var shC = getSheet(CONFIG.SHEETS.CONTRATOS);
		var contratos = sheetToObjects(shC);
		var personaId = null;
		var contratoExiste = false;
		for (var i = 0; i < contratos.length; i++) {
			if (String(contratos[i]['contrato_id'] || '').trim() === contratoId) {
				contratoExiste = true;
				personaId = String(contratos[i]['persona_id'] || '').trim() || null;
				break;
			}
		}
		if (!contratoExiste) return { ok: false, error: 'El contrato_id no existe en Contratos.' };
		var fIni = parseDateISO(payload.fecha_inicio);
		var fFin = parseDateISO(payload.fecha_fin);
		var valorPago = Number(payload.valor_pago || 0);
		var mesFiscal = String(payload.mes_fiscal || '').trim();
		if (!fIni || !fFin) return { ok: false, error: 'Fechas inválidas.' };
		if (!mesFiscal) return { ok: false, error: 'mes_fiscal es requerido (YYYY-MM).' };
		var numeroCobro = nextNumeroCobro(contratoId);
		var pagoId = 'PG-' + uuidShort();
		var email = Session.getActiveUser().getEmail();
		var personaIdFinal = String(payload.persona_id || personaId || '').trim();
		var identificacion = resolvePersonaIdentificacion(personaIdFinal, payload) || '';
		
		// Use centralized append helper (which acquires a lock) to safely append this row
		var rowObj = {};
		rowObj['pago_id'] = pagoId;
		rowObj['contrato_id'] = contratoId;
		rowObj['persona_id'] = personaIdFinal;
		rowObj['Identificacion'] = identificacion;
		rowObj['Numero_cobro'] = numeroCobro;
		rowObj['Fecha_inicio'] = fIni;
		rowObj['Fecha_fin'] = fFin;
		rowObj['Fecha_radicacion'] = '';
		rowObj['Valor_pago'] = valorPago;
		rowObj['Mes_fiscal'] = mesFiscal;
		rowObj['Estado'] = 'Borrador';
		rowObj['URL_PDF'] = '';
		rowObj['URL_Soportes'] = '';
		rowObj['Observaciones'] = '';
		rowObj['Creado_en'] = new Date();
		rowObj['Creado_por'] = email || '';
		rowObj['Aprobado_en'] = '';
		rowObj['Aprobado_por'] = '';
		appendRowToSheetByHeader(CONFIG.SHEETS.PAGOS, rowObj);
		return { ok: true, pago_id: pagoId, numero_cobro: numeroCobro };
	} catch (err) { return { ok: false, error: String(err) }; }
}

function nextNumeroCobro(contratoId) {
	var lock = LockService.getScriptLock();
	lock.waitLock(5000);
	try {
		var sh = getSheet(CONFIG.SHEETS.PAGOS);
		var data = sheetToObjects(sh);
		var max = 0;
		for (var i = 0; i < data.length; i++) {
			if (String(data[i]['contrato_id'] || '').trim() === contratoId) {
				var n = Number(data[i]['Numero_cobro'] || 0);
				if (n > max) max = n;
			}
		}
		return max + 1;
	} finally {
		lock.releaseLock();
	}
}

function getPagosByContrato(payload) {
	try {
		var contratoId = String(payload && payload.contrato_id || '');
		if (!contratoId) return { ok: false, error: 'contrato_id required' };
		var sh = getSheet(CONFIG.SHEETS.PAGOS);
		var rows = sheetToObjects(sh).filter(function(r){ return String(r.contrato_id||'') === String(contratoId); });
		
		// Ordenar los pagos por fecha de pago o periodo (descendente)
		rows.sort(function(a, b) {
			// Primero intentamos ordenar por fecha de pago
			if (a.fecha_pago && b.fecha_pago) {
				return new Date(b.fecha_pago) - new Date(a.fecha_pago);
			}
			// Si no hay fechas, ordenamos por periodo
			return String(b.periodo || '').localeCompare(String(a.periodo || ''));
		});
		
		return { ok: true, items: rows };
	} catch (err) { return { ok: false, error: String(err) }; }
}

// Función auxiliar para listar todos los contratos (alternativa a getAllContratos)
function listContratos(payload) {
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

function getAllPagos(payload) {
	try {
		var sh = getSheet(CONFIG.SHEETS.PAGOS);
		var rows = sheetToObjects(sh);
		
		// Filtrar por contratoId si se especifica
		if (payload && payload.contrato_id) {
			var contratoId = String(payload.contrato_id);
			rows = rows.filter(function(r) { return String(r.contrato_id || '') === contratoId; });
		}
		
		// Ordenar los pagos por fecha de pago o periodo (descendente)
		rows.sort(function(a, b) {
			// Primero intentamos ordenar por fecha de pago
			if (a.fecha_pago && b.fecha_pago) {
				return new Date(b.fecha_pago) - new Date(a.fecha_pago);
			}
			// Si no hay fechas, ordenamos por periodo
			return String(b.periodo || '').localeCompare(String(a.periodo || ''));
		});
		
		return { ok: true, items: rows };
	} catch (err) { return { ok: false, error: String(err) }; }
}

function upsertPago(payload) {
	try {
		var pagoId = String(payload.pago_id || '').trim();
		var contratoId = String(payload.contrato_id || '').trim();
		if (!contratoId) return { ok: false, error: 'contrato_id is required' };
		var sh = getSheet(CONFIG.SHEETS.PAGOS);
		var email = Session.getActiveUser().getEmail();
		var personaId = String(payload.persona_id || '').trim();
		if (!personaId && contratoId) {
			var contratoRow = findContratoById(contratoId);
			if (contratoRow) personaId = String(contratoRow.persona_id || '').trim();
		}
		var identificacion = resolvePersonaIdentificacion(personaId, payload) || '';
		if (pagoId) {
			var updates = {
				'persona_id': personaId || '',
				'Identificacion': identificacion,
				'Fecha_inicio': payload.Fecha_inicio ? parseDateISO(payload.Fecha_inicio) : '',
				'Fecha_fin': payload.Fecha_fin ? parseDateISO(payload.Fecha_fin) : '',
				'Valor_pago': payload.Valor_pago || payload.ValorPago || payload.Valor_pago || '',
				'Mes_fiscal': payload.Mes_fiscal || payload.MesFiscal || '',
				'Estado': formatEstadoForWrite(payload.Estado || ''),
				'Observaciones': payload.Observaciones || '',
				'Actualizado_en': new Date(),
				'Actualizado_por': email || ''
			};
			var ok = updateRowInSheetByHeader(CONFIG.SHEETS.PAGOS, 'pago_id', pagoId, updates);
			if (!ok) return { ok: false, error: 'Pago not found to update' };
			return { ok: true, pago_id: pagoId, updated: true };
		}
		var numeroCobro = nextNumeroCobro(contratoId);
		var newId = 'PG-' + uuidShort();
		var rowObj = {};
		rowObj['pago_id'] = newId;
		rowObj['contrato_id'] = contratoId;
		rowObj['persona_id'] = personaId || '';
		rowObj['Identificacion'] = identificacion;
		rowObj['Numero_cobro'] = numeroCobro;
		rowObj['Fecha_inicio'] = payload.Fecha_inicio ? parseDateISO(payload.Fecha_inicio) : '';
		rowObj['Fecha_fin'] = payload.Fecha_fin ? parseDateISO(payload.Fecha_fin) : '';
		rowObj['Fecha_radicacion'] = payload.Fecha_radicacion ? parseDateISO(payload.Fecha_radicacion) : '';
		rowObj['Valor_pago'] = payload.Valor_pago || payload.ValorPago || 0;
		rowObj['Mes_fiscal'] = payload.Mes_fiscal || payload.MesFiscal || '';
		rowObj['Estado'] = formatEstadoForWrite(payload.Estado || 'Borrador');
		rowObj['URL_PDF'] = payload.URL_PDF || '';
		rowObj['URL_Soportes'] = payload.URL_Soportes || '';
		rowObj['Observaciones'] = payload.Observaciones || '';
		rowObj['Creado_en'] = new Date();
		rowObj['Creado_por'] = email || '';
		appendRowToSheetByHeader(CONFIG.SHEETS.PAGOS, rowObj);
		return { ok: true, pago_id: newId, numero_cobro: numeroCobro };
	} catch (err) { return { ok: false, error: String(err) }; }
}

API_HANDLERS = API_HANDLERS || {};
API_HANDLERS['kpiPagos'] = handleKpiPagos;
API_HANDLERS['crearPagoBorrador'] = handleCrearPagoBorrador;
API_HANDLERS['getPagosByContrato'] = getPagosByContrato;
API_HANDLERS['getAllPagos'] = getAllPagos;
API_HANDLERS['listContratos'] = listContratos;
API_HANDLERS['upsertPago'] = upsertPago;
