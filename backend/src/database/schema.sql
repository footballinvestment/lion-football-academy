-- Lion Football Academy Database Schema
-- Version: 2.0 Enterprise
-- Created: 2025-07-03

-- Enable UUID extension for PostgreSQL (comment out for SQLite)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===================================
-- USERS TABLE (Authentication & Basic Info)
-- ===================================
CREATE TABLE users (
    id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
    username VARCHAR(50) UNIQUE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    role TEXT NOT NULL CHECK (role IN ('admin', 'coach', 'player', 'parent')),
    is_active BOOLEAN DEFAULT 1,
    email_verified BOOLEAN DEFAULT 0,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===================================
-- TEAMS TABLE
-- ===================================
CREATE TABLE teams (
    id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
    name VARCHAR(100) NOT NULL,
    age_group VARCHAR(50) NOT NULL,
    division VARCHAR(50),
    season VARCHAR(20) NOT NULL,
    max_players INTEGER DEFAULT 25,
    description TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===================================
-- PLAYERS TABLE
-- ===================================
CREATE TABLE players (
    id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
    user_id TEXT NOT NULL,
    team_id TEXT,
    jersey_number INTEGER,
    position VARCHAR(50),
    date_of_birth DATE NOT NULL,
    height DECIMAL(5,2),
    weight DECIMAL(5,2),
    preferred_foot TEXT CHECK (preferred_foot IN ('left', 'right', 'both')),
    medical_conditions TEXT,
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(20),
    join_date DATE DEFAULT (date('now')),
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL,
    UNIQUE (team_id, jersey_number)
);

-- ===================================
-- COACHES TABLE
-- ===================================
CREATE TABLE coaches (
    id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
    user_id TEXT NOT NULL,
    team_id TEXT,
    certification_level VARCHAR(100),
    experience_years INTEGER DEFAULT 0,
    specialization VARCHAR(100),
    bio TEXT,
    hire_date DATE DEFAULT (date('now')),
    is_head_coach BOOLEAN DEFAULT 0,
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL
);

-- ===================================
-- MATCHES TABLE
-- ===================================
CREATE TABLE matches (
    id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
    team_id TEXT NOT NULL,
    opponent_name VARCHAR(100) NOT NULL,
    match_date DATETIME NOT NULL,
    venue VARCHAR(200),
    is_home_game BOOLEAN DEFAULT 1,
    match_type TEXT DEFAULT 'league' CHECK (match_type IN ('league', 'cup', 'friendly', 'tournament')),
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'ongoing', 'completed', 'cancelled')),
    home_score INTEGER DEFAULT 0,
    away_score INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

-- ===================================
-- MATCH_PLAYERS TABLE (Player Performance)
-- ===================================
CREATE TABLE match_players (
    id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
    match_id TEXT NOT NULL,
    player_id TEXT NOT NULL,
    position VARCHAR(50),
    minutes_played INTEGER DEFAULT 0,
    goals INTEGER DEFAULT 0,
    assists INTEGER DEFAULT 0,
    yellow_cards INTEGER DEFAULT 0,
    red_cards INTEGER DEFAULT 0,
    rating DECIMAL(3,1),
    performance_notes TEXT,
    is_starter BOOLEAN DEFAULT 0,
    substitution_time INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
    UNIQUE (match_id, player_id)
);

-- ===================================
-- TRAININGS TABLE
-- ===================================
CREATE TABLE trainings (
    id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
    team_id TEXT NOT NULL,
    coach_id TEXT NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    training_date DATETIME NOT NULL,
    duration_minutes INTEGER DEFAULT 90,
    location VARCHAR(200),
    training_type TEXT DEFAULT 'technical' CHECK (training_type IN ('technical', 'tactical', 'physical', 'recovery', 'scrimmage')),
    max_participants INTEGER,
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'ongoing', 'completed', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (coach_id) REFERENCES coaches(id) ON DELETE CASCADE
);

-- ===================================
-- TRAINING_PARTICIPANTS TABLE
-- ===================================
CREATE TABLE training_participants (
    id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
    training_id TEXT NOT NULL,
    player_id TEXT NOT NULL,
    attendance_status TEXT DEFAULT 'present' CHECK (attendance_status IN ('present', 'absent', 'late', 'excused')),
    performance_rating DECIMAL(3,1),
    notes TEXT,
    check_in_time TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (training_id) REFERENCES trainings(id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
    UNIQUE (training_id, player_id)
);

-- ===================================
-- ANNOUNCEMENTS TABLE
-- ===================================
CREATE TABLE announcements (
    id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
    team_id TEXT,
    author_id TEXT NOT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    announcement_type TEXT DEFAULT 'general' CHECK (announcement_type IN ('general', 'match', 'training', 'urgent', 'administrative')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    target_audience TEXT DEFAULT 'all' CHECK (target_audience IN ('all', 'players', 'parents', 'coaches')),
    is_published BOOLEAN DEFAULT 0,
    publish_date DATETIME,
    expire_date DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ===================================
-- FAMILY_RELATIONSHIPS TABLE
-- ===================================
CREATE TABLE family_relationships (
    id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
    parent_id TEXT NOT NULL,
    player_id TEXT NOT NULL,
    relationship_type TEXT NOT NULL CHECK (relationship_type IN ('father', 'mother', 'guardian', 'relative')),
    is_primary_contact BOOLEAN DEFAULT 0,
    can_pickup BOOLEAN DEFAULT 1,
    emergency_contact BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
    UNIQUE (parent_id, player_id)
);

-- ===================================
-- DEVELOPMENT_PLANS TABLE
-- ===================================
CREATE TABLE development_plans (
    id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
    player_id TEXT NOT NULL,
    coach_id TEXT NOT NULL,
    plan_title VARCHAR(200) NOT NULL,
    objectives TEXT NOT NULL,
    skills_to_improve TEXT,
    strengths TEXT,
    weaknesses TEXT,
    action_items TEXT,
    target_date DATE,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'paused')),
    progress_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
    FOREIGN KEY (coach_id) REFERENCES coaches(id) ON DELETE CASCADE
);

-- ===================================
-- INJURIES TABLE
-- ===================================
CREATE TABLE injuries (
    id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
    player_id TEXT NOT NULL,
    injury_type VARCHAR(100) NOT NULL,
    body_part VARCHAR(100) NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('minor', 'moderate', 'severe', 'critical')),
    description TEXT,
    injury_date DATE NOT NULL,
    expected_recovery_date DATE,
    actual_recovery_date DATE,
    medical_clearance BOOLEAN DEFAULT 0,
    treatment_notes TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'healing', 'recovered')),
    reported_by TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
    FOREIGN KEY (reported_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ===================================
-- PAYMENTS TABLE
-- ===================================
CREATE TABLE payments (
    id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
    player_id TEXT NOT NULL,
    payer_id TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    payment_type TEXT NOT NULL CHECK (payment_type IN ('registration', 'monthly_fee', 'equipment', 'tournament', 'camp', 'other')),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'card', 'bank_transfer', 'check', 'online')),
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
    due_date DATE,
    payment_date DATE,
    transaction_id VARCHAR(100),
    description TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
    FOREIGN KEY (payer_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ===================================
-- INDEXES FOR PERFORMANCE
-- ===================================

-- Users indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active);

-- Players indexes
CREATE INDEX idx_players_team ON players(team_id);
CREATE INDEX idx_players_user ON players(user_id);
CREATE INDEX idx_players_active ON players(is_active);
CREATE INDEX idx_players_position ON players(position);

-- Coaches indexes
CREATE INDEX idx_coaches_team ON coaches(team_id);
CREATE INDEX idx_coaches_user ON coaches(user_id);
CREATE INDEX idx_coaches_active ON coaches(is_active);

-- Matches indexes
CREATE INDEX idx_matches_team ON matches(team_id);
CREATE INDEX idx_matches_date ON matches(match_date);
CREATE INDEX idx_matches_status ON matches(status);

-- Match_players indexes
CREATE INDEX idx_match_players_match ON match_players(match_id);
CREATE INDEX idx_match_players_player ON match_players(player_id);

-- Trainings indexes
CREATE INDEX idx_trainings_team ON trainings(team_id);
CREATE INDEX idx_trainings_coach ON trainings(coach_id);
CREATE INDEX idx_trainings_date ON trainings(training_date);
CREATE INDEX idx_trainings_status ON trainings(status);

-- Training_participants indexes
CREATE INDEX idx_training_participants_training ON training_participants(training_id);
CREATE INDEX idx_training_participants_player ON training_participants(player_id);
CREATE INDEX idx_training_participants_attendance ON training_participants(attendance_status);

-- Announcements indexes
CREATE INDEX idx_announcements_team ON announcements(team_id);
CREATE INDEX idx_announcements_author ON announcements(author_id);
CREATE INDEX idx_announcements_published ON announcements(is_published);
CREATE INDEX idx_announcements_priority ON announcements(priority);

-- Family_relationships indexes
CREATE INDEX idx_family_parent ON family_relationships(parent_id);
CREATE INDEX idx_family_player ON family_relationships(player_id);
CREATE INDEX idx_family_primary ON family_relationships(is_primary_contact);

-- Development_plans indexes
CREATE INDEX idx_development_player ON development_plans(player_id);
CREATE INDEX idx_development_coach ON development_plans(coach_id);
CREATE INDEX idx_development_status ON development_plans(status);

-- Injuries indexes
CREATE INDEX idx_injuries_player ON injuries(player_id);
CREATE INDEX idx_injuries_date ON injuries(injury_date);
CREATE INDEX idx_injuries_status ON injuries(status);
CREATE INDEX idx_injuries_severity ON injuries(severity);

-- Payments indexes
CREATE INDEX idx_payments_player ON payments(player_id);
CREATE INDEX idx_payments_payer ON payments(payer_id);
CREATE INDEX idx_payments_status ON payments(payment_status);
CREATE INDEX idx_payments_due_date ON payments(due_date);
CREATE INDEX idx_payments_type ON payments(payment_type);

-- ===================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ===================================

-- Update timestamp trigger for users
CREATE TRIGGER update_users_timestamp 
    AFTER UPDATE ON users
    FOR EACH ROW
BEGIN
    UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Update timestamp trigger for teams
CREATE TRIGGER update_teams_timestamp 
    AFTER UPDATE ON teams
    FOR EACH ROW
BEGIN
    UPDATE teams SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Update timestamp trigger for players
CREATE TRIGGER update_players_timestamp 
    AFTER UPDATE ON players
    FOR EACH ROW
BEGIN
    UPDATE players SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Update timestamp trigger for coaches
CREATE TRIGGER update_coaches_timestamp 
    AFTER UPDATE ON coaches
    FOR EACH ROW
BEGIN
    UPDATE coaches SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Update timestamp trigger for matches
CREATE TRIGGER update_matches_timestamp 
    AFTER UPDATE ON matches
    FOR EACH ROW
BEGIN
    UPDATE matches SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Update timestamp trigger for trainings
CREATE TRIGGER update_trainings_timestamp 
    AFTER UPDATE ON trainings
    FOR EACH ROW
BEGIN
    UPDATE trainings SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;