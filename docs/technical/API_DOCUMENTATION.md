# Lion Football Academy - API Documentation

## Table of Contents
1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Rate Limiting](#rate-limiting)
4. [Error Handling](#error-handling)
5. [API Endpoints](#api-endpoints)
6. [Data Models](#data-models)
7. [Usage Examples](#usage-examples)

## Overview

The Lion Football Academy API is a RESTful service that provides comprehensive football academy management capabilities. The API supports multiple user roles (admin, coach, parent, player) with role-based access control.

### Base URL
- **Production**: `https://api.lionfootballacademy.com/v1`
- **Staging**: `https://staging-api.lionfootballacademy.com/v1`
- **Development**: `http://localhost:5001/api/v1`

### API Version
Current version: `v1.0.0`

## Authentication

### JWT Token Authentication
All API endpoints (except public registration) require JWT token authentication.

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "user_type": "coach",
    "profile": {
      "name": "John Doe",
      "phone": "+1234567890"
    }
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "refresh_token_here"
}
```

#### Token Refresh
```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "refresh_token_here"
}
```

### Authorization Header
Include the JWT token in all authenticated requests:
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Rate Limiting

### Limits by User Role
- **Admin**: 1000 requests/hour
- **Coach**: 500 requests/hour
- **Parent**: 300 requests/hour
- **Player**: 200 requests/hour
- **Anonymous**: 100 requests/hour

### Rate Limit Headers
```http
X-RateLimit-Limit: 500
X-RateLimit-Remaining: 499
X-RateLimit-Reset: 1640995200
```

## Error Handling

### Standard Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "field": "email",
      "issue": "Email format is invalid"
    }
  },
  "timestamp": "2024-01-15T10:30:00Z",
  "requestId": "req_123456789"
}
```

### HTTP Status Codes
- **200**: Success
- **201**: Created
- **400**: Bad Request
- **401**: Unauthorized
- **403**: Forbidden
- **404**: Not Found
- **409**: Conflict
- **422**: Validation Error
- **429**: Rate Limit Exceeded
- **500**: Internal Server Error

### Error Codes
- `AUTHENTICATION_FAILED`: Invalid credentials
- `AUTHORIZATION_DENIED`: Insufficient permissions
- `VALIDATION_ERROR`: Request validation failed
- `RESOURCE_NOT_FOUND`: Requested resource doesn't exist
- `RESOURCE_CONFLICT`: Resource already exists
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `INTERNAL_ERROR`: Server error

## API Endpoints

### Authentication Endpoints

#### Register User
```http
POST /auth/register
Content-Type: application/json

{
  "email": "newuser@example.com",
  "password": "securePassword123",
  "user_type": "parent",
  "profile": {
    "name": "Jane Smith",
    "phone": "+1987654321",
    "address": "123 Main St, City, State"
  }
}
```

#### Logout
```http
POST /auth/logout
Authorization: Bearer <token>
```

#### Password Reset
```http
POST /auth/password-reset
Content-Type: application/json

{
  "email": "user@example.com"
}
```

### User Management Endpoints

#### Get Current User Profile
```http
GET /users/me
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "user_type": "coach",
    "profile": {
      "name": "John Doe",
      "phone": "+1234567890",
      "bio": "Experienced football coach",
      "avatar_url": "https://cdn.example.com/avatar.jpg"
    },
    "created_at": "2024-01-01T00:00:00Z",
    "last_login": "2024-01-15T10:00:00Z"
  }
}
```

#### Update User Profile
```http
PUT /users/me
Authorization: Bearer <token>
Content-Type: application/json

{
  "profile": {
    "name": "John Updated Doe",
    "phone": "+1234567890",
    "bio": "Senior football coach with 10 years experience"
  }
}
```

#### List Users (Admin Only)
```http
GET /users?user_type=coach&page=1&limit=20
Authorization: Bearer <token>
```

### Team Management Endpoints

#### Create Team (Coach/Admin)
```http
POST /teams
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Under 16 Lions",
  "age_group": "U16",
  "description": "Competitive team for players under 16",
  "max_players": 25
}
```

#### Get Teams
```http
GET /teams
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "teams": [
    {
      "id": "team_123",
      "name": "Under 16 Lions",
      "age_group": "U16",
      "coach_id": "coach_456",
      "coach_name": "John Doe",
      "player_count": 18,
      "max_players": 25,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "total_pages": 1
  }
}
```

#### Add Player to Team
```http
POST /teams/{team_id}/players
Authorization: Bearer <token>
Content-Type: application/json

{
  "player_id": "player_789"
}
```

### Training Management Endpoints

#### Create Training Session
```http
POST /trainings
Authorization: Bearer <token>
Content-Type: application/json

{
  "team_id": "team_123",
  "title": "Shooting Practice",
  "description": "Focus on accuracy and power",
  "date": "2024-01-20",
  "start_time": "16:00",
  "end_time": "18:00",
  "location": "Main Field"
}
```

#### Get Training Sessions
```http
GET /trainings?team_id=team_123&date_from=2024-01-01&date_to=2024-01-31
Authorization: Bearer <token>
```

#### Mark Attendance
```http
POST /trainings/{training_id}/attendance
Authorization: Bearer <token>
Content-Type: application/json

{
  "player_id": "player_789",
  "status": "present",
  "check_in_time": "2024-01-20T16:05:00Z",
  "notes": "Arrived slightly late"
}
```

### Performance Tracking Endpoints

#### Record Performance Data
```http
POST /performance
Authorization: Bearer <token>
Content-Type: application/json

{
  "player_id": "player_789",
  "training_id": "training_456",
  "metrics": {
    "goals_scored": 3,
    "passes_completed": 45,
    "pass_accuracy": 0.89,
    "distance_covered": 5.2,
    "sprint_count": 12
  },
  "notes": "Excellent performance today"
}
```

#### Get Performance Analytics
```http
GET /performance/analytics/{player_id}?date_from=2024-01-01&date_to=2024-01-31
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "analytics": {
    "player_id": "player_789",
    "period": {
      "from": "2024-01-01",
      "to": "2024-01-31"
    },
    "summary": {
      "training_sessions": 12,
      "total_goals": 18,
      "average_pass_accuracy": 0.87,
      "total_distance": 62.4,
      "improvement_trend": "positive"
    },
    "detailed_metrics": [
      {
        "date": "2024-01-20",
        "training_id": "training_456",
        "metrics": {
          "goals_scored": 3,
          "passes_completed": 45,
          "pass_accuracy": 0.89
        }
      }
    ]
  }
}
```

### QR Code Endpoints

#### Generate QR Code for Training
```http
POST /qr-codes/training/{training_id}
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "qr_code": {
    "id": "qr_123",
    "training_id": "training_456",
    "code": "LFA_TRN_456_20240120",
    "qr_image_url": "https://cdn.example.com/qr_123.png",
    "expires_at": "2024-01-20T20:00:00Z"
  }
}
```

#### Scan QR Code
```http
POST /qr-codes/scan
Authorization: Bearer <token>
Content-Type: application/json

{
  "code": "LFA_TRN_456_20240120"
}
```

### Billing Endpoints

#### Get Billing Information
```http
GET /billing/me
Authorization: Bearer <token>
```

#### Create Payment Intent
```http
POST /billing/payment-intent
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 5000,
  "currency": "usd",
  "description": "Monthly training fee"
}
```

### Communication Endpoints

#### Send Announcement
```http
POST /announcements
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Training Schedule Update",
  "content": "Next week's training has been moved to 5 PM",
  "recipients": ["team_123"],
  "priority": "normal"
}
```

#### Get Announcements
```http
GET /announcements?recipient_id=user_123&page=1&limit=10
Authorization: Bearer <token>
```

### Health and Monitoring Endpoints

#### Basic Health Check
```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "version": "1.0.0",
  "uptime": 86400
}
```

#### Detailed Health Check
```http
GET /health/detailed
```

## Data Models

### User Model
```json
{
  "id": "string",
  "email": "string",
  "user_type": "admin|coach|parent|player",
  "profile": {
    "name": "string",
    "phone": "string",
    "address": "string",
    "bio": "string",
    "avatar_url": "string",
    "emergency_contact": {
      "name": "string",
      "phone": "string",
      "relationship": "string"
    }
  },
  "preferences": {
    "language": "string",
    "timezone": "string",
    "notifications": {
      "email": "boolean",
      "sms": "boolean",
      "push": "boolean"
    }
  },
  "created_at": "datetime",
  "updated_at": "datetime",
  "last_login": "datetime"
}
```

### Team Model
```json
{
  "id": "string",
  "name": "string",
  "age_group": "string",
  "description": "string",
  "coach_id": "string",
  "max_players": "number",
  "current_players": "number",
  "season": "string",
  "status": "active|inactive",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### Training Session Model
```json
{
  "id": "string",
  "team_id": "string",
  "coach_id": "string",
  "title": "string",
  "description": "string",
  "date": "date",
  "start_time": "time",
  "end_time": "time",
  "location": "string",
  "max_participants": "number",
  "status": "scheduled|ongoing|completed|cancelled",
  "weather_conditions": "string",
  "attendance_count": "number",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### Performance Metrics Model
```json
{
  "id": "string",
  "player_id": "string",
  "training_id": "string",
  "recorded_by": "string",
  "metrics": {
    "goals_scored": "number",
    "assists": "number",
    "passes_completed": "number",
    "pass_accuracy": "number",
    "shots_on_target": "number",
    "distance_covered": "number",
    "sprint_count": "number",
    "top_speed": "number",
    "tackles_won": "number",
    "defensive_actions": "number"
  },
  "notes": "string",
  "rating": "number",
  "recorded_at": "datetime"
}
```

## Usage Examples

### Role-Based Usage Examples

#### Admin User - System Management
```javascript
// Get system statistics
const response = await fetch('/api/v1/admin/statistics', {
  headers: {
    'Authorization': 'Bearer ' + adminToken,
    'Content-Type': 'application/json'
  }
});

// Create new coach account
const newCoach = await fetch('/api/v1/admin/users', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + adminToken,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'newcoach@academy.com',
    user_type: 'coach',
    profile: {
      name: 'New Coach',
      phone: '+1234567890'
    }
  })
});
```

#### Coach User - Team Management
```javascript
// Create training session
const training = await fetch('/api/v1/trainings', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + coachToken,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    team_id: 'team_123',
    title: 'Tactical Training',
    date: '2024-01-25',
    start_time: '16:00',
    end_time: '18:00',
    location: 'Training Ground A'
  })
});

// Record player performance
const performance = await fetch('/api/v1/performance', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + coachToken,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    player_id: 'player_789',
    training_id: 'training_456',
    metrics: {
      goals_scored: 2,
      passes_completed: 38,
      pass_accuracy: 0.92
    }
  })
});
```

#### Parent User - Child Monitoring
```javascript
// Get child's performance data
const childPerformance = await fetch('/api/v1/performance/analytics/player_789', {
  headers: {
    'Authorization': 'Bearer ' + parentToken
  }
});

// Get upcoming training sessions
const upcomingTrainings = await fetch('/api/v1/trainings?player_id=player_789&upcoming=true', {
  headers: {
    'Authorization': 'Bearer ' + parentToken
  }
});
```

#### Player User - Self-Service
```javascript
// Update own profile
const profileUpdate = await fetch('/api/v1/users/me', {
  method: 'PUT',
  headers: {
    'Authorization': 'Bearer ' + playerToken,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    profile: {
      bio: 'Updated player bio',
      emergency_contact: {
        name: 'Parent Name',
        phone: '+1987654321',
        relationship: 'Parent'
      }
    }
  })
});

// Check in to training via QR code
const checkIn = await fetch('/api/v1/qr-codes/scan', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + playerToken,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    code: 'LFA_TRN_456_20240125'
  })
});
```

### SDK Usage Examples

#### JavaScript SDK
```javascript
import LFAClient from '@lfa/api-client';

const client = new LFAClient({
  baseURL: 'https://api.lionfootballacademy.com/v1',
  apiKey: 'your-api-key'
});

// Authenticate
await client.auth.login('user@example.com', 'password');

// Get teams
const teams = await client.teams.list();

// Create training session
const training = await client.trainings.create({
  team_id: 'team_123',
  title: 'Morning Practice',
  date: '2024-01-25'
});
```

#### Python SDK
```python
from lfa_client import LFAClient

client = LFAClient(
    base_url='https://api.lionfootballacademy.com/v1',
    api_key='your-api-key'
)

# Authenticate
client.auth.login('user@example.com', 'password')

# Get performance analytics
analytics = client.performance.get_analytics(
    player_id='player_789',
    date_from='2024-01-01',
    date_to='2024-01-31'
)
```

## Webhooks

### Webhook Events
The API supports webhooks for real-time event notifications:

- `user.created`
- `user.updated`
- `training.created`
- `training.completed`
- `attendance.marked`
- `performance.recorded`
- `payment.completed`
- `announcement.sent`

### Webhook Configuration
```http
POST /webhooks
Authorization: Bearer <token>
Content-Type: application/json

{
  "url": "https://your-app.com/webhooks/lfa",
  "events": ["training.completed", "attendance.marked"],
  "secret": "webhook_secret_key"
}
```

### Webhook Payload Example
```json
{
  "event": "training.completed",
  "timestamp": "2024-01-20T18:00:00Z",
  "data": {
    "training_id": "training_456",
    "team_id": "team_123",
    "attendance_count": 18,
    "completion_time": "2024-01-20T18:00:00Z"
  },
  "webhook_id": "webhook_123"
}
```

## Testing

### Postman Collection
Download our Postman collection: [LFA API Collection](https://api.lionfootballacademy.com/postman/collection.json)

### Test Accounts
Use these test accounts in the staging environment:

- **Admin**: admin@test.lfa.com / admin123
- **Coach**: coach@test.lfa.com / coach123
- **Parent**: parent@test.lfa.com / parent123
- **Player**: player@test.lfa.com / player123

### Sandbox Environment
Test payments and webhooks in our sandbox environment:
- Base URL: `https://sandbox-api.lionfootballacademy.com/v1`
- All payments are simulated
- Webhooks are delivered to ngrok/webhook.site URLs

## Support

### Contact Information
- **API Support**: api-support@lionfootballacademy.com
- **Documentation**: docs@lionfootballacademy.com
- **General Support**: support@lionfootballacademy.com

### Status Page
Monitor API status and incidents: [https://status.lionfootballacademy.com](https://status.lionfootballacademy.com)

### Change Log
- **v1.0.0** (2024-01-01): Initial API release
- **v1.0.1** (2024-01-15): Added performance analytics endpoints
- **v1.0.2** (2024-02-01): Enhanced QR code functionality

---

*This documentation is automatically generated and regularly updated. Last updated: 2024-01-15*