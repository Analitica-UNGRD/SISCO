# Apps Script refactor

Se dividió el archivo monolítico `code.gs` en módulos más pequeños para mejorar mantenibilidad.

Archivos creados:
- `00_config.gs` - configuración y cache de Spreadsheet
- `01_router.gs` - router genérico y `buildJsonOutput`
- `02_sheets_utils.gs` - helpers para hojas (getSheet, headers, append/update)
- `03_personas.gs` - handlers relacionados a personas (crear, upsert, lookup, list, getPersonaContext)
- `04_contratos.gs` - placeholder (handlers de contratos)
- `05_pagos.gs` - placeholder (handlers de pagos)
- `06_obligaciones.gs` - placeholder (handlers de obligaciones)
- `07_precontractual.gs` - placeholder (precontractual handlers, futura implementación de PRE_CATALOGO)
- `08_roles_and_auth.gs` - placeholder (roles, login, session)
- `code_backup.gs` - copia de seguridad del `code.gs` original

Cómo probar localmente en Apps Script editor:
1. Subir estos archivos al proyecto de Apps Script.
2. Abrir `01_router.gs` y desplegar la función `doPost` (usar el deploy o probar con el simulador de Apps Script).
3. Enviar POST a la URL del Web App con body JSON: { "path": "listPersonas" }

Notas:
- Se mantuvieron las firmas públicas (paths) en los placeholders. Los handlers reales del dominio deben implementarse en los archivos correspondientes; `03_personas.gs` contiene la implementación original trasladada.
- Después de verificar que todo funciona, implementar la lógica adicional en `07_precontractual.gs` para `PRE_CATALOGO` y cálculos de duración.
