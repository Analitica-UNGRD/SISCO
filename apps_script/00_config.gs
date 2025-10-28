/** CONFIG **/
var CONFIG = {
  SPREADSHEET_ID: '1AQkkOjHMbHUgZtE3CXfgqlX-lQvCbqvT5fCVuI7mVK0',
  SHEETS: {
    PERSONAS: 'Personas',
    CONTRATOS: 'Contratos',
    PAGOS: 'Pagos',
    OBLIGACIONES: 'Obligaciones',
    MODIFICACIONES: 'Modificaciones',
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
