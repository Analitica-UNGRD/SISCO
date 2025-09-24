# Seguimiento de Contratistas - Backend

## Descripción General
Este componente implementa el backend del sistema de gestión contractual usando **Google Apps Script** conectado a **Google Sheets** como base de datos inicial.

El backend proporciona una API JSON que permite:
- Gestionar registros de contratistas y sus contratos
- Controlar pagos (cuentas de cobro) con estados y consecutivos
- Administrar obligaciones por contrato y período
- Documentar procesos precontractuales
- Controlar accesos por roles (admin, revisor, contratista)

## Arquitectura

### Estructura Modular

El backend fue refactorizado de un archivo monolítico (`code.gs`) a una estructura modular:

| Archivo | Descripción |
|---------|-------------|
| `00_config.gs` | Configuración y caché de Spreadsheet |
| `01_router.gs` | Router genérico y `buildJsonOutput` |
| `02_sheets_utils.gs` | Helpers para hojas (getSheet, headers, append/update) |
| `03_personas.gs` | Handlers relacionados a personas (crear, upsert, lookup, list, getPersonaContext) |
| `04_contratos.gs` | Handlers para gestión de contratos |
| `05_pagos.gs` | Handlers para gestión de pagos |
| `06_obligaciones.gs` | Handlers para obligaciones |
| `07_precontractual.gs` | Handlers para gestión precontractual |
| `08_roles_and_auth.gs` | Gestión de roles, login y sesiones |
| `code_backup.gs` | Copia de seguridad del `code.gs` original |

### Modelo de Datos

El backend utiliza Google Sheets como base de datos, donde cada hoja representa una entidad clave:

#### 1. Personas
- Almacena información personal de contratistas
- Campos clave: persona_id (PK), Identificación, Nombre, Correo, Perfil, Estado

#### 2. Contratos
- Contiene información de contratos asociados a personas
- Campos clave: contrato_id (PK), persona_id (FK), Número_contrato, Objeto, Inicio, Fin, Valor_total

#### 3. Pagos
- Registra pagos (cuentas de cobro) asociados a contratos
- Campos clave: pago_id (PK), contrato_id (FK), Numero_cobro, Fecha_inicio/fin, Valor_pago, Estado

#### 4. Obligaciones
- Guarda obligaciones contractuales replicadas por cada período
- Campos clave: obligacion_id (PK), contrato_id (FK), Descripcion, Actividades_realizadas, Evidencia_URL, Periodo

#### 5. Precontractual
- Gestiona requisitos precontractuales por persona
- Campos clave: pre_id (PK), persona_id (FK), Requisito, Estado, Soporte_URL

#### 6. Roles
- Define roles de usuario para control de acceso
- Campos clave: email (PK lógico), rol (admin/revisor/contratista)

### Relaciones Entre Entidades
- Personas 1 a N Contratos
- Contratos 1 a N Pagos
- Contratos 1 a N Obligaciones
- Personas 1 a N Precontractual

## API JSON

### Puntos de Entrada
El backend expone una API JSON a través de la función `doPost` de Apps Script, utilizando un sistema de rutas lógicas:

```javascript
{ 
  path: "nombreFuncion", 
  payload: { /* datos */ } 
}
```

### Endpoints Principales

| Endpoint (path) | Descripción |
|----------------|-------------|
| `login` | Autenticación de usuario |
| `listPersonas` | Lista personas registradas |
| `getPersona` | Obtiene datos de una persona específica |
| `upsertPersona` | Crea o actualiza datos de persona |
| `getContratos` | Obtiene contratos (filtrados por persona_id si se proporciona) |
| `upsertContrato` | Crea o actualiza contratos |
| `getPagos` | Obtiene pagos (filtrados por contrato_id si se proporciona) |
| `crearPagoBorrador` | Crea un borrador de pago |
| `actualizarPago` | Actualiza un pago existente |
| `getObligaciones` | Obtiene obligaciones (filtradas por contrato_id y/o periodo) |
| `upsertObligacion` | Crea o actualiza obligaciones |
| `getPrecontractual` | Obtiene elementos precontractuales por persona |
| `upsertPrecontractual` | Crea o actualiza elementos precontractuales |
| `getRoles` | Obtiene roles (requiere permisos de admin) |
| `dashboardSummary` | Obtiene resumen para el dashboard |

### Respuesta Estándar
Todas las respuestas siguen un formato común:

```json
{
  "ok": true|false,
  "data": { /* datos específicos del endpoint */ },
  "error": "Mensaje de error (si ok=false)"
}
```

## Seguridad

- **Autenticación**: "Ejecutar como usuario que accede" en Google Apps Script
- **Control de acceso**: Basado en la hoja "Roles" que asigna roles a correos electrónicos
- **CORS**: Configurado para permitir peticiones desde dominios específicos
- **Validación**: Control de entradas y sanitización de datos

## Pruebas y Depuración

Para probar localmente en el editor de Apps Script:

1. Implementar la función `doPost` (usar el deploy o probar con el simulador)
2. Enviar POST a la URL del Web App con body JSON: `{ "path": "listPersonas" }`

## Proyección Futura

El modelo de datos está diseñado para facilitar la migración futura a una base de datos relacional (Postgres/Supabase), manteniendo la misma estructura para garantizar compatibilidad.

## Integración con Frontend

El frontend se comunica con esta API mediante peticiones fetch:

```javascript
fetch('https://script.google.com/macros/s/DEPLOYMENT_ID/exec', {
  method: 'POST',
  headers: { 'Content-Type': 'text/plain' },
  body: JSON.stringify({ path: 'listPersonas', payload: {} })
})
.then(response => response.json())
.then(data => console.log(data));
```

Para desarrollo local, se proporciona un servidor proxy que facilita el trabajo evitando problemas de CORS.
