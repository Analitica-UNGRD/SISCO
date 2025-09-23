// Debug Panel for Admin System (restored from backups)
class AdminDebugPanel {
  constructor() {
    this.isVisible = false;
    this.createDebugButton();
    this.hookConsole();
  }

  // Capture console messages into window.__debugConsoleLogs (keeps last 200)
  hookConsole() {
    if (window.__debugConsoleHooked) return;
    window.__debugConsoleHooked = true;
    window.__debugConsoleLogs = window.__debugConsoleLogs || [];
    ['log','info','warn','error','debug'].forEach(level => {
      const orig = console[level].bind(console);
      console[level] = function(...args) {
        try {
          window.__debugConsoleLogs.push({ ts: Date.now(), level, args: args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))) });
          if (window.__debugConsoleLogs.length > 200) window.__debugConsoleLogs.shift();
        } catch (e) {}
        orig(...args);
      };
    });
  }

  createDebugButton() {
    const button = document.createElement('button');
    button.id = 'debug-toggle-btn';
    button.className = 'fixed bottom-4 right-4 bg-gray-800 text-white p-3 rounded-full shadow-lg z-50 hover:bg-gray-700 transition-all';
    button.innerHTML = `<span class="material-icons text-sm">bug_report</span>`;
    button.title = 'Debug Panel';

    button.addEventListener('click', () => this.toggleDebugPanel());
    document.body.appendChild(button);
  }

  toggleDebugPanel() {
    if (this.isVisible) this.hideDebugPanel(); else this.showDebugPanel();
  }

  showDebugPanel() {
    const existingPanel = document.getElementById('debug-panel');
    if (existingPanel) existingPanel.remove();

    const panel = document.createElement('div');
    panel.id = 'debug-panel';
    panel.className = 'fixed bottom-20 right-4 bg-white border rounded-lg shadow-xl z-50 w-96 max-h-96 overflow-auto';
    panel.innerHTML = this.generateDebugContent();
    document.body.appendChild(panel);
    this.isVisible = true;

  // After panel is added, attach dynamic handlers and populate dynamic sections
  this.attachHandlers();

    const button = document.getElementById('debug-toggle-btn');
    if (button) { button.classList.add('bg-blue-600'); button.classList.remove('bg-gray-800'); }
  }

  hideDebugPanel() {
    const panel = document.getElementById('debug-panel'); if (panel) panel.remove();
    this.isVisible = false;
    const button = document.getElementById('debug-toggle-btn');
    if (button) { button.classList.add('bg-gray-800'); button.classList.remove('bg-blue-600'); }
  }

  generateDebugContent() {
    const testResults = window.testResults;
    const performanceData = window.performanceData;
    const adminManager = window.adminManager;

    // Build a tabbed, actionable debug panel with quick controls
    return `
      <div class="p-3">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-lg font-bold text-gray-800">Debug Panel</h3>
          <div class="flex items-center gap-2">
            <button id="dbg-refresh-btn" class="text-sm px-2 py-1 bg-gray-100 rounded">Refrescar</button>
            <button onclick="window.debugPanel.hideDebugPanel()" class="text-gray-500 hover:text-gray-700">
              <span class="material-icons text-sm">close</span>
            </button>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-2 mb-3">
          <button class="dbg-tab bg-blue-50 text-xs p-2 rounded" data-tab="overview">Resumen</button>
          <button class="dbg-tab bg-blue-50 text-xs p-2 rounded" data-tab="apiLogs">API Logs</button>
          <button class="dbg-tab bg-blue-50 text-xs p-2 rounded" data-tab="console">Consola</button>
          <button class="dbg-tab bg-blue-50 text-xs p-2 rounded" data-tab="tests">Pruebas</button>
          <button class="dbg-tab bg-blue-50 text-xs p-2 rounded" data-tab="backend">Backend</button>
          <button class="dbg-tab bg-blue-50 text-xs p-2 rounded" data-tab="perf">Performance</button>
        </div>

        <div id="dbg-content" class="text-xs text-gray-700">
          <div id="dbg-overview" class="dbg-section">
            ${this.generateSystemSection(adminManager)}
            <div class="mt-2">${this.generateTestingSection(testResults)}</div>
          </div>

          <div id="dbg-apiLogs" class="dbg-section hidden">
            <div class="mb-2 flex gap-2">
              <button id="dbg-refresh-api" class="px-2 py-1 bg-gray-200 rounded text-xs">Refrescar API Logs</button>
              <button id="dbg-export-api" class="px-2 py-1 bg-blue-600 text-white rounded text-xs">Exportar API Logs</button>
              <button id="dbg-clear-api" class="px-2 py-1 bg-red-500 text-white rounded text-xs">Limpiar</button>
            </div>
            <div id="dbg-api-list" class="max-h-64 overflow-auto bg-gray-50 p-2 rounded text-xs"></div>
          </div>

          <div id="dbg-console" class="dbg-section hidden">
            <div class="mb-2 flex gap-2">
              <button id="dbg-refresh-console" class="px-2 py-1 bg-gray-200 rounded text-xs">Refrescar Consola</button>
              <button id="dbg-clear-console" class="px-2 py-1 bg-red-500 text-white rounded text-xs">Limpiar Consola</button>
              <button id="dbg-export-console" class="px-2 py-1 bg-blue-600 text-white rounded text-xs">Exportar Consola</button>
            </div>
            <pre id="dbg-console-pre" class="max-h-64 overflow-auto bg-black text-white p-2 rounded text-xs"></pre>
          </div>

          <div id="dbg-tests" class="dbg-section hidden">
            ${this.generateTestingSection(testResults)}
            <pre id="dbg-tests-output" class="max-h-40 overflow-auto bg-gray-50 p-2 rounded text-xs mt-2" style="white-space:pre-wrap"></pre>
            <div class="mt-2 flex gap-2">
              <button id="dbg-run-quick" class="px-2 py-1 bg-green-600 text-white rounded text-xs">Run Quick Test</button>
              <button id="dbg-run-full" class="px-2 py-1 bg-purple-600 text-white rounded text-xs">Run Personas Structure</button>
            </div>
          </div>

          <div id="dbg-backend" class="dbg-section hidden">
            <div class="mb-2">Herramientas de backend</div>
            <div class="flex gap-2 mb-2">
              <button id="dbg-test-backend" class="px-2 py-1 bg-blue-600 text-white rounded text-xs">Test Conexión Backend</button>
              <button id="dbg-force-reload" class="px-2 py-1 bg-yellow-500 text-white rounded text-xs">Forzar Recarga</button>
            </div>
            <div id="dbg-backend-result" class="text-xs text-gray-600"></div>
          </div>

          <div id="dbg-perf" class="dbg-section hidden">
            ${this.generatePerformanceSection(performanceData)}
            <div class="mt-2"><button id="dbg-refresh-perf" class="px-2 py-1 bg-gray-200 rounded text-xs">Refrescar</button></div>
          </div>
        </div>

        <div class="mt-3 pt-3 border-t flex gap-2">
          <button id="dbg-export-all" class="bg-indigo-600 text-white px-3 py-2 rounded text-sm hover:bg-indigo-700">Exportar Debug</button>
          <button id="dbg-open-console" class="bg-gray-200 px-3 py-2 rounded text-sm">Abrir Consola (nueva ventana)</button>
          <button id="dbg-close" class="bg-gray-100 px-3 py-2 rounded text-sm" onclick="window.debugPanel.hideDebugPanel()">Cerrar</button>
        </div>
      </div>
    `;
  }

  // Attach handlers to buttons and tabs inside the panel
  attachHandlers() {
    const panel = document.getElementById('debug-panel');
    if (!panel) return;

    // Tabs
    panel.querySelectorAll('.dbg-tab').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = btn.dataset.tab;
        // toggle active styles
        panel.querySelectorAll('.dbg-tab').forEach(b => b.classList.remove('bg-blue-200'));
        btn.classList.add('bg-blue-200');
        // show/hide sections
        panel.querySelectorAll('.dbg-section').forEach(s => s.classList.add('hidden'));
        const el = panel.querySelector('#dbg-' + tab);
        if (el) el.classList.remove('hidden');
      });
    });

    // Activate default tab (Resumen)
    const defaultTab = panel.querySelector('.dbg-tab[data-tab="overview"]');
    if (defaultTab) defaultTab.click();

    // Refresh overall
    const refreshBtn = panel.querySelector('#dbg-refresh-btn');
    if (refreshBtn) refreshBtn.addEventListener('click', () => this.refreshAllSections());

    // API logs
    const refreshApi = panel.querySelector('#dbg-refresh-api');
    const clearApi = panel.querySelector('#dbg-clear-api');
    const exportApi = panel.querySelector('#dbg-export-api');
    if (refreshApi) refreshApi.addEventListener('click', () => this.renderApiLogs());
    if (clearApi) clearApi.addEventListener('click', () => { if (window.adminManager) { window.adminManager.__apiLogs = []; this.renderApiLogs(); } });
    if (exportApi) exportApi.addEventListener('click', () => this.exportApiLogs());

    // Console logs
    const refreshConsole = panel.querySelector('#dbg-refresh-console');
    const clearConsole = panel.querySelector('#dbg-clear-console');
    const exportConsole = panel.querySelector('#dbg-export-console');
    if (refreshConsole) refreshConsole.addEventListener('click', () => this.renderConsoleLogs());
    if (clearConsole) clearConsole.addEventListener('click', () => { window.__debugConsoleLogs = []; this.renderConsoleLogs(); });
    if (exportConsole) exportConsole.addEventListener('click', () => this.exportConsoleLogs());

    // Tests
    const runQuick = panel.querySelector('#dbg-run-quick');
    const runFull = panel.querySelector('#dbg-run-full');
    if (runQuick) runQuick.addEventListener('click', () => this.runQuickTest());
    if (runFull) runFull.addEventListener('click', () => this.testPersonasStructure());

    // Backend
    const testBackend = panel.querySelector('#dbg-test-backend');
    const forceReload = panel.querySelector('#dbg-force-reload');
    if (testBackend) testBackend.addEventListener('click', async () => { await this.testBackendConnection(); const res = document.getElementById('dbg-backend-result'); if (res) res.textContent = 'Test backend ejecutado. Ver notificaciones.'; });
    if (forceReload) forceReload.addEventListener('click', () => { location.reload(); });

    // Perf refresh
    const refreshPerf = panel.querySelector('#dbg-refresh-perf');
    if (refreshPerf) refreshPerf.addEventListener('click', () => { this.refreshPerformance(); });

    // Export all
    const exportAll = panel.querySelector('#dbg-export-all');
    if (exportAll) exportAll.addEventListener('click', () => this.exportDebugData());

    // Open console in new window
    const openConsole = panel.querySelector('#dbg-open-console');
    if (openConsole) openConsole.addEventListener('click', () => {
      const w = window.open('', '_blank');
      w.document.write('<pre>' + (JSON.stringify(window.__debugConsoleLogs || [], null, 2)) + '</pre>');
      w.document.title = 'Console logs';
    });

    // Initial render of lists
    this.renderApiLogs();
    this.renderConsoleLogs();
  }

  refreshAllSections() {
    this.renderApiLogs();
    this.renderConsoleLogs();
    this.refreshPerformance();
  }

  renderApiLogs() {
    const container = document.getElementById('dbg-api-list');
    if (!container) return;
    const logs = (window.adminManager && window.adminManager.__apiLogs) ? window.adminManager.__apiLogs : [];
    if (!logs.length) { container.innerHTML = '<div class="text-xs text-gray-500">No hay entradas de API</div>'; return; }
  container.innerHTML = logs.map(l => `<div class="p-1 border-b"><div class="text-xs text-gray-600">${new Date(l.ts).toLocaleTimeString()} - ${l.stage} - ${l.path}</div><div class="text-xs">${JSON.stringify(l.response || l.payload || l.error || '', null, 2)}</div></div>`).join('');
  }

  renderConsoleLogs() {
    const pre = document.getElementById('dbg-console-pre');
    if (!pre) return;
    const logs = window.__debugConsoleLogs || [];
  // Build a readable text block and unescape common escaped quotes
  const text = logs.map(l => `${new Date(l.ts).toISOString()} [${l.level}] ${l.args.join(' ')}`).join('\n');
  pre.textContent = text.replace(/\\\"/g, '"');
  }

  exportApiLogs() {
    const logs = (window.adminManager && window.adminManager.__apiLogs) ? window.adminManager.__apiLogs : [];
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `api-logs-${new Date().toISOString()}.json`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  exportConsoleLogs() {
    const logs = window.__debugConsoleLogs || [];
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `console-logs-${new Date().toISOString()}.json`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  refreshPerformance() {
    // Re-render the performance section by regenerating innerHTML for perf container
    const perf = document.getElementById('dbg-perf');
    if (!perf) return;
    const performanceData = window.performanceData;
    perf.innerHTML = `${this.generatePerformanceSection(performanceData)}<div class="mt-2"><button id="dbg-refresh-perf" class="px-2 py-1 bg-gray-200 rounded text-xs">Refrescar</button></div>`;
    // reattach the refresh handler
    const refreshPerf = perf.querySelector('#dbg-refresh-perf'); if (refreshPerf) refreshPerf.addEventListener('click', () => this.refreshPerformance());
  }

  generateTestingSection(testResults) {
    if (!testResults) {
      return `<div class="mb-4"><h4 class="font-semibold text-gray-700 mb-2">Testing Suite</h4><div class="text-sm text-gray-500">No hay resultados de testing disponibles</div></div>`;
    }

    const successRate = Math.round((testResults.passed / testResults.total) * 100);
    const statusColor = successRate >= 80 ? 'text-green-600' : successRate >= 50 ? 'text-yellow-600' : 'text-red-600';

    return `
      <div class="mb-4">
        <h4 class="font-semibold text-gray-700 mb-2">Testing Suite</h4>
        <div class="grid grid-cols-3 gap-2 mb-2">
          <div class="bg-green-100 p-2 rounded text-center"><div class="text-green-800 font-bold text-sm">${testResults.passed}</div><div class="text-xs text-green-600">Pasaron</div></div>
          <div class="bg-red-100 p-2 rounded text-center"><div class="text-red-800 font-bold text-sm">${testResults.failed}</div><div class="text-xs text-red-600">Fallaron</div></div>
          <div class="bg-blue-100 p-2 rounded text-center"><div class="text-blue-800 font-bold text-sm">${successRate}%</div><div class="text-xs text-blue-600">Éxito</div></div>
        </div>
        <div class="text-xs text-gray-500 mb-2">Duración: ${testResults.duration}ms | ${testResults.timestamp}</div>
        <div class="space-y-1 max-h-24 overflow-auto">${testResults.details.map(test => `<div class="flex items-center gap-2 text-xs"><span class="${test.status === 'passed' ? 'text-green-500' : 'text-red-500'}">${test.status === 'passed' ? 'PASSED' : 'FAILED'}</span><span class="flex-1">${test.name}</span></div>`).join('')}</div>
        <button onclick="window.debugPanel.testBackendConnection()" class="mt-2 w-full bg-blue-500 text-white px-2 py-1 text-xs rounded hover:bg-blue-600 transition-colors">Test Conexión Backend</button>
        <button onclick="window.debugPanel.testPersonasStructure()" class="mt-1 w-full bg-purple-500 text-white px-2 py-1 text-xs rounded hover:bg-purple-600 transition-colors">Analizar Estructura Personas</button>
      </div>
    `;
  }

  generatePerformanceSection(performanceData) {
    if (!performanceData) return `<div class="mb-4"><h4 class="font-semibold text-gray-700 mb-2">Performance</h4><div class="text-sm text-gray-500">No hay datos de performance disponibles</div></div>`;
    const pageLoadStats = performanceData.getStats ? performanceData.getStats('page_load_complete') : null;
    const memoryStats = performanceData.getStats ? performanceData.getStats('memory_used') : null;
    return `
      <div class="mb-4">
        <h4 class="font-semibold text-gray-700 mb-2">Performance</h4>
        <div class="grid grid-cols-2 gap-2 mb-2">
          <div class="bg-gray-100 p-2 rounded"><div class="text-xs text-gray-600">Carga de Página</div><div class="font-bold text-sm">${pageLoadStats ? pageLoadStats.latest.toFixed(0) + 'ms' : 'N/A'}</div></div>
          <div class="bg-gray-100 p-2 rounded"><div class="text-xs text-gray-600">Memoria</div><div class="font-bold text-sm">${memoryStats ? (memoryStats.latest / 1024 / 1024).toFixed(1) + 'MB' : 'N/A'}</div></div>
        </div>
        <div class="text-xs text-gray-500">${performanceData.timestamp || ''}</div>
      </div>
    `;
  }

  generateSystemSection(adminManager) {
    if (!adminManager) return `<div class="mb-4"><h4 class="font-semibold text-gray-700 mb-2">Sistema</h4><div class="text-sm text-gray-500">AdminManager no disponible</div></div>`;
    const currentSection = adminManager.currentSection || 'none';
    const contexto = adminManager.ctx || {};
    const apiLogs = adminManager.__apiLogs?.length || 0;
    return `
      <div class="mb-4">
        <h4 class="font-semibold text-gray-700 mb-2">Sistema</h4>
        <div class="space-y-1 text-xs">
          <div class="flex justify-between"><span class="text-gray-600">Sección Actual:</span><span class="font-medium">${currentSection}</span></div>
          <div class="flex justify-between"><span class="text-gray-600">Persona:</span><span class="font-medium">${contexto.persona?.nombre || 'Ninguna'}</span></div>
          <div class="flex justify-between"><span class="text-gray-600">Contrato:</span><span class="font-medium">${contexto.contrato?.objeto || 'Ninguno'}</span></div>
          <div class="flex justify-between"><span class="text-gray-600">API Logs:</span><span class="font-medium">${apiLogs}</span></div>
          <div class="flex justify-between"><span class="text-gray-600">Componentes:</span><span class="font-medium">${adminManager.components?.size || 0}</span></div>
        </div>
      </div>
    `;
  }

  exportDebugData() {
    const debugData = {
      timestamp: new Date().toISOString(),
      testResults: window.testResults,
      performanceData: window.performanceData ? { timestamp: window.performanceData.timestamp, metricsCount: window.performanceData.metrics.size } : null,
      system: window.adminManager ? { currentSection: window.adminManager.currentSection, context: window.adminManager.ctx, componentsLoaded: window.adminManager.components?.size || 0, apiLogsCount: window.adminManager.__apiLogs?.length || 0 } : null,
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    const blob = new Blob([JSON.stringify(debugData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `admin-debug-${new Date().toISOString().slice(0,19)}.json`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    console.log('Debug data exported');
  }

  async testBackendConnection() {
    const statusDiv = document.createElement('div'); statusDiv.className = 'fixed top-4 right-4 bg-blue-500 text-white p-3 rounded shadow-lg z-50'; statusDiv.textContent = 'Probando conexión...'; document.body.appendChild(statusDiv);
    try {
      const startTime = Date.now();
      const result = await window.adminManager.apiFetch('listPersonas', {});
      const duration = Date.now() - startTime;
      statusDiv.className = result && result.ok ? 'fixed top-4 right-4 bg-green-500 text-white p-3 rounded shadow-lg z-50' : 'fixed top-4 right-4 bg-red-500 text-white p-3 rounded shadow-lg z-50';
      if (result && result.ok) { const count = result.items ? result.items.length : 0; statusDiv.innerHTML = `<div>Conexión exitosa</div><div class="text-xs">Tiempo: ${duration}ms</div><div class="text-xs">Personas: ${count}</div>`; }
      else { statusDiv.innerHTML = `<div>Error de conexión</div><div class="text-xs">Tiempo: ${duration}ms</div><div class="text-xs">Estado: ${result ? 'Sin datos' : 'Sin respuesta'}</div>`; }
      // Also populate backend result area inside debug panel if present
      const backendResultEl = document.getElementById('dbg-backend-result');
      if (backendResultEl) {
        backendResultEl.innerHTML = `<div class="text-xs">Tiempo: ${duration}ms | Personas: ${result?.items?.length || 0}</div><pre class="mt-1 text-xs bg-gray-50 p-2 rounded">${JSON.stringify(result, null, 2)}</pre>`;
      }
    } catch (error) { statusDiv.className = 'fixed top-4 right-4 bg-red-500 text-white p-3 rounded shadow-lg z-50'; statusDiv.innerHTML = `<div>Error de red</div><div class="text-xs">${error.message}</div>`; }
    setTimeout(() => { if (statusDiv.parentNode) statusDiv.parentNode.removeChild(statusDiv); }, 4000);
  }

  async testPersonasStructure() {
    const statusDiv = document.createElement('div');
    statusDiv.className = 'fixed top-4 left-4 bg-blue-500 text-white p-3 rounded shadow-lg z-50 max-w-md';
    statusDiv.innerHTML = '<div>Analizando estructura de personas...</div>';
    document.body.appendChild(statusDiv);

    try {
      const result = await window.adminManager.apiFetch('listPersonas', {});
      const testsOut = document.getElementById('dbg-tests-output');
      const summary = [];
      summary.push('ANALISIS COMPLETO DE PERSONAS');
      summary.push('Resultado OK: ' + Boolean(result && result.ok));
      summary.push('Total personas (raw): ' + (result?.items?.length || 0));

      if (result && result.ok && Array.isArray(result.items) && result.items.length > 0) {
        const first = result.items[0];
        summary.push('Primera persona (resumen): ' + (first.nombre || first.Nombre || first.name || 'N/A'));
        summary.push('Campos disponibles: ' + Object.keys(first).join(', '));

        if (testsOut) testsOut.textContent = summary.join('\n') + '\n\n' + JSON.stringify(result, null, 2);
        statusDiv.innerHTML = `<div>Análisis completo</div><div class="text-xs">Personas: ${result.items.length}</div><div class="text-xs">Detalle abajo</div>`;
        statusDiv.className = 'fixed top-4 left-4 bg-green-500 text-white p-3 rounded shadow-lg z-50 max-w-md';
      } else {
        statusDiv.innerHTML = `<div>Error en estructura</div><div class="text-xs">Ver panel de debug</div>`;
        statusDiv.className = 'fixed top-4 left-4 bg-red-500 text-white p-3 rounded shadow-lg z-50 max-w-md';
        if (testsOut) testsOut.textContent = 'Error en estructura: no hay items';
      }

      // refresh API/console/perf views in panel
      this.renderApiLogs();
      this.renderConsoleLogs();
      this.refreshPerformance();
      this.refreshAllSections();
    } catch (error) {
      console.error('Error en análisis:', error);
      statusDiv.innerHTML = `<div>Error de conexión</div><div class="text-xs">${error.message}</div>`;
      statusDiv.className = 'fixed top-4 left-4 bg-red-500 text-white p-3 rounded shadow-lg z-50 max-w-md';
    }

    setTimeout(() => { if (statusDiv.parentNode) statusDiv.parentNode.removeChild(statusDiv); }, 8000);
  }

  async runQuickTest() {
    const button = document.querySelector('[onclick="window.debugPanel.runQuickTest()"]') || document.getElementById('dbg-run-quick'); if (button) { button.textContent = 'Testing...'; button.disabled = true; }
    try {
      const checks = { adminManager: !!window.adminManager, currentSection: !!window.adminManager?.currentSection, dynamicContent: !!document.getElementById('dynamic-content'), contextPersona: !!window.adminManager?.ctx?.persona, apiLogs: (window.adminManager?.__apiLogs?.length || 0) > 0 };
      const passed = Object.values(checks).filter(Boolean).length; const total = Object.keys(checks).length;
      const out = [];
      out.push('Quick Test Results: ' + passed + '/' + total);
      Object.entries(checks).forEach(([key, value]) => out.push(`${value ? 'OK' : 'FAIL'} ${key}`));
      // display inside panel
      const testsOut = document.getElementById('dbg-tests-output');
      if (testsOut) testsOut.textContent = out.join('\n');
      // also store results globally for generateTestingSection
      window.testResults = { passed, total, failed: total - passed, duration: 0, timestamp: new Date().toISOString(), details: Object.keys(checks).map(k => ({ name: k, status: checks[k] ? 'passed' : 'failed' })) };
      // refresh tests section visual summary
      const testsSection = document.getElementById('dbg-tests'); if (testsSection) testsSection.innerHTML = `${this.generateTestingSection(window.testResults)}<pre id="dbg-tests-output" class="max-h-40 overflow-auto bg-gray-50 p-2 rounded text-xs mt-2" style="white-space:pre-wrap">${testsOut ? testsOut.textContent : ''}</pre><div class="mt-2 flex gap-2"><button id="dbg-run-quick" class="px-2 py-1 bg-green-600 text-white rounded text-xs">Run Quick Test</button><button id="dbg-run-full" class="px-2 py-1 bg-purple-600 text-white rounded text-xs">Run Personas Structure</button></div>`;
      // reattach handlers for buttons inside tests section
      this.attachHandlers();
    } catch (error) { console.error('Quick test error:', error); } finally { if (button) { button.textContent = 'Test Rápido'; button.disabled = false; } }
  }
}

// Auto-init only if not already present (admin-main creates one as well)
document.addEventListener('DOMContentLoaded', () => {
  if (!window.debugPanel) {
    window.debugPanel = new AdminDebugPanel();
    console.log('Debug Panel initialized (restored from backups)');
  }
});
