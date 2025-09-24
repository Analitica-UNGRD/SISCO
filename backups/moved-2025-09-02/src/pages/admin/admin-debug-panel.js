// Debug Panel for Admin System (moved to backups)
class AdminDebugPanel {
  constructor() {
    this.isVisible = false;
    this.createDebugButton();
  }

  createDebugButton() {
    const button = document.createElement('button');
    button.id = 'debug-toggle-btn';
    button.className = 'fixed bottom-4 right-4 bg-gray-800 text-white p-3 rounded-full shadow-lg z-50 hover:bg-gray-700 transition-all';
    button.innerHTML = `
      <span class="material-icons text-sm">bug_report</span>
    `;
    button.title = 'Debug Panel';

    button.addEventListener('click', () => {
      this.toggleDebugPanel();
    });

    document.body.appendChild(button);
  }

  toggleDebugPanel() {
    if (this.isVisible) {
      this.hideDebugPanel();
    } else {
      this.showDebugPanel();
    }
  }

  showDebugPanel() {
    const existingPanel = document.getElementById('debug-panel');
    if (existingPanel) {
      existingPanel.remove();
    }

    const panel = document.createElement('div');
    panel.id = 'debug-panel';
    panel.className = 'fixed bottom-20 right-4 bg-white border rounded-lg shadow-xl z-50 w-96 max-h-96 overflow-auto';

    panel.innerHTML = this.generateDebugContent();

    document.body.appendChild(panel);
    this.isVisible = true;

    const button = document.getElementById('debug-toggle-btn');
    if (button) {
      button.classList.add('bg-blue-600');
      button.classList.remove('bg-gray-800');
    }
  }

  hideDebugPanel() {
    const panel = document.getElementById('debug-panel');
    if (panel) {
      panel.remove();
    }
    this.isVisible = false;

    const button = document.getElementById('debug-toggle-btn');
    if (button) {
      button.classList.add('bg-gray-800');
      button.classList.remove('bg-blue-600');
    }
  }

  generateDebugContent() {
    const testResults = window.testResults;
    const performanceData = window.performanceData;
    const adminManager = window.adminManager;

    return `
      <div class="p-4">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-bold text-gray-800">Debug Panel</h3>
          <button onclick="window.debugPanel.hideDebugPanel()" class="text-gray-500 hover:text-gray-700">
            <span class="material-icons text-sm">close</span>
          </button>
        </div>

        ${this.generateTestingSection(testResults)}
        ${this.generatePerformanceSection(performanceData)}
        ${this.generateSystemSection(adminManager)}

        <div class="mt-4 pt-4 border-t">
          <div class="grid grid-cols-2 gap-2">
            <button onclick="window.debugPanel.exportDebugData()" class="bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700">
              Exportar Datos
            </button>
            <button onclick="window.debugPanel.runQuickTest()" class="bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700">
              Test Rápido
            </button>
          </div>
        </div>
      </div>
    `;
  }

  generateTestingSection(testResults) {
    if (!testResults) {
      return `
        <div class="mb-4">
          <h4 class="font-semibold text-gray-700 mb-2">Testing Suite</h4>
          <div class="text-sm text-gray-500">No hay resultados de testing disponibles</div>
        </div>
      `;
    }

    const successRate = Math.round((testResults.passed / testResults.total) * 100);
    const statusColor = successRate >= 80 ? 'text-green-600' : successRate >= 50 ? 'text-yellow-600' : 'text-red-600';

    return `
      <div class="mb-4">
        <h4 class="font-semibold text-gray-700 mb-2">Testing Suite</h4>
        <div class="grid grid-cols-3 gap-2 mb-2">
          <div class="bg-green-100 p-2 rounded text-center">
            <div class="text-green-800 font-bold text-sm">${testResults.passed}</div>
            <div class="text-xs text-green-600">Pasaron</div>
          </div>
          <div class="bg-red-100 p-2 rounded text-center">
            <div class="text-red-800 font-bold text-sm">${testResults.failed}</div>
            <div class="text-xs text-red-600">Fallaron</div>
          </div>
          <div class="bg-blue-100 p-2 rounded text-center">
            <div class="text-blue-800 font-bold text-sm">${successRate}%</div>
            <div class="text-xs text-blue-600">Éxito</div>
          </div>
        </div>
        <div class="text-xs text-gray-500 mb-2">
          Duración: ${testResults.duration}ms | ${testResults.timestamp}
        </div>
        <div class="space-y-1 max-h-24 overflow-auto">
          ${testResults.details.map(test => `
            <div class="flex items-center gap-2 text-xs">
              <span class="${test.status === 'passed' ? 'text-green-500' : 'text-red-500'}">${test.status === 'passed' ? 'PASSED' : 'FAILED'}</span>
              <span class="flex-1">${test.name}</span>
            </div>
          `).join('')}
        </div>
        <button 
          onclick="window.debugPanel.testBackendConnection()" 
          class="mt-2 w-full bg-blue-500 text-white px-2 py-1 text-xs rounded hover:bg-blue-600 transition-colors"
        >
          Test Conexión Backend
        </button>
        <button 
          onclick="window.debugPanel.testPersonasStructure()" 
          class="mt-1 w-full bg-purple-500 text-white px-2 py-1 text-xs rounded hover:bg-purple-600 transition-colors"
        >
          Analizar Estructura Personas
        </button>
      </div>
    `;
  }

  generatePerformanceSection(performanceData) {
    if (!performanceData) {
      return `
        <div class="mb-4">
          <h4 class="font-semibold text-gray-700 mb-2">Performance</h4>
          <div class="text-sm text-gray-500">No hay datos de performance disponibles</div>
        </div>
      `;
    }

    const pageLoadStats = performanceData.getStats('page_load_complete');
    const memoryStats = performanceData.getStats('memory_used');

    return `
      <div class="mb-4">
        <h4 class="font-semibold text-gray-700 mb-2">Performance</h4>
        <div class="grid grid-cols-2 gap-2 mb-2">
          <div class="bg-gray-100 p-2 rounded">
            <div class="text-xs text-gray-600">Carga de Página</div>
            <div class="font-bold text-sm">${pageLoadStats ? pageLoadStats.latest.toFixed(0) + 'ms' : 'N/A'}</div>
          </div>
          <div class="bg-gray-100 p-2 rounded">
            <div class="text-xs text-gray-600">Memoria</div>
            <div class="font-bold text-sm">${memoryStats ? (memoryStats.latest / 1024 / 1024).toFixed(1) + 'MB' : 'N/A'}</div>
          </div>
        </div>
        <div class="text-xs text-gray-500">${performanceData.timestamp}</div>
      </div>
    `;
  }

  generateSystemSection(adminManager) {
    if (!adminManager) {
      return `
        <div class="mb-4">
          <h4 class="font-semibold text-gray-700 mb-2">Sistema</h4>
          <div class="text-sm text-gray-500">AdminManager no disponible</div>
        </div>
      `;
    }

    const currentSection = adminManager.currentSection || 'none';
    const contexto = adminManager.ctx || {};
    const apiLogs = adminManager.__apiLogs?.length || 0;

    return `
      <div class="mb-4">
        <h4 class="font-semibold text-gray-700 mb-2">Sistema</h4>
        <div class="space-y-1 text-xs">
          <div class="flex justify-between">
            <span class="text-gray-600">Sección Actual:</span>
            <span class="font-medium">${currentSection}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Persona:</span>
            <span class="font-medium">${contexto.persona?.nombre || 'Ninguna'}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Contrato:</span>
            <span class="font-medium">${contexto.contrato?.objeto || 'Ninguno'}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">API Logs:</span>
            <span class="font-medium">${apiLogs}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Componentes:</span>
            <span class="font-medium">${adminManager.components?.size || 0}</span>
          </div>
        </div>
      </div>
    `;
  }

  exportDebugData() {
    const debugData = {
      timestamp: new Date().toISOString(),
      testResults: window.testResults,
      performanceData: window.performanceData ? {
        timestamp: window.performanceData.timestamp,
        metricsCount: window.performanceData.metrics.size
      } : null,
      system: window.adminManager ? {
        currentSection: window.adminManager.currentSection,
        context: window.adminManager.ctx,
        componentsLoaded: window.adminManager.components?.size || 0,
        apiLogsCount: window.adminManager.__apiLogs?.length || 0
      } : null,
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    const blob = new Blob([JSON.stringify(debugData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `admin-debug-${new Date().toISOString().slice(0, 19)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log('Debug data exported');
  }

  async testBackendConnection() {
    const statusDiv = document.createElement('div');
    statusDiv.className = 'fixed top-4 right-4 bg-blue-500 text-white p-3 rounded shadow-lg z-50';
    statusDiv.textContent = 'Probando conexión...';
    document.body.appendChild(statusDiv);

    try {
      const startTime = Date.now();
      const result = await window.adminManager.apiFetch('listPersonas', {});
      const endTime = Date.now();
      const duration = endTime - startTime;

      statusDiv.className = result && result.ok ? 
        'fixed top-4 right-4 bg-green-500 text-white p-3 rounded shadow-lg z-50' :
        'fixed top-4 right-4 bg-red-500 text-white p-3 rounded shadow-lg z-50';

      if (result && result.ok) {
        const count = result.items ? result.items.length : 0;
        statusDiv.innerHTML = `
          <div>Conexión exitosa</div>
          <div class="text-xs">Tiempo: ${duration}ms</div>
          <div class="text-xs">Personas: ${count}</div>
        `;
      } else {
        statusDiv.innerHTML = `
          <div>Error de conexión</div>
          <div class="text-xs">Tiempo: ${duration}ms</div>
          <div class="text-xs">Estado: ${result ? 'Sin datos' : 'Sin respuesta'}</div>
        `;
      }
    } catch (error) {
      statusDiv.className = 'fixed top-4 right-4 bg-red-500 text-white p-3 rounded shadow-lg z-50';
      statusDiv.innerHTML = `
        <div>Error de red</div>
        <div class="text-xs">${error.message}</div>
      `;
    }

    setTimeout(() => {
      if (statusDiv.parentNode) {
        statusDiv.parentNode.removeChild(statusDiv);
      }
    }, 4000);
  }

  async testPersonasStructure() {
    const statusDiv = document.createElement('div');
    statusDiv.className = 'fixed top-4 left-4 bg-blue-500 text-white p-3 rounded shadow-lg z-50 max-w-md';
    statusDiv.innerHTML = '<div>Analizando estructura de personas...</div>';
    document.body.appendChild(statusDiv);

    try {
      const result = await window.adminManager.apiFetch('listPersonas', {});
      console.log('=== ANALISIS COMPLETO DE PERSONAS ===');
      console.log('1. Resultado completo:', JSON.stringify(result, null, 2));

      if (result && result.ok && result.items) {
        console.log('2. Numero de personas:', result.items.length);
        console.log('3. Primera persona raw:', JSON.stringify(result.items[0], null, 2));

        if (result.items[0]) {
          const firstPerson = result.items[0];
          console.log('4. Campos disponibles:', Object.keys(firstPerson));
          console.log('5. Valores de campos:');
          Object.keys(firstPerson).forEach(key => {
            console.log(`   ${key}: "${firstPerson[key]}" (tipo: ${typeof firstPerson[key]})`);
          });
        }

        statusDiv.innerHTML = `
          <div>Análisis completo</div>
          <div class="text-xs">Personas: ${result.items.length}</div>
          <div class="text-xs">Ver consola para detalles</div>
        `;
        statusDiv.className = 'fixed top-4 left-4 bg-green-500 text-white p-3 rounded shadow-lg z-50 max-w-md';
      } else {
        statusDiv.innerHTML = `
          <div>Error en estructura</div>
          <div class="text-xs">Ver consola</div>
        `;
        statusDiv.className = 'fixed top-4 left-4 bg-red-500 text-white p-3 rounded shadow-lg z-50 max-w-md';
      }
    } catch (error) {
      console.error('Error en análisis:', error);
      statusDiv.innerHTML = `
        <div>Error de conexión</div>
        <div class="text-xs">${error.message}</div>
      `;
      statusDiv.className = 'fixed top-4 left-4 bg-red-500 text-white p-3 rounded shadow-lg z-50 max-w-md';
    }

    setTimeout(() => {
      if (statusDiv.parentNode) {
        statusDiv.parentNode.removeChild(statusDiv);
      }
    }, 8000);
  }

  async runQuickTest() {
    const button = document.querySelector('[onclick="window.debugPanel.runQuickTest()"]');
    if (button) {
      button.textContent = 'Testing...';
      button.disabled = true;
    }

    try {
      const checks = {
        adminManager: !!window.adminManager,
        currentSection: !!window.adminManager?.currentSection,
        dynamicContent: !!document.getElementById('dynamic-content'),
        contextPersona: !!window.adminManager?.ctx?.persona,
        apiLogs: (window.adminManager?.__apiLogs?.length || 0) > 0
      };

      const passed = Object.values(checks).filter(Boolean).length;
      const total = Object.keys(checks).length;

      console.log('Quick Test Results:', { passed, total, checks });

      Object.entries(checks).forEach(([key, value]) => {
        console.log(`${value ? 'OK' : 'FAIL'} ${key}`);
      });

    } catch (error) {
      console.error('Quick test error:', error);
    } finally {
      if (button) {
        button.textContent = 'Test Rápido';
        button.disabled = false;
      }
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.debugPanel = new AdminDebugPanel();
  console.log('Debug Panel initialized (moved to backups)');
});
