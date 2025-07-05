# Lion Football Academy - Troubleshooting Guide

## Table of Contents
1. [Troubleshooting Overview](#troubleshooting-overview)
2. [Common Issues](#common-issues)
3. [System Performance Issues](#system-performance-issues)
4. [Database Problems](#database-problems)
5. [Application Errors](#application-errors)
6. [Network and Connectivity](#network-and-connectivity)
7. [User Access Issues](#user-access-issues)
8. [Payment System Problems](#payment-system-problems)
9. [Diagnostic Tools](#diagnostic-tools)
10. [Emergency Procedures](#emergency-procedures)

## Troubleshooting Overview

This comprehensive troubleshooting guide provides systematic approaches to identify, diagnose, and resolve issues in the Lion Football Academy system. Each issue includes symptoms, root cause analysis, and step-by-step resolution procedures.

### Troubleshooting Methodology
1. **Identify Symptoms**: Gather all available information about the issue
2. **Isolate the Problem**: Determine which system component is affected
3. **Analyze Root Cause**: Use diagnostic tools to identify the underlying cause
4. **Implement Solution**: Apply appropriate fixes with minimal system impact
5. **Verify Resolution**: Test to ensure the issue is fully resolved
6. **Document**: Record the issue and solution for future reference

### Severity Levels
- **Critical (P1)**: System down, data loss, security breach
- **High (P2)**: Major functionality broken, significant user impact
- **Medium (P3)**: Partial functionality affected, workaround available
- **Low (P4)**: Minor issues, cosmetic problems

### Support Contacts
- **24/7 Emergency**: +1-XXX-XXX-XXXX
- **Technical Support**: support@lionfootballacademy.com
- **Database Admin**: dba@lionfootballacademy.com
- **Security Team**: security@lionfootballacademy.com

## Common Issues

### Issue 1: Application Won't Start

#### Symptoms
- Service fails to start
- Error messages in logs
- HTTP 502/503 errors
- Users cannot access the application

#### Diagnostic Steps
```bash
# Check service status
systemctl status lfa-app

# Check application logs
journalctl -u lfa-app --since "10 minutes ago"

# Check port availability
netstat -tulpn | grep :3000

# Check disk space
df -h

# Check memory usage
free -h
```

#### Common Causes and Solutions

**Cause 1: Port Already in Use**
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Start the application
systemctl start lfa-app
```

**Cause 2: Database Connection Failed**
```bash
# Check database status
systemctl status postgresql

# Test database connection
psql -h localhost -U lfa_user -d lfa_production -c "SELECT 1;"

# Check database configuration
cat /opt/lfa/app/backend/.env | grep DATABASE
```

**Cause 3: Insufficient Memory**
```bash
# Check memory usage
free -h
ps aux --sort=-%mem | head -10

# Restart memory-intensive services
systemctl restart lfa-app
systemctl restart redis

# Clear cache if needed
redis-cli FLUSHALL
```

**Cause 4: Missing Dependencies**
```bash
# Check Node.js version
node --version

# Reinstall dependencies
cd /opt/lfa/app/backend
npm ci

# Check for missing environment variables
env | grep LFA_
```

### Issue 2: Slow Application Performance

#### Symptoms
- Page load times > 5 seconds
- API response times > 2 seconds
- User complaints about slowness
- High server resource usage

#### Diagnostic Steps
```bash
# Monitor system resources
top
htop
iotop

# Check application performance
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/api/v1/status

# Analyze database performance
psql -h localhost -U lfa_user -d lfa_production -c "
SELECT query, mean_time, calls, total_time 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;"

# Check network latency
ping -c 5 lionfootballacademy.com
traceroute lionfootballacademy.com
```

#### Performance Optimization Solutions

**Database Optimization**
```bash
# Analyze slow queries
psql -h localhost -U lfa_user -d lfa_production -c "
SELECT query, mean_time, calls
FROM pg_stat_statements 
WHERE mean_time > 1000 
ORDER BY mean_time DESC;"

# Update database statistics
psql -h localhost -U lfa_user -d lfa_production -c "ANALYZE;"

# Rebuild indexes if needed
psql -h localhost -U lfa_user -d lfa_production -c "REINDEX DATABASE lfa_production;"
```

**Application Optimization**
```bash
# Clear application cache
redis-cli FLUSHALL

# Restart application with optimizations
systemctl stop lfa-app
systemctl start lfa-app

# Monitor memory leaks
node --inspect /opt/lfa/app/backend/server.js &
```

**Server Optimization**
```bash
# Increase file descriptor limits
echo "* soft nofile 65536" >> /etc/security/limits.conf
echo "* hard nofile 65536" >> /etc/security/limits.conf

# Optimize kernel parameters
sysctl -w net.core.somaxconn=65535
sysctl -w net.ipv4.tcp_max_syn_backlog=65535
```

### Issue 3: Database Connection Errors

#### Symptoms
- "Connection refused" errors
- "Too many connections" errors
- Application timeouts
- Database unavailable messages

#### Diagnostic Steps
```bash
# Check PostgreSQL status
systemctl status postgresql

# Check connection count
psql -h localhost -U postgres -c "
SELECT count(*) as connections, 
       usename, 
       application_name 
FROM pg_stat_activity 
GROUP BY usename, application_name;"

# Check configuration
cat /var/lib/postgresql/data/postgresql.conf | grep -E "(max_connections|shared_buffers)"

# Check disk space
df -h /var/lib/postgresql/
```

#### Solutions

**Too Many Connections**
```bash
# Kill idle connections
psql -h localhost -U postgres -c "
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE state = 'idle' 
AND state_change < now() - interval '5 minutes';"

# Increase connection limit
sed -i 's/max_connections = .*/max_connections = 200/' \
  /var/lib/postgresql/data/postgresql.conf

# Restart PostgreSQL
systemctl restart postgresql
```

**Connection Pool Issues**
```bash
# Check application connection pool
grep -r "pool" /opt/lfa/app/backend/config/

# Restart application to reset pool
systemctl restart lfa-app

# Monitor pool status
psql -h localhost -U lfa_user -d lfa_production -c "
SELECT pid, usename, application_name, state, state_change 
FROM pg_stat_activity 
WHERE datname = 'lfa_production';"
```

## System Performance Issues

### High CPU Usage

#### Diagnosis
```bash
# Identify CPU-intensive processes
top -o %CPU
ps aux --sort=-%cpu | head -10

# Check system load
uptime
cat /proc/loadavg

# Monitor CPU usage over time
sar -u 1 60
```

#### Solutions
```bash
# If Node.js process is consuming high CPU
# Check for infinite loops or heavy processing
kill -USR1 <nodejs-pid>  # Generate heap dump

# Restart high-CPU services
systemctl restart lfa-app

# Scale horizontally if needed
# Start additional application instances
systemctl start lfa-app@2
systemctl start lfa-app@3
```

### High Memory Usage

#### Diagnosis
```bash
# Check memory usage
free -h
cat /proc/meminfo

# Identify memory-intensive processes
ps aux --sort=-%mem | head -10

# Check for memory leaks
valgrind --tool=memcheck --leak-check=full node /opt/lfa/app/backend/server.js
```

#### Solutions
```bash
# Clear system cache
echo 3 > /proc/sys/vm/drop_caches

# Restart memory-intensive services
systemctl restart lfa-app
systemctl restart redis

# Increase swap if needed
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
```

### Disk Space Issues

#### Diagnosis
```bash
# Check disk usage
df -h
du -sh /var/log/*
du -sh /opt/lfa/*

# Find large files
find / -type f -size +100M -exec ls -lh {} \; 2>/dev/null

# Check inode usage
df -i
```

#### Solutions
```bash
# Clean up logs
journalctl --vacuum-time=7d
logrotate -f /etc/logrotate.conf

# Clean up temporary files
rm -rf /tmp/*
rm -rf /var/tmp/*

# Clean up application cache
rm -rf /opt/lfa/app/backend/tmp/*
redis-cli FLUSHALL

# Archive old backups
find /backup -name "*.dump" -mtime +30 -exec gzip {} \;
```

## Database Problems

### Database Corruption

#### Symptoms
- Data inconsistencies
- Query errors
- Index corruption messages
- Database startup failures

#### Diagnosis
```bash
# Check database integrity
psql -h localhost -U postgres -c "SELECT datname FROM pg_database;" | \
while read db; do
  echo "Checking $db..."
  psql -h localhost -U postgres -d "$db" -c "SELECT pg_database_size('$db');"
done

# Check for corruption
psql -h localhost -U lfa_user -d lfa_production -c "
SELECT schemaname, tablename, attname, n_distinct, correlation 
FROM pg_stats 
WHERE schemaname = 'public';"

# Validate indexes
psql -h localhost -U lfa_user -d lfa_production -c "
SELECT schemaname, tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public';"
```

#### Solutions
```bash
# Repair minor corruption
psql -h localhost -U lfa_user -d lfa_production -c "REINDEX DATABASE lfa_production;"

# For major corruption, restore from backup
systemctl stop lfa-app
dropdb lfa_production
createdb lfa_production
pg_restore -d lfa_production /backup/database/latest.dump
systemctl start lfa-app
```

### Slow Queries

#### Diagnosis
```bash
# Enable query logging
psql -h localhost -U postgres -c "
ALTER SYSTEM SET log_statement = 'all';
ALTER SYSTEM SET log_min_duration_statement = 1000;
SELECT pg_reload_conf();"

# Analyze slow queries
psql -h localhost -U lfa_user -d lfa_production -c "
SELECT query, mean_time, calls, total_time
FROM pg_stat_statements 
WHERE mean_time > 1000 
ORDER BY mean_time DESC 
LIMIT 20;"

# Check for missing indexes
psql -h localhost -U lfa_user -d lfa_production -c "
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats 
WHERE schemaname = 'public' 
AND n_distinct > 100;"
```

#### Solutions
```bash
# Create missing indexes
psql -h localhost -U lfa_user -d lfa_production -c "
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);
CREATE INDEX CONCURRENTLY idx_training_sessions_date ON training_sessions(session_date);
CREATE INDEX CONCURRENTLY idx_payments_status ON payments(status);"

# Update statistics
psql -h localhost -U lfa_user -d lfa_production -c "ANALYZE;"

# Optimize queries
# Review and optimize application queries in codebase
grep -r "SELECT \*" /opt/lfa/app/backend/
```

## Application Errors

### 500 Internal Server Error

#### Diagnosis
```bash
# Check application logs
journalctl -u lfa-app --since "1 hour ago" | grep ERROR

# Check Node.js errors
tail -f /opt/lfa/app/backend/logs/error.log

# Check uncaught exceptions
grep -r "uncaughtException\|unhandledRejection" /opt/lfa/app/backend/logs/
```

#### Solutions
```bash
# Restart application
systemctl restart lfa-app

# Check for memory issues
node --max-old-space-size=4096 /opt/lfa/app/backend/server.js

# Update error handling
# Add to application code:
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});
```

### API Endpoint Failures

#### Diagnosis
```bash
# Test specific endpoints
curl -v http://localhost:3000/api/v1/users
curl -v http://localhost:3000/api/v1/teams

# Check API logs
grep "api/v1" /opt/lfa/app/backend/logs/access.log | tail -50

# Monitor API response times
for endpoint in users teams training-sessions; do
  echo "Testing $endpoint..."
  curl -w "Time: %{time_total}s\n" -o /dev/null -s \
    http://localhost:3000/api/v1/$endpoint
done
```

#### Solutions
```bash
# Restart API service
systemctl restart lfa-app

# Check API route configurations
grep -r "router\|app\." /opt/lfa/app/backend/routes/

# Verify middleware
grep -r "middleware" /opt/lfa/app/backend/
```

### Frontend Loading Issues

#### Diagnosis
```bash
# Check NGINX status
systemctl status nginx

# Check frontend build
ls -la /opt/lfa/app/frontend/build/

# Test static file serving
curl -I http://localhost/static/js/main.js
curl -I http://localhost/static/css/main.css

# Check browser console errors
# Use browser developer tools
```

#### Solutions
```bash
# Rebuild frontend
cd /opt/lfa/app/frontend
npm run build

# Restart NGINX
systemctl restart nginx

# Clear browser cache
# Instruct users to clear cache or use Ctrl+F5

# Check NGINX configuration
nginx -t
cat /etc/nginx/sites-available/lfa-app
```

## Network and Connectivity

### DNS Issues

#### Diagnosis
```bash
# Test DNS resolution
nslookup lionfootballacademy.com
dig lionfootballacademy.com

# Check DNS configuration
cat /etc/resolv.conf

# Test from different locations
# Use online DNS checkers
```

#### Solutions
```bash
# Flush DNS cache
systemctl restart systemd-resolved

# Update DNS records (CloudFlare)
curl -X PUT "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records/$RECORD_ID" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"type":"A","name":"lionfootballacademy.com","content":"NEW_IP"}'

# Check DNS propagation
dig @8.8.8.8 lionfootballacademy.com
dig @1.1.1.1 lionfootballacademy.com
```

### SSL Certificate Issues

#### Diagnosis
```bash
# Check certificate status
echo | openssl s_client -connect lionfootballacademy.com:443 2>/dev/null | \
  openssl x509 -noout -dates

# Check certificate chain
openssl s_client -connect lionfootballacademy.com:443 -showcerts

# Test SSL configuration
curl -I https://lionfootballacademy.com
```

#### Solutions
```bash
# Renew Let's Encrypt certificate
certbot renew --force-renewal

# Restart NGINX
systemctl restart nginx

# Update certificate configuration
# Edit /etc/nginx/sites-available/lfa-app
ssl_certificate /etc/letsencrypt/live/lionfootballacademy.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/lionfootballacademy.com/privkey.pem;
```

### CDN Issues

#### Diagnosis
```bash
# Test CDN endpoints
curl -I https://cdn.lionfootballacademy.com/assets/logo.png

# Check cache status
curl -H "Cache-Control: no-cache" https://cdn.lionfootballacademy.com/

# Verify origin server
curl -H "Host: lionfootballacademy.com" http://ORIGIN_IP/
```

#### Solutions
```bash
# Purge CDN cache
curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/purge_cache" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"purge_everything": true}'

# Update CDN configuration
# Check CloudFlare dashboard settings
```

## User Access Issues

### Login Problems

#### Symptoms
- Users cannot log in
- "Invalid credentials" errors
- Account lockout messages
- Two-factor authentication failures

#### Diagnosis
```bash
# Check authentication logs
grep "authentication" /opt/lfa/app/backend/logs/app.log

# Check user account status
psql -h localhost -U lfa_user -d lfa_production -c "
SELECT id, email, email_verified, created_at, last_login 
FROM users 
WHERE email = 'user@example.com';"

# Check session storage
redis-cli keys "session:*"
redis-cli get "session:SESSION_ID"
```

#### Solutions
```bash
# Reset user password
psql -h localhost -U lfa_user -d lfa_production -c "
UPDATE users 
SET password_reset_token = 'RESET_TOKEN',
    password_reset_expires = NOW() + INTERVAL '1 hour'
WHERE email = 'user@example.com';"

# Clear failed login attempts
redis-cli del "failed_attempts:user@example.com"

# Unlock account
psql -h localhost -U lfa_user -d lfa_production -c "
UPDATE users 
SET account_locked = false,
    failed_login_attempts = 0
WHERE email = 'user@example.com';"
```

### Permission Issues

#### Diagnosis
```bash
# Check user permissions
psql -h localhost -U lfa_user -d lfa_production -c "
SELECT u.email, u.user_type, up.permission
FROM users u
LEFT JOIN user_permissions up ON u.id = up.user_id
WHERE u.email = 'user@example.com';"

# Check role-based access
grep -r "hasPermission\|checkRole" /opt/lfa/app/backend/middleware/
```

#### Solutions
```bash
# Update user permissions
psql -h localhost -U lfa_user -d lfa_production -c "
INSERT INTO user_permissions (user_id, permission, granted_at)
SELECT id, 'manage_teams', NOW()
FROM users 
WHERE email = 'coach@example.com';"

# Refresh user session
redis-cli del "session:USER_SESSION_ID"
```

## Payment System Problems

### Payment Processing Failures

#### Symptoms
- Payment declined messages
- Webhook delivery failures
- Incomplete transactions
- Stripe errors

#### Diagnosis
```bash
# Check Stripe webhooks
curl -H "Authorization: Bearer $STRIPE_SECRET_KEY" \
  "https://api.stripe.com/v1/events?limit=10"

# Check payment logs
grep "payment\|stripe" /opt/lfa/app/backend/logs/app.log

# Verify webhook endpoints
curl -X POST http://localhost:3000/webhooks/stripe \
  -H "Content-Type: application/json" \
  -d '{"test": "webhook"}'
```

#### Solutions
```bash
# Resend failed webhooks
# Use Stripe dashboard to resend events

# Update webhook endpoint
curl -X POST "https://api.stripe.com/v1/webhook_endpoints" \
  -H "Authorization: Bearer $STRIPE_SECRET_KEY" \
  -d "url=https://lionfootballacademy.com/webhooks/stripe" \
  -d "enabled_events[]=payment_intent.succeeded"

# Process pending payments
psql -h localhost -U lfa_user -d lfa_production -c "
UPDATE payments 
SET status = 'pending_review'
WHERE status = 'processing' 
AND created_at < NOW() - INTERVAL '1 hour';"
```

### Billing Issues

#### Diagnosis
```bash
# Check billing records
psql -h localhost -U lfa_user -d lfa_production -c "
SELECT user_id, amount, status, created_at
FROM payments 
WHERE status IN ('failed', 'pending')
ORDER BY created_at DESC 
LIMIT 20;"

# Check subscription status
psql -h localhost -U lfa_user -d lfa_production -c "
SELECT u.email, s.status, s.current_period_end
FROM users u
JOIN subscriptions s ON u.id = s.user_id
WHERE s.status != 'active';"
```

#### Solutions
```bash
# Update billing status
psql -h localhost -U lfa_user -d lfa_production -c "
UPDATE payments 
SET status = 'completed',
    processed_at = NOW()
WHERE id = 'PAYMENT_ID';"

# Send billing notifications
node /opt/lfa/app/backend/scripts/send-billing-reminders.js
```

## Diagnostic Tools

### System Monitoring Commands

#### Resource Monitoring
```bash
# CPU and Memory monitoring
top -b -n 1
htop
vmstat 1 5
iostat -x 1 5

# Disk monitoring
df -h
du -sh /opt/lfa/*
iotop -a

# Network monitoring
netstat -tulpn
ss -tulpn
iftop
```

#### Application Monitoring
```bash
# Process monitoring
ps aux | grep -E "(node|nginx|postgres)"
pgrep -f lfa-app

# Port monitoring
lsof -i :3000
lsof -i :80
lsof -i :443

# Log monitoring
tail -f /opt/lfa/app/backend/logs/app.log
journalctl -u lfa-app -f
```

### Database Diagnostic Queries

#### Performance Analysis
```sql
-- Current activity
SELECT pid, usename, application_name, state, query, state_change
FROM pg_stat_activity 
WHERE datname = 'lfa_production';

-- Slow queries
SELECT query, mean_time, calls, total_time
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Table sizes
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes 
ORDER BY idx_scan DESC;
```

### Application Health Checks

#### Health Check Script
```bash
#!/bin/bash
# /opt/lfa/scripts/health_check.sh

echo "=== System Health Check ==="

# Check system load
echo "System Load:"
uptime

# Check disk space
echo -e "\nDisk Usage:"
df -h | grep -E "(Filesystem|/dev/)"

# Check memory
echo -e "\nMemory Usage:"
free -h

# Check services
echo -e "\nService Status:"
for service in lfa-app nginx postgresql redis; do
  status=$(systemctl is-active $service)
  echo "$service: $status"
done

# Check database connectivity
echo -e "\nDatabase Connectivity:"
if psql -h localhost -U lfa_user -d lfa_production -c "SELECT 1;" >/dev/null 2>&1; then
  echo "Database: Connected"
else
  echo "Database: Connection Failed"
fi

# Check application endpoints
echo -e "\nApplication Endpoints:"
for endpoint in health api/v1/status; do
  if curl -f -s http://localhost:3000/$endpoint >/dev/null; then
    echo "$endpoint: OK"
  else
    echo "$endpoint: Failed"
  fi
done

echo -e "\n=== Health Check Complete ==="
```

## Emergency Procedures

### System Recovery

#### Complete System Failure
```bash
#!/bin/bash
# Emergency system recovery procedure

echo "Starting emergency system recovery..."

# 1. Assess the situation
systemctl status lfa-app nginx postgresql redis

# 2. Check logs for critical errors
journalctl --priority=crit --since "1 hour ago"

# 3. Restart core services
systemctl restart postgresql
sleep 10
systemctl restart redis
sleep 5
systemctl restart lfa-app
sleep 5
systemctl restart nginx

# 4. Verify recovery
curl -f http://localhost:3000/health

# 5. Notify stakeholders
echo "System recovery attempted. Status: $(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health)" | \
  mail -s "Emergency Recovery Update" admin@lionfootballacademy.com

echo "Emergency recovery procedure completed"
```

### Data Recovery

#### Database Recovery
```bash
#!/bin/bash
# Emergency database recovery

echo "Starting emergency database recovery..."

# Stop application
systemctl stop lfa-app

# Backup current state
pg_dump -h localhost -U lfa_user -d lfa_production \
  --format=custom --compress=9 \
  --file="/tmp/emergency_backup_$(date +%Y%m%d_%H%M%S).dump"

# Restore from latest backup
LATEST_BACKUP=$(ls -t /backup/database/*.dump | head -1)
echo "Restoring from: $LATEST_BACKUP"

dropdb lfa_production
createdb lfa_production
pg_restore -d lfa_production "$LATEST_BACKUP"

# Start application
systemctl start lfa-app

# Verify recovery
if curl -f http://localhost:3000/health >/dev/null 2>&1; then
  echo "Database recovery successful"
else
  echo "Database recovery failed"
  exit 1
fi
```

### Communication During Emergencies

#### Emergency Communication Script
```bash
#!/bin/bash
# Emergency communication script

INCIDENT_TYPE=$1
ESTIMATED_DOWNTIME=$2

# Update status page
curl -X POST "https://status.lionfootballacademy.com/api/incidents" \
  -H "Authorization: Bearer $STATUS_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"$INCIDENT_TYPE\",
    \"status\": \"investigating\",
    \"message\": \"We are investigating an issue affecting our services. Estimated resolution time: $ESTIMATED_DOWNTIME\",
    \"components\": [\"api\", \"web\", \"mobile\"]
  }"

# Send emergency notification
cat <<EOF | mail -s "URGENT: System Issue - $INCIDENT_TYPE" admin@lionfootballacademy.com
Emergency Alert: $INCIDENT_TYPE

Status: Under Investigation
Estimated Resolution: $ESTIMATED_DOWNTIME
Impact: Service Interruption

Technical team has been notified and is working on resolution.

Updates will be posted to: https://status.lionfootballacademy.com
EOF

echo "Emergency notifications sent"
```

---

*This troubleshooting guide should be kept updated with new issues and solutions as they are discovered and resolved.*