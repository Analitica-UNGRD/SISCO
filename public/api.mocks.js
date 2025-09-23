// api.mocks.js
// Provee mocks y flag USE_MOCKS. Cambia USE_MOCKS = false para usar el backend real.
export const USE_MOCKS = false;

export function fetchSessionInfoMock() {
  // Por defecto devolvemos un usuario admin para desarrollo local.
  // Cambia role a 'contratista' si quieres probar la vista de contratista.
  return new Promise(resolve => setTimeout(() => resolve({ email: 'admin@gestiondelriesgo.gov.co', role: 'admin', name: 'Admin Demo' }), 300));
}

export function fetchDashboardSummaryMock(role = 'admin', email = '') {
  return new Promise(resolve => setTimeout(() => {
    if (role === 'admin') {
      resolve({
        _mock: true,
        counts: { contractors: 124, expiring30: 12, obligations: 5, paymentsMonth: '$45,231' },
        series: { months: ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'], payments: [12000,19000,30000,25000,22000,30000,35000,40000,38000,42000,45000,50000], obligations: [15000,18000,28000,26000,20000,29000,33000,38000,36000,40000,43000,48000] },
        alerts: [
          { title: 'Expiring Contracts', text: 'Contract #C456 for "Innovate LLC" expires in 7 days.' },
          { title: 'Delayed Payments', text: 'Payment for invoice #INV0078 is 3 days overdue.' }
        ]
      });
    }
    // contratista
    resolve({
      _mock: true,
      counts: { contractors: 2, expiring30: 1, obligations: 1, paymentsMonth: '$2,100' },
      series: { months: ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'], payments: [200,400,800,600,700,500,900,1000,800,700,600,900], obligations: [300,200,400,350,300,250,450,500,400,300,350,400] },
      alerts: [ { title: 'Expiring Contract', text: 'Tu contrato #C789 vence en 5 días.' } ]
    });
  }, 400));
}
