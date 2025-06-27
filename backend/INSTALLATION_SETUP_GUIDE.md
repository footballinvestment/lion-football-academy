# Lion Football Academy - Installation & Setup Guide

## 🚀 Quick Start Guide

This guide will get you from zero to a running Lion Football Academy system in under 30 minutes.

### Prerequisites Checklist
- [ ] Node.js 18.x or higher
- [ ] Git installed
- [ ] Terminal/Command line access
- [ ] Text editor (VS Code recommended)
- [ ] Web browser (Chrome, Firefox, Safari, Edge)

---

## 📦 Installation Methods

### Method 1: Quick Local Setup (Recommended for Testing)

#### Step 1: Clone and Install
```bash
# Clone the repository
git clone https://github.com/your-org/lion-football-academy.git
cd lion-football-academy/backend

# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env

# Initialize database
npm run setup:database

# Seed with sample data
npm run seed:sample
```

#### Step 2: Start the Application
```bash
# Start development server
npm run dev

# Or start production server
npm start
```

#### Step 3: Access the System
- **Web Interface**: http://localhost:3000
- **API Documentation**: http://localhost:3000/api/docs
- **Health Check**: http://localhost:3000/health

#### Step 4: Default Login Credentials
```
Administrator:
- Username: admin
- Password: admin123

Coach (Test):
- Username: coach_test  
- Password: password123

Parent (Test):
- Username: parent_test
- Password: password123
```

### Method 2: Production Docker Setup

#### Step 1: Docker Installation
```bash
# Pull the application
git clone https://github.com/your-org/lion-football-academy.git
cd lion-football-academy

# Build and start with Docker Compose
docker-compose up -d
```

#### Step 2: Configure Environment
```bash
# Copy production environment
cp .env.production .env

# Update configuration
nano .env
```

#### Step 3: Initialize Production Database
```bash
# Run database migrations
docker-compose exec app npm run migrate:production

# Create admin user
docker-compose exec app npm run create:admin
```

---

## ⚙️ Configuration Guide

### Environment Variables

Create `.env` file with these required variables:

```bash
# Application Settings
NODE_ENV=development
PORT=3000
HOST=localhost

# Database Configuration
DATABASE_URL=sqlite:./src/database/academy.db
# For PostgreSQL: postgresql://username:password@host:port/database

# Authentication
JWT_SECRET=your-super-secure-jwt-secret-key-minimum-32-characters
JWT_EXPIRES_IN=24h
REFRESH_TOKEN_EXPIRES_IN=7d

# Security
CORS_ORIGIN=http://localhost:3000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Email Configuration (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@domain.com
SMTP_PASS=your-app-password

# File Upload
MAX_FILE_SIZE=5MB
UPLOAD_PATH=./uploads

# Logging
LOG_LEVEL=info
LOG_FILE_PATH=./logs
```

### Database Configuration

#### SQLite (Default - Good for Small Academies)
```bash
# Automatic - No additional setup required
# Database file created at: ./src/database/academy.db
```

#### PostgreSQL (Recommended for Production)
```bash
# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Create database and user
sudo -u postgres createuser footballacademy
sudo -u postgres createdb footballacademy -O footballacademy

# Update .env file
DATABASE_URL=postgresql://footballacademy:password@localhost/footballacademy
```

---

## 🗄️ Database Setup

### Automatic Setup (Recommended)
```bash
# Run the complete setup
npm run setup:complete

# This will:
# 1. Create database tables
# 2. Set up indexes
# 3. Create admin user
# 4. Seed sample data
```

### Manual Setup
```bash
# Create tables only
npm run db:create

# Run migrations
npm run db:migrate

# Create admin user
npm run create:admin

# Seed with sample data (optional)
npm run seed:sample
```

### Verify Database Setup
```bash
# Check database status
npm run db:status

# Test database connection
npm run db:test
```

---

## 👤 User Management Setup

### Create Administrator Account
```bash
# Interactive admin creation
npm run create:admin

# Or provide details directly
npm run create:admin -- --username=admin --email=admin@academy.com --password=securepass123
```

### Create Sample Users
```bash
# Create sample coaches and parents
npm run seed:users

# This creates:
# - 3 sample coaches
# - 10 sample parents
# - 20 sample players
```

### Manual User Creation
```bash
# Create coach
npm run create:user -- --role=coach --username=john_coach --email=john@academy.com

# Create parent
npm run create:user -- --role=parent --username=mary_parent --email=mary@academy.com
```

---

## 🏆 Academy Data Setup

### Quick Academy Setup
```bash
# Set up complete academy with teams and players
npm run setup:academy

# This creates:
# - 6 teams (U8, U10, U12, U14, U16, U18)
# - 75+ players across all teams
# - Sample matches and training sessions
# - Parent-child relationships
```

### Manual Academy Setup

#### Step 1: Create Teams
```bash
# Create age group teams
npm run create:teams

# Or create manually via API:
curl -X POST http://localhost:3000/api/teams \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Lions U12",
    "age_group": "U12",
    "coach_id": 2,
    "founded_year": 2024,
    "home_venue": "Academy Field 1"
  }'
```

#### Step 2: Add Players
```bash
# Seed players for all teams
npm run seed:players

# Or add manually via API:
curl -X POST http://localhost:3000/api/players \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Smith",
    "birth_date": "2012-05-15",
    "position": "Midfielder",
    "team_id": 1
  }'
```

#### Step 3: Set Up Matches
```bash
# Create sample matches
npm run seed:matches

# Generate full season
npm run generate:season -- --season=2024-25
```

---

## 🔒 Security Setup

### SSL/HTTPS Configuration

#### Development (Self-Signed Certificate)
```bash
# Generate self-signed certificate
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes

# Update environment
HTTPS_KEY=./key.pem
HTTPS_CERT=./cert.pem
```

#### Production (Let's Encrypt)
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Firewall Configuration
```bash
# Ubuntu/Debian
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable

# CentOS/RHEL
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

---

## 📧 Email Configuration

### Gmail SMTP Setup
```bash
# 1. Enable 2-factor authentication on Gmail
# 2. Generate app password
# 3. Update .env file:

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-character-app-password
```

### Other Email Providers
```bash
# Outlook/Hotmail
SMTP_HOST=smtp.live.com
SMTP_PORT=587

# Yahoo
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587

# Custom SMTP
SMTP_HOST=mail.yourdomain.com
SMTP_PORT=587
```

### Test Email Configuration
```bash
# Test email sending
npm run test:email

# Send test notification
npm run send:test-notification
```

---

## 🎨 Frontend Setup (If Applicable)

### React Frontend Setup
```bash
# Navigate to frontend directory
cd ../frontend

# Install dependencies
npm install

# Configure API endpoint
echo "REACT_APP_API_URL=http://localhost:3000/api" > .env

# Start development server
npm start
```

### Production Build
```bash
# Build for production
npm run build

# Serve with nginx or apache
sudo cp -r build/* /var/www/html/
```

---

## 🔍 Testing & Verification

### Run System Tests
```bash
# Run all tests
npm test

# Run specific test suites
npm run test:auth
npm run test:family
npm run test:integration

# Generate test report
npm run test:report
```

### Manual Verification Checklist

#### Basic Functionality ✅
- [ ] Application starts without errors
- [ ] Database connects successfully
- [ ] Admin login works
- [ ] API endpoints respond correctly
- [ ] Basic CRUD operations work

#### User Management ✅
- [ ] Can create new users
- [ ] Role-based access works
- [ ] Password reset functions
- [ ] User profile updates work

#### Academy Management ✅
- [ ] Can create teams
- [ ] Can add players to teams
- [ ] Can record match results
- [ ] Can schedule training sessions

#### Family System ✅
- [ ] Parents can view own children only
- [ ] Child performance data displays
- [ ] Notifications work correctly
- [ ] Privacy controls function

#### Performance ✅
- [ ] Pages load quickly (<2 seconds)
- [ ] API responses under 100ms
- [ ] Database queries optimized
- [ ] No memory leaks detected

---

## 🚨 Troubleshooting

### Common Installation Issues

#### Node.js Version Error
```bash
# Check Node.js version
node --version

# Should be 18.x or higher
# If not, install latest:
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

#### Database Connection Error
```bash
# For SQLite issues:
rm src/database/academy.db
npm run db:create

# For PostgreSQL issues:
sudo service postgresql status
sudo service postgresql start
```

#### Port Already in Use
```bash
# Find process using port 3000
lsof -ti:3000

# Kill the process
kill -9 $(lsof -ti:3000)

# Or use different port
PORT=3001 npm start
```

#### Permission Errors
```bash
# Fix file permissions
chmod -R 755 .
chmod 600 .env

# Fix upload directory
mkdir -p uploads
chmod 755 uploads
```

### Performance Issues

#### Slow Database Queries
```bash
# Rebuild database indexes
npm run db:reindex

# Optimize database
npm run db:optimize

# Check query performance
npm run db:analyze
```

#### High Memory Usage
```bash
# Check memory usage
npm run debug:memory

# Restart with memory limit
node --max-old-space-size=1024 src/app.js
```

### Security Issues

#### Invalid JWT Tokens
```bash
# Clear all sessions
npm run auth:clear-sessions

# Regenerate JWT secret
npm run auth:generate-secret
```

#### CORS Errors
```bash
# Update CORS configuration in .env
CORS_ORIGIN=http://localhost:3000,https://yourdomain.com
```

---

## 📞 Support & Resources

### Getting Help

#### Documentation
- **API Docs**: `/API_DOCUMENTATION.md`
- **User Guide**: `/USER_GUIDE.md`
- **Architecture**: `/SYSTEM_ARCHITECTURE.md`
- **Deployment**: `/PRODUCTION_DEPLOYMENT_GUIDE.md`

#### Community Support
- **GitHub Issues**: Report bugs and request features
- **Discussions**: Community Q&A and tips
- **Wiki**: Additional documentation and examples

#### Professional Support
- **Email**: support@footballacademy.com
- **Phone**: +36-XX-XXX-XXXX
- **Commercial Support**: Available for enterprise deployments

### Useful Commands Reference

```bash
# Application Management
npm start                    # Start production server
npm run dev                  # Start development server
npm test                     # Run test suite
npm run build               # Build for production

# Database Management
npm run db:create           # Create database tables
npm run db:migrate          # Run database migrations
npm run db:seed            # Seed with sample data
npm run db:backup          # Create database backup

# User Management
npm run create:admin       # Create administrator
npm run create:user        # Create new user
npm run list:users         # List all users
npm run reset:password     # Reset user password

# System Maintenance
npm run logs               # View application logs
npm run health             # Check system health
npm run cleanup            # Clean temporary files
npm run update             # Update dependencies
```

---

## 🎯 Next Steps

### After Installation
1. **Customize Academy Settings**: Update academy name, logo, colors
2. **Import Existing Data**: Migrate from current systems if applicable
3. **Train Staff**: Provide training for administrators and coaches
4. **Set Up Backups**: Configure automated backup procedures
5. **Monitor Performance**: Set up monitoring and alerting

### Scaling Considerations
- **Database**: Migrate to PostgreSQL for larger academies
- **Caching**: Implement Redis for high-traffic scenarios
- **Load Balancing**: Use multiple server instances
- **CDN**: Use content delivery network for static assets
- **Monitoring**: Implement comprehensive monitoring solution

### Feature Enhancements
- **Mobile App**: Develop iOS/Android applications
- **Payment Integration**: Add fee collection functionality
- **Advanced Analytics**: Implement AI-powered insights
- **Third-party Integration**: Connect with external systems
- **Multi-language Support**: Add internationalization

---

**Installation Guide Version**: 1.0  
**Last Updated**: December 2024  
**Compatibility**: Node.js 18+, All major browsers

*Your Lion Football Academy system is now ready to transform your academy operations!*