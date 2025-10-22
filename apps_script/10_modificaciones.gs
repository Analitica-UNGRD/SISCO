/** Modificaciones handlers **/
function _coerceBooleanFlag(value) {
  if (value === true) return true;
  if (value === false) return false;
  if (value === null || value === undefined) return false;
  if (typeof value === 'number') return value !== 0;
  var str = String(value).trim().toLowerCase();
  if (!str) return false;
  if (str === 'true' || str === '1' || str === 'si' || str === 'sí' || str === 'yes' || str === 'y' || str === 'x' || str === 'on') return true;
  if (str === 'false' || str === '0' || str === 'no' || str === 'n' || str === 'off') return false;
  return false;
}

function _coerceNumberValue(value) {
  if (value === null || value === '' || value === undefined) return '';
  var num = Number(value);
  return isNaN(num) ? '' : num;
}

function _coerceDateValue(value) {
  if (!value) return '';
  var dt = parseDateOnly(value);
  return dt ? dt : value;
}

function _nextModSequenceForContrato(contratoId) {
  if (!contratoId) return 1;
  try {
    var sh = getSheet(CONFIG.SHEETS.MODIFICACIONES);
    var rows = sheetToObjects(sh);
    var maxSeq = 0;
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i] || {};
      if (String(row.contrato_id || '').trim() !== String(contratoId)) continue;
      var seq = Number(row.secuencia_mod || row.secuencia || row.Secuencia_mod || 0);
      if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
    }
    return maxSeq + 1;
  } catch (err) {
    try { Logger.log('Error computing next sequence for contrato %s: %s', contratoId, String(err)); } catch (e) {}
    return 1;
  }
}

function _normalizeModPayload(payload) {
  payload = payload || {};
  var contratoId = String(payload.contrato_id || '').trim();
  if (!contratoId) throw new Error('contrato_id es requerido.');

  var personaId = String(payload.persona_id || '').trim();
  if (!personaId) {
    var contrato = findContratoById(contratoId);
    if (contrato) {
      personaId = String(contrato.persona_id || contrato.personaId || '').trim();
    }
  }

  var identificacion = resolvePersonaIdentificacion(personaId, payload) || '';
  var seqRaw = payload.secuencia_mod;
  var seq = Number(seqRaw);
  if (!seq) {
    seq = _nextModSequenceForContrato(contratoId);
  }

  return {
    contratoId: contratoId,
    personaId: personaId,
    identificacion: identificacion,
    secuencia: seq
  };
}

function _buildModRow(payload, baseCtx) {
  payload = payload || {};
  baseCtx = baseCtx || {};

  return {
    modificacion_id: payload.modificacion_id || baseCtx.modificacionId || '',
    contrato_id: baseCtx.contratoId,
    persona_id: baseCtx.personaId || '',
    Identificacion: baseCtx.identificacion || '',
    secuencia_mod: baseCtx.secuencia,
    tipo_modificacion: payload.tipo_modificacion || '',
    numero_acto: payload.numero_acto || '',
    fecha_suscripcion: _coerceDateValue(payload.fecha_suscripcion),
    fecha_efecto_desde: _coerceDateValue(payload.fecha_efecto_desde),
    fecha_efecto_hasta: _coerceDateValue(payload.fecha_efecto_hasta),
    impacta_plazo: _coerceBooleanFlag(payload.impacta_plazo),
    dias_prorroga: _coerceNumberValue(payload.dias_prorroga),
    meses_prorroga: _coerceNumberValue(payload.meses_prorroga),
    impacta_valor: _coerceBooleanFlag(payload.impacta_valor),
    valor_adicionado: _coerceNumberValue(payload.valor_adicionado),
    valor_disminuido: _coerceNumberValue(payload.valor_disminuido),
    impacta_supervisor: _coerceBooleanFlag(payload.impacta_supervisor),
    supervisor_nuevo: payload.supervisor_nuevo || '',
    impacta_objeto: _coerceBooleanFlag(payload.impacta_objeto),
    objeto_nuevo: payload.objeto_nuevo || '',
    observaciones: payload.observaciones || '',
    soporte_URL: payload.soporte_URL || '',
    carpeta_drive_url: payload.carpeta_drive_url || '',
    numero_CDP_adicional: payload.numero_CDP_adicional || '',
    fecha_CDP_adicional: _coerceDateValue(payload.fecha_CDP_adicional),
    numero_RC_adicional: payload.numero_RC_adicional || '',
    fecha_RC_adicional: _coerceDateValue(payload.fecha_RC_adicional),
    estado_modificacion: payload.estado_modificacion || '',
    creado_por: payload.creado_por || '',
    creado_en: payload.creado_en || '',
    modificado_por: payload.modificado_por || '',
    modificado_en: payload.modificado_en || ''
  };
}

function upsertModificacion(payload) {
  try {
    payload = payload || {};
    var ctx = _normalizeModPayload(payload);
    var modificacionId = String(payload.modificacion_id || '').trim();
    var email = '';
    try { email = Session.getActiveUser().getEmail(); } catch (err) {}
    var now = new Date();

    var rowObj = _buildModRow(payload, {
      contratoId: ctx.contratoId,
      personaId: ctx.personaId,
      identificacion: ctx.identificacion,
      secuencia: ctx.secuencia,
      modificacionId: modificacionId
    });

    if (!modificacionId) {
      modificacionId = 'M-' + uuidShort();
      rowObj.modificacion_id = modificacionId;
      rowObj.creado_por = email || '';
      rowObj.creado_en = now;
      rowObj.modificado_por = '';
      rowObj.modificado_en = '';
      appendRowToSheetByHeader(CONFIG.SHEETS.MODIFICACIONES, rowObj);
    } else {
      rowObj.modificado_por = email || '';
      rowObj.modificado_en = now;
      // Avoid overriding creation metadata by deleting them from updates if empty
      delete rowObj.creado_por;
      delete rowObj.creado_en;
      var ok = updateRowInSheetByHeader(CONFIG.SHEETS.MODIFICACIONES, 'modificacion_id', modificacionId, rowObj);
      if (!ok) return { ok: false, error: 'Modificación no encontrada para actualizar.' };
    }

    var responseData = Object.assign({}, rowObj, {
      modificacion_id: modificacionId,
      contrato_id: ctx.contratoId,
      persona_id: ctx.personaId,
      Identificacion: ctx.identificacion,
      secuencia_mod: ctx.secuencia
    });

    // Ensure date objects serialized for response
    var dateFields = ['fecha_suscripcion','fecha_efecto_desde','fecha_efecto_hasta','fecha_CDP_adicional','fecha_RC_adicional','creado_en','modificado_en'];
    for (var i = 0; i < dateFields.length; i++) {
      var key = dateFields[i];
      if (responseData[key] instanceof Date) {
        responseData[key] = responseData[key].toISOString();
      }
    }

    return { ok: true, modificacion_id: modificacionId, data: responseData };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

function handleCrearModificacion(payload) {
  return upsertModificacion(payload || {});
}

function getModificacionesByContrato(payload) {
  try {
    payload = payload || {};
    var contratoId = String(payload.contrato_id || '').trim();
    if (!contratoId) return { ok: false, error: 'contrato_id requerido' };
    var sh = getSheet(CONFIG.SHEETS.MODIFICACIONES);
    var rows = sheetToObjects(sh).filter(function(r) {
      return String(r.contrato_id || '').trim() === contratoId;
    });
    rows.sort(function(a, b) {
      var sa = Number(a.secuencia_mod || a.secuencia || 0);
      var sb = Number(b.secuencia_mod || b.secuencia || 0);
      if (isNaN(sa)) sa = 0;
      if (isNaN(sb)) sb = 0;
      return sa - sb;
    });
    return { ok: true, items: rows };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

function deleteModificacion(payload) {
  try {
    payload = payload || {};
    var modificacionId = String(payload.modificacion_id || '').trim();
    if (!modificacionId) return { ok: false, error: 'modificacion_id requerido' };
    var sh = getSheet(CONFIG.SHEETS.MODIFICACIONES);
    var hdr = getHeaderMap(sh);
    var idIdx = hdr['modificacion_id'];
    if (idIdx === undefined) return { ok: false, error: 'Columna modificacion_id no encontrada' };
    var lr = sh.getLastRow();
    if (lr < 2) return { ok: false, error: 'No hay registros en modificaciones' };
    var values = sh.getRange(2, 1, lr - 1, sh.getLastColumn()).getValues();
    for (var r = 0; r < values.length; r++) {
      if (String(values[r][idIdx] || '') === modificacionId) {
        sh.deleteRow(r + 2);
        return { ok: true, deleted: true };
      }
    }
    return { ok: false, error: 'Modificación no encontrada' };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

API_HANDLERS = API_HANDLERS || {};
API_HANDLERS['crearModificacion'] = handleCrearModificacion;
API_HANDLERS['upsertModificacion'] = upsertModificacion;
API_HANDLERS['getModificacionesByContrato'] = getModificacionesByContrato;
API_HANDLERS['deleteModificacion'] = deleteModificacion;
