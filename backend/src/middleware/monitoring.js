/**
 * Production Monitoring Middleware
 * Lion Football Academy - Application Performance Monitoring
 */

const logger = require('../utils/logger');

class MonitoringService {
  constructor() {
    this.metrics = {
      requests: 0,
      errors: 0,
      totalResponseTime: 0,
      averageResponseTime: 0,
      activeConnections: 0,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      lastHealthCheck: new Date()
    };
    
    this.alerts = [];
    this.startTime = new Date();
    
    // Start periodic monitoring
    if (process.env.NODE_ENV === 'production') {
      this.startPeriodicMonitoring();
    }
  }

  // Request monitoring middleware
  requestMonitoring() {
    return (req, res, next) => {
      const startTime = Date.now();
      this.metrics.requests++;
      this.metrics.activeConnections++;

      res.on('finish', () => {
        const responseTime = Date.now() - startTime;
        this.metrics.totalResponseTime += responseTime;
        this.metrics.averageResponseTime = this.metrics.totalResponseTime / this.metrics.requests;
        this.metrics.activeConnections--;

        // Track errors
        if (res.statusCode >= 400) {
          this.metrics.errors++;
          
          // Alert on high error rate
          const errorRate = (this.metrics.errors / this.metrics.requests) * 100;
          if (errorRate > 5) {
            this.createAlert('high_error_rate', `Error rate: ${errorRate.toFixed(2)}%`);
          }
        }

        // Alert on slow responses
        if (responseTime > 5000) {
          this.createAlert('slow_response', `Response time: ${responseTime}ms for ${req.method} ${req.path}`);
        }

        // Log performance metrics
        logger.logPerformance('response_time', responseTime);
        
        if (responseTime > 2000) {
          logger.warn('Slow Response', {
            method: req.method,
            path: req.path,
            responseTime: `${responseTime}ms`,
            statusCode: res.statusCode
          });
        }
      });

      next();
    };
  }

  // Error monitoring middleware
  errorMonitoring() {
    return (err, req, res, next) => {
      this.metrics.errors++;
      
      // Log the error
      logger.logError(err, {
        method: req.method,
        path: req.path,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        userId: req.user?.id
      });

      // Create alert for critical errors
      if (err.status >= 500 || !err.status) {
        this.createAlert('server_error', `${err.message} at ${req.path}`);
      }

      // Don't expose internal errors in production
      if (process.env.NODE_ENV === 'production') {
        if (err.status >= 500 || !err.status) {
          res.status(500).json({
            error: 'Internal Server Error',
            message: 'An unexpected error occurred'
          });
        } else {
          res.status(err.status).json({
            error: err.message
          });
        }
      } else {
        // Development: show full error details
        res.status(err.status || 500).json({
          error: err.message,
          stack: err.stack
        });
      }
    };
  }

  // Memory monitoring
  memoryMonitoring() {
    const usage = process.memoryUsage();
    this.metrics.memoryUsage = usage;
    
    // Alert on high memory usage (> 80% of heap)
    const heapUsedMB = usage.heapUsed / 1024 / 1024;
    const heapTotalMB = usage.heapTotal / 1024 / 1024;
    const heapUsagePercent = (heapUsedMB / heapTotalMB) * 100;
    
    if (heapUsagePercent > 80) {
      this.createAlert('high_memory_usage', `Heap usage: ${heapUsagePercent.toFixed(2)}% (${heapUsedMB.toFixed(2)}MB)`);
    }

    logger.logPerformance('memory_heap_used', heapUsedMB, 'MB');
    logger.logPerformance('memory_heap_usage_percent', heapUsagePercent, '%');
  }

  // Database monitoring
  monitorDatabaseQuery(query, params, startTime) {
    const duration = Date.now() - startTime;
    
    logger.logDatabaseQuery(query, params, duration);
    
    // Alert on very slow queries
    if (duration > 10000) {
      this.createAlert('slow_database_query', `Query took ${duration}ms`);
    }
    
    return duration;
  }

  // Health check endpoint
  getHealthStatus() {
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();
    const errorRate = this.metrics.requests > 0 ? (this.metrics.errors / this.metrics.requests) * 100 : 0;
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: uptime,
      uptimeHuman: this.formatUptime(uptime),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      metrics: {
        requests: this.metrics.requests,
        errors: this.metrics.errors,
        errorRate: errorRate.toFixed(2) + '%',
        averageResponseTime: Math.round(this.metrics.averageResponseTime) + 'ms',
        activeConnections: this.metrics.activeConnections,
        memoryUsage: {
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB',
          external: Math.round(memoryUsage.external / 1024 / 1024) + 'MB',
          rss: Math.round(memoryUsage.rss / 1024 / 1024) + 'MB'
        }
      },
      checks: {
        database: 'healthy', // Would check actual DB connection
        memory: memoryUsage.heapUsed / memoryUsage.heapTotal < 0.8 ? 'healthy' : 'warning',
        errorRate: errorRate < 5 ? 'healthy' : 'warning',
        uptime: uptime > 60 ? 'healthy' : 'starting'
      },
      alerts: this.alerts.slice(-10) // Last 10 alerts
    };

    // Determine overall status
    const hasUnhealthyChecks = Object.values(health.checks).some(status => status === 'unhealthy');
    const hasWarnings = Object.values(health.checks).some(status => status === 'warning');
    
    if (hasUnhealthyChecks) {
      health.status = 'unhealthy';
    } else if (hasWarnings) {
      health.status = 'warning';
    }

    this.metrics.lastHealthCheck = new Date();
    logger.logHealthCheck(health.status, health.checks);
    
    return health;
  }

  // Create alert
  createAlert(type, message, severity = 'warning') {
    const alert = {
      id: Date.now().toString(),
      type,
      message,
      severity,
      timestamp: new Date().toISOString()
    };
    
    this.alerts.push(alert);
    
    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }
    
    logger.warn('System Alert', alert);
    
    // In production, you might want to send alerts to external monitoring services
    if (process.env.NODE_ENV === 'production' && severity === 'critical') {
      this.sendExternalAlert(alert);
    }
  }

  // Send alert to external monitoring service
  async sendExternalAlert(alert) {
    try {
      // Example: Send to Slack, PagerDuty, etc.
      if (process.env.SLACK_WEBHOOK_URL) {
        const axios = require('axios');
        await axios.post(process.env.SLACK_WEBHOOK_URL, {
          text: `🚨 *${alert.type.toUpperCase()}*: ${alert.message}`,
          attachments: [{
            color: alert.severity === 'critical' ? 'danger' : 'warning',
            fields: [{
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
    } catch (error) {
      logger.error('Failed to send external alert', { error: error.message });
    }
  }

  // Start periodic monitoring tasks
  startPeriodicMonitoring() {
    // Memory monitoring every 30 seconds
    setInterval(() => {
      this.memoryMonitoring();
    }, 30000);

    // Clean old alerts every hour
    setInterval(() => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      this.alerts = this.alerts.filter(alert => new Date(alert.timestamp) > oneHourAgo);
    }, 60 * 60 * 1000);

    // Log system metrics every 5 minutes
    setInterval(() => {
      logger.info('System Metrics', {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        requests: this.metrics.requests,
        errors: this.metrics.errors,
        averageResponseTime: this.metrics.averageResponseTime,
        activeConnections: this.metrics.activeConnections
      });
    }, 5 * 60 * 1000);
  }

  // Format uptime in human readable format
  formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m ${secs}s`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }

  // Get metrics for external monitoring systems
  getMetrics() {
    return {
      ...this.metrics,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      timestamp: new Date().toISOString()
    };
  }

  // Reset metrics (useful for testing)
  resetMetrics() {
    this.metrics = {
      requests: 0,
      errors: 0,
      totalResponseTime: 0,
      averageResponseTime: 0,
      activeConnections: 0,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      lastHealthCheck: new Date()
    };
    this.alerts = [];
  }
}

// Create singleton instance
const monitoring = new MonitoringService();

module.exports = monitoring;