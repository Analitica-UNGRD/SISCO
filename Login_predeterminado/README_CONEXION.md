README_CONEXION
=================

Propósito
--------
Este documento explica, paso a paso, cómo este proyecto conecta el frontend con el "backend" basado en Google Sheets y Google Apps Script. Está escrito para que otro agente (por ejemplo, Copilot) o un desarrollador pueda replicar la misma metodología en otro proyecto y resolver problemas comunes.

Resumen de arquitectura
-----------------------
- Frontend: archivos estáticos (HTML/CSS/JS) que se sirven desde el proyecto. El frontend hace peticiones HTTP al endpoint de Apps Script para leer/escribir datos.
- Backend ("Sheets as DB"): Google Sheets actúa como almacenamiento principal.
- Apps Script: un script de Google Apps Script expuesto como Web App (ej. `EXEC_URL`) que recibe peticiones POST con cuerpo JSON describiendo `path` y `payload`. El Apps Script ejecuta operaciones sobre la Google Sheet y devuelve JSON.
- Proxy local (opcional): `public/api-proxy.js` o un proxy local puede servir para desarrollo (evita CORS y facilita pruebas locales).

Principales puntos de integración
--------------------------------
1. URL del Apps Script (Web App) — `APP_CONFIG.BASE_URL` (archivo: `src/lib/config.js`)
   - Este valor se resuelve en `config.js` y es usado por `src/lib/auth.js` y otros módulos que hacen fetch.
   - Para conectar, reemplaza `APP_CONFIG.BASE_URL` por la URL de la implementación de tu Apps Script.

2. ID/URL del Spreadsheet — usado por el Apps Script
   - El Apps Script que ejecuta la lógica del backend necesita conocer el ID o URL del Spreadsheet.
   - En el proyecto Apps Script (editor), suele haber una constante o una propiedad de configuración donde debes colocar el ID del spreadsheet.

3. Permisos y propietarios
   - La hoja debe ser compartida con la cuenta que ejecuta el Apps Script (owner o editor), o la Web App debe estar desplegada con un nivel de acceso compatible (ejecutar como: propietario; quién tiene acceso: cualquiera, usuarios de la organización, etc.).
   - Si cambias de usuario propietario, actualiza la implementación y permisos de la Web App, y vuelve a desplegar.

Archivos clave que revisar/editar
--------------------------------
- Frontend:
  - `src/lib/config.js` — determina `APP_CONFIG.BASE_URL`. Actualiza si cambias la URL del web app o si usas un proxy.
  - `src/lib/auth.js` — ejemplo de uso de `APP_CONFIG.BASE_URL` para `login`.
  - Cualquier archivo que haga `fetch(APP_CONFIG.BASE_URL, { method:'POST', body: JSON.stringify({ path, payload }) })`.

- Apps Script (en el proyecto de Apps Script):
  - Revisa el archivo principal (por ejemplo `Code.gs` o `00_config.gs` si usas el repositorio del backup) y localiza variables como `SPREADSHEET_ID` o `SHEET_URL`.
  - Identifica la función doPost(e) que recibe las peticiones. Asegúrate de que devuelva JSON con `{ ok: true/false, ... }`.

Pasos para desplegar y conectar (detalle)
-----------------------------------------
1. Obtener las URLs/IDs
   - Spreadsheet: en Google Sheets, abre la hoja y copia el ID (parte entre `/d/` y `/edit` en la URL).
   - Apps Script Web App URL: en el editor de Apps Script, despliega una nueva versión (Deploy > New deployment > tipo: Web app) y copia la URL de ejecución (EXEC_URL).

2. Configurar Apps Script
   - Abre tu proyecto Apps Script.
   - Actualiza la constante `SPREADSHEET_ID` o la configuración con el ID que copiaste.
   - Verifica que `doPost(e)` maneje correctamente `JSON.parse(e.postData.contents)` y devuelva un objeto con `ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON)`.
   - Guardar y desplegar (re-deploy) la versión.

3. Configurar permisos
   - En el deployment, elige: "Execute as: Me (el propietario)" y "Who has access: Anyone" o la opción que se ajuste a tu seguridad.
   - Si eliges acceso restringido (solo usuarios de G Suite organization), asegúrate que el frontend sea usado por cuentas permitidas.

4. Actualizar frontend
   - Edita `src/lib/config.js` y coloca la `BASE_URL` por `EXEC_URL` (o establece `window.APP_CONFIG_OVERRIDE.BASE_URL` antes de cargar el bundle).
   - Si usas un proxy local para desarrollo, configura `DEFAULT_DEV_PROXY` o usa `window.APP_CONFIG_OVERRIDE`.

5. Pruebas rápidas
   - Desde el navegador (con frontend), intenta un login o una operación que haga fetch al backend. Abre la consola de red (DevTools) y valida:
     - Request POST a la URL del Apps Script.
     - Cuerpo: JSON con `{ path, payload }`.
     - Respuesta: JSON con `ok:true` o `ok:false`.
   - Si la petición falla con CORS o 403, revisa las políticas de despliegue y permisos.

Sugerencias para debugging
--------------------------
- Problemas comunes:
  - 403 / PERMISSION_DENIED: La Web App no permite ejecución por ese usuario. Revisa "Who has access" y el propietario.
  - CORS / Network blocked: Apps Script Web App no siempre activa CORS; si hay problemas, usa un proxy local (`public/api-proxy.js`) en desarrollo o configura el Web App para permitir llamadas desde web.
  - Error en body parsing: Revisa `doPost` y que `e.postData.contents` sea parseado correctamente.
  - Respuestas no JSON: Asegúrate de que `doPost` siempre devuelva JSON con MimeType.JSON.

Cómo documentar los cambios para otro agente (Copilot)
-----------------------------------------------------
Cuando pases esto a otro agente, incluye:
- Nueva `EXEC_URL` del Web App y el `SPREADSHEET_ID`.
- Indica si la Web App se despliega "Execute as: Owner" y el nivel de acceso.
- Proporciona un ejemplo de petición POST (cuerpo JSON) y una respuesta esperada.
- Indica si existe un proxy local en `public/api-proxy.js` y si debe usarse.

Ejemplo mínimo que debes proporcionar al agente
----------------------------------------------
- EXEC_URL: https://script.google.com/macros/s/AKfycbx.../exec
- SPREADSHEET_ID: 1aBcDeFgHiJkLmNoPqRstUvWxYz1234567890
- Example POST payload:
  { "path": "login", "payload": { "email":"user@domain.gov.co", "password":"secret" } }
- Example success response:
  { "ok": true, "email": "user@domain.gov.co", "rol": "contratista" }

Acciones opcionales que puedo realizar por ti
--------------------------------------------
- Actualizar `src/lib/config.js` con la nueva `EXEC_URL` y confirmar referencias.
- Crear un pequeño script de prueba (`scripts/test-backend.js`) que haga requests al Apps Script y valide la respuesta.
- Generar un `demo_connect.html` en la carpeta `Login_predeterminado` que cargue la configuración y permita probar `login` manualmente.

Dime cuál de las acciones opcionales quieres que haga ahora (actualizar config, crear demo, o probar conexión).