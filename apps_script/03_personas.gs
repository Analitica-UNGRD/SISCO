/** Personas domain handlers **/
function handleListPersonas() {
  try {
    var sh = getSheet(CONFIG.SHEETS.PERSONAS);
    var data = sheetToObjects(sh);
    return { ok: true, items: data };
  } catch (err) { return { ok: false, error: String(err) }; }
}

function handleCrearPersona(payload) {
  try {
    var isDraft = !!payload._draft;
    var identificacion = String(payload.Identificación || payload.Identificacion || '').trim();
    var tipo = String(payload.Tipo_identificación || payload.Tipo_identificacion || '').trim();
    var nombre = String(payload.Nombre || '').trim();
    var correo = String(payload.Correo || '').trim();
    if (!isDraft && (!identificacion || !tipo || !nombre)) return { ok: false, error: 'Campos requeridos faltantes (Identificación/Tipo/Nombre).' };
    var sh = getSheet(CONFIG.SHEETS.PERSONAS);
    var existing = null;
    try{
      var rows = sheetToObjects(sh);
      for(var i=0;i<rows.length;i++){
        var r = rows[i];
        if (identificacion && String(r['Identificación']||r['Identificacion']||'').toString().trim() === identificacion){ existing = r; break; }
      }
    }catch(e){ }
    if(existing && existing.persona_id){ return { ok: true, persona_id: String(existing.persona_id || existing['persona_id']), existed: true }; }
    var personaId = 'P-' + uuidShort();
    var email = Session.getActiveUser().getEmail();
    var rowObj = {};
    rowObj['persona_id'] = personaId;
    rowObj['Identificación'] = identificacion;
    rowObj['Tipo_identificación'] = tipo;
    rowObj['Nombre'] = nombre;
    rowObj['Correo'] = correo || '';
    rowObj['Grupo_OAPI'] = payload.Grupo_OAPI || '';
    rowObj['Perfil'] = payload.Perfil || '';
    rowObj['Estado'] = payload.Estado || 'Activo';
    rowObj['Creado_en'] = new Date();
    rowObj['Creado_por'] = email || '';
    appendRowToSheetByHeader(CONFIG.SHEETS.PERSONAS, rowObj);
    return { ok: true, persona_id: personaId };
  } catch (err) { return { ok: false, error: String(err) }; }
}

function lookupPersonas(payload) {
  try {
    var q = String((payload && payload.q) || '').trim();
    var limit = Number(payload && payload.limit) || 10;
    var sh = getSheet(CONFIG.SHEETS.PERSONAS);
    var data = sheetToObjects(sh);
    if (!q) { var initial = data.slice(0, limit || 10); return { ok: true, items: initial }; }
    var nq = String(q).toLowerCase();
    var out = [];
    for (var i = 0; i < data.length; i++) {
      var p = data[i];
      var ident = String(p['Identificación'] || p['Identificacion'] || '').toString();
      var nombre = String(p['Nombre'] || '').toString();
      if ((ident || '').toLowerCase().indexOf(nq) !== -1 || (nombre || '').toLowerCase().indexOf(nq) !== -1) {
        out.push(p);
        if (out.length >= limit) break;
      }
    }
    return { ok: true, items: out };
  } catch (err) { return { ok: false, error: String(err) }; }
}

function getPersonaContext(payload) {
  try {
    var personaId = (payload && payload.persona_id) || null;
    var identificacion = (payload && (payload.Identificacion || payload.Identificación)) || null;
    if (!personaId && !identificacion) return { ok: false, error: 'persona_id or Identificacion required' };
    var shP = getSheet(CONFIG.SHEETS.PERSONAS);
    var personas = sheetToObjects(shP);
    var persona = null;
    for (var i = 0; i < personas.length; i++) {
      var r = personas[i];
      if (personaId && String(r.persona_id || r['persona_id'] || '') === String(personaId)) { persona = r; break; }
      if (identificacion && String(r['Identificación']||r['Identificacion']||'') === String(identificacion)) { persona = r; break; }
    }
    if (!persona) return { ok: false, error: 'Persona not found' };
    var contratos = getContratosByPersona({ persona_id: persona.persona_id }).items || [];
    var pagosAll = [];
    for (var j = 0; j < contratos.length; j++) {
      var c = contratos[j];
      var pagos = getPagosByContrato({ contrato_id: c.contrato_id }).items || [];
      for (var k = 0; k < pagos.length; k++) pagosAll.push(pagos[k]);
    }
    var shO = getSheet(CONFIG.SHEETS.OBLIGACIONES);
    var obligaciones = sheetToObjects(shO).filter(function(o){
      for(var t=0;t<contratos.length;t++) if(String(o.contrato_id||'') === String(contratos[t].contrato_id)) return true; return false;
    }).map(function(o){
      if(!o.persona_id || String(o.persona_id||'').trim() === ''){
        for(var t=0;t<contratos.length;t++){
          if(String(contratos[t].contrato_id||'') === String(o.contrato_id||'')){
            o.persona_id = contratos[t].persona_id || contratos[t]['persona_id'] || '';
            break;
          }
        }
      }
      return o;
    });
    var shPre = getSheet(CONFIG.SHEETS.PRECONTRACTUAL);
    var pre = sheetToObjects(shPre).filter(function(p){ return String(p.persona_id||'') === String(persona.persona_id); });
    return { ok: true, persona: persona, contratos: contratos, pagos: pagosAll, obligaciones: obligaciones, precontractual: pre };
  } catch (err) { return { ok: false, error: String(err) }; }
}

function upsertPersona(payload) {
  try {
    var identificacion = String(payload.Identificacion || payload.Identificación || payload.IdentificaciA3n || '').trim();
    var tipo = String(payload.Tipo_identificacion || payload.Tipo_identificación || payload.Tipo_identificaciA3n || '').trim();
    var nombre = String(payload.Nombre || '').trim();
    if (!identificacion || !tipo || !nombre) return { ok: false, error: 'Identificacion, Tipo_identificacion and Nombre are required' };
    var sh = getSheet(CONFIG.SHEETS.PERSONAS);
    var rows = sheetToObjects(sh);
    var existing = null;
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      var rIdent = String(r['Identificación']||r['Identificacion']||'').toString().trim();
      if (rIdent === identificacion) { existing = r; break; }
    }
    var email = Session.getActiveUser().getEmail();
    if (existing && (existing.persona_id || existing['persona_id'])) {
      var pid = existing.persona_id || existing['persona_id'];
      var updates = {
        'Tipo_identificación': tipo,
        'Nombre': nombre,
        'Correo': payload.Correo || payload.Correo || existing.Correo || existing['Correo'] || '',
        'Grupo_OAPI': payload.Grupo_OAPI || existing.Grupo_OAPI || '',
        'Perfil': payload.Perfil || existing.Perfil || '',
        'Estado': payload.Estado || existing.Estado || '',
        'Actualizado_en': new Date(),
        'Actualizado_por': email || ''
      };
      updateRowInSheetByHeader(CONFIG.SHEETS.PERSONAS, 'persona_id', pid, updates);
      return { ok: true, persona_id: pid, updated: true };
    }
    var personaId = 'P-' + uuidShort();
    var rowObj = {};
    rowObj['persona_id'] = personaId;
    rowObj['Identificación'] = identificacion;
    rowObj['Tipo_identificación'] = tipo;
    rowObj['Nombre'] = nombre;
    rowObj['Correo'] = payload.Correo || '';
    rowObj['Grupo_OAPI'] = payload.Grupo_OAPI || '';
    rowObj['Perfil'] = payload.Perfil || '';
    rowObj['Estado'] = payload.Estado || 'Activo';
    rowObj['Creado_en'] = new Date();
    rowObj['Creado_por'] = email || '';
    appendRowToSheetByHeader(CONFIG.SHEETS.PERSONAS, rowObj);
    return { ok: true, persona_id: personaId };
  } catch (err) { return { ok: false, error: String(err) }; }
}

// Register handlers in API map
API_HANDLERS = API_HANDLERS || {};
API_HANDLERS['listPersonas'] = handleListPersonas;
API_HANDLERS['crearPersona'] = handleCrearPersona;
API_HANDLERS['lookupPersonas'] = lookupPersonas;
API_HANDLERS['getPersonaContext'] = getPersonaContext;
API_HANDLERS['upsertPersona'] = upsertPersona;
