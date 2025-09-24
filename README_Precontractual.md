# Página de Seguimiento Precontractual

## 🎯 Descripción

La página de **Seguimiento Precontractual** es una herramienta de visualización que permite monitorear el progreso de los procesos precontractuales de cada candidato a contratista. Proporciona múltiples vistas para analizar los datos y identificar cuellos de botella en el proceso.

## 🚀 Características Principales

### 📊 Tres Vistas de Visualización

1. **Vista Timeline**: Muestra el progreso de cada candidato con barras horizontales representando la duración de cada etapa.
2. **Vista Gantt**: Diagrama de Gantt interactivo que muestra las tareas y su progreso temporal.
3. **Vista Analytics**: Gráficos y métricas avanzadas para análisis profundo de los datos.

### 🎛️ Filtros Disponibles

- **Por Candidato**: Filtrar por un candidato específico
- **Por Etapa**: Mostrar solo candidatos en una etapa particular
- **Por Estado**: Filtrar por "En proceso" o "Finalizado"

### 📈 Métricas Principales

- **Total de Candidatos**: Número total de candidatos en el sistema
- **En Proceso**: Candidatos que aún tienen etapas pendientes
- **Finalizados**: Candidatos que han completado todo el proceso
- **Tiempo Promedio**: Duración promedio de los procesos en días

## 🗃️ Estructura de Datos

La página consume datos de dos fuentes principales:

### Datos Precontractuales (`listPrecontractual`)
```javascript
{
  pre_id: "PRE-001",
  persona_id: "PERS-001", 
  Etapa: "Creación",
  Fase: "10 Inicio",
  Estado: "En proceso", // o "Finalizado"
  Evento: "Inicio",
  Intento: 1,
  Fecha: "2025-09-01",
  Responsable: "admin@ungrd.gov.co",
  Observaciones: "Observaciones del evento",
  Evidencia_URL: ""
}
```

### Datos de Personas (`listPersonas`)
```javascript
{
  persona_id: "PERS-001",
  nombre_completo: "Juan Pérez",
  cedula: "12345678",
  email: "juan.perez@example.com",
  telefono: "3001234567"
}
```

## 🔧 Funcionalidades Técnicas

### Cálculo de Duraciones

1. **Fecha de Inicio**: Primera fecha de un evento con estado "En proceso" en la etapa
2. **Fecha de Fin**: Última fecha de un evento con estado "Finalizado" en la etapa
3. **Duración**: Diferencia en días entre inicio y fin (o fecha actual si está en curso)

### Manejo de Estados

- **En proceso**: Etapas que no han completado todas sus fases
- **Finalizado**: Etapas que tienen al menos un evento finalizado en la última fase

### Intentos y Reprocesos

El sistema maneja múltiples intentos por etapa usando el campo `Intento`, permitiendo tracking de reprocesos.

## 🎨 Interfaz de Usuario

### Vista Timeline

- **Barras proporcionales**: El ancho de cada barra representa la duración relativa de la etapa
- **Códigos de color**: 
  - 🟡 Amarillo: En proceso
  - 🟢 Verde: Finalizado
- **Información detallada**: Tooltips con fechas y duración exacta

### Vista Gantt

- **Interactiva**: Permite cambiar entre vistas de día, semana y mes
- **Progreso visual**: Barras que muestran el porcentaje de completado
- **Tooltips informativos**: Detalles al pasar el mouse sobre las tareas

### Vista Analytics

- **Gráfico de barras**: Duración promedio por etapa
- **Gráfico circular**: Distribución de estados (En proceso vs Finalizado)
- **Lista de cuellos de botella**: Etapas que toman más tiempo en promedio
- **Ranking de tiempo**: Candidatos ordenados por tiempo total de proceso

## 🔧 Datos de Prueba

Para facilitar las pruebas y desarrollo, la página incluye un botón **"Datos de prueba"** que genera:

- 5 candidatos ficticios
- 5 etapas típicas del proceso precontractual
- Eventos distribuidos en el tiempo simulando un proceso real
- Diferentes estados para mostrar variedad en los datos

## 📱 Diseño Responsivo

La página está optimizada para diferentes dispositivos:

- **Desktop**: Vista completa con todos los elementos
- **Tablet**: Adaptación de filtros y gráficos
- **Mobile**: Interfaz optimizada para pantallas pequeñas

## 🛠️ Configuración Técnica

### Dependencias

- **Chart.js**: Para gráficos de barras y circulares
- **Frappe Gantt**: Para el diagrama de Gantt
- **Tailwind CSS**: Para estilos y responsividad
- **Material Icons**: Para iconografía

### Archivos Principales

- `src/pages/precontractual.html`: Estructura HTML de la página
- `src/pages-scripts/precontractual.js`: Lógica de la aplicación
- `src/styles/precontractual.css`: Estilos específicos
- `src/pages-scripts/sidebar-component.js`: Navegación actualizada

## 🔗 Integración con el Sistema

### API Endpoints Utilizados

- `POST /api` con `path: "listPrecontractual"`: Obtiene datos precontractuales
- `POST /api` con `path: "listPersonas"`: Obtiene datos de personas

### Autenticación

La página verifica automáticamente la autenticación del usuario y redirige al login si es necesario.

## 🚀 Próximas Mejoras

1. **Exportación de datos**: PDF, Excel para reportes
2. **Filtros avanzados**: Por fecha, responsable, intento
3. **Alertas**: Notificaciones de procesos que excedan tiempos esperados
4. **Dashboard personalizado**: Métricas específicas por rol de usuario
5. **Comparativas temporales**: Análisis de tendencias mes a mes

## 🐛 Solución de Problemas

### No se cargan los datos

1. Verificar que el servidor proxy esté ejecutándose en puerto 3000
2. Comprobar la conexión con Google Apps Script
3. Usar el botón "Datos de prueba" para verificar funcionalidad

### Error en el diagrama de Gantt

1. Verificar que haya datos con fechas válidas
2. Recargar la página si persisten errores
3. Cambiar entre vistas (Día/Semana/Mes) para actualizar

### Filtros no funcionan

1. Verificar que hay datos cargados
2. Limpiar filtros y aplicar de nuevo
3. Actualizar datos con el botón "Actualizar"
