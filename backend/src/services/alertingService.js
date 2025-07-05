/**
 * Comprehensive Alerting and Notification Service
 * Lion Football Academy - Multi-channel Alert Management System
 */

const axios = require('axios');
const nodemailer = require('nodemailer');
const twilio = require('twilio');
const centralizedLogging = require('./centralizedLogging');
const performanceMonitoring = require('./performanceMonitoring');
const uptimeMonitoring = require('./uptimeMonitoring');

class AlertingService {
  constructor() {
    this.isInitialized = false;
    this.alerts = new Map();
    this.alertHistory = [];
    this.suppressedAlerts = new Set();
    this.escalationRules = new Map();
    
    this.config = {
      // Alert channels
      channels: {
        slack: {
          enabled: process.env.ALERT_SLACK_ENABLED === 'true',
          webhookUrl: process.env.SLACK_WEBHOOK_URL,
          channel: process.env.SLACK_ALERT_CHANNEL || '#alerts',
          username: process.env.SLACK_ALERT_USERNAME || 'LFA Monitor'
        },
        email: {
          enabled: process.env.ALERT_EMAIL_ENABLED === 'true',
          host: process.env.EMAIL_HOST,
          port: process.env.EMAIL_PORT || 587,
          secure: process.env.EMAIL_SECURE === 'true',
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
          from: process.env.ALERT_EMAIL_FROM || 'noreply@lionfootballacademy.com',
          recipients: (process.env.ALERT_EMAIL_RECIPIENTS || '').split(',').filter(Boolean)
        },
        sms: {
          enabled: process.env.ALERT_SMS_ENABLED === 'true',
          accountSid: process.env.TWILIO_ACCOUNT_SID,
          authToken: process.env.TWILIO_AUTH_TOKEN,
          fromNumber: process.env.TWILIO_FROM_NUMBER,
          recipients: (process.env.ALERT_SMS_RECIPIENTS || '').split(',').filter(Boolean)
        },
        webhook: {
          enabled: process.env.ALERT_WEBHOOK_ENABLED === 'true',
          url: process.env.ALERT_WEBHOOK_URL,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': process.env.ALERT_WEBHOOK_AUTH || ''
          }
        },
        pagerduty: {
          enabled: process.env.ALERT_PAGERDUTY_ENABLED === 'true',
          integrationKey: process.env.PAGERDUTY_INTEGRATION_KEY,
          routingKey: process.env.PAGERDUTY_ROUTING_KEY
        },
        discord: {
          enabled: process.env.ALERT_DISCORD_ENABLED === 'true',
          webhookUrl: process.env.DISCORD_WEBHOOK_URL
        }
      },
      
      // Alert thresholds and rules
      rules: {
        // Error rate thresholds
        errorRate: {
          warning: parseFloat(process.env.ALERT_ERROR_RATE_WARNING) || 0.05, // 5%
          critical: parseFloat(process.env.ALERT_ERROR_RATE_CRITICAL) || 0.10 // 10%
        },
        
        // Response time thresholds
        responseTime: {
          warning: parseInt(process.env.ALERT_RESPONSE_TIME_WARNING) || 1000, // 1s
          critical: parseInt(process.env.ALERT_RESPONSE_TIME_CRITICAL) || 3000 // 3s
        },
        
        // Memory usage thresholds
        memoryUsage: {
          warning: parseFloat(process.env.ALERT_MEMORY_WARNING) || 0.80, // 80%
          critical: parseFloat(process.env.ALERT_MEMORY_CRITICAL) || 0.90 // 90%
        },
        
        // Database connection thresholds
        databaseConnections: {
          warning: parseInt(process.env.ALERT_DB_CONNECTIONS_WARNING) || 80,
          critical: parseInt(process.env.ALERT_DB_CONNECTIONS_CRITICAL) || 95
        }
      },
      
      // Alert management settings
      management: {
        suppressionDuration: parseInt(process.env.ALERT_SUPPRESSION_DURATION) || 300000, // 5 minutes
        escalationDelay: parseInt(process.env.ALERT_ESCALATION_DELAY) || 900000, // 15 minutes
        maxAlertsPerHour: parseInt(process.env.ALERT_MAX_PER_HOUR) || 50,
        retryAttempts: parseInt(process.env.ALERT_RETRY_ATTEMPTS) || 3,
        retryDelay: parseInt(process.env.ALERT_RETRY_DELAY) || 5000 // 5 seconds
      }
    };
    
    this.emailTransporter = null;
    this.twilioClient = null;
    
    this.initializeServices();
    this.setupAlertRules();
    this.startAlertMonitoring();
  }
  
  // Initialize external services
  initializeServices() {
    try {
      // Initialize email transporter
      if (this.config.channels.email.enabled && this.config.channels.email.host) {
        this.emailTransporter = nodemailer.createTransporter({
          host: this.config.channels.email.host,
          port: this.config.channels.email.port,
          secure: this.config.channels.email.secure,
          auth: {
            user: this.config.channels.email.user,
            pass: this.config.channels.email.pass
          }
        });
      }
      
      // Initialize Twilio client
      if (this.config.channels.sms.enabled && this.config.channels.sms.accountSid) {
        this.twilioClient = twilio(
          this.config.channels.sms.accountSid,
          this.config.channels.sms.authToken
        );
      }
      
      this.isInitialized = true;
      centralizedLogging.logApplication('INFO', 'Alerting service initialized successfully');
      
    } catch (error) {
      centralizedLogging.logError('Failed to initialize alerting service', error);
    }
  }
  
  // Setup alert rules and escalation
  setupAlertRules() {
    // Define escalation rules
    this.escalationRules.set('critical', {
      channels: ['slack', 'email', 'sms', 'pagerduty'],
      delay: 0,
      maxRetries: 5
    });
    
    this.escalationRules.set('warning', {
      channels: ['slack', 'email'],
      delay: this.config.management.escalationDelay,
      maxRetries: 3
    });
    
    this.escalationRules.set('info', {
      channels: ['slack'],
      delay: this.config.management.escalationDelay * 2,
      maxRetries: 1
    });
  }
  
  // Start monitoring for alerts
  startAlertMonitoring() {
    // Monitor performance metrics every 30 seconds
    setInterval(() => {
      this.checkPerformanceAlerts();
    }, 30000);
    
    // Monitor system health every minute
    setInterval(() => {
      this.checkSystemHealthAlerts();
    }, 60000);
    
    // Monitor uptime status every 2 minutes
    setInterval(() => {
      this.checkUptimeAlerts();
    }, 120000);
    
    // Clean up old alerts every hour
    setInterval(() => {
      this.cleanupAlerts();
    }, 3600000);
    
    centralizedLogging.logApplication('INFO', 'Alert monitoring started');
  }
  
  // Check performance-related alerts
  checkPerformanceAlerts() {
    try {
      const performanceStatus = performanceMonitoring.getHealthStatus();
      const summary = performanceStatus.metrics.performance;
      
      // Check error rate
      if (summary.api && summary.api.errorRate) {
        const errorRate = parseFloat(summary.api.errorRate);
        
        if (errorRate >= this.config.rules.errorRate.critical) {
          this.triggerAlert('high_error_rate', 'critical', {
            message: `Critical error rate: ${errorRate}%`,
            errorRate,
            threshold: this.config.rules.errorRate.critical * 100
          });
        } else if (errorRate >= this.config.rules.errorRate.warning) {
          this.triggerAlert('high_error_rate', 'warning', {
            message: `High error rate: ${errorRate}%`,
            errorRate,
            threshold: this.config.rules.errorRate.warning * 100
          });
        }
      }
      
      // Check response time
      if (summary.api && summary.api.averageResponseTime) {
        const responseTime = summary.api.averageResponseTime;
        
        if (responseTime >= this.config.rules.responseTime.critical) {
          this.triggerAlert('slow_response_time', 'critical', {
            message: `Critical response time: ${responseTime}ms`,
            responseTime,
            threshold: this.config.rules.responseTime.critical
          });
        } else if (responseTime >= this.config.rules.responseTime.warning) {
          this.triggerAlert('slow_response_time', 'warning', {
            message: `Slow response time: ${responseTime}ms`,
            responseTime,
            threshold: this.config.rules.responseTime.warning
          });
        }
      }
      
      // Check memory usage
      if (summary.system && summary.system.averageMemoryUsage) {
        const memoryUsage = parseFloat(summary.system.averageMemoryUsage) / 100;
        
        if (memoryUsage >= this.config.rules.memoryUsage.critical) {
          this.triggerAlert('high_memory_usage', 'critical', {
            message: `Critical memory usage: ${(memoryUsage * 100).toFixed(1)}%`,
            memoryUsage: memoryUsage * 100,
            threshold: this.config.rules.memoryUsage.critical * 100
          });
        } else if (memoryUsage >= this.config.rules.memoryUsage.warning) {
          this.triggerAlert('high_memory_usage', 'warning', {
            message: `High memory usage: ${(memoryUsage * 100).toFixed(1)}%`,
            memoryUsage: memoryUsage * 100,
            threshold: this.config.rules.memoryUsage.warning * 100
          });
        }
      }
      
    } catch (error) {
      centralizedLogging.logError('Failed to check performance alerts', error);
    }
  }
  
  // Check system health alerts
  checkSystemHealthAlerts() {
    try {
      const systemStatus = uptimeMonitoring.getSystemStatus();
      
      // Check for service outages
      if (systemStatus.status === 'major_outage') {
        this.triggerAlert('major_outage', 'critical', {
          message: 'Major system outage detected',
          downServices: systemStatus.services.criticalDown,
          totalServices: systemStatus.services.total
        });
      } else if (systemStatus.status === 'partial_outage') {
        this.triggerAlert('partial_outage', 'warning', {
          message: 'Partial system outage detected',
          downServices: systemStatus.services.down,
          totalServices: systemStatus.services.total
        });
      } else if (systemStatus.status === 'degraded_performance') {
        this.triggerAlert('degraded_performance', 'warning', {
          message: 'System performance degradation detected',
          affectedServices: systemStatus.services.down
        });
      }
      
      // Check for open incidents
      if (systemStatus.incidents.open > 0) {
        this.triggerAlert('open_incidents', 'warning', {
          message: `${systemStatus.incidents.open} open incidents detected`,
          openIncidents: systemStatus.incidents.open,
          recentIncidents: systemStatus.incidents.recent
        });
      }
      
    } catch (error) {
      centralizedLogging.logError('Failed to check system health alerts', error);
    }
  }
  
  // Check uptime-related alerts
  checkUptimeAlerts() {
    try {
      const allServices = uptimeMonitoring.getAllServicesStatus();
      
      for (const service of allServices) {
        if (service.critical && service.status === 'down') {
          this.triggerAlert('critical_service_down', 'critical', {
            message: `Critical service down: ${service.name}`,
            serviceName: service.name,
            serviceId: service.id,
            lastCheck: service.lastCheck
          });
        } else if (service.status === 'down') {
          this.triggerAlert('service_down', 'warning', {
            message: `Service down: ${service.name}`,
            serviceName: service.name,
            serviceId: service.id,
            lastCheck: service.lastCheck
          });
        }
        
        // Check for low uptime
        if (service.uptime < 99.0 && service.critical) {
          this.triggerAlert('low_uptime', 'warning', {
            message: `Low uptime for ${service.name}: ${service.uptime.toFixed(2)}%`,
            serviceName: service.name,
            uptime: service.uptime
          });
        }
      }
      
    } catch (error) {
      centralizedLogging.logError('Failed to check uptime alerts', error);
    }
  }
  
  // Trigger an alert
  async triggerAlert(alertId, severity, data = {}) {
    try {
      const alertKey = `${alertId}_${severity}`;
      
      // Check if alert is suppressed
      if (this.suppressedAlerts.has(alertKey)) {
        return;
      }
      
      // Check if same alert is already active
      if (this.alerts.has(alertKey)) {
        const existingAlert = this.alerts.get(alertKey);
        
        // Update occurrence count
        existingAlert.occurrences++;
        existingAlert.lastOccurrence = new Date().toISOString();
        
        // Skip if too many alerts in short time
        if (existingAlert.occurrences > this.config.management.maxAlertsPerHour) {
          return;
        }
      } else {
        // Create new alert
        const alert = {
          id: alertKey,
          alertId,
          severity,
          message: data.message || `Alert: ${alertId}`,
          data,
          timestamp: new Date().toISOString(),
          occurrences: 1,
          lastOccurrence: new Date().toISOString(),
          status: 'active',
          escalated: false
        };
        
        this.alerts.set(alertKey, alert);
      }
      
      // Send alert notifications
      await this.sendAlertNotifications(alertKey);
      
      // Log alert
      centralizedLogging.logApplication('WARN', `Alert triggered: ${alertId}`, {
        alertId,
        severity,
        data
      });
      
    } catch (error) {
      centralizedLogging.logError('Failed to trigger alert', error, {
        alertId,
        severity
      });
    }
  }
  
  // Send alert notifications through configured channels
  async sendAlertNotifications(alertKey) {
    const alert = this.alerts.get(alertKey);
    if (!alert) return;
    
    const escalationRule = this.escalationRules.get(alert.severity) || this.escalationRules.get('warning');
    
    for (const channel of escalationRule.channels) {
      try {
        await this.sendNotification(channel, alert);
      } catch (error) {
        centralizedLogging.logError(`Failed to send ${channel} notification`, error, {
          alertId: alert.alertId,
          severity: alert.severity
        });
      }
    }
    
    // Add to history
    this.alertHistory.push({
      ...alert,
      sentAt: new Date().toISOString()
    });
    
    // Keep only last 1000 alerts in history
    if (this.alertHistory.length > 1000) {
      this.alertHistory = this.alertHistory.slice(-1000);
    }
  }
  
  // Send notification to specific channel
  async sendNotification(channel, alert) {
    switch (channel) {
      case 'slack':
        if (this.config.channels.slack.enabled) {
          await this.sendSlackNotification(alert);
        }
        break;
        
      case 'email':
        if (this.config.channels.email.enabled) {
          await this.sendEmailNotification(alert);
        }
        break;
        
      case 'sms':
        if (this.config.channels.sms.enabled) {
          await this.sendSMSNotification(alert);
        }
        break;
        
      case 'webhook':
        if (this.config.channels.webhook.enabled) {
          await this.sendWebhookNotification(alert);
        }
        break;
        
      case 'pagerduty':
        if (this.config.channels.pagerduty.enabled) {
          await this.sendPagerDutyNotification(alert);
        }
        break;
        
      case 'discord':
        if (this.config.channels.discord.enabled) {
          await this.sendDiscordNotification(alert);
        }
        break;
    }
  }
  
  // Send Slack notification
  async sendSlackNotification(alert) {
    const colors = {
      critical: '#ff0000',
      warning: '#ffaa00',
      info: '#36a64f'
    };
    
    const emojis = {
      critical: '🚨',
      warning: '⚠️',
      info: 'ℹ️'
    };
    
    const payload = {
      username: this.config.channels.slack.username,
      channel: this.config.channels.slack.channel,
      text: `${emojis[alert.severity]} *${alert.severity.toUpperCase()} ALERT*`,
      attachments: [{
        color: colors[alert.severity],
        title: alert.message,
        fields: [
          {
            title: 'Alert ID',
            value: alert.alertId,
            short: true
          },
          {
            title: 'Severity',
            value: alert.severity.toUpperCase(),
            short: true
          },
          {
            title: 'Timestamp',
            value: alert.timestamp,
            short: true
          },
          {
            title: 'Occurrences',
            value: alert.occurrences.toString(),
            short: true
          }
        ],
        footer: 'Lion Football Academy Monitoring',
        ts: Math.floor(new Date(alert.timestamp).getTime() / 1000)
      }]
    };
    
    // Add alert-specific data
    if (alert.data && Object.keys(alert.data).length > 0) {
      const dataFields = Object.entries(alert.data)
        .filter(([key]) => key !== 'message')
        .map(([key, value]) => ({
          title: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
          value: value.toString(),
          short: true
        }));
      
      payload.attachments[0].fields.push(...dataFields);
    }
    
    await axios.post(this.config.channels.slack.webhookUrl, payload);
  }
  
  // Send email notification
  async sendEmailNotification(alert) {
    const subject = `[${alert.severity.toUpperCase()}] ${alert.message}`;
    
    const html = `
      <h2 style="color: ${alert.severity === 'critical' ? '#ff0000' : '#ffaa00'}">
        ${alert.severity.toUpperCase()} ALERT
      </h2>
      <p><strong>Message:</strong> ${alert.message}</p>
      <p><strong>Alert ID:</strong> ${alert.alertId}</p>
      <p><strong>Timestamp:</strong> ${alert.timestamp}</p>
      <p><strong>Occurrences:</strong> ${alert.occurrences}</p>
      
      ${alert.data && Object.keys(alert.data).length > 0 ? `
        <h3>Alert Details:</h3>
        <ul>
          ${Object.entries(alert.data)
            .filter(([key]) => key !== 'message')
            .map(([key, value]) => `<li><strong>${key}:</strong> ${value}</li>`)
            .join('')}
        </ul>
      ` : ''}
      
      <hr>
      <p><small>Lion Football Academy Monitoring System</small></p>
    `;
    
    for (const recipient of this.config.channels.email.recipients) {
      await this.emailTransporter.sendMail({
        from: this.config.channels.email.from,
        to: recipient,
        subject,
        html
      });
    }
  }
  
  // Send SMS notification (for critical alerts only)
  async sendSMSNotification(alert) {
    if (alert.severity !== 'critical') return;
    
    const message = `CRITICAL ALERT: ${alert.message} - Lion Football Academy Monitor`;
    
    for (const recipient of this.config.channels.sms.recipients) {
      await this.twilioClient.messages.create({
        body: message,
        from: this.config.channels.sms.fromNumber,
        to: recipient
      });
    }
  }
  
  // Send webhook notification
  async sendWebhookNotification(alert) {
    const payload = {
      alert_id: alert.alertId,
      severity: alert.severity,
      message: alert.message,
      timestamp: alert.timestamp,
      occurrences: alert.occurrences,
      data: alert.data,
      service: 'lion-football-academy'
    };
    
    await axios.post(this.config.channels.webhook.url, payload, {
      headers: this.config.channels.webhook.headers,
      timeout: 10000
    });
  }
  
  // Send PagerDuty notification
  async sendPagerDutyNotification(alert) {
    const payload = {
      routing_key: this.config.channels.pagerduty.routingKey,
      event_action: 'trigger',
      payload: {
        summary: alert.message,
        source: 'lion-football-academy',
        severity: alert.severity,
        timestamp: alert.timestamp,
        custom_details: alert.data
      }
    };
    
    await axios.post('https://events.pagerduty.com/v2/enqueue', payload, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
  
  // Send Discord notification
  async sendDiscordNotification(alert) {
    const colors = {
      critical: 16711680, // Red
      warning: 16776960,  // Yellow
      info: 65280       // Green
    };
    
    const payload = {
      embeds: [{
        title: `${alert.severity.toUpperCase()} ALERT`,
        description: alert.message,
        color: colors[alert.severity],
        fields: [
          {
            name: 'Alert ID',
            value: alert.alertId,
            inline: true
          },
          {
            name: 'Timestamp',
            value: alert.timestamp,
            inline: true
          },
          {
            name: 'Occurrences',
            value: alert.occurrences.toString(),
            inline: true
          }
        ],
        footer: {
          text: 'Lion Football Academy Monitoring'
        },
        timestamp: alert.timestamp
      }]
    };
    
    await axios.post(this.config.channels.discord.webhookUrl, payload);
  }
  
  // Suppress alert for specified duration
  suppressAlert(alertId, severity, duration = null) {
    const alertKey = `${alertId}_${severity}`;
    const suppressionDuration = duration || this.config.management.suppressionDuration;
    
    this.suppressedAlerts.add(alertKey);
    
    setTimeout(() => {
      this.suppressedAlerts.delete(alertKey);
    }, suppressionDuration);
    
    centralizedLogging.logApplication('INFO', `Alert suppressed: ${alertKey} for ${suppressionDuration}ms`);
  }
  
  // Resolve alert
  resolveAlert(alertId, severity) {
    const alertKey = `${alertId}_${severity}`;
    
    if (this.alerts.has(alertKey)) {
      const alert = this.alerts.get(alertKey);
      alert.status = 'resolved';
      alert.resolvedAt = new Date().toISOString();
      
      this.alerts.delete(alertKey);
      
      centralizedLogging.logApplication('INFO', `Alert resolved: ${alertKey}`);
    }
  }
  
  // Clean up old alerts
  cleanupAlerts() {
    const cutoff = new Date(Date.now() - 86400000); // 24 hours
    
    // Clean active alerts
    for (const [key, alert] of this.alerts.entries()) {
      if (new Date(alert.timestamp) < cutoff) {
        this.alerts.delete(key);
      }
    }
    
    // Clean alert history
    this.alertHistory = this.alertHistory.filter(alert => 
      new Date(alert.timestamp) > cutoff
    );
    
    centralizedLogging.logDebug('Alert cleanup completed', {
      activeAlerts: this.alerts.size,
      historySize: this.alertHistory.length
    });
  }
  
  // Get alerting status
  getAlertingStatus() {
    return {
      initialized: this.isInitialized,
      activeAlerts: this.alerts.size,
      suppressedAlerts: this.suppressedAlerts.size,
      totalAlerts: this.alertHistory.length,
      channels: Object.fromEntries(
        Object.entries(this.config.channels).map(([key, config]) => [
          key,
          { enabled: config.enabled }
        ])
      ),
      recentAlerts: this.alertHistory.slice(-10)
    };
  }
  
  // Get all active alerts
  getActiveAlerts() {
    return Array.from(this.alerts.values());
  }
  
  // Get alert history
  getAlertHistory(limit = 100) {
    return this.alertHistory.slice(-limit);
  }
  
  // Test alert functionality
  async testAlerts() {
    try {
      await this.triggerAlert('test_alert', 'info', {
        message: 'This is a test alert to verify the alerting system',
        testRun: true,
        timestamp: new Date().toISOString()
      });
      
      return {
        success: true,
        message: 'Test alert sent successfully'
      };
      
    } catch (error) {
      centralizedLogging.logError('Alert test failed', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Create singleton instance
const alertingService = new AlertingService();

module.exports = alertingService;