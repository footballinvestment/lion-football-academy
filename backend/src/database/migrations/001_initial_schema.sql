-- Lion Football Academy - Initial Database Schema Migration
-- Migration: 001_initial_schema.sql
-- Created: 2025-01-04
-- Description: Initial database schema for production deployment

-- Users table (core authentication)
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    phone VARCHAR(20),
    user_type ENUM('admin', 'coach', 'parent', 'player') NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    email_verified BOOLEAN DEFAULT 0,
    last_login DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_users_email (email),
    INDEX idx_users_username (username),
    INDEX idx_users_type (user_type)
);

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    age_group VARCHAR(20) NOT NULL,
    coach_id INTEGER,
    season VARCHAR(20) NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (coach_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_teams_coach (coach_id),
    INDEX idx_teams_season (season),
    INDEX idx_teams_age_group (age_group)
);

-- Players table
CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    parent_id INTEGER,
    team_id INTEGER,
    jersey_number INTEGER,
    date_of_birth DATE NOT NULL,
    position VARCHAR(30),
    height DECIMAL(5,2),
    weight DECIMAL(5,2),
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(20),
    medical_conditions TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL,
    INDEX idx_players_user (user_id),
    INDEX idx_players_parent (parent_id),
    INDEX idx_players_team (team_id),
    UNIQUE KEY unique_team_jersey (team_id, jersey_number)
);

-- Trainings table
CREATE TABLE IF NOT EXISTS trainings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id INTEGER NOT NULL,
    coach_id INTEGER NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    training_date DATETIME NOT NULL,
    duration_minutes INTEGER DEFAULT 90,
    location VARCHAR(200),
    status ENUM('scheduled', 'completed', 'cancelled') DEFAULT 'scheduled',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (coach_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_trainings_team (team_id),
    INDEX idx_trainings_coach (coach_id),
    INDEX idx_trainings_date (training_date),
    INDEX idx_trainings_status (status)
);

-- Attendance table
CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    training_id INTEGER NOT NULL,
    player_id INTEGER NOT NULL,
    status ENUM('present', 'absent', 'late', 'excused') NOT NULL,
    check_in_time DATETIME,
    check_out_time DATETIME,
    notes TEXT,
    recorded_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (training_id) REFERENCES trainings(id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
    FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY unique_training_player (training_id, player_id),
    INDEX idx_attendance_training (training_id),
    INDEX idx_attendance_player (player_id),
    INDEX idx_attendance_status (status),
    INDEX idx_attendance_date (check_in_time)
);

-- Matches table
CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    home_team_id INTEGER,
    away_team_id INTEGER,
    home_team_name VARCHAR(100) NOT NULL,
    away_team_name VARCHAR(100) NOT NULL,
    match_date DATETIME NOT NULL,
    location VARCHAR(200),
    home_score INTEGER DEFAULT 0,
    away_score INTEGER DEFAULT 0,
    status ENUM('scheduled', 'in_progress', 'completed', 'cancelled', 'postponed') DEFAULT 'scheduled',
    match_type ENUM('league', 'friendly', 'cup', 'tournament') DEFAULT 'league',
    referee VARCHAR(100),
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (home_team_id) REFERENCES teams(id) ON DELETE SET NULL,
    FOREIGN KEY (away_team_id) REFERENCES teams(id) ON DELETE SET NULL,
    INDEX idx_matches_date (match_date),
    INDEX idx_matches_status (status),
    INDEX idx_matches_type (match_type),
    INDEX idx_matches_home_team (home_team_id),
    INDEX idx_matches_away_team (away_team_id)
);

-- Match Events table
CREATE TABLE IF NOT EXISTS match_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    match_id INTEGER NOT NULL,
    player_id INTEGER,
    event_type ENUM('goal', 'assist', 'yellow_card', 'red_card', 'substitution_in', 'substitution_out') NOT NULL,
    minute INTEGER,
    description TEXT,
    recorded_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE SET NULL,
    FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_match_events_match (match_id),
    INDEX idx_match_events_player (player_id),
    INDEX idx_match_events_type (event_type),
    INDEX idx_match_events_minute (minute)
);

-- Player Performance table
CREATE TABLE IF NOT EXISTS player_performance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL,
    training_id INTEGER,
    match_id INTEGER,
    performance_date DATE NOT NULL,
    rating DECIMAL(3,1) CHECK (rating >= 1.0 AND rating <= 10.0),
    goals INTEGER DEFAULT 0,
    assists INTEGER DEFAULT 0,
    minutes_played INTEGER DEFAULT 0,
    technical_skills DECIMAL(3,1),
    physical_fitness DECIMAL(3,1),
    tactical_awareness DECIMAL(3,1),
    teamwork DECIMAL(3,1),
    attitude DECIMAL(3,1),
    comments TEXT,
    assessed_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
    FOREIGN KEY (training_id) REFERENCES trainings(id) ON DELETE SET NULL,
    FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE SET NULL,
    FOREIGN KEY (assessed_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_performance_player (player_id),
    INDEX idx_performance_date (performance_date),
    INDEX idx_performance_training (training_id),
    INDEX idx_performance_match (match_id),
    CHECK ((training_id IS NOT NULL) OR (match_id IS NOT NULL))
);

-- Development Plans table
CREATE TABLE IF NOT EXISTS development_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL,
    coach_id INTEGER NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE,
    status ENUM('active', 'completed', 'paused', 'cancelled') DEFAULT 'active',
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
    FOREIGN KEY (coach_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_dev_plans_player (player_id),
    INDEX idx_dev_plans_coach (coach_id),
    INDEX idx_dev_plans_status (status),
    INDEX idx_dev_plans_dates (start_date, end_date)
);

-- Development Goals table
CREATE TABLE IF NOT EXISTS development_goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plan_id INTEGER NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    target_value DECIMAL(10,2),
    current_value DECIMAL(10,2) DEFAULT 0,
    unit VARCHAR(20),
    priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    status ENUM('not_started', 'in_progress', 'achieved', 'abandoned') DEFAULT 'not_started',
    target_date DATE,
    achieved_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (plan_id) REFERENCES development_plans(id) ON DELETE CASCADE,
    INDEX idx_dev_goals_plan (plan_id),
    INDEX idx_dev_goals_status (status),
    INDEX idx_dev_goals_priority (priority),
    INDEX idx_dev_goals_target_date (target_date)
);

-- Injuries table
CREATE TABLE IF NOT EXISTS injuries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL,
    injury_type VARCHAR(100) NOT NULL,
    severity ENUM('minor', 'moderate', 'severe', 'critical') NOT NULL,
    body_part VARCHAR(50) NOT NULL,
    injury_date DATE NOT NULL,
    description TEXT,
    treatment_plan TEXT,
    expected_recovery_date DATE,
    actual_recovery_date DATE,
    status ENUM('active', 'recovering', 'recovered', 'chronic') DEFAULT 'active',
    medical_clearance BOOLEAN DEFAULT 0,
    recorded_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
    FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_injuries_player (player_id),
    INDEX idx_injuries_date (injury_date),
    INDEX idx_injuries_status (status),
    INDEX idx_injuries_severity (severity),
    INDEX idx_injuries_body_part (body_part)
);

-- Announcements table
CREATE TABLE IF NOT EXISTS announcements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    author_id INTEGER NOT NULL,
    target_audience ENUM('all', 'parents', 'coaches', 'players', 'team') NOT NULL,
    target_team_id INTEGER,
    priority ENUM('low', 'normal', 'high', 'urgent') DEFAULT 'normal',
    is_published BOOLEAN DEFAULT 0,
    publish_date DATETIME,
    expiry_date DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (target_team_id) REFERENCES teams(id) ON DELETE SET NULL,
    INDEX idx_announcements_author (author_id),
    INDEX idx_announcements_audience (target_audience),
    INDEX idx_announcements_team (target_team_id),
    INDEX idx_announcements_priority (priority),
    INDEX idx_announcements_publish_date (publish_date),
    INDEX idx_announcements_expiry (expiry_date)
);

-- Billing table
CREATE TABLE IF NOT EXISTS billing (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    player_id INTEGER,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    billing_period_start DATE NOT NULL,
    billing_period_end DATE NOT NULL,
    due_date DATE NOT NULL,
    status ENUM('draft', 'sent', 'paid', 'overdue', 'cancelled') DEFAULT 'draft',
    payment_method VARCHAR(50),
    payment_date DATETIME,
    payment_reference VARCHAR(100),
    description TEXT,
    late_fee DECIMAL(10,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE SET NULL,
    INDEX idx_billing_user (user_id),
    INDEX idx_billing_player (player_id),
    INDEX idx_billing_status (status),
    INDEX idx_billing_due_date (due_date),
    INDEX idx_billing_period (billing_period_start, billing_period_end),
    INDEX idx_billing_invoice (invoice_number)
);

-- Notification Preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    email_notifications BOOLEAN DEFAULT 1,
    sms_notifications BOOLEAN DEFAULT 0,
    push_notifications BOOLEAN DEFAULT 1,
    training_reminders BOOLEAN DEFAULT 1,
    match_updates BOOLEAN DEFAULT 1,
    injury_alerts BOOLEAN DEFAULT 1,
    billing_reminders BOOLEAN DEFAULT 1,
    performance_reports BOOLEAN DEFAULT 1,
    team_announcements BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_preferences (user_id),
    INDEX idx_notif_pref_user (user_id)
);

-- Sessions table (for session management)
CREATE TABLE IF NOT EXISTS sessions (
    id VARCHAR(128) PRIMARY KEY,
    user_id INTEGER,
    expires DATETIME NOT NULL,
    data TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_sessions_user (user_id),
    INDEX idx_sessions_expires (expires)
);

-- Database version tracking
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(50) PRIMARY KEY,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    description TEXT
);

-- Insert initial migration record
INSERT OR IGNORE INTO schema_migrations (version, description) 
VALUES ('001', 'Initial database schema with core tables');

-- Create triggers for updated_at columns
CREATE TRIGGER IF NOT EXISTS trigger_users_updated_at 
    AFTER UPDATE ON users 
    BEGIN 
        UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; 
    END;

CREATE TRIGGER IF NOT EXISTS trigger_teams_updated_at 
    AFTER UPDATE ON teams 
    BEGIN 
        UPDATE teams SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; 
    END;

CREATE TRIGGER IF NOT EXISTS trigger_players_updated_at 
    AFTER UPDATE ON players 
    BEGIN 
        UPDATE players SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; 
    END;

CREATE TRIGGER IF NOT EXISTS trigger_trainings_updated_at 
    AFTER UPDATE ON trainings 
    BEGIN 
        UPDATE trainings SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; 
    END;

CREATE TRIGGER IF NOT EXISTS trigger_attendance_updated_at 
    AFTER UPDATE ON attendance 
    BEGIN 
        UPDATE attendance SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; 
    END;

CREATE TRIGGER IF NOT EXISTS trigger_matches_updated_at 
    AFTER UPDATE ON matches 
    BEGIN 
        UPDATE matches SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; 
    END;

CREATE TRIGGER IF NOT EXISTS trigger_player_performance_updated_at 
    AFTER UPDATE ON player_performance 
    BEGIN 
        UPDATE player_performance SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; 
    END;

CREATE TRIGGER IF NOT EXISTS trigger_development_plans_updated_at 
    AFTER UPDATE ON development_plans 
    BEGIN 
        UPDATE development_plans SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; 
    END;

CREATE TRIGGER IF NOT EXISTS trigger_development_goals_updated_at 
    AFTER UPDATE ON development_goals 
    BEGIN 
        UPDATE development_goals SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; 
    END;

CREATE TRIGGER IF NOT EXISTS trigger_injuries_updated_at 
    AFTER UPDATE ON injuries 
    BEGIN 
        UPDATE injuries SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; 
    END;

CREATE TRIGGER IF NOT EXISTS trigger_announcements_updated_at 
    AFTER UPDATE ON announcements 
    BEGIN 
        UPDATE announcements SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; 
    END;

CREATE TRIGGER IF NOT EXISTS trigger_billing_updated_at 
    AFTER UPDATE ON billing 
    BEGIN 
        UPDATE billing SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; 
    END;

CREATE TRIGGER IF NOT EXISTS trigger_notification_preferences_updated_at 
    AFTER UPDATE ON notification_preferences 
    BEGIN 
        UPDATE notification_preferences SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; 
    END;

CREATE TRIGGER IF NOT EXISTS trigger_sessions_updated_at 
    AFTER UPDATE ON sessions 
    BEGIN 
        UPDATE sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; 
    END;