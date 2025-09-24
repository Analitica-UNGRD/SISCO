// templates.js
// Exporta dos plantillas: adminTemplate y contractorTemplate.
// Reutilizan el layout visual de Dashboard_ejemplo.html y mantienen los IDs
function escapeHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

export function adminTemplate(name = 'Admin') {
  name = escapeHtml(name);
  return `
  <div class="flex h-screen">
    <aside class="sidebar collapsed flex-shrink-0 text-gray-300" aria-expanded="false">
      <div class="p-6">
        <h1 class="text-2xl font-bold text-white menu-title">Panel - Admin</h1>
          <p class="text-sm text-gray-300 mt-1 menu-label">${name}</p>
      </div>
      <nav class="mt-6">
        <ul>
          <li class="px-6 py-3" data-section="dashboard"><a class="flex items-center" href="/src/pages/dashboard.html"><span class="material-icons">dashboard</span><span class="ml-4 menu-label">Dashboard</span></a></li>
          <li class="px-6 py-3" data-section="contratistas"><a class="flex items-center" href="/src/pages/contratistas.html"><span class="material-icons">people</span><span class="ml-4 menu-label">Contratistas</span></a></li>
          <li class="px-6 py-3" data-section="admin"><a class="flex items-center" href="/src/pages/admin/admin.html"><span class="material-icons">admin_panel_settings</span><span class="ml-4 menu-label">Admin</span></a></li>
        </ul>
      </nav>
      <div class="absolute bottom-0 w-full p-6 bottom-area">
        <div class="flex items-center justify-between">
          <a class="flex items-center text-gray-300 hover:bg-gray-700 px-4 py-2 rounded-md" href="#">
            <span class="material-icons">settings</span>
            <span class="ml-4 menu-label">Settings</span>
          </a>
          <button class="pin-btn text-gray-300 hover:text-white focus:outline-none px-2 py-2" title="Pin sidebar" aria-pressed="false">
            <span class="material-icons">push_pin</span>
          </button>
        </div>
      </div>
    </aside>
    <main class="flex-1 p-8 overflow-y-auto">
      <header class="flex justify-between items-center mb-8">
        <div>
          <h2 class="text-3xl font-bold text-gray-800">Dashboard</h2>
          <p class="text-gray-500">Bienvenido, ${name}</p>
        </div>
        <div class="flex items-center space-x-4">
          <div class="relative"><input class="bg-white rounded-full py-2 px-4 pl-10 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Search..." type="text"/><span class="material-icons absolute left-3 top-2.5 text-gray-400">search</span></div>
          <button class="bg-white rounded-full p-2 hover:bg-gray-200"><span class="material-icons text-gray-600">notifications</span></button>
          <div id="userAvatar" class="w-10 h-10 rounded-full bg-gray-200"></div>
        </div>
      </header>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div id="kpi-contractors" class="bg-blue-100 p-6 rounded-2xl">
          <div class="flex justify-between items-start"><h3 class="text-lg font-medium text-blue-800">Active contractors</h3><span class="material-icons text-blue-800">groups</span></div>
          <p class="text-4xl font-bold text-blue-900 mt-2">--</p>
        </div>
        <div id="kpi-expiring" class="bg-purple-100 p-6 rounded-2xl">
          <div class="flex justify-between items-start"><h3 class="text-lg font-medium text-purple-800">Contracts expiring soon</h3><span class="material-icons text-purple-800">event_busy</span></div>
          <p class="text-4xl font-bold text-purple-900 mt-2">--</p>
        </div>
        <div id="kpi-obligations" class="bg-cyan-100 p-6 rounded-2xl">
          <div class="flex justify-between items-start"><h3 class="text-lg font-medium text-cyan-800">Pending obligations</h3><span class="material-icons text-cyan-800">assignment_late</span></div>
          <p class="text-4xl font-bold text-cyan-900 mt-2">--</p>
        </div>
        <div id="kpi-payments" class="bg-yellow-100 p-6 rounded-2xl">
          <div class="flex justify-between items-start"><h3 class="text-lg font-medium text-yellow-800">Payments this month</h3><span class="material-icons text-yellow-800">monetization_on</span></div>
          <p class="text-4xl font-bold text-yellow-900 mt-2">--</p>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 bg-white p-6 rounded-2xl">
          <h3 class="text-xl font-semibold text-gray-800 mb-4">Payments vs Obligations</h3>
          <canvas id="paymentsChart"></canvas>
        </div>
        <div class="bg-white p-6 rounded-2xl">
          <h3 class="text-xl font-semibold text-gray-800 mb-4">Alerts</h3>
          <div id="alertsList" class="space-y-4">
            <!-- Alerts rendered here -->
          </div>
        </div>
      </div>
    </main>
  </div>
  `;
}

export function contractorTemplate(name = 'Contratista') {
  name = escapeHtml(name);
  return `
  <div class="flex h-screen">
    <aside class="sidebar collapsed flex-shrink-0 text-gray-300" aria-expanded="false">
      <div class="p-6">
        <h1 class="text-2xl font-bold text-white menu-title">Mi Panel</h1>
          <p class="text-sm text-gray-300 mt-1 menu-label">${name}</p>
      </div>
      <nav class="mt-6">
        <ul>
          <li class="px-6 py-3" data-section="dashboard"><a class="flex items-center" href="/src/pages/dashboard.html"><span class="material-icons">dashboard</span><span class="ml-4 menu-label">Dashboard</span></a></li>
          <li class="px-6 py-3" data-section="contratistas"><a class="flex items-center" href="/src/pages/contratistas.html"><span class="material-icons">people</span><span class="ml-4 menu-label">Contratistas</span></a></li>
          <li class="px-6 py-3" data-section="admin"><a class="flex items-center" href="/src/pages/admin/admin.html"><span class="material-icons">admin_panel_settings</span><span class="ml-4 menu-label">Admin</span></a></li>
        </ul>
      </nav>
      <div class="absolute bottom-0 w-full p-6 bottom-area">
        <div class="flex items-center justify-between">
          <a class="flex items-center text-gray-300 hover:bg-gray-700 px-4 py-2 rounded-md" href="#">
            <span class="material-icons">settings</span>
            <span class="ml-4 menu-label">Settings</span>
          </a>
          <button class="pin-btn text-gray-300 hover:text-white focus:outline-none px-2 py-2" title="Pin sidebar" aria-pressed="false">
            <span class="material-icons">push_pin</span>
          </button>
        </div>
      </div>
    </aside>
    <main class="flex-1 p-8 overflow-y-auto">
      <header class="flex justify-between items-center mb-8">
        <div>
          <h2 class="text-3xl font-bold text-gray-800">Mi Panel</h2>
          <p class="text-gray-500">Bienvenido, ${name}</p>
        </div>
        <div class="flex items-center space-x-4">
          <div class="relative"><input class="bg-white rounded-full py-2 px-4 pl-10 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Search..." type="text"/><span class="material-icons absolute left-3 top-2.5 text-gray-400">search</span></div>
          <button class="bg-white rounded-full p-2 hover:bg-gray-200"><span class="material-icons text-gray-600">notifications</span></button>
          <div id="userAvatar" class="w-10 h-10 rounded-full bg-gray-200"></div>
        </div>
      </header>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div id="kpi-contractors" class="bg-blue-100 p-6 rounded-2xl">
          <div class="flex justify-between items-start"><h3 class="text-lg font-medium text-blue-800">Mis contratos activos</h3><span class="material-icons text-blue-800">groups</span></div>
          <p class="text-4xl font-bold text-blue-900 mt-2">--</p>
        </div>
        <div id="kpi-expiring" class="bg-purple-100 p-6 rounded-2xl">
          <div class="flex justify-between items-start"><h3 class="text-lg font-medium text-purple-800">Días al vencimiento</h3><span class="material-icons text-purple-800">event_busy</span></div>
          <p class="text-4xl font-bold text-purple-900 mt-2">--</p>
        </div>
        <div id="kpi-obligations" class="bg-cyan-100 p-6 rounded-2xl">
          <div class="flex justify-between items-start"><h3 class="text-lg font-medium text-cyan-800">Obligaciones sin evidencia</h3><span class="material-icons text-cyan-800">assignment_late</span></div>
          <p class="text-4xl font-bold text-cyan-900 mt-2">--</p>
        </div>
        <div id="kpi-payments" class="bg-yellow-100 p-6 rounded-2xl">
          <div class="flex justify-between items-start"><h3 class="text-lg font-medium text-yellow-800">Pagos en trámite</h3><span class="material-icons text-yellow-800">monetization_on</span></div>
          <p class="text-4xl font-bold text-yellow-900 mt-2">--</p>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 bg-white p-6 rounded-2xl">
          <h3 class="text-xl font-semibold text-gray-800 mb-4">Mis pagos vs Mis obligaciones</h3>
          <canvas id="paymentsChart"></canvas>
        </div>
        <div class="bg-white p-6 rounded-2xl">
          <h3 class="text-xl font-semibold text-gray-800 mb-4">Alerts</h3>
          <div id="alertsList" class="space-y-4"></div>
        </div>
      </div>
    </main>
  </div>
  `;
}
