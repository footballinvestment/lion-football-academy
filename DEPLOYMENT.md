# 🚀 Lion Football Academy - Deployment Guide

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Environment Setup](#environment-setup)
- [Local Development](#local-development)
- [Production Deployment](#production-deployment)
- [Docker Deployment](#docker-deployment)
- [Cloud Deployment](#cloud-deployment)
- [Database Setup](#database-setup)
- [Environment Variables](#environment-variables)
- [SSL Configuration](#ssl-configuration)
- [Monitoring & Logs](#monitoring--logs)
- [Troubleshooting](#troubleshooting)

## ⚡ Quick Start

### Prerequisites

- **Node.js 18.x** or higher
- **npm** package manager
- **Git** for version control
- **SQLite** (included) or **PostgreSQL** (production)

### 30-Second Local Setup

```bash
# Clone repository
git clone https://github.com/your-org/lion-football-academy.git
cd lion-football-academy

# Backend setup
cd backend
npm install
npm start

# Frontend setup (new terminal)
cd ../frontend
npm install
npm start

# Access application
# Frontend: http://localhost:3000
# Backend API: http://localhost:5001
```

**Default credentials:**
- Admin: `admin` / `admin123`
- Coach: `coach_test` / `coach123`
- Parent: `parent_test` / `parent123`

## 🔧 Environment Setup

### Backend Environment Variables

Create `backend/.env`:

```env
# Server Configuration
NODE_ENV=production
PORT=5001
HOST=0.0.0.0

# Database Configuration
DATABASE_URL=sqlite:./src/database/academy.db
# For PostgreSQL: DATABASE_URL=postgresql://user:password@localhost:5432/academy

# JWT Authentication
JWT_SECRET=your_super_secure_jwt_secret_key_minimum_32_characters_long
JWT_EXPIRES_IN=24h
REFRESH_TOKEN_EXPIRES_IN=7d

# Security Settings
BCRYPT_ROUNDS=12
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_TIME_MINUTES=15

# CORS Configuration
CORS_ORIGIN=https://yourdomain.com
# For development: CORS_ORIGIN=http://localhost:3000

# Email Configuration (Optional)
EMAIL_ENABLED=true
EMAIL_SERVICE=gmail
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-specific-password

# File Upload
MAX_FILE_SIZE=5242880
UPLOAD_DIR=./uploads

# Redis (Optional - for session management)
REDIS_URL=redis://localhost:6379

# Logging
LOG_LEVEL=info
LOG_FILE=logs/academy.log

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Frontend Environment Variables

Create `frontend/.env.production`:

```env
# API Configuration
REACT_APP_API_BASE_URL=https://api.yourdomain.com
REACT_APP_API_TIMEOUT=30000

# Application Settings
REACT_APP_NAME=Lion Football Academy
REACT_APP_VERSION=1.0.0
REACT_APP_ENVIRONMENT=production

# Feature Flags
REACT_APP_ENABLE_QR_SCANNER=true
REACT_APP_ENABLE_ANALYTICS=true
REACT_APP_ENABLE_NOTIFICATIONS=true

# Analytics (Optional)
REACT_APP_GOOGLE_ANALYTICS_ID=GA-XXXXXXXXX

# Error Tracking (Optional)
REACT_APP_SENTRY_DSN=https://your-sentry-dsn

# PWA Settings
REACT_APP_ENABLE_PWA=true
```

## 🏠 Local Development

### Database Initialization

```bash
# Backend directory
cd backend

# Create database and tables
npm run db:create

# Run migrations
npm run db:migrate

# Seed with sample data
npm run db:seed

# Create admin user
npm run create:admin
```

### Development Servers

```bash
# Terminal 1: Backend (with hot reload)
cd backend
npm run dev

# Terminal 2: Frontend (with hot reload)
cd frontend
npm start

# Terminal 3: Database management (optional)
npm run db:studio
```

### Available Scripts

#### Backend Scripts
```bash
npm start              # Production server
npm run dev           # Development with nodemon
npm test              # Run test suite
npm run lint          # ESLint validation
npm run db:create     # Create database
npm run db:migrate    # Run migrations
npm run db:seed       # Seed sample data
npm run db:backup     # Backup database
npm run logs          # View logs
```

#### Frontend Scripts
```bash
npm start                # Development server
npm run build           # Production build
npm test                # Run tests
npm run test:coverage   # Test coverage
npm run lint           # ESLint validation
npm run analyze        # Bundle analysis
npm run deploy:local   # Local production test
```

## 🌐 Production Deployment

### Manual Deployment

#### 1. Server Preparation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Install Nginx
sudo apt install nginx -y

# Install PostgreSQL (recommended for production)
sudo apt install postgresql postgresql-contrib -y
```

#### 2. Application Setup

```bash
# Clone repository
git clone https://github.com/your-org/lion-football-academy.git
cd lion-football-academy

# Install dependencies
cd backend && npm ci --only=production
cd ../frontend && npm ci --only=production

# Build frontend
npm run build

# Setup environment variables
cp .env.example .env
# Edit .env with production values

# Setup database
npm run db:create
npm run db:migrate
npm run create:admin
```

#### 3. PM2 Configuration

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'lion-academy-backend',
    script: './backend/server.js',
    cwd: '/path/to/lion-football-academy',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5001
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    time: true
  }]
};
```

Start with PM2:

```bash
# Start application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup
```

#### 4. Nginx Configuration

Create `/etc/nginx/sites-available/lion-academy`:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Configuration
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;

    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";

    # Frontend
    location / {
        root /path/to/lion-football-academy/frontend/build;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
        
        # Caching
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:5001;
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

    # Health check
    location /health {
        proxy_pass http://localhost:5001/health;
        access_log off;
    }
}
```

Enable site:

```bash
sudo ln -s /etc/nginx/sites-available/lion-academy /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 🐳 Docker Deployment

### Docker Compose Setup

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  backend:
    build: 
      context: ./backend
      dockerfile: Dockerfile
    container_name: lion-academy-backend
    restart: unless-stopped
    ports:
      - "5001:5001"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/academy
    volumes:
      - ./backend/uploads:/app/uploads
      - ./logs:/app/logs
    depends_on:
      - postgres
      - redis
    networks:
      - academy-network

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: lion-academy-frontend
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - backend
    networks:
      - academy-network

  postgres:
    image: postgres:15-alpine
    container_name: lion-academy-postgres
    restart: unless-stopped
    environment:
      - POSTGRES_DB=academy
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=your_secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backend/src/database/schema.sql:/docker-entrypoint-initdb.d/01-schema.sql
    networks:
      - academy-network

  redis:
    image: redis:7-alpine
    container_name: lion-academy-redis
    restart: unless-stopped
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    networks:
      - academy-network

volumes:
  postgres_data:
  redis_data:

networks:
  academy-network:
    driver: bridge
```

### Backend Dockerfile

Create `backend/Dockerfile`:

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

FROM node:18-alpine AS production

RUN apk add --no-cache dumb-init

WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .

RUN chown -R node:node /app
USER node

EXPOSE 5001

CMD ["dumb-init", "node", "server.js"]
```

### Frontend Dockerfile

Create `frontend/Dockerfile`:

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --silent
COPY . .
RUN npm run build

FROM nginx:alpine AS production

# Copy Nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built application
COPY --from=builder /app/build /usr/share/nginx/html

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/ || exit 1

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
```

### Deploy with Docker

```bash
# Build and start services
docker-compose up -d --build

# View logs
docker-compose logs -f

# Scale backend service
docker-compose up -d --scale backend=3

# Update application
docker-compose pull
docker-compose up -d --force-recreate
```

## ☁️ Cloud Deployment

### AWS Deployment

#### Using AWS Elastic Beanstalk

1. **Install EB CLI**
```bash
pip install awsebcli
```

2. **Initialize Application**
```bash
eb init lion-football-academy
eb create production
```

3. **Deploy**
```bash
eb deploy
```

#### Using AWS ECS

Create `docker-compose.aws.yml` for ECS deployment.

### Digital Ocean Deployment

#### Using App Platform

1. **Connect GitHub repository**
2. **Configure build settings**:
   - Build command: `npm run build`
   - Output directory: `build`
3. **Configure environment variables**
4. **Deploy**

### Heroku Deployment

```bash
# Install Heroku CLI
npm install -g heroku

# Login and create app
heroku login
heroku create lion-football-academy

# Configure environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your_secret

# Deploy
git push heroku main
```

## 🗄️ Database Setup

### PostgreSQL Production Setup

```sql
-- Create database
CREATE DATABASE academy;

-- Create user
CREATE USER academy_user WITH ENCRYPTED PASSWORD 'secure_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE academy TO academy_user;

-- Connect to database
\c academy;

-- Run schema
\i /path/to/schema.sql;
```

### Database Backup & Restore

```bash
# Backup
pg_dump -U academy_user -h localhost academy > backup.sql

# Restore
psql -U academy_user -h localhost academy < backup.sql

# Automated backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -U academy_user academy > "backup_$DATE.sql"
```

## 🔒 SSL Configuration

### Let's Encrypt (Certbot)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Manual SSL Certificate

1. **Generate CSR**
```bash
openssl req -new -newkey rsa:2048 -nodes -keyout private.key -out certificate.csr
```

2. **Install certificate** in Nginx configuration

## 📊 Monitoring & Logs

### PM2 Monitoring

```bash
# Monitor processes
pm2 monit

# View logs
pm2 logs

# Restart application
pm2 restart all
```

### Log Management

```bash
# Rotate logs
pm2 install pm2-logrotate

# Configure log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
```

### Health Checks

Create monitoring endpoint:

```javascript
// health.js
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});
```

## 🔧 Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Find process using port
lsof -ti:5001

# Kill process
kill -9 $(lsof -ti:5001)
```

#### Database Connection Issues
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check connection
psql -U academy_user -h localhost -d academy
```

#### Nginx Issues
```bash
# Test configuration
sudo nginx -t

# Check status
sudo systemctl status nginx

# View logs
sudo tail -f /var/log/nginx/error.log
```

#### PM2 Issues
```bash
# Restart PM2
pm2 kill
pm2 resurrect

# Check process status
pm2 list
```

### Performance Issues

#### Backend Performance
```bash
# Monitor memory usage
htop

# Check database performance
EXPLAIN ANALYZE SELECT * FROM players;
```

#### Frontend Performance
```bash
# Bundle analysis
npm run analyze

# Lighthouse audit
npm run lighthouse
```

### Log Analysis

```bash
# View real-time logs
tail -f logs/academy.log

# Search for errors
grep "ERROR" logs/academy.log

# Monitor access logs
tail -f /var/log/nginx/access.log
```

## 📞 Support

For deployment issues:

1. **Check logs** first
2. **Review configuration** files
3. **Test connectivity** between services
4. **Verify environment variables**
5. **Contact support** with specific error messages

---

**🚀 Ready to deploy Lion Football Academy to the world! 🦁⚽**

*This guide covers most deployment scenarios. For specific requirements or issues, please refer to the individual service documentation or contact the development team.*