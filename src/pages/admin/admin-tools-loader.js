// Small loader that conditionally loads admin auxiliary tools (test/perf/debug).
// These tools are auxiliary and should not be loaded in production by default.
(function(){
  // By default do not auto-load. To enable in the console:
  //   window.ADMIN_TOOLS_AUTORUN = true
  // then reload the page.
  const autorun = window.ADMIN_TOOLS_AUTORUN === true || window.ADMIN_TOOLS_AUTORUN === 'true';
  if(!autorun) {
    console.log('Admin tools loader: autorun disabled');
    return;
  }

  // Safe dynamic import paths using existing shims (which re-export backups)
  const toLoad = [
    './admin-test-suite.js',
    './admin-performance.js',
    './admin-debug-panel.js'
  ];

  toLoad.forEach(p => {
    import(p).then(m => {
      console.log('Admin tools loaded:', p);
    }).catch(err => {
      console.warn('Failed to load admin tool', p, err);
    });
  });
})();
