/**
 * Health Check Endpoints
 * Lion Football Academy - System Health and Status Monitoring
 */

const express = require('express');
const router = express.Router();
const performanceMonitoring = require('../services/performanceMonitoring');
const uptimeMonitoring = require('../services/uptimeMonitoring');
const backupService = require('../services/backupService');
const centralizedLogging = require('../services/centralizedLogging');

// Basic health check endpoint
router.get('/', async (req, res) => {
  try {
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: Math.floor(process.uptime()),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
      }
    };
    
    // Log health check access
    centralizedLogging.logAccess(req, res, {
      responseTime: 0,
      healthCheck: 'basic'
    });
    
    res.status(200).json(healthStatus);
    
  } catch (error) {
    centralizedLogging.logError('Basic health check failed', error);
    res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

// Detailed health check endpoint
router.get('/detailed', async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Check database connectivity
    const databaseStatus = await checkDatabaseConnection();
    
    // Check external services
    const externalServicesStatus = await checkExternalServices();
    
    // Get performance metrics
    const performanceStatus = performanceMonitoring.getHealthStatus();
    
    // Get uptime monitoring status
    const systemStatus = uptimeMonitoring.getSystemStatus();
    
    // Get backup service status
    const backupStatus = backupService.getServiceStatus();
    
    // Get centralized logging status
    const loggingStatus = centralizedLogging.getLoggingStats();
    
    // Determine overall health
    const overallHealth = determineOverallHealth({
      database: databaseStatus,
      performance: performanceStatus,
      system: systemStatus,
      backup: backupStatus,
      logging: loggingStatus,
      externalServices: externalServicesStatus
    });
    
    const responseTime = Date.now() - startTime;
    
    const detailedStatus = {
      status: overallHealth.status,
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      version: process.env.APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      
      // System information
      system: {
        uptime: Math.floor(process.uptime()),
        hostname: require('os').hostname(),
        platform: process.platform,
        nodeVersion: process.version,
        pid: process.pid,
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          external: Math.round(process.memoryUsage().external / 1024 / 1024),
          rss: Math.round(process.memoryUsage().rss / 1024 / 1024)
        },
        cpu: process.cpuUsage(),
        loadAverage: require('os').loadavg()
      },
      
      // Service health
      services: {
        database: databaseStatus,
        performance: {
          status: performanceStatus.status,
          activeAlerts: performanceStatus.metrics.activeAlerts,
          isCollecting: performanceStatus.isCollecting
        },
        uptime: {
          status: systemStatus.status,
          services: systemStatus.services,
          incidents: systemStatus.incidents
        },
        backup: {
          running: backupStatus.running,
          stats: backupStatus.stats,
          nextBackups: backupStatus.nextBackups
        },
        logging: {
          initialized: loggingStatus.initialized,
          types: Object.keys(loggingStatus.types).length,
          bufferSizes: loggingStatus.bufferSizes
        },
        external: externalServicesStatus
      },
      
      // Health indicators
      healthChecks: overallHealth.checks,
      warnings: overallHealth.warnings,
      errors: overallHealth.errors
    };
    
    // Log detailed health check access
    centralizedLogging.logAccess(req, res, {
      responseTime,
      healthCheck: 'detailed',
      overallStatus: overallHealth.status
    });
    
    // Set appropriate HTTP status based on health
    const httpStatus = overallHealth.status === 'healthy' ? 200 : 
                      overallHealth.status === 'degraded' ? 200 : 503;
    
    res.status(httpStatus).json(detailedStatus);
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    centralizedLogging.logError('Detailed health check failed', error, {
      responseTime
    });
    
    res.status(500).json({
      status: 'error',
      message: 'Detailed health check failed',
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      error: error.message
    });
  }
});

// Database connection health check
router.get('/database', async (req, res) => {
  try {
    const databaseStatus = await checkDatabaseConnection();
    
    res.status(databaseStatus.status === 'healthy' ? 200 : 503).json({
      status: databaseStatus.status,
      timestamp: new Date().toISOString(),
      database: databaseStatus
    });
    
  } catch (error) {
    centralizedLogging.logError('Database health check failed', error);
    res.status(503).json({
      status: 'error',
      message: 'Database health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

// Performance metrics endpoint
router.get('/performance', async (req, res) => {
  try {
    const timeframe = req.query.timeframe || '1h';
    const performanceSummary = performanceMonitoring.getPerformanceSummary(timeframe);
    
    res.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      timeframe,
      performance: performanceSummary
    });
    
  } catch (error) {
    centralizedLogging.logError('Performance metrics endpoint failed', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve performance metrics',
      timestamp: new Date().toISOString()
    });
  }
});

// Uptime status endpoint
router.get('/uptime', async (req, res) => {
  try {
    const systemStatus = uptimeMonitoring.getSystemStatus();
    const allServicesStatus = uptimeMonitoring.getAllServicesStatus();
    
    res.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      system: systemStatus,
      services: allServicesStatus
    });
    
  } catch (error) {
    centralizedLogging.logError('Uptime status endpoint failed', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve uptime status',
      timestamp: new Date().toISOString()
    });
  }
});

// Backup status endpoint
router.get('/backup', async (req, res) => {
  try {
    const backupStatus = backupService.getServiceStatus();
    const recentBackups = await backupService.listBackups();
    
    res.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      backup: {
        ...backupStatus,
        recentBackups: recentBackups.slice(0, 10) // Last 10 backups
      }
    });
    
  } catch (error) {
    centralizedLogging.logError('Backup status endpoint failed', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve backup status',
      timestamp: new Date().toISOString()
    });
  }
});

// Logging status endpoint
router.get('/logging', async (req, res) => {
  try {
    const loggingStats = centralizedLogging.getLoggingStats();
    
    res.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      logging: loggingStats
    });
    
  } catch (error) {
    console.error('Logging status endpoint failed:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve logging status',
      timestamp: new Date().toISOString()
    });
  }
});

// Readiness probe endpoint (for Kubernetes)
router.get('/ready', async (req, res) => {
  try {
    // Check if all critical services are ready
    const databaseStatus = await checkDatabaseConnection();
    const performanceStatus = performanceMonitoring.getHealthStatus();
    
    const isReady = databaseStatus.status === 'healthy' && 
                   performanceStatus.status !== 'critical';
    
    if (isReady) {
      res.status(200).json({
        status: 'ready',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(503).json({
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        reasons: [
          ...(databaseStatus.status !== 'healthy' ? ['database_not_ready'] : []),
          ...(performanceStatus.status === 'critical' ? ['performance_critical'] : [])
        ]
      });
    }
    
  } catch (error) {
    res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Liveness probe endpoint (for Kubernetes)
router.get('/live', async (req, res) => {
  // Simple liveness check - if the server is responding, it's alive
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime())
  });
});

// Check database connection
async function checkDatabaseConnection() {
  try {
    // This would use your actual database connection
    // For now, simulate a database check
    const db = require('../database/connection');
    
    return new Promise((resolve) => {
      // Simple query to test connection
      db.get('SELECT 1 as test', (err, row) => {
        if (err) {
          resolve({
            status: 'unhealthy',
            error: err.message,
            connectionTime: null
          });
        } else {
          resolve({
            status: 'healthy',
            connectionTime: '< 1ms',
            lastCheck: new Date().toISOString()
          });
        }
      });
    });
    
  } catch (error) {
    return {
      status: 'error',
      error: error.message,
      lastCheck: new Date().toISOString()
    };
  }
}

// Check external services
async function checkExternalServices() {
  const services = {};
  
  try {
    // Email service check
    if (process.env.EMAIL_HOST) {
      services.email = await checkEmailService();
    }
    
    // Payment service check
    if (process.env.STRIPE_SECRET_KEY) {
      services.payment = await checkPaymentService();
    }
    
    // Storage service check
    if (process.env.AWS_ACCESS_KEY_ID) {
      services.storage = await checkStorageService();
    }
    
  } catch (error) {
    centralizedLogging.logError('External services check failed', error);
  }
  
  return services;
}

// Check email service
async function checkEmailService() {
  try {
    const nodemailer = require('nodemailer');
    
    const transporter = nodemailer.createTransporter({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
    
    await transporter.verify();
    
    return {
      status: 'healthy',
      lastCheck: new Date().toISOString()
    };
    
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      lastCheck: new Date().toISOString()
    };
  }
}

// Check payment service
async function checkPaymentService() {
  try {
    // Simple Stripe API health check
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    await stripe.accounts.retrieve();
    
    return {
      status: 'healthy',
      lastCheck: new Date().toISOString()
    };
    
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      lastCheck: new Date().toISOString()
    };
  }
}

// Check storage service
async function checkStorageService() {
  try {
    const AWS = require('aws-sdk');
    const s3 = new AWS.S3();
    
    await s3.headBucket({ Bucket: process.env.AWS_S3_BUCKET }).promise();
    
    return {
      status: 'healthy',
      lastCheck: new Date().toISOString()
    };
    
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      lastCheck: new Date().toISOString()
    };
  }
}

// Determine overall health status
function determineOverallHealth(statusChecks) {
  const checks = [];
  const warnings = [];
  const errors = [];
  
  // Check database
  if (statusChecks.database.status === 'healthy') {
    checks.push('Database connection OK');
  } else {
    errors.push(`Database: ${statusChecks.database.error || 'Connection failed'}`);
  }
  
  // Check performance
  if (statusChecks.performance.status === 'critical') {
    errors.push('Performance: Critical issues detected');
  } else if (statusChecks.performance.status === 'degraded') {
    warnings.push('Performance: Degraded performance detected');
  } else {
    checks.push('Performance monitoring OK');
  }
  
  // Check system uptime
  if (statusChecks.system.status === 'major_outage') {
    errors.push('System: Major outage detected');
  } else if (statusChecks.system.status === 'partial_outage') {
    warnings.push('System: Partial outage detected');
  } else if (statusChecks.system.status === 'degraded_performance') {
    warnings.push('System: Degraded performance detected');
  } else {
    checks.push('System uptime OK');
  }
  
  // Check backup service
  if (statusChecks.backup.running) {
    checks.push('Backup service running');
  } else {
    warnings.push('Backup service not running');
  }
  
  // Check logging
  if (statusChecks.logging.initialized) {
    checks.push('Logging system initialized');
  } else {
    warnings.push('Logging system not initialized');
  }
  
  // Check external services
  for (const [service, status] of Object.entries(statusChecks.externalServices)) {
    if (status.status === 'healthy') {
      checks.push(`${service} service OK`);
    } else {
      warnings.push(`${service} service: ${status.error || 'Connection failed'}`);
    }
  }
  
  // Determine overall status
  let overallStatus = 'healthy';
  
  if (errors.length > 0) {
    overallStatus = 'critical';
  } else if (warnings.length > 0) {
    overallStatus = 'degraded';
  }
  
  return {
    status: overallStatus,
    checks,
    warnings,
    errors
  };
}

module.exports = router;