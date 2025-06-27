# Lion Football Academy - API Documentation

## 📋 Table of Contents
1. [Authentication](#authentication)
2. [User Management](#user-management)
3. [Team Management](#team-management)
4. [Player Management](#player-management)
5. [Match Management](#match-management)
6. [Training Management](#training-management)
7. [Family System](#family-system)
8. [Analytics & Reports](#analytics--reports)
9. [Error Handling](#error-handling)
10. [Rate Limiting](#rate-limiting)

---

## 🔐 Authentication

### Base URL
```
Production: https://yourdomain.com/api
Development: http://localhost:3000/api
```

### Authentication Header
All protected endpoints require JWT authentication:
```
Authorization: Bearer <your-jwt-token>
```

### Login
**POST** `/auth/login`

Authenticate user and receive JWT tokens.

**Request Body:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@academy.com",
    "full_name": "Academy Administrator",
    "role": "admin",
    "team_id": null,
    "player_id": null
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "24h"
  }
}
```

**Error Response:**
```json
{
  "error": "Authentication failed",
  "message": "Invalid username or password"
}
```

### Token Validation
**GET** `/auth/validate`

Validate current JWT token.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "message": "Token is valid",
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@academy.com",
    "role": "admin",
    "full_name": "Academy Administrator"
  }
}
```

### Token Refresh
**POST** `/auth/refresh`

Refresh access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": "24h"
}
```

---

## 👥 User Management

### Get All Users
**GET** `/users`

**Permissions:** Admin only

**Query Parameters:**
- `role` (optional): Filter by role (admin, coach, parent)
- `active` (optional): Filter by active status (true/false)
- `limit` (optional): Number of results to return
- `offset` (optional): Number of results to skip

**Response:**
```json
{
  "success": true,
  "users": [
    {
      "id": 1,
      "username": "admin",
      "email": "admin@academy.com",
      "full_name": "Academy Administrator",
      "role": "admin",
      "active": true,
      "created_at": "2024-01-01T00:00:00.000Z",
      "last_login": "2024-12-01T10:30:00.000Z"
    }
  ],
  "count": 1,
  "total": 50
}
```

### Get User by ID
**GET** `/users/:id`

**Permissions:** Admin, or user accessing their own data

**Response:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@academy.com",
    "full_name": "Academy Administrator",
    "role": "admin",
    "team_id": null,
    "player_id": null,
    "active": true,
    "created_at": "2024-01-01T00:00:00.000Z",
    "last_login": "2024-12-01T10:30:00.000Z"
  }
}
```

### Create User
**POST** `/auth/register`

**Permissions:** Admin only

**Request Body:**
```json
{
  "username": "new_coach",
  "email": "coach@academy.com",
  "password": "secure_password_123",
  "full_name": "John Coach",
  "role": "coach",
  "team_id": 1
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registration successful",
  "user": {
    "id": 25,
    "username": "new_coach",
    "email": "coach@academy.com",
    "full_name": "John Coach",
    "role": "coach",
    "team_id": 1,
    "active": true
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Update User
**PUT** `/users/:id`

**Permissions:** Admin, or user updating their own data

**Request Body:**
```json
{
  "email": "updated@academy.com",
  "full_name": "Updated Name",
  "active": true
}
```

### Delete User
**DELETE** `/users/:id`

**Permissions:** Admin only

**Response:**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

---

## 🏆 Team Management

### Get All Teams
**GET** `/teams`

**Permissions:** Admin, Coach, Parent

**Query Parameters:**
- `age_group` (optional): Filter by age group (U8, U10, U12, U14, U16, U18)
- `active` (optional): Filter by active status

**Response:**
```json
{
  "success": true,
  "teams": [
    {
      "id": 1,
      "name": "Lions U12",
      "age_group": "U12",
      "coach_id": 5,
      "coach_name": "John Coach",
      "founded_year": 2020,
      "home_venue": "Academy Field 1",
      "team_color": "#FF6B35",
      "active": true,
      "player_count": 18,
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "count": 6
}
```

### Get Team by ID
**GET** `/teams/:id`

**Permissions:** Admin, Coach, Parent (if child is in team)

**Response:**
```json
{
  "success": true,
  "team": {
    "id": 1,
    "name": "Lions U12",
    "age_group": "U12",
    "coach_id": 5,
    "coach_name": "John Coach",
    "founded_year": 2020,
    "home_venue": "Academy Field 1",
    "team_color": "#FF6B35",
    "active": true,
    "description": "Competitive U12 team focusing on technical development",
    "training_schedule": [
      {
        "day": "Tuesday",
        "time": "17:00",
        "duration": 90,
        "type": "Technical training"
      },
      {
        "day": "Thursday",
        "time": "17:00",
        "duration": 90,
        "type": "Match practice"
      }
    ]
  }
}
```

### Get Team Players
**GET** `/teams/:id/players`

**Permissions:** Admin, Coach, Parent (if child is in team)

**Response:**
```json
{
  "success": true,
  "players": [
    {
      "id": 1000,
      "name": "Gáspár Simon",
      "birth_date": "2012-03-15",
      "position": "Középpályás",
      "jersey_number": 10,
      "height_cm": 145,
      "weight_kg": 38,
      "joined_date": "2024-01-15"
    }
  ],
  "count": 18
}
```

### Create Team
**POST** `/teams`

**Permissions:** Admin only

**Request Body:**
```json
{
  "name": "Eagles U14",
  "age_group": "U14",
  "coach_id": 7,
  "founded_year": 2024,
  "home_venue": "Academy Field 2",
  "team_color": "#009F3D",
  "description": "New U14 team for talented players"
}
```

---

## ⚽ Player Management

### Get All Players
**GET** `/players`

**Permissions:** Admin, Coach

**Query Parameters:**
- `team_id` (optional): Filter by team
- `age_group` (optional): Filter by age group
- `position` (optional): Filter by position
- `active` (optional): Filter by active status
- `search` (optional): Search by name

**Response:**
```json
{
  "success": true,
  "players": [
    {
      "id": 1000,
      "name": "Gáspár Simon",
      "birth_date": "2012-03-15",
      "age": 12,
      "position": "Középpályás",
      "jersey_number": 10,
      "team_id": 1,
      "team_name": "Lions U12",
      "height_cm": 145,
      "weight_kg": 38,
      "dominant_foot": "Right",
      "nationality": "Hungarian",
      "active": true,
      "joined_date": "2024-01-15"
    }
  ],
  "count": 448,
  "total": 448
}
```

### Get Player by ID
**GET** `/players/:id`

**Permissions:** Admin, Coach, Parent (if their child)

**Response:**
```json
{
  "success": true,
  "player": {
    "id": 1000,
    "name": "Gáspár Simon",
    "birth_date": "2012-03-15",
    "age": 12,
    "position": "Középpályás",
    "jersey_number": 10,
    "team_id": 1,
    "team_name": "Lions U12",
    "height_cm": 145,
    "weight_kg": 38,
    "dominant_foot": "Right",
    "nationality": "Hungarian",
    "emergency_contact_name": "Gáspár Peter",
    "emergency_contact_phone": "+36 20 123 4567",
    "medical_notes": "No known allergies",
    "active": true,
    "joined_date": "2024-01-15",
    "created_at": "2024-01-15T00:00:00.000Z"
  }
}
```

### Create Player
**POST** `/players`

**Permissions:** Admin, Coach

**Request Body:**
```json
{
  "name": "New Player",
  "birth_date": "2013-05-20",
  "position": "Csatár",
  "team_id": 1,
  "height_cm": 140,
  "weight_kg": 35,
  "dominant_foot": "Left",
  "nationality": "Hungarian",
  "emergency_contact_name": "Parent Name",
  "emergency_contact_phone": "+36 30 123 4567",
  "medical_notes": "Asthma - has inhaler"
}
```

### Update Player
**PUT** `/players/:id`

**Permissions:** Admin, Coach

**Request Body:**
```json
{
  "height_cm": 147,
  "weight_kg": 40,
  "position": "Támadó középpályás",
  "jersey_number": 8
}
```

### Player Statistics
**GET** `/players/:id/statistics`

**Permissions:** Admin, Coach, Parent (if their child)

**Query Parameters:**
- `season` (optional): Filter by season
- `match_type` (optional): Filter by match type

**Response:**
```json
{
  "success": true,
  "statistics": {
    "player_id": 1000,
    "player_name": "Gáspár Simon",
    "season": "2024-25",
    "matches_played": 15,
    "goals": 8,
    "assists": 5,
    "yellow_cards": 2,
    "red_cards": 0,
    "minutes_played": 1240,
    "average_rating": 7.3,
    "recent_matches": [
      {
        "match_date": "2024-11-15",
        "opponent": "Eagles U12",
        "goals": 2,
        "assists": 1,
        "rating": 8.5,
        "minutes": 90
      }
    ]
  }
}
```

---

## 🥅 Match Management

### Get All Matches
**GET** `/matches`

**Permissions:** Admin, Coach, Parent

**Query Parameters:**
- `team_id` (optional): Filter by team
- `season` (optional): Filter by season
- `match_type` (optional): Filter by match type (league, friendly, cup)
- `status` (optional): Filter by status (scheduled, finished, cancelled)
- `from_date` (optional): Filter from date (YYYY-MM-DD)
- `to_date` (optional): Filter to date (YYYY-MM-DD)

**Response:**
```json
{
  "success": true,
  "matches": [
    {
      "id": 1,
      "home_team_id": 1,
      "away_team_id": 2,
      "home_team_name": "Lions U12",
      "away_team_name": "Eagles U12",
      "match_date": "2024-12-15",
      "match_time": "14:00",
      "venue": "Academy Field 1",
      "match_type": "league",
      "season": "2024-25",
      "match_status": "scheduled",
      "home_score": null,
      "away_score": null,
      "age_group": "U12"
    }
  ],
  "count": 156
}
```

### Get Match by ID
**GET** `/matches/:id`

**Permissions:** Admin, Coach, Parent

**Response:**
```json
{
  "success": true,
  "match": {
    "id": 1,
    "home_team_id": 1,
    "away_team_id": 2,
    "home_team_name": "Lions U12",
    "away_team_name": "Eagles U12",
    "match_date": "2024-11-15",
    "match_time": "14:00",
    "venue": "Academy Field 1",
    "match_type": "league",
    "season": "2024-25",
    "match_status": "finished",
    "home_score": 3,
    "away_score": 1,
    "match_duration": 80,
    "referee_name": "József Szabó",
    "weather_conditions": "Sunny, 18°C",
    "attendance": 45,
    "notes": "Great team performance, good passing game"
  }
}
```

### Create Match
**POST** `/matches`

**Permissions:** Admin, Coach

**Request Body:**
```json
{
  "home_team_id": 1,
  "away_team_id": 2,
  "match_date": "2024-12-20",
  "match_time": "15:00",
  "venue": "Academy Field 1",
  "match_type": "friendly",
  "season": "2024-25"
}
```

### Update Match Result
**PUT** `/matches/:id/result`

**Permissions:** Admin, Coach

**Request Body:**
```json
{
  "home_score": 2,
  "away_score": 1,
  "match_status": "finished",
  "match_duration": 80,
  "referee_name": "János Nagy",
  "weather_conditions": "Clear, 15°C",
  "attendance": 32,
  "notes": "Competitive match with good sportsmanship"
}
```

### Match Player Performances
**GET** `/matches/:id/performances`

**Permissions:** Admin, Coach

**Response:**
```json
{
  "success": true,
  "performances": [
    {
      "player_id": 1000,
      "player_name": "Gáspár Simon",
      "position": "Középpályás",
      "minutes_played": 80,
      "goals": 1,
      "assists": 2,
      "yellow_cards": 0,
      "red_cards": 0,
      "performance_rating": 8.5,
      "notes": "Excellent passing and vision"
    }
  ]
}
```

---

## 🏃‍♂️ Training Management

### Get Training Sessions
**GET** `/trainings`

**Permissions:** Admin, Coach

**Query Parameters:**
- `team_id` (optional): Filter by team
- `from_date` (optional): Filter from date
- `to_date` (optional): Filter to date
- `training_type` (optional): Filter by type

**Response:**
```json
{
  "success": true,
  "trainings": [
    {
      "id": 1,
      "team_id": 1,
      "team_name": "Lions U12",
      "training_date": "2024-12-10",
      "training_time": "17:00",
      "duration_minutes": 90,
      "training_type": "Technical",
      "venue": "Academy Field 1",
      "coach_id": 5,
      "coach_name": "John Coach",
      "objectives": "Ball control and passing accuracy",
      "attendance_count": 16,
      "weather": "Indoor"
    }
  ],
  "count": 45
}
```

### Create Training Session
**POST** `/trainings`

**Permissions:** Admin, Coach

**Request Body:**
```json
{
  "team_id": 1,
  "training_date": "2024-12-15",
  "training_time": "17:00",
  "duration_minutes": 90,
  "training_type": "Tactical",
  "venue": "Academy Field 1",
  "objectives": "Defensive positioning and transitions",
  "notes": "Focus on compact defensive shape"
}
```

---

## 👨‍👩‍👧‍👦 Family System

### Parent Dashboard
**GET** `/parents/dashboard`

**Permissions:** Parent only (authenticated parent)

**Response:**
```json
{
  "success": true,
  "data": {
    "children": [
      {
        "id": 1000,
        "name": "Gáspár Simon",
        "birth_date": "2012-03-15",
        "position": "Középpályás",
        "team_name": "Lions U12",
        "jersey_number": 10,
        "relationship_type": "parent",
        "can_view_medical": true,
        "can_view_performance": true
      }
    ],
    "notifications": [
      {
        "id": 1,
        "notification_type": "match_result",
        "title": "Match Result - Lions U12 vs Eagles U12",
        "message": "Your child's team won 3-1! Simon scored 1 goal.",
        "priority": "normal",
        "created_at": "2024-11-15T16:30:00.000Z",
        "child_name": "Gáspár Simon"
      }
    ],
    "recentActivities": [
      {
        "activity_type": "match",
        "activity_date": "2024-11-15",
        "description": "Match vs Eagles U12",
        "child_name": "Gáspár Simon",
        "result": "3-1"
      }
    ],
    "summary": {
      "totalChildren": 1,
      "unreadNotifications": 2,
      "recentActivities": 5
    }
  }
}
```

### Get Parent's Children
**GET** `/parents/:id/children`

**Permissions:** Parent (own children), Admin, Coach

**Response:**
```json
{
  "success": true,
  "children": [
    {
      "id": 1000,
      "name": "Gáspár Simon",
      "birth_date": "2012-03-15",
      "position": "Középpályás",
      "jersey_number": 10,
      "team_name": "Lions U12",
      "age_group": "U12",
      "relationship_type": "parent",
      "custody_type": "full",
      "can_view_medical": true,
      "can_view_performance": true,
      "created_at": "2024-01-15T00:00:00.000Z"
    }
  ],
  "childCount": 1
}
```

### Child Performance Data for Parent
**GET** `/parents/children/:childId/performance`

**Permissions:** Parent (own child only)

**Response:**
```json
{
  "success": true,
  "childId": 1000,
  "performance": [
    {
      "id": 1,
      "match_id": 15,
      "position": "Középpályás",
      "minutes_played": 80,
      "goals": 1,
      "assists": 2,
      "performance_rating": 8.5,
      "match_date": "2024-11-15",
      "match_time": "14:00",
      "home_team_name": "Lions U12",
      "away_team_name": "Eagles U12",
      "home_score": 3,
      "away_score": 1
    }
  ]
}
```

### Child Injuries for Parent
**GET** `/parents/children/:childId/injuries`

**Permissions:** Parent (own child only)

**Response:**
```json
{
  "success": true,
  "childId": 1000,
  "injuries": [
    {
      "id": 1,
      "injury_type": "muscle_strain",
      "injury_severity": "minor",
      "injury_location": "Lábszár",
      "injury_date": "2024-10-20",
      "expected_recovery_date": "2024-11-05",
      "actual_recovery_date": "2024-11-03",
      "status": "recovered",
      "description": "Izomhúzódás - Lábszár",
      "recovery_notes": "Full recovery, cleared for training"
    }
  ]
}
```

### Child Development Plans for Parent
**GET** `/parents/children/:childId/development`

**Permissions:** Parent (own child only)

**Response:**
```json
{
  "success": true,
  "childId": 1000,
  "development": [
    {
      "id": 1,
      "plan_type": "technical",
      "target_skills": "Ball control, First touch",
      "goals": "Improve first touch consistency by 30%",
      "timeline": "3 months",
      "priority": "high",
      "progress_percentage": 75,
      "status": "active",
      "coach_notes": "Good progress in training sessions",
      "created_at": "2024-09-01T00:00:00.000Z",
      "last_updated": "2024-11-10T00:00:00.000Z"
    }
  ]
}
```

### Parent Notifications
**GET** `/parents/notifications`

**Permissions:** Parent only

**Response:**
```json
{
  "success": true,
  "notifications": [
    {
      "id": 1,
      "notification_type": "match_result",
      "title": "Match Result Available",
      "message": "Lions U12 vs Eagles U12 result is now available",
      "priority": "normal",
      "action_required": false,
      "created_at": "2024-11-15T16:30:00.000Z",
      "child_name": "Gáspár Simon"
    }
  ],
  "count": 3
}
```

### Mark Notification as Read
**POST** `/parents/notifications/:notificationId/read`

**Permissions:** Parent only

**Response:**
```json
{
  "success": true,
  "message": "Notification marked as read"
}
```

---

## 📊 Analytics & Reports

### System Overview
**GET** `/analytics/overview`

**Permissions:** Admin only

**Response:**
```json
{
  "success": true,
  "overview": {
    "users": {
      "total": 292,
      "admins": 2,
      "coaches": 8,
      "parents": 282
    },
    "teams": {
      "total": 6,
      "by_age_group": {
        "U8": 1,
        "U10": 1,
        "U12": 1,
        "U14": 1,
        "U16": 1,
        "U18": 1
      }
    },
    "players": {
      "total": 448,
      "active": 445,
      "by_age_group": {
        "U8": 75,
        "U10": 75,
        "U12": 75,
        "U14": 74,
        "U16": 74,
        "U18": 75
      }
    },
    "matches": {
      "total": 1476,
      "this_season": 295,
      "finished": 1180,
      "scheduled": 296
    }
  }
}
```

---

## ❌ Error Handling

### Standard Error Response
All API errors follow this format:

```json
{
  "error": "Error Type",
  "message": "Human-readable error message",
  "details": "Additional error details (optional)",
  "timestamp": "2024-12-01T10:30:00.000Z",
  "path": "/api/endpoint"
}
```

### HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid request data |
| 401 | Unauthorized | Authentication required |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource already exists |
| 422 | Unprocessable Entity | Validation errors |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

### Common Error Examples

**Authentication Error:**
```json
{
  "error": "Authentication failed",
  "message": "Invalid or expired token"
}
```

**Validation Error:**
```json
{
  "error": "Validation failed",
  "message": "Invalid input data",
  "details": {
    "email": "Invalid email format",
    "password": "Password must be at least 8 characters"
  }
}
```

**Permission Error:**
```json
{
  "error": "Forbidden",
  "message": "You don't have permission to access this resource"
}
```

---

## 🚦 Rate Limiting

### Rate Limits
- **Authentication endpoints**: 5 requests per minute per IP
- **General API endpoints**: 100 requests per 15 minutes per authenticated user
- **File upload endpoints**: 10 requests per minute per authenticated user

### Rate Limit Headers
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1701435600
```

### Rate Limit Exceeded Response
```json
{
  "error": "Rate limit exceeded",
  "message": "Too many requests. Please try again later.",
  "retryAfter": 300
}
```

---

## 🔧 Development & Testing

### API Testing
Use the provided test scripts:

```bash
# Run authentication tests
node test-auth-system.js

# Run family system tests
node test-family-system.js

# Run complete integration tests
node complete-system-integration-test.js
```

### Postman Collection
Import the Postman collection for easy API testing:
```
[Download Postman Collection](./postman/lion-football-academy.postman_collection.json)
```

### Example cURL Commands

**Login:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

**Get Players:**
```bash
curl -X GET http://localhost:3000/api/players \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Create Match:**
```bash
curl -X POST http://localhost:3000/api/matches \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"home_team_id":1,"away_team_id":2,"match_date":"2024-12-20","match_time":"15:00","venue":"Academy Field 1","match_type":"friendly","season":"2024-25"}'
```

---

## 📞 Support

For API support and questions:
- **Documentation**: This file
- **Issue Tracking**: GitHub Issues
- **Email Support**: api-support@footballacademy.com

---

*Last Updated: December 2024*
*API Version: 1.0*