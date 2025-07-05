# Lion Football Academy - Monitoring Guide

## Table of Contents
1. [Monitoring Overview](#monitoring-overview)
2. [System Monitoring](#system-monitoring)
3. [Application Monitoring](#application-monitoring)
4. [Database Monitoring](#database-monitoring)
5. [Performance Monitoring](#performance-monitoring)
6. [Security Monitoring](#security-monitoring)
7. [Business Metrics Monitoring](#business-metrics-monitoring)
8. [Alerting and Notifications](#alerting-and-notifications)
9. [Dashboard Configuration](#dashboard-configuration)
10. [Monitoring Maintenance](#monitoring-maintenance)

## Monitoring Overview

The Lion Football Academy monitoring system provides comprehensive visibility into system health, performance, security, and business metrics. This guide covers the complete monitoring stack implementation and operational procedures.

### Monitoring Architecture
- **Metrics Collection**: Prometheus + Node Exporter + Custom Exporters
- **Time Series Database**: Prometheus with long-term storage
- **Visualization**: Grafana dashboards and custom web interfaces
- **Alerting**: Alertmanager with multi-channel notifications
- **Log Management**: ELK Stack (Elasticsearch, Logstash, Kibana)
- **APM**: Application Performance Monitoring with custom instrumentation

### Key Monitoring Objectives
- **System Availability**: 99.9% uptime target
- **Performance**: Sub-2-second response times
- **Security**: Real-time threat detection and incident response
- **Business Metrics**: User engagement, revenue, and growth tracking
- **Compliance**: GDPR and audit trail monitoring

### Monitoring Levels
- **Infrastructure**: Servers, network, storage, and cloud resources
- **Platform**: Operating system, databases, and middleware
- **Application**: Custom application metrics and user experience
- **Business**: KPIs, user behavior, and revenue metrics

## System Monitoring

### Infrastructure Monitoring Setup

#### Prometheus Configuration
```yaml
# /etc/prometheus/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    cluster: 'lfa-production'
    region: 'us-east-1'

rule_files:
  - "rules/*.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'node-exporter'
    static_configs:
      - targets: 
        - 'app-server-1:9100'
        - 'app-server-2:9100'
        - 'db-server:9100'

  - job_name: 'lfa-app'
    static_configs:
      - targets: ['app-server-1:3000', 'app-server-2:3000']
    metrics_path: '/metrics'
    scrape_interval: 10s

  - job_name: 'postgres-exporter'
    static_configs:
      - targets: ['db-server:9187']

  - job_name: 'redis-exporter'
    static_configs:
      - targets: ['cache-server:9121']

  - job_name: 'nginx-exporter'
    static_configs:
      - targets: ['lb-server:9113']
```

#### Node Exporter Installation
```bash
#!/bin/bash
# Install and configure Node Exporter

# Download and install
wget https://github.com/prometheus/node_exporter/releases/download/v1.6.1/node_exporter-1.6.1.linux-amd64.tar.gz
tar xvfz node_exporter-1.6.1.linux-amd64.tar.gz
sudo mv node_exporter-1.6.1.linux-amd64/node_exporter /usr/local/bin/

# Create service user
sudo useradd --no-create-home --shell /bin/false node_exporter

# Create systemd service
cat <<EOF | sudo tee /etc/systemd/system/node_exporter.service
[Unit]
Description=Node Exporter
After=network.target

[Service]
User=node_exporter
Group=node_exporter
Type=simple
ExecStart=/usr/local/bin/node_exporter \
  --collector.systemd \
  --collector.processes \
  --collector.interrupts \
  --web.listen-address=:9100

[Install]
WantedBy=multi-user.target
EOF

# Start and enable service
sudo systemctl daemon-reload
sudo systemctl enable node_exporter
sudo systemctl start node_exporter
```

### Server Monitoring Metrics

#### System Resource Monitoring
```bash
#!/bin/bash
# Custom system metrics collector
# /opt/lfa/scripts/collect_system_metrics.sh

METRICS_FILE="/var/lib/node_exporter/textfile_collector/lfa_system.prom"

# CPU temperature (if available)
if [ -f /sys/class/thermal/thermal_zone0/temp ]; then
  TEMP=$(cat /sys/class/thermal/thermal_zone0/temp)
  echo "lfa_cpu_temperature_celsius $((TEMP/1000))" > $METRICS_FILE
fi

# Disk usage by mount point
df -P | awk 'NR>1 {
  gsub(/%/, "", $5)
  print "lfa_disk_usage_percent{device=\"" $1 "\",mountpoint=\"" $6 "\"} " $5
}' >> $METRICS_FILE

# Load average
LOAD_1=$(uptime | awk -F'load average:' '{print $2}' | awk -F',' '{print $1}' | xargs)
LOAD_5=$(uptime | awk -F'load average:' '{print $2}' | awk -F',' '{print $2}' | xargs)
LOAD_15=$(uptime | awk -F'load average:' '{print $2}' | awk -F',' '{print $3}' | xargs)

echo "lfa_load_average_1m $LOAD_1" >> $METRICS_FILE
echo "lfa_load_average_5m $LOAD_5" >> $METRICS_FILE
echo "lfa_load_average_15m $LOAD_15" >> $METRICS_FILE

# Network connection count
CONNECTIONS=$(netstat -an | grep ESTABLISHED | wc -l)
echo "lfa_network_connections_established $CONNECTIONS" >> $METRICS_FILE

# Process count by service
for service in lfa-app nginx postgres redis; do
  COUNT=$(pgrep -c $service || echo 0)
  echo "lfa_service_processes{service=\"$service\"} $COUNT" >> $METRICS_FILE
done
```

#### Network Monitoring
```bash
#!/bin/bash
# Network monitoring script
# /opt/lfa/scripts/monitor_network.sh

# Check external connectivity
EXTERNAL_HOSTS=("8.8.8.8" "1.1.1.1" "lionfootballacademy.com")
METRICS_FILE="/var/lib/node_exporter/textfile_collector/lfa_network.prom"

for host in "${EXTERNAL_HOSTS[@]}"; do
  if ping -c 1 -W 1 $host >/dev/null 2>&1; then
    echo "lfa_network_connectivity{target=\"$host\"} 1" >> $METRICS_FILE
    
    # Measure latency
    LATENCY=$(ping -c 3 $host | grep 'avg' | awk -F'/' '{print $5}')
    echo "lfa_network_latency_ms{target=\"$host\"} $LATENCY" >> $METRICS_FILE
  else
    echo "lfa_network_connectivity{target=\"$host\"} 0" >> $METRICS_FILE
  fi
done

# Check bandwidth utilization
for interface in $(ip -o link show | awk -F': ' '{print $2}' | grep -E '^(eth|ens)'); do
  RX_BYTES=$(cat /sys/class/net/$interface/statistics/rx_bytes)
  TX_BYTES=$(cat /sys/class/net/$interface/statistics/tx_bytes)
  
  echo "lfa_network_rx_bytes{interface=\"$interface\"} $RX_BYTES" >> $METRICS_FILE
  echo "lfa_network_tx_bytes{interface=\"$interface\"} $TX_BYTES" >> $METRICS_FILE
done
```

## Application Monitoring

### Custom Application Metrics

#### Node.js Application Instrumentation
```javascript
// /opt/lfa/app/backend/middleware/metrics.js
const prometheus = require('prom-client');

// Create a Registry
const register = new prometheus.Registry();

// Add default metrics
prometheus.collectDefaultMetrics({ 
  register,
  prefix: 'lfa_app_'
});

// Custom metrics
const httpRequestDuration = new prometheus.Histogram({
  name: 'lfa_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

const httpRequestCount = new prometheus.Counter({
  name: 'lfa_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const activeUsers = new prometheus.Gauge({
  name: 'lfa_active_users',
  help: 'Number of active users',
  labelNames: ['user_type']
});

const databaseQueries = new prometheus.Histogram({
  name: 'lfa_database_query_duration_seconds',
  help: 'Database query execution time',
  labelNames: ['query_type', 'table'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5]
});

const businessMetrics = new prometheus.Gauge({
  name: 'lfa_business_metric',
  help: 'Business metrics',
  labelNames: ['metric_type']
});

// Register metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestCount);
register.registerMetric(activeUsers);
register.registerMetric(databaseQueries);
register.registerMetric(businessMetrics);

// Middleware function
function metricsMiddleware(req, res, next) {
  const start = Date.now();
  
  // Track request count
  httpRequestCount.inc({
    method: req.method,
    route: req.route?.path || req.path,
    status_code: res.statusCode
  });
  
  // Track request duration
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestDuration.observe({
      method: req.method,
      route: req.route?.path || req.path,
      status_code: res.statusCode
    }, duration);
  });
  
  next();
}

// Database query instrumentation
function instrumentQuery(queryType, table) {
  const end = databaseQueries.startTimer({ query_type: queryType, table });
  return () => end();
}

// Business metrics updates
function updateBusinessMetrics() {
  // Update active users count
  const userCounts = {
    admin: 5,
    coach: 25,
    parent: 150,
    player: 200
  };
  
  Object.entries(userCounts).forEach(([type, count]) => {
    activeUsers.set({ user_type: type }, count);
  });
  
  // Update business metrics
  businessMetrics.set({ metric_type: 'total_revenue' }, 12500.00);
  businessMetrics.set({ metric_type: 'active_subscriptions' }, 175);
  businessMetrics.set({ metric_type: 'training_sessions_today' }, 8);
}

// Metrics endpoint
function metricsEndpoint(req, res) {
  res.set('Content-Type', register.contentType);
  res.end(register.metrics());
}

module.exports = {
  metricsMiddleware,
  instrumentQuery,
  updateBusinessMetrics,
  metricsEndpoint,
  register
};
```

#### Application Health Checks
```javascript
// /opt/lfa/app/backend/routes/health.js
const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const redis = require('redis');

// Database connection check
async function checkDatabase() {
  try {
    const pool = new Pool();
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    return { status: 'healthy', responseTime: Date.now() };
  } catch (error) {
    return { status: 'unhealthy', error: error.message };
  }
}

// Redis connection check
async function checkRedis() {
  try {
    const client = redis.createClient();
    await client.connect();
    await client.ping();
    await client.disconnect();
    return { status: 'healthy', responseTime: Date.now() };
  } catch (error) {
    return { status: 'unhealthy', error: error.message };
  }
}

// External services check
async function checkExternalServices() {
  const services = {
    stripe: 'https://api.stripe.com/v1/charges',
    sendgrid: 'https://api.sendgrid.com/v3/user/profile'
  };
  
  const results = {};
  
  for (const [name, url] of Object.entries(services)) {
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        timeout: 5000
      });
      results[name] = {
        status: response.ok ? 'healthy' : 'unhealthy',
        statusCode: response.status
      };
    } catch (error) {
      results[name] = {
        status: 'unhealthy',
        error: error.message
      };
    }
  }
  
  return results;
}

// Health check endpoint
router.get('/health', async (req, res) => {
  const startTime = Date.now();
  
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.APP_VERSION || 'unknown',
    environment: process.env.NODE_ENV || 'development'
  };
  
  // Check dependencies
  const [database, cache, external] = await Promise.all([
    checkDatabase(),
    checkRedis(),
    checkExternalServices()
  ]);
  
  health.dependencies = {
    database,
    cache,
    external
  };
  
  // Determine overall health
  const isHealthy = database.status === 'healthy' && 
                   cache.status === 'healthy' &&
                   Object.values(external).every(service => service.status === 'healthy');
  
  health.status = isHealthy ? 'healthy' : 'unhealthy';
  health.responseTime = Date.now() - startTime;
  
  res.status(isHealthy ? 200 : 503).json(health);
});

// Detailed health check
router.get('/health/detailed', async (req, res) => {
  const health = {
    timestamp: new Date().toISOString(),
    system: {
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      uptime: process.uptime(),
      platform: process.platform,
      nodeVersion: process.version
    },
    application: {
      version: process.env.APP_VERSION || 'unknown',
      environment: process.env.NODE_ENV || 'development',
      gitCommit: process.env.GIT_COMMIT || 'unknown'
    }
  };
  
  res.json(health);
});

module.exports = router;
```

### Error Tracking and Logging

#### Structured Logging Setup
```javascript
// /opt/lfa/app/backend/utils/logger.js
const winston = require('winston');
const { format } = winston;

// Custom format for structured logging
const logFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.errors({ stack: true }),
  format.json()
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: {
    service: 'lfa-app',
    version: process.env.APP_VERSION || 'unknown',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    // File transports
    new winston.transports.File({
      filename: '/opt/lfa/app/backend/logs/error.log',
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5
    }),
    new winston.transports.File({
      filename: '/opt/lfa/app/backend/logs/combined.log',
      maxsize: 10485760, // 10MB
      maxFiles: 5
    }),
    
    // Console transport for development
    new winston.transports.Console({
      format: format.combine(
        format.colorize(),
        format.simple()
      )
    })
  ]
});

// Error tracking middleware
function errorTrackingMiddleware(err, req, res, next) {
  const errorId = require('uuid').v4();
  
  logger.error('Request error', {
    errorId,
    error: {
      message: err.message,
      stack: err.stack,
      name: err.name
    },
    request: {
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      userId: req.user?.id
    }
  });
  
  // Send error response
  res.status(500).json({
    error: 'Internal server error',
    errorId,
    timestamp: new Date().toISOString()
  });
}

module.exports = { logger, errorTrackingMiddleware };
```

## Database Monitoring

### PostgreSQL Monitoring Setup

#### PostgreSQL Exporter Configuration
```bash
#!/bin/bash
# Install and configure PostgreSQL exporter

# Download and install
wget https://github.com/prometheus-community/postgres_exporter/releases/download/v0.13.2/postgres_exporter-0.13.2.linux-amd64.tar.gz
tar xvfz postgres_exporter-0.13.2.linux-amd64.tar.gz
sudo mv postgres_exporter-0.13.2.linux-amd64/postgres_exporter /usr/local/bin/

# Create monitoring user
sudo -u postgres psql << EOF
CREATE USER prometheus_exporter PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE lfa_production TO prometheus_exporter;
GRANT pg_monitor TO prometheus_exporter;
EOF

# Create configuration file
cat <<EOF | sudo tee /etc/postgres_exporter/postgres_exporter.env
DATA_SOURCE_NAME="postgresql://prometheus_exporter:secure_password@localhost:5432/lfa_production?sslmode=disable"
PG_EXPORTER_EXTEND_QUERY_PATH="/etc/postgres_exporter/queries.yaml"
EOF

# Create custom queries
cat <<EOF | sudo tee /etc/postgres_exporter/queries.yaml
pg_replication:
  query: "SELECT CASE WHEN NOT pg_is_in_recovery() THEN 0 ELSE GREATEST (0, EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp()))) END AS lag"
  master: true
  metrics:
    - lag:
        usage: "GAUGE"
        description: "Replication lag behind master in seconds"

pg_postmaster:
  query: "SELECT pg_postmaster_start_time as start_time_seconds from pg_postmaster_start_time()"
  master: true
  metrics:
    - start_time_seconds:
        usage: "GAUGE"
        description: "Time at which postmaster started"

pg_stat_user_tables:
  query: |
    SELECT
      current_database() datname,
      schemaname,
      relname,
      seq_scan,
      seq_tup_read,
      idx_scan,
      idx_tup_fetch,
      n_tup_ins,
      n_tup_upd,
      n_tup_del,
      n_tup_hot_upd,
      n_live_tup,
      n_dead_tup,
      n_mod_since_analyze,
      COALESCE(last_vacuum, '1970-01-01Z') as last_vacuum,
      COALESCE(last_autovacuum, '1970-01-01Z') as last_autovacuum,
      COALESCE(last_analyze, '1970-01-01Z') as last_analyze,
      COALESCE(last_autoanalyze, '1970-01-01Z') as last_autoanalyze,
      vacuum_count,
      autovacuum_count,
      analyze_count,
      autoanalyze_count
    FROM pg_stat_user_tables
  metrics:
    - datname:
        usage: "LABEL"
        description: "Name of current database"
    - schemaname:
        usage: "LABEL"
        description: "Name of the schema that this table is in"
    - relname:
        usage: "LABEL"
        description: "Name of this table"
    - seq_scan:
        usage: "COUNTER"
        description: "Number of sequential scans initiated on this table"
    - seq_tup_read:
        usage: "COUNTER"
        description: "Number of live rows fetched by sequential scans"
    - idx_scan:
        usage: "COUNTER"
        description: "Number of index scans initiated on this table"
    - idx_tup_fetch:
        usage: "COUNTER"
        description: "Number of live rows fetched by index scans"
    - n_tup_ins:
        usage: "COUNTER"
        description: "Number of rows inserted"
    - n_tup_upd:
        usage: "COUNTER"
        description: "Number of rows updated"
    - n_tup_del:
        usage: "COUNTER"
        description: "Number of rows deleted"
    - n_tup_hot_upd:
        usage: "COUNTER"
        description: "Number of rows HOT updated"
    - n_live_tup:
        usage: "GAUGE"
        description: "Estimated number of live rows"
    - n_dead_tup:
        usage: "GAUGE"
        description: "Estimated number of dead rows"
    - n_mod_since_analyze:
        usage: "GAUGE"
        description: "Estimated number of rows changed since last analyze"
    - last_vacuum:
        usage: "GAUGE"
        description: "Last time at which this table was manually vacuumed"
    - last_autovacuum:
        usage: "GAUGE"
        description: "Last time at which this table was vacuumed by the autovacuum daemon"
    - last_analyze:
        usage: "GAUGE"
        description: "Last time at which this table was manually analyzed"
    - last_autoanalyze:
        usage: "GAUGE"
        description: "Last time at which this table was analyzed by the autovacuum daemon"
    - vacuum_count:
        usage: "COUNTER"
        description: "Number of times this table has been manually vacuumed"
    - autovacuum_count:
        usage: "COUNTER"
        description: "Number of times this table has been vacuumed by the autovacuum daemon"
    - analyze_count:
        usage: "COUNTER"
        description: "Number of times this table has been manually analyzed"
    - autoanalyze_count:
        usage: "COUNTER"
        description: "Number of times this table has been analyzed by the autovacuum daemon"
EOF

# Create systemd service
cat <<EOF | sudo tee /etc/systemd/system/postgres_exporter.service
[Unit]
Description=Prometheus PostgreSQL Exporter
After=network.target

[Service]
Type=simple
Restart=always
User=postgres
Group=postgres
EnvironmentFile=/etc/postgres_exporter/postgres_exporter.env
ExecStart=/usr/local/bin/postgres_exporter \
  --web.listen-address=:9187 \
  --web.telemetry-path=/metrics

[Install]
WantedBy=multi-user.target
EOF

# Start and enable service
sudo systemctl daemon-reload
sudo systemctl enable postgres_exporter
sudo systemctl start postgres_exporter
```

### Database Performance Monitoring

#### Custom Database Metrics Collection
```sql
-- Database performance monitoring queries
-- /opt/lfa/scripts/db_performance_monitor.sql

-- Connection statistics
SELECT 
    datname,
    numbackends as connections,
    xact_commit as transactions_committed,
    xact_rollback as transactions_rolled_back,
    blks_read as blocks_read,
    blks_hit as blocks_hit,
    tup_returned as tuples_returned,
    tup_fetched as tuples_fetched,
    tup_inserted as tuples_inserted,
    tup_updated as tuples_updated,
    tup_deleted as tuples_deleted
FROM pg_stat_database 
WHERE datname = 'lfa_production';

-- Top 10 slowest queries
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    min_time,
    max_time,
    stddev_time
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Index usage statistics
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Table bloat analysis
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as index_size,
    n_live_tup,
    n_dead_tup,
    CASE WHEN n_live_tup > 0 
         THEN round((n_dead_tup::float / n_live_tup::float) * 100, 2) 
         ELSE 0 
    END as dead_tuple_percent
FROM pg_stat_user_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Lock monitoring
SELECT 
    pg_stat_activity.pid,
    pg_stat_activity.usename,
    pg_stat_activity.query,
    pg_locks.mode,
    pg_locks.locktype,
    pg_locks.granted
FROM pg_stat_activity
JOIN pg_locks ON pg_stat_activity.pid = pg_locks.pid
WHERE pg_stat_activity.datname = 'lfa_production'
AND NOT pg_locks.granted;
```

## Performance Monitoring

### Application Performance Monitoring

#### Custom APM Implementation
```javascript
// /opt/lfa/app/backend/middleware/apm.js
const prometheus = require('prom-client');

class APMTracker {
  constructor() {
    this.requestDuration = new prometheus.Histogram({
      name: 'lfa_request_duration_seconds',
      help: 'Request duration in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10, 15, 20, 30]
    });

    this.dbQueryDuration = new prometheus.Histogram({
      name: 'lfa_db_query_duration_seconds',
      help: 'Database query duration in seconds',
      labelNames: ['query_type', 'table'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5, 10]
    });

    this.errorRate = new prometheus.Counter({
      name: 'lfa_errors_total',
      help: 'Total number of errors',
      labelNames: ['error_type', 'route']
    });

    this.activeTransactions = new prometheus.Gauge({
      name: 'lfa_active_transactions',
      help: 'Number of active transactions'
    });

    this.memoryUsage = new prometheus.Gauge({
      name: 'lfa_memory_usage_bytes',
      help: 'Memory usage in bytes',
      labelNames: ['type']
    });

    // Start memory monitoring
    this.startMemoryMonitoring();
  }

  trackRequest(req, res, next) {
    const start = Date.now();
    this.activeTransactions.inc();

    res.on('finish', () => {
      const duration = (Date.now() - start) / 1000;
      this.requestDuration.observe({
        method: req.method,
        route: req.route?.path || req.path,
        status_code: res.statusCode
      }, duration);

      this.activeTransactions.dec();

      // Track errors
      if (res.statusCode >= 400) {
        this.errorRate.inc({
          error_type: res.statusCode >= 500 ? 'server_error' : 'client_error',
          route: req.route?.path || req.path
        });
      }
    });

    next();
  }

  trackDatabaseQuery(queryType, table) {
    const end = this.dbQueryDuration.startTimer({ query_type: queryType, table });
    return () => end();
  }

  startMemoryMonitoring() {
    setInterval(() => {
      const memUsage = process.memoryUsage();
      this.memoryUsage.set({ type: 'rss' }, memUsage.rss);
      this.memoryUsage.set({ type: 'heap_used' }, memUsage.heapUsed);
      this.memoryUsage.set({ type: 'heap_total' }, memUsage.heapTotal);
      this.memoryUsage.set({ type: 'external' }, memUsage.external);
    }, 10000); // Every 10 seconds
  }

  generateReport() {
    return {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      eventLoop: {
        delay: this.measureEventLoopDelay()
      }
    };
  }

  measureEventLoopDelay() {
    const start = process.hrtime.bigint();
    setImmediate(() => {
      const delay = process.hrtime.bigint() - start;
      return Number(delay) / 1000000; // Convert to milliseconds
    });
  }
}

module.exports = new APMTracker();
```

### Frontend Performance Monitoring

#### Web Vitals Tracking
```javascript
// Frontend performance monitoring
// /opt/lfa/app/frontend/src/utils/performance.js

import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

class PerformanceTracker {
  constructor() {
    this.metrics = {};
    this.initializeTracking();
  }

  initializeTracking() {
    // Track Core Web Vitals
    getCLS(this.handleMetric.bind(this));
    getFID(this.handleMetric.bind(this));
    getFCP(this.handleMetric.bind(this));
    getLCP(this.handleMetric.bind(this));
    getTTFB(this.handleMetric.bind(this));

    // Track custom metrics
    this.trackRouteChanges();
    this.trackResourceLoading();
    this.trackUserInteractions();
  }

  handleMetric(metric) {
    this.metrics[metric.name] = metric.value;
    
    // Send to analytics
    this.sendMetricToBackend(metric);
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`${metric.name}: ${metric.value}`);
    }
  }

  trackRouteChanges() {
    let routeStartTime = performance.now();
    
    // Listen for route changes
    window.addEventListener('popstate', () => {
      const routeLoadTime = performance.now() - routeStartTime;
      this.sendMetricToBackend({
        name: 'route_change_duration',
        value: routeLoadTime,
        route: window.location.pathname
      });
      routeStartTime = performance.now();
    });
  }

  trackResourceLoading() {
    // Monitor resource loading times
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'resource') {
          this.sendMetricToBackend({
            name: 'resource_load_time',
            value: entry.duration,
            resource: entry.name,
            type: entry.initiatorType
          });
        }
      }
    });
    
    observer.observe({ entryTypes: ['resource'] });
  }

  trackUserInteractions() {
    // Track click response times
    document.addEventListener('click', (event) => {
      const startTime = performance.now();
      
      requestAnimationFrame(() => {
        const responseTime = performance.now() - startTime;
        this.sendMetricToBackend({
          name: 'click_response_time',
          value: responseTime,
          element: event.target.tagName,
          className: event.target.className
        });
      });
    });

    // Track form submission times
    document.addEventListener('submit', (event) => {
      const startTime = performance.now();
      const form = event.target;
      
      form.addEventListener('load', () => {
        const submitTime = performance.now() - startTime;
        this.sendMetricToBackend({
          name: 'form_submission_time',
          value: submitTime,
          formId: form.id || 'unknown'
        });
      });
    });
  }

  async sendMetricToBackend(metric) {
    try {
      await fetch('/api/v1/metrics/frontend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...metric,
          timestamp: Date.now(),
          userAgent: navigator.userAgent,
          url: window.location.href,
          userId: this.getUserId()
        })
      });
    } catch (error) {
      console.error('Failed to send metric:', error);
    }
  }

  getUserId() {
    // Get user ID from authentication context
    return localStorage.getItem('userId') || 'anonymous';
  }

  getPerformanceReport() {
    return {
      navigation: performance.getEntriesByType('navigation')[0],
      resources: performance.getEntriesByType('resource'),
      measures: performance.getEntriesByType('measure'),
      marks: performance.getEntriesByType('mark'),
      webVitals: this.metrics
    };
  }
}

export default new PerformanceTracker();
```

## Security Monitoring

### Security Event Monitoring

#### Security Metrics Collection
```javascript
// /opt/lfa/app/backend/middleware/security-monitoring.js
const prometheus = require('prom-client');
const { logger } = require('../utils/logger');

class SecurityMonitor {
  constructor() {
    this.securityEvents = new prometheus.Counter({
      name: 'lfa_security_events_total',
      help: 'Total number of security events',
      labelNames: ['event_type', 'severity', 'source_ip']
    });

    this.authenticationAttempts = new prometheus.Counter({
      name: 'lfa_authentication_attempts_total',
      help: 'Total authentication attempts',
      labelNames: ['result', 'user_type', 'source_ip']
    });

    this.suspiciousActivity = new prometheus.Gauge({
      name: 'lfa_suspicious_activity_score',
      help: 'Suspicious activity score by IP',
      labelNames: ['source_ip']
    });

    this.rateLimitViolations = new prometheus.Counter({
      name: 'lfa_rate_limit_violations_total',
      help: 'Rate limit violations',
      labelNames: ['endpoint', 'source_ip']
    });

    this.failedLoginAttempts = new Map();
    this.suspiciousIPs = new Set();
  }

  trackAuthenticationAttempt(result, userType, sourceIP, userId = null) {
    this.authenticationAttempts.inc({
      result,
      user_type: userType,
      source_ip: sourceIP
    });

    if (result === 'failed') {
      this.trackFailedLogin(sourceIP, userId);
    } else {
      // Clear failed attempts on successful login
      this.failedLoginAttempts.delete(sourceIP);
    }

    logger.info('Authentication attempt', {
      result,
      userType,
      sourceIP,
      userId,
      timestamp: new Date().toISOString()
    });
  }

  trackFailedLogin(sourceIP, userId) {
    const attempts = this.failedLoginAttempts.get(sourceIP) || 0;
    const newAttempts = attempts + 1;
    this.failedLoginAttempts.set(sourceIP, newAttempts);

    // Escalate security event if too many failed attempts
    if (newAttempts >= 5) {
      this.reportSecurityEvent('brute_force_attempt', 'high', sourceIP, {
        attempts: newAttempts,
        userId
      });
      this.suspiciousIPs.add(sourceIP);
    }

    this.securityEvents.inc({
      event_type: 'failed_login',
      severity: newAttempts >= 3 ? 'medium' : 'low',
      source_ip: sourceIP
    });
  }

  trackRateLimitViolation(endpoint, sourceIP) {
    this.rateLimitViolations.inc({
      endpoint,
      source_ip: sourceIP
    });

    this.reportSecurityEvent('rate_limit_violation', 'medium', sourceIP, {
      endpoint
    });
  }

  trackSuspiciousActivity(sourceIP, activityType, details) {
    const currentScore = this.suspiciousActivity.get({ source_ip: sourceIP }) || 0;
    const newScore = currentScore + this.calculateSuspiciousScore(activityType);
    
    this.suspiciousActivity.set({ source_ip: sourceIP }, newScore);

    if (newScore >= 100) {
      this.reportSecurityEvent('high_suspicious_activity', 'critical', sourceIP, {
        score: newScore,
        activityType,
        details
      });
    }
  }

  calculateSuspiciousScore(activityType) {
    const scores = {
      'sql_injection_attempt': 50,
      'xss_attempt': 30,
      'unusual_user_agent': 10,
      'multiple_failed_logins': 25,
      'unusual_request_pattern': 15,
      'unauthorized_access_attempt': 40
    };
    
    return scores[activityType] || 5;
  }

  reportSecurityEvent(eventType, severity, sourceIP, additionalData = {}) {
    this.securityEvents.inc({
      event_type: eventType,
      severity,
      source_ip: sourceIP
    });

    const securityEvent = {
      eventType,
      severity,
      sourceIP,
      timestamp: new Date().toISOString(),
      ...additionalData
    };

    logger.warn('Security event detected', securityEvent);

    // Send critical events to security team immediately
    if (severity === 'critical') {
      this.sendSecurityAlert(securityEvent);
    }
  }

  async sendSecurityAlert(event) {
    try {
      // Send to security monitoring system
      await fetch(process.env.SECURITY_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SECURITY_API_KEY}`
        },
        body: JSON.stringify(event)
      });

      // Send email notification
      const emailService = require('../services/email');
      await emailService.sendSecurityAlert(event);
    } catch (error) {
      logger.error('Failed to send security alert', { error: error.message });
    }
  }

  middleware() {
    return (req, res, next) => {
      const sourceIP = req.ip || req.connection.remoteAddress;
      
      // Check for suspicious patterns
      this.checkForSuspiciousPatterns(req, sourceIP);
      
      // Track request
      req.securityMonitor = this;
      
      next();
    };
  }

  checkForSuspiciousPatterns(req, sourceIP) {
    const userAgent = req.get('User-Agent') || '';
    const url = req.url;
    
    // Check for SQL injection attempts
    if (/(\bUNION\b|\bSELECT\b|\bINSERT\b|\bDROP\b|\bDELETE\b)/i.test(url)) {
      this.trackSuspiciousActivity(sourceIP, 'sql_injection_attempt', { url });
    }
    
    // Check for XSS attempts
    if (/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi.test(url)) {
      this.trackSuspiciousActivity(sourceIP, 'xss_attempt', { url });
    }
    
    // Check for unusual user agents
    if (userAgent.length === 0 || /bot|crawler|spider/i.test(userAgent)) {
      this.trackSuspiciousActivity(sourceIP, 'unusual_user_agent', { userAgent });
    }
  }

  getSecurityReport() {
    return {
      timestamp: new Date().toISOString(),
      failedLoginAttempts: Object.fromEntries(this.failedLoginAttempts),
      suspiciousIPs: Array.from(this.suspiciousIPs),
      totalSecurityEvents: this.securityEvents.getTotal(),
      totalAuthAttempts: this.authenticationAttempts.getTotal()
    };
  }
}

module.exports = new SecurityMonitor();
```

## Business Metrics Monitoring

### Key Performance Indicators (KPIs)

#### Business Metrics Collection
```javascript
// /opt/lfa/app/backend/services/business-metrics.js
const prometheus = require('prom-client');
const { Pool } = require('pg');

class BusinessMetricsCollector {
  constructor() {
    this.pool = new Pool();
    
    // Business metrics
    this.totalUsers = new prometheus.Gauge({
      name: 'lfa_total_users',
      help: 'Total number of users',
      labelNames: ['user_type', 'status']
    });

    this.totalRevenue = new prometheus.Gauge({
      name: 'lfa_total_revenue',
      help: 'Total revenue in USD',
      labelNames: ['period', 'currency']
    });

    this.activeSubscriptions = new prometheus.Gauge({
      name: 'lfa_active_subscriptions',
      help: 'Number of active subscriptions',
      labelNames: ['plan_type']
    });

    this.trainingSessions = new prometheus.Gauge({
      name: 'lfa_training_sessions',
      help: 'Number of training sessions',
      labelNames: ['status', 'team_type']
    });

    this.userEngagement = new prometheus.Gauge({
      name: 'lfa_user_engagement',
      help: 'User engagement metrics',
      labelNames: ['metric_type', 'user_type']
    });

    // Start collection
    this.startCollection();
  }

  async startCollection() {
    // Collect metrics every 5 minutes
    setInterval(async () => {
      try {
        await this.collectUserMetrics();
        await this.collectRevenueMetrics();
        await this.collectTrainingMetrics();
        await this.collectEngagementMetrics();
      } catch (error) {
        console.error('Error collecting business metrics:', error);
      }
    }, 5 * 60 * 1000);

    // Initial collection
    await this.collectAllMetrics();
  }

  async collectUserMetrics() {
    const query = `
      SELECT 
        user_type,
        CASE WHEN deleted_at IS NULL THEN 'active' ELSE 'deleted' END as status,
        COUNT(*) as count
      FROM users 
      GROUP BY user_type, CASE WHEN deleted_at IS NULL THEN 'active' ELSE 'deleted' END
    `;

    const result = await this.pool.query(query);
    
    result.rows.forEach(row => {
      this.totalUsers.set({
        user_type: row.user_type,
        status: row.status
      }, parseInt(row.count));
    });
  }

  async collectRevenueMetrics() {
    const queries = {
      daily: `
        SELECT COALESCE(SUM(amount), 0) as revenue
        FROM payments 
        WHERE status = 'completed' 
        AND created_at >= CURRENT_DATE
      `,
      weekly: `
        SELECT COALESCE(SUM(amount), 0) as revenue
        FROM payments 
        WHERE status = 'completed' 
        AND created_at >= CURRENT_DATE - INTERVAL '7 days'
      `,
      monthly: `
        SELECT COALESCE(SUM(amount), 0) as revenue
        FROM payments 
        WHERE status = 'completed' 
        AND created_at >= CURRENT_DATE - INTERVAL '30 days'
      `,
      total: `
        SELECT COALESCE(SUM(amount), 0) as revenue
        FROM payments 
        WHERE status = 'completed'
      `
    };

    for (const [period, query] of Object.entries(queries)) {
      const result = await this.pool.query(query);
      this.totalRevenue.set({
        period,
        currency: 'USD'
      }, parseFloat(result.rows[0].revenue) / 100); // Convert cents to dollars
    }
  }

  async collectTrainingMetrics() {
    const query = `
      SELECT 
        CASE 
          WHEN session_date > NOW() THEN 'scheduled'
          WHEN session_date <= NOW() AND session_date > NOW() - INTERVAL '1 day' THEN 'completed'
          ELSE 'past'
        END as status,
        t.age_group as team_type,
        COUNT(*) as count
      FROM training_sessions ts
      JOIN teams t ON ts.team_id = t.id
      GROUP BY 
        CASE 
          WHEN session_date > NOW() THEN 'scheduled'
          WHEN session_date <= NOW() AND session_date > NOW() - INTERVAL '1 day' THEN 'completed'
          ELSE 'past'
        END,
        t.age_group
    `;

    const result = await this.pool.query(query);
    
    result.rows.forEach(row => {
      this.trainingSessions.set({
        status: row.status,
        team_type: row.team_type || 'unknown'
      }, parseInt(row.count));
    });
  }

  async collectEngagementMetrics() {
    // Daily active users
    const dauQuery = `
      SELECT 
        user_type,
        COUNT(DISTINCT user_id) as count
      FROM user_sessions 
      WHERE last_activity >= CURRENT_DATE
      GROUP BY user_type
    `;

    const dauResult = await this.pool.query(dauQuery);
    dauResult.rows.forEach(row => {
      this.userEngagement.set({
        metric_type: 'daily_active_users',
        user_type: row.user_type
      }, parseInt(row.count));
    });

    // Weekly active users
    const wauQuery = `
      SELECT 
        user_type,
        COUNT(DISTINCT user_id) as count
      FROM user_sessions 
      WHERE last_activity >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY user_type
    `;

    const wauResult = await this.pool.query(wauQuery);
    wauResult.rows.forEach(row => {
      this.userEngagement.set({
        metric_type: 'weekly_active_users',
        user_type: row.user_type
      }, parseInt(row.count));
    });

    // Average session duration
    const sessionDurationQuery = `
      SELECT 
        user_type,
        AVG(EXTRACT(EPOCH FROM (last_activity - created_at))) as avg_duration
      FROM user_sessions us
      JOIN users u ON us.user_id = u.id
      WHERE us.created_at >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY user_type
    `;

    const sessionResult = await this.pool.query(sessionDurationQuery);
    sessionResult.rows.forEach(row => {
      this.userEngagement.set({
        metric_type: 'avg_session_duration_seconds',
        user_type: row.user_type
      }, parseFloat(row.avg_duration) || 0);
    });
  }

  async collectAllMetrics() {
    await this.collectUserMetrics();
    await this.collectRevenueMetrics();
    await this.collectTrainingMetrics();
    await this.collectEngagementMetrics();
  }

  async getBusinessReport() {
    await this.collectAllMetrics();
    
    return {
      timestamp: new Date().toISOString(),
      users: await this.getUserStats(),
      revenue: await this.getRevenueStats(),
      training: await this.getTrainingStats(),
      engagement: await this.getEngagementStats()
    };
  }

  async getUserStats() {
    const query = `
      SELECT 
        user_type,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE deleted_at IS NULL) as active,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as new_this_month
      FROM users 
      GROUP BY user_type
    `;

    const result = await this.pool.query(query);
    return result.rows;
  }

  async getRevenueStats() {
    const query = `
      SELECT 
        DATE_TRUNC('month', created_at) as month,
        COUNT(*) as transaction_count,
        SUM(amount) / 100 as total_amount
      FROM payments 
      WHERE status = 'completed'
      AND created_at >= CURRENT_DATE - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month DESC
    `;

    const result = await this.pool.query(query);
    return result.rows;
  }

  async getTrainingStats() {
    const query = `
      SELECT 
        DATE_TRUNC('week', session_date) as week,
        COUNT(*) as sessions_count,
        COUNT(DISTINCT team_id) as teams_active,
        AVG(duration_minutes) as avg_duration
      FROM training_sessions 
      WHERE session_date >= CURRENT_DATE - INTERVAL '8 weeks'
      GROUP BY DATE_TRUNC('week', session_date)
      ORDER BY week DESC
    `;

    const result = await this.pool.query(query);
    return result.rows;
  }

  async getEngagementStats() {
    const query = `
      SELECT 
        DATE_TRUNC('day', last_activity) as day,
        COUNT(DISTINCT user_id) as active_users,
        COUNT(*) as total_sessions,
        AVG(EXTRACT(EPOCH FROM (last_activity - created_at))) as avg_session_duration
      FROM user_sessions 
      WHERE last_activity >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE_TRUNC('day', last_activity)
      ORDER BY day DESC
    `;

    const result = await this.pool.query(query);
    return result.rows;
  }
}

module.exports = new BusinessMetricsCollector();
```

## Alerting and Notifications

### Prometheus Alerting Rules

#### Critical System Alerts
```yaml
# /etc/prometheus/rules/critical.yml
groups:
  - name: critical_alerts
    rules:
      - alert: InstanceDown
        expr: up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Instance {{ $labels.instance }} down"
          description: "{{ $labels.instance }} of job {{ $labels.job }} has been down for more than 1 minute."

      - alert: HighErrorRate
        expr: rate(lfa_http_requests_total{status_code=~"5.."}[5m]) > 0.1
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} errors per second for the last 5 minutes."

      - alert: DatabaseDown
        expr: up{job="postgres-exporter"} == 0
        for: 30s
        labels:
          severity: critical
        annotations:
          summary: "Database is down"
          description: "PostgreSQL database is not responding."

      - alert: HighCPUUsage
        expr: 100 - (avg by(instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 85
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage detected"
          description: "CPU usage is above 85% for {{ $labels.instance }}."

      - alert: HighMemoryUsage
        expr: (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes * 100 > 90
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage detected"
          description: "Memory usage is above 90% for {{ $labels.instance }}."

      - alert: DiskSpaceLow
        expr: (node_filesystem_avail_bytes / node_filesystem_size_bytes) * 100 < 10
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Low disk space"
          description: "Disk space is below 10% for {{ $labels.instance }}:{{ $labels.mountpoint }}."

      - alert: SlowDatabaseQueries
        expr: rate(lfa_db_query_duration_seconds_sum[5m]) / rate(lfa_db_query_duration_seconds_count[5m]) > 1
        for: 3m
        labels:
          severity: warning
        annotations:
          summary: "Slow database queries detected"
          description: "Average database query time is {{ $value }}s over the last 5 minutes."

      - alert: SecurityThreatDetected
        expr: increase(lfa_security_events_total{severity="critical"}[5m]) > 0
        for: 0m
        labels:
          severity: critical
        annotations:
          summary: "Critical security threat detected"
          description: "{{ $value }} critical security events detected in the last 5 minutes."

      - alert: PaymentProcessingFailure
        expr: rate(lfa_payment_failures_total[5m]) > 0.1
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "High payment processing failure rate"
          description: "Payment failure rate is {{ $value }} failures per second."

      - alert: SSLCertificateExpiry
        expr: (lfa_ssl_certificate_expiry_seconds - time()) / 86400 < 7
        for: 1h
        labels:
          severity: warning
        annotations:
          summary: "SSL certificate expiring soon"
          description: "SSL certificate for {{ $labels.domain }} expires in {{ $value }} days."
```

#### Business Logic Alerts
```yaml
# /etc/prometheus/rules/business.yml
groups:
  - name: business_alerts
    rules:
      - alert: LowUserEngagement
        expr: lfa_user_engagement{metric_type="daily_active_users"} < 50
        for: 1d
        labels:
          severity: warning
        annotations:
          summary: "Low user engagement detected"
          description: "Daily active users ({{ $value }}) is below expected threshold."

      - alert: RevenueDrop
        expr: (lfa_total_revenue{period="daily"} offset 1d) - lfa_total_revenue{period="daily"} > 1000
        for: 1h
        labels:
          severity: warning
        annotations:
          summary: "Significant revenue drop"
          description: "Daily revenue dropped by ${{ $value }} compared to yesterday."

      - alert: HighSubscriptionChurn
        expr: rate(lfa_subscription_cancellations_total[1d]) > 0.05
        for: 1h
        labels:
          severity: warning
        annotations:
          summary: "High subscription churn rate"
          description: "Subscription churn rate is {{ $value }}% over the last day."

      - alert: TrainingSessionCancellations
        expr: increase(lfa_training_sessions_cancelled_total[1h]) > 5
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High number of training session cancellations"
          description: "{{ $value }} training sessions cancelled in the last hour."

      - alert: LowSystemUsage
        expr: rate(lfa_http_requests_total[1h]) < 100
        for: 2h
        labels:
          severity: info
        annotations:
          summary: "Low system usage"
          description: "System request rate is {{ $value }} requests per second, which is unusually low."
```

### Alertmanager Configuration

#### Multi-Channel Notifications
```yaml
# /etc/alertmanager/alertmanager.yml
global:
  smtp_smarthost: 'smtp.sendgrid.net:587'
  smtp_from: 'alerts@lionfootballacademy.com'
  smtp_auth_username: 'apikey'
  smtp_auth_password: 'SG.your-sendgrid-api-key'

route:
  group_by: ['alertname', 'cluster', 'service']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h
  receiver: 'default'
  routes:
    - match:
        severity: critical
      receiver: 'critical-alerts'
      group_wait: 5s
      repeat_interval: 5m
    - match:
        severity: warning
      receiver: 'warning-alerts'
      repeat_interval: 1h
    - match:
        alertname: SecurityThreatDetected
      receiver: 'security-alerts'
      group_wait: 0s
      repeat_interval: 0s

receivers:
  - name: 'default'
    email_configs:
      - to: 'admin@lionfootballacademy.com'
        subject: 'LFA Alert: {{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'
        body: |
          {{ range .Alerts }}
          Alert: {{ .Annotations.summary }}
          Description: {{ .Annotations.description }}
          Labels: {{ range .Labels.SortedPairs }}{{ .Name }}={{ .Value }} {{ end }}
          {{ end }}

  - name: 'critical-alerts'
    email_configs:
      - to: 'critical-alerts@lionfootballacademy.com'
        subject: '🚨 CRITICAL: LFA System Alert'
        body: |
          CRITICAL ALERT DETECTED
          
          {{ range .Alerts }}
          Alert: {{ .Annotations.summary }}
          Description: {{ .Annotations.description }}
          Instance: {{ .Labels.instance }}
          Time: {{ .StartsAt.Format "2006-01-02 15:04:05" }}
          {{ end }}
          
          Please investigate immediately.
    slack_configs:
      - api_url: 'YOUR_SLACK_WEBHOOK_URL'
        channel: '#critical-alerts'
        title: '🚨 Critical Alert'
        text: |
          {{ range .Alerts }}
          *{{ .Annotations.summary }}*
          {{ .Annotations.description }}
          {{ end }}
        color: 'danger'
    webhook_configs:
      - url: 'https://hooks.pagerduty.com/integration/your-integration-key'
        send_resolved: true

  - name: 'warning-alerts'
    email_configs:
      - to: 'warnings@lionfootballacademy.com'
        subject: '⚠️ WARNING: LFA System Alert'
        body: |
          {{ range .Alerts }}
          Warning: {{ .Annotations.summary }}
          Description: {{ .Annotations.description }}
          {{ end }}
    slack_configs:
      - api_url: 'YOUR_SLACK_WEBHOOK_URL'
        channel: '#warnings'
        title: '⚠️ Warning Alert'
        color: 'warning'

  - name: 'security-alerts'
    email_configs:
      - to: 'security@lionfootballacademy.com'
        subject: '🔒 SECURITY ALERT: Immediate Action Required'
        body: |
          SECURITY THREAT DETECTED
          
          {{ range .Alerts }}
          Threat: {{ .Annotations.summary }}
          Details: {{ .Annotations.description }}
          Source: {{ .Labels.source_ip }}
          Time: {{ .StartsAt.Format "2006-01-02 15:04:05" }}
          {{ end }}
          
          Immediate investigation required.
    webhook_configs:
      - url: 'https://your-security-system.com/webhook'
        send_resolved: true

inhibit_rules:
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname', 'instance']
```

### Custom Notification Scripts

#### SMS Notifications for Critical Alerts
```bash
#!/bin/bash
# /opt/lfa/scripts/send_sms_alert.sh

ALERT_TYPE=$1
ALERT_MESSAGE=$2
PHONE_NUMBERS="+1234567890,+0987654321"

# Twilio configuration
TWILIO_ACCOUNT_SID="your_account_sid"
TWILIO_AUTH_TOKEN="your_auth_token"
TWILIO_PHONE_NUMBER="+1234567890"

# Send SMS to each phone number
IFS=',' read -ra PHONES <<< "$PHONE_NUMBERS"
for phone in "${PHONES[@]}"; do
  curl -X POST "https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID/Messages.json" \
    --data-urlencode "From=$TWILIO_PHONE_NUMBER" \
    --data-urlencode "To=$phone" \
    --data-urlencode "Body=LFA ALERT: $ALERT_TYPE - $ALERT_MESSAGE" \
    -u "$TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN"
done

echo "SMS alerts sent to: $PHONE_NUMBERS"
```

## Dashboard Configuration

### Grafana Dashboard Setup

#### System Overview Dashboard
```json
{
  "dashboard": {
    "id": null,
    "title": "LFA System Overview",
    "tags": ["lfa", "overview"],
    "style": "dark",
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "System Status",
        "type": "stat",
        "targets": [
          {
            "expr": "up",
            "legendFormat": "{{ instance }}"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "color": {
              "mode": "thresholds"
            },
            "thresholds": {
              "steps": [
                {"color": "red", "value": 0},
                {"color": "green", "value": 1}
              ]
            }
          }
        }
      },
      {
        "id": 2,
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(lfa_http_requests_total[5m])",
            "legendFormat": "{{ method }} {{ route }}"
          }
        ]
      },
      {
        "id": 3,
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(lfa_http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          },
          {
            "expr": "histogram_quantile(0.50, rate(lfa_http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "50th percentile"
          }
        ]
      },
      {
        "id": 4,
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(lfa_http_requests_total{status_code=~\"5..\"}[5m])",
            "legendFormat": "5xx errors"
          },
          {
            "expr": "rate(lfa_http_requests_total{status_code=~\"4..\"}[5m])",
            "legendFormat": "4xx errors"
          }
        ]
      },
      {
        "id": 5,
        "title": "Database Performance",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(lfa_db_query_duration_seconds_sum[5m]) / rate(lfa_db_query_duration_seconds_count[5m])",
            "legendFormat": "Average query time"
          }
        ]
      },
      {
        "id": 6,
        "title": "Active Users",
        "type": "stat",
        "targets": [
          {
            "expr": "sum(lfa_user_engagement{metric_type=\"daily_active_users\"})",
            "legendFormat": "Daily Active Users"
          }
        ]
      }
    ],
    "time": {
      "from": "now-1h",
      "to": "now"
    },
    "refresh": "5s"
  }
}
```

#### Business Metrics Dashboard
```json
{
  "dashboard": {
    "id": null,
    "title": "LFA Business Metrics",
    "tags": ["lfa", "business"],
    "panels": [
      {
        "id": 1,
        "title": "Total Revenue",
        "type": "stat",
        "targets": [
          {
            "expr": "lfa_total_revenue{period=\"total\"}",
            "legendFormat": "Total Revenue"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "currencyUSD"
          }
        }
      },
      {
        "id": 2,
        "title": "User Growth",
        "type": "graph",
        "targets": [
          {
            "expr": "lfa_total_users{status=\"active\"}",
            "legendFormat": "{{ user_type }}"
          }
        ]
      },
      {
        "id": 3,
        "title": "Training Sessions",
        "type": "graph",
        "targets": [
          {
            "expr": "lfa_training_sessions",
            "legendFormat": "{{ status }}"
          }
        ]
      },
      {
        "id": 4,
        "title": "Revenue Trend",
        "type": "graph",
        "targets": [
          {
            "expr": "lfa_total_revenue{period=\"daily\"}",
            "legendFormat": "Daily Revenue"
          },
          {
            "expr": "lfa_total_revenue{period=\"weekly\"}",
            "legendFormat": "Weekly Revenue"
          }
        ]
      },
      {
        "id": 5,
        "title": "User Engagement",
        "type": "graph",
        "targets": [
          {
            "expr": "lfa_user_engagement{metric_type=\"daily_active_users\"}",
            "legendFormat": "DAU - {{ user_type }}"
          },
          {
            "expr": "lfa_user_engagement{metric_type=\"weekly_active_users\"}",
            "legendFormat": "WAU - {{ user_type }}"
          }
        ]
      }
    ]
  }
}
```

## Monitoring Maintenance

### Regular Maintenance Tasks

#### Monitoring System Health Check
```bash
#!/bin/bash
# /opt/lfa/scripts/monitoring_health_check.sh

echo "=== Monitoring System Health Check ==="

# Check Prometheus
echo "Checking Prometheus..."
if curl -sf http://localhost:9090/api/v1/query?query=up >/dev/null; then
  echo "✓ Prometheus is responding"
else
  echo "✗ Prometheus is not responding"
  systemctl restart prometheus
fi

# Check Grafana
echo "Checking Grafana..."
if curl -sf http://localhost:3001/api/health >/dev/null; then
  echo "✓ Grafana is responding"
else
  echo "✗ Grafana is not responding"
  systemctl restart grafana-server
fi

# Check Alertmanager
echo "Checking Alertmanager..."
if curl -sf http://localhost:9093/api/v1/status >/dev/null; then
  echo "✓ Alertmanager is responding"
else
  echo "✗ Alertmanager is not responding"
  systemctl restart alertmanager
fi

# Check disk space for metrics storage
echo "Checking metrics storage..."
USAGE=$(df /var/lib/prometheus | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $USAGE -gt 80 ]; then
  echo "⚠ Warning: Metrics storage is ${USAGE}% full"
  # Clean up old metrics
  find /var/lib/prometheus -name "*.db" -mtime +30 -delete
else
  echo "✓ Metrics storage usage: ${USAGE}%"
fi

# Verify metric collection
echo "Checking metric collection..."
RECENT_METRICS=$(curl -s http://localhost:9090/api/v1/query?query=up | jq '.data.result | length')
if [ $RECENT_METRICS -gt 0 ]; then
  echo "✓ Collecting metrics from $RECENT_METRICS targets"
else
  echo "✗ No recent metrics found"
fi

echo "=== Health Check Complete ==="
```

#### Metrics Retention Management
```bash
#!/bin/bash
# /opt/lfa/scripts/manage_metrics_retention.sh

PROMETHEUS_DATA_DIR="/var/lib/prometheus"
RETENTION_DAYS=90
BACKUP_DIR="/backup/prometheus"

echo "Managing Prometheus metrics retention..."

# Create backup of old data before cleanup
echo "Creating backup of metrics data..."
DATE=$(date +%Y%m%d)
tar -czf "$BACKUP_DIR/prometheus_data_$DATE.tar.gz" \
  -C "$PROMETHEUS_DATA_DIR" .

# Stop Prometheus for maintenance
systemctl stop prometheus

# Clean up old metric blocks
echo "Cleaning up old metric blocks..."
find "$PROMETHEUS_DATA_DIR" -name "*.db" -mtime +$RETENTION_DAYS -delete

# Compact remaining data
echo "Compacting metric data..."
promtool tsdb compact "$PROMETHEUS_DATA_DIR"

# Start Prometheus
systemctl start prometheus

# Verify Prometheus is working
sleep 10
if curl -sf http://localhost:9090/api/v1/query?query=up >/dev/null; then
  echo "✓ Prometheus restarted successfully"
else
  echo "✗ Prometheus failed to restart"
  exit 1
fi

echo "Metrics retention management complete"
```

---

*This monitoring guide provides comprehensive coverage of all monitoring aspects for the Lion Football Academy system. Regular updates should be made to reflect system changes and monitoring requirements.*