/**
 * Performance Monitor for Lion Football Academy
 * Tracks and reports performance metrics according to CODE_PILOT_INSTRUCTION_6.2 targets
 */

// Performance targets from requirements
const PERFORMANCE_TARGETS = {
  FCP: 1500,  // First Contentful Paint < 1.5s
  LCP: 2500,  // Largest Contentful Paint < 2.5s
  TTI: 3000,  // Time to Interactive < 3.0s
  CLS: 0.1,   // Cumulative Layout Shift < 0.1
  FID: 100    // First Input Delay < 100ms
};

class PerformanceMonitor {
  constructor() {
    this.metrics = {};
    this.observer = null;
    this.isSupported = this.checkSupport();
    this.startTime = performance.now();
    
    if (this.isSupported) {
      this.init();
    }
  }

  checkSupport() {
    return (
      'PerformanceObserver' in window &&
      'performance' in window &&
      'timing' in performance
    );
  }

  init() {
    this.observePerformanceEntries();
    this.observeLayoutShifts();
    this.observeFirstInputDelay();
    this.measureCustomMetrics();
    
    // Report metrics when page is fully loaded
    window.addEventListener('load', () => {
      setTimeout(() => this.reportAllMetrics(), 1000);
    });

    // Report metrics before page unload
    window.addEventListener('beforeunload', () => {
      this.reportAllMetrics();
    });
  }

  observePerformanceEntries() {
    if (!window.PerformanceObserver) return;

    // Observe paint metrics (FCP, LCP)
    const paintObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          this.metrics.FCP = entry.startTime;
        }
      }
    });

    try {
      paintObserver.observe({ entryTypes: ['paint'] });
    } catch (e) {
      console.warn('Paint observer not supported');
    }

    // Observe LCP
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      this.metrics.LCP = lastEntry.startTime;
    });

    try {
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (e) {
      console.warn('LCP observer not supported');
    }

    // Observe resource loading
    const resourceObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.analyzeResourceTiming(entry);
      }
    });

    try {
      resourceObserver.observe({ entryTypes: ['resource'] });
    } catch (e) {
      console.warn('Resource observer not supported');
    }
  }

  observeLayoutShifts() {
    if (!window.PerformanceObserver) return;

    let clsValue = 0;
    let sessionValue = 0;
    let sessionEntries = [];

    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) {
          const firstSessionEntry = sessionEntries[0];
          const lastSessionEntry = sessionEntries[sessionEntries.length - 1];

          if (sessionValue &&
              entry.startTime - lastSessionEntry.startTime < 1000 &&
              entry.startTime - firstSessionEntry.startTime < 5000) {
            sessionValue += entry.value;
            sessionEntries.push(entry);
          } else {
            sessionValue = entry.value;
            sessionEntries = [entry];
          }

          if (sessionValue > clsValue) {
            clsValue = sessionValue;
            this.metrics.CLS = clsValue;
          }
        }
      }
    });

    try {
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    } catch (e) {
      console.warn('Layout shift observer not supported');
    }
  }

  observeFirstInputDelay() {
    if (!window.PerformanceObserver) return;

    const fidObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.processingStart && entry.startTime) {
          const fid = entry.processingStart - entry.startTime;
          this.metrics.FID = fid;
          fidObserver.disconnect();
        }
      }
    });

    try {
      fidObserver.observe({ entryTypes: ['first-input'] });
    } catch (e) {
      console.warn('FID observer not supported');
    }
  }

  measureCustomMetrics() {
    // Time to Interactive (TTI) approximation
    this.measureTTI();
    
    // Bundle size tracking
    this.measureBundleSize();
    
    // Memory usage
    this.measureMemoryUsage();
    
    // Network conditions
    this.measureNetworkConditions();
  }

  measureTTI() {
    // Simplified TTI measurement
    const navigationStart = performance.timing.navigationStart;
    
    // Wait for main thread to be idle
    const checkTTI = () => {
      if (document.readyState === 'complete') {
        // Approximate TTI as when document is complete
        this.metrics.TTI = performance.now();
      } else {
        setTimeout(checkTTI, 100);
      }
    };

    checkTTI();
  }

  measureBundleSize() {
    const resources = performance.getEntriesByType('resource');
    const jsResources = resources.filter(r => r.name.includes('.js'));
    const cssResources = resources.filter(r => r.name.includes('.css'));
    
    this.metrics.bundleSize = {
      js: jsResources.reduce((total, r) => total + (r.transferSize || 0), 0),
      css: cssResources.reduce((total, r) => total + (r.transferSize || 0), 0),
      total: resources.reduce((total, r) => total + (r.transferSize || 0), 0)
    };
  }

  measureMemoryUsage() {
    if ('memory' in performance) {
      this.metrics.memory = {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit
      };
    }
  }

  measureNetworkConditions() {
    if ('connection' in navigator) {
      this.metrics.network = {
        effectiveType: navigator.connection.effectiveType,
        downlink: navigator.connection.downlink,
        rtt: navigator.connection.rtt,
        saveData: navigator.connection.saveData
      };
    }
  }

  analyzeResourceTiming(entry) {
    const resourceType = this.getResourceType(entry.name);
    
    if (!this.metrics.resources) {
      this.metrics.resources = {};
    }
    
    if (!this.metrics.resources[resourceType]) {
      this.metrics.resources[resourceType] = {
        count: 0,
        totalSize: 0,
        totalDuration: 0,
        items: []
      };
    }
    
    this.metrics.resources[resourceType].count++;
    this.metrics.resources[resourceType].totalSize += entry.transferSize || 0;
    this.metrics.resources[resourceType].totalDuration += entry.duration;
    this.metrics.resources[resourceType].items.push({
      name: entry.name,
      size: entry.transferSize,
      duration: entry.duration
    });
  }

  getResourceType(url) {
    if (url.includes('.js')) return 'javascript';
    if (url.includes('.css')) return 'stylesheet';
    if (url.includes('.png') || url.includes('.jpg') || url.includes('.jpeg') || url.includes('.webp')) return 'image';
    if (url.includes('.woff') || url.includes('.woff2') || url.includes('.ttf')) return 'font';
    if (url.includes('/api/')) return 'api';
    return 'other';
  }

  checkPerformanceTargets() {
    const results = {
      passed: 0,
      failed: 0,
      targets: {}
    };

    Object.entries(PERFORMANCE_TARGETS).forEach(([metric, target]) => {
      const actual = this.metrics[metric];
      const passed = actual !== undefined && actual <= target;
      
      results.targets[metric] = {
        target,
        actual,
        passed,
        difference: actual !== undefined ? actual - target : null
      };
      
      if (passed) {
        results.passed++;
      } else {
        results.failed++;
      }
    });

    results.score = (results.passed / Object.keys(PERFORMANCE_TARGETS).length) * 100;
    
    return results;
  }

  generateLighthouseScore() {
    // Simplified Lighthouse scoring algorithm
    const weights = {
      FCP: 0.1,
      LCP: 0.25,
      TTI: 0.1,
      CLS: 0.25,
      FID: 0.1,
      TBT: 0.2 // Total Blocking Time (approximated)
    };

    let weightedScore = 0;
    let totalWeight = 0;

    Object.entries(weights).forEach(([metric, weight]) => {
      const value = this.metrics[metric];
      if (value !== undefined) {
        const score = this.getMetricScore(metric, value);
        weightedScore += score * weight;
        totalWeight += weight;
      }
    });

    return Math.round((weightedScore / totalWeight) * 100);
  }

  getMetricScore(metric, value) {
    // Scoring curves based on Lighthouse v10
    const scoringCurves = {
      FCP: { good: 1800, poor: 3000 },
      LCP: { good: 2500, poor: 4000 },
      TTI: { good: 3800, poor: 7300 },
      CLS: { good: 0.1, poor: 0.25 },
      FID: { good: 100, poor: 300 }
    };

    const curve = scoringCurves[metric];
    if (!curve) return 50; // Default score

    if (value <= curve.good) {
      return 90 + (10 * (curve.good - value) / curve.good);
    } else if (value <= curve.poor) {
      return 50 + (40 * (curve.poor - value) / (curve.poor - curve.good));
    } else {
      return Math.max(0, 50 - (50 * (value - curve.poor) / curve.poor));
    }
  }

  reportAllMetrics() {
    const performanceResults = this.checkPerformanceTargets();
    const lighthouseScore = this.generateLighthouseScore();
    
    const report = {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      metrics: this.metrics,
      targets: performanceResults,
      lighthouseScore,
      recommendations: this.generateRecommendations()
    };

    // Console output for development
    console.group('🦁 Lion FA Performance Report');
    console.log('📊 Lighthouse Score:', lighthouseScore);
    console.log('🎯 Target Results:', performanceResults);
    console.log('📈 Raw Metrics:', this.metrics);
    console.log('💡 Recommendations:', report.recommendations);
    console.groupEnd();

    // Send to analytics (if configured)
    this.sendToAnalytics(report);

    return report;
  }

  generateRecommendations() {
    const recommendations = [];
    const targets = this.checkPerformanceTargets();

    Object.entries(targets.targets).forEach(([metric, result]) => {
      if (!result.passed && result.actual !== undefined) {
        switch (metric) {
          case 'FCP':
            recommendations.push({
              metric: 'First Contentful Paint',
              issue: `FCP is ${result.actual}ms (target: ${result.target}ms)`,
              suggestions: [
                'Optimize critical CSS',
                'Reduce server response time',
                'Use a CDN',
                'Minimize render-blocking resources'
              ]
            });
            break;
          
          case 'LCP':
            recommendations.push({
              metric: 'Largest Contentful Paint',
              issue: `LCP is ${result.actual}ms (target: ${result.target}ms)`,
              suggestions: [
                'Optimize images with modern formats',
                'Preload key resources',
                'Improve server response time',
                'Use efficient caching strategies'
              ]
            });
            break;
          
          case 'TTI':
            recommendations.push({
              metric: 'Time to Interactive',
              issue: `TTI is ${result.actual}ms (target: ${result.target}ms)`,
              suggestions: [
                'Reduce JavaScript execution time',
                'Split code and lazy load non-critical parts',
                'Remove unused code',
                'Use web workers for heavy computations'
              ]
            });
            break;
          
          case 'CLS':
            recommendations.push({
              metric: 'Cumulative Layout Shift',
              issue: `CLS is ${result.actual} (target: ${result.target})`,
              suggestions: [
                'Add size attributes to images and videos',
                'Reserve space for ads and embeds',
                'Avoid inserting content above existing content',
                'Use CSS containment'
              ]
            });
            break;
          
          case 'FID':
            recommendations.push({
              metric: 'First Input Delay',
              issue: `FID is ${result.actual}ms (target: ${result.target}ms)`,
              suggestions: [
                'Reduce main thread work',
                'Keep request counts low and transfer sizes small',
                'Use web workers',
                'Break up long-running tasks'
              ]
            });
            break;
        }
      }
    });

    return recommendations;
  }

  sendToAnalytics(report) {
    // Send to analytics service (placeholder)
    if (window.gtag) {
      window.gtag('event', 'performance_metrics', {
        custom_map: {
          fcp: report.metrics.FCP,
          lcp: report.metrics.LCP,
          tti: report.metrics.TTI,
          cls: report.metrics.CLS,
          fid: report.metrics.FID,
          lighthouse_score: report.lighthouseScore
        }
      });
    }

    // Could also send to custom analytics endpoint
    if (process.env.NODE_ENV === 'production') {
      fetch('/api/analytics/performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(report)
      }).catch(err => console.warn('Failed to send performance data:', err));
    }
  }

  // Public API methods
  getMetrics() {
    return this.metrics;
  }

  getScore() {
    return this.generateLighthouseScore();
  }

  getTargetResults() {
    return this.checkPerformanceTargets();
  }
}

// Create global performance monitor instance
const performanceMonitor = new PerformanceMonitor();

// Export for use in components
export default performanceMonitor;

// Utility functions
export const reportPerformance = () => {
  return performanceMonitor.reportAllMetrics();
};

export const getPerformanceScore = () => {
  return performanceMonitor.getScore();
};

export const checkTargets = () => {
  return performanceMonitor.getTargetResults();
};

// React hook for performance monitoring
export const usePerformanceMonitoring = () => {
  const [metrics, setMetrics] = React.useState({});
  const [score, setScore] = React.useState(0);
  
  React.useEffect(() => {
    const updateMetrics = () => {
      setMetrics(performanceMonitor.getMetrics());
      setScore(performanceMonitor.getScore());
    };
    
    updateMetrics();
    
    // Update metrics periodically
    const interval = setInterval(updateMetrics, 5000);
    
    return () => clearInterval(interval);
  }, []);
  
  return {
    metrics,
    score,
    report: () => performanceMonitor.reportAllMetrics(),
    targets: () => performanceMonitor.getTargetResults()
  };
};