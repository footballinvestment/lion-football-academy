/**
 * Error Tracking Service - Sentry Integration
 * Lion Football Academy - Production Error Monitoring
 */

const Sentry = require('@sentry/node');
const logger = require('../utils/logger');

class ErrorTrackingService {
  constructor() {
    this.isInitialized = false;
    this.dsn = process.env.SENTRY_DSN;
    this.environment = process.env.NODE_ENV || 'development';
    this.release = process.env.npm_package_version || '1.0.0';
    
    if (this.dsn) {
      this.initializeSentry();
    } else {
      logger.warn('Sentry DSN not configured, error tracking disabled');
    }
  }

  initializeSentry() {
    try {
      Sentry.init({
        dsn: this.dsn,
        environment: this.environment,
        release: `lion-football-academy@${this.release}`,
        
        // Performance monitoring
        tracesSampleRate: this.environment === 'production' ? 0.1 : 1.0,
        
        // Error sampling
        sampleRate: 1.0,
        
        // Attach stack traces to captured messages
        attachStacktrace: true,
        
        // Capture unhandled promise rejections
        captureUnhandledRejections: true,
        
        // Integration configuration
        integrations: [
          new Sentry.Integrations.Http({ tracing: true }),
          new Sentry.Integrations.Express({ app: undefined }),
          new Sentry.Integrations.OnUnhandledRejection({ mode: 'strict' }),
          new Sentry.Integrations.OnUncaughtException({
            exitExit: false,
            onFatalError: (err) => {
              logger.error('Fatal error occurred', { error: err.message, stack: err.stack });
            }
          })
        ],
        
        // Before send hook for filtering
        beforeSend: (event, hint) => {
          return this.filterEvent(event, hint);
        },
        
        // Before breadcrumb hook
        beforeBreadcrumb: (breadcrumb, hint) => {
          return this.filterBreadcrumb(breadcrumb, hint);
        }
      });

      this.isInitialized = true;
      logger.info('Sentry error tracking initialized', {
        environment: this.environment,
        release: this.release
      });
      
    } catch (error) {
      logger.error('Failed to initialize Sentry', { error: error.message });
    }
  }

  // Express middleware for request context
  requestHandler() {
    if (!this.isInitialized) {
      return (req, res, next) => next();
    }
    return Sentry.Handlers.requestHandler({
      user: ['id', 'username', 'email'],
      request: ['method', 'url', 'headers'],
      transaction: 'methodPath'
    });
  }

  // Express error handler middleware
  errorHandler() {
    if (!this.isInitialized) {
      return (error, req, res, next) => {
        logger.error('Application error', {
          error: error.message,
          stack: error.stack,
          method: req.method,
          url: req.url,
          userId: req.user?.id
        });
        next(error);
      };
    }
    
    return Sentry.Handlers.errorHandler({
      shouldHandleError: (error) => {
        // Only send errors to Sentry, not client errors (4xx)
        return !error.status || error.status >= 500;
      }
    });
  }

  // Manual error capture
  captureError(error, context = {}) {
    if (!this.isInitialized) {
      logger.error('Error captured (Sentry disabled)', {
        error: error.message,
        stack: error.stack,
        ...context
      });
      return null;
    }

    const eventId = Sentry.captureException(error, {
      user: context.user,
      tags: context.tags,
      extra: context.extra,
      level: context.level || 'error',
      fingerprint: context.fingerprint
    });

    logger.error('Error captured and sent to Sentry', {
      eventId,
      error: error.message,
      ...context
    });

    return eventId;
  }

  // Capture message
  captureMessage(message, level = 'info', context = {}) {
    if (!this.isInitialized) {
      logger[level](`Message captured (Sentry disabled): ${message}`, context);
      return null;
    }

    const eventId = Sentry.captureMessage(message, level, {
      user: context.user,
      tags: context.tags,
      extra: context.extra,
      fingerprint: context.fingerprint
    });

    logger[level]('Message captured and sent to Sentry', {
      eventId,
      message,
      ...context
    });

    return eventId;
  }

  // Add breadcrumb for debugging context
  addBreadcrumb(category, message, data = {}, level = 'info') {
    if (!this.isInitialized) return;

    Sentry.addBreadcrumb({
      message,
      category,
      data,
      level,
      timestamp: Date.now() / 1000
    });
  }

  // Set user context
  setUser(user) {
    if (!this.isInitialized) return;

    Sentry.setUser({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.user_type
    });
  }

  // Set tags for filtering
  setTag(key, value) {
    if (!this.isInitialized) return;
    Sentry.setTag(key, value);
  }

  // Set extra context
  setExtra(key, value) {
    if (!this.isInitialized) return;
    Sentry.setExtra(key, value);
  }

  // Clear context
  clearScope() {
    if (!this.isInitialized) return;
    Sentry.getCurrentHub().getScope().clear();
  }

  // Performance monitoring - start transaction
  startTransaction(name, operation = 'http') {
    if (!this.isInitialized) {
      return {
        setTag: () => {},
        setData: () => {},
        finish: () => {},
        startChild: () => ({ finish: () => {} })
      };
    }

    return Sentry.startTransaction({ name, op: operation });
  }

  // Database query monitoring
  monitorDatabaseQuery(query, params = []) {
    if (!this.isInitialized) return () => {};

    const transaction = Sentry.getCurrentHub().getScope().getTransaction();
    if (!transaction) return () => {};

    const span = transaction.startChild({
      op: 'db.query',
      description: query.substring(0, 100) + (query.length > 100 ? '...' : '')
    });

    span.setData('db.statement', query);
    span.setData('db.params.count', params.length);

    return () => span.finish();
  }

  // External API monitoring
  monitorExternalAPI(url, method = 'GET') {
    if (!this.isInitialized) return () => {};

    const transaction = Sentry.getCurrentHub().getScope().getTransaction();
    if (!transaction) return () => {};

    const span = transaction.startChild({
      op: 'http.client',
      description: `${method} ${url}`
    });

    span.setData('http.method', method);
    span.setData('http.url', url);

    return (statusCode, error) => {
      if (statusCode) span.setData('http.status_code', statusCode);
      if (error) span.setStatus('internal_error');
      span.finish();
    };
  }

  // Filter events before sending
  filterEvent(event, hint) {
    // Don't send test errors
    if (this.environment === 'test') return null;

    // Filter out noise
    const error = hint.originalException || hint.syntheticException;
    if (error && error.message) {
      // Filter out known issues that aren't actionable
      const filteredMessages = [
        'ECONNRESET',
        'ENOTFOUND',
        'Request timeout',
        'Connection timeout'
      ];

      if (filteredMessages.some(msg => error.message.includes(msg))) {
        return null;
      }
    }

    // Add custom context
    event.tags = {
      ...event.tags,
      component: 'backend',
      service: 'lion-football-academy'
    };

    return event;
  }

  // Filter breadcrumbs
  filterBreadcrumb(breadcrumb, hint) {
    // Don't log sensitive data in breadcrumbs
    if (breadcrumb.category === 'http' && breadcrumb.data) {
      // Remove sensitive headers
      if (breadcrumb.data.headers) {
        delete breadcrumb.data.headers.authorization;
        delete breadcrumb.data.headers.cookie;
      }
      
      // Remove sensitive query parameters
      if (breadcrumb.data.query) {
        delete breadcrumb.data.query.password;
        delete breadcrumb.data.query.token;
      }
    }

    return breadcrumb;
  }

  // Health check for Sentry
  getStatus() {
    return {
      initialized: this.isInitialized,
      environment: this.environment,
      release: this.release,
      dsnConfigured: !!this.dsn
    };
  }

  // Performance monitoring wrapper
  withPerformanceMonitoring(name, operation) {
    return async (fn) => {
      const transaction = this.startTransaction(name, operation);
      
      try {
        const result = await fn();
        transaction.setStatus('ok');
        return result;
      } catch (error) {
        transaction.setStatus('internal_error');
        this.captureError(error, {
          tags: { transaction: name }
        });
        throw error;
      } finally {
        transaction.finish();
      }
    };
  }

  // Flush events (useful for testing or shutdown)
  async flush(timeout = 2000) {
    if (!this.isInitialized) return true;
    
    try {
      return await Sentry.flush(timeout);
    } catch (error) {
      logger.error('Failed to flush Sentry events', { error: error.message });
      return false;
    }
  }

  // Close Sentry client
  async close(timeout = 2000) {
    if (!this.isInitialized) return true;
    
    try {
      return await Sentry.close(timeout);
    } catch (error) {
      logger.error('Failed to close Sentry client', { error: error.message });
      return false;
    }
  }
}

// Create singleton instance
const errorTracking = new ErrorTrackingService();

module.exports = errorTracking;