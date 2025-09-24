# Mejoras de Seguridad - Sistema de Sesión

## Resumen de Cambios

Se han implementado mejoras importantes de seguridad en el sistema de autenticación para proteger mejor las sesiones de usuario.

## Nuevas Funcionalidades

### 1. Expiración Automática de Sesión (1 hora)

- **Duración**: Las sesiones ahora expiran automáticamente después de **1 hora** desde el login
- **Verificación**: El sistema verifica la validez de la sesión en tiempo real
- **Limpieza**: Los datos de sesión se eliminan automáticamente al expirar

### 2. Redirección Inicial al Dashboard

- **Cambio**: Al iniciar la aplicación, ahora redirige al **Dashboard** en lugar de Contratistas
- **Archivo modificado**: `start-servers.ps1` ahora abre `dashboard.html`
- **Beneficio**: Mejor experiencia inicial con vista general del sistema

### 3. Monitoreo Continuo de Sesión

- **Verificación automática**: Cada 30 segundos se verifica el estado de la sesión
- **Detección de inactividad**: Alerta cuando el usuario ha estado inactivo
- **Redirección automática**: Lleva al login cuando la sesión expira

### 4. Indicador Visual de Tiempo Restante

- **Ubicación**: Esquina superior derecha de la pantalla
- **Visibilidad**: Aparece cuando quedan menos de 20 minutos
- **Colores**:
  - 🔵 Azul: Más de 10 minutos restantes
  - 🟠 Naranja: Entre 5-10 minutos restantes  
  - 🔴 Rojo (parpadeante): Menos de 5 minutos restantes

### 5. Alertas de Expiración

- **Advertencia temprana**: Aviso cuando quedan 5 minutos
- **Advertencia de inactividad**: Aviso cuando el usuario ha estado inactivo por 45 minutos
- **Mensaje final**: Notificación antes de redireccionar al login

## Archivos Modificados

### Sistema de Autenticación
- `src/lib/auth.js`: Lógica mejorada de validación de sesión
- `src/lib/auth-system.js`: Redirección automática (ya existía)

### Nuevos Archivos de Seguridad
- `src/lib/session-guard.js`: Guardian de sesión con monitoreo continuo
- `src/lib/session-indicator.js`: Indicador visual de tiempo restante

### Páginas Protegidas
Se agregó protección automática a todas las páginas principales:
- `src/pages/dashboard.html`
- `src/pages/contratistas.html`  
- `src/pages/personas.html`
- `src/pages/precontractual.html`
- `src/pages/admin/admin.html`

### Configuración de Inicio
- `start-servers.ps1`: Cambio de URL inicial a dashboard

## Comportamiento del Sistema

### Al Iniciar Sesión
1. El usuario ingresa credenciales válidas
2. Se crea un token con timestamp actual
3. Se redirige al **dashboard** (no a contratistas)
4. Se inicia el monitoreo automático de sesión

### Durante la Sesión
1. **Monitoreo continuo**: Verificación cada 30 segundos
2. **Detección de actividad**: Mouse, teclado, scroll, touch
3. **Indicador visual**: Aparece cuando quedan ≤20 minutos
4. **Alertas progresivas**: Avisos a los 5 minutos y por inactividad

### Al Expirar la Sesión
1. **Detección automática**: El sistema detecta la expiración
2. **Limpieza de datos**: Se eliminan tokens y datos de localStorage
3. **Mensaje informativo**: Se muestra por qué se cerró la sesión
4. **Redirección**: Lleva automáticamente al login

## Beneficios de Seguridad

1. **Protección contra acceso no autorizado**: Las sesiones abandonadas se cierran automáticamente
2. **Transparencia para el usuario**: Avisos claros sobre el estado de la sesión
3. **Mejor experiencia**: El usuario sabe cuánto tiempo le queda
4. **Cumplimiento de seguridad**: Sesiones de duración limitada como práctica recomendada

## Configuración

### Tiempos Configurables
Los siguientes valores se pueden ajustar en el código:

```javascript
// En auth.js - Duración de sesión
const oneHour = 60 * 60 * 1000; // 1 hora

// En session-guard.js - Intervalos de verificación  
setInterval(..., 30000); // Verificar cada 30 segundos

// En session-guard.js - Tiempo de inactividad para alerta
const maxInactiveTime = 45 * 60 * 1000; // 45 minutos

// En session-indicator.js - Cuando mostrar indicador
if (timeRemaining <= 20) // Mostrar con ≤20 minutos
```

## Compatibilidad

- ✅ Compatible con todas las páginas existentes
- ✅ No afecta la funcionalidad actual
- ✅ Funciona con y sin conexión a internet
- ✅ Degrada graciosamente si algún componente falla

## Notas de Implementación

1. **Carga automática**: Los scripts se cargan automáticamente en cada página protegida
2. **Manejo de errores**: Fallas silenciosas para evitar interrumpir la experiencia
3. **Actividad del usuario**: Se detecta cualquier interacción (mouse, teclado, touch)
4. **Páginas públicas**: Login e index no tienen restricciones de sesión

## Mantenimiento

Para deshabilitar temporalmente alguna función:

```javascript
// Para deshabilitar el indicador visual
// Comentar la línea en las páginas HTML:
// <script type="module" src="../lib/session-indicator.js"></script>

// Para deshabilitar el guardian de sesión  
// Comentar la línea en las páginas HTML:
// <script type="module" src="../lib/session-guard.js"></script>
```

---

**Fecha de implementación**: Septiembre 2025  
**Versión**: 2.0 - Mejoras de Seguridad
