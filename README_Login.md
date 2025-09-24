# Login Component - Reusable HTML/CSS/JS

Este repositorio contiene un componente de login modular, visualmente trabajado, y listo para integrarse en otros proyectos estáticos o con backend.

Nota: se ha añadido una carpeta `login-component/` con una copia autocontenida del componente para facilitar su extracción e integración en otros proyectos.

Contenido
- `Login.html` - página ejemplo que contiene el markup del login y el fondo animado.
- `login.css` - estilos unificados (fondo animado + estilos del formulario).
- `login-page.js` - lógica de la página (validaciones y comportamiento del formulario).
- `auth.js` - lógica de autenticación demo; reemplazar por llamadas reales al backend.
- `auth-system.js` - redirección si ya existe sesión.
- `api.js` - helper para llamadas POST (usa `APP_CONFIG.BASE_URL`).
- `config.js` - lugar para configurar `APP_CONFIG.BASE_URL`.
  
Roles sheet format (Apps Script login)
 - Hoja: `Roles` (tal como está en el Spreadsheet configurado en `code.gs`)
 - Columnas (puede usar encabezados en la fila 1 o usar A/B/C sin encabezado):
	 - Columna A / header `email`: correo del usuario
	 - Columna B / header `password`: contraseña en texto plano (recomendado usar hashes en producción)
	 - Columna C / header `rol`: rol asignado (`admin`, `revisor`, `contratista`)

Configurar la API
- Abra `src/lib/config.js` y ponga la URL desplegada de su Apps Script en `APP_CONFIG.BASE_URL`.
- Ejemplo:

```js
export const APP_CONFIG = { BASE_URL: 'https://script.google.com/macros/s/DEPLOY_ID/exec' };
```

Notas de seguridad
- Este ejemplo guarda contraseñas en texto plano en la hoja. Para producción, guarde hashes y valide en el servidor.
- Asegure el deployment de Apps Script con permisos adecuados y sólo permita llamadas desde su frontend mediante CORS/headers y checks adicionales.
- `ui.js` - helper mínimo para mostrar mensajes (puedes sustituir por tu toast preferido).
- `loader.js` - helper para wrappers de carga (`showLoaderDuring`).
- `core.css` - utilidades pequeñas (errores/espaciados).
- `Logo_gris.png` - logo por defecto (reemplazar si quieres).
- `Login_UNGRD.png` - imagen/ilustración del panel derecho (debe conservar este nombre si quieres usar la integración tal cual).

Quick integration
1. Copia los archivos listados arriba a la carpeta de tu proyecto donde sirves recursos estáticos.
2. Incluye la hoja de estilos y los scripts en la página donde vayas a usar el login, en este orden recomendado:

	- `<link rel="stylesheet" href="path/to/login.css">`
	- `<script src="path/to/config.js"></script>` (configura `APP_CONFIG.BASE_URL` allí)
	- `<script src="path/to/ui.js"></script>`
	- `<script src="path/to/api.js"></script>`
	- `<script src="path/to/auth.js"></script>`
	- `<script src="path/to/auth-system.js"></script>`
	- `<script src="path/to/loader.js"></script>`
	- `<script src="path/to/login-page.js"></script>`

3. Assets: coloca `Login_UNGRD.png` y `Logo_gris.png` en el mismo folder o actualiza las rutas en `Login.html`/`login.css`.

Customization notes
- Autenticación: `auth.js` actualmente contiene una implementación demo que valida dominio e inventa un token. Reemplaza `Auth.login` por una llamada real a tu backend/API. Usa `Api.post` o crea tus propios endpoints.
- API config: edita `config.js` para ajustar `APP_CONFIG.BASE_URL`.
- Estilos: `login.css` contiene todo el CSS del fondo y del formulario. Puedes extraer variables `:root` hacia tu tema global si lo prefieres.
- Fonts: el componente usa `Segoe UI` como tipografía principal (sistema). Si necesitas una fuente web, añade la import en `Login.html` o en tu layout global.
- Mobile: el CSS contiene una sección `@media (max-width: 768px)` que simplifica el fondo y desactiva el hover del panel.

Files removed (limpieza)
- `background.css`, `background.html`, `loader.css` — se eliminaron porque su contenido ya fue integrado o eran stubs.

Security & production checklist
- No incluyas credenciales ni secretos en `config.js`. Usa variables de entorno o sistemas de configuración en tu backend.
- Reemplaza la implementación demo en `auth.js` por llamadas autenticadas al servidor. Implementa control de errores y sanitización en el backend.
- Si vas a servir desde HTTPS (recomendado), asegúrate de que `APP_CONFIG.BASE_URL` use `https://`.

Developer tips
- Para mantener este componente como paquete reutilizable, mueve `login.css`, `login-page.js`, `auth.js`, `api.js` y `ui.js` a una carpeta `login-component/` y actualiza las rutas.
- Considera publicar un pequeño NPM package o un submódulo Git si lo vas a usar en varios proyectos.

Soporte
Si quieres, puedo:
- Extraer el componente a una carpeta `login-component/` y crear un README con pasos de instalación (npm/zip).
- Añadir tests unitarios simples para la validación de email y form.

---
Fecha de generación: 2025-08-25

