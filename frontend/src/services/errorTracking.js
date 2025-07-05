/**
 * Frontend Error Tracking Service - Sentry Integration
 * Lion Football Academy - Client-side Error Monitoring
 */

import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

class FrontendErrorTracking {
  constructor() {
    this.isInitialized = false;
    this.dsn = process.env.REACT_APP_SENTRY_DSN;
    this.environment = process.env.REACT_APP_ENV || 'development';
    this.release = process.env.REACT_APP_VERSION || '1.0.0';
    
    if (this.dsn && this.environment === 'production') {
      this.initializeSentry();
    }
  }

  initializeSentry() {
    try {
      Sentry.init({
        dsn: this.dsn,
        environment: this.environment,
        release: `lion-football-academy-frontend@${this.release}`,
        
        // Performance monitoring
        tracesSampleRate: 0.1,
        
        // Integrations
        integrations: [
          new BrowserTracing({
            // Capture interactions
            routingInstrumentation: Sentry.reactRouterV6Instrumentation(
              window.history
            ),
            
            // Capture clicks, form submissions, navigation
            tracingOrigins: [
              'localhost',
              'lionfootballacademy.com',
              'api.lionfootballacademy.com',
              /^\//
            ]
          })
        ],
        
        // Session replay sampling
        replaysSessionSampleRate: this.environment === 'production' ? 0.01 : 0.1,
        replaysOnErrorSampleRate: 1.0,
        
        // Before send hook
        beforeSend: (event, hint) => {
          return this.filterEvent(event, hint);
        },
        
        // Before breadcrumb hook
        beforeBreadcrumb: (breadcrumb, hint) => {
          return this.filterBreadcrumb(breadcrumb, hint);
        }
      });

      this.isInitialized = true;
      console.log('Frontend error tracking initialized');
      
    } catch (error) {
      console.error('Failed to initialize Sentry:', error);
    }
  }

  // Capture error manually
  captureError(error, context = {}) {
    if (!this.isInitialized) {
      console.error('Error captured (Sentry disabled):', error, context);
      return null;
    }

    return Sentry.captureException(error, {
      user: context.user,
      tags: {
        component: 'frontend',
        ...context.tags
      },
      extra: context.extra,
      level: context.level || 'error',
      fingerprint: context.fingerprint
    });
  }

  // Capture message
  captureMessage(message, level = 'info', context = {}) {
    if (!this.isInitialized) {
      console[level](`Message captured (Sentry disabled): ${message}`, context);
      return null;
    }

    return Sentry.captureMessage(message, level, {
      user: context.user,
      tags: {
        component: 'frontend',
        ...context.tags
      },
      extra: context.extra
    });
  }

  // Add breadcrumb
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

  // Set tags
  setTag(key, value) {
    if (!this.isInitialized) return;
    Sentry.setTag(key, value);
  }

  // Set extra context
  setExtra(key, value) {
    if (!this.isInitialized) return;
    Sentry.setExtra(key, value);
  }

  // Performance monitoring
  startTransaction(name, operation = 'navigation') {
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

  // Monitor API calls
  monitorAPICall(url, method = 'GET') {
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

  // Monitor component render performance
  monitorComponentRender(componentName) {
    if (!this.isInitialized) return () => {};

    const transaction = Sentry.getCurrentHub().getScope().getTransaction();
    if (!transaction) return () => {};

    const span = transaction.startChild({
      op: 'react.render',
      description: `<${componentName}>`
    });

    return () => span.finish();
  }

  // React Error Boundary integration
  createErrorBoundary() {
    if (!this.isInitialized) {
      // Return a basic error boundary if Sentry is not initialized
      return class extends React.Component {
        constructor(props) {
          super(props);
          this.state = { hasError: false };
        }

        static getDerivedStateFromError(error) {
          return { hasError: true };
        }

        componentDidCatch(error, errorInfo) {
          console.error('Error boundary caught error:', error, errorInfo);
        }

        render() {
          if (this.state.hasError) {
            return this.props.fallback || <div>Something went wrong.</div>;
          }
          return this.props.children;
        }
      };
    }

    return Sentry.withErrorBoundary;
  }

  // Higher-order component for error tracking
  withErrorTracking(WrappedComponent, componentName) {
    if (!this.isInitialized) return WrappedComponent;

    return Sentry.withSentryRouting(WrappedComponent);
  }

  // Filter events before sending
  filterEvent(event, hint) {
    // Don't send test errors
    if (this.environment === 'test' || this.environment === 'development') {
      return null;
    }

    // Filter out known browser errors that aren't actionable
    const error = hint.originalException || hint.syntheticException;
    if (error && error.message) {
      const filteredMessages = [
        'ResizeObserver loop limit exceeded',
        'Script error',
        'Non-Error promise rejection captured',
        'ChunkLoadError'
      ];

      if (filteredMessages.some(msg => error.message.includes(msg))) {
        return null;
      }
    }

    // Add custom context
    event.tags = {
      ...event.tags,
      component: 'frontend',
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // Add performance context
    if (window.performance && window.performance.memory) {
      event.extra = {
        ...event.extra,
        memoryUsage: {
          usedJSHeapSize: window.performance.memory.usedJSHeapSize,
          totalJSHeapSize: window.performance.memory.totalJSHeapSize,
          jsHeapSizeLimit: window.performance.memory.jsHeapSizeLimit
        }
      };
    }

    return event;
  }

  // Filter breadcrumbs
  filterBreadcrumb(breadcrumb, hint) {
    // Don't log console messages in production
    if (breadcrumb.category === 'console' && this.environment === 'production') {
      return null;
    }

    // Filter out noisy UI events
    if (breadcrumb.category === 'ui.click') {
      const message = breadcrumb.message || '';
      if (message.includes('body') || message.includes('html')) {
        return null;
      }
    }

    // Remove sensitive data from form inputs
    if (breadcrumb.category === 'ui.input' && breadcrumb.data) {
      delete breadcrumb.data.value;
    }

    return breadcrumb;
  }

  // Business logic error tracking
  trackBusinessError(errorType, details = {}) {
    this.captureMessage(`Business Error: ${errorType}`, 'warning', {
      tags: {
        errorType: 'business',
        businessErrorType: errorType
      },
      extra: details
    });
  }

  // User action tracking
  trackUserAction(action, details = {}) {
    this.addBreadcrumb('user.action', action, details, 'info');
  }

  // API error tracking
  trackAPIError(url, method, statusCode, error) {
    this.captureError(error, {
      tags: {
        errorType: 'api',
        httpMethod: method,
        httpStatus: statusCode
      },
      extra: {
        url,
        method,
        statusCode
      }
    });
  }

  // Authentication error tracking
  trackAuthError(errorType, details = {}) {
    this.captureMessage(`Authentication Error: ${errorType}`, 'error', {
      tags: {
        errorType: 'authentication',
        authErrorType: errorType
      },
      extra: details
    });
  }

  // Performance issue tracking
  trackPerformanceIssue(issueType, metrics = {}) {
    this.captureMessage(`Performance Issue: ${issueType}`, 'warning', {
      tags: {
        errorType: 'performance',
        performanceIssue: issueType
      },
      extra: metrics
    });
  }

  // Get status
  getStatus() {
    return {
      initialized: this.isInitialized,
      environment: this.environment,
      release: this.release,
      dsnConfigured: !!this.dsn
    };
  }
}

// Create singleton instance
const frontendErrorTracking = new FrontendErrorTracking();

export default frontendErrorTracking;