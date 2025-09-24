/** Dashboard handlers **/

// Ensure API_HANDLERS is initialized
if (typeof API_HANDLERS === 'undefined') {
  var API_HANDLERS = {};
}

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
    console.error('Error getting contratistas activos:', err);
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
    console.error('Error getting contratos próximos a vencer:', err);
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
    console.error('Error getting personas en proceso:', err);
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
    console.error('Error getting pagos mes actual:', err);
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
    console.error('Error getting alertas:', err);
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
    console.error('Error getting precontractual resumen:', err);
    return { totalPersonas: 0, personas: [] };
  }
}

// Función helper para formatear números
function formatearNumero(numero) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(numero);
}

// Registrar el handler
API_HANDLERS = API_HANDLERS || {};
API_HANDLERS['dashboardSummary'] = handleDashboardSummary;
