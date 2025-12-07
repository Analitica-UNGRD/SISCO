<div align="center">
  <img src="public/img/SISCO.png" alt="SISCO Banner" width="100%">

  # SISCO

  ### Sistema Integral de Seguimiento a Contratistas de la OAPI

  [**Ir a la Aplicación**](https://sisco-iota.vercel.app)

  [![Version](https://img.shields.io/badge/version-2.0.0-blue.svg?style=flat-square)](https://github.com/Analitica-UNGRD/SISCO)
  [![Actualización](https://img.shields.io/badge/actualización-06%2F12%2F2025-green.svg?style=flat-square)](https://github.com/Analitica-UNGRD/SISCO)
</div>

---

## Resumen Ejecutivo

<div align="center">
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white" />
  <img src="https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white" />
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" />
  <img src="https://img.shields.io/badge/Google_Apps_Script-4285F4?style=for-the-badge&logo=google&logoColor=white" />
  <img src="https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" />
</div>
<br>

La plataforma **SISCO (Sistema Integral de Seguimiento a Contratistas de la OAPI)** es una aplicación web modular diseñada específicamente para la **Unidad Nacional para la Gestión del Riesgo de Desastres (UNGRD)**. Su propósito fundamental es facilitar, estandarizar y asegurar el proceso de registro, seguimiento y monitoreo de los contratistas de la Oficina Asesora de Planeación e Información, gestionando todo el ciclo contractual y precontractual.

Esta herramienta nace de la necesidad de modernizar la gestión de datos, pasando de manejos manuales y archivos dispersos a un sistema centralizado, seguro y consistente que garantiza la calidad de la información desde su origen mediante estandarización y buenas prácticas.

---

## Tabla de Contenidos

1.  [Descripción de la Herramienta](#1-descripción-de-la-herramienta)
2.  [Propósito y Justificación](#2-propósito-y-justificación)
3.  [Ventajas Competitivas y Beneficios Clave](#3-ventajas-competitivas-y-beneficios-clave)
4.  [Información Técnica General](#4-información-técnica-general)
5.  [Sistema de Autenticación y Seguridad](#5-sistema-de-autenticación-y-seguridad)
6.  [Entorno de Desarrollo Local (Localhost)](#6-entorno-de-desarrollo-local-localhost)
7.  [Prerrequisitos e Instalación](#7-prerrequisitos-e-instalación)
8.  [Arquitectura General (BACKEND)](#8-arquitectura-general-backend)
9.  [Estructura de Archivos (.gs)](#9-estructura-de-archivos-gs)
    *   [9.1 Esquema de Base de Datos](#91-esquema-de-base-de-datos-google-sheets)
    *   [9.2 Guía de Replicación](#92-guía-de-replicación-y-configuración)
10. [Arquitectura y Enfoque (FRONTEND)](#10-arquitectura-y-enfoque-frontend)
    *   [10.1 Comunicación con Backend](#101-comunicación-con-el-backend)
    *   [10.2 Sistema de Navegación](#102-sistema-de-navegación-sidebar)
11. [Protocolo de Mantenimiento y Actualizaciones](#11-protocolo-de-mantenimiento-y-actualizaciones)
    *   [11.2 Buenas Prácticas](#112-buenas-prácticas-y-excelencia-técnica)
    *   [11.3 Roadmap del Proyecto](#113-roadmap-del-proyecto-hoja-de-ruta)
    *   [11.4 Créditos y Licencia](#114-créditos-y-licencia)

---

## 1. Descripción de la Herramienta

SISCO es una solución tecnológica integral que permite a la OAPI gestionar y monitorear a sus contratistas de manera eficiente. La plataforma actúa como una interfaz amigable e inteligente conectada a una base de datos centralizada, eliminando la complejidad y los riesgos de la manipulación directa de hojas de cálculo y ofreciendo una experiencia de usuario fluida y guiada.

A través de sus distintos módulos, los usuarios pueden gestionar el ciclo de vida completo de la contratación, asegurando la integridad y la calidad de los datos.

### Módulos Principales
*   **Gestión de Contratistas:** Administración detallada de la información de los contratistas.
*   **Etapa Precontractual:** Seguimiento y control de los procesos previos a la formalización del contrato.
*   **Contratos:** Registro estructurado de los contratos, vigencias y valores.
*   **Seguimiento Financiero (Pagos y Obligaciones):** Control de los pagos realizados y verificación del cumplimiento de obligaciones contractuales.
*   **Modificaciones Contractuales:** Gestión de adiciones y prórrogas de forma organizada.
*   **Dashboard y Visualización:** Tableros de control para la toma de decisiones basada en datos actualizados en tiempo real.
*   **Administración y Configuración:** Gestión centralizada de catálogos, usuarios y permisos del sistema.

---

## 2. Propósito y Justificación

¿Por qué se creó SISCO? La gestión de contratistas y procesos contractuales en entidades públicas enfrenta retos como la inconsistencia de datos, errores humanos en la digitación y dificultades para consolidar información veraz en tiempo real.

SISCO fue desarrollado para:
1.  **Centralizar la Información:** Unificar todos los registros de contratistas y contratos en una sola fuente de verdad.
2.  **Garantizar la Calidad del Dato:** Implementar reglas de negocio y estandarización que impiden errores comunes antes de que ocurran.
3.  **Facilitar el Monitoreo:** Proveer herramientas de visualización clara del estado de cada contratista y proceso.
4.  **Optimizar Tiempos:** Reducir la carga operativa de consolidación manual de reportes y cruces de información.

---

## 3. Ventajas Competitivas y Beneficios Clave

El uso de esta plataforma ofrece beneficios tangibles frente a los métodos tradicionales de gestión manual:

### 3.1 Estandarización de Datos
El sistema utiliza **catálogos y listas desplegables** predefinidos para la mayoría de los campos críticos. Esto asegura que la información sea homogénea, facilitando análisis posteriores y evitando discrepancias en la nomenclatura.

### 3.2 Calidad e Integridad de la Información
Una de las mayores fortalezas de SISCO es que **no permite la manipulación directa de la base de datos** por parte de los usuarios finales.
*   La interacción es exclusiva a través de formularios validados.
*   Se eliminan errores de "dedo" o borrados accidentales comunes en el manejo de archivos planos.
*   El sistema valida la coherencia de los datos ingresados.

### 3.3 Facilidad de Uso y Consistencia
La interfaz ha sido diseñada para ser intuitiva y fácil de usar, guiando al funcionario paso a paso en cada tarea. La consistencia visual y funcional reduce la curva de aprendizaje y mejora la adopción de la herramienta.

### 3.4 Arquitectura Modular y Escalable
Al ser una aplicación web modular, permite agregar nuevas funcionalidades o ajustar las existentes sin interrumpir la operación general, facilitando el mantenimiento y la evolución tecnológica.

### 3.5 Seguridad y Trazabilidad
El acceso a la información está controlado, asegurando que los datos sensibles sean manejados de manera segura y transparente.

---

## 4. Información Técnica General

Aunque transparente para el usuario final, la plataforma opera bajo una arquitectura moderna y eficiente:
*   **Frontend Ligero:** Una aplicación web rápida, interactiva y responsiva.
*   **Backend en la Nube:** Utiliza tecnologías de Google (Apps Script y Sheets) para garantizar alta disponibilidad, integración nativa con las herramientas institucionales de la UNGRD y costos de infraestructura reducidos.
*   **Seguridad:** Implementación de validaciones robustas tanto en el cliente como en el servidor para proteger la integridad y confidencialidad de los datos.

---

## 5. Sistema de Autenticación y Seguridad

El sistema utiliza un mecanismo de autenticación personalizado que conecta el frontend con la base de datos centralizada en Google Sheets a través de Apps Script.

### Funcionamiento del Flujo de Autenticación

1.  **Login (Frontend):**
    *   El usuario ingresa sus credenciales en `src/pages/login.html`.
    *   `src/lib/auth.js` realiza una validación preliminar del dominio institucional (`@gestiondelriesgo.gov.co`).
    *   Se envía una petición a la API (vía proxy en local o directa en producción).

2.  **Validación (Backend - `08_roles_and_auth.gs`):**
    *   Apps Script recibe la petición y verifica las credenciales contra la hoja de "Usuarios".
    *   Se validan los permisos y el rol asignado al correo.

3.  **Sesión (Cliente):**
    *   Si la autenticación es exitosa, el sistema genera un **Token** (Base64 que incluye email y timestamp) y lo almacena en `localStorage` bajo la clave `auth_token`.
    *   Se almacenan también `auth_email` y `auth_role`.
    *   **Caducidad:** El sistema (`auth.js`) verifica automáticamente la antigüedad del token. Si supera 1 hora, la sesión se invalida y redirige al login.

### Roles y Permisos
El sistema maneja roles definidos en el backend (ej. Administrador, Contratista, Supervisor) que determinan el acceso a las diferentes vistas (`dashboard.html`, `contratistas.html`, `admin.html`) y las acciones permitidas (lectura/escritura).

---

## 6. Entorno de Desarrollo Local (Localhost)

Para el desarrollo local, SISCO utiliza una arquitectura híbrida con un proxy en Node.js para mitigar las restricciones de CORS de Google Apps Script.

### ¿Cómo funciona el Localhost?

El comando de inicio levanta dos procesos simultáneos:
1.  **Servidor Proxy (`server.js` - Puerto 3000):** Actúa como intermediario. Recibe las peticiones del frontend en `/api` y las reenvía al script de Google (`TARGET_URL`). Esto permite ver el tráfico y manejar cabeceras CORS localmente.
2.  **Servidor Frontend (`http-server` - Puerto 5500):** Sirve los archivos estáticos (HTML, JS, CSS) para el navegador.

La configuración en `src/lib/config.js` detecta automáticamente si estás en `localhost` y ajusta la `BASE_URL` para apuntar al proxy local en lugar de intentar conectar directamente con Google, asegurando un flujo de trabajo fluido.

---

## 7. Prerrequisitos e Instalación

### Prerrequisitos
1.  **Node.js:** Versión 18 o superior instalada.
2.  **NPM:** Gestor de paquetes incluido con Node.js.
3.  **URL del Script:** Debes tener la URL del despliegue "Web App" de Google Apps Script (`exec`).

### Pasos de Instalación

1.  **Clonar el Proyecto:**
    Descarga el código fuente en tu máquina local.

2.  **Instalar Dependencias:**
    Ejecuta el siguiente comando en la raíz del proyecto para instalar las librerías necesarias (Express, concurrently, etc.):
    ```bash
    npm install
    ```

3.  **Configurar Variables de Entorno (.env):**
    Crea un archivo `.env` en la raíz (puedes basarte en un ejemplo si existe) y define la URL real del backend:
    ```env
    # URL de tu despliegue de Apps Script
    TARGET_URL=https://script.google.com/macros/s/TU_ID_DE_SCRIPT/exec
    
    # Opcional: Puerto del proxy
    PORT=3000
    ```
    *Importante: Sin esta variable, el proxy local no sabrá a dónde enviar las peticiones.*

4.  **Ejecutar en Local:**
    Inicia el entorno de desarrollo con el comando:
    ```bash
    npm run start
    ```
    Esto levantará los servicios. Accede a tu navegador en:
    *   Frontend: `http://localhost:5500/src/pages/login.html`
    *   (El proxy estará corriendo en segundo plano en el puerto 3000).

### Despliegue (Referencia)
El proyecto está configurado con `vercel.json` para definir rutas y rewrites, asegurando que en producción (Vercel) las rutas limpias y la estructura de archivos se sirvan correctamente.

### Árbol de Directorios

```text
SISCO_V2/
├── api/                    # Serverless Functions (Vercel)
│   └── ...                 # Endpoints auxiliares si existen
├── apps_script/            # Backend (Google Apps Script)
│   ├── 00_config.gs        # Configuración global del script
│   ├── 01_router.gs        # Enrutador principal (doGet, doPost)
│   ├── 02_sheets_utils.gs  # Utilidades para manejo de Sheets
│   ├── 03_personas.gs      # Lógica de gestión de personas
│   ├── 04_contratos.gs     # Lógica central de contratos
│   ├── 08_roles_and_auth.gs # Lógica de autenticación y permisos
│   └── ...                 # Otros módulos de negocio (Pagos, Obligaciones, etc.)
├── public/                 # Archivos estáticos públicos
├── src/                    # Código fuente del Frontend
│   ├── lib/                # Librerías y utilidades compartidas
│   │   ├── auth.js         # Cliente de autenticación y gestión de sesión
│   │   ├── config.js       # Configuración de entornos y resolución de URLs
│   │   ├── ui.js           # Componentes de interfaz compartidos
│   │   └── ...
│   ├── pages/              # Vistas HTML (login.html, dashboard.html, etc.)
│   ├── pages-scripts/      # Lógica específica de cada vista (DOM, eventos)
│   │   ├── admin/          # Scripts del panel administrativo
│   │   └── ...
│   └── styles/             # Hojas de estilo CSS
├── server.js               # Proxy Node.js para desarrollo local
├── package.json            # Dependencias y scripts de ejecución
└── vercel.json             # Configuración de despliegue y rutas en Vercel
```

---

## 8. Arquitectura General (BACKEND)

El backend opera como una API RESTful simulada, donde Google Apps Script actúa como el servidor lógico y una hoja de cálculo Google Sheets funciona como la base de datos. El sistema está diseñado para ser consumido por un frontend ligero, utilizando `JSON` como formato de intercambio de datos.

### Componentes Principales
1.  **Google Sheets:** Almacenamiento persistente de datos (tablas como hojas individuales).
2.  **Google Apps Script:** Expone un Endpoint Web (`doPost`) que actúa como API Gateway. Recibe peticiones, enruta al controlador adecuado y devuelve respuestas JSON.
3.  **Proxy Serverless (Local):** Durante el desarrollo, se utiliza un proxy intermedio para solucionar restricciones de CORS.

---

## 9. Estructura de Archivos (.gs)

Los archivos en la carpeta `apps_script/` se compilan en un único proyecto. Cada archivo tiene una responsabilidad específica:

| Archivo | Descripción |
| :--- | :--- |
| `00_config.gs` | **Configuración.** Almacena el ID de la hoja de cálculo (`SPREADSHEET_ID`) y los nombres de las pestañas (hojas). |
| `01_router.gs` | **Router Principal.** Contiene `doGet` y `doPost`. Despacha las peticiones basadas en el parámetro `path` del payload JSON. También maneja el endpoint `dashboardSummary`. |
| `02_sheets_utils.gs` | **Utilidades.** Funciones core (`sheetToObjects`, `appendRowToSheetByHeader`) para leer y escribir en Sheets mapeando columnas a propiedades de objetos. Maneja bloqueos (`LockService`) para concurrencia. |
| `03_personas.gs` | **Lógica Personas.** CRUD para la hoja `Personas` (Contratistas). Maneja la creación de `persona_id` y búsquedas. |
| `04_contratos.gs` | **Lógica Contratos.** Gestión de la hoja `Contratos`. |
| `05_pagos.gs` | **Lógica Financiera.** Gestión de la hoja `Pagos`. |
| `08_roles_and_auth.gs` | **Seguridad.** Manejo de autenticación simple. Verifica credenciales contra la hoja `Roles` simulando una sesión. |
| `09_dashboard.gs` | **Analítica.** Cálculos agregados y reportes para el tablero de control. |
| `10_modificaciones.gs` | **Control de Cambios.** Gestión de adiciones y prórrogas en la hoja `Modificaciones`. |
| `11_catalogo.gs` | **Listas Maestras.** Gestión de catálogos para los desplegables. |
| `12_generic_sheet.gs` | **CRUD Genérico.** Utilidades para operaciones estándar en cualquier hoja no especializada. |

---

## 9.1 Esquema de Base de Datos (Google Sheets)

El sistema requiere una Hoja de Cálculo (Spreadsheet) con pestañas específicas. A continuación se detallan las principales:

### A. Hoja `Personas`
Almacena la información base de los contratistas.
*   **Columnas Clave:** `persona_id` (UUID), `Identificación`, `Tipo_identificación`, `Nombre`, `Correo`, `Estado` (Activo/Inactivo).

### B. Hoja `Contratos`
Registro de los contratos asociados a las personas.
*   **Columnas Clave:** `contrato_id`, `persona_id` (FK), `Numero_contrato`, `Objeto`, `Valor_inicial`, `Fecha_inicio`, `Fecha_fin`, `Estado` (Vigente/Liquidado).

### C. Hoja `Roles` (Seguridad)
Tabla de usuarios permitidos para acceder al sistema.
*   **Columnas:**
    *   `email`: Correo institucional.
    *   `password`: Contraseña (texto plano o hash simple según implementación).
    *   `rol`: Nivel de acceso (`admin`, `usuario`, `consulta`).

### D. Otras Hojas
*   **`Pagos`:** Registro histórica de pagos (`contrato_id`, `Fecha_pago`, `Valor`).
*   **`Obligaciones`:** Obligaciones contractuales (`contrato_id`, `Descripción`).
*   **`Precontractual`:** Seguimiento de procesos antes del contrato (`persona_id`, `Etapa`, `Estado`).

---

## 9.2 Guía de Replicación y Configuración

Para desplegar una nueva instancia de este backend:

### Paso 1: Crear la Hoja de Cálculo
1.  Crea una nueva Google Sheet.
2.  Renombra las pestañas según `00_config.gs`: `Personas`, `Contratos`, `Pagos`, `Obligaciones`, `Modificaciones`, `Precontractual`, `Roles`.
3.  Agrega los encabezados (headers) en la primera fila de cada hoja. **Importante:** Los nombres deben coincidir con los esperados por el código (ej. `Identificación`, `Nombre`).

### Paso 2: Configurar Apps Script
1.  En la Sheet, ve a **Extensiones > Apps Script**.
2.  Copia el contenido de los archivos `.gs` del repositorio al editor en línea.
3.  **Actualizar ID:** En `00_config.gs`, reemplaza el valor de `SPREADSHEET_ID` con el ID de tu nueva hoja de cálculo.

### Paso 3: Inicializar Usuarios
1.  En la hoja `Roles`, agrega manualmente tu usuario:
    *   email: `tu.correo@gestiondelriesgo.gov.co`
    *   password: `(tu contraseña)`
    *   rol: `admin`

### Paso 4: Despliegue (Deploy)
1.  Botón **Implementar > Nueva implementación**.
2.  Tipo: **Aplicación web**.
3.  Ejecutar como: **Yo** (tu cuenta).
4.  Quién tiene acceso: **Cualquier usuario** (Permite que el frontend acceda sin login de Google de por medio; la seguridad la maneja la lógica interna de `Roles`).
5.  Copia la **URL de la aplicación web** (termina en `/exec`). Esta es la URL que configurarás en el frontend.

### 9.3 Notas Técnicas Importantes

*   **Identificadores (UUID):** El sistema genera IDs cortos (ej. `P-a1b2c3d4`) para relacionar registros. No cambies estos IDs manualmente en la hoja.
*   **Caché:** El script utiliza caché en memoria (`_CACHE_MAX_AGE_MS`) para no leer la hoja de cálculo en cada pequeña operación dentro de una misma ejecución, mejorando el rendimiento.
*   **Concurrencia:** Las escrituras usan `LockService` para prevenir que dos usuarios sobrescriban datos al mismo tiempo.
*   **Rutas (Routing):** Todas las peticiones son `POST`. El cuerpo del mensaje debe ser un JSON: `{ "path": "nombreFuncion", "payload": { ... } }`.

---

## 10. Arquitectura y Enfoque (FRONTEND)

Este documento detalla la arquitectura, componentes y funcionamiento de la interfaz de usuario (Frontend) del sistema SISCO.

### 1. Arquitectura
El frontend se ha construido siguiendo principios de **Vanilla JavaScript (ES6 Modules)** para mantener una arquitectura ligera, rápida y sin dependencias pesadas como React o Angular. Esto facilita el despliegue y reduce la complejidad de construcción.

### Tecnologías Clave
*   **HTML5 / CSS3:** Maquetación semántica y moderna. Uso de **TailwindCSS** (vía CDN) para utilidades rápidas y estilos responsivos.
*   **JavaScript (ES6+):** Lógica modular nativa (`<script type="module">`).
*   **Iconografía:** Google Material Icons.
*   **Tipografía:** Inter (Google Fonts).

### Estructura de Directorios (`src/`)

```text
src/
├── lib/                # Núcleo de la aplicación (Lógica compartida)
│   ├── auth.js         # Gestión de sesión (login, logout, checks).
│   ├── config.js       # Resolución de URL del backend (Local vs Prod).
│   ├── loader.js       # Control del indicador de carga global.
│   ├── ui.js           # Componentes UI (Toasts, Modales).
│   └── ...
├── pages/              # Vistas HTML (Páginas)
│   ├── login.html      # Login de usuario.
│   ├── dashboard.html  # Tablero principal.
│   ├── contratistas.html # Gestión de contratistas.
│   ├── precontractual.html # Seguimiento precontractual.
│   └── ...
├── pages-scripts/      # Controladores de Vista (Lógica específica)
│   ├── sidebar.js      # Lógica de interacción de la barra lateral.
│   ├── sidebar-component.js # Renderizado dinámico del menú lateral.
│   ├── dashboard.js    # Lógica de gráficos y KPIs.
│   └── ...
└── styles/             # Hojas de estilo CSS personalizadas
    ├── sidebar.css     # Estilos específicos del menú lateral.
    ├── loader.css      # Estilos del spinner de carga.
    └── ...
```

---

## 10.1 Comunicación con el Backend

La aplicación sigue un patrón de **Cliente-Servidor** estateless. El frontend no conecta directamente a la base de datos, sino que consume la API expuesta por Google Apps Script.

### Patrón de Fetching
En lugar de un cliente HTTP complejo, las vistas implementan funciones `fetchData` que estandarizan las peticiones:

1.  **Configuración:** Obtienen la `SCRIPT_URL` desde `src/lib/config.js`.
2.  **Transporte:** Envían una petición `POST` con cuerpo JSON.
3.  **Estructura del Payload:**
    ```json
    {
      "path": "nombreFuncionBackend",
      "payload": {
        "parametro1": "valor",
        "filtro": "..."
      }
    }
    ```
4.  **Respuesta:** Esperan un JSON con formato `{ "ok": true, "items": [...] }`.

---

## 10.2 Sistema de Navegación (Sidebar)

La barra lateral es un componente dinámico inyectado por JavaScript para evitar duplicidad de código HTML en cada página.

### Implementación (`src/pages-scripts/`)
*   **`sidebar-component.js`:** Exporta la función `renderSidebar(target)`. Esta función genera el HTML del menú (Dashboard, Contratistas, Admin) e inyecta el código en el contenedor `#shared-sidebar`.
*   **`sidebar.js`:** Maneja la interactividad:
    *   **Expandir/Colapsar:** Hover para expandir, mouseout para colapsar.
    *   **Pin (Fijar):** Permite dejar la barra fija usando `localStorage` para recordar la preferencia del usuario.
    *   **Active Link:** Detecta la URL actual y resalta automáticamente la sección correspondiente.

### Uso en HTML
```html
<div id="shared-sidebar"></div>
<script type="module">
  import { renderSidebar } from '../pages-scripts/sidebar-component.js';
  renderSidebar('#shared-sidebar');
</script>
```

---

## 10.3 Diseño y Estilizado (UI/UX)

La interfaz combina **TailwindCSS** para la estructura y espaciado (grids, flex, margins) con hojas de estilo personalizadas para componentes complejos.

### Componentes Destacados
*   **Loader Global (`loader.js`):** Un overlay de carga que bloquea la interfaz durante peticiones asíncronas para mejorar la percepción de respuesta.
*   **Toasts (`ui.js`):** Notificaciones flotantes (éxito/error) no intrusivas.
*   **Buscador Global:** Implementado en el header, permite búsqueda rápida de contratos o personas con atajo de teclado (`Ctrl+K`).

---

## 10.4 Buenas Prácticas y Flujo de Desarrollo

1.  **Módulos ES6:** Todo el código JS utiliza `import`/`export` para mantener las dependencias claras.
2.  **Separación de Intereses:**
    *   **HTML:** Solo estructura.
    *   **JS (`pages-scripts`):** Solo lógica de vista y llamadas a API.
    *   **CSS:** Solo estilos visuales específicos.
3.  **Seguridad en Cliente:**
    *   `session-guard.js`: Se incluye en todas las páginas protegidas para validar que exista un token válido. Si no, redirige al login inmediatamente.
4.  **Manejo de Errores:** Las llamadas al backend están envueltas en `try/catch` y utilizan el sistema de `Toasts` para informar al usuario de problemas de red o validación.

---

## 11. Protocolo de Mantenimiento y Actualizaciones

Esta guía establece los protocolos estrictos para garantizar la estabilidad, escalabilidad y seguridad del sistema SISCO durante las fases de mantenimiento y evolución.

### 1. Frontend (Interfaz de Usuario)
La arquitectura desacoplada permite realizar cambios visuales sin riesgo alto de dañar los datos, siempre y cuando se respeten los contratos de comunicación.

*   **Modificaciones Seguras:**
    *   **Textos y Etiquetas:** Puede editar libremente el HTML (`src/pages/*.html`) para ajustar títulos, ayudas visuales o descripciones.
    *   **Estilos (CSS):** Modificar `src/styles/*.css` es seguro. Use `layout.css` para ajustes globales.
    *   **Lógica Visual:** Ajustar validaciones en `src/pages-scripts/` (ej. cambiar un color de alerta o un mensaje de error) es seguro.

*   **Zonas de Riesgo (Risk Zones):**
    *   **IDs de Elementos:** **NUNCA cambie los `id`** de los inputs o botones (ej. `<input id="documento">`). Los scripts de control (`dashboard.js`, `personas.js`) dependen de estos identificadores exactos para leer y escribir datos.
    *   **Llamadas al Backend:** En los scripts de página (como `dashboard.js`), la función `fetchData` define las rutas (`path: 'listPersonas'`). No modifique estos nombres a menos que haya actualizado correspondientemente la función en Apps Script (`API_HANDLERS`).

### 2. Backend (Google Apps Script)
El backend es crítico. Un error aquí puede detener toda la operación o corromper la base de datos.

*   **Flujo de Actualización:**
    1.  **Edición:** Realice los cambios en el editor de Apps Script.
    2.  **Versionado:** Guarde una nueva "Versión" del proyecto (Gestionar implementaciones).
    3.  **Implementación:** Publique la nueva versión como aplicación web ("Aplicación web" > "Nueva implementación").
    *   *Nota Crítica:* Si edita el código pero no publica una nueva versión, el frontend seguirá consumiendo la versión anterior.

*   **Reglas de Oro:**
    *   **Esquema de Datos:** El sistema lee las hojas por encabezado (`readSheetAsObjects`). **No renombre las cabeceras de la fila 1** en Google Sheets (ej. no cambie `persona_id` por `id_persona`). Puede agregar nuevas columnas al final sin problema.
    *   **Gestión de Errores:** Toda nueva función backend debe estar envuelta en un bloque `try/catch` para devolver siempre un JSON válido `{ ok: false, error: ... }` y nunca un error de servidor HTML (500).

---

## 11.2 Buenas Prácticas y Excelencia Técnica

SISCO sobresale como una solución profesional gracias a la adopción de prácticas de ingeniería de software robustas:

### 1. Arquitectura Limpia y Modular
*   **Decoupling:** Frontend y Backend son agnósticos entre sí. Se comunican estrictamente vía API JSON. Esto permite migrar el backend en el futuro (ej. a Node.js) sin reescribir una sola línea del frontend.
*   **Vanilla JS Moderno:** Se evitó la deuda técnica de frameworks pesados. El código es ES6 modular, estándar y perdurable en el tiempo.

### 2. Seguridad por Diseño
*   **Tokens Controlados:** Implementación manual de tokens firmados (HMAC-SHA256) en `Auth.gs`, ofreciendo un control total sobre la caducidad y validez de las sesiones, superior a las cookies simples.
*   **Validación Doble:** Los datos se validan en el cliente (UX) y estrictamente en el servidor (Seguridad/Integridad) antes de tocar la hoja de cálculo.

### 3. Integridad de Datos
*   **UUIDs Inmutables:** El sistema genera identificadores únicos (ej. `P-a3f2...`) para personas y contratos. Esto previene la corrupción de relaciones que ocurre comúnmente en Excel cuando se ordenan o filtran filas.
*   **Catálogos Normalizados:** Todo dato crítico (Estado, Área, Tipo) proviene de listas maestras, asegurando calidad para la analítica de datos.

---

## 11.3 Roadmap del Proyecto (Hoja de Ruta)

Plan estratégico para la evolución de SISCO.

### Corto Plazo (1-3 Meses)
- [ ] **Optimización de Carga:** Implementar caché local (`localStorage`) para catálogos estáticos y reducir el tiempo de inicio.
- [ ] **Feedback Mejorado:** Refinar los mensajes de error en formularios para ser más descriptivos para el usuario final.
- [ ] **Modo Oscuro:** Centralizar colores en variables CSS para permitir un cambio de tema nativo.
- [ ] **Búsqueda Avanzada:** Ampliar filtros en el dashboard para buscar por rango de fechas y montos.

### Mediano Plazo (3-6 Meses)
- [ ] **Notificaciones Automáticas:** Enviar correos electrónicos a contratistas cuando su estado cambie o se acerque el fin de su contrato (usando `MailApp` de Google).
- [ ] **Panel de Auditoría:** Interfaz visual para ver el historial de cambios (quién modificó qué registro y cuándo).
- [ ] **Reportes Exportables:** Generación de PDFs automáticos (certificaciones, informes de supervisión) desde el sistema.

### Largo Plazo (> 6 Meses) - Evolución Arquitectónica
- [ ] **Migración a Base de Datos Relacional:** Migrar el almacenamiento de Google Sheets a **Supabase (PostgreSQL)**. Esto eliminará los límites de celdas (5M) y permitirá consultas SQL complejas en milisegundos.
- [ ] **Autenticación SSO:** Integración con cuentas corporativas (Microsoft/Google) mediante OAuth.
- [ ] **Aplicación Móvil (PWA):** Convertir el sistema en una Progressive Web App instalable para seguimiento en campo.

---

## 11.4 Créditos y Licencia

Este software ha sido diseñado con altos estándares de calidad para servir eficientemente a la gestión pública.

### Desarrollo y Arquitectura
**Manolo Rey García**
Oficina Asesora de Planeación e Información
**UNGRD (Unidad Nacional para la Gestión del Riesgo de Desastres)**

### Licencia
Este software es propiedad intelectual de la UNGRD. Todos los derechos reservados. Su uso, modificación y distribución están restringidos a propósitos institucionales autorizados.
