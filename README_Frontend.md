# Seguimiento de Contratistas - Frontend

## Descripción General
Este componente implementa la interfaz de usuario del sistema de gestión contractual. El frontend es un sitio web HTML/CSS/JavaScript modular que consume la API JSON proporcionada por el backend de Google Apps Script.

La interfaz permite:
- Autenticación de usuarios con diferentes roles
- Gestión de contratistas y sus datos personales
- Administración de contratos y sus detalles
- Control de pagos (cuentas de cobro)
- Seguimiento de obligaciones contractuales
- Documentación de procesos precontractuales

## Arquitectura

### Estructura de Directorios

```
src/
|-- assets/                 # Recursos gráficos
|   |-- Login_UNGRD.png     # Imagen de login
|   +-- Logo_gris.png       # Logo de la aplicación
|
|-- lib/                    # Bibliotecas compartidas
|   |-- auth-system.js      # Sistema de autenticación automática
|   |-- auth.js             # Funciones de autenticación
|   |-- config.js           # Configuraciones del proyecto
|   |-- loader.js           # Utilidades de carga
|   +-- ui.js               # Utilidades de interfaz de usuario
|
|-- pages/                  # Páginas de la aplicación
|   |-- admin/              # Módulo de administración
|   |   |-- components/     # Componentes HTML para el admin
|   |   |   |-- admin-contratos.html
|   |   |   |-- admin-datos-basicos.html
|   |   |   |-- admin-obligaciones.html
|   |   |   |-- admin-pagos.html
|   |   |   |-- admin-precontractual.html
|   |   |   |-- admin-preview.html
|   |   |   +-- admin-roles.html
|   |   |
|   |   |-- scripts/        # Scripts JavaScript del admin
|   |   |   |-- admin-main.js         # Coordinador principal
|   |   |   |-- admin-datos-basicos.js
|   |   |   |-- admin-contratos.js
|   |   |   |-- admin-obligaciones.js
|   |   |   |-- admin-pagos.js
|   |   |   +-- admin-precontractual.js
|   |   |
|   |   |-- styles/         # Estilos CSS del admin
|   |   |   |-- admin-base.css
|   |   |   |-- admin-components.css
|   |   |   +-- admin-responsive.css
|   |   |
|   |   |-- admin.html      # Página principal del admin
|   |   +-- README.md       # Documentación específica del módulo admin
|   |
|   |-- contratistas.html   # Página de gestión de contratistas
|   |-- dashboard.html      # Panel principal
|   |-- login.html          # Página de inicio de sesión
|   +-- personas.html       # Página de gestión de personas
|
|-- pages-scripts/          # Scripts para páginas principales
|   |-- contratistas.js     # Lógica para contratistas
|   |-- dashboard.js        # Lógica para dashboard
|   |-- login-page.js       # Lógica para login
|   |-- personas.js         # Lógica para personas
|   |-- sidebar-component.js # Componente de barra lateral
|   +-- sidebar.js          # Lógica para barra lateral
|
+-- styles/                 # Estilos globales
    |-- dashboard.css       # Estilos para dashboard
    |-- login.css           # Estilos para login
    |-- personas.css        # Estilos para página de personas
    +-- sidebar.css         # Estilos para barra lateral
```

## Componentes Principales

### 1. Sistema de Autenticación
- **Archivos**: `lib/auth.js`, `lib/auth-system.js`
- **Descripción**: Gestiona la autenticación de usuarios, validación de credenciales, y control de sesiones.
- **Características**: Validación de dominio institucional, persistencia de sesión en localStorage, redirección automática.

### 2. Dashboard
- **Archivos**: `pages/dashboard.html`, `pages-scripts/dashboard.js`
- **Descripción**: Panel principal con KPIs, alertas y gráficos de actividad.
- **Características**: Resumen de contratos activos, obligaciones pendientes, pagos en trámite, visualización gráfica.

### 3. Módulo Admin
- **Coordinador**: `pages/admin/scripts/admin-main.js`
- **Descripción**: Sistema modular para administración detallada de datos.
- **Componentes**:
  - **Datos Básicos**: Gestión de información personal de contratistas
  - **Contratos**: Administración de contratos con cálculos automáticos
  - **Obligaciones**: Seguimiento de obligaciones por período
  - **Pagos**: Control de cuentas de cobro con estados y flujos de validación
  - **Precontractual**: Matriz de documentos y requisitos precontractuales
  - **Roles**: Gestión de permisos de usuario

### 4. Sistema de Navegación
- **Archivos**: `pages-scripts/sidebar.js`, `pages-scripts/sidebar-component.js`
- **Descripción**: Barra lateral desplegable con navegación entre módulos.
- **Características**: Expansión/colapso automático, función "pin" para fijado, resaltado de sección activa.

## Características Técnicas

### Sistema Modular
- Arquitectura basada en componentes independientes
- Carga dinámica de secciones según necesidad
- Separación clara de responsabilidades (HTML/CSS/JS)

### Comunicación con Backend
- Uso de `fetch` para llamadas a la API
- Formato JSON para intercambio de datos
- Manejo centralizado de errores y notificaciones

### Interfaz de Usuario
- Diseño responsive adaptable a diferentes dispositivos
- Componentes reutilizables como la barra lateral
- Sistema de notificaciones para retroalimentación al usuario
- Validaciones de formularios en el lado del cliente

### Almacenamiento Local
- Uso de localStorage para persistencia de sesión
- Gestión de estado mediante clases controladoras
- Caché de datos para reducir llamadas a la API

## Integración con Backend

El frontend se conecta al backend a través de la URL configurada en `src/lib/config.js`:

```javascript
export const APP_CONFIG = {
  BASE_URL: 'https://script.google.com/macros/s/DEPLOYMENT_ID/exec'
};
```

Para desarrollo local, esta URL puede apuntar a un proxy que evita problemas de CORS:
```javascript
export const APP_CONFIG = {
  BASE_URL: 'http://localhost:3000/api'
};
```

## Futuras Mejoras

### Fase Inmediata
- Implementación completa de los módulos pendientes (obligaciones, pagos, precontractual)
- Testing integral de todas las secciones
- Optimización de rendimiento

### Fase de Optimización
- Lazy loading de componentes
- Caché avanzada para estados y datos
- Sistema de testing automatizado

### Migración Futura
El frontend está diseñado para facilitar la migración a:
- React + Tailwind CSS como PWA
- Autenticación persistente avanzada
- Notificaciones push usando Firebase
- Conexión directa a Supabase como backend
