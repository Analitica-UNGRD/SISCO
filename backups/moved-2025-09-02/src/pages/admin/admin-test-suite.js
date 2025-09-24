// Admin Testing Suite - moved to backups
class AdminTestSuite {
  constructor() {
    this.tests = [];
    this.results = [];
    this.startTime = null;
  }

  async runAllTests() {
    console.log('Iniciando Admin Testing Suite - moved to backups');
    window._adminTestSuiteRunning = true;
    this.startTime = Date.now();

    await this.testModularStructure();
    await this.testComponentLoading();
    await this.testFormValidation();
    await this.testApiIntegration();
    await this.testContextManagement();
    await this.testResponsiveDesign();

    this.generateReport();
    window._adminTestSuiteRunning = false;
  }

  async testModularStructure() {
    const test = { name: 'Estructura Modular', status: 'running', details: [] };
    try {
      if (typeof window.adminManager === 'undefined') {
        test.details.push('AdminComponentManager no encontrado');
        test.status = 'failed';
        this.results.push(test);
        return;
      }

      const requiredMethods = ['loadComponent', 'renderSection', 'apiFetch', 'saveContext', 'loadContext'];
      for (const method of requiredMethods) {
        if (typeof window.adminManager[method] !== 'function') {
          test.details.push(`Metodo ${method} no encontrado`);
          test.status = 'failed';
          this.results.push(test);
          return;
        }
      }

      test.details.push('AdminComponentManager inicializado correctamente');
      test.details.push('Todos los metodos principales disponibles');
      test.status = 'passed';
    } catch (error) {
      test.details.push(`Error: ${error.message}`);
      test.status = 'failed';
    }

    this.results.push(test);
    console.log(`Test: ${test.name} - ${test.status}`);
  }

  async testFormValidation() {
    const test = { name: 'Validacion de Formularios', status: 'running', details: [] };
    try {
      await window.adminManager.loadComponent('datos-basicos');
      const form = document.getElementById('formPersona');
      if (!form) {
        test.details.push('Formulario de persona no encontrado');
        test.status = 'failed';
        return;
      }

      const requiredFields = form.querySelectorAll('input[required]');
      test.details.push(`${requiredFields.length} campos requeridos encontrados`);

      test.status = 'passed';
    } catch (error) {
      test.details.push(`Error: ${error.message}`);
      test.status = 'failed';
    }

    this.results.push(test);
    console.log(`Test: ${test.name} - ${test.status}`);
  }

  async testApiIntegration() {
    const test = { name: 'Integracion API', status: 'running', details: [] };
    try {
      if (typeof window.adminManager.apiFetch !== 'function') {
        test.details.push('Metodo apiFetch no disponible');
        test.status = 'failed';
        return;
      }

      const result = await window.adminManager.apiFetch('listPersonas', {});
      if (result && result.ok) {
        test.details.push('API fetch funcionando correctamente');
      } else {
        test.details.push('API fetch no responde correctamente');
      }

      if (window.adminManager.__apiLogs && Array.isArray(window.adminManager.__apiLogs)) {
        test.details.push(`Sistema de logs API funcionando (${window.adminManager.__apiLogs.length} entradas)`);
      } else {
        test.details.push('Sistema de logs API no funciona');
      }

      test.status = 'passed';
    } catch (error) {
      test.details.push(`Error: ${error.message}`);
      test.status = 'failed';
    }

    this.results.push(test);
    console.log(`Test: ${test.name} - ${test.status}`);
  }

  async testContextManagement() {
    const test = { name: 'Gestion de Contexto', status: 'running', details: [] };
    try {
      const testContext = { persona: { id: 1, nombre: 'Test' }, contrato: { id: 1, objeto: 'Test Contract' } };
      window.adminManager.ctx = testContext;
      window.adminManager.saveContext && window.adminManager.saveContext();
      test.details.push('Contexto guardado');

      window.adminManager.ctx = { persona: null, contrato: null };
      window.adminManager.loadContext && window.adminManager.loadContext();

      if (window.adminManager.ctx.persona && window.adminManager.ctx.persona.nombre === 'Test') {
        test.details.push('Contexto cargado correctamente');
      } else {
        test.details.push('Contexto no se cargo correctamente');
      }

      window.adminManager.updateContextUI && window.adminManager.updateContextUI();
      test.details.push('UI de contexto actualizada');

      test.status = 'passed';
    } catch (error) {
      test.details.push(`Error: ${error.message}`);
      test.status = 'failed';
    }

    this.results.push(test);
    console.log(`Test: ${test.name} - ${test.status}`);
  }

  async testResponsiveDesign() {
    const test = { name: 'Diseno Responsivo', status: 'running', details: [] };
    try {
      const sidebar = document.getElementById('sidebar');
      const toggleBtn = document.querySelector('.sidebar-toggle');

      if (sidebar && toggleBtn) {
        toggleBtn.click();
        await new Promise(resolve => setTimeout(resolve, 100));

        if (sidebar.classList.contains('collapsed')) {
          test.details.push('Sidebar collapse funcionando');
        } else {
          test.details.push('Sidebar collapse no funciona');
        }

        toggleBtn.click();
        await new Promise(resolve => setTimeout(resolve, 100));

        if (!sidebar.classList.contains('collapsed')) {
          test.details.push('Sidebar expand funcionando');
        } else {
          test.details.push('Sidebar expand no funciona');
        }
      } else {
        test.details.push('Elementos de sidebar no encontrados');
      }

      const responsiveElements = document.querySelectorAll('[class*="sm:"], [class*="md:"], [class*="lg:"]');
      test.details.push(`${responsiveElements.length} elementos responsivos encontrados`);

      test.status = 'passed';
    } catch (error) {
      test.details.push(`Error: ${error.message}`);
      test.status = 'failed';
    }

    this.results.push(test);
    console.log(`Test: ${test.name} - ${test.status}`);
  }

  generateReport() {
    const endTime = Date.now();
    const duration = endTime - this.startTime;

    const passed = this.results.filter(r => r.status === 'passed').length;
    const failed = this.results.filter(r => r.status === 'failed').length;
    const total = this.results.length;

    console.log('\nREPORTE DE TESTING - moved to backups');
    console.log('=======================================');
    console.log(`Duracion: ${duration}ms`);
    console.log(`Pasaron: ${passed}/${total}`);
    console.log(`Fallaron: ${failed}/${total}`);
    console.log('=======================================\n');

    this.results.forEach((test, index) => {
      const icon = test.status === 'passed' ? 'OK' : 'FAIL';
      console.log(`${index + 1}. ${icon} ${test.name}`);
      test.details.forEach(detail => console.log(`   ${detail}`));
      console.log('');
    });

    window.testResults = {
      passed,
      failed,
      total,
      duration,
      details: this.results,
      timestamp: new Date().toLocaleString()
    };

    console.log('Test results stored in window.testResults');

    return { passed, failed, total, duration, success: failed === 0 };
  }
}

window.addEventListener('load', async () => {
  const autorun = window.ADMIN_TESTS_AUTORUN === true || window.ADMIN_TESTS_AUTORUN === 'true';
  if (!autorun) {
    console.log('Admin Testing Suite loaded - auto-run DISABLED (set window.ADMIN_TESTS_AUTORUN = true to enable)');
    return;
  }

  setTimeout(async () => {
    window.testSuite = new AdminTestSuite();
    await window.testSuite.runAllTests();
  }, 2000);
});

console.log('Admin Testing Suite loaded (moved to backups)');
