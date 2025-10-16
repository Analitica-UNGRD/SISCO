/** CONFIG **/
var CONFIG = {
  // If SPREADSHEET_ID is present in Script Properties, prefer it; fallback to the legacy hardcoded value.
  SPREADSHEET_ID: (function(){
    try {
      var v = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      if (v && String(v).trim()) return v;
    } catch (e) {}
    return '1AQkkOjHMbHUgZtE3CXfgqlX-lQvCbqvT5fCVuI7mVK0';
  })(),
  SHEETS: {
    PERSONAS: 'Personas',
    CONTRATOS: 'Contratos',
    PAGOS: 'Pagos',
    OBLIGACIONES: 'Obligaciones',
    PRECONTRACTUAL: 'Precontractual',
    ROLES: 'Roles',
    PRE_CATALOGO: 'PRE_CATALOGO'
  }
};

var _SPREADSHEET_CACHE = null;
function getSpreadsheet() {
  if (_SPREADSHEET_CACHE) return _SPREADSHEET_CACHE;
  _SPREADSHEET_CACHE = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  return _SPREADSHEET_CACHE;
}
