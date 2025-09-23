// TestSuite para el Panel de Administración
const AdminTestSuite = {
  runAllTests() {
    console.log('[TEST] Ejecutando todas las pruebas...');
    // Implementación de pruebas aquí
    console.log('[TEST] Todas las pruebas completadas');
  },
  
  loadTestData() {
    console.log('[TEST] Cargando datos de prueba...');
    return {
      success: true,
      message: 'Datos de prueba cargados'
    };
  }
};

// Hacerlo disponible globalmente
window.AdminTestSuite = AdminTestSuite;
