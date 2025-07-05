/**
 * Centralized Logging System
 * Lion Football Academy - Advanced Log Management and Analysis
 */

const fs = require('fs');
const path = require('path');
const { createWriteStream } = require('fs');
const { promisify } = require('util');
const zlib = require('zlib');

class CentralizedLoggingService {
  constructor() {
    this.logDirectory = path.join(__dirname, '../../logs');
    this.config = {
      maxFileSize: parseInt(process.env.LOG_MAX_FILE_SIZE) || 50 * 1024 * 1024, // 50MB
      maxFiles: parseInt(process.env.LOG_MAX_FILES) || 10,
      compressionLevel: parseInt(process.env.LOG_COMPRESSION_LEVEL) || 6,
      rotationInterval: parseInt(process.env.LOG_ROTATION_INTERVAL) || 24 * 60 * 60 * 1000, // 24 hours
      bufferSize: parseInt(process.env.LOG_BUFFER_SIZE) || 1000,
      flushInterval: parseInt(process.env.LOG_FLUSH_INTERVAL) || 5000, // 5 seconds
      enableCompression: process.env.LOG_ENABLE_COMPRESSION !== 'false',
      enableRemoteShipping: process.env.LOG_ENABLE_REMOTE_SHIPPING === 'true'
    };

    this.logStreams = new Map();
    this.logBuffers = new Map();
    this.logTypes = {
      APPLICATION: 'application',
      ERROR: 'error',
      ACCESS: 'access',
      SECURITY: 'security',
      PERFORMANCE: 'performance',
      AUDIT: 'audit',
      DEBUG: 'debug'
    };

    this.logLevels = {
      ERROR: 0,
      WARN: 1,
      INFO: 2,
      DEBUG: 3
    };

    this.currentLogLevel = this.logLevels[process.env.LOG_LEVEL?.toUpperCase()] || this.logLevels.INFO;
    this.isInitialized = false;

    this.initializeLogging();
  }

  // Initialize logging system
  async initializeLogging() {
    try {
      // Create logs directory
      await this.ensureLogDirectory();
      
      // Initialize log streams for each type
      for (const logType of Object.values(this.logTypes)) {
        await this.initializeLogStream(logType);
      }

      // Set up periodic log rotation
      this.setupLogRotation();
      
      // Set up periodic buffer flushing
      this.setupBufferFlushing();

      // Set up cleanup of old logs
      this.setupLogCleanup();

      // Set up remote log shipping if enabled
      if (this.config.enableRemoteShipping) {
        this.setupRemoteLogShipping();
      }

      this.isInitialized = true;
      this.log(this.logTypes.APPLICATION, 'INFO', 'Centralized logging system initialized');

    } catch (error) {
      console.error('Failed to initialize centralized logging:', error);
      throw error;
    }
  }

  // Ensure log directory exists
  async ensureLogDirectory() {
    try {
      await fs.promises.access(this.logDirectory);
    } catch (error) {
      await fs.promises.mkdir(this.logDirectory, { recursive: true });
    }
  }

  // Initialize log stream for a specific type
  async initializeLogStream(logType) {
    const logFile = path.join(this.logDirectory, `${logType}.log`);
    
    const stream = createWriteStream(logFile, {
      flags: 'a',
      encoding: 'utf8',
      highWaterMark: 64 * 1024 // 64KB buffer
    });

    stream.on('error', (error) => {
      console.error(`Log stream error for ${logType}:`, error);
    });

    this.logStreams.set(logType, stream);
    this.logBuffers.set(logType, []);
  }

  // Main logging method
  log(type, level, message, metadata = {}) {
    if (!this.isInitialized) {
      console.log(`[${level}] ${message}`, metadata);
      return;
    }

    if (this.logLevels[level] > this.currentLogLevel) {
      return; // Skip if log level is too verbose
    }

    const logEntry = this.createLogEntry(type, level, message, metadata);
    this.writeToBuffer(type, logEntry);

    // Also write to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(logEntry.formatted);
    }
  }

  // Create structured log entry
  createLogEntry(type, level, message, metadata = {}) {
    const timestamp = new Date().toISOString();
    const processInfo = {
      pid: process.pid,
      hostname: require('os').hostname(),
      nodeVersion: process.version,
      uptime: process.uptime()
    };

    const logEntry = {
      timestamp,
      level,
      type,
      message,
      metadata: {
        ...metadata,
        process: processInfo,
        memory: process.memoryUsage(),
        environment: process.env.NODE_ENV || 'development'
      },
      correlationId: metadata.correlationId || this.generateCorrelationId(),
      userId: metadata.userId || null,
      sessionId: metadata.sessionId || null,
      requestId: metadata.requestId || null
    };

    // Add formatted version for console output
    logEntry.formatted = this.formatLogEntry(logEntry);

    return logEntry;
  }

  // Format log entry for readable output
  formatLogEntry(entry) {
    const timestamp = entry.timestamp;
    const level = entry.level.padEnd(5);
    const type = entry.type.toUpperCase().padEnd(12);
    const message = entry.message;
    const correlationId = entry.correlationId.substring(0, 8);

    let formatted = `[${timestamp}] [${level}] [${type}] [${correlationId}] ${message}`;

    // Add metadata if present
    if (Object.keys(entry.metadata).length > 0) {
      const metadataStr = JSON.stringify(entry.metadata, null, 0);
      formatted += ` | ${metadataStr}`;
    }

    return formatted;
  }

  // Write log entry to buffer
  writeToBuffer(type, logEntry) {
    const buffer = this.logBuffers.get(type);
    if (buffer) {
      buffer.push(logEntry);
      
      // Flush if buffer is full
      if (buffer.length >= this.config.bufferSize) {
        this.flushBuffer(type);
      }
    }
  }

  // Flush buffer to disk
  async flushBuffer(type) {
    const buffer = this.logBuffers.get(type);
    const stream = this.logStreams.get(type);

    if (!buffer || !stream || buffer.length === 0) {
      return;
    }

    try {
      const logData = buffer.map(entry => entry.formatted).join('\n') + '\n';
      
      stream.write(logData, 'utf8', (error) => {
        if (error) {
          console.error(`Error writing to log stream ${type}:`, error);
        }
      });

      // Clear buffer
      buffer.length = 0;

      // Check if log rotation is needed
      await this.checkLogRotation(type);

    } catch (error) {
      console.error(`Error flushing buffer for ${type}:`, error);
    }
  }

  // Application logging methods
  logApplication(level, message, metadata = {}) {
    this.log(this.logTypes.APPLICATION, level, message, metadata);
  }

  logError(message, error, metadata = {}) {
    const errorMetadata = {
      ...metadata,
      error: {
        name: error?.name,
        message: error?.message,
        stack: error?.stack,
        code: error?.code
      }
    };
    
    this.log(this.logTypes.ERROR, 'ERROR', message, errorMetadata);
  }

  logAccess(request, response, metadata = {}) {
    const accessMetadata = {
      ...metadata,
      http: {
        method: request.method,
        url: request.url,
        statusCode: response.statusCode,
        userAgent: request.get('User-Agent'),
        ip: request.ip,
        contentLength: response.get('Content-Length'),
        responseTime: metadata.responseTime
      }
    };

    this.log(this.logTypes.ACCESS, 'INFO', `${request.method} ${request.url}`, accessMetadata);
  }

  logSecurity(event, severity, metadata = {}) {
    const securityMetadata = {
      ...metadata,
      security: {
        event,
        severity,
        timestamp: new Date().toISOString(),
        source: metadata.source || 'application'
      }
    };

    this.log(this.logTypes.SECURITY, severity, `Security event: ${event}`, securityMetadata);
  }

  logPerformance(metric, value, unit, metadata = {}) {
    const performanceMetadata = {
      ...metadata,
      performance: {
        metric,
        value,
        unit,
        timestamp: new Date().toISOString()
      }
    };

    this.log(this.logTypes.PERFORMANCE, 'INFO', `Performance: ${metric} = ${value}${unit}`, performanceMetadata);
  }

  logAudit(action, actor, target, result, metadata = {}) {
    const auditMetadata = {
      ...metadata,
      audit: {
        action,
        actor,
        target,
        result,
        timestamp: new Date().toISOString()
      }
    };

    this.log(this.logTypes.AUDIT, 'INFO', `Audit: ${actor} ${action} ${target} - ${result}`, auditMetadata);
  }

  logDebug(message, metadata = {}) {
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true') {
      this.log(this.logTypes.DEBUG, 'DEBUG', message, metadata);
    }
  }

  // Business event logging
  logBusinessEvent(event, details = {}) {
    this.logApplication('INFO', `Business event: ${event}`, {
      businessEvent: event,
      details,
      category: 'business'
    });
  }

  // User action logging
  logUserAction(userId, action, details = {}) {
    this.logAudit(action, userId, details.target || 'system', 'success', {
      userAction: action,
      details,
      category: 'user_action'
    });
  }

  // Database operation logging
  logDatabaseOperation(operation, table, duration, metadata = {}) {
    this.logPerformance(`db_${operation}_${table}`, duration, 'ms', {
      database: {
        operation,
        table,
        duration
      },
      ...metadata
    });
  }

  // External API logging
  logExternalAPI(service, endpoint, method, statusCode, duration, metadata = {}) {
    const level = statusCode >= 400 ? 'WARN' : 'INFO';
    
    this.log(this.logTypes.APPLICATION, level, `External API: ${method} ${service}${endpoint}`, {
      externalAPI: {
        service,
        endpoint,
        method,
        statusCode,
        duration
      },
      ...metadata
    });
  }

  // Check if log rotation is needed
  async checkLogRotation(type) {
    try {
      const logFile = path.join(this.logDirectory, `${type}.log`);
      const stats = await fs.promises.stat(logFile);
      
      if (stats.size >= this.config.maxFileSize) {
        await this.rotateLog(type);
      }
    } catch (error) {
      console.error(`Error checking log rotation for ${type}:`, error);
    }
  }

  // Rotate log file
  async rotateLog(type) {
    try {
      const currentLogFile = path.join(this.logDirectory, `${type}.log`);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const rotatedLogFile = path.join(this.logDirectory, `${type}-${timestamp}.log`);
      
      // Close current stream
      const stream = this.logStreams.get(type);
      if (stream) {
        stream.end();
      }

      // Rename current log file
      await fs.promises.rename(currentLogFile, rotatedLogFile);

      // Compress rotated log if enabled
      if (this.config.enableCompression) {
        await this.compressLogFile(rotatedLogFile);
      }

      // Create new stream
      await this.initializeLogStream(type);

      this.log(this.logTypes.APPLICATION, 'INFO', `Log rotated for type: ${type}`);

      // Clean old log files
      await this.cleanOldLogFiles(type);

    } catch (error) {
      console.error(`Error rotating log for ${type}:`, error);
    }
  }

  // Compress log file
  async compressLogFile(logFile) {
    try {
      const compressedFile = `${logFile}.gz`;
      const readStream = fs.createReadStream(logFile);
      const writeStream = fs.createWriteStream(compressedFile);
      const gzip = zlib.createGzip({ level: this.config.compressionLevel });

      await new Promise((resolve, reject) => {
        readStream
          .pipe(gzip)
          .pipe(writeStream)
          .on('finish', resolve)
          .on('error', reject);
      });

      // Remove original file after compression
      await fs.promises.unlink(logFile);

    } catch (error) {
      console.error(`Error compressing log file ${logFile}:`, error);
    }
  }

  // Clean old log files
  async cleanOldLogFiles(type) {
    try {
      const files = await fs.promises.readdir(this.logDirectory);
      const typeFiles = files
        .filter(file => file.startsWith(`${type}-`) && (file.endsWith('.log') || file.endsWith('.log.gz')))
        .map(file => ({
          name: file,
          path: path.join(this.logDirectory, file),
          stats: fs.statSync(path.join(this.logDirectory, file))
        }))
        .sort((a, b) => b.stats.mtime - a.stats.mtime);

      // Remove files beyond the maximum count
      if (typeFiles.length > this.config.maxFiles) {
        const filesToDelete = typeFiles.slice(this.config.maxFiles);
        
        for (const file of filesToDelete) {
          await fs.promises.unlink(file.path);
          this.log(this.logTypes.APPLICATION, 'INFO', `Deleted old log file: ${file.name}`);
        }
      }

    } catch (error) {
      console.error(`Error cleaning old log files for ${type}:`, error);
    }
  }

  // Setup periodic buffer flushing
  setupBufferFlushing() {
    setInterval(() => {
      for (const type of Object.values(this.logTypes)) {
        this.flushBuffer(type);
      }
    }, this.config.flushInterval);
  }

  // Setup periodic log rotation
  setupLogRotation() {
    setInterval(() => {
      for (const type of Object.values(this.logTypes)) {
        this.checkLogRotation(type);
      }
    }, this.config.rotationInterval);
  }

  // Setup periodic log cleanup
  setupLogCleanup() {
    // Run cleanup daily
    setInterval(() => {
      for (const type of Object.values(this.logTypes)) {
        this.cleanOldLogFiles(type);
      }
    }, 24 * 60 * 60 * 1000);
  }

  // Setup remote log shipping
  setupRemoteLogShipping() {
    if (process.env.LOG_REMOTE_ENDPOINT) {
      // Ship logs to external service every minute
      setInterval(() => {
        this.shipLogsToRemote();
      }, 60000);
    }
  }

  // Ship logs to remote logging service
  async shipLogsToRemote() {
    try {
      const logs = await this.getRecentLogs(100); // Get last 100 log entries
      
      if (logs.length === 0) return;

      const payload = {
        service: 'lion-football-academy',
        environment: process.env.NODE_ENV,
        hostname: require('os').hostname(),
        timestamp: new Date().toISOString(),
        logs: logs
      };

      // Ship to external logging service (e.g., ELK Stack, Splunk, DataDog)
      await this.sendToRemoteLoggingService(payload);

    } catch (error) {
      console.error('Error shipping logs to remote service:', error);
    }
  }

  // Send logs to remote logging service
  async sendToRemoteLoggingService(payload) {
    const axios = require('axios');
    
    try {
      await axios.post(process.env.LOG_REMOTE_ENDPOINT, payload, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.LOG_REMOTE_TOKEN}`
        },
        timeout: 10000
      });

    } catch (error) {
      console.error('Failed to send logs to remote service:', error);
    }
  }

  // Get recent log entries
  async getRecentLogs(count = 100) {
    const logs = [];
    
    for (const type of Object.values(this.logTypes)) {
      const buffer = this.logBuffers.get(type) || [];
      logs.push(...buffer.slice(-count));
    }

    return logs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)).slice(-count);
  }

  // Search logs
  async searchLogs(query, options = {}) {
    const {
      type = null,
      level = null,
      startDate = null,
      endDate = null,
      limit = 1000
    } = options;

    try {
      const searchResults = [];
      const typesToSearch = type ? [type] : Object.values(this.logTypes);

      for (const logType of typesToSearch) {
        const logFile = path.join(this.logDirectory, `${logType}.log`);
        
        try {
          const content = await fs.promises.readFile(logFile, 'utf8');
          const lines = content.split('\n').filter(line => line.trim());
          
          for (const line of lines) {
            if (this.matchesLogQuery(line, query, level, startDate, endDate)) {
              searchResults.push({
                type: logType,
                content: line
              });
              
              if (searchResults.length >= limit) break;
            }
          }
        } catch (error) {
          // Log file might not exist, continue
        }
      }

      return searchResults;

    } catch (error) {
      console.error('Error searching logs:', error);
      return [];
    }
  }

  // Check if log line matches query
  matchesLogQuery(line, query, level, startDate, endDate) {
    // Text search
    if (query && !line.toLowerCase().includes(query.toLowerCase())) {
      return false;
    }

    // Level filter
    if (level && !line.includes(`[${level}]`)) {
      return false;
    }

    // Date range filter
    if (startDate || endDate) {
      const timestampMatch = line.match(/\[(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)\]/);
      if (timestampMatch) {
        const logDate = new Date(timestampMatch[1]);
        
        if (startDate && logDate < new Date(startDate)) return false;
        if (endDate && logDate > new Date(endDate)) return false;
      }
    }

    return true;
  }

  // Generate correlation ID for tracking requests
  generateCorrelationId() {
    return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get logging statistics
  getLoggingStats() {
    const stats = {
      initialized: this.isInitialized,
      types: {},
      config: this.config,
      bufferSizes: {}
    };

    for (const type of Object.values(this.logTypes)) {
      const buffer = this.logBuffers.get(type) || [];
      stats.bufferSizes[type] = buffer.length;
      
      try {
        const logFile = path.join(this.logDirectory, `${type}.log`);
        const stat = fs.statSync(logFile);
        stats.types[type] = {
          size: stat.size,
          created: stat.birthtime,
          modified: stat.mtime
        };
      } catch (error) {
        stats.types[type] = { size: 0, created: null, modified: null };
      }
    }

    return stats;
  }

  // Graceful shutdown
  async shutdown() {
    try {
      // Flush all buffers
      for (const type of Object.values(this.logTypes)) {
        await this.flushBuffer(type);
      }

      // Close all streams
      for (const stream of this.logStreams.values()) {
        stream.end();
      }

      this.log(this.logTypes.APPLICATION, 'INFO', 'Centralized logging system shutdown');

    } catch (error) {
      console.error('Error during logging system shutdown:', error);
    }
  }
}

// Create singleton instance
const centralizedLogging = new CentralizedLoggingService();

module.exports = centralizedLogging;