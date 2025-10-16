# SISCO – Seguridad y Acceso a Datos

Este proyecto usa el flujo Frontend → Proxy (`/api`) → Apps Script (Web App) → Google Sheets.

Este PR introduce endurecimiento de seguridad sin romper el uso actual del frontend.

## Cambios clave

- Apps Script `doPost` ahora exige un `API_TOKEN` (Propiedades del Script), valida tamaño de payload y mantiene el contrato con `API_HANDLERS`.
- El proxy `/api` (Vercel y `server.js` en desarrollo):
  - Requiere sesión del usuario (placeholder, reemplazar por tu auth real).
  - Inyecta `API_TOKEN` al request hacia Apps Script.
  - Envía/recibe `application/json` y mapea errores a códigos HTTP (403, 400, 502).
- Se removieron URLs reales de `exec` del cliente y se restringieron encabezados CORS.

## Configuración requerida

1) Apps Script (Editor → Configuración del proyecto → Propiedades del script):

- `API_TOKEN` = el valor secreto compartido.
- Opcional: `SPREADSHEET_ID` = ID de tu Google Sheet (si quieres evitar el hardcode).

Despliega el Web App “Ejecutar como: Yo”. El acceso puede ser “Cualquier usuario” si usas token, o “Usuarios de mi dominio” si vas a exigir identidad de Google.

2) Variables de entorno del proxy

En Vercel (o plataforma equivalente) define Environment Variables:

- `TARGET_URL` = URL de `exec` del Web App de Apps Script.
- `API_TOKEN`  = el mismo token que pusiste en Apps Script.
- Opcional: `ALLOWED_ORIGINS` = lista separada por comas con orígenes permitidos.
- Opcional: `DISABLE_SESSION_CHECK=1` para desactivar el requisito de sesión mientras integras tu autenticación real.

Para desarrollo local crea `.env.local` (gitignored) con:

```
TARGET_URL="https://script.google.com/macros/s/AKfycbw50tUdacciGu6UVBEbtRvFjrH7RKL77F6nXF0TYidtsur5QcszRtlYJkG4vLUsabAI8g/exec"
API_TOKEN="__TU_TOKEN__"
DISABLE_SESSION_CHECK="1"
```

Arranca el proxy local con `node server.js` y consume `http://localhost:3000/api` desde el frontend.

## Cómo funciona la autenticación

- Cliente → Proxy `/api`: el proxy exige sesión (placeholder). Sustituye la comprobación por tu middleware real (JWT/cookie/headers).
- Proxy → Apps Script: el proxy añade `token` (API_TOKEN) al body JSON. Apps Script lo valida y rechaza si no coincide.

Notas:

- Apps Script no permite establecer códigos HTTP distintos a 200; por eso el proxy traduce las respuestas `{ ok:false, error:'Forbidden' }` a HTTP 403 para el cliente.

## Pruebas rápidas

- Sin sesión: `curl -i -X POST https://TU_APP/api -H "Content-Type: application/json" -d '{}'` → 401.
- Con sesión simulada (dev): `curl -i -X POST http://localhost:3000/api -H "Content-Type: application/json" -H "Cookie: session=ok" -d '{"path":"ping","payload":{}}'` → JSON ok.
- Sin token (prueba interna): si quitas temporalmente la inyección del token en el proxy, Apps Script devolverá `{ ok:false, error:'Forbidden' }` y el proxy lo mapeará a 403.

## Rotación de token

1) Genera un token nuevo y actualízalo en Apps Script (`API_TOKEN`).
2) Actualiza la variable `API_TOKEN` en Vercel y/o `.env.local`.
3) Re-despliega el proxy. No es necesario recompilar el cliente.
