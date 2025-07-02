# Lion Football Academy - System Architecture Documentation

## 🏗️ Architecture Overview

The Lion Football Academy system is built using a modern, scalable architecture designed to handle the comprehensive management of a football academy with multiple user roles, real-time data updates, and secure family access controls.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     CLIENT LAYER                                │
├─────────────────────────────────────────────────────────────────┤
│  Web App (React)  │  Mobile App    │  Admin Dashboard           │
│  - Parent Portal  │  - iOS/Android │  - System Management       │
│  - Coach Portal   │  - Offline     │  - Analytics & Reports     │
│  - Player Portal  │  - Real-time   │  - User Management         │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    API GATEWAY LAYER                           │
├─────────────────────────────────────────────────────────────────┤
│  Nginx Reverse Proxy                                           │
│  - SSL Termination        │  - Rate Limiting                   │
│  - Load Balancing         │  - Request Routing                 │
│  - Static File Serving    │  - Security Headers                │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                  APPLICATION LAYER                              │
├─────────────────────────────────────────────────────────────────┤
│                   Node.js + Express.js                         │
├─────────────────┬─────────────────┬─────────────────────────────┤
│ Authentication  │ Business Logic  │ Real-time Features          │
│ - JWT Tokens    │ - Team Mgmt     │ - WebSocket Events          │
│ - Role-based    │ - Player Mgmt   │ - Live Match Updates        │
│ - Session Mgmt  │ - Match Mgmt    │ - Notifications             │
│                 │ - Family System │                             │
├─────────────────┼─────────────────┼─────────────────────────────┤
│ Data Access     │ External APIs   │ File Management             │
│ - ORM/Query     │ - Email Service │ - Upload Handling           │
│ - Caching       │ - SMS Gateway   │ - Image Processing          │
│ - Validation    │ - Analytics     │ - Backup Services           │
└─────────────────┴─────────────────┴─────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DATA LAYER                                   │
├─────────────────────────────────────────────────────────────────┤
│  Primary Database (SQLite/PostgreSQL)                          │
│  - User Data           │ - Match Data        │ - Family Data    │
│  - Team Data           │ - Training Data     │ - Notifications  │
│  - Player Data         │ - Performance Data  │ - Audit Logs     │
├─────────────────────────────────────────────────────────────────┤
│  File Storage                                                   │
│  - Profile Photos      │ - Match Videos      │ - Documents      │
│  - Training Videos     │ - Report Files      │ - Backups        │
└─────────────────────────────────────────────────────────────────┘
```

## 🛠️ Technology Stack

### Backend Technologies
- **Runtime**: Node.js 18.x
- **Framework**: Express.js 4.x
- **Database**: SQLite (Development), PostgreSQL (Production)
- **Authentication**: JWT (JSON Web Tokens)
- **Process Manager**: PM2
- **API Documentation**: Swagger/OpenAPI

### Frontend Technologies
- **Framework**: React 18.x
- **State Management**: Redux Toolkit
- **UI Components**: Material-UI / Ant Design
- **Routing**: React Router
- **HTTP Client**: Axios
- **Real-time**: Socket.io Client

### Infrastructure
- **Web Server**: Nginx
- **SSL/TLS**: Let's Encrypt
- **Monitoring**: PM2 Monitoring
- **Logging**: Winston + Morgan
- **Backup**: Automated SQLite/PostgreSQL backups

### Development Tools
- **Version Control**: Git
- **Package Manager**: npm
- **Testing**: Jest + Supertest
- **Code Quality**: ESLint + Prettier
- **CI/CD**: GitHub Actions

## 📊 Database Architecture

### Entity Relationship Diagram

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│    Users    │    │    Teams    │    │   Players   │
├─────────────┤    ├─────────────┤    ├─────────────┤
│ id (PK)     │◄──┐│ id (PK)     │◄──┐│ id (PK)     │
│ username    │   ││ name        │   ││ name        │
│ email       │   ││ age_group   │   ││ birth_date  │
│ password    │   ││ coach_id FK │───┘│ team_id FK  │───┘
│ role        │   ││ founded_yr  │    │ position    │
│ team_id FK  │───┘│ venue       │    │ jersey_no   │
│ player_id   │    │ color       │    │ height_cm   │
│ active      │    │ active      │    │ weight_kg   │
│ created_at  │    │ created_at  │    │ active      │
└─────────────┘    └─────────────┘    └─────────────┘
       │                                      │
       │                                      │
       ▼                                      ▼
┌─────────────────────┐              ┌─────────────┐
│ Parent_Child_Rel    │              │   Matches   │
├─────────────────────┤              ├─────────────┤
│ id (PK)             │              │ id (PK)     │
│ parent_id (FK)      │              │ home_tm FK  │
│ child_id (FK)       │              │ away_tm FK  │
│ relationship_type   │              │ match_date  │
│ custody_type        │              │ match_time  │
│ primary_contact     │              │ venue       │
│ can_view_medical    │              │ home_score  │
│ can_view_performance│              │ away_score  │
│ can_receive_notifs  │              │ status      │
│ active             │              │ season      │
└─────────────────────┘              └─────────────┘
                                            │
                                            ▼
                                   ┌─────────────────┐
                                   │ Player_Match_   │
                                   │ Performance     │
                                   ├─────────────────┤
                                   │ id (PK)         │
                                   │ player_id (FK)  │
                                   │ match_id (FK)   │
                                   │ minutes_played  │
                                   │ goals           │
                                   │ assists         │
                                   │ yellow_cards    │
                                   │ red_cards       │
                                   │ rating          │
                                   └─────────────────┘
```

### Database Tables Overview

#### Core Tables
1. **users** - System users (admins, coaches, parents)
2. **teams** - Football teams with age groups
3. **players** - Individual players with detailed profiles
4. **matches** - Match fixtures and results
5. **trainings** - Training sessions and attendance

#### Family System Tables
6. **parent_child_relationships** - Links parents to their children
7. **family_notifications** - Parent-specific notifications
8. **family_privacy_settings** - Privacy controls per family
9. **parent_activity_log** - Audit trail for parent actions

#### Performance & Development Tables
10. **player_match_performance** - Individual match performance
11. **development_plans** - Player development goals
12. **injuries** - Injury tracking and medical records
13. **skill_assessments** - Technical skill evaluations

#### External Integration Tables
14. **external_teams** - Opponent teams from other academies
15. **match_events** - Goals, cards, substitutions
16. **team_statistics** - Aggregated team performance data

### Database Performance Optimization

#### Indexing Strategy
```sql
-- Primary performance indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_players_team ON players(team_id);
CREATE INDEX idx_matches_date ON matches(match_date);
CREATE INDEX idx_matches_status ON matches(match_status);

-- Family system indexes
CREATE INDEX idx_parent_child_parent ON parent_child_relationships(parent_id);
CREATE INDEX idx_parent_child_child ON parent_child_relationships(child_id);
CREATE INDEX idx_parent_child_active ON parent_child_relationships(active);

-- Performance tracking indexes
CREATE INDEX idx_performance_player ON player_match_performance(player_id);
CREATE INDEX idx_performance_match ON player_match_performance(match_id);
CREATE INDEX idx_notifications_parent ON family_notifications(parent_id);
```

#### Query Optimization
- Use prepared statements for all database queries
- Implement connection pooling for high-traffic endpoints
- Cache frequently accessed data using in-memory caching
- Optimize JOIN operations with proper indexing
- Regular VACUUM operations for SQLite maintenance

## 🔐 Security Architecture

### Authentication & Authorization

#### JWT Token Structure
```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "id": 123,
    "username": "john_coach",
    "email": "john@academy.com",
    "role": "coach",
    "team_id": 5,
    "iat": 1701234567,
    "exp": 1701320967,
    "iss": "football-academy",
    "sub": "123"
  }
}
```

#### Role-Based Access Control (RBAC)

```javascript
const permissions = {
  admin: [
    'users:read', 'users:write', 'users:delete',
    'teams:read', 'teams:write', 'teams:delete',
    'players:read', 'players:write', 'players:delete',
    'matches:read', 'matches:write', 'matches:delete',
    'reports:read', 'system:configure'
  ],
  coach: [
    'teams:read', 'teams:write',
    'players:read', 'players:write',
    'matches:read', 'matches:write',
    'trainings:read', 'trainings:write',
    'performance:read', 'performance:write'
  ],
  parent: [
    'children:read',
    'child_performance:read',
    'child_medical:read',
    'child_development:read',
    'notifications:read'
  ]
};
```

### Data Security

#### Encryption
- **Passwords**: bcrypt with salt rounds (12)
- **Sensitive Data**: AES-256 encryption for PII
- **Communications**: TLS 1.3 for all client-server communication
- **Database**: Encrypted database files in production

#### Input Validation & Sanitization
```javascript
const validationRules = {
  user: {
    username: 'required|string|min:3|max:50|alphanum',
    email: 'required|email|max:255',
    password: 'required|string|min:8|max:128|complexity',
    full_name: 'required|string|min:2|max:100|safe_html',
    role: 'required|in:admin,coach,parent'
  },
  player: {
    name: 'required|string|min:2|max:100|safe_html',
    birth_date: 'required|date|before:today',
    position: 'required|string|max:50',
    team_id: 'required|integer|exists:teams,id'
  }
};
```

### Privacy Controls

#### Family Data Isolation
- Parents can only access their own children's data
- Cross-family data leakage prevention
- Granular permission controls per relationship
- Audit logging for all family data access

#### GDPR Compliance
- Data minimization principles
- Right to erasure implementation
- Data portability features
- Consent management system
- Regular data retention reviews

## 📡 API Architecture

### RESTful API Design

#### URL Structure
```
/api/v1/{resource}/{id?}/{sub-resource?}/{action?}

Examples:
GET    /api/v1/users                    # List users
GET    /api/v1/users/123               # Get specific user
POST   /api/v1/users                   # Create user
PUT    /api/v1/users/123               # Update user
DELETE /api/v1/users/123               # Delete user
GET    /api/v1/users/123/teams         # Get user's teams
POST   /api/v1/matches/456/result      # Record match result
```

#### Response Format
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 123,
      "username": "john_doe",
      "email": "john@academy.com"
    }
  },
  "meta": {
    "timestamp": "2024-12-01T10:30:00Z",
    "version": "1.0",
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150
    }
  }
}
```

#### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "email": "Invalid email format",
      "password": "Password too weak"
    }
  },
  "meta": {
    "timestamp": "2024-12-01T10:30:00Z",
    "request_id": "uuid-here"
  }
}
```

### Rate Limiting & Throttling

#### Rate Limit Configuration
```javascript
const rateLimits = {
  '/api/auth/login': {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    message: 'Too many login attempts'
  },
  '/api/**': {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: 'Rate limit exceeded'
  },
  '/api/uploads/**': {
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 uploads per minute
    message: 'Upload rate limit exceeded'
  }
};
```

## 🔄 Real-time Features

### WebSocket Architecture

#### Connection Management
```javascript
const socketEvents = {
  // Match events
  'match:goal': (data) => broadcast_to_team_followers(data),
  'match:result': (data) => broadcast_to_parents(data),
  
  // Training events
  'training:attendance': (data) => notify_parents(data),
  'training:cancelled': (data) => broadcast_to_team(data),
  
  // Family events
  'notification:new': (data) => send_to_parent(data),
  'development:updated': (data) => notify_family(data)
};
```

#### Real-time Data Flow
```
Coach Updates Match → WebSocket Server → Parent Apps
Training Changes → WebSocket Server → Team Members
Injury Reports → WebSocket Server → Family + Medical Staff
Development Progress → WebSocket Server → Parents
```

## 📈 Performance Architecture

### Caching Strategy

#### Multi-Level Caching
```javascript
const cacheConfig = {
  // Level 1: In-memory application cache
  memory: {
    teams: { ttl: 300 }, // 5 minutes
    users: { ttl: 600 }, // 10 minutes
    static_data: { ttl: 3600 } // 1 hour
  },
  
  // Level 2: Redis cache (if implemented)
  redis: {
    session_data: { ttl: 1800 }, // 30 minutes
    match_results: { ttl: 7200 }, // 2 hours
    statistics: { ttl: 3600 } // 1 hour
  },
  
  // Level 3: CDN cache for static assets
  cdn: {
    images: { ttl: 86400 }, // 24 hours
    documents: { ttl: 3600 }, // 1 hour
    api_responses: { ttl: 300 } // 5 minutes
  }
};
```

### Database Performance

#### Connection Pooling
```javascript
const dbConfig = {
  production: {
    max: 20, // Maximum connections
    min: 5,  // Minimum connections
    idle: 10000, // 10 seconds
    acquire: 60000, // 60 seconds
    evict: 1000 // 1 second
  },
  development: {
    max: 5,
    min: 1,
    idle: 10000,
    acquire: 60000,
    evict: 1000
  }
};
```

#### Query Optimization
- Prepare statements for repeated queries
- Use database views for complex reporting queries
- Implement query result caching
- Regular query performance analysis
- Index optimization based on query patterns

### Load Balancing

#### Nginx Configuration
```nginx
upstream football_academy {
    least_conn;
    server 127.0.0.1:3000 weight=3;
    server 127.0.0.1:3001 weight=2;
    server 127.0.0.1:3002 weight=2;
    keepalive 32;
}

server {
    listen 443 ssl http2;
    
    location /api {
        proxy_pass http://football_academy;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # Health checks
        proxy_next_upstream error timeout invalid_header http_500 http_502 http_503;
        proxy_connect_timeout 2s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

## 🔍 Monitoring & Logging

### Application Monitoring

#### Key Metrics
- **Performance Metrics**: Response times, throughput, error rates
- **Business Metrics**: User registrations, match recordings, family engagement
- **System Metrics**: CPU usage, memory usage, database performance
- **Security Metrics**: Failed login attempts, suspicious activities

#### Logging Strategy
```javascript
const logConfig = {
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4
  },
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log' 
    }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
};
```

### Health Checks

#### System Health Endpoints
```javascript
// Health check endpoints
GET /health              // Basic application health
GET /health/db          // Database connectivity
GET /health/detailed    // Comprehensive system status

// Example response
{
  "status": "healthy",
  "timestamp": "2024-12-01T10:30:00Z",
  "uptime": 3600,
  "version": "1.0.0",
  "checks": {
    "database": { "status": "healthy", "response_time": "2ms" },
    "external_apis": { "status": "healthy" },
    "memory_usage": { "status": "healthy", "usage": "45%" },
    "disk_space": { "status": "healthy", "free": "75%" }
  }
}
```

## 🚀 Deployment Architecture

### Production Environment

#### Infrastructure Components
```yaml
# Docker Compose example
version: '3.8'
services:
  app:
    image: football-academy:latest
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://...
    volumes:
      - ./uploads:/app/uploads
      - ./logs:/app/logs
    restart: unless-stopped
    
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/ssl
    depends_on:
      - app
    restart: unless-stopped
    
  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=football_academy
      - POSTGRES_USER=academy_user
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    restart: unless-stopped

volumes:
  postgres_data:
```

### Backup Strategy

#### Automated Backups
```bash
#!/bin/bash
# Daily backup script

BACKUP_DIR="/var/backups/football-academy"
DATE=$(date +%Y%m%d_%H%M%S)

# Database backup
pg_dump football_academy > "$BACKUP_DIR/db_$DATE.sql"

# File uploads backup
tar -czf "$BACKUP_DIR/uploads_$DATE.tar.gz" /var/www/football-academy/uploads

# Configuration backup
tar -czf "$BACKUP_DIR/config_$DATE.tar.gz" /var/www/football-academy/.env /etc/nginx/sites-available/

# Cleanup old backups (keep 30 days)
find $BACKUP_DIR -type f -mtime +30 -delete
```

### Scaling Considerations

#### Horizontal Scaling
- Stateless application design for easy scaling
- Session storage in external cache (Redis)
- File storage on shared filesystem or object storage
- Database read replicas for query scaling
- Load balancer configuration for multiple app instances

#### Vertical Scaling
- Memory optimization for large datasets
- CPU optimization for intensive calculations
- Database tuning for performance
- SSD storage for faster I/O operations

## 📊 Data Flow Architecture

### User Registration Flow
```
1. User submits registration form
2. Frontend validates input
3. API validates and sanitizes data
4. Check for existing username/email
5. Hash password with bcrypt
6. Create user record in database
7. Generate JWT tokens
8. Send welcome email (if configured)
9. Return success response with tokens
10. Frontend redirects to dashboard
```

### Match Recording Flow
```
1. Coach accesses match recording interface
2. Select match from upcoming fixtures
3. Enter match details (score, duration, etc.)
4. Record individual player performances
5. Add match notes and observations
6. Submit match result
7. System validates all data
8. Update database with match result
9. Generate notifications for parents
10. Update team and player statistics
11. Send real-time updates via WebSocket
```

### Parent Dashboard Flow
```
1. Parent logs in with credentials
2. System validates JWT token
3. Retrieve parent-child relationships
4. Query child performance data
5. Check notification permissions
6. Aggregate dashboard data
7. Apply privacy filters
8. Return personalized dashboard
9. Cache results for performance
10. Enable real-time updates
```

## 🔮 Future Architecture Considerations

### Microservices Migration
- User Management Service
- Team Management Service
- Match Management Service
- Family Management Service
- Notification Service
- Analytics Service

### Cloud Native Features
- Kubernetes orchestration
- Service mesh implementation
- Distributed caching
- Message queues for async processing
- Event-driven architecture

### Advanced Analytics
- Machine learning for player development
- Performance prediction models
- Injury risk assessment
- Talent identification algorithms
- Automated report generation

---

## 📞 Architecture Support

### Development Team
- **System Architect**: architect@footballacademy.com
- **Database Administrator**: dba@footballacademy.com
- **DevOps Engineer**: devops@footballacademy.com
- **Security Engineer**: security@footballacademy.com

### Documentation Maintenance
This architecture document is maintained alongside the codebase and updated with each major release. For questions or suggestions regarding the system architecture, please contact the development team.

---

*Last Updated: December 2024*
*Architecture Version: 1.0*