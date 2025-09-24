/** Router shim - delegates to handlers defined in domain modules **/
function doGet(e) {
  try {
    if (e && e.parameter && e.parameter.path === 'ping') {
      return buildJsonOutput({ ok: true, ping: new Date().toISOString() });
    }
    return buildJsonOutput({ ok: true, info: 'POST { path, payload } to use the API.' });
  } catch (err) {
    return buildJsonOutput({ ok: false, error: String(err) });
  }
}

function doPost(e) {
  try {
    var body = {};
    if (e && e.postData && e.postData.contents) {
      try { body = JSON.parse(e.postData.contents); } catch (_) { body = {}; }
    }
    var path = body && body.path;
    var payload = body && body.payload;

    if (!path) return buildJsonOutput({ ok: false, error: 'Missing "path"' });

    if (API_HANDLERS && API_HANDLERS[path]) {
      try {
        return buildJsonOutput(API_HANDLERS[path](payload || {}));
      } catch (hErr) {
        return buildJsonOutput({ ok: false, error: String(hErr) });
      }
    }
    return buildJsonOutput({ ok: false, error: 'Unknown path: ' + path });
  } catch (err) {
    return buildJsonOutput({ ok: false, error: String(err) });
  }
}

function buildJsonOutput(obj) {
  var out = ContentService.createTextOutput(JSON.stringify(obj));
  out.setMimeType(ContentService.MimeType.JSON);
  return out;
}

// API_HANDLERS map is populated by domain modules. Example below lists common handlers expected to exist.
var API_HANDLERS = API_HANDLERS || {};

// helper to list registered API paths
function listPaths() {
  try {
    var keys = Object.keys(API_HANDLERS || {}).sort();
    return { ok: true, paths: keys };
  } catch (e) { return { ok: false, error: String(e) }; }
}

API_HANDLERS['listPaths'] = listPaths;

/** Dashboard handlers **/

function handleDashboardSummary(payload) {
  try {
    // Obtener datos básicos para el dashboard
    var contratistasActivos = getContratistasActivos();
    var contratosVencimiento = getContratosProximosVencer();
    var personasEnProceso = getPersonasEnProcesoContratacion();
    var pagosMes = getPagosMesActual();
    var alertas = getAlertas();
    var precontractualResumen = getPrecontractualResumen();
    
    return { 
      ok: true, 
      data: {
        contratistasActivos: contratistasActivos,
        contratosVencimiento: contratosVencimiento,
        personasEnProceso: personasEnProceso,
        pagosMes: pagosMes,
        alertas: alertas,
        precontractualResumen: precontractualResumen
      }
    };
  } catch (err) { 
    return { ok: false, error: String(err) }; 
  }
}

function getContratistasActivos() {
  try {
    var sh = getSheet(CONFIG.SHEETS.PERSONAS);
    var data = sheetToObjects(sh);
    var count = 0;
    
    for (var i = 0; i < data.length; i++) {
      var persona = data[i];
      // Contar solo contratistas con Estado "Activo"
      if (String(persona.Estado || '').trim().toLowerCase() === 'activo') {
        count++;
      }
    }
    
    return count;
  } catch (err) {
    Logger.log('Error getting contratistas activos: ' + err);
    return 0;
  }
}

function getContratosProximosVencer() {
  try {
    var sh = getSheet(CONFIG.SHEETS.CONTRATOS);
    var data = sheetToObjects(sh);
    var hoy = new Date();
    var fechaLimite = new Date();
    fechaLimite.setDate(hoy.getDate() + 30); // 30 días desde hoy
    
    var contratosProximos = [];
    
    for (var i = 0; i < data.length; i++) {
      var contrato = data[i];
      var fechaFin = contrato.Fin;
      
      // Solo considerar contratos vigentes
      if (String(contrato.Estado || '').trim().toLowerCase() !== 'vigente') {
        continue;
      }
      
      if (fechaFin) {
        var fechaFinDate;
        if (fechaFin instanceof Date) {
          fechaFinDate = fechaFin;
        } else {
          fechaFinDate = new Date(fechaFin);
        }
        
        // Si la fecha de fin está entre hoy y 30 días
        if (fechaFinDate >= hoy && fechaFinDate <= fechaLimite) {
          contratosProximos.push({
            contrato_id: contrato.contrato_id,
            numero: contrato.Numero_contrato,
            persona_id: contrato.persona_id,
            fechaFin: fechaFinDate,
            diasRestantes: Math.ceil((fechaFinDate - hoy) / (1000 * 60 * 60 * 24))
          });
        }
      }
    }
    
    return {
      count: contratosProximos.length,
      contratos: contratosProximos.slice(0, 5) // Solo los primeros 5 para el dashboard
    };
  } catch (err) {
    Logger.log('Error getting contratos próximos a vencer: ' + err);
    return { count: 0, contratos: [] };
  }
}

function getPersonasEnProcesoContratacion() {
  try {
    var sh = getSheet(CONFIG.SHEETS.PRECONTRACTUAL);
    var data = sheetToObjects(sh);
    var count = 0;
    var personasEnProceso = [];
    
    for (var i = 0; i < data.length; i++) {
      var registro = data[i];
      var etapa = String(registro.Etapa || '').trim();
      var estado = String(registro.Estado || '').trim().toLowerCase();
      
      // Si no está en la última etapa O está en la última etapa pero en proceso
      if (etapa !== "Acta de Inicio y Designacion de Supervision" || estado === "en proceso") {
        count++;
        personasEnProceso.push({
          persona_id: registro.persona_id,
          etapa: etapa,
          estado: estado,
          fechaCreacion: registro.Fecha_evento || registro.Creado_en
        });
      }
    }
    
    return {
      count: count,
      personas: personasEnProceso
    };
  } catch (err) {
    Logger.log('Error getting personas en proceso: ' + err);
    return { count: 0, personas: [] };
  }
}

function getPagosMesActual() {
  try {
    // Obtener valor total mensual de contratos activos
    var shContratos = getSheet(CONFIG.SHEETS.CONTRATOS);
    var contratos = sheetToObjects(shContratos);
    var totalEsperado = 0;
    
    for (var i = 0; i < contratos.length; i++) {
      var contrato = contratos[i];
      if (String(contrato.Estado || '').trim().toLowerCase() === 'vigente') {
        var valorMensual = Number(contrato.Valor_mensual || 0);
        totalEsperado += valorMensual;
      }
    }
    
    // Obtener pagos realizados este mes
    var shPagos = getSheet(CONFIG.SHEETS.PAGOS);
    var pagos = sheetToObjects(shPagos);
    var hoy = new Date();
    var inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    var finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
    var totalPagado = 0;
    
    for (var i = 0; i < pagos.length; i++) {
      var pago = pagos[i];
      var fechaPago = pago.Fecha_pago;
      
      if (fechaPago) {
        var fechaPagoDate;
        if (fechaPago instanceof Date) {
          fechaPagoDate = fechaPago;
        } else {
          fechaPagoDate = new Date(fechaPago);
        }
        
        if (fechaPagoDate >= inicioMes && fechaPagoDate <= finMes) {
          totalPagado += Number(pago.Valor || 0);
        }
      }
    }
    
    return {
      esperado: totalEsperado,
      pagado: totalPagado,
      pendiente: totalEsperado - totalPagado
    };
  } catch (err) {
    Logger.log('Error getting pagos mes actual: ' + err);
    return { esperado: 0, pagado: 0, pendiente: 0 };
  }
}

function getAlertas() {
  try {
    var alertas = [];
    
    // Alertas de contratos próximos a vencer
    var contratosVencimiento = getContratosProximosVencer();
    if (contratosVencimiento.count > 0) {
      for (var i = 0; i < contratosVencimiento.contratos.length; i++) {
        var contrato = contratosVencimiento.contratos[i];
        alertas.push({
          tipo: 'warning',
          titulo: 'Contrato próximo a vencer',
          mensaje: 'Contrato ' + contrato.numero + ' vence en ' + contrato.diasRestantes + ' días',
          prioridad: contrato.diasRestantes <= 7 ? 'alta' : 'media'
        });
      }
    }
    
    // Alertas de pagos retrasados (simplificado por ahora)
    var pagosMes = getPagosMesActual();
    if (pagosMes.pendiente > 0) {
      alertas.push({
        tipo: 'info',
        titulo: 'Pagos pendientes',
        mensaje: 'Hay $' + formatearNumero(pagosMes.pendiente) + ' pendientes de pago este mes',
        prioridad: 'media'
      });
    }
    
    return alertas;
  } catch (err) {
    Logger.log('Error getting alertas: ' + err);
    return [];
  }
}

function getPrecontractualResumen() {
  try {
    var sh = getSheet(CONFIG.SHEETS.PRECONTRACTUAL);
    var data = sheetToObjects(sh);
    var resumen = {};
    var personasPorEtapa = {};
    
    for (var i = 0; i < data.length; i++) {
      var registro = data[i];
      var etapa = String(registro.Etapa || '').trim();
      var estado = String(registro.Estado || '').trim().toLowerCase();
      var personaId = registro.persona_id;
      
      // Solo procesar si no está completamente finalizado
      if (etapa !== "Acta de Inicio y Designacion de Supervision" || estado !== "finalizada") {
        if (!personasPorEtapa[personaId]) {
          personasPorEtapa[personaId] = {
            persona_id: personaId,
            etapaActual: etapa,
            estadoActual: estado,
            fechaUltima: registro.Fecha_evento || registro.Creado_en
          };
        } else {
          // Mantener la más reciente
          var fechaActual = new Date(registro.Fecha_evento || registro.Creado_en);
          var fechaAnterior = new Date(personasPorEtapa[personaId].fechaUltima);
          if (fechaActual > fechaAnterior) {
            personasPorEtapa[personaId].etapaActual = etapa;
            personasPorEtapa[personaId].estadoActual = estado;
            personasPorEtapa[personaId].fechaUltima = registro.Fecha_evento || registro.Creado_en;
          }
        }
      }
    }
    
    return {
      totalPersonas: Object.keys(personasPorEtapa).length,
      personas: Object.values(personasPorEtapa).slice(0, 10) // Primeras 10 para el dashboard
    };
  } catch (err) {
    Logger.log('Error getting precontractual resumen: ' + err);
    return { totalPersonas: 0, personas: [] };
  }
}

// Función helper para formatear números
function formatearNumero(numero) {
  return Number(numero).toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  });
}

// Registrar el handler del dashboard
API_HANDLERS['dashboardSummary'] = handleDashboardSummary;
