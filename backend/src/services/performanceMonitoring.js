/**
 * Application Performance Monitoring (APM) Service
 * Lion Football Academy - Comprehensive Performance Tracking
 */

const logger = require('../utils/logger');
const monitoring = require('../middleware/monitoring');

class PerformanceMonitoringService {
  constructor() {
    this.metrics = new Map();
    this.performanceThresholds = {
      apiResponse: 1000, // 1 second
      databaseQuery: 500, // 500ms
      externalAPI: 2000, // 2 seconds
      memoryUsage: 0.8, // 80% of available memory
      cpuUsage: 0.7, // 70% CPU usage
      errorRate: 0.05 // 5% error rate
    };
    
    this.alerts = [];
    this.isCollecting = process.env.NODE_ENV === 'production';
    
    if (this.isCollecting) {
      this.startMetricsCollection();
    }
  }

  // Start collecting metrics
  startMetricsCollection() {
    // Collect system metrics every 30 seconds
    setInterval(() => {
      this.collectSystemMetrics();
    }, 30000);

    // Collect application metrics every minute
    setInterval(() => {
      this.collectApplicationMetrics();
    }, 60000);

    // Clean old metrics every hour
    setInterval(() => {
      this.cleanOldMetrics();
    }, 3600000);

    logger.info('Performance monitoring started');
  }

  // Collect system performance metrics
  collectSystemMetrics() {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    const metrics = {
      timestamp: new Date().toISOString(),
      memory: {
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
        external: memoryUsage.external,
        rss: memoryUsage.rss,
        usagePercent: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      uptime: process.uptime(),
      activeHandles: process._getActiveHandles().length,
      activeRequests: process._getActiveRequests().length
    };

    this.recordMetric('system', metrics);
    
    // Check thresholds
    this.checkSystemThresholds(metrics);
  }

  // Collect application-specific metrics
  collectApplicationMetrics() {
    const monitoringMetrics = monitoring.getMetrics();
    
    const metrics = {
      timestamp: new Date().toISOString(),
      requests: {
        total: monitoringMetrics.requests,
        errors: monitoringMetrics.errors,
        errorRate: monitoringMetrics.requests > 0 ? 
          (monitoringMetrics.errors / monitoringMetrics.requests) * 100 : 0,
        averageResponseTime: monitoringMetrics.averageResponseTime,
        activeConnections: monitoringMetrics.activeConnections
      },
      database: this.getDatabaseMetrics(),
      cache: this.getCacheMetrics()
    };

    this.recordMetric('application', metrics);
    
    // Check application thresholds
    this.checkApplicationThresholds(metrics);
  }

  // Database performance metrics
  getDatabaseMetrics() {
    // This would integrate with your database monitoring
    return {
      connectionPool: {
        active: 0,
        idle: 0,
        total: 10
      },
      queryMetrics: this.getQueryMetrics(),
      slowQueries: this.getSlowQueries()
    };
  }

  // Cache performance metrics
  getCacheMetrics() {
    // Redis or in-memory cache metrics
    return {
      hitRate: 0.95,
      missRate: 0.05,
      operations: 0,
      memory: 0
    };
  }

  // Query performance tracking
  getQueryMetrics() {
    const queryMetrics = this.getMetric('database_queries') || [];
    const recent = queryMetrics.filter(m => 
      new Date(m.timestamp) > new Date(Date.now() - 300000) // Last 5 minutes
    );

    if (recent.length === 0) {
      return {
        total: 0,
        averageTime: 0,
        slowQueries: 0
      };
    }

    const totalTime = recent.reduce((sum, q) => sum + q.duration, 0);
    const slowQueries = recent.filter(q => q.duration > this.performanceThresholds.databaseQuery);

    return {
      total: recent.length,
      averageTime: totalTime / recent.length,
      slowQueries: slowQueries.length,
      slowestQuery: Math.max(...recent.map(q => q.duration))
    };
  }

  // Get slow queries for analysis
  getSlowQueries() {
    const queryMetrics = this.getMetric('database_queries') || [];
    return queryMetrics
      .filter(q => q.duration > this.performanceThresholds.databaseQuery)
      .slice(-10) // Last 10 slow queries
      .map(q => ({
        query: q.query.substring(0, 100),
        duration: q.duration,
        timestamp: q.timestamp
      }));
  }

  // Record metric
  recordMetric(category, data) {
    if (!this.metrics.has(category)) {
      this.metrics.set(category, []);
    }

    const categoryMetrics = this.metrics.get(category);
    categoryMetrics.push(data);

    // Keep only last 1000 entries per category
    if (categoryMetrics.length > 1000) {
      categoryMetrics.splice(0, categoryMetrics.length - 1000);
    }
  }

  // Get metric data
  getMetric(category) {
    return this.metrics.get(category) || [];
  }

  // API request performance tracking
  trackAPIRequest(method, path, duration, statusCode, userId = null) {
    const metric = {
      timestamp: new Date().toISOString(),
      method,
      path,
      duration,
      statusCode,
      userId,
      isError: statusCode >= 400,
      isSlow: duration > this.performanceThresholds.apiResponse
    };

    this.recordMetric('api_requests', metric);

    // Log slow requests
    if (metric.isSlow) {
      logger.warn('Slow API request detected', {
        method,
        path,
        duration: `${duration}ms`,
        statusCode,
        userId
      });
    }

    return metric;
  }

  // Database query performance tracking
  trackDatabaseQuery(query, params, duration) {
    const metric = {
      timestamp: new Date().toISOString(),
      query: query.substring(0, 200), // Truncate for storage
      paramCount: params ? params.length : 0,
      duration,
      isSlow: duration > this.performanceThresholds.databaseQuery
    };

    this.recordMetric('database_queries', metric);

    // Log slow queries
    if (metric.isSlow) {
      logger.warn('Slow database query detected', {
        query: metric.query,
        duration: `${duration}ms`,
        paramCount: metric.paramCount
      });
    }

    return metric;
  }

  // External API call tracking
  trackExternalAPI(service, endpoint, duration, statusCode, error = null) {
    const metric = {
      timestamp: new Date().toISOString(),
      service,
      endpoint,
      duration,
      statusCode,
      error: error ? error.message : null,
      isError: !!error || statusCode >= 400,
      isSlow: duration > this.performanceThresholds.externalAPI
    };

    this.recordMetric('external_apis', metric);

    // Log issues
    if (metric.isError || metric.isSlow) {
      logger.warn('External API issue detected', {
        service,
        endpoint,
        duration: `${duration}ms`,
        statusCode,
        error: metric.error
      });
    }

    return metric;
  }

  // Check system performance thresholds
  checkSystemThresholds(metrics) {
    // Memory usage check
    if (metrics.memory.usagePercent > this.performanceThresholds.memoryUsage * 100) {
      this.createAlert('high_memory_usage', 
        `Memory usage at ${metrics.memory.usagePercent.toFixed(2)}%`,
        'warning'
      );
    }

    // Active handles check (potential memory leaks)
    if (metrics.activeHandles > 1000) {
      this.createAlert('high_active_handles',
        `High number of active handles: ${metrics.activeHandles}`,
        'warning'
      );
    }
  }

  // Check application performance thresholds
  checkApplicationThresholds(metrics) {
    // Error rate check
    if (metrics.requests.errorRate > this.performanceThresholds.errorRate * 100) {
      this.createAlert('high_error_rate',
        `Error rate at ${metrics.requests.errorRate.toFixed(2)}%`,
        'critical'
      );
    }

    // Response time check
    if (metrics.requests.averageResponseTime > this.performanceThresholds.apiResponse) {
      this.createAlert('slow_response_time',
        `Average response time: ${metrics.requests.averageResponseTime}ms`,
        'warning'
      );
    }
  }

  // Create performance alert
  createAlert(type, message, severity = 'warning') {
    const alert = {
      id: Date.now().toString(),
      type,
      message,
      severity,
      timestamp: new Date().toISOString(),
      category: 'performance'
    };

    this.alerts.push(alert);

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }

    logger.warn('Performance alert created', alert);

    // Send critical alerts to external systems
    if (severity === 'critical') {
      this.sendCriticalAlert(alert);
    }
  }

  // Send critical alerts to external monitoring
  async sendCriticalAlert(alert) {
    try {
      // Integration with external monitoring services
      if (process.env.SLACK_WEBHOOK_URL) {
        const axios = require('axios');
        await axios.post(process.env.SLACK_WEBHOOK_URL, {
          text: `🚨 *Performance Alert*: ${alert.message}`,
          attachments: [{
            color: 'danger',
            fields: [{
              title: 'Alert Type',
              value: alert.type,
              short: true
            }, {
              title: 'Severity',
              value: alert.severity,
              short: true
            }, {
              title: 'Service',
              value: 'Lion Football Academy Backend',
              short: true
            }, {
              title: 'Environment',
              value: process.env.NODE_ENV,
              short: true
            }]
          }]
        });
      }

      // Integration with PagerDuty, OpsGenie, etc.
      if (process.env.PAGERDUTY_INTEGRATION_KEY) {
        // Send to PagerDuty
      }

    } catch (error) {
      logger.error('Failed to send critical alert', {
        error: error.message,
        alert: alert.type
      });
    }
  }

  // Get performance summary
  getPerformanceSummary(timeframe = '1h') {
    const timeframeMs = this.parseTimeframe(timeframe);
    const cutoff = new Date(Date.now() - timeframeMs);

    const apiMetrics = this.getMetric('api_requests')
      .filter(m => new Date(m.timestamp) > cutoff);
    
    const systemMetrics = this.getMetric('system')
      .filter(m => new Date(m.timestamp) > cutoff);

    const summary = {
      timeframe,
      timestamp: new Date().toISOString(),
      api: this.summarizeAPIMetrics(apiMetrics),
      system: this.summarizeSystemMetrics(systemMetrics),
      database: this.getQueryMetrics(),
      alerts: this.alerts.filter(a => new Date(a.timestamp) > cutoff)
    };

    return summary;
  }

  // Summarize API metrics
  summarizeAPIMetrics(metrics) {
    if (metrics.length === 0) {
      return {
        totalRequests: 0,
        averageResponseTime: 0,
        errorRate: 0,
        slowRequests: 0
      };
    }

    const totalRequests = metrics.length;
    const errorRequests = metrics.filter(m => m.isError).length;
    const slowRequests = metrics.filter(m => m.isSlow).length;
    const totalDuration = metrics.reduce((sum, m) => sum + m.duration, 0);

    return {
      totalRequests,
      averageResponseTime: Math.round(totalDuration / totalRequests),
      errorRate: ((errorRequests / totalRequests) * 100).toFixed(2),
      slowRequests,
      slowRequestRate: ((slowRequests / totalRequests) * 100).toFixed(2)
    };
  }

  // Summarize system metrics
  summarizeSystemMetrics(metrics) {
    if (metrics.length === 0) {
      return {
        averageMemoryUsage: 0,
        peakMemoryUsage: 0,
        averageActiveHandles: 0
      };
    }

    const memoryUsages = metrics.map(m => m.memory.usagePercent);
    const activeHandles = metrics.map(m => m.activeHandles);

    return {
      averageMemoryUsage: (memoryUsages.reduce((sum, u) => sum + u, 0) / memoryUsages.length).toFixed(2),
      peakMemoryUsage: Math.max(...memoryUsages).toFixed(2),
      averageActiveHandles: Math.round(activeHandles.reduce((sum, h) => sum + h, 0) / activeHandles.length),
      peakActiveHandles: Math.max(...activeHandles)
    };
  }

  // Parse timeframe string to milliseconds
  parseTimeframe(timeframe) {
    const units = {
      m: 60000,      // minutes
      h: 3600000,    // hours
      d: 86400000    // days
    };

    const match = timeframe.match(/^(\d+)([mhd])$/);
    if (!match) return 3600000; // Default 1 hour

    const [, value, unit] = match;
    return parseInt(value) * units[unit];
  }

  // Clean old metrics to prevent memory buildup
  cleanOldMetrics() {
    const cutoff = new Date(Date.now() - 86400000); // 24 hours

    for (const [category, metrics] of this.metrics.entries()) {
      const filtered = metrics.filter(m => new Date(m.timestamp) > cutoff);
      this.metrics.set(category, filtered);
    }

    // Clean old alerts
    this.alerts = this.alerts.filter(a => new Date(a.timestamp) > cutoff);

    logger.debug('Old metrics cleaned', {
      categories: Array.from(this.metrics.keys()),
      alertsCount: this.alerts.length
    });
  }

  // Get health status for monitoring
  getHealthStatus() {
    const recentSystemMetrics = this.getMetric('system').slice(-1)[0];
    const performanceSummary = this.getPerformanceSummary('15m');

    return {
      status: this.determineHealthStatus(performanceSummary),
      metrics: {
        system: recentSystemMetrics,
        performance: performanceSummary,
        activeAlerts: this.alerts.filter(a => 
          new Date(a.timestamp) > new Date(Date.now() - 900000) // Last 15 minutes
        ).length
      },
      thresholds: this.performanceThresholds,
      isCollecting: this.isCollecting
    };
  }

  // Determine overall health status
  determineHealthStatus(summary) {
    const criticalAlerts = this.alerts.filter(a => 
      a.severity === 'critical' && 
      new Date(a.timestamp) > new Date(Date.now() - 900000)
    );

    if (criticalAlerts.length > 0) return 'critical';

    if (summary.api.errorRate > 5 || summary.api.averageResponseTime > 1000) {
      return 'degraded';
    }

    if (summary.api.slowRequestRate > 10) {
      return 'warning';
    }

    return 'healthy';
  }

  // Export metrics for external monitoring systems
  exportMetrics(format = 'json') {
    const data = {
      timestamp: new Date().toISOString(),
      summary: this.getPerformanceSummary('1h'),
      metrics: Object.fromEntries(this.metrics),
      alerts: this.alerts,
      thresholds: this.performanceThresholds
    };

    if (format === 'prometheus') {
      return this.formatPrometheusMetrics(data);
    }

    return data;
  }

  // Format metrics for Prometheus
  formatPrometheusMetrics(data) {
    const lines = [];
    
    // API metrics
    if (data.summary.api) {
      lines.push(`# HELP api_requests_total Total number of API requests`);
      lines.push(`# TYPE api_requests_total counter`);
      lines.push(`api_requests_total ${data.summary.api.totalRequests}`);
      
      lines.push(`# HELP api_response_time_seconds Average API response time in seconds`);
      lines.push(`# TYPE api_response_time_seconds gauge`);
      lines.push(`api_response_time_seconds ${data.summary.api.averageResponseTime / 1000}`);
      
      lines.push(`# HELP api_error_rate Error rate percentage`);
      lines.push(`# TYPE api_error_rate gauge`);
      lines.push(`api_error_rate ${data.summary.api.errorRate}`);
    }

    // System metrics
    if (data.summary.system) {
      lines.push(`# HELP memory_usage_percent Memory usage percentage`);
      lines.push(`# TYPE memory_usage_percent gauge`);
      lines.push(`memory_usage_percent ${data.summary.system.averageMemoryUsage}`);
    }

    return lines.join('\n');
  }
}

// Create singleton instance
const performanceMonitoring = new PerformanceMonitoringService();

module.exports = performanceMonitoring;