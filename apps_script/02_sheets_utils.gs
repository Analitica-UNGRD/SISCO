/** Sheets utilities and helpers **/
function getSheet(name) {
  var ss = getSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) throw new Error('Sheet not found: ' + name);
  return sh;
}

function getHeaderMap(sheet) {
  var head = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0] || [];
  var map = {};
  for (var i = 0; i < head.length; i++) {
    var key = String(head[i] || '').trim();
    if (key) map[key] = i;
  }
  return map;
}

function sheetToObjects(sheet) {
  var lr = sheet.getLastRow();
  if (lr < 2) return [];
  var lc = sheet.getLastColumn();
  var values = sheet.getRange(1, 1, lr, lc).getValues();
  var head = values[0];
  var out = [];
  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    var obj = {};
    for (var c = 0; c < head.length; c++) {
      var key = String(head[c] || '').trim();
      if (!key) continue;
      obj[key] = row[c];
    }
    out.push(obj);
  }
  return out;
}

function uuidShort() { return Utilities.getUuid().slice(0, 8); }

function parseDateISO(s) {
  if (!s) return null;
  if (s instanceof Date) return s;
  var d = new Date(s);
  return isNaN(d) ? null : d;
}

// Nueva función para fechas sin zona horaria (solo fecha, sin hora)
function parseDateOnly(s) {
  if (!s) return null;
  if (s instanceof Date) return s;
  
  // Si viene en formato YYYY-MM-DD (del HTML input date)
  if (typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)) {
    var parts = s.split('-');
    var year = parseInt(parts[0], 10);
    var month = parseInt(parts[1], 10) - 1; // Los meses en JS van de 0-11
    var day = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }
  
  // Para otros formatos, usar parseo normal pero extraer solo la fecha
  var d = new Date(s);
  if (isNaN(d)) return null;
  
  // Crear nueva fecha solo con año, mes, día (sin zona horaria)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function _normHeaderKey(s) {
  var t = String(s || '');
  t = t.replace(/A3/g, 'o');
  try { t = t.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); } catch(e) {}
  return t.toLowerCase();
}

function appendRowToSheetByHeader(sheetName, obj) {
  var sh = getSheet(sheetName);
  var hdr = getHeaderMap(sh);
  var lc = sh.getLastColumn();
  var row = new Array(lc).fill('');
  for (var k in obj) {
    if (!obj.hasOwnProperty(k)) continue;
    var keyName = (k === 'IdentificaciA3n' || k === 'IdentificaciÃ³n') ? 'Identificacion'
                 : (k === 'Tipo_identificaciA3n' || k === 'Tipo_identificaciÃ³n') ? 'Tipo_identificacion'
                 : k;
    var idx = hdr[keyName];
    if (idx === undefined) {
      var nk = _normHeaderKey(k);
      for (var hk in hdr) {
        try {
          if (_normHeaderKey(hk) === nk) { idx = hdr[hk]; break; }
        } catch(e){}
      }
      if (idx === undefined) continue;
    }
    row[idx] = obj[k];
  }
  // Use LockService to make allocation+write atomic and avoid races with concurrent requests.
  var lock = LockService.getScriptLock();
  lock.waitLock(5000);
  try {
    var currentLastRow = sh.getLastRow() || 1;
    var target = Math.max(currentLastRow + 1, 2);
    try { Logger.log('appendRowToSheetByHeader: sheet=%s currentLastRow=%s target=%s keys=%s', sheetName, currentLastRow, target, Object.keys(obj || {}).join(',')); } catch(e){}
    sh.getRange(target, 1, 1, lc).setValues([row]);
    // Verify the write by checking new lastRow
    var newLastRow = sh.getLastRow();
    try { Logger.log('appendRowToSheetByHeader: after write, newLastRow=%s', newLastRow); } catch(e){}
  } finally {
    try { lock.releaseLock(); } catch(e){}
  }
}

function updateRowInSheetByHeader(sheetName, idColName, idValue, updates) {
  var sh = getSheet(sheetName);
  var lr = sh.getLastRow();
  if (lr < 2) return false;
  var lc = sh.getLastColumn();
  var hdr = getHeaderMap(sh);
  var idIdx = hdr[idColName];
  if (idIdx === undefined) return false;
  var values = sh.getRange(2, 1, lr - 1, lc).getValues();
  for (var r = 0; r < values.length; r++) {
    var cell = values[r][idIdx];
    if (String(cell || '') === String(idValue)) {
      for (var k in updates) {
        if (!updates.hasOwnProperty(k)) continue;
        var mapKey = k;
        var idx = hdr[mapKey];
        if (idx === undefined) {
          var nk = _normHeaderKey(mapKey);
          for (var hk in hdr) {
            try { if (_normHeaderKey(hk) === nk) { idx = hdr[hk]; break; } } catch(e){}
          }
        }
        if (idx !== undefined) values[r][idx] = updates[k];
      }
      sh.getRange(2 + r, 1, 1, lc).setValues([values[r]]);
      return true;
    }
  }
  return false;
}

function normalizeEstado(s){
  try{
    if(s === undefined || s === null) return '';
    var t = String(s || '').trim().toLowerCase();
    try{ t = t.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }catch(e){}
    t = t.replace(/\s+/g,' ').trim();
    return t;
  }catch(e){ return String(s||''); }
}

function formatEstadoForWrite(raw) {
  if (!raw) return '';
  var n = normalizeEstado(raw || '').toLowerCase();
  if (n === 'borrador') return 'Borrador';
  if (n === 'en revision' || n === 'en revisiOn' || n === 'en revisiÃ³n') return 'En revisión';
  if (n === 'aprobada' || n === 'aprobado') return 'Aprobada';
  return String(raw);
}
