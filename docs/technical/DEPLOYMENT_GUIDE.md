# Lion Football Academy - Deployment Guide

## Table of Contents
1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Environment Setup](#environment-setup)
4. [Database Setup](#database-setup)
5. [Application Deployment](#application-deployment)
6. [Infrastructure Configuration](#infrastructure-configuration)
7. [SSL/TLS Configuration](#ssltls-configuration)
8. [Monitoring Setup](#monitoring-setup)
9. [Backup Configuration](#backup-configuration)
10. [CI/CD Pipeline](#cicd-pipeline)
11. [Troubleshooting](#troubleshooting)

## Overview

This guide covers the complete deployment process for the Lion Football Academy system, from infrastructure setup to production deployment with monitoring and backup systems.

### Deployment Architecture
- **Frontend**: React PWA served via NGINX
- **Backend**: Node.js API with Express.js
- **Database**: PostgreSQL with read replicas
- **Cache**: Redis for session storage and caching
- **File Storage**: AWS S3 for uploads and backups
- **CDN**: CloudFlare for global content delivery
- **Load Balancer**: NGINX for high availability

### Supported Deployment Methods
1. **Docker Containers** (Recommended)
2. **Traditional Server Setup**
3. **Kubernetes Cluster**
4. **Serverless Functions** (API only)

## Prerequisites

### System Requirements

#### Minimum Requirements (Single Server)
- **CPU**: 2 cores (2.4 GHz)
- **RAM**: 4 GB
- **Storage**: 50 GB SSD
- **Network**: 100 Mbps
- **OS**: Ubuntu 20.04 LTS or CentOS 8

#### Recommended Production Setup
- **CPU**: 4+ cores (3.0 GHz)
- **RAM**: 8+ GB
- **Storage**: 100+ GB SSD
- **Network**: 1 Gbps
- **OS**: Ubuntu 22.04 LTS

#### High Availability Setup
- **Load Balancers**: 2x servers (2 cores, 4 GB RAM)
- **Application Servers**: 3x servers (4 cores, 8 GB RAM)
- **Database**: 1x Primary + 2x Read Replicas (8 cores, 16 GB RAM)
- **Cache**: 2x Redis servers (2 cores, 4 GB RAM)

### Software Dependencies
```bash
# Required software versions
Node.js: 18.x LTS
PostgreSQL: 15.x
Redis: 7.x
NGINX: 1.20+
Docker: 20.10+
Docker Compose: 2.0+
```

### External Services
- **Payment Processing**: Stripe account
- **Email Service**: SendGrid/AWS SES
- **SMS Service**: Twilio (optional)
- **File Storage**: AWS S3 bucket
- **Domain & DNS**: CloudFlare account
- **SSL Certificates**: Let's Encrypt

## Environment Setup

### 1. Server Preparation

#### Update System
```bash
# Ubuntu/Debian
sudo apt update && sudo apt upgrade -y
sudo apt install curl wget git unzip software-properties-common -y

# CentOS/RHEL
sudo yum update -y
sudo yum install curl wget git unzip -y
```

#### Install Node.js
```bash
# Using NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should be 18.x
npm --version   # Should be 9.x+
```

#### Install Docker & Docker Compose
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

### 2. Create Application User
```bash
# Create dedicated user for the application
sudo useradd -m -s /bin/bash lfa
sudo usermod -aG docker lfa
sudo mkdir -p /home/lfa/{app,logs,backups}
sudo chown -R lfa:lfa /home/lfa/
```

### 3. Setup Directory Structure
```bash
# Application directory structure
/home/lfa/
├── app/                    # Application files
│   ├── frontend/          # React build files
│   ├── backend/           # Node.js API
│   ├── docker-compose.yml
│   └── .env.production
├── logs/                  # Application logs
├── backups/              # Database backups
├── ssl/                  # SSL certificates
└── nginx/                # NGINX configuration
```

## Database Setup

### 1. PostgreSQL Installation

#### Using Docker (Recommended)
```yaml
# docker-compose.db.yml
version: '3.8'
services:
  postgres-primary:
    image: postgres:15-alpine
    container_name: lfa-postgres-primary
    environment:
      POSTGRES_DB: lfa_production
      POSTGRES_USER: lfa_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_REPLICATION_USER: replicator
      POSTGRES_REPLICATION_PASSWORD: ${REPLICATION_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./postgresql.conf:/etc/postgresql/postgresql.conf
      - ./pg_hba.conf:/etc/postgresql/pg_hba.conf
    ports:
      - "5432:5432"
    command: postgres -c config_file=/etc/postgresql/postgresql.conf
    restart: unless-stopped

  postgres-replica1:
    image: postgres:15-alpine
    container_name: lfa-postgres-replica1
    environment:
      PGUSER: replicator
      POSTGRES_PASSWORD: ${REPLICATION_PASSWORD}
      POSTGRES_MASTER_SERVICE: postgres-primary
    volumes:
      - postgres_replica1_data:/var/lib/postgresql/data
    ports:
      - "5433:5432"
    depends_on:
      - postgres-primary
    restart: unless-stopped

volumes:
  postgres_data:
  postgres_replica1_data:
```

#### PostgreSQL Configuration
```ini
# postgresql.conf
# Basic Settings
listen_addresses = '*'
port = 5432
max_connections = 200
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB

# Replication Settings
wal_level = replica
max_wal_senders = 3
max_replication_slots = 3
hot_standby = on

# Performance Settings
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200

# Logging Settings
log_destination = 'stderr'
logging_collector = on
log_directory = 'log'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_min_duration_statement = 1000
log_checkpoints = on
log_connections = on
log_disconnections = on
log_lock_waits = on
log_statement = 'all'
```

### 2. Database Initialization
```bash
# Start PostgreSQL
docker-compose -f docker-compose.db.yml up -d postgres-primary

# Wait for database to start
sleep 10

# Create database and user
docker exec -it lfa-postgres-primary psql -U postgres -c "
  CREATE USER lfa_user WITH PASSWORD '${DB_PASSWORD}';
  CREATE DATABASE lfa_production OWNER lfa_user;
  GRANT ALL PRIVILEGES ON DATABASE lfa_production TO lfa_user;
"

# Run database migrations
cd /home/lfa/app/backend
npm run migrate:up
```

### 3. Redis Setup
```yaml
# docker-compose.redis.yml
version: '3.8'
services:
  redis-master:
    image: redis:7-alpine
    container_name: lfa-redis-master
    command: redis-server --requirepass ${REDIS_PASSWORD} --appendonly yes
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    restart: unless-stopped

  redis-slave:
    image: redis:7-alpine
    container_name: lfa-redis-slave
    command: redis-server --requirepass ${REDIS_PASSWORD} --slaveof redis-master 6379 --masterauth ${REDIS_PASSWORD}
    volumes:
      - redis_slave_data:/data
    ports:
      - "6380:6379"
    depends_on:
      - redis-master
    restart: unless-stopped

volumes:
  redis_data:
  redis_slave_data:
```

## Application Deployment

### 1. Environment Configuration

#### Production Environment Variables
```bash
# .env.production
NODE_ENV=production
PORT=5001

# Database Configuration
DATABASE_URL=postgresql://lfa_user:${DB_PASSWORD}@postgres-primary:5432/lfa_production
DATABASE_REPLICA_URL=postgresql://lfa_user:${DB_PASSWORD}@postgres-replica1:5432/lfa_production

# Redis Configuration
REDIS_URL=redis://:${REDIS_PASSWORD}@redis-master:6379

# JWT Configuration
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# AWS Configuration
AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
AWS_REGION=us-east-1
AWS_S3_BUCKET=lfa-production-files

# Email Configuration
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASS=${SENDGRID_API_KEY}
EMAIL_FROM=noreply@lionfootballacademy.com

# Stripe Configuration
STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET}

# Monitoring Configuration
SENTRY_DSN=${SENTRY_DSN}
GA_MEASUREMENT_ID=${GA_MEASUREMENT_ID}

# Security Configuration
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# File Upload Configuration
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,application/pdf

# Backup Configuration
BACKUP_ENCRYPTION_KEY=${BACKUP_ENCRYPTION_KEY}
BACKUP_S3_BUCKET=lfa-production-backups
```

### 2. Docker Configuration

#### Main Application Docker Compose
```yaml
# docker-compose.yml
version: '3.8'

services:
  # Frontend Service
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.production
    container_name: lfa-frontend
    volumes:
      - frontend_build:/app/build
    restart: unless-stopped

  # Backend Service
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.production
    container_name: lfa-backend
    env_file:
      - .env.production
    volumes:
      - uploads:/app/uploads
      - logs:/app/logs
    depends_on:
      - postgres-primary
      - redis-master
    ports:
      - "5001:5001"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5001/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # NGINX Load Balancer
  nginx:
    image: nginx:alpine
    container_name: lfa-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/sites-available:/etc/nginx/sites-available
      - ./ssl:/etc/nginx/ssl
      - frontend_build:/var/www/html
      - logs:/var/log/nginx
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  frontend_build:
  uploads:
  logs:

networks:
  default:
    external:
      name: lfa-network
```

#### Backend Dockerfile
```dockerfile
# backend/Dockerfile.production
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

FROM node:18-alpine AS runtime

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S lfa -u 1001

# Install security updates
RUN apk update && apk upgrade && \
    apk add --no-cache tini

WORKDIR /app

# Copy node_modules from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy application code
COPY --chown=lfa:nodejs . .

# Create necessary directories
RUN mkdir -p uploads logs && \
    chown -R lfa:nodejs uploads logs

# Switch to non-root user
USER lfa

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

EXPOSE 5001

# Use tini for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["npm", "start"]
```

#### Frontend Dockerfile
```dockerfile
# frontend/Dockerfile.production
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine AS runtime

# Copy built files
COPY --from=builder /app/build /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Add security headers
RUN echo 'add_header X-Frame-Options "SAMEORIGIN" always;' >> /etc/nginx/conf.d/security.conf && \
    echo 'add_header X-Content-Type-Options "nosniff" always;' >> /etc/nginx/conf.d/security.conf && \
    echo 'add_header X-XSS-Protection "1; mode=block" always;' >> /etc/nginx/conf.d/security.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### 3. Build and Deploy Script
```bash
#!/bin/bash
# deploy.sh

set -e

ENVIRONMENT=${1:-production}
VERSION=${2:-latest}

echo "Deploying Lion Football Academy - Environment: $ENVIRONMENT, Version: $VERSION"

# Load environment variables
if [ -f ".env.${ENVIRONMENT}" ]; then
    export $(cat .env.${ENVIRONMENT} | xargs)
fi

# Pull latest code
git pull origin main

# Build and tag Docker images
echo "Building Docker images..."
docker-compose build --no-cache

# Tag images with version
docker tag lfa-backend:latest lfa-backend:$VERSION
docker tag lfa-frontend:latest lfa-frontend:$VERSION

# Create network if it doesn't exist
docker network create lfa-network 2>/dev/null || true

# Start infrastructure services
echo "Starting infrastructure services..."
docker-compose -f docker-compose.db.yml up -d
docker-compose -f docker-compose.redis.yml up -d

# Wait for services to be ready
echo "Waiting for services to be ready..."
sleep 30

# Run database migrations
echo "Running database migrations..."
docker-compose exec -T backend npm run migrate:up

# Start application services
echo "Starting application services..."
docker-compose up -d

# Health check
echo "Performing health check..."
sleep 10
curl -f http://localhost/health || exit 1

echo "Deployment completed successfully!"

# Clean up old images
docker image prune -f
```

## Infrastructure Configuration

### 1. NGINX Configuration

#### Main NGINX Configuration
```nginx
# nginx/nginx.conf
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging format
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for" '
                    'rt=$request_time uct="$upstream_connect_time" '
                    'uht="$upstream_header_time" urt="$upstream_response_time"';

    access_log /var/log/nginx/access.log main;

    # Performance settings
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 10M;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=5r/s;

    # Upstream backend servers
    upstream backend {
        least_conn;
        server backend:5001 max_fails=3 fail_timeout=30s;
        keepalive 32;
    }

    # Include site configurations
    include /etc/nginx/sites-available/*.conf;
}
```

#### Site Configuration
```nginx
# nginx/sites-available/lfa.conf
server {
    listen 80;
    server_name lionfootballacademy.com www.lionfootballacademy.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name lionfootballacademy.com www.lionfootballacademy.com;

    # SSL Configuration
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://api.stripe.com; frame-src 'self' https://js.stripe.com;" always;

    # Frontend static files
    location / {
        root /var/www/html;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # API endpoints
    location /api/ {
        # Rate limiting
        limit_req zone=api burst=20 nodelay;
        
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Login endpoint with stricter rate limiting
    location /api/auth/login {
        limit_req zone=login burst=5 nodelay;
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://backend;
        access_log off;
    }

    # File uploads
    location /uploads/ {
        alias /app/uploads/;
        expires 1y;
        add_header Cache-Control "public";
    }
}
```

### 2. Load Balancer Configuration

#### HAProxy Alternative
```bash
# haproxy.cfg
global
    daemon
    maxconn 4096
    log stdout len 65536 local0 debug

defaults
    mode http
    timeout connect 5000ms
    timeout client 50000ms
    timeout server 50000ms
    option httplog
    option dontlognull
    option redispatch
    retries 3

frontend lfa_frontend
    bind *:80
    bind *:443 ssl crt /etc/ssl/certs/lfa.pem
    redirect scheme https if !{ ssl_fc }
    
    # ACLs
    acl is_api path_beg /api/
    acl is_health path /health
    
    # Route to backends
    use_backend lfa_api if is_api
    use_backend lfa_api if is_health
    default_backend lfa_web

backend lfa_api
    balance roundrobin
    option httpchk GET /health
    server api1 backend1:5001 check
    server api2 backend2:5001 check
    server api3 backend3:5001 check

backend lfa_web
    balance roundrobin
    server web1 frontend1:80 check
    server web2 frontend2:80 check
```

### 3. Firewall Configuration

#### UFW Rules (Ubuntu)
```bash
# Reset firewall
sudo ufw --force reset

# Default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# SSH access
sudo ufw allow 22/tcp

# HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Database (restrict to app servers)
sudo ufw allow from 10.0.0.0/8 to any port 5432

# Redis (restrict to app servers)
sudo ufw allow from 10.0.0.0/8 to any port 6379

# Enable firewall
sudo ufw enable
```

## SSL/TLS Configuration

### 1. Let's Encrypt Certificate

#### Install Certbot
```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtain certificate
sudo certbot --nginx -d lionfootballacademy.com -d www.lionfootballacademy.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

#### Manual Certificate Setup
```bash
# Generate certificate manually
sudo certbot certonly --webroot \
  -w /var/www/html \
  -d lionfootballacademy.com \
  -d www.lionfootballacademy.com \
  --email admin@lionfootballacademy.com \
  --agree-tos \
  --no-eff-email

# Copy certificates to Docker volume
sudo cp /etc/letsencrypt/live/lionfootballacademy.com/fullchain.pem /home/lfa/ssl/cert.pem
sudo cp /etc/letsencrypt/live/lionfootballacademy.com/privkey.pem /home/lfa/ssl/key.pem
sudo chown lfa:lfa /home/lfa/ssl/*
```

### 2. SSL Configuration Testing
```bash
# Test SSL configuration
curl -I https://lionfootballacademy.com

# SSL Labs test
curl -s "https://api.ssllabs.com/api/v3/analyze?host=lionfootballacademy.com"

# Check certificate expiry
openssl s_client -connect lionfootballacademy.com:443 -servername lionfootballacademy.com 2>/dev/null | openssl x509 -noout -dates
```

## Monitoring Setup

### 1. Application Monitoring

#### Docker Compose Monitoring Stack
```yaml
# docker-compose.monitoring.yml
version: '3.8'

services:
  # Application monitoring services are already built into the app
  # This extends with external monitoring tools
  
  grafana:
    image: grafana/grafana:latest
    container_name: lfa-grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD}
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./grafana/datasources:/etc/grafana/provisioning/datasources
    ports:
      - "3000:3000"
    restart: unless-stopped

  prometheus:
    image: prom/prometheus:latest
    container_name: lfa-prometheus
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    ports:
      - "9090:9090"
    restart: unless-stopped

volumes:
  grafana_data:
  prometheus_data:
```

#### Prometheus Configuration
```yaml
# prometheus/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "rules/*.yml"

scrape_configs:
  - job_name: 'lfa-backend'
    static_configs:
      - targets: ['backend:5001']
    metrics_path: '/metrics'
    scrape_interval: 30s

  - job_name: 'nginx'
    static_configs:
      - targets: ['nginx:9113']

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093
```

### 2. Log Management

#### Centralized Logging with ELK Stack
```yaml
# docker-compose.elk.yml
version: '3.8'

services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.5.0
    container_name: lfa-elasticsearch
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
      - xpack.security.enabled=false
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data
    ports:
      - "9200:9200"

  logstash:
    image: docker.elastic.co/logstash/logstash:8.5.0
    container_name: lfa-logstash
    volumes:
      - ./logstash/config:/usr/share/logstash/pipeline
      - logs:/app/logs:ro
    ports:
      - "5044:5044"
    depends_on:
      - elasticsearch

  kibana:
    image: docker.elastic.co/kibana/kibana:8.5.0
    container_name: lfa-kibana
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    ports:
      - "5601:5601"
    depends_on:
      - elasticsearch

volumes:
  elasticsearch_data:
```

## Backup Configuration

### 1. Automated Backup System

#### Backup Script
```bash
#!/bin/bash
# backup_system.sh

set -e

BACKUP_DIR="/home/lfa/backups"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

echo "Starting backup process: $DATE"

# Create backup directory
mkdir -p $BACKUP_DIR

# Database backup
echo "Backing up database..."
docker exec lfa-postgres-primary pg_dump -U lfa_user -d lfa_production | gzip > $BACKUP_DIR/database_$DATE.sql.gz

# Application files backup
echo "Backing up application files..."
tar -czf $BACKUP_DIR/app_files_$DATE.tar.gz -C /home/lfa/app .

# Uploads backup
echo "Backing up user uploads..."
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz -C /home/lfa/app uploads/

# Configuration backup
echo "Backing up configuration..."
tar -czf $BACKUP_DIR/config_$DATE.tar.gz -C /home/lfa .env.production nginx/ ssl/

# Upload to S3
if [ -n "$AWS_ACCESS_KEY_ID" ]; then
    echo "Uploading backups to S3..."
    aws s3 sync $BACKUP_DIR s3://$BACKUP_S3_BUCKET/backups/$(date +%Y/%m/)
fi

# Clean up old local backups
find $BACKUP_DIR -name "*.gz" -mtime +$RETENTION_DAYS -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup process completed successfully"
```

#### Backup Cron Job
```bash
# Add to crontab
sudo crontab -e

# Daily backup at 2 AM
0 2 * * * /home/lfa/scripts/backup_system.sh >> /home/lfa/logs/backup.log 2>&1

# Weekly system backup (full)
0 3 * * 0 /home/lfa/scripts/full_backup.sh >> /home/lfa/logs/backup.log 2>&1
```

### 2. Disaster Recovery

#### Recovery Script
```bash
#!/bin/bash
# restore_system.sh

BACKUP_DATE=$1
BACKUP_DIR="/home/lfa/backups"

if [ -z "$BACKUP_DATE" ]; then
    echo "Usage: $0 <backup_date>"
    echo "Available backups:"
    ls -1 $BACKUP_DIR/database_*.sql.gz | sed 's/.*database_\(.*\)\.sql\.gz/\1/'
    exit 1
fi

echo "Restoring system from backup: $BACKUP_DATE"

# Stop application
docker-compose down

# Restore database
echo "Restoring database..."
gunzip -c $BACKUP_DIR/database_$BACKUP_DATE.sql.gz | docker exec -i lfa-postgres-primary psql -U lfa_user -d lfa_production

# Restore application files
echo "Restoring application files..."
tar -xzf $BACKUP_DIR/app_files_$BACKUP_DATE.tar.gz -C /home/lfa/app/

# Restore uploads
echo "Restoring uploads..."
tar -xzf $BACKUP_DIR/uploads_$BACKUP_DATE.tar.gz -C /home/lfa/app/

# Start application
docker-compose up -d

echo "System restore completed"
```

## CI/CD Pipeline

### 1. GitHub Actions Workflow

#### Production Deployment Workflow
```yaml
# .github/workflows/deploy-production.yml
name: Deploy to Production

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_DB: lfa_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
      
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: |
            frontend/package-lock.json
            backend/package-lock.json

      - name: Install backend dependencies
        run: |
          cd backend
          npm ci

      - name: Install frontend dependencies
        run: |
          cd frontend
          npm ci

      - name: Run backend tests
        run: |
          cd backend
          npm test
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/lfa_test
          REDIS_URL: redis://localhost:6379
          NODE_ENV: test

      - name: Run frontend tests
        run: |
          cd frontend
          npm test -- --coverage --watchAll=false

      - name: Build frontend
        run: |
          cd frontend
          npm run build

      - name: Security audit
        run: |
          cd backend && npm audit --audit-level moderate
          cd frontend && npm audit --audit-level moderate

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup SSH
        uses: webfactory/ssh-agent@v0.7.0
        with:
          ssh-private-key: ${{ secrets.SSH_PRIVATE_KEY }}

      - name: Deploy to production
        run: |
          ssh -o StrictHostKeyChecking=no ${{ secrets.PRODUCTION_USER }}@${{ secrets.PRODUCTION_HOST }} '
            cd /home/lfa/app &&
            git pull origin main &&
            ./scripts/deploy.sh production
          '

      - name: Verify deployment
        run: |
          sleep 30
          curl -f https://lionfootballacademy.com/health || exit 1

      - name: Notify deployment
        if: always()
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          channel: '#deployments'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### 2. Deployment Scripts

#### Blue-Green Deployment
```bash
#!/bin/bash
# blue_green_deploy.sh

set -e

CURRENT_ENV=$(docker ps --format "table {{.Names}}" | grep lfa-backend | grep -o -E '(blue|green)')
NEW_ENV=$([ "$CURRENT_ENV" = "blue" ] && echo "green" || echo "blue")

echo "Current environment: $CURRENT_ENV"
echo "Deploying to: $NEW_ENV"

# Build new environment
docker-compose -f docker-compose.$NEW_ENV.yml build
docker-compose -f docker-compose.$NEW_ENV.yml up -d

# Health check new environment
echo "Waiting for new environment to be ready..."
sleep 30

for i in {1..10}; do
    if curl -f http://localhost:808$([[ "$NEW_ENV" = "green" ]] && echo 1 || echo 0)/health; then
        echo "New environment is healthy"
        break
    fi
    if [ $i -eq 10 ]; then
        echo "New environment failed health check"
        docker-compose -f docker-compose.$NEW_ENV.yml down
        exit 1
    fi
    sleep 10
done

# Switch traffic
echo "Switching traffic to $NEW_ENV environment"
envsubst < nginx/nginx.$NEW_ENV.conf.template > nginx/nginx.conf
docker-compose exec nginx nginx -s reload

# Verify switch
sleep 10
curl -f https://lionfootballacademy.com/health || {
    echo "Traffic switch failed, rolling back"
    envsubst < nginx/nginx.$CURRENT_ENV.conf.template > nginx/nginx.conf
    docker-compose exec nginx nginx -s reload
    exit 1
}

# Stop old environment
echo "Stopping $CURRENT_ENV environment"
docker-compose -f docker-compose.$CURRENT_ENV.yml down

echo "Deployment completed successfully"
```

## Troubleshooting

### 1. Common Issues

#### Application Won't Start
```bash
# Check container logs
docker-compose logs backend
docker-compose logs frontend
docker-compose logs nginx

# Check container status
docker-compose ps

# Check resource usage
docker stats

# Check disk space
df -h

# Check memory usage
free -m
```

#### Database Connection Issues
```bash
# Test database connection
docker exec -it lfa-postgres-primary psql -U lfa_user -d lfa_production -c "SELECT version();"

# Check database logs
docker logs lfa-postgres-primary

# Check connection pool
docker exec -it lfa-backend npm run db:pool:status
```

#### Performance Issues
```bash
# Check NGINX access logs for slow requests
tail -f /home/lfa/logs/nginx/access.log | grep -E "rt=[0-9]+\.[0-9]+"

# Check database slow queries
docker exec -it lfa-postgres-primary psql -U lfa_user -d lfa_production -c "
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;"

# Check Redis performance
docker exec -it lfa-redis-master redis-cli info stats
```

### 2. Health Checks

#### System Health Check Script
```bash
#!/bin/bash
# health_check.sh

echo "=== Lion Football Academy Health Check ==="

# Check services
echo "Checking services..."
docker-compose ps

# Check application health
echo "Checking application health..."
curl -s http://localhost/health | jq '.'

# Check database
echo "Checking database..."
docker exec lfa-postgres-primary pg_isready -U lfa_user

# Check Redis
echo "Checking Redis..."
docker exec lfa-redis-master redis-cli ping

# Check disk space
echo "Checking disk space..."
df -h | grep -E "(/$|/home)"

# Check memory
echo "Checking memory..."
free -m

# Check SSL certificate
echo "Checking SSL certificate..."
openssl s_client -connect lionfootballacademy.com:443 -servername lionfootballacademy.com 2>/dev/null | openssl x509 -noout -dates

echo "Health check completed"
```

### 3. Performance Tuning

#### PostgreSQL Performance Tuning
```sql
-- Check slow queries
SELECT query, mean_time, calls, total_time
FROM pg_stat_statements
WHERE mean_time > 1000
ORDER BY mean_time DESC
LIMIT 20;

-- Check index usage
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE schemaname = 'public'
ORDER BY n_distinct DESC;

-- Check connection status
SELECT state, count(*)
FROM pg_stat_activity
GROUP BY state;
```

#### NGINX Performance Tuning
```nginx
# Add to nginx.conf for better performance
worker_processes auto;
worker_cpu_affinity auto;
worker_rlimit_nofile 65535;

events {
    worker_connections 4096;
    use epoll;
    multi_accept on;
}

http {
    # Connection keep-alive
    keepalive_timeout 30;
    keepalive_requests 100;
    
    # File caching
    open_file_cache max=1000 inactive=20s;
    open_file_cache_valid 30s;
    open_file_cache_min_uses 2;
    open_file_cache_errors on;
}
```

This deployment guide provides comprehensive instructions for setting up and maintaining the Lion Football Academy system in production. Follow the steps sequentially and adapt configurations based on your specific infrastructure requirements.