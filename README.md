# 📂 Plataforma de Gestión de Contratistas y Pagos  
_Sistema de seguimiento contractual con generación de cuentas de cobro_

---

## 📖 Índice
- [📌 Descripción General](#-descripción-general)
- [🏗️ Arquitectura del Proyecto](#-arquitectura-del-proyecto)
- [🗄️ Backend (Google Sheets)](#-backend-google-sheets)
  - [1. Personas](#1-hoja-personas)
  - [2. Contratos](#2-hoja-contratos)
  - [3. Pagos](#3-hoja-pagos)
  - [4. Obligaciones](#4-hoja-obligaciones)
  - [5. Precontractual](#5-hoja-precontractual)
  - [6. Roles](#6-hoja-roles)
- [💻 Frontend (fase actual)](#-frontend-fase-actual)
- [💻 Frontend (futuro)](#-frontend-futuro)
- [⚙️ Uso del Proyecto](#️-uso-del-proyecto)
- [🚀 Próximos Pasos](#-próximos-pasos)
- [👥 Autores](#-autores)

---

## 📌 Descripción General
Este proyecto implementa un sistema de gestión contractual usando **Google Sheets** como base de datos inicial.  
La plataforma permite:  

- Registrar contratistas y sus contratos.  
- Llevar el control de pagos (cuentas de cobro) con estados y consecutivos.  
- Gestionar obligaciones fijas de cada contrato, con actividades y evidencias históricas por periodo.  
- Documentar el proceso **precontractual** de cada persona.  
- Controlar accesos por roles (admin, revisor, contratista).  
- Generar informes en PDF a partir de la información almacenada.  

🎯 La idea es iniciar con Google Sheets + Apps Script y escalar más adelante a un backend robusto (Supabase/Postgres) y un frontend en React/PWA.

---

## 🏗️ Arquitectura del Proyecto
- **Backend**: Google Apps Script expuesto como **API JSON** (`doPost` → JSON con ContentService + CORS), conectado a Google Sheets.
- **Frontend**: Sitio independiente desplegado en **Vercel** (HTML/CSS/JS o framework), que consume la API de Apps Script vía `fetch`.
- **Autenticación**: “Ejecutar como usuario que accede” y acceso restringido al dominio. El primer request forzará login de Google si no hay sesión.
- **Almacenamiento de documentos**: Google Drive (carpeta por contrato) con URL guardada en `Contratos.Carpeta_Drive_URL`.


---

## 🗄️ Backend (Google Sheets)

Cada hoja de cálculo representa una entidad clave.  
La **primera columna siempre es el ID único (PK)** y los enlaces se hacen mediante **FKs**.

---

### 1. Hoja: Personas
| Columna           | Descripción                                   | Notas |
|-------------------|-----------------------------------------------|-------|
| persona_id        | Identificador único de la persona              | **PK**, generado por el sistema |
| Identificación    | Número de identificación (CC, NIT, etc.)      | Único por persona |
| Tipo_identificación | Tipo de documento                           | CC, NIT, CE, Pasaporte |
| Nombre            | Nombre completo del contratista                |  |
| Correo            | Correo electrónico institucional              | Para notificaciones/autenticación |
| Grupo_OAPI        | Grupo interno OAPI                            | Validación por lista |
| Perfil            | Perfil contractual                            | Profesional, Técnico, Auxiliar… |
| Estado            | Estado de la persona                          | Activo / Inactivo |
| Creado_en         | Fecha creación                                | Automático |
| Creado_por        | Usuario creador                               | Automático |

---

### 2. Hoja: Contratos
| Columna           | Descripción                                   | Notas |
|-------------------|-----------------------------------------------|-------|
| contrato_id       | Identificador único del contrato              | **PK** |
| persona_id        | Relación con persona                          | **FK** → Personas.persona_id |
| Numero_contrato   | Número oficial del contrato                   |  |
| Objeto            | Objeto contractual                            |  |
| Inicio            | Fecha de inicio                               |  |
| Fin               | Fecha de terminación                          |  |
| Plazo_meses       | Duración en meses                             |  |
| Valor_total       | Valor total del contrato                      |  |
| Valor_mensual     | Valor mensual del contrato                    |  |
| Origen_fondo      | Fuente de financiación                        |  |
| Tipo_vinculacion  | Modalidad                                     | OPS, Honorarios, etc. |
| Numero_CDP / Fecha_CDP | Certificado presupuestal                  | Opcional |
| Numero_RC / Fecha_RC   | Registro presupuestal                     | Opcional |
| Supervisor        | Supervisor del contrato                       |  |
| Estado            | Vigente, Terminado, Suspendido, etc.          |  |
| Carpeta_Drive_URL | Carpeta en Google Drive con soportes          |  |
| Creado_en / Creado_por | Auditoría                                | Automático |

---

### 3. Hoja: Pagos
| Columna           | Descripción                                   | Notas |
|-------------------|-----------------------------------------------|-------|
| pago_id           | Identificador único del pago                  | **PK** |
| contrato_id       | Relación con contrato                         | **FK** → Contratos.contrato_id |
| persona_id        | Relación con persona                          | (opcional, redundante) |
| Numero_cobro      | Consecutivo de la cuenta por contrato         | Se calcula automáticamente |
| Fecha_inicio / Fecha_fin | Periodo del cobro                       |  |
| Fecha_radicacion  | Fecha de radicación                          |  |
| Valor_pago        | Monto del pago                               |  |
| Mes_fiscal        | Mes fiscal (YYYY-MM)                         |  |
| Estado            | Borrador / Radicada / En revisión / Aprobada / Pagada / Rechazada | Flujo de validación |
| URL_PDF           | Enlace al PDF generado                        |  |
| URL_Soportes      | Enlace a soportes                             |  |
| Observaciones     | Notas adicionales                             |  |
| Creado_en / Creado_por | Auditoría                                | Automático |
| Aprobado_en / Aprobado_por | Auditoría de aprobación              | Automático |

---

### 4. Hoja: Obligaciones
_Obligaciones fijas del contrato, replicadas por cada periodo (histórico)._

| Columna           | Descripción                                   | Notas |
|-------------------|-----------------------------------------------|-------|
| obligacion_id     | Identificador único de la obligación (por periodo) | **PK** |
| contrato_id       | Relación con contrato                         | **FK** → Contratos.contrato_id |
| persona_id        | Relación con persona                          | (opcional, redundante) |
| Descripcion       | Texto fijo de la obligación contractual       |  |
| Actividades_realizadas | Actividades ejecutadas en el periodo      | Texto libre |
| Producto          | Resultado tangible del periodo                |  |
| Evidencia_URL     | Enlace a carpeta/archivo en Drive             |  |
| Periodo           | Mes o rango (ej. 2025-07)                     |  |
| Estado            | Pendiente / En curso / Cumplida               |  |
| Ultima_actualizacion | Fecha-hora de la última edición            | Automático |
| Actualizado_por   | Usuario que editó                             | Automático |

---

### 5. Hoja: Precontractual
| Columna           | Descripción                                   | Notas |
|-------------------|-----------------------------------------------|-------|
| pre_id            | Identificador único del registro              | **PK** |
| persona_id        | Relación con persona                          | **FK** → Personas.persona_id |
| Requisito         | Requisito solicitado (RUT, HV, etc.)          |  |
| Estado            | Pendiente / Recibido / Aprobado / Observado   |  |
| Fecha             | Fecha de la última actualización              |  |
| Observaciones     | Comentarios                                   |  |
| Soporte_URL       | Enlace a soporte                              |  |
| Responsable       | Quien revisa                                  |  |
| Actualizado_en / Actualizado_por | Auditoría                      | Automático |

---

### 6. Hoja: Roles
| Columna           | Descripción                                   | Notas |
|-------------------|-----------------------------------------------|-------|
| email             | Correo institucional                         | **PK lógico** |
| rol               | admin / revisor / contratista                | Control de permisos |

---

### 🔗 Relaciones Entre Entidades
- **Personas 1 → N Contratos**  
- **Contratos 1 → N Pagos**  
- **Contratos 1 → N Obligaciones**  
- **Personas 1 → N Precontractual**  
- *(Opcional)* Personas 1 → N Pagos (redundante)  
- *(Opcional)* Pagos 1 → N Obligaciones si se usa `pago_id` en Obligaciones  

---

### 📌 Integración futura
En el futuro, las entidades aquí definidas podrán migrarse a una base relacional (Postgres / Supabase) con la misma estructura, sin perder compatibilidad.

---

## 💻 Frontend (fase actual: sitio independiente en Vercel)
El frontend será un sitio **independiente** (HTML/CSS/JS) desplegado en **Vercel**, que consumirá la **API JSON** de Apps Script.

Estructura recomendada (minimalista):
- `index.html` → shell de la app + router por hash (`#/login`, `#/dashboard`)
- `styles.css` → estilos base
- `app.js` → router + `fetch` a la API (`https://script.google.com/macros/s/DEPLOYMENT_ID/exec`)
- `views/` → `login.html`, `dashboard.html`

Notas:
- La API expone rutas lógicas mediante `path` en el cuerpo: `{ path: "crearPagoBorrador", payload: {...} }`.
- Manejar **CORS** y **JSON** en Apps Script; en el front usar `fetch` con `Content-Type: application/json`.
 

---

## 💻 Frontend (futuro)

Más adelante se migrará a **React + Tailwind (PWA)**, integrando:
- Autenticación persistente.  
- Notificaciones push (Firebase).  
- Conexión directa a Supabase como backend.  

---

## ⚙️ Uso del Proyecto
- Toda la información se gestiona desde el **frontend web** (Apps Script o React en el futuro).  
- Los datos se almacenan en **Google Sheets** (backend).  
- Los informes se generan como **PDFs en Google Drive**, con enlace en `Pagos.URL_PDF`.  
- Los roles determinan permisos de acceso.  

---

## 🚀 Próximos Pasos
- [ ] Implementar interfaz para carga de cuentas de cobro.  
- [ ] Automatizar copia de obligaciones fijas por periodo.  
- [ ] Generación automática de PDF con tabla de obligaciones + ejecución presupuestal.  
- [ ] Migración progresiva a Supabase para escalabilidad.  
- [ ] Desarrollo de frontend PWA en React.  

---

## 👥 Autores
Proyecto desarrollado por **Equipo OAPI – UNGRD**.  
Responsable inicial: **[Tu Nombre / Correo institucional]**.  

---
