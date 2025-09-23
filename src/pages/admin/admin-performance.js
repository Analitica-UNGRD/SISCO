// Herramienta de medición de rendimiento para el Panel de Administración
const AdminPerformance = {
  startTime: null,
  
  start() {
    this.startTime = performance.now();
    console.log('Medición de rendimiento iniciada');
  },
  
  end(label) {
    if (!this.startTime) {
      console.warn('Debes iniciar la medición antes de finalizarla');
      return;
    }
    
    const duration = performance.now() - this.startTime;
    console.log(`${label || 'Operación'}: ${duration.toFixed(2)}ms`);
    this.startTime = null;
  }
};

// Hacerlo disponible globalmente
window.AdminPerformance = AdminPerformance;
