# Lion Football Academy - Update Procedures

## Table of Contents
1. [Update Overview](#update-overview)
2. [Pre-Update Procedures](#pre-update-procedures)
3. [Application Updates](#application-updates)
4. [Database Updates](#database-updates)
5. [System Updates](#system-updates)
6. [Security Updates](#security-updates)
7. [Rollback Procedures](#rollback-procedures)
8. [Testing and Validation](#testing-and-validation)
9. [Post-Update Procedures](#post-update-procedures)
10. [Emergency Updates](#emergency-updates)

## Update Overview

The Lion Football Academy system follows a structured update process to ensure minimal downtime, data integrity, and system stability. All updates are thoroughly tested and can be rolled back if necessary.

### Update Types
- **Security Updates**: Critical security patches (immediate deployment)
- **Bug Fixes**: Application fixes and minor improvements (weekly)
- **Feature Updates**: New functionality and enhancements (monthly)
- **System Updates**: Infrastructure and dependency updates (quarterly)
- **Major Releases**: Significant system changes (bi-annually)

### Update Schedule
- **Security Updates**: As needed (within 24 hours of release)
- **Regular Updates**: Tuesdays at 2:00 AM UTC (maintenance window)
- **Emergency Updates**: Immediately upon critical issue identification
- **Rollback Window**: 4 hours after deployment for monitoring

### Update Environments
- **Development**: Feature development and initial testing
- **Staging**: Pre-production testing and validation
- **Production**: Live system serving users

## Pre-Update Procedures

### Update Planning

#### 1. Update Assessment
```bash
#!/bin/bash
# /opt/lfa/scripts/assess_update.sh

UPDATE_TYPE=$1
UPDATE_VERSION=$2

echo "Assessing update: $UPDATE_TYPE v$UPDATE_VERSION"

# Check current system version
CURRENT_VERSION=$(grep "version" /opt/lfa/app/package.json | cut -d'"' -f4)
echo "Current version: $CURRENT_VERSION"

# Check dependencies
echo "Checking dependencies..."
npm audit
npm outdated

# Check for breaking changes
echo "Reviewing changelog for breaking changes..."
curl -s "https://api.github.com/repos/lionfootballacademy/lfa_app/releases/latest" | \
  jq -r '.body' | grep -i "breaking\|migration\|deprecated"

# Estimate downtime
case $UPDATE_TYPE in
  "security")
    echo "Estimated downtime: 5-10 minutes"
    ;;
  "bugfix")
    echo "Estimated downtime: 10-15 minutes"
    ;;
  "feature")
    echo "Estimated downtime: 15-30 minutes"
    ;;
  "major")
    echo "Estimated downtime: 30-60 minutes"
    ;;
esac
```

#### 2. Backup Creation
```bash
#!/bin/bash
# /opt/lfa/scripts/pre_update_backup.sh

UPDATE_VERSION=$1
BACKUP_DIR="/backup/pre_update"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "Creating pre-update backup for version: $UPDATE_VERSION"

# Create backup directory
mkdir -p "$BACKUP_DIR/$UPDATE_VERSION"

# Database backup
echo "Backing up database..."
pg_dump -h localhost -U lfa_user -d lfa_production \
  --format=custom --compress=9 \
  --file="$BACKUP_DIR/$UPDATE_VERSION/database_$TIMESTAMP.dump"

# Application backup
echo "Backing up application..."
tar -czf "$BACKUP_DIR/$UPDATE_VERSION/application_$TIMESTAMP.tar.gz" \
  -C /opt/lfa/app \
  --exclude="node_modules" \
  --exclude="logs" \
  --exclude="tmp" \
  .

# Configuration backup
echo "Backing up configuration..."
tar -czf "$BACKUP_DIR/$UPDATE_VERSION/config_$TIMESTAMP.tar.gz" \
  -C /etc/lfa \
  .

# Upload to S3
echo "Uploading backup to S3..."
aws s3 sync "$BACKUP_DIR/$UPDATE_VERSION" \
  "s3://lfa-backups/pre_update/$UPDATE_VERSION/"

echo "Pre-update backup completed"
```

#### 3. Notification System
```bash
#!/bin/bash
# /opt/lfa/scripts/notify_maintenance.sh

MAINTENANCE_START=$1
MAINTENANCE_END=$2
UPDATE_TYPE=$3

# Send notification to administrators
cat <<EOF | mail -s "Maintenance Window Scheduled" admin@lionfootballacademy.com
Maintenance Window Details:
- Start: $MAINTENANCE_START
- End: $MAINTENANCE_END
- Type: $UPDATE_TYPE
- Expected Impact: Service interruption

Please ensure all critical operations are completed before the maintenance window.
EOF

# Update system status page
curl -X POST "https://status.lionfootballacademy.com/api/incidents" \
  -H "Authorization: Bearer $STATUS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Scheduled Maintenance",
    "status": "scheduled",
    "message": "System maintenance scheduled for '"$MAINTENANCE_START"'",
    "components": ["api", "web", "mobile"]
  }'

echo "Maintenance notifications sent"
```

### Pre-Update Checklist

#### System Health Check
```bash
#!/bin/bash
# /opt/lfa/scripts/pre_update_health_check.sh

echo "Performing pre-update health check..."

# Check system resources
echo "Checking system resources..."
df -h
free -h
uptime

# Check application status
echo "Checking application status..."
systemctl status lfa-app
systemctl status nginx
systemctl status postgresql
systemctl status redis

# Check recent errors
echo "Checking recent errors..."
journalctl -u lfa-app --since "1 hour ago" --no-pager | grep -i error

# Check database connections
echo "Checking database connections..."
psql -h localhost -U lfa_user -d lfa_production -c "SELECT COUNT(*) FROM pg_stat_activity;"

# Check external services
echo "Checking external services..."
curl -s https://api.stripe.com/v1/charges -u $STRIPE_SECRET_KEY: | jq .
curl -s https://api.sendgrid.com/v3/user/profile -H "Authorization: Bearer $SENDGRID_API_KEY" | jq .

# Check SSL certificates
echo "Checking SSL certificates..."
echo | openssl s_client -connect lionfootballacademy.com:443 2>/dev/null | \
  openssl x509 -noout -dates

echo "Pre-update health check completed"
```

## Application Updates

### Frontend Updates

#### React Application Update
```bash
#!/bin/bash
# /opt/lfa/scripts/update_frontend.sh

NEW_VERSION=$1
CURRENT_DIR="/opt/lfa/app/frontend"
BACKUP_DIR="/backup/frontend_$(date +%Y%m%d_%H%M%S)"

echo "Updating frontend to version: $NEW_VERSION"

# Stop nginx
systemctl stop nginx

# Backup current version
echo "Backing up current frontend..."
cp -r "$CURRENT_DIR" "$BACKUP_DIR"

# Fetch new version
echo "Fetching new version..."
cd "$CURRENT_DIR"
git fetch origin
git checkout "v$NEW_VERSION"

# Install dependencies
echo "Installing dependencies..."
npm ci --production

# Build application
echo "Building application..."
npm run build

# Run tests
echo "Running tests..."
npm test

# Update version file
echo "$NEW_VERSION" > "$CURRENT_DIR/VERSION"

# Start nginx
systemctl start nginx

# Verify deployment
echo "Verifying deployment..."
curl -f http://localhost/ || {
  echo "Frontend deployment failed, rolling back..."
  systemctl stop nginx
  rm -rf "$CURRENT_DIR"
  mv "$BACKUP_DIR" "$CURRENT_DIR"
  systemctl start nginx
  exit 1
}

echo "Frontend update completed successfully"
```

#### Progressive Web App Update
```bash
#!/bin/bash
# /opt/lfa/scripts/update_pwa.sh

NEW_VERSION=$1
PWA_DIR="/opt/lfa/app/pwa"

echo "Updating PWA to version: $NEW_VERSION"

# Update service worker
echo "Updating service worker..."
sed -i "s/const CACHE_VERSION = .*/const CACHE_VERSION = '$NEW_VERSION';/" \
  "$PWA_DIR/sw.js"

# Update manifest
echo "Updating manifest..."
jq ".version = \"$NEW_VERSION\"" "$PWA_DIR/manifest.json" > \
  "$PWA_DIR/manifest.json.tmp" && \
  mv "$PWA_DIR/manifest.json.tmp" "$PWA_DIR/manifest.json"

# Clear CDN cache
echo "Clearing CDN cache..."
curl -X POST "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/purge_cache" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"purge_everything": true}'

echo "PWA update completed"
```

### Backend Updates

#### API Application Update
```bash
#!/bin/bash
# /opt/lfa/scripts/update_backend.sh

NEW_VERSION=$1
APP_DIR="/opt/lfa/app/backend"
BACKUP_DIR="/backup/backend_$(date +%Y%m%d_%H%M%S)"

echo "Updating backend to version: $NEW_VERSION"

# Stop application
systemctl stop lfa-app

# Backup current version
echo "Backing up current backend..."
cp -r "$APP_DIR" "$BACKUP_DIR"

# Fetch new version
echo "Fetching new version..."
cd "$APP_DIR"
git fetch origin
git checkout "v$NEW_VERSION"

# Install dependencies
echo "Installing dependencies..."
npm ci --production

# Run database migrations
echo "Running database migrations..."
npm run migrate

# Run tests
echo "Running tests..."
npm test

# Update version file
echo "$NEW_VERSION" > "$APP_DIR/VERSION"

# Start application
systemctl start lfa-app

# Health check
echo "Performing health check..."
sleep 10
curl -f http://localhost:3000/health || {
  echo "Backend deployment failed, rolling back..."
  systemctl stop lfa-app
  rm -rf "$APP_DIR"
  mv "$BACKUP_DIR" "$APP_DIR"
  systemctl start lfa-app
  exit 1
}

echo "Backend update completed successfully"
```

#### API Documentation Update
```bash
#!/bin/bash
# /opt/lfa/scripts/update_api_docs.sh

NEW_VERSION=$1
DOCS_DIR="/opt/lfa/docs/api"

echo "Updating API documentation to version: $NEW_VERSION"

# Generate new documentation
echo "Generating API documentation..."
cd /opt/lfa/app/backend
npm run docs:generate

# Update documentation files
echo "Updating documentation files..."
cp -r ./docs/api/* "$DOCS_DIR/"

# Update version in documentation
sed -i "s/version: .*/version: '$NEW_VERSION'/" "$DOCS_DIR/swagger.yaml"

# Restart documentation server
systemctl restart lfa-docs

echo "API documentation update completed"
```

## Database Updates

### Schema Migrations

#### Database Migration Runner
```bash
#!/bin/bash
# /opt/lfa/scripts/run_migrations.sh

TARGET_VERSION=$1
MIGRATION_DIR="/opt/lfa/app/backend/migrations"
BACKUP_DIR="/backup/migrations"

echo "Running database migrations to version: $TARGET_VERSION"

# Create migration backup
echo "Creating migration backup..."
pg_dump -h localhost -U lfa_user -d lfa_production \
  --format=custom --compress=9 \
  --file="$BACKUP_DIR/pre_migration_$(date +%Y%m%d_%H%M%S).dump"

# Run migrations
echo "Running migrations..."
cd /opt/lfa/app/backend
npm run migrate:up

# Verify migration
echo "Verifying migration..."
CURRENT_VERSION=$(psql -h localhost -U lfa_user -d lfa_production -t -c \
  "SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1;" | tr -d ' ')

if [ "$CURRENT_VERSION" = "$TARGET_VERSION" ]; then
  echo "Migration completed successfully"
else
  echo "Migration failed. Current version: $CURRENT_VERSION, Target: $TARGET_VERSION"
  exit 1
fi

# Update database statistics
echo "Updating database statistics..."
psql -h localhost -U lfa_user -d lfa_production -c "ANALYZE;"

echo "Database migration completed"
```

#### Migration Rollback
```bash
#!/bin/bash
# /opt/lfa/scripts/rollback_migration.sh

ROLLBACK_VERSION=$1
MIGRATION_DIR="/opt/lfa/app/backend/migrations"

echo "Rolling back database migration to version: $ROLLBACK_VERSION"

# Stop application
systemctl stop lfa-app

# Run rollback
echo "Running migration rollback..."
cd /opt/lfa/app/backend
npm run migrate:down -- --to="$ROLLBACK_VERSION"

# Verify rollback
echo "Verifying rollback..."
CURRENT_VERSION=$(psql -h localhost -U lfa_user -d lfa_production -t -c \
  "SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1;" | tr -d ' ')

if [ "$CURRENT_VERSION" = "$ROLLBACK_VERSION" ]; then
  echo "Rollback completed successfully"
else
  echo "Rollback failed. Current version: $CURRENT_VERSION"
  exit 1
fi

# Start application
systemctl start lfa-app

echo "Database rollback completed"
```

### Data Updates

#### Data Migration Script
```bash
#!/bin/bash
# /opt/lfa/scripts/data_migration.sh

MIGRATION_TYPE=$1
MIGRATION_FILE="/opt/lfa/app/backend/data-migrations/$MIGRATION_TYPE.sql"

echo "Running data migration: $MIGRATION_TYPE"

# Validate migration file
if [ ! -f "$MIGRATION_FILE" ]; then
  echo "Migration file not found: $MIGRATION_FILE"
  exit 1
fi

# Create data backup
echo "Creating data backup..."
pg_dump -h localhost -U lfa_user -d lfa_production \
  --format=custom --compress=9 \
  --file="/backup/data_migration_$(date +%Y%m%d_%H%M%S).dump"

# Run data migration
echo "Running data migration..."
psql -h localhost -U lfa_user -d lfa_production -f "$MIGRATION_FILE"

# Verify migration
echo "Verifying data migration..."
VERIFICATION_SCRIPT="/opt/lfa/app/backend/data-migrations/verify_$MIGRATION_TYPE.sql"
if [ -f "$VERIFICATION_SCRIPT" ]; then
  psql -h localhost -U lfa_user -d lfa_production -f "$VERIFICATION_SCRIPT"
fi

echo "Data migration completed"
```

## System Updates

### Operating System Updates

#### Security Updates
```bash
#!/bin/bash
# /opt/lfa/scripts/system_security_updates.sh

echo "Applying security updates..."

# Update package lists
apt update

# List available security updates
apt list --upgradable | grep -i security

# Apply security updates
apt upgrade -y --with-new-pkgs

# Check if reboot is required
if [ -f /var/run/reboot-required ]; then
  echo "System reboot required after security updates"
  
  # Schedule reboot during maintenance window
  echo "Scheduling system reboot..."
  shutdown -r +5 "System reboot for security updates in 5 minutes"
  
  # Notify administrators
  echo "System reboot scheduled for security updates" | \
    mail -s "Security Update Reboot" admin@lionfootballacademy.com
fi

echo "Security updates completed"
```

#### System Package Updates
```bash
#!/bin/bash
# /opt/lfa/scripts/system_package_updates.sh

echo "Updating system packages..."

# Update package lists
apt update

# Show available updates
apt list --upgradable

# Update packages
apt upgrade -y

# Remove unnecessary packages
apt autoremove -y

# Clean package cache
apt autoclean

# Update snap packages
snap refresh

echo "System package updates completed"
```

### Dependency Updates

#### Node.js Dependencies
```bash
#!/bin/bash
# /opt/lfa/scripts/update_node_dependencies.sh

APP_DIR="/opt/lfa/app/backend"
BACKUP_DIR="/backup/node_modules_$(date +%Y%m%d_%H%M%S)"

echo "Updating Node.js dependencies..."

cd "$APP_DIR"

# Backup current node_modules
echo "Backing up current dependencies..."
cp -r node_modules "$BACKUP_DIR"

# Check for security vulnerabilities
echo "Checking for security vulnerabilities..."
npm audit

# Update dependencies
echo "Updating dependencies..."
npm update

# Run security audit fix
echo "Fixing security vulnerabilities..."
npm audit fix

# Verify application still works
echo "Verifying application..."
npm test

if [ $? -eq 0 ]; then
  echo "Dependency update completed successfully"
  rm -rf "$BACKUP_DIR"
else
  echo "Dependency update failed, rolling back..."
  rm -rf node_modules
  mv "$BACKUP_DIR" node_modules
  exit 1
fi
```

## Security Updates

### SSL Certificate Updates

#### Let's Encrypt Certificate Renewal
```bash
#!/bin/bash
# /opt/lfa/scripts/renew_ssl_certificates.sh

echo "Renewing SSL certificates..."

# Check certificate expiration
echo "Checking certificate expiration..."
certbot certificates

# Renew certificates
echo "Renewing certificates..."
certbot renew --quiet

# Reload nginx if certificates were renewed
if certbot renew --dry-run --quiet; then
  echo "Certificates renewed successfully"
  systemctl reload nginx
  
  # Verify certificate
  echo "Verifying certificate..."
  echo | openssl s_client -connect lionfootballacademy.com:443 2>/dev/null | \
    openssl x509 -noout -dates
else
  echo "Certificate renewal failed"
  exit 1
fi

echo "SSL certificate renewal completed"
```

### Security Patch Updates

#### Application Security Patches
```bash
#!/bin/bash
# /opt/lfa/scripts/apply_security_patches.sh

PATCH_VERSION=$1
PATCH_DIR="/opt/lfa/patches"

echo "Applying security patch: $PATCH_VERSION"

# Stop application
systemctl stop lfa-app

# Apply patch
echo "Applying patch..."
cd /opt/lfa/app/backend
git apply "$PATCH_DIR/$PATCH_VERSION.patch"

# Run security tests
echo "Running security tests..."
npm run test:security

# Restart application
systemctl start lfa-app

# Verify patch
echo "Verifying patch application..."
curl -f http://localhost:3000/health

echo "Security patch applied successfully"
```

## Rollback Procedures

### Application Rollback

#### Automated Rollback Script
```bash
#!/bin/bash
# /opt/lfa/scripts/rollback_application.sh

ROLLBACK_VERSION=$1
COMPONENT=$2

echo "Rolling back $COMPONENT to version: $ROLLBACK_VERSION"

case $COMPONENT in
  "frontend")
    systemctl stop nginx
    cd /opt/lfa/app/frontend
    git checkout "v$ROLLBACK_VERSION"
    npm ci --production
    npm run build
    systemctl start nginx
    ;;
  "backend")
    systemctl stop lfa-app
    cd /opt/lfa/app/backend
    git checkout "v$ROLLBACK_VERSION"
    npm ci --production
    systemctl start lfa-app
    ;;
  "database")
    systemctl stop lfa-app
    BACKUP_FILE="/backup/pre_update/$ROLLBACK_VERSION/database_*.dump"
    dropdb lfa_production
    createdb lfa_production
    pg_restore -d lfa_production "$BACKUP_FILE"
    systemctl start lfa-app
    ;;
esac

echo "Rollback completed for $COMPONENT"
```

### Database Rollback

#### Point-in-Time Recovery
```bash
#!/bin/bash
# /opt/lfa/scripts/pitr_rollback.sh

RECOVERY_TIME=$1
BASE_BACKUP="/backup/basebackup/latest"
WAL_ARCHIVE="/backup/wal"

echo "Performing point-in-time recovery to: $RECOVERY_TIME"

# Stop application and database
systemctl stop lfa-app
systemctl stop postgresql

# Backup current data
mv /var/lib/postgresql/data /var/lib/postgresql/data.backup

# Restore base backup
echo "Restoring base backup..."
tar -xzf "$BASE_BACKUP/base.tar.gz" -C /var/lib/postgresql/data

# Configure recovery
cat > /var/lib/postgresql/data/recovery.conf << EOF
standby_mode = 'off'
restore_command = 'cp $WAL_ARCHIVE/%f %p'
recovery_target_time = '$RECOVERY_TIME'
EOF

# Start database in recovery mode
systemctl start postgresql

# Wait for recovery to complete
echo "Waiting for recovery to complete..."
while [ ! -f /var/lib/postgresql/data/recovery.done ]; do
  sleep 5
done

# Start application
systemctl start lfa-app

echo "Point-in-time recovery completed"
```

## Testing and Validation

### Automated Testing

#### Post-Update Test Suite
```bash
#!/bin/bash
# /opt/lfa/scripts/post_update_tests.sh

echo "Running post-update test suite..."

# Frontend tests
echo "Running frontend tests..."
cd /opt/lfa/app/frontend
npm test

# Backend tests
echo "Running backend tests..."
cd /opt/lfa/app/backend
npm test

# Integration tests
echo "Running integration tests..."
npm run test:integration

# Database integrity tests
echo "Running database integrity tests..."
npm run test:database

# API tests
echo "Running API tests..."
npm run test:api

# Performance tests
echo "Running performance tests..."
npm run test:performance

echo "Post-update test suite completed"
```

#### Smoke Tests
```bash
#!/bin/bash
# /opt/lfa/scripts/smoke_tests.sh

echo "Running smoke tests..."

# Test application endpoints
echo "Testing application endpoints..."
curl -f http://localhost:3000/health || exit 1
curl -f http://localhost:3000/api/v1/status || exit 1

# Test database connectivity
echo "Testing database connectivity..."
psql -h localhost -U lfa_user -d lfa_production -c "SELECT 1;" || exit 1

# Test external services
echo "Testing external services..."
curl -f https://api.stripe.com/v1/charges -u $STRIPE_SECRET_KEY: || exit 1

# Test file uploads
echo "Testing file uploads..."
curl -f -X POST http://localhost:3000/api/v1/upload \
  -F "file=@/tmp/test.txt" \
  -H "Authorization: Bearer $TEST_TOKEN" || exit 1

echo "Smoke tests completed successfully"
```

## Post-Update Procedures

### System Validation

#### Comprehensive Health Check
```bash
#!/bin/bash
# /opt/lfa/scripts/post_update_health_check.sh

echo "Performing comprehensive health check..."

# Check system resources
echo "Checking system resources..."
df -h | grep -E "(Filesystem|/dev/)"
free -h
uptime

# Check application logs
echo "Checking application logs..."
journalctl -u lfa-app --since "10 minutes ago" --no-pager

# Check error rates
echo "Checking error rates..."
ERROR_COUNT=$(journalctl -u lfa-app --since "10 minutes ago" --no-pager | grep -c ERROR)
if [ $ERROR_COUNT -gt 5 ]; then
  echo "High error rate detected: $ERROR_COUNT errors"
  exit 1
fi

# Check response times
echo "Checking response times..."
RESPONSE_TIME=$(curl -o /dev/null -s -w "%{time_total}" http://localhost:3000/health)
if (( $(echo "$RESPONSE_TIME > 2.0" | bc -l) )); then
  echo "Slow response time: $RESPONSE_TIME seconds"
  exit 1
fi

echo "Health check completed successfully"
```

### Monitoring and Alerting

#### Update Monitoring Setup
```bash
#!/bin/bash
# /opt/lfa/scripts/setup_update_monitoring.sh

UPDATE_VERSION=$1

echo "Setting up post-update monitoring..."

# Create monitoring alerts
cat > /tmp/update_alerts.json << EOF
{
  "alerts": [
    {
      "name": "High Error Rate Post-Update",
      "condition": "error_rate > 0.05",
      "duration": "5m",
      "notification": "email:admin@lionfootballacademy.com"
    },
    {
      "name": "Slow Response Time Post-Update",
      "condition": "response_time_p95 > 2s",
      "duration": "5m",
      "notification": "email:admin@lionfootballacademy.com"
    }
  ]
}
EOF

# Apply monitoring configuration
curl -X POST http://localhost:9090/api/v1/alerts \
  -H "Content-Type: application/json" \
  -d @/tmp/update_alerts.json

echo "Post-update monitoring configured"
```

## Emergency Updates

### Emergency Patch Process

#### Critical Security Patch
```bash
#!/bin/bash
# /opt/lfa/scripts/emergency_patch.sh

PATCH_ID=$1
SEVERITY=$2

echo "Applying emergency patch: $PATCH_ID (Severity: $SEVERITY)"

# Immediate notification
echo "EMERGENCY: Applying critical security patch $PATCH_ID" | \
  mail -s "URGENT: Emergency Security Patch" admin@lionfootballacademy.com

# Minimal backup
echo "Creating minimal backup..."
pg_dump -h localhost -U lfa_user -d lfa_production \
  --format=custom --compress=9 \
  --file="/backup/emergency_$(date +%Y%m%d_%H%M%S).dump"

# Apply patch
echo "Applying emergency patch..."
cd /opt/lfa/app/backend
git apply "/opt/lfa/patches/emergency/$PATCH_ID.patch"

# Restart services
echo "Restarting services..."
systemctl restart lfa-app
systemctl restart nginx

# Verify patch
echo "Verifying patch..."
curl -f http://localhost:3000/health

# Update status page
curl -X POST "https://status.lionfootballacademy.com/api/incidents" \
  -H "Authorization: Bearer $STATUS_API_KEY" \
  -d '{"name": "Emergency Security Patch Applied", "status": "resolved"}'

echo "Emergency patch applied successfully"
```

### Hotfix Deployment

#### Rapid Hotfix Process
```bash
#!/bin/bash
# /opt/lfa/scripts/deploy_hotfix.sh

HOTFIX_BRANCH=$1
ISSUE_ID=$2

echo "Deploying hotfix: $HOTFIX_BRANCH for issue: $ISSUE_ID"

# Create hotfix backup
echo "Creating hotfix backup..."
cp -r /opt/lfa/app/backend "/backup/hotfix_$(date +%Y%m%d_%H%M%S)"

# Deploy hotfix
echo "Deploying hotfix..."
cd /opt/lfa/app/backend
git fetch origin
git checkout "$HOTFIX_BRANCH"

# Quick test
echo "Running quick tests..."
npm test -- --testNamePattern="critical"

# Deploy if tests pass
if [ $? -eq 0 ]; then
  systemctl restart lfa-app
  echo "Hotfix deployed successfully"
else
  echo "Hotfix tests failed, aborting deployment"
  git checkout main
  exit 1
fi

echo "Hotfix deployment completed"
```

---

*This update procedures document should be reviewed and updated with each major system release to ensure accuracy and completeness.*