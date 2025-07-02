import React, { useState, useEffect } from 'react';

const PerformanceDashboard = () => {
  const [metrics, setMetrics] = useState({});
  
  useEffect(() => {
    // Performance API használata
    if ('performance' in window) {
      const navigation = performance.getEntriesByType('navigation')[0];
      const paint = performance.getEntriesByType('paint');
      
      setMetrics({
        loadTime: Math.round(navigation.loadEventEnd - navigation.loadEventStart),
        domContentLoaded: Math.round(navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart),
        firstPaint: paint.find(entry => entry.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: paint.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0
      });
    }
  }, []);

  return (
    <div className="performance-dashboard mt-4">
      <div className="card">
        <div className="card-header">
          <h5>📊 Performance Metrics</h5>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-3">
              <div className="metric-card text-center p-3 border rounded">
                <h6>⚡ Page Load</h6>
                <span className="h4 text-success">{metrics.loadTime}ms</span>
              </div>
            </div>
            <div className="col-md-3">
              <div className="metric-card text-center p-3 border rounded">
                <h6>📄 DOM Ready</h6>
                <span className="h4 text-info">{metrics.domContentLoaded}ms</span>
              </div>
            </div>
            <div className="col-md-3">
              <div className="metric-card text-center p-3 border rounded">
                <h6>🎨 First Paint</h6>
                <span className="h4 text-warning">{Math.round(metrics.firstPaint)}ms</span>
              </div>
            </div>
            <div className="col-md-3">
              <div className="metric-card text-center p-3 border rounded">
                <h6>🖼️ First Content</h6>
                <span className="h4 text-primary">{Math.round(metrics.firstContentfulPaint)}ms</span>
              </div>
            </div>
          </div>
          
          <div className="mt-3 text-center">
            <small className="text-muted">
              Real-time performance metrics - Lower is better
            </small>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceDashboard;