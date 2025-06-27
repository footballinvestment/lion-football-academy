# Lion Football Academy - Production Deployment Guide

## 🚀 Production Deployment Checklist

### ✅ Pre-Deployment Requirements

#### 1. Environment Setup
- [ ] **Production Server**: Ubuntu 20.04+ or CentOS 8+ with minimum 2GB RAM
- [ ] **Node.js**: Version 18.x or higher installed
- [ ] **Database**: SQLite for development, PostgreSQL recommended for production
- [ ] **Web Server**: Nginx or Apache configured as reverse proxy
- [ ] **SSL Certificate**: Valid SSL certificate for HTTPS
- [ ] **Domain Name**: Configured DNS pointing to production server

#### 2. Environment Variables
Create `.env.production` file with the following variables:

```bash
# Application
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Database
DATABASE_URL=sqlite:./src/database/academy.db
# For PostgreSQL: postgresql://username:password@host:port/database

# Authentication
JWT_SECRET=your-super-secure-jwt-secret-key-here-minimum-32-characters
JWT_EXPIRES_IN=24h
REFRESH_TOKEN_EXPIRES_IN=7d

# Security
CORS_ORIGIN=https://yourdomain.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Email (if implementing notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@domain.com
SMTP_PASS=your-app-password

# File Upload
MAX_FILE_SIZE=5MB
UPLOAD_PATH=/var/www/uploads

# Logging
LOG_LEVEL=info
LOG_FILE_PATH=/var/log/football-academy
```

#### 3. Security Configuration
- [ ] **Firewall**: Configure to allow only necessary ports (80, 443, 22)
- [ ] **SSH**: Disable root login, use key-based authentication
- [ ] **Database**: Create dedicated database user with limited privileges
- [ ] **File Permissions**: Set appropriate file permissions (755 for directories, 644 for files)
- [ ] **Security Headers**: Configure security headers in Nginx/Apache

### 🛠️ Installation Steps

#### 1. Server Preparation
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Install Nginx
sudo apt install nginx -y

# Install Git
sudo apt install git -y
```

#### 2. Application Deployment
```bash
# Create application directory
sudo mkdir -p /var/www/football-academy
sudo chown $USER:$USER /var/www/football-academy

# Clone repository
cd /var/www/football-academy
git clone https://github.com/your-repo/football-academy.git .

# Install dependencies
npm ci --only=production

# Copy environment file
cp .env.production .env

# Create necessary directories
mkdir -p logs
mkdir -p uploads
mkdir -p backups

# Set permissions
chmod -R 755 .
chmod 600 .env
```

#### 3. Database Setup
```bash
# For SQLite (development/small production)
# Database file will be created automatically

# For PostgreSQL (recommended for production)
sudo apt install postgresql postgresql-contrib -y
sudo -u postgres createuser --interactive footballacademy
sudo -u postgres createdb footballacademy -O footballacademy

# Run database migrations
npm run migrate:production
```

#### 4. PM2 Configuration
Create `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'football-academy',
    script: './src/app.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
};
```

Start the application:
```bash
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

#### 5. Nginx Configuration
Create `/etc/nginx/sites-available/football-academy`:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/ssl/certs/yourdomain.com.crt;
    ssl_certificate_key /etc/ssl/private/yourdomain.com.key;
    
    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';";

    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    
    location / {
        try_files $uri $uri/ @backend;
    }
    
    location /api {
        limit_req zone=api burst=20 nodelay;
        
        proxy_pass http://localhost:3000;
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
    
    location @backend {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Static files
    location /uploads {
        alias /var/www/football-academy/uploads;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Security
    location ~ /\. {
        deny all;
    }
    
    location ~ ^/(package\.json|ecosystem\.config\.js|\.env) {
        deny all;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/football-academy /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 🔧 Post-Deployment Configuration

#### 1. SSL Certificate Setup
```bash
# Using Let's Encrypt (recommended)
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

#### 2. Backup Configuration
Create `/etc/cron.daily/football-academy-backup`:
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/football-academy"
DATE=$(date +%Y%m%d_%H%M%S)
APP_DIR="/var/www/football-academy"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
if [ -f "$APP_DIR/src/database/academy.db" ]; then
    cp "$APP_DIR/src/database/academy.db" "$BACKUP_DIR/academy_$DATE.db"
fi

# Backup uploads
if [ -d "$APP_DIR/uploads" ]; then
    tar -czf "$BACKUP_DIR/uploads_$DATE.tar.gz" -C "$APP_DIR" uploads
fi

# Keep only last 7 days of backups
find $BACKUP_DIR -type f -mtime +7 -delete

# Log backup
echo "$(date): Backup completed" >> /var/log/football-academy-backup.log
```

Make it executable:
```bash
sudo chmod +x /etc/cron.daily/football-academy-backup
```

#### 3. Monitoring Setup
```bash
# Install monitoring tools
sudo npm install -g pm2-logrotate
pm2 install pm2-logrotate

# Configure log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
pm2 set pm2-logrotate:compress true
```

#### 4. Database Optimization
```sql
-- For SQLite
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA cache_size = 1000000;
PRAGMA temp_store = memory;

-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_players_team ON players(team_id);
CREATE INDEX IF NOT EXISTS idx_matches_date ON matches(match_date);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(match_status);
```

### 🔍 Health Checks & Monitoring

#### 1. Application Health Check
Create `health-check.sh`:
```bash
#!/bin/bash
HEALTH_URL="https://yourdomain.com/api/health"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)

if [ $RESPONSE -eq 200 ]; then
    echo "$(date): Health check passed"
else
    echo "$(date): Health check failed - HTTP $RESPONSE"
    # Restart application if needed
    pm2 restart football-academy
fi
```

Add to crontab:
```bash
*/5 * * * * /var/www/football-academy/health-check.sh >> /var/log/health-check.log
```

#### 2. Performance Monitoring
```bash
# Monitor application metrics
pm2 monit

# Check system resources
htop
iotop
nethogs
```

### 🚨 Troubleshooting Guide

#### Common Issues

1. **Application Won't Start**
   ```bash
   # Check logs
   pm2 logs football-academy
   
   # Check environment variables
   pm2 env 0
   
   # Restart application
   pm2 restart football-academy
   ```

2. **Database Connection Issues**
   ```bash
   # Check database file permissions
   ls -la src/database/academy.db
   
   # Check database connectivity
   sqlite3 src/database/academy.db ".tables"
   ```

3. **High Memory Usage**
   ```bash
   # Check memory usage
   pm2 monit
   
   # Restart application
   pm2 restart football-academy
   ```

4. **SSL Certificate Issues**
   ```bash
   # Check certificate status
   sudo certbot certificates
   
   # Renew certificate
   sudo certbot renew
   ```

### 🔄 Deployment Updates

#### Rolling Updates
```bash
# Pull latest changes
git pull origin main

# Install dependencies
npm ci --only=production

# Restart application with zero downtime
pm2 reload football-academy

# Check status
pm2 status
```

#### Database Migrations
```bash
# Backup database before migration
cp src/database/academy.db src/database/academy_backup_$(date +%Y%m%d).db

# Run migrations
npm run migrate

# Verify migration
npm run verify-db
```

### 📊 Performance Optimization

#### 1. Application Level
- Enable clustering with PM2
- Implement caching for frequent queries
- Optimize database queries with indexes
- Use compression middleware
- Implement request rate limiting

#### 2. Server Level
- Configure Nginx caching
- Enable gzip compression
- Optimize static file serving
- Configure keep-alive connections
- Monitor and tune system resources

#### 3. Database Level
- Regular VACUUM for SQLite
- Optimize query execution plans
- Monitor query performance
- Implement connection pooling
- Regular index maintenance

### 🔐 Security Best Practices

1. **Application Security**
   - Regular dependency updates
   - Input validation and sanitization
   - SQL injection prevention
   - XSS protection
   - CSRF protection
   - Rate limiting

2. **Server Security**
   - Regular OS updates
   - Firewall configuration
   - SSH hardening
   - Regular security audits
   - Intrusion detection

3. **Database Security**
   - Encrypted connections
   - Regular backups
   - Access control
   - Audit logging

### 📞 Support & Maintenance

#### Daily Tasks
- [ ] Check application logs
- [ ] Monitor system resources
- [ ] Verify backup completion
- [ ] Check SSL certificate status

#### Weekly Tasks
- [ ] Review security logs
- [ ] Update dependencies
- [ ] Performance analysis
- [ ] Database maintenance

#### Monthly Tasks
- [ ] Security audit
- [ ] Backup restoration test
- [ ] Capacity planning review
- [ ] Documentation updates

---

## 🎯 Success Criteria

✅ **Application is accessible via HTTPS**
✅ **All API endpoints respond correctly**
✅ **Authentication system is secure**
✅ **Database is optimized and backed up**
✅ **Monitoring and logging are configured**
✅ **SSL certificate is valid and auto-renewing**
✅ **Security headers are properly configured**
✅ **Performance meets target requirements (<100ms API response)**

---

## 📧 Emergency Contacts

- **System Administrator**: admin@footballacademy.com
- **Database Administrator**: dba@footballacademy.com
- **Security Team**: security@footballacademy.com
- **On-call Support**: +36-XX-XXX-XXXX

---

*Last Updated: December 2024*
*Version: 1.0*