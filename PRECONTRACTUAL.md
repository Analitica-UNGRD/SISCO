# Seguimiento Precontractual — README

## 🎯 Objetivo
Construir un sistema **hoja‑driven** que, por **candidato** y por **etapa**, mida el **tiempo** que tarda cada parte del proceso precontractual, identifique **cuellos de botella** (etapas/fases lentas) y muestre **quiénes se demoran más** en ser contratados.  
El sistema debe contabilizar días **en curso** cuando una etapa **no** está cerrada y manejar **reprocesos** mediante el campo **Intento**.


## 🗂️ Modelo de datos en Google Sheets (definitivo)

### 1) Hoja `PRE_CATALOGO` (catálogo maestro)
Fuente única de verdad para las opciones de **Etapa** y **Fase**, su **orden** y si **cierran** o no la etapa.

**Columnas (exactas):**
- **Etapa**: nombre de la etapa (por ejemplo, Creación, Solicitud CDP, Exámenes médicos, Contratación).
- **FaseNombre**: nombre limpio de la fase, sin numeración (por ejemplo, Inicio, Elaboración, Subsanación, Finalización…).
- **OrdenFase**: número que define el orden de la fase dentro de su etapa. Es **local a cada etapa** y puede ser 10, 20, 30… o 40/60; no existe obligación de usar 90/100.
- **FaseEtiqueta**: texto mostrado en los desplegables; combina el orden con el nombre (por ejemplo, “10 Inicio”, “40 Subsanación”).  
  Esta es la etiqueta que verá y elegirá la persona usuaria.
- **Finaliza_etapa**: indicador verdadero/falso que señala si **esa fase cierra la etapa**. Esta es la **única señal de cierre**.
- **Activo**: indicador verdadero/falso para mostrar u ocultar la fase en los desplegables, sin afectar el histórico.
- **OrdenEtapa**: número opcional para establecer un **orden global** de etapas en la interfaz y reportes (por ejemplo, 10=primera, 20=segunda).

**Notas clave:**
- La **numeración de fases** (OrdenFase) es **solo para ordenar** dentro de la etapa; puede repetirse entre etapas.
- El **cierre de etapa** no depende del número, sino de **Finaliza_etapa = TRUE**.


### 2) Hoja `Precontractual` (tabla de hechos / eventos)
Una fila representa **un evento** en una fase de una etapa para un candidato.

**Columnas (exactas):**
- **pre_id**
- **persona_id**
- **Etapa**
- **Fase**: debe almacenar la **FaseEtiqueta** tal como está definida en `PRE_CATALOGO`.
- **Estado**: valores canónicos **En proceso** o **Finalizado** (se recomienda mapear cualquier variante a estos dos).
- **Evento**: opcional para trazabilidad (por ejemplo, Inicio, Observación, Subsanación, Repite, Resultado, Finaliza).
- **Intento**: entero mayor o igual a 1 para controlar **reprocesos** de una **misma etapa**.
- **Fecha**
- **Responsable**
- **Observaciones**
- **Evidencia_URL**

**Contrato de datos recomendado:** la combinación **(Etapa, Fase)** en `Precontractual` debe existir en `PRE_CATALOGO` como **(Etapa, FaseEtiqueta)** con **Activo = TRUE** en el momento de captura.


## 🔽 Desplegables (comportamiento esperado)
- **Etapa**: lista con **todas las etapas activas** del catálogo, opcionalmente ordenadas por **OrdenEtapa**.
- **Fase**: lista **dependiente** de la etapa seleccionada, muestra **FaseEtiqueta**, ordenada por **OrdenFase** y filtrada por **Activo**.
- Para **crear** una etapa o fase nuevas, se **agregan** en `PRE_CATALOGO`. No se capturan valores libres en `Precontractual`.


## 🧠 Reglas de negocio

### Estados canónicos
- **En proceso** para etapas/fases en curso.
- **Finalizado** para cierres o aprobaciones.  
Se recomienda normalizar cualquier variante operativa a estos dos estados antes de calcular métricas.

### Cálculo de duración por candidato y etapa
- **Inicio (Start)**: la fecha del **primer evento** de la etapa cuyo estado sea **En proceso**. Si no existe, se usa el **primer evento** registrado en la etapa.
- **Fin (End)**: la fecha del **último evento** de la etapa cuyo estado sea **Finalizado** y cuya fase esté marcada en el catálogo con **Finaliza_etapa = TRUE**.  
  Si no existe un evento que cumpla ambas condiciones, la etapa se considera **En curso** y su fin se toma como la **fecha actual**.
- **Días de duración**: número de días entre **Inicio** y **Fin**, con redondeo hacia arriba a día completo.
- **Orden para el cálculo**: los eventos se ordenan por **Fecha**; si hay empates, se utiliza el **OrdenFase** asociado a la FaseEtiqueta en el catálogo.

### Intentos (reproceso de etapa)
- El **Intento** comienza en **1** para cada combinación de candidato y etapa.
- Mientras la etapa no haya sido cerrada, todos los eventos pertenecen al **mismo Intento**.
- Si se debe **repetir la etapa completa** (por ejemplo, exámenes médicos inválidos), se registra un evento de repetición y el **Intento** se incrementa en una unidad. A partir de entonces, los nuevos eventos se asignan a ese **nuevo Intento**.
- Se pueden medir **duraciones por Intento** y **duración total de la etapa** (desde el inicio del primer intento hasta el cierre del último), considerando el estado **En curso** cuando no exista cierre.

### Principios de flexibilidad
- Nuevas etapas o fases se incorporan en el catálogo y aparecen automáticamente en los desplegables.
- El histórico no se altera al desactivar fases, gracias al campo **Activo**.
- La definición del cierre por **Finaliza_etapa** evita depender de convenciones numéricas rígidas.


## 📊 Requisitos de visualización

### Vista por candidato
- Mostrar **una barra por etapa** con la **duración en días**.
- Diferenciar **En curso** y **Finalizado** con colores o etiquetas.
- Incluir información de **fecha de inicio**, **fecha de fin** (o “hoy” si está en curso) y **estado** en la descripción o tooltip.
- El **orden de las barras** puede ser por **OrdenEtapa**, por **duración** (de mayor a menor) o alfabético.

### Resumen global
- Listados o gráficos que muestren las **etapas más lentas** (promedio/mediana de días).
- Indicadores de **trabajo en curso** (cantidad de etapas actualmente abiertas).
- Rankings de **candidatos con mayor tiempo total** en proceso (sumatoria de etapas).
- Opcionalmente, desglose por **Intentos** para visualizar retrabajos.

### Buenas prácticas de análisis
- Asegurar consistencia en los nombres de Etapa y Fase mediante el catálogo.
- Mantener los estados canónicos para evitar ambigüedades en el cálculo.
- Usar **OrdenEtapa** solo si se requiere un orden fijo en la interfaz o reportes.


## ✅ Criterios de aceptación
1. **Desplegables correctos**: Etapa muestra solo opciones activas; Fase depende de la Etapa, usa FaseEtiqueta, respeta OrdenFase y Activo.
2. **Captura consistente**: `Precontractual.Fase` almacena siempre la FaseEtiqueta; no se capturan valores libres fuera del catálogo.
3. **Cálculo fiel**: la duración por etapa usa el primer evento en En proceso (o el primero disponible) como inicio, y el último evento Finalizado en una fase marcada como cierre en el catálogo como fin; si no existe, se considera En curso con fin en la fecha actual.
4. **Intentos controlados**: el número de Intento se incrementa solo cuando se reinicia la etapa completa; mientras no cierre, los eventos se mantienen en el mismo Intento.
5. **Visualización útil**: existen vistas por candidato y un resumen global que permiten identificar cuellos de botella y candidatos con mayor tiempo total en proceso.
6. **Escalabilidad y gobierno**: nuevas etapas/fases se administran en `PRE_CATALOGO` sin impactar el histórico, y se reflejan automáticamente en la captura y los análisis.


## 📝 Glosario breve
- **Etapa**: bloque principal del proceso (por ejemplo, Solicitud CDP).
- **Fase**: paso dentro de una etapa (por ejemplo, Subsanación). En los desplegables se muestra como **FaseEtiqueta**.
- **FaseEtiqueta**: representación visible de la fase que incluye su orden y nombre (por ejemplo, “40 Subsanación”).
- **OrdenFase**: número que define el orden de una fase dentro de su etapa. Es local a la etapa.
- **Finaliza_etapa**: indicador que define si una fase cierra la etapa.
- **Intento**: contador de repeticiones de una misma etapa para un candidato.
- **En curso / Finalizado**: estados canónicos para el cálculo de duraciones.