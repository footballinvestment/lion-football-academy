# Lion Football Academy - System Architecture

## Table of Contents
1. [Overview](#overview)
2. [High-Level Architecture](#high-level-architecture)
3. [Frontend Architecture](#frontend-architecture)
4. [Backend Architecture](#backend-architecture)
5. [Database Design](#database-design)
6. [Infrastructure](#infrastructure)
7. [Security Architecture](#security-architecture)
8. [Monitoring & Observability](#monitoring--observability)
9. [Deployment Architecture](#deployment-architecture)
10. [Scalability Considerations](#scalability-considerations)

## Overview

The Lion Football Academy system is built using a modern, scalable architecture designed to support multiple user roles (admin, coach, parent, player) with comprehensive football academy management capabilities.

### Technology Stack

#### Frontend
- **Framework**: React 18+ with TypeScript
- **State Management**: Redux Toolkit + RTK Query
- **UI Components**: Material-UI (MUI) v5
- **Build Tool**: Vite
- **Testing**: Jest + React Testing Library
- **Mobile**: Progressive Web App (PWA)

#### Backend
- **Runtime**: Node.js 18+ with Express.js
- **Language**: JavaScript (ES2022)
- **Authentication**: JWT with refresh tokens
- **Database**: SQLite (development), PostgreSQL (production)
- **File Storage**: Local filesystem + AWS S3
- **Task Queue**: Bull Queue with Redis

#### Infrastructure
- **Hosting**: AWS/DigitalOcean
- **CDN**: CloudFlare
- **Load Balancer**: NGINX
- **Reverse Proxy**: NGINX
- **SSL**: Let's Encrypt
- **Monitoring**: Custom monitoring stack

## High-Level Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        PWA[Progressive Web App]
        Mobile[Mobile Browser]
        Desktop[Desktop Browser]
    end
    
    subgraph "CDN & Load Balancer"
        CF[CloudFlare CDN]
        LB[NGINX Load Balancer]
    end
    
    subgraph "Application Layer"
        API[Express.js API Server]
        Auth[Authentication Service]
        QR[QR Code Service]
        File[File Upload Service]
    end
    
    subgraph "Business Logic Layer"
        UserMgmt[User Management]
        TeamMgmt[Team Management]
        TrainingMgmt[Training Management]
        PerformanceMgmt[Performance Analytics]
        BillingMgmt[Billing Management]
        CommMgmt[Communication Management]
    end
    
    subgraph "Data Layer"
        MainDB[(Main Database)]
        Redis[(Redis Cache)]
        S3[AWS S3 Storage]
        BackupDB[(Backup Database)]
    end
    
    subgraph "External Services"
        Stripe[Stripe Payments]
        Email[Email Service]
        SMS[SMS Service]
        Analytics[Analytics Service]
    end
    
    subgraph "Monitoring & Logging"
        Monitor[Monitoring Service]
        Logs[Centralized Logging]
        Alerts[Alert System]
        Backup[Backup Service]
    end
    
    PWA --> CF
    Mobile --> CF
    Desktop --> CF
    CF --> LB
    LB --> API
    
    API --> Auth
    API --> QR
    API --> File
    
    Auth --> UserMgmt
    QR --> TrainingMgmt
    File --> UserMgmt
    
    UserMgmt --> MainDB
    TeamMgmt --> MainDB
    TrainingMgmt --> MainDB
    PerformanceMgmt --> MainDB
    BillingMgmt --> MainDB
    CommMgmt --> MainDB
    
    API --> Redis
    File --> S3
    MainDB --> BackupDB
    
    BillingMgmt --> Stripe
    CommMgmt --> Email
    CommMgmt --> SMS
    API --> Analytics
    
    API --> Monitor
    Monitor --> Logs
    Monitor --> Alerts
    Monitor --> Backup
```

## Frontend Architecture

### Component Structure
```
src/
├── components/           # Reusable UI components
│   ├── common/          # Common components (buttons, forms, etc.)
│   ├── layout/          # Layout components (header, sidebar, etc.)
│   └── features/        # Feature-specific components
├── pages/               # Page components
│   ├── auth/           # Authentication pages
│   ├── dashboard/      # Dashboard pages
│   ├── teams/          # Team management pages
│   ├── training/       # Training management pages
│   └── performance/    # Performance analytics pages
├── hooks/              # Custom React hooks
├── services/           # API services and external integrations
├── store/              # Redux store configuration
│   ├── slices/         # Redux Toolkit slices
│   └── api/            # RTK Query API definitions
├── utils/              # Utility functions
├── types/              # TypeScript type definitions
└── assets/             # Static assets
```

### State Management Architecture

#### Redux Store Structure
```typescript
interface RootState {
  auth: AuthState;           // User authentication state
  users: UsersState;         // User management state
  teams: TeamsState;         // Team management state
  trainings: TrainingsState; // Training session state
  performance: PerformanceState; // Performance analytics state
  ui: UIState;               // UI state (modals, notifications, etc.)
  cache: CacheState;         // Client-side caching
}
```

#### Data Flow
```mermaid
graph LR
    Component --> Action
    Action --> Reducer
    Reducer --> Store
    Store --> Component
    
    Component --> RTKQuery
    RTKQuery --> API
    API --> Cache
    Cache --> Component
```

### Component Design Patterns

#### Higher-Order Components (HOCs)
- `withAuth`: Authentication wrapper
- `withPermissions`: Role-based access control
- `withErrorBoundary`: Error handling wrapper

#### Custom Hooks
- `useAuth`: Authentication state and actions
- `usePermissions`: Permission checking
- `useLocalStorage`: Local storage management
- `useDebounce`: Input debouncing
- `useWebSocket`: Real-time communication

#### Component Example
```typescript
interface TrainingListProps {
  teamId: string;
  dateRange: DateRange;
}

const TrainingList: React.FC<TrainingListProps> = ({ teamId, dateRange }) => {
  const { data: trainings, isLoading, error } = useGetTrainingsQuery({
    teamId,
    dateFrom: dateRange.start,
    dateTo: dateRange.end
  });

  const [createTraining] = useCreateTrainingMutation();
  
  const handleCreateTraining = useCallback(async (trainingData: CreateTrainingData) => {
    try {
      await createTraining(trainingData).unwrap();
      // Handle success
    } catch (error) {
      // Handle error
    }
  }, [createTraining]);

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <TrainingListContainer>
      {trainings?.map(training => (
        <TrainingCard key={training.id} training={training} />
      ))}
    </TrainingListContainer>
  );
};
```

## Backend Architecture

### Service Layer Architecture
```
src/
├── controllers/          # Request handlers
│   ├── auth.js          # Authentication endpoints
│   ├── users.js         # User management endpoints
│   ├── teams.js         # Team management endpoints
│   ├── trainings.js     # Training management endpoints
│   └── performance.js   # Performance analytics endpoints
├── services/            # Business logic services
│   ├── userService.js   # User management logic
│   ├── teamService.js   # Team management logic
│   ├── trainingService.js # Training management logic
│   ├── performanceService.js # Performance analytics logic
│   ├── qrCodeService.js # QR code generation and validation
│   ├── billingService.js # Payment processing
│   └── notificationService.js # Communication services
├── middleware/          # Express middleware
│   ├── auth.js         # Authentication middleware
│   ├── validation.js   # Request validation middleware
│   ├── rateLimit.js    # Rate limiting middleware
│   └── errorHandler.js # Error handling middleware
├── models/             # Database models
├── database/           # Database configuration and migrations
├── utils/              # Utility functions
└── config/             # Configuration files
```

### Service Layer Pattern

#### User Service Example
```javascript
class UserService {
  async createUser(userData) {
    // Validate input
    const validatedData = await this.validateUserData(userData);
    
    // Check for existing user
    const existingUser = await this.findUserByEmail(validatedData.email);
    if (existingUser) {
      throw new ConflictError('User already exists');
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 12);
    
    // Create user
    const user = await User.create({
      ...validatedData,
      password: hashedPassword
    });
    
    // Send welcome email
    await this.notificationService.sendWelcomeEmail(user);
    
    // Log user creation
    this.logger.info('User created', { userId: user.id, email: user.email });
    
    return user;
  }

  async updateUser(userId, updateData) {
    const user = await this.findUserById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const updatedUser = await user.update(updateData);
    
    this.logger.info('User updated', { userId, updatedFields: Object.keys(updateData) });
    
    return updatedUser;
  }
}
```

### API Route Structure

#### RESTful Route Design
```javascript
// Authentication routes
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
POST   /api/v1/auth/refresh
POST   /api/v1/auth/password-reset

// User management routes
GET    /api/v1/users              # List users (admin only)
POST   /api/v1/users              # Create user (admin only)
GET    /api/v1/users/me           # Get current user
PUT    /api/v1/users/me           # Update current user
GET    /api/v1/users/:id          # Get user by ID
PUT    /api/v1/users/:id          # Update user (admin/self only)
DELETE /api/v1/users/:id          # Delete user (admin only)

// Team management routes
GET    /api/v1/teams              # List teams
POST   /api/v1/teams              # Create team (coach/admin)
GET    /api/v1/teams/:id          # Get team details
PUT    /api/v1/teams/:id          # Update team (coach/admin)
DELETE /api/v1/teams/:id          # Delete team (admin only)
POST   /api/v1/teams/:id/players  # Add player to team
DELETE /api/v1/teams/:id/players/:playerId # Remove player from team

// Training management routes
GET    /api/v1/trainings          # List training sessions
POST   /api/v1/trainings          # Create training session
GET    /api/v1/trainings/:id      # Get training details
PUT    /api/v1/trainings/:id      # Update training session
DELETE /api/v1/trainings/:id      # Delete training session
POST   /api/v1/trainings/:id/attendance # Mark attendance
```

### Middleware Stack

#### Request Processing Pipeline
```javascript
app.use(cors());                    // CORS handling
app.use(helmet());                  // Security headers
app.use(morgan('combined'));        // Request logging
app.use(compression());             // Response compression
app.use(express.json({ limit: '10mb' })); // JSON parsing
app.use(express.urlencoded({ extended: true })); // URL encoding
app.use(rateLimit);                 // Rate limiting
app.use('/api/v1', apiRoutes);      // API routes
app.use(errorHandler);              // Error handling
```

## Database Design

### Entity Relationship Diagram
```mermaid
erDiagram
    Users ||--o{ Teams : coaches
    Users ||--o{ TeamPlayers : players
    Users ||--o{ TrainingAttendance : attendance
    Users ||--o{ PerformanceData : performance
    Users ||--o{ Payments : billing
    
    Teams ||--o{ TeamPlayers : has
    Teams ||--o{ TrainingSessions : has
    
    TrainingSessions ||--o{ TrainingAttendance : attendance
    TrainingSessions ||--o{ PerformanceData : performance
    TrainingSessions ||--o{ QRCodes : qr_codes
    
    Users {
        string id PK
        string email UK
        string password_hash
        enum user_type
        json profile
        json preferences
        datetime created_at
        datetime updated_at
        datetime last_login
    }
    
    Teams {
        string id PK
        string name
        string age_group
        string coach_id FK
        text description
        int max_players
        string season
        enum status
        datetime created_at
        datetime updated_at
    }
    
    TeamPlayers {
        string team_id FK
        string player_id FK
        datetime joined_at
        enum status
        text notes
    }
    
    TrainingSessions {
        string id PK
        string team_id FK
        string coach_id FK
        string title
        text description
        date date
        time start_time
        time end_time
        string location
        int max_participants
        enum status
        json weather_conditions
        datetime created_at
        datetime updated_at
    }
    
    TrainingAttendance {
        string id PK
        string training_id FK
        string player_id FK
        enum status
        datetime check_in_time
        datetime check_out_time
        text notes
        datetime created_at
    }
    
    PerformanceData {
        string id PK
        string player_id FK
        string training_id FK
        string recorded_by FK
        json metrics
        text notes
        int rating
        datetime recorded_at
    }
```

### Database Schema Design Principles

#### Normalization
- **3NF Compliance**: All tables follow Third Normal Form
- **Referential Integrity**: Foreign key constraints ensure data consistency
- **Index Strategy**: Optimized indexes for query performance

#### Data Types and Constraints
```sql
-- Users table with constraints
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    user_type user_type_enum NOT NULL,
    profile JSONB NOT NULL DEFAULT '{}',
    preferences JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT valid_user_type CHECK (user_type IN ('admin', 'coach', 'parent', 'player'))
);

-- Performance data with JSON validation
CREATE TABLE performance_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    training_id UUID NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
    recorded_by UUID NOT NULL REFERENCES users(id),
    metrics JSONB NOT NULL,
    notes TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 10),
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_metrics CHECK (
        metrics ? 'goals_scored' AND 
        metrics ? 'passes_completed' AND
        (metrics->>'goals_scored')::int >= 0 AND
        (metrics->>'passes_completed')::int >= 0
    )
);
```

#### Indexing Strategy
```sql
-- Primary indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_type ON users(user_type);
CREATE INDEX idx_teams_coach ON teams(coach_id);
CREATE INDEX idx_training_sessions_team_date ON training_sessions(team_id, date);
CREATE INDEX idx_performance_player_date ON performance_data(player_id, recorded_at);
CREATE INDEX idx_attendance_training_player ON training_attendance(training_id, player_id);

-- Composite indexes for complex queries
CREATE INDEX idx_training_team_status_date ON training_sessions(team_id, status, date);
CREATE INDEX idx_performance_metrics_gin ON performance_data USING GIN(metrics);

-- Partial indexes for active records
CREATE INDEX idx_active_teams ON teams(id) WHERE status = 'active';
CREATE INDEX idx_scheduled_trainings ON training_sessions(date, start_time) WHERE status = 'scheduled';
```

## Infrastructure

### Deployment Architecture

#### Production Environment
```mermaid
graph TB
    subgraph "Load Balancer Layer"
        LB1[NGINX Load Balancer 1]
        LB2[NGINX Load Balancer 2]
    end
    
    subgraph "Application Layer"
        APP1[App Server 1]
        APP2[App Server 2]
        APP3[App Server 3]
    end
    
    subgraph "Database Layer"
        DB_PRIMARY[(Primary Database)]
        DB_REPLICA1[(Read Replica 1)]
        DB_REPLICA2[(Read Replica 2)]
    end
    
    subgraph "Cache Layer"
        REDIS1[(Redis Master)]
        REDIS2[(Redis Slave)]
    end
    
    subgraph "Storage Layer"
        S3[AWS S3]
        BACKUP[Backup Storage]
    end
    
    Internet --> LB1
    Internet --> LB2
    
    LB1 --> APP1
    LB1 --> APP2
    LB2 --> APP2
    LB2 --> APP3
    
    APP1 --> DB_PRIMARY
    APP2 --> DB_PRIMARY
    APP3 --> DB_PRIMARY
    
    APP1 --> DB_REPLICA1
    APP2 --> DB_REPLICA1
    APP3 --> DB_REPLICA2
    
    APP1 --> REDIS1
    APP2 --> REDIS1
    APP3 --> REDIS1
    
    REDIS1 --> REDIS2
    
    APP1 --> S3
    APP2 --> S3
    APP3 --> S3
    
    DB_PRIMARY --> BACKUP
```

#### Container Architecture (Docker)
```dockerfile
# Multi-stage build for production
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS runtime
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .

USER nextjs
EXPOSE 5001
CMD ["npm", "start"]
```

#### Environment Configuration
```yaml
# docker-compose.yml for local development
version: '3.8'
services:
  app:
    build: .
    ports:
      - "5001:5001"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://user:pass@db:5432/lfa_dev
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis
    volumes:
      - ./src:/app/src
      - ./uploads:/app/uploads

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=lfa_dev
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### CI/CD Pipeline

#### GitHub Actions Workflow
```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/test
      
      - name: Run security audit
        run: npm audit
      
      - name: Build application
        run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to production
        run: |
          # Deployment script
          ./scripts/deploy.sh production
        env:
          DEPLOY_KEY: ${{ secrets.DEPLOY_KEY }}
```

## Security Architecture

### Authentication & Authorization

#### JWT Token Structure
```json
{
  "header": {
    "typ": "JWT",
    "alg": "HS256"
  },
  "payload": {
    "sub": "user_123",
    "email": "user@example.com",
    "user_type": "coach",
    "permissions": ["read:teams", "write:trainings"],
    "iat": 1640995200,
    "exp": 1641081600
  }
}
```

#### Role-Based Access Control (RBAC)
```javascript
const permissions = {
  admin: [
    'read:*',
    'write:*',
    'delete:*',
    'manage:users',
    'manage:system'
  ],
  coach: [
    'read:teams',
    'write:teams',
    'read:players',
    'write:trainings',
    'write:performance',
    'read:analytics'
  ],
  parent: [
    'read:own_child',
    'read:child_performance',
    'read:child_trainings',
    'write:own_profile'
  ],
  player: [
    'read:own_profile',
    'write:own_profile',
    'read:own_performance',
    'read:own_trainings'
  ]
};
```

#### Security Middleware
```javascript
// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Permission middleware
const requirePermissions = (permissions) => {
  return (req, res, next) => {
    const userPermissions = req.user.permissions || [];
    const hasPermission = permissions.some(permission => 
      userPermissions.includes(permission) || 
      userPermissions.includes('*')
    );

    if (!hasPermission) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};
```

### Data Security

#### Encryption at Rest
- Database: AES-256 encryption for sensitive fields
- File Storage: Server-side encryption on S3
- Backups: Encrypted backup files

#### Encryption in Transit
- TLS 1.3 for all HTTPS connections
- Database connections over SSL
- API communication encrypted

#### Input Validation & Sanitization
```javascript
const userValidationSchema = {
  email: {
    type: 'string',
    format: 'email',
    maxLength: 255
  },
  password: {
    type: 'string',
    minLength: 8,
    pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]'
  },
  profile: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        maxLength: 100,
        pattern: '^[a-zA-Z\\s]+$'
      },
      phone: {
        type: 'string',
        pattern: '^\\+?[1-9]\\d{1,14}$'
      }
    }
  }
};
```

## Monitoring & Observability

### Monitoring Stack Architecture

#### System Components
```mermaid
graph TB
    subgraph "Application Layer"
        APP[Application Servers]
        API[API Endpoints]
    end
    
    subgraph "Monitoring Services"
        ErrorTrack[Error Tracking]
        PerformanceAPM[Performance APM]
        UptimeMonitor[Uptime Monitoring]
        LogCentral[Centralized Logging]
    end
    
    subgraph "Alerting System"
        AlertManager[Alert Manager]
        Slack[Slack Notifications]
        Email[Email Alerts]
        SMS[SMS Alerts]
        PagerDuty[PagerDuty]
    end
    
    subgraph "Analytics & Reporting"
        GA4[Google Analytics 4]
        CustomAnalytics[Custom Analytics]
        Dashboard[Monitoring Dashboard]
    end
    
    APP --> ErrorTrack
    API --> PerformanceAPM
    APP --> UptimeMonitor
    APP --> LogCentral
    
    ErrorTrack --> AlertManager
    PerformanceAPM --> AlertManager
    UptimeMonitor --> AlertManager
    LogCentral --> AlertManager
    
    AlertManager --> Slack
    AlertManager --> Email
    AlertManager --> SMS
    AlertManager --> PagerDuty
    
    APP --> GA4
    APP --> CustomAnalytics
    CustomAnalytics --> Dashboard
```

#### Monitoring Configuration
```javascript
// Performance monitoring thresholds
const monitoringConfig = {
  performance: {
    apiResponseTime: {
      warning: 1000,  // 1 second
      critical: 3000  // 3 seconds
    },
    errorRate: {
      warning: 0.05,  // 5%
      critical: 0.10  // 10%
    },
    memoryUsage: {
      warning: 0.80,  // 80%
      critical: 0.90  // 90%
    }
  },
  uptime: {
    checkInterval: 60000,      // 1 minute
    timeout: 10000,           // 10 seconds
    retryAttempts: 3,
    retryDelay: 5000          // 5 seconds
  },
  logging: {
    levels: ['error', 'warn', 'info', 'debug'],
    retention: {
      error: '30d',
      warn: '14d',
      info: '7d',
      debug: '3d'
    }
  }
};
```

### Health Checks

#### Endpoint Design
```javascript
// Basic health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION,
    uptime: Math.floor(process.uptime())
  });
});

// Detailed health check
app.get('/health/detailed', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: await checkDatabaseHealth(),
      redis: await checkRedisHealth(),
      externalAPIs: await checkExternalServices()
    },
    metrics: {
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      uptime: process.uptime()
    }
  };

  const overallStatus = determineOverallHealth(health.services);
  health.status = overallStatus;

  res.status(overallStatus === 'healthy' ? 200 : 503).json(health);
});
```

## Scalability Considerations

### Horizontal Scaling

#### Load Balancing Strategy
- **Round Robin**: Default load distribution
- **Least Connections**: For optimal resource utilization
- **IP Hash**: For session affinity when needed

#### Auto-scaling Configuration
```yaml
# Kubernetes HPA configuration
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: lfa-app-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: lfa-app
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### Database Scaling

#### Read Replicas
- **Master-Slave Configuration**: Write to master, read from replicas
- **Read Query Routing**: Automatic routing based on query type
- **Replication Lag Monitoring**: Ensure data consistency

#### Query Optimization
```sql
-- Optimized query with proper indexing
EXPLAIN ANALYZE
SELECT 
    p.id,
    p.metrics,
    u.name,
    t.title
FROM performance_data p
INNER JOIN users u ON p.player_id = u.id
INNER JOIN training_sessions t ON p.training_id = t.id
WHERE p.player_id = $1
  AND p.recorded_at >= $2
  AND p.recorded_at <= $3
ORDER BY p.recorded_at DESC
LIMIT 50;

-- Index to support the query
CREATE INDEX CONCURRENTLY idx_performance_player_date_optimized 
ON performance_data(player_id, recorded_at DESC) 
WHERE recorded_at >= '2024-01-01';
```

### Caching Strategy

#### Multi-Level Caching
```javascript
// Cache hierarchy
const cacheStrategy = {
  // Level 1: In-memory cache (fastest)
  memory: {
    ttl: 300,      // 5 minutes
    maxSize: 1000  // 1000 items
  },
  
  // Level 2: Redis cache (fast)
  redis: {
    ttl: 3600,     // 1 hour
    cluster: true
  },
  
  // Level 3: Database (slowest)
  database: {
    connectionPool: {
      min: 5,
      max: 20
    }
  }
};

// Cache implementation
class CacheService {
  async get(key) {
    // Try memory cache first
    let value = this.memoryCache.get(key);
    if (value) return value;
    
    // Try Redis cache
    value = await this.redisCache.get(key);
    if (value) {
      this.memoryCache.set(key, value);
      return value;
    }
    
    // Fall back to database
    value = await this.database.get(key);
    if (value) {
      await this.redisCache.set(key, value, 3600);
      this.memoryCache.set(key, value);
    }
    
    return value;
  }
}
```

### Performance Optimization

#### API Response Optimization
- **Pagination**: Limit response size
- **Field Selection**: Only return requested fields
- **Compression**: GZIP response compression
- **ETags**: Client-side caching headers

#### Database Connection Pooling
```javascript
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  
  // Connection pool settings
  min: 5,                    // Minimum connections
  max: 20,                   // Maximum connections
  idleTimeoutMillis: 30000,  // 30 seconds
  connectionTimeoutMillis: 2000, // 2 seconds
  
  // Performance settings
  statement_timeout: 10000,   // 10 seconds
  query_timeout: 10000,       // 10 seconds
  idle_in_transaction_session_timeout: 30000 // 30 seconds
});
```

This architecture provides a solid foundation for the Lion Football Academy system with considerations for scalability, security, monitoring, and maintainability. The modular design allows for incremental improvements and feature additions while maintaining system stability and performance.