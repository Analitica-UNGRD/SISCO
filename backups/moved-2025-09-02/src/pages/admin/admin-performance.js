// Performance Monitor for Admin System
class AdminPerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.observers = new Map();
    this.startTime = performance.now();
    this.init();
  }

  init() {
    this.measureInitialLoad();
    this.setupComponentObserver();
    this.setupMemoryMonitor();
    this.setupNetworkMonitor();
  }

  measureInitialLoad() {
    // Measure DOM content loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.recordMetric('dom_content_loaded', performance.now() - this.startTime);
      });
    } else {
      this.recordMetric('dom_content_loaded', performance.now() - this.startTime);
    }

    // Measure full page load
    window.addEventListener('load', () => {
      this.recordMetric('page_load_complete', performance.now() - this.startTime);
      this.generatePerformanceReport();
    });
  }

  setupComponentObserver() {
    // Observe component loading times
    const originalLoadComponent = window.adminManager?.loadComponent;
    if (originalLoadComponent) {
      window.adminManager.loadComponent = async (componentName) => {
        const startTime = performance.now();
        try {
          const result = await originalLoadComponent.call(window.adminManager, componentName);
          const loadTime = performance.now() - startTime;
          this.recordMetric(`component_load_${componentName}`, loadTime);
          return result;
        } catch (error) {
          this.recordMetric(`component_error_${componentName}`, performance.now() - startTime);
          throw error;
        }
      };
    }
  }

  setupMemoryMonitor() {
    if ('memory' in performance) {
      setInterval(() => {
        const memInfo = performance.memory;
        this.recordMetric('memory_used', memInfo.usedJSHeapSize);
        this.recordMetric('memory_total', memInfo.totalJSHeapSize);
        this.recordMetric('memory_limit', memInfo.jsHeapSizeLimit);
      }, 5000);
    }
  }

  setupNetworkMonitor() {
    // Monitor API calls
    const originalApiFetch = window.adminManager?.apiFetch;
    if (originalApiFetch) {
      window.adminManager.apiFetch = async (path, payload) => {
        const startTime = performance.now();
        try {
          const result = await originalApiFetch.call(window.adminManager, path, payload);
          const duration = performance.now() - startTime;
          this.recordMetric(`api_${path}`, duration);
          return result;
        } catch (error) {
          this.recordMetric(`api_error_${path}`, performance.now() - startTime);
          throw error;
        }
      };
    }
  }

  recordMetric(name, value) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name).push({
      value: value,
      timestamp: performance.now()
    });
  }

  getMetricStats(name) {
    const values = this.metrics.get(name);
    if (!values || values.length === 0) return null;

    const nums = values.map(v => v.value);
    return {
      count: nums.length,
      min: Math.min(...nums),
      max: Math.max(...nums),
      avg: nums.reduce((a, b) => a + b, 0) / nums.length,
      latest: nums[nums.length - 1]
    };
  }

  generatePerformanceReport() {
  console.log('\nREPORTE DE PERFORMANCE - FASE 3');
    console.log('==========================================');
    
    // Initial load metrics
    const domLoad = this.getMetricStats('dom_content_loaded');
    const pageLoad = this.getMetricStats('page_load_complete');
    
    if (domLoad) {
      console.log(`DOM Load: ${domLoad.latest.toFixed(2)}ms`);
    }
    if (pageLoad) {
      console.log(`Page Load: ${pageLoad.latest.toFixed(2)}ms`);
    }
    
    // Component load metrics
  console.log('\nCOMPONENT PERFORMANCE:');
    const componentMetrics = Array.from(this.metrics.keys())
      .filter(key => key.startsWith('component_load_'))
      .map(key => ({ name: key.replace('component_load_', ''), stats: this.getMetricStats(key) }));
    
    componentMetrics.forEach(({ name, stats }) => {
      console.log(`  ${name}: ${stats.latest.toFixed(2)}ms (avg: ${stats.avg.toFixed(2)}ms)`);
    });
    
    // API performance
  console.log('\nAPI PERFORMANCE:');
    const apiMetrics = Array.from(this.metrics.keys())
      .filter(key => key.startsWith('api_') && !key.includes('error'))
      .map(key => ({ name: key.replace('api_', ''), stats: this.getMetricStats(key) }));
    
    apiMetrics.forEach(({ name, stats }) => {
      console.log(`  ${name}: ${stats.avg.toFixed(2)}ms avg (${stats.count} calls)`);
    });
    
    // Memory usage
    const memUsed = this.getMetricStats('memory_used');
    const memTotal = this.getMetricStats('memory_total');
    if (memUsed && memTotal) {
      console.log(`\nMEMORY: ${(memUsed.latest / 1024 / 1024).toFixed(2)}MB / ${(memTotal.latest / 1024 / 1024).toFixed(2)}MB`);
    }
    
    console.log('==========================================\n');
    
    // Performance recommendations
    this.generateRecommendations();
  }

  generateRecommendations() {
    const recommendations = [];
    
    // Check page load time
    const pageLoad = this.getMetricStats('page_load_complete');
    if (pageLoad && pageLoad.latest > 3000) {
      recommendations.push('WARNING: Page load time > 3s - Consider optimizing resources');
    }
    
    // Check component load times
    const componentMetrics = Array.from(this.metrics.keys())
      .filter(key => key.startsWith('component_load_'))
      .map(key => this.getMetricStats(key));
    
    const slowComponents = componentMetrics.filter(stats => stats && stats.avg > 500);
    if (slowComponents.length > 0) {
      recommendations.push(`${slowComponents.length} components loading > 500ms - Consider lazy loading`);
    }
    
    // Check memory usage
    const memUsed = this.getMetricStats('memory_used');
    if (memUsed && memUsed.latest > 50 * 1024 * 1024) { // 50MB
      recommendations.push('High memory usage detected - Check for memory leaks');
    }
    
    if (recommendations.length > 0) {
      console.log('RECOMENDACIONES:');
      recommendations.forEach(rec => console.log(`  ${rec}`));
      console.log('');
    } else {
      console.log('Performance looks good!');
    }
  }

  createPerformanceWidget() {
    // Instead of creating widget immediately, store the data
    window.performanceData = {
      metrics: this.metrics,
      timestamp: new Date().toLocaleString(),
      getStats: (name) => this.getMetricStats(name)
    };
    
    console.log('Performance data stored in window.performanceData');
  }

  updateWidget(widget) {
    const memUsed = this.getMetricStats('memory_used');
    const pageLoad = this.getMetricStats('page_load_complete');
    
    widget.innerHTML = `
      <div class="flex items-center justify-between mb-2">
        <span class="text-green-400">Performance</span>
        <button onclick="this.parentElement.parentElement.remove()" class="text-gray-400 hover:text-white">×</button>
      </div>
      ${pageLoad ? `<div>Load: ${pageLoad.latest.toFixed(0)}ms</div>` : ''}
      ${memUsed ? `<div>Memory: ${(memUsed.latest / 1024 / 1024).toFixed(1)}MB</div>` : ''}
      <div>FPS: ${this.getFPS()}</div>
      <div>Components: ${this.getLoadedComponentsCount()}</div>
    `;
  }

  getFPS() {
    // Simple FPS counter
    if (!this.fpsCounter) {
      this.fpsCounter = { frames: 0, lastTime: performance.now() };
    }
    
    this.fpsCounter.frames++;
    const now = performance.now();
    const delta = now - this.fpsCounter.lastTime;
    
    if (delta >= 1000) {
      const fps = Math.round((this.fpsCounter.frames * 1000) / delta);
      this.fpsCounter.frames = 0;
      this.fpsCounter.lastTime = now;
      this.lastFPS = fps;
    }
    
    return this.lastFPS || 60;
  }

  getLoadedComponentsCount() {
    return Array.from(this.metrics.keys())
      .filter(key => key.startsWith('component_load_')).length;
  }
}

// Initialize performance monitor
window.addEventListener('load', () => {
  window.performanceMonitor = new AdminPerformanceMonitor();
  
  // Create performance widget after a delay
  setTimeout(() => {
    window.performanceMonitor.createPerformanceWidget();
  }, 3000);
});

console.log('Performance Monitor loaded');
