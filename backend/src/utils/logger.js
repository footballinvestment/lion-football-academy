/**
 * Production Logging Service
 * Lion Football Academy - Centralized Logging System
 */

const fs = require('fs');
const path = require('path');

class Logger {
  constructor() {
    this.logLevel = process.env.LOG_LEVEL || 'info';
    this.enableFileLogging = process.env.NODE_ENV === 'production';
    this.logDir = path.join(__dirname, '../../logs');
    this.logFile = path.join(this.logDir, 'app.log');
    this.errorFile = path.join(this.logDir, 'error.log');
    this.accessFile = path.join(this.logDir, 'access.log');
    
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    };
    
    this.init();
  }

  init() {
    // Create logs directory if it doesn't exist
    if (this.enableFileLogging && !fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...meta,
      pid: process.pid,
      hostname: require('os').hostname(),
      service: 'lion-football-academy-backend'
    };

    return JSON.stringify(logEntry);
  }

  shouldLog(level) {
    return this.levels[level] <= this.levels[this.logLevel];
  }

  writeToFile(filename, content) {
    if (this.enableFileLogging) {
      fs.appendFileSync(filename, content + '\n');
    }
  }

  log(level, message, meta = {}) {
    if (!this.shouldLog(level)) return;

    const formattedMessage = this.formatMessage(level, message, meta);
    
    // Console output
    console.log(formattedMessage);
    
    // File output
    this.writeToFile(this.logFile, formattedMessage);
    
    // Error-specific file
    if (level === 'error') {
      this.writeToFile(this.errorFile, formattedMessage);
    }
  }

  error(message, meta = {}) {
    this.log('error', message, meta);
  }

  warn(message, meta = {}) {
    this.log('warn', message, meta);
  }

  info(message, meta = {}) {
    this.log('info', message, meta);
  }

  debug(message, meta = {}) {
    this.log('debug', message, meta);
  }

  // Request logging middleware
  requestLogger() {
    return (req, res, next) => {
      const start = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - start;
        const logData = {
          method: req.method,
          url: req.originalUrl,
          status: res.statusCode,
          duration: `${duration}ms`,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          userId: req.user?.id,
          timestamp: new Date().toISOString()
        };

        // Log to access log file
        if (this.enableFileLogging) {
          this.writeToFile(this.accessFile, JSON.stringify(logData));
        }

        // Log errors and warnings to main log
        if (res.statusCode >= 400) {
          this.warn('HTTP Error Response', logData);
        } else if (duration > 5000) {
          this.warn('Slow Request', logData);
        } else {
          this.debug('HTTP Request', logData);
        }
      });

      next();
    };
  }

  // Database query logging
  logDatabaseQuery(query, params = [], duration = 0) {
    this.debug('Database Query', {
      query: query.substring(0, 500), // Truncate long queries
      params: params.length,
      duration: `${duration}ms`,
      type: 'database'
    });

    if (duration > 1000) {
      this.warn('Slow Database Query', {
        query: query.substring(0, 500),
        duration: `${duration}ms`,
        type: 'database_slow'
      });
    }
  }

  // Authentication logging
  logAuth(event, userId, details = {}) {
    this.info('Authentication Event', {
      event,
      userId,
      ...details,
      type: 'authentication'
    });
  }

  // Security event logging
  logSecurity(event, details = {}) {
    this.warn('Security Event', {
      event,
      ...details,
      type: 'security'
    });
  }

  // Business event logging
  logBusiness(event, details = {}) {
    this.info('Business Event', {
      event,
      ...details,
      type: 'business'
    });
  }

  // Performance monitoring
  logPerformance(metric, value, unit = 'ms') {
    this.info('Performance Metric', {
      metric,
      value,
      unit,
      type: 'performance'
    });
  }

  // Error handling with stack traces
  logError(error, context = {}) {
    this.error(error.message, {
      stack: error.stack,
      name: error.name,
      ...context,
      type: 'error'
    });
  }

  // Health check logging
  logHealthCheck(status, checks = {}) {
    this.info('Health Check', {
      status,
      checks,
      type: 'health'
    });
  }
}

// Create singleton instance
const logger = new Logger();

module.exports = logger;