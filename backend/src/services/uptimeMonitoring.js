/**
 * Uptime and Server Monitoring Service
 * Lion Football Academy - Comprehensive Service Health Monitoring
 */

const axios = require('axios');
const logger = require('../utils/logger');
const performanceMonitoring = require('./performanceMonitoring');

class UptimeMonitoringService {
  constructor() {
    this.services = new Map();
    this.checks = new Map();
    this.incidents = [];
    this.statusHistory = new Map();
    this.isRunning = false;
    
    this.config = {
      checkInterval: parseInt(process.env.UPTIME_CHECK_INTERVAL) || 60000, // 1 minute
      timeout: parseInt(process.env.UPTIME_TIMEOUT) || 10000, // 10 seconds
      retryAttempts: parseInt(process.env.UPTIME_RETRY_ATTEMPTS) || 3,
      retryDelay: parseInt(process.env.UPTIME_RETRY_DELAY) || 5000, // 5 seconds
      incidentThreshold: 3, // Failed checks before incident
      recoveryThreshold: 2  // Successful checks before recovery
    };

    // Initialize default services to monitor
    this.initializeDefaultServices();
  }

  // Initialize default services for monitoring
  initializeDefaultServices() {
    const defaultServices = [
      {
        id: 'backend_health',
        name: 'Backend Health Check',
        url: process.env.BACKEND_URL ? `${process.env.BACKEND_URL}/health` : 'http://localhost:5001/health',
        method: 'GET',
        expectedStatus: 200,
        timeout: 5000,
        critical: true
      },
      {
        id: 'frontend',
        name: 'Frontend Application',
        url: process.env.FRONTEND_URL || 'http://localhost:3000',
        method: 'GET',
        expectedStatus: 200,
        timeout: 10000,
        critical: true
      },
      {
        id: 'database',
        name: 'Database Connection',
        type: 'internal',
        check: () => this.checkDatabaseConnection(),
        critical: true
      },
      {
        id: 'external_email',
        name: 'Email Service',
        type: 'internal',
        check: () => this.checkEmailService(),
        critical: false
      }
    ];

    defaultServices.forEach(service => this.addService(service));
  }

  // Add a service to monitor
  addService(serviceConfig) {
    const service = {
      id: serviceConfig.id,
      name: serviceConfig.name,
      url: serviceConfig.url,
      method: serviceConfig.method || 'GET',
      expectedStatus: serviceConfig.expectedStatus || 200,
      timeout: serviceConfig.timeout || this.config.timeout,
      headers: serviceConfig.headers || {},
      body: serviceConfig.body,
      type: serviceConfig.type || 'http',
      check: serviceConfig.check,
      critical: serviceConfig.critical !== false,
      enabled: serviceConfig.enabled !== false,
      status: 'unknown',
      lastCheck: null,
      lastSuccess: null,
      lastFailure: null,
      consecutiveFailures: 0,
      consecutiveSuccesses: 0,
      uptime: 100,
      responseTime: 0,
      incident: null
    };

    this.services.set(service.id, service);
    this.statusHistory.set(service.id, []);

    logger.info('Service added to uptime monitoring', {
      serviceId: service.id,
      serviceName: service.name,
      critical: service.critical
    });

    return service;
  }

  // Remove a service from monitoring
  removeService(serviceId) {
    const service = this.services.get(serviceId);
    if (service) {
      this.services.delete(serviceId);
      this.statusHistory.delete(serviceId);
      
      logger.info('Service removed from uptime monitoring', {
        serviceId,
        serviceName: service.name
      });
      
      return true;
    }
    return false;
  }

  // Start monitoring all services
  startMonitoring() {
    if (this.isRunning) {
      logger.warn('Uptime monitoring is already running');
      return;
    }

    this.isRunning = true;
    
    // Initial check for all services
    this.checkAllServices();
    
    // Set up periodic checks
    this.monitoringInterval = setInterval(() => {
      this.checkAllServices();
    }, this.config.checkInterval);

    // Clean old status history every hour
    this.cleanupInterval = setInterval(() => {
      this.cleanupStatusHistory();
    }, 3600000);

    logger.info('Uptime monitoring started', {
      checkInterval: this.config.checkInterval,
      servicesCount: this.services.size
    });
  }

  // Stop monitoring
  stopMonitoring() {
    if (!this.isRunning) return;

    this.isRunning = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    logger.info('Uptime monitoring stopped');
  }

  // Check all enabled services
  async checkAllServices() {
    const promises = Array.from(this.services.values())
      .filter(service => service.enabled)
      .map(service => this.checkService(service.id));

    await Promise.allSettled(promises);
    
    // Update overall system status
    this.updateSystemStatus();
  }

  // Check a specific service
  async checkService(serviceId) {
    const service = this.services.get(serviceId);
    if (!service || !service.enabled) return null;

    const startTime = Date.now();
    let result = {
      serviceId,
      timestamp: new Date().toISOString(),
      status: 'unknown',
      responseTime: 0,
      error: null,
      statusCode: null
    };

    try {
      if (service.type === 'internal') {
        // Internal check (custom function)
        result = await this.performInternalCheck(service, startTime);
      } else {
        // HTTP check
        result = await this.performHttpCheck(service, startTime);
      }

      // Update service status
      this.updateServiceStatus(service, result);
      
    } catch (error) {
      result.status = 'down';
      result.error = error.message;
      result.responseTime = Date.now() - startTime;
      
      this.updateServiceStatus(service, result);
      
      logger.error('Service check failed', {
        serviceId,
        serviceName: service.name,
        error: error.message
      });
    }

    return result;
  }

  // Perform HTTP check
  async performHttpCheck(service, startTime) {
    let attempt = 0;
    let lastError = null;

    while (attempt < this.config.retryAttempts) {
      try {
        const response = await axios({
          method: service.method,
          url: service.url,
          timeout: service.timeout,
          headers: service.headers,
          data: service.body,
          validateStatus: (status) => status === service.expectedStatus
        });

        const responseTime = Date.now() - startTime;

        return {
          serviceId: service.id,
          timestamp: new Date().toISOString(),
          status: 'up',
          responseTime,
          statusCode: response.status,
          error: null
        };

      } catch (error) {
        lastError = error;
        attempt++;
        
        if (attempt < this.config.retryAttempts) {
          logger.warn(`Service check attempt ${attempt} failed, retrying`, {
            serviceId: service.id,
            error: error.message
          });
          
          await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
        }
      }
    }

    // All attempts failed
    const responseTime = Date.now() - startTime;
    
    return {
      serviceId: service.id,
      timestamp: new Date().toISOString(),
      status: 'down',
      responseTime,
      statusCode: lastError.response?.status || null,
      error: lastError.message
    };
  }

  // Perform internal check (custom function)
  async performInternalCheck(service, startTime) {
    try {
      const checkResult = await service.check();
      const responseTime = Date.now() - startTime;

      return {
        serviceId: service.id,
        timestamp: new Date().toISOString(),
        status: checkResult.status || 'up',
        responseTime,
        error: checkResult.error || null,
        details: checkResult.details
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        serviceId: service.id,
        timestamp: new Date().toISOString(),
        status: 'down',
        responseTime,
        error: error.message
      };
    }
  }

  // Update service status based on check result
  updateServiceStatus(service, result) {
    const previousStatus = service.status;
    
    service.lastCheck = result.timestamp;
    service.status = result.status;
    service.responseTime = result.responseTime;

    if (result.status === 'up') {
      service.lastSuccess = result.timestamp;
      service.consecutiveFailures = 0;
      service.consecutiveSuccesses++;
      
      // Check for recovery
      if (previousStatus === 'down' && 
          service.consecutiveSuccesses >= this.config.recoveryThreshold) {
        this.handleServiceRecovery(service);
      }
      
    } else {
      service.lastFailure = result.timestamp;
      service.consecutiveSuccesses = 0;
      service.consecutiveFailures++;
      
      // Check for incident
      if (service.consecutiveFailures >= this.config.incidentThreshold && 
          !service.incident) {
        this.createIncident(service, result);
      }
    }

    // Record status history
    this.recordStatusHistory(service.id, result);
    
    // Update uptime calculation
    this.calculateUptime(service);

    // Log status change
    if (previousStatus !== service.status) {
      logger.info('Service status changed', {
        serviceId: service.id,
        serviceName: service.name,
        previousStatus,
        currentStatus: service.status,
        consecutiveFailures: service.consecutiveFailures,
        responseTime: service.responseTime
      });
    }
  }

  // Record status in history for uptime calculation
  recordStatusHistory(serviceId, result) {
    const history = this.statusHistory.get(serviceId) || [];
    
    history.push({
      timestamp: result.timestamp,
      status: result.status,
      responseTime: result.responseTime
    });

    // Keep only last 24 hours of history
    const cutoff = new Date(Date.now() - 86400000);
    const filteredHistory = history.filter(h => new Date(h.timestamp) > cutoff);
    
    this.statusHistory.set(serviceId, filteredHistory);
  }

  // Calculate uptime percentage
  calculateUptime(service) {
    const history = this.statusHistory.get(service.id) || [];
    
    if (history.length === 0) {
      service.uptime = 100;
      return;
    }

    const upCount = history.filter(h => h.status === 'up').length;
    service.uptime = (upCount / history.length) * 100;
  }

  // Create incident when service is consistently down
  createIncident(service, result) {
    const incident = {
      id: `incident_${service.id}_${Date.now()}`,
      serviceId: service.id,
      serviceName: service.name,
      startTime: new Date().toISOString(),
      endTime: null,
      status: 'open',
      severity: service.critical ? 'critical' : 'warning',
      description: `Service ${service.name} is down`,
      details: {
        error: result.error,
        statusCode: result.statusCode,
        consecutiveFailures: service.consecutiveFailures
      }
    };

    service.incident = incident;
    this.incidents.push(incident);

    logger.error('Incident created for service downtime', {
      incidentId: incident.id,
      serviceId: service.id,
      serviceName: service.name,
      severity: incident.severity
    });

    // Send alert
    this.sendAlert(incident);
  }

  // Handle service recovery
  handleServiceRecovery(service) {
    if (service.incident) {
      service.incident.endTime = new Date().toISOString();
      service.incident.status = 'resolved';
      
      const duration = new Date(service.incident.endTime) - new Date(service.incident.startTime);
      
      logger.info('Service recovered from incident', {
        incidentId: service.incident.id,
        serviceId: service.id,
        serviceName: service.name,
        duration: `${Math.round(duration / 1000)}s`
      });

      // Send recovery notification
      this.sendRecoveryNotification(service.incident);
      
      service.incident = null;
    }
  }

  // Send alert for incidents
  async sendAlert(incident) {
    try {
      // Slack notification
      if (process.env.SLACK_WEBHOOK_URL) {
        await this.sendSlackAlert(incident);
      }

      // Email notification
      if (process.env.ALERT_EMAIL && incident.severity === 'critical') {
        await this.sendEmailAlert(incident);
      }

      // PagerDuty integration
      if (process.env.PAGERDUTY_INTEGRATION_KEY && incident.severity === 'critical') {
        await this.sendPagerDutyAlert(incident);
      }

    } catch (error) {
      logger.error('Failed to send alert', {
        incidentId: incident.id,
        error: error.message
      });
    }
  }

  // Send Slack alert
  async sendSlackAlert(incident) {
    const color = incident.severity === 'critical' ? 'danger' : 'warning';
    const emoji = incident.severity === 'critical' ? '🚨' : '⚠️';
    
    await axios.post(process.env.SLACK_WEBHOOK_URL, {
      text: `${emoji} *Service Alert*: ${incident.serviceName} is down`,
      attachments: [{
        color,
        fields: [{
          title: 'Service',
          value: incident.serviceName,
          short: true
        }, {
          title: 'Severity',
          value: incident.severity.toUpperCase(),
          short: true
        }, {
          title: 'Started',
          value: incident.startTime,
          short: true
        }, {
          title: 'Error',
          value: incident.details.error || 'Unknown error',
          short: false
        }]
      }]
    });
  }

  // Send recovery notification
  async sendRecoveryNotification(incident) {
    try {
      if (process.env.SLACK_WEBHOOK_URL) {
        await axios.post(process.env.SLACK_WEBHOOK_URL, {
          text: `✅ *Service Recovered*: ${incident.serviceName} is back online`,
          attachments: [{
            color: 'good',
            fields: [{
              title: 'Service',
              value: incident.serviceName,
              short: true
            }, {
              title: 'Downtime',
              value: this.formatDuration(incident.startTime, incident.endTime),
              short: true
            }]
          }]
        });
      }
    } catch (error) {
      logger.error('Failed to send recovery notification', {
        incidentId: incident.id,
        error: error.message
      });
    }
  }

  // Database connection check
  async checkDatabaseConnection() {
    try {
      // This would use your actual database connection
      // For now, simulate a database check
      const db = require('../database/connection');
      
      // Simple query to test connection
      await new Promise((resolve, reject) => {
        db.get('SELECT 1', (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      return { status: 'up' };
      
    } catch (error) {
      return {
        status: 'down',
        error: error.message
      };
    }
  }

  // Email service check
  async checkEmailService() {
    try {
      // Check email service connectivity
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
      
      return { status: 'up' };
      
    } catch (error) {
      return {
        status: 'down',
        error: error.message
      };
    }
  }

  // Update overall system status
  updateSystemStatus() {
    const criticalServices = Array.from(this.services.values())
      .filter(service => service.critical && service.enabled);
    
    const downCriticalServices = criticalServices.filter(service => service.status === 'down');
    const degradedServices = criticalServices.filter(service => 
      service.status === 'up' && service.responseTime > 5000
    );

    let systemStatus = 'operational';
    
    if (downCriticalServices.length > 0) {
      systemStatus = 'major_outage';
    } else if (degradedServices.length > 0) {
      systemStatus = 'degraded_performance';
    } else if (this.getRecentIncidents().length > 0) {
      systemStatus = 'partial_outage';
    }

    // Record system status for monitoring
    performanceMonitoring.recordMetric('system_status', {
      timestamp: new Date().toISOString(),
      status: systemStatus,
      criticalServicesDown: downCriticalServices.length,
      degradedServices: degradedServices.length,
      totalServices: this.services.size
    });
  }

  // Get recent incidents (last 24 hours)
  getRecentIncidents() {
    const cutoff = new Date(Date.now() - 86400000);
    return this.incidents.filter(incident => 
      new Date(incident.startTime) > cutoff
    );
  }

  // Get overall system status
  getSystemStatus() {
    const services = Array.from(this.services.values());
    const criticalServices = services.filter(s => s.critical);
    
    const upServices = services.filter(s => s.status === 'up').length;
    const downServices = services.filter(s => s.status === 'down').length;
    const criticalDown = criticalServices.filter(s => s.status === 'down').length;
    
    let overallStatus = 'operational';
    
    if (criticalDown > 0) {
      overallStatus = 'major_outage';
    } else if (downServices > 0) {
      overallStatus = 'partial_outage';
    } else {
      const avgResponseTime = services.reduce((sum, s) => sum + s.responseTime, 0) / services.length;
      if (avgResponseTime > 5000) {
        overallStatus = 'degraded_performance';
      }
    }

    return {
      status: overallStatus,
      services: {
        total: services.length,
        up: upServices,
        down: downServices,
        critical: criticalServices.length,
        criticalDown
      },
      incidents: {
        open: this.incidents.filter(i => i.status === 'open').length,
        recent: this.getRecentIncidents().length
      },
      lastUpdate: new Date().toISOString()
    };
  }

  // Get service details
  getServiceStatus(serviceId) {
    const service = this.services.get(serviceId);
    if (!service) return null;

    const history = this.statusHistory.get(serviceId) || [];
    const recentHistory = history.slice(-100); // Last 100 checks

    return {
      ...service,
      history: recentHistory,
      incidents: this.incidents.filter(i => i.serviceId === serviceId)
    };
  }

  // Get all services status
  getAllServicesStatus() {
    return Array.from(this.services.values()).map(service => ({
      id: service.id,
      name: service.name,
      status: service.status,
      uptime: service.uptime,
      responseTime: service.responseTime,
      lastCheck: service.lastCheck,
      critical: service.critical,
      incident: service.incident
    }));
  }

  // Format duration
  formatDuration(startTime, endTime) {
    const duration = new Date(endTime) - new Date(startTime);
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  }

  // Clean up old status history
  cleanupStatusHistory() {
    const cutoff = new Date(Date.now() - 172800000); // 48 hours
    
    for (const [serviceId, history] of this.statusHistory.entries()) {
      const filtered = history.filter(h => new Date(h.timestamp) > cutoff);
      this.statusHistory.set(serviceId, filtered);
    }

    // Clean up old incidents
    this.incidents = this.incidents.filter(incident => 
      new Date(incident.startTime) > cutoff
    );

    logger.debug('Uptime monitoring cleanup completed');
  }
}

// Create singleton instance
const uptimeMonitoring = new UptimeMonitoringService();

module.exports = uptimeMonitoring;